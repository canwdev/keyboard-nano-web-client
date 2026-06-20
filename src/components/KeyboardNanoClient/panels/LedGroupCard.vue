<script setup lang="ts">
import type { LedGroupConfig } from '../hooks/use-led.ts'
import { ref } from 'vue'

const props = defineProps<{
  group: LedGroupConfig
  isPreviewing: boolean
}>()

const emit = defineEmits<{
  preview: [groupId: number]
  updateColor: [payload: { colorIndex: number, groupId: number, value: string }]
}>()

const keyLabels = ['K1', 'K2', 'K3'] as const
const selectedPreset = ref('')

const colorPresets = [
  { label: '极光渐变', value: ['#00F5FF', '#7B61FF', '#FF4FD8'] },
  { label: '海洋霓虹', value: ['#00C2FF', '#00E5A8', '#7CFFCB'] },
  { label: '熔岩落日', value: ['#FF5A36', '#FF8A00', '#FFD166'] },
  { label: '樱花糖果', value: ['#FF8CC6', '#FFB3DE', '#FFD8F0'] },
  { label: '青柠电波', value: ['#B8FF00', '#66FF66', '#00FFCC'] },
  { label: '赛博紫蓝', value: ['#00B8FF', '#3D5AFE', '#B026FF'] },
  { label: '银河冷焰', value: ['#7DF9FF', '#4D96FF', '#6C63FF'] },
  { label: '桃橙暖光', value: ['#FF7B54', '#FFB26B', '#FFD56F'] },
  { label: '森林萤火', value: ['#2ECC71', '#7DFFB3', '#C7FF95'] },
  { label: '冰川月光', value: ['#DFF6FF', '#8ED1FC', '#B1B2FF'] },
  { label: '电竞红金', value: ['#FF304F', '#FF9F1C', '#FFE66D'] },
  { label: '薄荷奶昔', value: ['#A8FFE3', '#7BF1A8', '#E4FFB7'] },
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
      <label
        v-for="(color, colorIndex) in props.group.colors" :key="`${props.group.id}-${colorIndex}`"
        class="led-group-card__color"
      >
        <span>{{ keyLabels[colorIndex] }}</span>
        <input
          :value="color" type="color"
          @input="emit('updateColor', { groupId: props.group.id, colorIndex, value: ($event.target as HTMLInputElement).value })"
        >
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
  gap: 10px;
}

.led-group-card__preset {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
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
