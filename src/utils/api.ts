import { ref } from 'vue'
import { closeWebHidDevice, connectWebHidDevice, getWebHidStatus, pingWebHid, writeWebHid } from './webhid'

export const isAxiosLoading = ref(false)

async function runWithLoading<T>(task: () => Promise<T>) {
  try {
    isAxiosLoading.value = true
    console.log('[api] request start')
    return await task()
  }
  catch (error: any) {
    isAxiosLoading.value = false
    const message = error.response?.data?.message || error.message
    console.error('[api] request error', {
      message,
      error,
    })

    window.$notification({
      type: 'error',
      message,
      timeout: 5000,
    })

    return Promise.reject(error)
  }
  finally {
    isAxiosLoading.value = false
    console.log('[api] request finish')
  }
}

export const keyboardNanoApi = {
  getStatus: async () => {
    console.log('[api] getStatus')
    return await runWithLoading(() => getWebHidStatus())
  },
  deviceInit: async (params?: any) => {
    console.log('[api] deviceInit', params)
    return await runWithLoading(() => connectWebHidDevice(params))
  },
  deviceClose: async () => {
    console.log('[api] deviceClose')
    return await runWithLoading(() => closeWebHidDevice())
  },
  write: async (params?: any) => {
    console.log('[api] write', params)
    return await runWithLoading(() => writeWebHid(params))
  },
  ping: async () => {
    console.log('[api] ping')
    return await runWithLoading(() => pingWebHid())
  },
}
