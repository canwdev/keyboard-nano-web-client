import { reactive } from 'vue'
import { logger } from '../../../utils/logger.ts'
import { mainJson } from '../data/index.ts'
import { ActionType, PAGE_ID, UnitID } from '../types.ts'

export interface KeyboardModeOption {
  label: string
  tooltip: string
}

export function useSettings({ writeData, writeDataRaw }) {
  const wait = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms))

  const settingsForm = reactive({
    keyboardMode: 0,
    ledMode: 0,
    // 按键扫描间隔，按键扫描间隔过短可能导致连击
    keyboardScanSP: 210,
    // 长按识别间隔
    keyboardLP: 1300,
    resolutionX: 0,
    resolutionY: 0,
    ledEffectMode: 0,
  })

  const keyboardModeOptions = (mainJson.keyboard_mode_group.name as string[]).map((label, index) => ({
    label,
    tooltip: (mainJson.keyboard_mode_group.ToolTip as string[])[index] ?? label,
  } satisfies KeyboardModeOption))

  const ledModes = ['关闭', '灯光组 1', '灯光组 2', '灯光组 3', '灯光组 4', '灯光组 5', '灯光组 6']

  const ledEffectModes = [
    '关闭',
    '按下点亮',
    '按下点亮后变暗（黑白）',
    '按下点亮后变暗（随机色彩）',
    '按下熄灭',
  ]

  const loadSettings = async () => {
    logger.debug('[settings] load start')
    const { data } = await writeData(ActionType.READ, [UnitID.FUNC, 0, 0], true)
    logger.debug('[settings] load response', data)

    settingsForm.keyboardMode = data[4]
    settingsForm.ledMode = data[7]

    settingsForm.keyboardScanSP = data[9]
    settingsForm.keyboardLP = data[10] * 100
    settingsForm.resolutionX = Number.parseInt(data[12] * 255 + data[11])
    settingsForm.resolutionY = Number.parseInt(data[14] * 255 + data[13])

    settingsForm.ledEffectMode = data[15]
    logger.debug('[settings] load applied', { ...settingsForm })
  }

  const saveSettings = async () => {
    const buffer = Array.from({ length: 60 }).fill(0)

    buffer[0] = PAGE_ID
    buffer[1] = ActionType.WRITE
    buffer[2] = UnitID.FUNC
    buffer[3] = 0

    buffer[4] = settingsForm.keyboardMode
    buffer[7] = settingsForm.ledMode

    buffer[9] = Math.floor(settingsForm.keyboardScanSP)
    buffer[10] = Math.floor(settingsForm.keyboardLP / 100)
    buffer[11] = Math.floor(settingsForm.resolutionX % 255)
    buffer[12] = Math.floor(settingsForm.resolutionX / 255)
    buffer[13] = Math.floor(settingsForm.resolutionY % 255)
    buffer[14] = Math.floor(settingsForm.resolutionY / 255)

    buffer[15] = settingsForm.ledEffectMode

    logger.debug('[settings] save request', {
      settings: { ...settingsForm },
      buffer,
    })

    if (settingsForm.keyboardMode !== 0) {
      const presetGroups = mainJson.keyboard_mode_group[String(settingsForm.keyboardMode)] ?? []
      logger.debug('[settings] preset apply start', {
        keyboardMode: settingsForm.keyboardMode,
        presetGroups,
      })

      for (const [index, presetBuffer] of presetGroups.entries()) {
        logger.debug('[settings] preset apply item', {
          index,
          presetBuffer,
        })
        await writeDataRaw([...presetBuffer])
        logger.debug('[settings] preset apply item finished, wait before next', {
          index,
          waitMs: 600,
        })
        await wait(600)
      }

      logger.debug('[settings] preset apply finished, reload before settings write')
      await writeData(ActionType.RELOAD)
      logger.debug('[settings] preset reload finished, wait before settings write')
      await wait(300)
    }

    await writeDataRaw(buffer)
    logger.debug('[settings] save write finished, wait before reload')
    await wait(1000)
    logger.debug('[settings] save reload request')
    await writeData(ActionType.RELOAD)
    logger.debug('[settings] save reload finished, wait before load')
    await wait(300)
    logger.debug('[settings] save load start')
    await loadSettings()
  }

  return {
    settingsForm,
    keyboardModeOptions,
    ledModes,
    ledEffectModes,
    loadSettings,
    saveSettings,
  }
}
