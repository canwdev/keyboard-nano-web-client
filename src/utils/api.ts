import { ref } from 'vue'
import { logger } from './logger.ts'
import { closeWebHidDevice, connectWebHidDevice, getWebHidStatus, pingWebHid, writeWebHid } from './webhid'

export const isAxiosLoading = ref(false)

async function runWithLoading<T>(task: () => Promise<T>, useLoading = true) {
  try {
    if (useLoading) {
      isAxiosLoading.value = true
    }
    logger.debug('[api] request start')
    return await task()
  }
  catch (error: any) {
    if (useLoading) {
      isAxiosLoading.value = false
    }
    const message = error.response?.data?.message || error.message
    logger.error('[api] request error', {
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
    if (useLoading) {
      isAxiosLoading.value = false
    }
    logger.debug('[api] request finish')
  }
}

export const keyboardNanoApi = {
  getStatus: async () => {
    logger.debug('[api] getStatus')
    return await runWithLoading(() => getWebHidStatus())
  },
  deviceInit: async (params?: any) => {
    logger.debug('[api] deviceInit', params)
    return await runWithLoading(() => connectWebHidDevice(params))
  },
  deviceClose: async () => {
    logger.debug('[api] deviceClose')
    return await runWithLoading(() => closeWebHidDevice())
  },
  write: async (params?: any) => {
    logger.debug('[api] write', params)
    return await runWithLoading(() => writeWebHid(params), params?.useLoading ?? true)
  },
  ping: async () => {
    logger.debug('[api] ping')
    return await runWithLoading(() => pingWebHid())
  },
}
