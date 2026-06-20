<script lang="ts" setup>
import type { HidDevice } from './types.ts'
import { useStorage } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { keyboardNanoApi } from '../../utils/api.ts'
import TabLayout from '../CommonUI/TabLayout.vue'
import { useKeyboard } from './hooks/use-keyboard.ts'
import { useSettings } from './hooks/use-settings.ts'
import DeviceInfoPanel from './panels/DeviceInfoPanel.vue'
import DeviceListPanel from './panels/DeviceListPanel.vue'
import KeyboardPanel from './panels/KeyboardPanel.vue'
import LedPanel from './panels/LedPanel.vue'
import SettingsPanel from './panels/SettingsPanel.vue'
import { ActionType, PAGE_ID, UnitID } from './types.ts'

const vendorId = ref('')
const usagePage = ref('')
const isConnected = ref(false)
const appVersion = __APP_VERSION__

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

function updateColor(index: number, value: string) {
  colorList.value[index] = value
}

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
    <DeviceInfoPanel
      :app-version="appVersion" :is-connected="isConnected" :usage-page="usagePage" :vendor-id="vendorId"
      @close="closeDevice" @connect="connectDevice" @ping="sendPing" @refresh="getStatus" @reload="reloadDevice"
      @reset="resetDevice" @update:usage-page="usagePage = $event" @update:vendor-id="vendorId = $event"
    />

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

        <SettingsPanel
          v-if="currentTab === TabType.SETTINGS" :keyboard-l-p="settingsForm.keyboardLP"
          :keyboard-mode="settingsForm.keyboardMode" :keyboard-modes="keyboardModes"
          :keyboard-scan-s-p="settingsForm.keyboardScanSP" :resolution-x="settingsForm.resolutionX"
          :resolution-y="settingsForm.resolutionY" @update:keyboard-l-p="settingsForm.keyboardLP = $event"
          @update:keyboard-mode="settingsForm.keyboardMode = $event"
          @update:keyboard-scan-s-p="settingsForm.keyboardScanSP = $event"
        />

        <KeyboardPanel
          v-if="currentTab === TabType.KEYBOARD" :dial-key-options="dialKeyOptions"
          :keyboard-list="keyboardList" :media-key-options="mediaKeyOptions" :mouse-button-options="mouseButtonOptions"
          :standard-key-options="standardKeyOptions" :touch-key-options="touchKeyOptions"
          :update-key-function="updateKeyFunction" @light-key="lightKey"
        />

        <LedPanel
          v-if="currentTab === TabType.LED" :color-list="colorList"
          :led-effect-mode="settingsForm.ledEffectMode" :led-effect-modes="ledEffectModes"
          :led-mode="settingsForm.ledMode" :led-modes="ledModes" @test-color="testColor" @update-color="updateColor"
          @update:led-effect-mode="settingsForm.ledEffectMode = $event"
          @update:led-mode="settingsForm.ledMode = $event"
        />
      </TabLayout>
    </template>

    <DeviceListPanel :device-groups="deviceListGroupByProduct" :usage-page="usagePage" :vendor-id="vendorId" />
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
}
</style>
