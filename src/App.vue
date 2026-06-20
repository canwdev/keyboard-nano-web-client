<script setup lang="ts">
import { computed } from 'vue'
import { addNotification } from './components/CommonUI/NotificationList/notification-list.ts'
import KeyboardNanoClient from './components/KeyboardNanoClient/KeyboardNanoClient.vue'
import { isAxiosLoading } from './utils/api.ts'
import { setAppDebugLogging } from './utils/logger.ts'
import { isPreviewLockActive, isPreviewStopping, previewLockMessage, stopPreviewFromOverlay } from './utils/preview-lock.ts'
import { isUiBusy, uiBusyMessage } from './utils/ui-busy.ts'

window.$notification = addNotification
window.__setKeyboardNanoDebugLog = setAppDebugLogging
const isGlobalOverlayVisible = computed(() => isAxiosLoading.value || isPreviewLockActive.value || isUiBusy.value)
const globalOverlayMessage = computed(() => {
  if (isPreviewLockActive.value) {
    return previewLockMessage.value
  }

  if (isUiBusy.value) {
    return uiBusyMessage.value
  }

  return '设备通信中，请稍候...'
})
</script>

<template>
  <transition name="fade">
    <div v-show="isGlobalOverlayVisible" class="loading-layer">
      <div class="loading-card">
        <div v-if="!isPreviewLockActive" class="loading-spinner" />
        <div>{{ globalOverlayMessage }}</div>
        <button v-if="isPreviewLockActive" class="loading-stop-button" :disabled="isPreviewStopping"
          @click="stopPreviewFromOverlay">
          {{ isPreviewStopping ? '停止中...' : '停止预览' }}
        </button>
      </div>
    </div>
  </transition>
  <KeyboardNanoClient />
</template>

<style lang="scss">
.loading-layer {
  position: fixed;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.82);
  color: #111;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
  transition: all 0.3s;
}

.loading-card {
  min-width: 220px;
  padding: 20px 24px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  font-size: 16px;
}

.loading-stop-button {
  min-width: 120px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #4d8d7a;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.loading-stop-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #d7dbe2;
  border-top-color: #409eff;
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

fieldset {
  border-radius: 5px;
}
</style>
