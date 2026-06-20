import { ref } from 'vue'
import { closeWebHidDevice, connectWebHidDevice, getWebHidStatus, pingWebHid, writeWebHid } from './webhid'

export const isAxiosLoading = ref(false)

async function runWithLoading<T>(task: () => Promise<T>) {
  try {
    isAxiosLoading.value = true
    return await task()
  } catch (error: any) {
    isAxiosLoading.value = false
    const message = error.response?.data?.message || error.message

    window.$notification({
      type: 'error',
      message: message,
      timeout: 5000,
    })

    return Promise.reject(error)
  } finally {
    isAxiosLoading.value = false
  }
}

export const keyboardNanoApi = {
  getStatus: async () => {
    return await runWithLoading(() => getWebHidStatus())
  },
  deviceInit: async (params?: any) => {
    return await runWithLoading(() => connectWebHidDevice(params))
  },
  deviceClose: async () => {
    return await runWithLoading(() => closeWebHidDevice())
  },
  write: async (params?: any) => {
    return await runWithLoading(() => writeWebHid(params))
  },
  ping: async () => {
    return await runWithLoading(() => pingWebHid())
  },
}
