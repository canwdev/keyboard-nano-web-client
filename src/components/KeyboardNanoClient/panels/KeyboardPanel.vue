<script setup lang="ts">
import type { PropType } from 'vue'
import type { KeyboardKeyConfig } from '../hooks/use-keyboard.ts'
import { mainJson } from '../data/index.ts'

const props = defineProps({
  dialKeyOptions: {
    type: Array as PropType<string[]>,
    required: true,
  },
  keyboardList: {
    type: Array as PropType<KeyboardKeyConfig[]>,
    required: true,
  },
  mediaKeyOptions: {
    type: Array as PropType<string[]>,
    required: true,
  },
  mouseButtonOptions: {
    type: Array as PropType<string[]>,
    required: true,
  },
  standardKeyOptions: {
    type: Array as PropType<string[]>,
    required: true,
  },
  touchKeyOptions: {
    type: Array as PropType<string[]>,
    required: true,
  },
  updateKeyFunction: {
    type: Function as PropType<(item: KeyboardKeyConfig, functionIndex: number) => void>,
    required: true,
  },
})

const emit = defineEmits<{
  lightKey: [index: number]
}>()
</script>

<template>
  <div class="keyboard-panel">
    <div class="flex-rows keyboard-list">
      <div v-for="item in props.keyboardList" :key="item.id" class="keyboard-item">
        <button class="themed-button btn-keyboard" @click="emit('lightKey', item.id)">
          点亮 {{ item.id }} 键
        </button>

        <div class="flex-cols keyboard-config">
          <label class="keyboard-field">
            <span>功能</span>
            <select :value="item.functionIndex"
              @change="props.updateKeyFunction(item, Number(($event.target as HTMLSelectElement).value))">
              <option v-for="(func, index) in mainJson.key_func_list" :key="index" :value="index">
                {{ func }}
              </option>
            </select>
          </label>

          <template v-if="item.functionIndex === 0">
            <label class="keyboard-field">
              <span>标准按键</span>
              <select v-model="item.standardKey">
                <option value="">
                  未设置
                </option>
                <option v-for="keyName in props.standardKeyOptions" :key="keyName" :value="keyName">
                  {{ keyName }}
                </option>
              </select>
            </label>

            <div class="keyboard-modifiers">
              <label><input v-model="item.modifiers.ctrl" type="checkbox">Ctrl</label>
              <label><input v-model="item.modifiers.shift" type="checkbox">Shift</label>
              <label><input v-model="item.modifiers.alt" type="checkbox">Alt</label>
              <label><input v-model="item.modifiers.meta" type="checkbox">Meta</label>
            </div>
          </template>

          <label v-if="item.functionIndex === 1" class="keyboard-field">
            <span>多媒体动作</span>
            <select v-model="item.mediaKey">
              <option v-for="name in props.mediaKeyOptions" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </label>

          <template v-if="item.functionIndex === 2">
            <label class="keyboard-field">
              <span>鼠标按键</span>
              <select v-model="item.mouseButton">
                <option v-for="(name, index) in props.mouseButtonOptions" :key="name" :value="index">
                  {{ name }}
                </option>
              </select>
            </label>
            <div class="keyboard-inline-fields">
              <label class="keyboard-field">
                <span>X</span>
                <input v-model="item.mouseX" type="number">
              </label>
              <label class="keyboard-field">
                <span>Y</span>
                <input v-model="item.mouseY" type="number">
              </label>
              <label class="keyboard-field">
                <span>滚轮</span>
                <input v-model="item.mouseScroll" type="number">
              </label>
            </div>
          </template>

          <template v-if="item.functionIndex === 3">
            <label class="keyboard-field">
              <span>触摸动作</span>
              <select v-model="item.touchGesture">
                <option v-for="name in props.touchKeyOptions" :key="name" :value="mainJson.touch_key_list[name]">
                  {{ name }}
                </option>
              </select>
            </label>

            <div v-if="item.touchGesture <= 3" class="keyboard-inline-fields">
              <label class="keyboard-field">
                <span>滑动距离</span>
                <input v-model="item.touchSlidePx" type="number">
              </label>
              <label class="keyboard-field">
                <span>滑动时长(ms)</span>
                <input v-model="item.touchSlideMs" type="number">
              </label>
            </div>

            <div v-if="item.touchGesture === 4" class="keyboard-inline-fields">
              <label class="keyboard-field">
                <span>边数</span>
                <input v-model="item.touchOsuN" type="number" min="1">
              </label>
              <label class="keyboard-field">
                <span>半径</span>
                <input v-model="item.touchOsuR" type="number" min="1">
              </label>
              <label class="keyboard-field">
                <span>单圈时间(ms)</span>
                <input v-model="item.touchOsuFinishMs" type="number" min="1">
              </label>
            </div>

            <div v-if="item.touchGesture === 5" class="keyboard-inline-fields">
              <label class="keyboard-field">
                <span>X</span>
                <input v-model="item.touchMouseX" type="number" min="0">
              </label>
              <label class="keyboard-field">
                <span>Y</span>
                <input v-model="item.touchMouseY" type="number" min="0">
              </label>
              <label class="keyboard-field">
                <span>按压时长(ms)</span>
                <input v-model="item.touchMouseMs" type="number" min="0">
              </label>
            </div>
          </template>

          <template v-if="item.functionIndex === 4">
            <label class="keyboard-field">
              <span>滚轮动作</span>
              <select v-model="item.dialAction">
                <option v-for="name in props.dialKeyOptions" :key="name" :value="mainJson.dial_key_list[name]">
                  {{ name }}
                </option>
              </select>
            </label>

            <div class="keyboard-inline-fields">
              <label class="keyboard-field">
                <span>滚动格数</span>
                <input v-model="item.dialScroll" type="number" min="0" step="0.1">
              </label>
              <label class="keyboard-field">
                <span>延迟(ms)</span>
                <input v-model="item.dialDelay" type="number" min="0">
              </label>
            </div>

            <label class="keyboard-checkbox">
              <input v-model="item.dialScrollEnable" type="checkbox">
              启用滚动增强
            </label>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.keyboard-list {
  align-items: stretch;
}

.keyboard-item {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #9c9c9c33;
  border-radius: 4px;
  margin-bottom: 4px;
  text-align: center;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 2px;
}

.btn-keyboard {
  width: 64px;
  height: 64px;
  font-size: 12px;
}

.keyboard-config {
  width: 100%;
  align-items: stretch;
  gap: 8px;
}

.keyboard-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;

  select,
  input {
    width: 100%;
  }
}

.keyboard-inline-fields {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.keyboard-modifiers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.keyboard-checkbox {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
}
</style>
