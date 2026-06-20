<script setup lang="ts">
import KeyboardNanoClient from './components/KeyboardNanoClient/KeyboardNanoClient.vue'
import {isAxiosLoading} from './utils/api.ts'
import {addNotification} from './components/CommonUI/NotificationList/notification-list.ts'

window.$notification = addNotification
</script>

<template>
  <transition name="fade">
    <div class="loading-layer" v-show="isAxiosLoading">⌛ Please Wait...</div>
  </transition>
  <KeyboardNanoClient />
</template>

<style lang="scss">
.loading-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  color: black;
  z-index: 20;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  visibility: visible;
  opacity: 1;
}
</style>
