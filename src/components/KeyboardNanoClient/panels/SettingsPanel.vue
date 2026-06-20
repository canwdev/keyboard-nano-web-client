<script setup lang="ts">
import type { PropType } from 'vue'
import type { KeyboardModeOption } from '../hooks/use-settings.ts'

const props = defineProps({
  keyboardModeOptions: {
    type: Array as PropType<KeyboardModeOption[]>,
    required: true,
  },
  ledMode: {
    type: Number,
    required: true,
  },
  keyboardLP: {
    type: Number,
    required: true,
  },
  keyboardMode: {
    type: Number,
    required: true,
  },
  keyboardScanSP: {
    type: Number,
    required: true,
  },
  resolutionX: {
    type: Number,
    required: true,
  },
  resolutionY: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits<{
  'getResolution': []
  'update:keyboardLP': [value: number]
  'update:keyboardMode': [value: number]
  'update:keyboardScanSP': [value: number]
  'update:ledMode': [value: number]
  'update:resolutionX': [value: number]
  'update:resolutionY': [value: number]
}>()
</script>

<template>
  <div class="settings-panel">
    <div class="flex-cols">
      <fieldset>
        <legend>预设模式</legend>
        <div class="flex-rows preset-mode-list">
          <label
            v-for="(item, index) in props.keyboardModeOptions" :key="index" class="preset-mode-option"
            :title="item.tooltip"
          >
            <input
              :checked="props.keyboardMode === index" type="radio" :value="index"
              @change="emit('update:keyboardMode', index)"
            >
            <span>{{ item.label }}</span>
            <span class="preset-mode-option__tooltip">{{ item.tooltip }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>功能</legend>
        <div class="settings-feature-panel">
          <label class="settings-feature-panel__checkbox" title="灯光总开关">
            <input
              :checked="props.ledMode > 0" type="checkbox"
              @change="emit('update:ledMode', ($event.target as HTMLInputElement).checked ? (props.ledMode || 1) : 0)"
            >
            灯光总开关(启用RGB)
          </label>

          <label class="settings-feature-panel__row" title="按键扫描间隔过短可能导致连击">
            <span>按键扫描间隔:</span>
            <div class="settings-feature-panel__control">
              <input
                :value="props.keyboardScanSP" type="number" min="1" max="255"
                @input="emit('update:keyboardScanSP', Number(($event.target as HTMLInputElement).value))"
              >
              <span>ms</span>
            </div>
          </label>

          <label class="settings-feature-panel__row">
            <span>长按识别间隔:</span>
            <div class="settings-feature-panel__control">
              <input
                :value="props.keyboardLP" type="number" min="100" max="10000" step="100"
                @input="emit('update:keyboardLP', Number(($event.target as HTMLInputElement).value))"
              >
              <span>ms</span>
            </div>
          </label>

          <label class="settings-feature-panel__row" title="用于设置触摸屏">
            <span>屏幕分辨率:</span>
            <div class="settings-feature-panel__resolution">
              <input
                :value="props.resolutionX" type="number" min="50" max="4000"
                @input="emit('update:resolutionX', Number(($event.target as HTMLInputElement).value))"
              >
              <span>*</span>
              <input
                :value="props.resolutionY" type="number" min="50" max="4000"
                @input="emit('update:resolutionY', Number(($event.target as HTMLInputElement).value))"
              >
            </div>
          </label>

          <button class="themed-button settings-feature-panel__button" title="尝试获取屏幕分辨率" @click="emit('getResolution')">
            获取屏幕分辨率
          </button>
        </div>
      </fieldset>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preset-mode-list {
  display: grid;
  grid-template-rows: repeat(5, 1fr);
  grid-template-columns: auto;
  grid-auto-flow: column;
  gap: 4px;
}

.preset-mode-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.preset-mode-option__tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  min-width: 180px;
  max-width: 260px;
  padding: 8px 10px;
  border: 1px solid rgba(79, 124, 255, 0.25);
  border-radius: 8px;
  background: rgba(18, 22, 34, 0.96);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-line;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.preset-mode-option:hover .preset-mode-option__tooltip,
.preset-mode-option:focus-within .preset-mode-option__tooltip {
  opacity: 1;
  transform: translateY(0);
}

.settings-feature-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-feature-panel__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.settings-feature-panel__row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.settings-feature-panel__control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.settings-feature-panel__control input {
  width: 84px;
}

.settings-feature-panel__resolution {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.settings-feature-panel__resolution input {
  width: 84px;
}

.settings-feature-panel__button {
  width: fit-content;
}
</style>
