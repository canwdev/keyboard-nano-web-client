<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {keyboardNanoApi} from '../../utils/api.ts'
import {ActionType, HidDevice, PAGE_ID, UnitID} from './types.ts'
import {useSettings} from './hooks/use-settings.ts'
import TabLayout from '../CommonUI/TabLayout.vue'
import {useStorage} from '@vueuse/core'
import {mainJson} from './data/index.ts'

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
  {label: '设置', value: TabType.SETTINGS},
  {label: '按键', value: TabType.KEYBOARD},
  {label: 'LED', value: TabType.LED},
]

const connectDevice = async () => {
  await keyboardNanoApi.deviceInit({
    vendor_id: vendorId.value,
    usage_page: usagePage.value,
  })
  await loadSettings()
  await getStatus()
}

const reloadDevice = async () => {
  await writeData(ActionType.RELOAD)
}

const resetDevice = async () => {
  await writeData(ActionType.RESET)
  await closeDevice()

  setTimeout(() => {
    connectDevice()
  }, 1000)
}

const closeDevice = async () => {
  await keyboardNanoApi.deviceClose()
  await getStatus()
}

const writeDataRaw = async (buffer: any[] = [], isRead = false) => {
  return await keyboardNanoApi.write({
    buffer,
    isRead,
  })
}
const writeData = async (action: ActionType, extraData: any[] = [], isRead = false) => {
  let buffer: any[] = []

  buffer[0] = PAGE_ID
  buffer[1] = action

  if (extraData) {
    buffer = [...buffer, ...extraData]
  }
  return await writeDataRaw(buffer, isRead)
}

const sendPing = async () => {
  const {message} = await keyboardNanoApi.ping()
  window.$notification({
    message: message,
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

const getStatus = async () => {
  const res = (await keyboardNanoApi.getStatus()) as any

  isConnected.value = res.isConnected
  vendorId.value = res.vendorId
  usagePage.value = res.usagePage
  deviceList.value = res.devices
}

onMounted(async () => {
  await getStatus()
  if (!isConnected.value) {
    await connectDevice()
  } else {
    await loadSettings()
  }
})

// 提取6位hex颜色值为RGB数字
const getRGBHex = (value) => {
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  }
}
const colorList = ref(['#ff0000', '#00ff00', '#0000ff'])
const testColor = async () => {
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

  colorList.value.forEach((h6, index) => {
    const {r, g, b} = getRGBHex(h6)
    console.log(`set ${index + 1} key color ${h6} -> `, {r, g, b})
    // B
    data.push(b)
    // R
    data.push(r)
    // G
    data.push(g)
  })

  await writeData(ActionType.COMMAND, data)
}

const lightKey = async (index: number) => {
  const data: any[] = [UnitID.LED, 0]

  keyboardList.value.forEach((item, idx) => {
    if (idx === index) {
      const {r, g, b} = getRGBHex('#FFFFFF')

      // B
      data.push(b)
      // R
      data.push(r)
      // G
      data.push(g)
    } else {
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

const {settingsForm, keyboardModes, ledModes, ledEffectModes, loadSettings, saveSettings} =
  useSettings({writeData, writeDataRaw})

const keyboardList = computed(() => {
  return [{id: 0}, {id: 1}, {id: 2}].map((item) => {
    return {
      ...item,
      keyFunc: 0,
    }
  })
})
</script>

<template>
  <div class="keyboard-nano-client">
    <fieldset>
      <legend>设备信息</legend>

      <div class="flex-cols">
        <div class="flex-rows">
          <label>
            vendorId
            <input class="themed-input" :disabled="isConnected" type="text" v-model="vendorId" />
          </label>
          <label>
            usagePage
            <input class="themed-input" :disabled="isConnected" type="text" v-model="usagePage" />
          </label>
        </div>

        <div class="flex-rows">
          <a
            href="https://github.com/Jackadminx/Keyboard_nano_client/blob/main/Help/report.md"
            target="_blank"
          >
            通信协议
          </a>

          <a href="https://github.com/canwdev/keyboard-nano-web-client" target="_blank">Github</a>
        </div>

        <div class="flex-rows" style="justify-content: flex-end">
          <button class="themed-button" @click="getStatus">刷新信息</button>
          <template v-if="!isConnected">
            <button class="themed-button green" @click="connectDevice">连接设备</button>
          </template>
          <template v-else>
            <button class="themed-button" @click="sendPing">Ping</button>
            <button class="themed-button yellow" @click="reloadDevice">重载配置</button>
            <button class="themed-button yellow" @click="resetDevice">复位设备</button>
            <button class="themed-button red" @click="closeDevice">关闭连接</button>
          </template>
        </div>
      </div>
    </fieldset>

    <template v-if="isConnected">
      <TabLayout v-model="activeTab" :options="tabOptions" horizontal>
        <template #sidebar>
          <div style="justify-content: flex-end; padding: 0 4px; gap: 4px" class="flex-rows">
            <button class="themed-button" @click="loadSettings">读取设置</button>
            <button class="themed-button blue" @click="saveSettings">保存设置</button>
          </div>
        </template>

        <div v-if="activeTab === TabType.SETTINGS">
          <div class="flex-cols">
            <fieldset>
              <legend>预设模式</legend>
              <div class="flex-rows preset-mode-list">
                <label v-for="(item, index) in keyboardModes" :key="index">
                  <input type="radio" :value="index" v-model="settingsForm.keyboardMode" />
                  {{ item }}
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>功能</legend>
              <div>按键扫描间隔: <input type="number" v-model="settingsForm.keyboardScanSP" /></div>
              <div>长按识别间隔: <input type="number" v-model="settingsForm.keyboardLP" /></div>
              <div>屏幕分辨率: {{ settingsForm.resolutionX }} x {{ settingsForm.resolutionY }}</div>
            </fieldset>
          </div>
        </div>

        <div v-if="activeTab === TabType.KEYBOARD">
          <div class="flex-rows keyboard-list">
            <div class="keyboard-item" v-for="item in keyboardList" :key="item.id">
              <button class="themed-button btn-keyboard" @click="lightKey(item.id)">
                点亮 {{ item.id }} 键
              </button>

              <div class="flex-rows">
                <select v-model="item.keyFunc">
                  <option
                    v-for="(func, index) in mainJson.key_func_list"
                    :value="index"
                    :key="index"
                  >
                    {{ func }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === TabType.LED">
          <fieldset>
            <legend>LED设置</legend>

            <div class="flex-cols">
              <label>
                灯光组：
                <select v-model="settingsForm.ledMode">
                  <option v-for="(item, index) in ledModes" :value="index" :key="index">
                    {{ item }}
                  </option>
                </select>
              </label>
              <label>
                灯效：
                <select v-model="settingsForm.ledEffectMode">
                  <option v-for="(item, index) in ledEffectModes" :value="index" :key="index">
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
                <input
                  v-for="(item, index) in colorList"
                  v-model="colorList[index]"
                  :key="index"
                  type="color"
                />
              </div>
              <div class="flex-rows">
                <button class="themed-button" @click="testColor">测试</button>
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
            :class="{active: v.vendorId === Number(vendorId) && v.usagePage === Number(usagePage)}"
            v-for="v in item"
            :key="v.path"
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

  .device-list {
    overflow-y: auto;
  }

  .active {
    color: red;
  }
}
</style>
