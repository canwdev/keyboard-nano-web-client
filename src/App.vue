<script setup lang="ts">
import { addNotification } from './components/CommonUI/NotificationList/notification-list.ts'
import KeyboardNanoClient from './components/KeyboardNanoClient/KeyboardNanoClient.vue'
import { isAxiosLoading } from './utils/api.ts'

window.$notification = addNotification
</script>

<template>
  <transition name="fade">
    <div v-show="isAxiosLoading" class="loading-layer">
      <div class="loading-card">
        <div class="loading-spinner" />
        <div>设备通信中，请稍候...</div>
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
</style>
