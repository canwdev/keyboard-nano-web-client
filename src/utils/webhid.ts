import type { HidDevice } from '@/components/KeyboardNanoClient/types'

const DEFAULT_VENDOR_ID = 0x2B86
const DEFAULT_USAGE_PAGE = 0xFFB1
const DEFAULT_TIMEOUT_MS = 3000

let activeDevice: HIDDevice | null = null
let vendorIdState = DEFAULT_VENDOR_ID
let usagePageState = DEFAULT_USAGE_PAGE
let allowAutoRestore = true
let operationQueue = Promise.resolve()

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
    await device.open()
  }
}

async function getGrantedDevices() {
  ensureWebHidSupport()
  return await navigator.hid.getDevices()
}

async function tryRestoreDevice() {
  if (activeDevice && activeDevice.opened) {
    return activeDevice
  }

  if (!allowAutoRestore) {
    activeDevice = null
    return null
  }

  const devices = await getGrantedDevices()
  const restored = devices.find(device => matchesFilters(device, vendorIdState, usagePageState)) ?? null

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

  if (grantedDevice) {
    await ensureDeviceOpen(grantedDevice)
    activeDevice = grantedDevice
    return grantedDevice
  }

  const filters: HIDDeviceFilter[] = [{ vendorId, usagePage }]
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
  const nextTask = operationQueue.then(task)
  operationQueue = nextTask.then(() => undefined, () => undefined)
  return nextTask
}

function waitForInputReport(device: HIDDevice, expectedReportId: number, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let cleanup = () => { }

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
        return
      }

      cleanup()
      resolve([event.reportId, ...toArray(event.data)])
    }

    timer = setTimeout(() => {
      cleanup()
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
  const readTask = isRead ? waitForInputReport(device, reportId) : null

  try {
    await device.sendReport(reportId, new Uint8Array(payload))
  }
  catch (error) {
    readTask?.cancel()
    throw error
  }

  if (!readTask) {
    return { message: 'write success' }
  }

  const data = await readTask.promise
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
  const device = await pickDevice(vendorId, usagePage)

  return {
    message: 'ok',
    devicePath: toDeviceKey(device),
  }
}

export async function closeWebHidDevice() {
  allowAutoRestore = false
  return await enqueueDeviceOperation(async () => {
    if (activeDevice?.opened) {
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
