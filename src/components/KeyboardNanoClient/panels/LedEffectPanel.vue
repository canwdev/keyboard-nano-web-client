<script setup lang="ts">
import type { PropType } from 'vue'
import type { LedEffectPreviewOption } from '../hooks/use-led.ts'

const props = defineProps({
  effectPreviewOptions: {
    type: Array as PropType<LedEffectPreviewOption[]>,
    required: true,
  },
  ledEffectMode: {
    type: Number,
    required: true,
  },
  ledEffectModes: {
    type: Array as PropType<string[]>,
    required: true,
  },
  previewingEffectId: {
    type: String as PropType<string | null>,
    default: null,
  },
})

const emit = defineEmits<{
  'closePreview': []
  'previewEffect': [effectId: string]
  'update:ledEffectMode': [value: number]
}>()
</script>

<template>
  <div class="led-effect-panel">
    <fieldset>
      <legend>设备灯效</legend>
      <div class="led-effect-panel__mode-list">
        <label v-for="(item, index) in props.ledEffectModes" :key="index" class="led-effect-panel__mode-option">
          <input :checked="props.ledEffectMode === index" type="radio" name="device-led-effect" :value="index"
            @change="emit('update:ledEffectMode', index)">
          <span>{{ item }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>炫彩预览</legend>

      <div class="led-effect-panel__toolbar">
        <div class="led-effect-panel__hint">
          这里是纯前端循环预览，不修改设备固件灯效模式。
        </div>
        <!-- <button class="themed-button" :disabled="!props.previewingEffectId" @click="emit('closePreview')">
          关闭预览
        </button> -->
      </div>

      <div class="led-effect-panel__list">
        <div v-for="item in props.effectPreviewOptions" :key="item.id" class="led-effect-panel__item"
          :class="{ 'led-effect-panel__item--active': props.previewingEffectId === item.id }" role="button" tabindex="0"
          @click="emit('previewEffect', item.id)" @keydown.enter="emit('previewEffect', item.id)"
          @keydown.space.prevent="emit('previewEffect', item.id)">
          <strong>{{ item.label }}</strong>
          <span>{{ item.description }}</span>
          <em v-if="props.previewingEffectId === item.id">预览中</em>
        </div>
      </div>
    </fieldset>
  </div>
</template>

<style scoped lang="scss">
.led-effect-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.led-effect-panel__toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.led-effect-panel__hint {
  color: #666;
  font-size: 13px;
  line-height: 1.5;
}

.led-effect-panel__mode-list {
  display: grid;
  gap: 2px;
}

.led-effect-panel__mode-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.led-effect-panel__list {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.led-effect-panel__item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #9c9c9c33;
  border-radius: 8px;
  background: #ffffff66;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.led-effect-panel__item:hover {
  transform: translateY(-1px);
  border-color: #4d8d7a80;
}

.led-effect-panel__item--active {
  border-color: #4d8d7a;
  background: #4d8d7a14;
}

.led-effect-panel__item span {
  color: #666;
  font-size: 12px;
  line-height: 1.5;
}

.led-effect-panel__item em {
  color: #4d8d7a;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
}
</style>
