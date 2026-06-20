<script setup lang="ts">
import type { PropType } from 'vue'
import type { LedEffectPreviewOption, LedGroupConfig } from '../hooks/use-led.ts'
import LedGroupCard from './LedGroupCard.vue'

const props = defineProps({
  ledGroups: {
    type: Array as PropType<LedGroupConfig[]>,
    required: true,
  },
  ledEffectModes: {
    type: Array as PropType<string[]>,
    required: true,
  },
  ledModes: {
    type: Array as PropType<string[]>,
    required: true,
  },
  ledEffectMode: {
    type: Number,
    required: true,
  },
  effectPreviewOptions: {
    type: Array as PropType<LedEffectPreviewOption[]>,
    required: true,
  },
  ledMode: {
    type: Number,
    required: true,
  },
  previewingGroupId: {
    type: Number as PropType<number | null>,
    default: null,
  },
  previewingEffectId: {
    type: String as PropType<string | null>,
    default: null,
  },
})

const emit = defineEmits<{
  'closePreview': []
  'previewGroup': [groupId: number]
  'previewEffect': [effectId: string]
  'updateGroupBrightness': [groupId: number, value: number]
  'updateGroupColor': [groupId: number, colorIndex: number, value: string]
  'update:ledEffectMode': [value: number]
  'update:ledMode': [value: number]
}>()
</script>

<template>
  <div class="led-panel">
    <fieldset>
      <legend>LED设置</legend>

      <div class="led-panel__settings">
        <label class="led-panel__field">
          灯光组：
          <select :value="props.ledMode"
            @change="emit('update:ledMode', Number(($event.target as HTMLSelectElement).value))">
            <option v-for="(item, index) in props.ledModes" :key="index" :value="index">
              {{ item }}
            </option>
          </select>
        </label>
        <label class="led-panel__field">
          灯效：
          <select :value="props.ledEffectMode"
            @change="emit('update:ledEffectMode', Number(($event.target as HTMLSelectElement).value))">
            <option v-for="(item, index) in props.ledEffectModes" :key="index" :value="index">
              {{ item }}
            </option>
          </select>
        </label>
        <div class="led-panel__actions">
          <button class="themed-button"
            :disabled="props.previewingGroupId === null && props.previewingEffectId === null"
            @click="emit('closePreview')">
            关闭预览
          </button>
        </div>
      </div>
    </fieldset>

    <fieldset>
      <legend>灯光组颜色</legend>

      <div class="led-panel__hint">
        每个灯光组包含 3 个键位颜色。亮度为前端模拟，会在预览和保存时按比例缩放 RGB 数值；保存后写入设备的是缩放后的颜色值。点击单组的“预览”可临时点亮查看，保存后才会写入设备配置。
      </div>

      <div class="led-panel__groups">
        <LedGroupCard v-for="group in props.ledGroups" :key="group.id" :group="group"
          :is-previewing="props.previewingGroupId === group.id" @preview="emit('previewGroup', $event)"
          @update-brightness="emit('updateGroupBrightness', $event.groupId, $event.value)"
          @update-color="emit('updateGroupColor', $event.groupId, $event.colorIndex, $event.value)" />
      </div>
    </fieldset>

    <fieldset>
      <legend>炫彩灯效</legend>

      <div class="led-panel__hint">
        这里是纯前端循环预览，不修改设备固件灯效模式；点击任意灯效卡片后会进入预览锁定状态，直到手动关闭。
      </div>

      <div class="led-panel__effect-list">
        <div v-for="item in props.effectPreviewOptions" :key="item.id" class="led-panel__effect-item"
          :class="{ 'led-panel__effect-item--active': props.previewingEffectId === item.id }" role="button" tabindex="0"
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
.led-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.led-panel__settings {
  display: grid;
  gap: 12px;
}

.led-panel__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.led-panel__actions {
  display: flex;
  justify-content: flex-start;
}

.led-panel__effect-list {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.led-panel__effect-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #9c9c9c33;
  border-radius: 8px;
  background: #ffffff66;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.led-panel__effect-item:hover {
  transform: translateY(-1px);
  border-color: #4d8d7a80;
}

.led-panel__effect-item--active {
  border-color: #4d8d7a;
  background: #4d8d7a14;
}

.led-panel__effect-item span {
  color: #666;
  font-size: 12px;
  line-height: 1.5;
}

.led-panel__effect-item em {
  color: #4d8d7a;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
}

.led-panel__hint {
  margin-bottom: 12px;
  color: #666;
  font-size: 13px;
  line-height: 1.5;
}

.led-panel__groups {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
</style>
