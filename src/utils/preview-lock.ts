import { ref } from 'vue'

type StopPreviewHandler = (() => Promise<void> | void) | null

export const isPreviewLockActive = ref(false)
export const previewLockMessage = ref('炫彩预览中，其他操作已锁定。')
export const isPreviewStopping = ref(false)

let stopPreviewHandler: StopPreviewHandler = null

export function setPreviewLock(message?: string, handler?: StopPreviewHandler) {
  previewLockMessage.value = message ?? '炫彩预览中，其他操作已锁定。'
  stopPreviewHandler = handler ?? null
  isPreviewLockActive.value = true
}

export function clearPreviewLock() {
  isPreviewLockActive.value = false
  isPreviewStopping.value = false
  stopPreviewHandler = null
}

export async function stopPreviewFromOverlay() {
  if (isPreviewStopping.value || !stopPreviewHandler) {
    return
  }

  isPreviewStopping.value = true
  try {
    await stopPreviewHandler()
  }
  finally {
    isPreviewStopping.value = false
  }
}
