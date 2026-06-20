import type { HidDevice } from '../types.ts'
import { computed, ref } from 'vue'
import { keyboardNanoApi } from '../../../utils/api.ts'
import { ActionType, PAGE_ID } from '../types.ts'

interface DeviceLoaders {
  loadKeyboardConfigs: () => Promise<void>
  loadSettings: () => Promise<void>
}

async function noopAsync() { }

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function shouldRetryLoad(error: unknown) {
  return error instanceof Error && /读取设备超时|设备未连接/.test(error.message)
}

function formatHex(value: number | string) {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) {
    return String(value)
  }
  return `0x${normalized.toString(16).toUpperCase()}`
}

export function useDevice() {
  const vendorId = ref('')
  const usagePage = ref('')
  const isConnected = ref(false)
  const deviceList = ref<HidDevice[]>([])

  const loaders: DeviceLoaders = {
    loadKeyboardConfigs: noopAsync,
    loadSettings: noopAsync,
  }

  const deviceListGroupByProduct = computed(() => {
    return deviceList.value.reduce(
      (acc, device) => {
        const key = device.product
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(device)
        return acc
      },
      {} as Record<string, HidDevice[]>,
    )
  })

  function setLoaders(nextLoaders: Partial<DeviceLoaders>) {
    if (nextLoaders.loadSettings) {
      loaders.loadSettings = nextLoaders.loadSettings
    }

    if (nextLoaders.loadKeyboardConfigs) {
      loaders.loadKeyboardConfigs = nextLoaders.loadKeyboardConfigs
    }
  }

  async function runLoadersWithRetry(context: string) {
    try {
      await loaders.loadSettings()
      await loaders.loadKeyboardConfigs()
    }
    catch (error) {
      if (!shouldRetryLoad(error)) {
        throw error
      }

      console.warn('[page] loader retry', {
        context,
        error,
      })
      await wait(250)
      await getStatus()
      await loaders.loadSettings()
      await loaders.loadKeyboardConfigs()
    }
  }

  async function getStatus() {
    const res = await keyboardNanoApi.getStatus() as {
      devices: HidDevice[]
      isConnected: boolean
      usagePage: number | string
      vendorId: number | string
    }

    isConnected.value = res.isConnected
    vendorId.value = formatHex(res.vendorId)
    usagePage.value = formatHex(res.usagePage)
    deviceList.value = res.devices
  }

  async function writeDataRaw(buffer: number[] = [], isRead = false) {
    console.log('[page] writeDataRaw', {
      isRead,
      buffer,
    })
    return await keyboardNanoApi.write({
      buffer,
      isRead,
    })
  }

  async function writeData(action: ActionType, extraData: number[] = [], isRead = false) {
    let buffer: number[] = []

    buffer[0] = PAGE_ID
    buffer[1] = action

    if (extraData) {
      buffer = [...buffer, ...extraData]
    }

    console.log('[page] writeData', {
      action,
      extraData,
      isRead,
      buffer,
    })
    return await writeDataRaw(buffer, isRead)
  }

  async function connectDevice() {
    await keyboardNanoApi.deviceInit({
      vendor_id: vendorId.value,
      usage_page: usagePage.value,
    })
    await getStatus()
    await wait(200)
    await runLoadersWithRetry('connect')
  }

  async function closeDevice() {
    await keyboardNanoApi.deviceClose()
    await getStatus()
  }

  async function sendPing() {
    const { message } = await keyboardNanoApi.ping()
    window.$notification({
      message,
      timeout: 5000,
    })
  }

  async function reloadDevice() {
    console.log('[page] reloadDevice start')
    await writeData(ActionType.RELOAD)
    console.log('[page] reloadDevice wait before refresh', { waitMs: 600 })
    await wait(600)
    console.log('[page] reloadDevice refresh start')
    await runLoadersWithRetry('reload')
    console.log('[page] reloadDevice finished')
  }

  async function resetDevice() {
    await writeData(ActionType.RESET)
    await closeDevice()

    setTimeout(() => {
      void connectDevice()
    }, 1000)
  }

  async function initializeDevice() {
    await getStatus()
    if (isConnected.value) {
      await runLoadersWithRetry('initialize')
    }
  }

  return {
    closeDevice,
    connectDevice,
    deviceListGroupByProduct,
    getStatus,
    initializeDevice,
    isConnected,
    reloadDevice,
    resetDevice,
    sendPing,
    setLoaders,
    usagePage,
    vendorId,
    writeData,
    writeDataRaw,
  }
}
