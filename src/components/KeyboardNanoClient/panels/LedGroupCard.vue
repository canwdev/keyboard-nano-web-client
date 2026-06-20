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
  // 优化：原青色、浅紫在LED上容易混成一片白。改为纯蓝、纯紫、纯品红，LED发光极其艳丽。

  { label: '海洋霓虹', value: ['#0000FF', '#00FF88', '#00FFCC'] },
  // 优化：去除了过浅的 #7CFFCB，强化了绿光和蓝光的比例，避免LED呈现出淡淡的死青色。

  { label: '熔岩落日', value: ['#FF0000', '#FF4500', '#FF8800'] },
  // 优化：原黄色（#FFD166）在LED上极易泛白。改为纯红、橙红、正橙的渐变，更有灼烧感。

  { label: '樱花糖果', value: ['#FF0055', '#FF00AA', '#FF55CC'] },
  // 优化：原色全是低饱和度的粉白，LED上会是一片惨白带点粉。改为高饱和的樱桃红和深粉，靠亮度差营造渐变。

  { label: '青柠电波', value: ['#77FF00', '#00FF00', '#00FF88'] },
  // 优化：原 #B8FF00 混入过多红光在LED上会发黄。调整为纯正的青柠绿、正绿和薄荷绿。

  { label: '赛博紫蓝', value: ['#0055FF', '#2200FF', '#AA00FF'] },
  // 优化：压缩了 R、G 通道的杂色，纯化了冰蓝、深蓝和霓虹紫，赛博朋克感更强。

  { label: '银河冷焰', value: ['#00FFFF', '#0055FF', '#5500FF'] },
  // 优化：原浅蓝色（#7DF9FF）直接用标准的青色（Cyan）代替，中段用纯蓝衔接，尾段用蓝紫，色彩对比度大幅提升。

  { label: '桃橙暖光', value: ['#FF3300', '#FF6600', '#FF9900'] },
  // 优化：LED 的黄色极难调，带一点 G（绿）就会发绿，带一点 W（白）就会泛白。这里全部使用纯粹的红橙比例，硬件显色非常温馨。

  { label: '森林萤火', value: ['#00FF00', '#00FF66', '#55FF00'] },
  // 优化：彻底砍掉原色中的白色成分（如 #C7FF95），保留最纯粹、发光效率最高的绿光通道。

  { label: '冰川月光', value: ['#0088FF', '#00FFFF', '#3300FF'] },
  // 优化：原方案在硬件上基本就是“白、浅蓝白、浅紫白”，很难看出渐变。调整为深冰蓝、青色和靛蓝。

  { label: '电竞红金', value: ['#FF0000', '#FF5500', '#FFB300'] },
  // 优化：原金色（#FFE66D）在LED上是灾难（像日光灯管）。这里将“金”往“重琥珀色/深黄”方向靠，红金对比更强烈。

  { label: '薄荷奶昔', value: ['#00FFCC', '#00FF55', '#AAFF00'] },
  // 优化：消除了奶昔的“奶白色”杂质，全部转化为高纯度的荧光薄荷色调。
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
          <input
            :value="props.group.brightness" type="range" min="0" max="100" step="1"
            @input="emit('updateBrightness', { groupId: props.group.id, value: Number(($event.target as HTMLInputElement).value) })"
          >
          <strong>{{ props.group.brightness }}%</strong>
        </div>
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
