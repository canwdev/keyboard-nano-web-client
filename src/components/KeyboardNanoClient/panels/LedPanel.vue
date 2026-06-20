<script setup lang="ts">
import type { PropType } from 'vue'
import type { LedGroupConfig } from '../hooks/use-led.ts'
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
  ledMode: {
    type: Number,
    required: true,
  },
  previewingGroupId: {
    type: Number as PropType<number | null>,
    default: null,
  },
})

const emit = defineEmits<{
  'closePreview': []
  'previewGroup': [groupId: number]
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
          <select
            :value="props.ledMode"
            @change="emit('update:ledMode', Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="(item, index) in props.ledModes" :key="index" :value="index">
              {{ item }}
            </option>
          </select>
        </label>
        <label class="led-panel__field">
          灯效：
          <select
            :value="props.ledEffectMode"
            @change="emit('update:ledEffectMode', Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="(item, index) in props.ledEffectModes" :key="index" :value="index">
              {{ item }}
            </option>
          </select>
        </label>
        <div class="led-panel__actions">
          <button class="themed-button" :disabled="props.previewingGroupId === null" @click="emit('closePreview')">
            关闭预览
          </button>
        </div>
      </div>
    </fieldset>

    <fieldset>
      <legend>灯光组颜色</legend>

      <div class="led-panel__hint">
        每个灯光组包含 3 个键位颜色。点击单组的“预览”可临时点亮查看，保存后才会写入设备配置。
      </div>

      <div class="led-panel__groups">
        <LedGroupCard
          v-for="group in props.ledGroups" :key="group.id" :group="group"
          :is-previewing="props.previewingGroupId === group.id" @preview="emit('previewGroup', $event)"
          @update-brightness="emit('updateGroupBrightness', $event.groupId, $event.value)"
          @update-color="emit('updateGroupColor', $event.groupId, $event.colorIndex, $event.value)"
        />
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
