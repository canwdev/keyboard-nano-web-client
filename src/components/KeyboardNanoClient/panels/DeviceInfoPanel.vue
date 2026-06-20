<script setup lang="ts">
const props = defineProps<{
  appVersion: string
  isConnected: boolean
  reportId: string
  usagePage: string
  vendorId: string
}>()

const emit = defineEmits<{
  'connect': []
  'update:usagePage': [value: string]
  'update:vendorId': [value: string]
  'close': []
  'ping': []
  'refresh': []
  'reload': []
  'reset': []
}>()
</script>

<template>
  <section class="device-info-panel">
    <header class="device-info-panel__header">
      <h1>Keyboard Nano Client</h1>
      <span class="device-info-panel__version flex-rows">

        <a href="https://github.com/Jackadminx/Keyboard_nano_client/blob/main/Help/report.md" target="_blank">
          通信协议
        </a>

        <a href="https://github.com/canwdev/keyboard-nano-web-client" target="_blank">Github</a>

        <span>v{{ props.appVersion }}</span>
      </span>
    </header>

    <fieldset>
      <legend>设备信息</legend>

      <div class="device-info-panel__content">
        <div class="device-info-panel__inputs">
          <label class="device-info-panel__field">
            <span>vendor_id:</span>
            <input
              class="themed-input" :disabled="props.isConnected" :value="props.vendorId" type="text"
              @input="emit('update:vendorId', ($event.target as HTMLInputElement).value)"
            >
          </label>
          <label class="device-info-panel__field">
            <span>vendor_page:</span>
            <input
              class="themed-input" :disabled="props.isConnected" :value="props.usagePage" type="text"
              @input="emit('update:usagePage', ($event.target as HTMLInputElement).value)"
            >
          </label>
          <label class="device-info-panel__field">
            <span>usage_id:</span>
            <input class="themed-input" :value="props.reportId" type="text" readonly>
          </label>
        </div>

        <div class="flex-rows device-info-panel__actions">
          <button class="themed-button" @click="emit('refresh')">
            刷新信息
          </button>
          <template v-if="!props.isConnected">
            <button class="themed-button green" @click="emit('connect')">
              连接设备
            </button>
          </template>
          <template v-else>
            <button class="themed-button" @click="emit('ping')">
              Ping
            </button>
            <button class="themed-button yellow" @click="emit('reload')">
              重载配置
            </button>
            <button class="themed-button yellow" @click="emit('reset')">
              复位设备
            </button>
            <button class="themed-button red" @click="emit('close')">
              关闭连接
            </button>
          </template>
        </div>
      </div>
    </fieldset>
  </section>
</template>

<style scoped lang="scss">
.device-info-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-info-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: 24px;
  }
}

.device-info-panel__version {
  color: #666;
  font-size: 14px;
}

.device-info-panel__actions {
  justify-content: flex-end;
}

.device-info-panel__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.device-info-panel__inputs {
  display: grid;
  gap: 12px;
}

.device-info-panel__field {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.device-info-panel__field span {
  font-family: Consolas, 'Courier New', monospace;
}

.device-info-panel__field input {
  font-family: Consolas, 'Courier New', monospace;
}
</style>
