<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  keyboardModes: {
    type: Array as PropType<string[]>,
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
          <label v-for="(item, index) in props.keyboardModes" :key="index">
            <input
              :checked="props.keyboardMode === index" type="radio" :value="index"
              @change="emit('update:keyboardMode', index)"
            >
            {{ item }}
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
</style>
