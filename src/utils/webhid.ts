import type { HidDevice } from '@/components/KeyboardNanoClient/types'
import { logger } from './logger.ts'

const DEFAULT_VENDOR_ID = 0x2B86
const DEFAULT_USAGE_PAGE = 0xFFB1
const DEFAULT_TIMEOUT_MS = 3000

let activeDevice: HIDDevice | null = null
let vendorIdState = DEFAULT_VENDOR_ID
let usagePageState = DEFAULT_USAGE_PAGE
let allowAutoRestore = true
let operationQueue = Promise.resolve()

function logWebHid(message: string, payload?: unknown) {
  logger.debug(`[webhid] ${message}`, payload)
}

function ensureWebHidSupport() {
  if (!('hid' in navigator)) {
    throw new Error('当前浏览器不支持 WebHID，请使用桌面版 Chrome / Edge。')
  }
}

function normalizeNumber(value: unknown, fallback: number) {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback
}

function getCollections(device: HIDDevice) {
  return device.collections ?? []
}

function findCollection(device: HIDDevice, usagePage?: number) {
  const collections = getCollections(device)
  if (!collections.length) {
    return null
  }

  if (usagePage) {
    return collections.find(collection => collection.usagePage === usagePage) ?? collections[0]
  }

  return collections[0]
}

function matchesUsagePage(device: HIDDevice, usagePage: number) {
  const collections = getCollections(device)
  return collections.some(collection => collection.usagePage === usagePage)
}

function matchesFilters(device: HIDDevice, vendorId: number, usagePage: number) {
  return device.vendorId === vendorId && matchesUsagePage(device, usagePage)
}

function toArray(data: DataView) {
  return Array.from(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
}

function toDeviceKey(device: HIDDevice) {
  return `${device.vendorId}-${device.productId}-${device.productName ?? 'unknown'}`
}

function mapDevice(device: HIDDevice): HidDevice {
  const collection = findCollection(device, usagePageState)

  return {
    vendorId: device.vendorId,
    productId: device.productId,
    path: toDeviceKey(device),
    serialNumber: '',
    manufacturer: '',
    product: device.productName ?? `HID-${device.productId}`,
    release: 0,
    interface: 0,
    usagePage: collection?.usagePage ?? 0,
    usage: collection?.usage ?? 0,
  }
}

async function ensureDeviceOpen(device: HIDDevice) {
  if (!device.opened) {
    logWebHid('open device', {
      device: toDeviceKey(device),
    })
    await device.open()
  }
}

async function getGrantedDevices() {
  ensureWebHidSupport()
  const devices = await navigator.hid.getDevices()
  logWebHid('get granted devices', {
    count: devices.length,
    devices: devices.map(device => ({
      device: toDeviceKey(device),
      vendorId: device.vendorId,
      productId: device.productId,
      collections: getCollections(device),
    })),
  })
  return devices
}

async function tryRestoreDevice() {
  if (activeDevice && activeDevice.opened) {
    logWebHid('reuse active device', {
      device: toDeviceKey(activeDevice),
    })
    return activeDevice
  }

  if (!allowAutoRestore) {
    activeDevice = null
    return null
  }

  const devices = await getGrantedDevices()
  const restored = devices.find(device => matchesFilters(device, vendorIdState, usagePageState)) ?? null
  logWebHid('try restore device', {
    vendorIdState,
    usagePageState,
    restored: restored ? toDeviceKey(restored) : null,
  })

  if (!restored) {
    activeDevice = null
    return null
  }

  await ensureDeviceOpen(restored)
  activeDevice = restored
  return restored
}

async function pickDevice(vendorId: number, usagePage: number) {
  ensureWebHidSupport()

  vendorIdState = vendorId
  usagePageState = usagePage
  allowAutoRestore = true

  const grantedDevices = await getGrantedDevices()
  const grantedDevice = grantedDevices.find(device => matchesFilters(device, vendorId, usagePage)) ?? null
  logWebHid('pick device from granted', {
    vendorId,
    usagePage,
    grantedDevice: grantedDevice ? toDeviceKey(grantedDevice) : null,
  })

  if (grantedDevice) {
    await ensureDeviceOpen(grantedDevice)
    activeDevice = grantedDevice
    return grantedDevice
  }

  const filters: HIDDeviceFilter[] = [{ vendorId, usagePage }]
  logWebHid('request device', { filters })
  const devices = await navigator.hid.requestDevice({ filters })
  const device = devices[0] ?? null

  if (!device) {
    throw new Error('未选择设备')
  }

  await ensureDeviceOpen(device)
  activeDevice = device
  return device
}

async function ensureActiveDevice() {
  const device = await tryRestoreDevice()
  if (!device) {
    throw new Error('设备未连接')
  }
  return device
}

function enqueueDeviceOperation<T>(task: () => Promise<T>) {
  const nextTask = operationQueue.then(async () => {
    logWebHid('queue task start')
    try {
      const result = await task()
      logWebHid('queue task success')
      return result
    }
    catch (error) {
      logger.error('[webhid] queue task error', error)
      throw error
    }
  })
  operationQueue = nextTask.then(() => undefined, () => undefined)
  return nextTask
}

function waitForInputReport(device: HIDDevice, expectedReportId: number, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let cleanup = () => { }
  logWebHid('wait input report', {
    device: toDeviceKey(device),
    expectedReportId,
    timeoutMs,
  })

  const promise = new Promise<number[]>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null

    cleanup = () => {
      device.removeEventListener('inputreport', handleReport)
      if (timer) {
        clearTimeout(timer)
      }
    }

    function handleReport(event: HIDInputReportEvent) {
      if (event.reportId !== expectedReportId) {
        logWebHid('ignore input report', {
          device: toDeviceKey(device),
          expectedReportId,
          actualReportId: event.reportId,
          data: toArray(event.data),
        })
        return
      }

      cleanup()
      logWebHid('input report received', {
        device: toDeviceKey(device),
        reportId: event.reportId,
        data: toArray(event.data),
      })
      resolve([event.reportId, ...toArray(event.data)])
    }

    timer = setTimeout(() => {
      cleanup()
      logger.error('[webhid] input report timeout', {
        device: toDeviceKey(device),
        expectedReportId,
        timeoutMs,
      })
      reject(new Error('读取设备超时'))
    }, timeoutMs)

    device.addEventListener('inputreport', handleReport, { once: true })
  })

  return {
    cancel: cleanup,
    promise,
  }
}

async function writeReport(buffer: number[], isRead = false) {
  if (!Array.isArray(buffer) || !buffer.length) {
    throw new Error('buffer is not a valid array')
  }

  const device = await ensureActiveDevice()
  const [reportId, ...payload] = buffer
  logWebHid('write report start', {
    device: toDeviceKey(device),
    reportId,
    isRead,
    buffer,
  })
  const readTask = isRead ? waitForInputReport(device, reportId) : null

  try {
    await device.sendReport(reportId, new Uint8Array(payload))
    logWebHid('write report sent', {
      device: toDeviceKey(device),
      reportId,
      payload,
    })
  }
  catch (error) {
    readTask?.cancel()
    logger.error('[webhid] write report failed', {
      device: toDeviceKey(device),
      reportId,
      payload,
      error,
    })
    throw error
  }

  if (!readTask) {
    logWebHid('write report done without read', {
      device: toDeviceKey(device),
      reportId,
    })
    return { message: 'write success' }
  }

  const data = await readTask.promise
  logWebHid('write report done with read', {
    device: toDeviceKey(device),
    reportId,
    data,
  })
  return { data }
}

export async function getWebHidStatus() {
  if (!('hid' in navigator)) {
    return {
      isConnected: false,
      vendorId: vendorIdState,
      usagePage: usagePageState,
      devices: [],
    }
  }

  const device = await tryRestoreDevice()
  const devices = await getGrantedDevices()
  const current = device ? findCollection(device, usagePageState) : null
  logWebHid('status', {
    isConnected: !!device?.opened,
    device: device ? toDeviceKey(device) : null,
    vendorId: device?.vendorId ?? vendorIdState,
    usagePage: current?.usagePage ?? usagePageState,
  })

  return {
    isConnected: !!device?.opened,
    vendorId: device?.vendorId ?? vendorIdState,
    usagePage: current?.usagePage ?? usagePageState,
    devices: devices.map(mapDevice),
  }
}

export async function connectWebHidDevice(params?: { vendor_id?: unknown, usage_page?: unknown }) {
  const vendorId = normalizeNumber(params?.vendor_id, vendorIdState)
  const usagePage = normalizeNumber(params?.usage_page, usagePageState)
  logWebHid('connect device request', {
    vendorId,
    usagePage,
  })
  const device = await pickDevice(vendorId, usagePage)
  logWebHid('connect device success', {
    device: toDeviceKey(device),
  })

  return {
    message: 'ok',
    devicePath: toDeviceKey(device),
  }
}

export async function closeWebHidDevice() {
  allowAutoRestore = false
  return await enqueueDeviceOperation(async () => {
    if (activeDevice?.opened) {
      logWebHid('close device', {
        device: toDeviceKey(activeDevice),
      })
      await activeDevice.close()
    }

    activeDevice = null
    return { message: 'closed' }
  })
}

export async function writeWebHid(params?: { buffer?: number[], isRead?: boolean }) {
  allowAutoRestore = true
  return await enqueueDeviceOperation(async () => await writeReport(params?.buffer ?? [], params?.isRead ?? false))
}

export async function pingWebHid() {
  allowAutoRestore = true
  return await enqueueDeviceOperation(async () => {
    const buffer = Array.from({ length: 60 }).fill(0) as number[]
    buffer[0] = 4
    buffer[1] = 0x03

    const startTime = performance.now()
    await writeReport(buffer, true)
    const endTime = performance.now()

    return {
      message: `Pong! ${Math.round(endTime - startTime)}ms`,
    }
  })
}
