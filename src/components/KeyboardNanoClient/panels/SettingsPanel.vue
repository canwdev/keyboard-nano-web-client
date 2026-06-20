<script setup lang="ts">
import type { PropType } from 'vue'
import type { KeyboardModeOption } from '../hooks/use-settings.ts'

const props = defineProps({
  keyboardModeOptions: {
    type: Array as PropType<KeyboardModeOption[]>,
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
  'update:keyboardLP': [value: number]
  'update:keyboardMode': [value: number]
  'update:keyboardScanSP': [value: number]
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
        <div>
          按键扫描间隔:
          <input
            :value="props.keyboardScanSP" type="number"
            @input="emit('update:keyboardScanSP', Number(($event.target as HTMLInputElement).value))"
          >
        </div>
        <div>
          长按识别间隔:
          <input
            :value="props.keyboardLP" type="number"
            @input="emit('update:keyboardLP', Number(($event.target as HTMLInputElement).value))"
          >
        </div>
        <div>屏幕分辨率: {{ props.resolutionX }} x {{ props.resolutionY }}</div>
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
</style>
