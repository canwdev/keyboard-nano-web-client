<script setup lang="ts">
import type { LedGroupConfig } from '../hooks/use-led.ts'
import { ref } from 'vue'

const props = defineProps<{
  group: LedGroupConfig
  isPreviewing: boolean
}>()

const emit = defineEmits<{
  preview: [groupId: number]
  updateBrightness: [payload: { groupId: number, value: number }]
  updateColor: [payload: { colorIndex: number, groupId: number, value: string }]
}>()

const keyLabels = ['K1', 'K2', 'K3'] as const
const selectedPreset = ref('')

const colorPresets = [
  { label: '极光渐变', value: ['#0000FF', '#7F00FF', '#FF007F'] },
  { label: '海洋霓虹', value: ['#0000FF', '#00FF88', '#00FFCC'] },
  { label: '熔岩落日', value: ['#FF0000', '#FF4500', '#FF8800'] },
  { label: '樱花糖果', value: ['#ff4281', '#FF00AA', '#FF55CC'] },
  { label: '青柠电波', value: ['#77FF00', '#00FF00', '#00FF88'] },
  { label: '赛博紫蓝', value: ['#0055FF', '#2200FF', '#AA00FF'] },
  { label: '银河冷焰', value: ['#00FFFF', '#0055FF', '#5500FF'] },
  { label: '桃橙暖光', value: ['#FF3300', '#FF6600', '#FF9900'] },
  { label: '森林萤火', value: ['#00FF00', '#00FF66', '#55FF00'] },
  { label: '冰川月光', value: ['#0088FF', '#00FFFF', '#3300FF'] },
  { label: '电竞红金', value: ['#FF0000', '#FF5500', '#FFB300'] },
  { label: '薄荷奶昔', value: ['#00FFCC', '#00FF55', '#AAFF00'] },
  { label: '麦田逐光', value: ['#8C5505', '#EBA60F', '#FF7300'] },
] as const

function applyPreset(colors: readonly [string, string, string]) {
  colors.forEach((color, colorIndex) => {
    emit('updateColor', {
      groupId: props.group.id,
      colorIndex,
      value: color,
    })
  })
}

function handlePresetChange(value: string) {
  selectedPreset.value = value
  const preset = colorPresets.find(item => item.label === value)
  if (!preset) {
    return
  }

  applyPreset(preset.value)
}
</script>

<template>
  <section class="led-group-card">
    <header class="led-group-card__header">
      <strong>{{ props.group.label }}</strong>
      <button class="themed-button led-group-card__preview" @click="emit('preview', props.group.id)">
        {{ props.isPreviewing ? '预览中' : '预览' }}
      </button>
    </header>

    <div class="led-group-card__colors">
      <label class="led-group-card__preset">
        <span>预设</span>
        <select :value="selectedPreset" @change="handlePresetChange(($event.target as HTMLSelectElement).value)">
          <option value="">
            选择颜色组
          </option>
          <option v-for="preset in colorPresets" :key="preset.label" :value="preset.label">
            {{ preset.label }}
          </option>
        </select>
      </label>
      <label class="led-group-card__brightness">
        <span>亮度</span>
        <div class="led-group-card__brightness-control">
          <input :value="props.group.brightness" type="range" min="0" max="100" step="1"
            @input="emit('updateBrightness', { groupId: props.group.id, value: Number(($event.target as HTMLInputElement).value) })">
          <strong>{{ props.group.brightness }}%</strong>
        </div>
      </label>
      <label v-for="(color, colorIndex) in props.group.colors" :key="`${props.group.id}-${colorIndex}`"
        class="led-group-card__color">
        <span>{{ keyLabels[colorIndex] }}</span>
        <input :value="color" type="color"
          @input="emit('updateColor', { groupId: props.group.id, colorIndex, value: ($event.target as HTMLInputElement).value })">
      </label>
    </div>
  </section>
</template>

<style scoped lang="scss">
.led-group-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid #9c9c9c33;
  border-radius: 8px;
}

.led-group-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.led-group-card__preview {
  min-width: 72px;
}

.led-group-card__colors {
  display: grid;
}

.led-group-card__preset {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.led-group-card__brightness {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.led-group-card__brightness-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
}

.led-group-card__brightness-control input {
  width: 100%;
}

.led-group-card__color {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.led-group-card__color input {
  width: 100%;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
}
</style>
