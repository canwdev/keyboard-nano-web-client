<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  colorList: {
    type: Array as PropType<string[]>,
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
})

const emit = defineEmits<{
  'testColor': []
  'updateColor': [index: number, value: string]
  'update:ledEffectMode': [value: number]
  'update:ledMode': [value: number]
}>()
</script>

<template>
  <div class="led-panel">
    <fieldset>
      <legend>LED设置</legend>

      <div class="flex-cols">
        <label>
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
        <label>
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
      </div>
    </fieldset>

    <fieldset>
      <legend>LED 测试</legend>

      <div class="flex-cols">
        <div>仅用于测试LED功能，设置不会保存，点击[重载配置]还原。</div>

        <div class="flex-rows">
          <input
            v-for="(item, index) in props.colorList" :key="index" :value="item" type="color"
            @input="emit('updateColor', index, ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div class="flex-rows">
          <button class="themed-button" @click="emit('testColor')">
            测试
          </button>
        </div>
      </div>
    </fieldset>
  </div>
</template>
