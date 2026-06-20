<script lang="ts" setup>
import { useStorage } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { logger } from '../../utils/logger.ts'
import { runWithUiBusy } from '../../utils/ui-busy.ts'
import TabLayout from '../CommonUI/TabLayout.vue'
import { useDevice } from './hooks/use-device.ts'
import { useKeyboard } from './hooks/use-keyboard.ts'
import { useLed } from './hooks/use-led.ts'
import { useSettings } from './hooks/use-settings.ts'
import DeviceInfoPanel from './panels/DeviceInfoPanel.vue'
import DeviceListPanel from './panels/DeviceListPanel.vue'
import KeyboardPanel from './panels/KeyboardPanel.vue'
import LedEffectPanel from './panels/LedEffectPanel.vue'
import LedPanel from './panels/LedPanel.vue'
import SettingsPanel from './panels/SettingsPanel.vue'
import { ActionType, PAGE_ID, UnitID } from './types.ts'

const appVersion = __APP_VERSION__
const {
  closeDevice,
  connectDevice,
  deviceListGroupByProduct,
  getStatus,
  initializeDevice,
  isConnected,
  reloadDevice,
  resetDevice,
  sendPing,
  setLoaders,
  usagePage,
  vendorId,
  writeData,
  writeDataRaw,
} = useDevice()

enum TabType {
  SETTINGS = 0,
  KEYBOARD = 1,
  LED = 2,
  LED_EFFECT = 3,
}

const activeTab = useStorage('keyboard_nano_client_active_tab', 0)
const tabOptions = [
  { label: '设置', value: TabType.SETTINGS },
  { label: '按键', value: TabType.KEYBOARD },
  { label: 'LED', value: TabType.LED },
  { label: '氛围灯效', value: TabType.LED_EFFECT },
]
const currentTab = computed(() => activeTab.value)

function handleTabChange(value: string | number) {
  activeTab.value = Number(value)
}

const {
  settingsForm,
  keyboardModeOptions,
  ledModes,
  ledEffectModes,
  loadLedEffectSetting,
  loadLedModeSetting,
  loadSettings,
  saveLedEffectSetting,
  saveLedModeSetting,
  saveSettings,
}
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
const {
  closeLedPreview,
  effectPreviewOptions,
  ledGroups,
  loadLedGroups,
  previewingEffectId,
  previewingGroupId,
  previewLedGroup,
  saveLedGroups,
  startLedEffectPreview,
  updateLedGroupBrightness,
  updateLedGroupColor,
} = useLed({
  writeData,
  writeDataRaw,
})
setLoaders({
  loadSettings,
  loadKeyboardConfigs,
})
const loadButtonLabel = computed(() =>
  currentTab.value === TabType.KEYBOARD
    ? '读取按键'
    : currentTab.value === TabType.LED
      ? '读取LED'
      : currentTab.value === TabType.LED_EFFECT
        ? '读取灯效'
        : '读取设置',
)
const saveButtonLabel = computed(() =>
  currentTab.value === TabType.KEYBOARD
    ? '保存按键'
    : currentTab.value === TabType.LED
      ? '保存LED'
      : currentTab.value === TabType.LED_EFFECT
        ? '保存灯效'
        : '保存设置',
)
let lightKeyTimer: ReturnType<typeof setTimeout> | undefined

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function shouldRetryRead(error: unknown) {
  return error instanceof Error && /读取设备超时|设备未连接/.test(error.message)
}

async function loadCurrentTabWithRetry() {
  const task = currentTab.value === TabType.KEYBOARD
    ? async () => await loadKeyboardConfigs()
    : currentTab.value === TabType.LED
      ? async () => {
        await loadLedModeSetting()
        await loadLedGroups()
      }
      : currentTab.value === TabType.LED_EFFECT
        ? async () => await loadLedEffectSetting()
        : async () => await loadSettings()

  try {
    await task()
  }
  catch (error) {
    if (!shouldRetryRead(error)) {
      throw error
    }

    logger.warn('[page] loadCurrentTab retry', { error })
    await wait(250)
    await getStatus()
    await task()
  }
}

function syncScreenResolution() {
  settingsForm.resolutionX = Math.max(50, Math.trunc(window.screen.width || 0))
  settingsForm.resolutionY = Math.max(50, Math.trunc(window.screen.height || 0))
}

async function handleLoadCurrentTab() {
  await runWithUiBusy(loadButtonLabel.value, async () => {
    await loadCurrentTabWithRetry()
  })
}

function notifySaveSuccess(message: string) {
  window.$notification({
    type: 'success',
    message,
    timeout: 2500,
  })
}

async function handleSaveCurrentTab() {
  await runWithUiBusy(saveButtonLabel.value, async () => {
    if (currentTab.value === TabType.KEYBOARD) {
      await saveKeyboardConfigs()
      notifySaveSuccess('按键保存成功')
      return
    }

    if (currentTab.value === TabType.LED) {
      await saveLedGroups()
      await saveLedModeSetting()
      await loadLedGroups()
      notifySaveSuccess('LED 保存成功')
      return
    }

    if (currentTab.value === TabType.LED_EFFECT) {
      await saveLedEffectSetting()
      notifySaveSuccess('灯效保存成功')
      return
    }

    await saveSettings()
    await loadKeyboardConfigs()
    notifySaveSuccess('设置保存成功')
  })
}

onMounted(async () => {
  await runWithUiBusy('初始化设备中，请稍候...', async () => {
    await initializeDevice()
    if (isConnected.value && (currentTab.value === TabType.LED || currentTab.value === TabType.LED_EFFECT)) {
      await loadCurrentTabWithRetry()
    }
  })
})

function getRGBHex(value) {
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  }
}

async function handleConnectDevice() {
  await runWithUiBusy('连接设备中，请稍候...', async () => {
    await connectDevice()
    if (currentTab.value === TabType.LED || currentTab.value === TabType.LED_EFFECT) {
      await loadCurrentTabWithRetry()
    }
  })
}

async function handleReloadDevice() {
  await runWithUiBusy('重载设备中，请稍候...', async () => {
    await reloadDevice()
    if (currentTab.value === TabType.LED || currentTab.value === TabType.LED_EFFECT) {
      await loadCurrentTabWithRetry()
    }
  })
}

function buildLightKeyPayload(activeIndex?: number) {
  const data: any[] = [UnitID.LED, 0]

  keyboardList.value.forEach((item, idx) => {
    if (activeIndex !== undefined && idx === activeIndex) {
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

  return data
}

async function lightKey(index: number) {
  if (lightKeyTimer) {
    clearTimeout(lightKeyTimer)
    lightKeyTimer = undefined
  }

  await writeData(ActionType.COMMAND, buildLightKeyPayload(index))

  lightKeyTimer = setTimeout(() => {
    lightKeyTimer = undefined
    void writeData(ActionType.COMMAND, buildLightKeyPayload())
  }, 1000)
}

onBeforeUnmount(() => {
  if (lightKeyTimer) {
    clearTimeout(lightKeyTimer)
    lightKeyTimer = undefined
  }
})
</script>

<template>
  <div class="keyboard-nano-client">
    <DeviceInfoPanel :app-version="appVersion" :is-connected="isConnected" :report-id="String(PAGE_ID)"
      :usage-page="usagePage" :vendor-id="vendorId" @close="closeDevice" @connect="handleConnectDevice" @ping="sendPing"
      @refresh="getStatus" @reload="handleReloadDevice" @reset="resetDevice" @update:usage-page="usagePage = $event"
      @update:vendor-id="vendorId = $event" />

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

        <SettingsPanel v-if="currentTab === TabType.SETTINGS" :keyboard-l-p="settingsForm.keyboardLP"
          :keyboard-mode="settingsForm.keyboardMode" :keyboard-mode-options="keyboardModeOptions"
          :led-mode="settingsForm.ledMode" :keyboard-scan-s-p="settingsForm.keyboardScanSP"
          :resolution-x="settingsForm.resolutionX" :resolution-y="settingsForm.resolutionY"
          @update:keyboard-l-p="settingsForm.keyboardLP = $event" @get-resolution="syncScreenResolution"
          @update:keyboard-mode="settingsForm.keyboardMode = $event" @update:led-mode="settingsForm.ledMode = $event"
          @update:resolution-x="settingsForm.resolutionX = $event"
          @update:resolution-y="settingsForm.resolutionY = $event"
          @update:keyboard-scan-s-p="settingsForm.keyboardScanSP = $event" />

        <KeyboardPanel v-if="currentTab === TabType.KEYBOARD" :dial-key-options="dialKeyOptions"
          :keyboard-list="keyboardList" :media-key-options="mediaKeyOptions" :mouse-button-options="mouseButtonOptions"
          :standard-key-options="standardKeyOptions" :touch-key-options="touchKeyOptions"
          :update-key-function="updateKeyFunction" @light-key="lightKey" />

        <LedPanel v-if="currentTab === TabType.LED" :led-groups="ledGroups" :led-mode="settingsForm.ledMode"
          :led-modes="ledModes" :previewing-group-id="previewingGroupId" @close-preview="closeLedPreview"
          @update-group-brightness="updateLedGroupBrightness" @preview-group="previewLedGroup"
          @update-group-color="updateLedGroupColor" @update:led-mode="settingsForm.ledMode = $event" />

        <LedEffectPanel v-if="currentTab === TabType.LED_EFFECT" :effect-preview-options="effectPreviewOptions"
          :led-effect-mode="settingsForm.ledEffectMode" :led-effect-modes="ledEffectModes"
          :previewing-effect-id="previewingEffectId" @close-preview="closeLedPreview"
          @preview-effect="startLedEffectPreview" @update:led-effect-mode="settingsForm.ledEffectMode = $event" />
      </TabLayout>
    </template>

    <DeviceListPanel :device-groups="deviceListGroupByProduct" :usage-page="usagePage" :vendor-id="vendorId" />
  </div>
</template>

<style lang="scss" scoped>
.keyboard-nano-client {
  max-width: 600px;
  margin: 0 auto;
  padding: 8px 0 16px;

  .mc-vertical-tab-layout {
    margin-top: 16px;
    margin-bottom: 16px;
  }
}
</style>
