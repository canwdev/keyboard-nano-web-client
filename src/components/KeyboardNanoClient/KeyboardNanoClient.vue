<script lang="ts" setup>
import type { HidDevice } from './types.ts'
import { useStorage } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { keyboardNanoApi } from '../../utils/api.ts'
import TabLayout from '../CommonUI/TabLayout.vue'
import { mainJson } from './data/index.ts'
import { useKeyboard } from './hooks/use-keyboard.ts'
import { useSettings } from './hooks/use-settings.ts'
import { ActionType, PAGE_ID, UnitID } from './types.ts'

const vendorId = ref('')
const usagePage = ref('')
const isConnected = ref(false)

enum TabType {
  SETTINGS = 0,
  KEYBOARD = 1,
  LED = 2,
}

const activeTab = useStorage('keyboard_nano_client_active_tab', 0)
const tabOptions = [
  { label: '设置', value: TabType.SETTINGS },
  { label: '按键', value: TabType.KEYBOARD },
  { label: 'LED', value: TabType.LED },
]
const currentTab = computed(() => activeTab.value)

function handleTabChange(value: string | number) {
  activeTab.value = Number(value)
}

const { settingsForm, keyboardModes, ledModes, ledEffectModes, loadSettings, saveSettings }
  = useSettings({ writeData, writeDataRaw })
const {
  dialKeyOptions,
  keyboardList,
  loadKeyboardConfigs,
  mediaKeyOptions,
  mouseButtonOptions,
  saveKeyboardConfigs,
  standardKeyOptions,
  touchKeyOptions,
  updateKeyFunction,
} = useKeyboard({
  writeData,
  writeDataRaw,
  getResolution: () => ({
    x: settingsForm.resolutionX,
    y: settingsForm.resolutionY,
  }),
})
const loadButtonLabel = computed(() => currentTab.value === TabType.KEYBOARD ? '读取按键' : '读取设置')
const saveButtonLabel = computed(() => currentTab.value === TabType.KEYBOARD ? '保存按键' : '保存设置')
const wait = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms))

async function connectDevice() {
  await keyboardNanoApi.deviceInit({
    vendor_id: vendorId.value,
    usage_page: usagePage.value,
  })
  await loadSettings()
  await loadKeyboardConfigs()
  await getStatus()
}

async function reloadDevice() {
  console.log('[page] reloadDevice start')
  await writeData(ActionType.RELOAD)
  console.log('[page] reloadDevice wait before refresh', { waitMs: 600 })
  await wait(600)
  console.log('[page] reloadDevice refresh start')
  await loadSettings()
  await loadKeyboardConfigs()
  console.log('[page] reloadDevice finished')
}

async function resetDevice() {
  await writeData(ActionType.RESET)
  await closeDevice()

  setTimeout(() => {
    connectDevice()
  }, 1000)
}

async function closeDevice() {
  await keyboardNanoApi.deviceClose()
  await getStatus()
}

async function writeDataRaw(buffer: any[] = [], isRead = false) {
  console.log('[page] writeDataRaw', {
    isRead,
    buffer,
  })
  return await keyboardNanoApi.write({
    buffer,
    isRead,
  })
}
async function writeData(action: ActionType, extraData: any[] = [], isRead = false) {
  let buffer: any[] = []

  buffer[0] = PAGE_ID
  buffer[1] = action

  if (extraData) {
    buffer = [...buffer, ...extraData]
  }
  console.log('[page] writeData', {
    action,
    extraData,
    isRead,
    buffer,
  })
  return await writeDataRaw(buffer, isRead)
}

async function sendPing() {
  const { message } = await keyboardNanoApi.ping()
  window.$notification({
    message,
    timeout: 5000,
  })
}

const deviceList = ref<HidDevice[]>([])

// 根据 product 字段对设备列表进行分组
const deviceListGroupByProduct = computed(() => {
  return deviceList.value.reduce(
    (acc, device) => {
      const key = device.product
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(device)
      return acc
    },
    {} as Record<string, HidDevice[]>,
  )
})

async function getStatus() {
  const res = (await keyboardNanoApi.getStatus()) as any

  isConnected.value = res.isConnected
  vendorId.value = res.vendorId
  usagePage.value = res.usagePage
  deviceList.value = res.devices
}

async function handleLoadCurrentTab() {
  if (currentTab.value === TabType.KEYBOARD) {
    await loadKeyboardConfigs()
    return
  }

  await loadSettings()
}

async function handleSaveCurrentTab() {
  if (currentTab.value === TabType.KEYBOARD) {
    await saveKeyboardConfigs()
    return
  }

  await saveSettings()
  await loadKeyboardConfigs()
}

onMounted(async () => {
  await getStatus()
  if (isConnected.value) {
    await loadSettings()
    await loadKeyboardConfigs()
  }
})

// 提取6位hex颜色值为RGB数字
function getRGBHex(value) {
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  }
}
const colorList = ref(['#ff0000', '#00ff00', '#0000ff'])
async function testColor() {
  const data: any[] = [UnitID.LED, 0]
  // data[4] = 0x00  // 1-B
  // data[5] = 0x00  // 1-R
  // data[6] = 0x00  // 1-G
  //
  // data[7] = 0x00  // 2-B
  // data[8] = 0xff  // 2-R
  // data[9] = 0x00  // 2-G
  //
  // data[10] = 0x00  // 3-B
  // data[11] = 0x00  // 3-R
  // data[12] = 0x00  // 3-G

  colorList.value.forEach((h6) => {
    const { r, g, b } = getRGBHex(h6)
    // B
    data.push(b)
    // R
    data.push(r)
    // G
    data.push(g)
  })

  await writeData(ActionType.COMMAND, data)
}

async function lightKey(index: number) {
  const data: any[] = [UnitID.LED, 0]

  keyboardList.value.forEach((item, idx) => {
    if (idx === index) {
      const { r, g, b } = getRGBHex('#FFFFFF')

      // B
      data.push(b)
      // R
      data.push(r)
      // G
      data.push(g)
    }
    else {
      // B
      data.push(0)
      // R
      data.push(0)
      // G
      data.push(0)
    }
  })

  await writeData(ActionType.COMMAND, data)
}
</script>

<template>
  <div class="keyboard-nano-client">
    <fieldset>
      <legend>设备信息</legend>

      <div class="flex-cols">
        <div class="flex-rows">
          <label>
            vendorId
            <input v-model="vendorId" class="themed-input" :disabled="isConnected" type="text">
          </label>
          <label>
            usagePage
            <input v-model="usagePage" class="themed-input" :disabled="isConnected" type="text">
          </label>
        </div>

        <div class="flex-rows">
          <a href="https://github.com/Jackadminx/Keyboard_nano_client/blob/main/Help/report.md" target="_blank">
            通信协议
          </a>

          <a href="https://github.com/canwdev/keyboard-nano-web-client" target="_blank">Github</a>
        </div>

        <div class="flex-rows" style="justify-content: flex-end">
          <button class="themed-button" @click="getStatus">
            刷新信息
          </button>
          <template v-if="!isConnected">
            <button class="themed-button green" @click="connectDevice">
              连接设备
            </button>
          </template>
          <template v-else>
            <button class="themed-button" @click="sendPing">
              Ping
            </button>
            <button class="themed-button yellow" @click="reloadDevice">
              重载配置
            </button>
            <button class="themed-button yellow" @click="resetDevice">
              复位设备
            </button>
            <button class="themed-button red" @click="closeDevice">
              关闭连接
            </button>
          </template>
        </div>
      </div>
    </fieldset>

    <template v-if="isConnected">
      <TabLayout :model-value="currentTab" :options="tabOptions" horizontal @update:model-value="handleTabChange">
        <template #sidebar>
          <div style="justify-content: flex-end; padding: 0 4px; gap: 4px" class="flex-rows">
            <button class="themed-button" @click="handleLoadCurrentTab">
              {{ loadButtonLabel }}
            </button>
            <button class="themed-button blue" @click="handleSaveCurrentTab">
              {{ saveButtonLabel }}
            </button>
          </div>
        </template>

        <div v-if="currentTab === TabType.SETTINGS">
          <div class="flex-cols">
            <fieldset>
              <legend>预设模式</legend>
              <div class="flex-rows preset-mode-list">
                <label v-for="(item, index) in keyboardModes" :key="index">
                  <input v-model="settingsForm.keyboardMode" type="radio" :value="index">
                  {{ item }}
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>功能</legend>
              <div>按键扫描间隔: <input v-model="settingsForm.keyboardScanSP" type="number"></div>
              <div>长按识别间隔: <input v-model="settingsForm.keyboardLP" type="number"></div>
              <div>屏幕分辨率: {{ settingsForm.resolutionX }} x {{ settingsForm.resolutionY }}</div>
            </fieldset>
          </div>
        </div>

        <div v-if="currentTab === TabType.KEYBOARD">
          <div class="flex-rows keyboard-list">
            <div v-for="item in keyboardList" :key="item.id" class="keyboard-item">
              <button class="themed-button btn-keyboard" @click="lightKey(item.id)">
                点亮 {{ item.id }} 键
              </button>

              <div class="flex-cols keyboard-config">
                <label class="keyboard-field">
                  <span>功能</span>
                  <select
                    :value="item.functionIndex"
                    @change="updateKeyFunction(item, Number(($event.target as HTMLSelectElement).value))"
                  >
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
                      <option v-for="keyName in standardKeyOptions" :key="keyName" :value="keyName">
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
                    <option v-for="name in mediaKeyOptions" :key="name" :value="name">
                      {{ name }}
                    </option>
                  </select>
                </label>

                <template v-if="item.functionIndex === 2">
                  <label class="keyboard-field">
                    <span>鼠标按键</span>
                    <select v-model="item.mouseButton">
                      <option v-for="(name, index) in mouseButtonOptions" :key="name" :value="index">
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
                      <option v-for="name in touchKeyOptions" :key="name" :value="mainJson.touch_key_list[name]">
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
                      <option v-for="name in dialKeyOptions" :key="name" :value="mainJson.dial_key_list[name]">
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

        <div v-if="currentTab === TabType.LED">
          <fieldset>
            <legend>LED设置</legend>

            <div class="flex-cols">
              <label>
                灯光组：
                <select v-model="settingsForm.ledMode">
                  <option v-for="(item, index) in ledModes" :key="index" :value="index">
                    {{ item }}
                  </option>
                </select>
              </label>
              <label>
                灯效：
                <select v-model="settingsForm.ledEffectMode">
                  <option v-for="(item, index) in ledEffectModes" :key="index" :value="index">
                    {{ item }}
                  </option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>LED 测试</legend>

            <div class="flex-cols">
              仅用于测试LED功能，设置不会保存，点击[重载配置]还原。

              <div class="flex-rows">
                <input v-for="(item, index) in colorList" :key="index" v-model="colorList[index]" type="color">
              </div>
              <div class="flex-rows">
                <button class="themed-button" @click="testColor">
                  测试
                </button>
              </div>
            </div>
          </fieldset>
        </div>
      </TabLayout>
    </template>

    <fieldset>
      <legend>HID Devices</legend>
      <div class="device-list">
        <details v-for="(item, key) of deviceListGroupByProduct" :key="key">
          <summary>{{ key }}</summary>
          <ul
            v-for="v in item" :key="v.path"
            :class="{ active: v.vendorId === Number(vendorId) && v.usagePage === Number(usagePage) }"
          >
            <li>{{ v }}</li>
          </ul>
        </details>
      </div>
    </fieldset>
  </div>
</template>

<style lang="scss" scoped>
.keyboard-nano-client {
  max-width: 600px;
  margin: 0 auto;

  .mc-vertical-tab-layout {
    margin-top: 16px;
    margin-bottom: 16px;
  }

  .preset-mode-list {
    display: grid;
    grid-template-rows: repeat(5, 1fr);
    /* 定义 5 行 */
    grid-template-columns: auto;
    /* 列宽度自动调整 */
    grid-auto-flow: column;
    /* 项目按列排列，即纵向排列 */
    gap: 4px;
  }

  .keyboard-list {
    align-items: stretch;

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
      gap: 10px;

      .btn-keyboard {
        width: 64px;
        height: 64px;
        font-size: 12px;
      }
    }
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

  .device-list {
    overflow-y: auto;
  }

  .active {
    color: red;
  }
}
</style>
