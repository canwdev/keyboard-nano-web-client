import { ref } from 'vue'

const DEBUG_LOG_KEY = 'keyboard_nano_debug_log'

function readInitialDebugState() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(DEBUG_LOG_KEY) === '1'
}

export const isDebugLogEnabled = ref(readInitialDebugState())

export function setAppDebugLogging(enabled: boolean) {
  isDebugLogEnabled.value = enabled

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DEBUG_LOG_KEY, enabled ? '1' : '0')
  }
}

export const logger = {
  debug(message: string, payload?: unknown) {
    if (!isDebugLogEnabled.value) {
      return
    }

    if (payload === undefined) {
      console.log(message)
      return
    }

    console.log(message, payload)
  },
  warn(message: string, payload?: unknown) {
    if (!isDebugLogEnabled.value) {
      return
    }

    if (payload === undefined) {
      console.warn(message)
      return
    }

    console.warn(message, payload)
  },
  error(message: string, payload?: unknown) {
    if (payload === undefined) {
      console.error(message)
      return
    }

    console.error(message, payload)
  },
}
