import { ref } from 'vue'
import { logger } from '../../../utils/logger.ts'
import { keyboardJson, mainJson } from '../data/index.ts'
import { ActionType, PAGE_ID, UnitID } from '../types.ts'

interface KeyboardHookOptions {
  writeData: (action: ActionType, extraData?: any[], isRead?: boolean) => Promise<any>
  writeDataRaw: (buffer?: any[], isRead?: boolean) => Promise<any>
  getResolution: () => { x: number, y: number }
}

export interface KeyboardKeyConfig {
  id: number
  functionIndex: number
  standardKey: string
  modifiers: {
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
  }
  mediaKey: string
  mouseButton: number
  mouseX: number
  mouseY: number
  mouseScroll: number
  touchGesture: number
  touchSlideMs: number
  touchSlidePx: number
  touchOsuN: number
  touchOsuR: number
  touchOsuFinishMs: number
  touchMouseX: number
  touchMouseY: number
  touchMouseMs: number
  dialAction: number
  dialScroll: number
  dialScrollEnable: boolean
  dialDelay: number
}

const KEY_TYPE_TO_FUNCTION_INDEX: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
}

const KEY_BLOCK_SIZE: Record<number, number> = {
  1: 10,
  2: 8,
  3: 12,
  4: 18,
  5: 12,
}

const standardKeyEntries = Object.entries(keyboardJson.hid_keyboard) as [string, string][]
const standardKeyCodeToName = new Map<number, string>(
  standardKeyEntries.map(([code, name]) => [Number.parseInt(code, 16), name]),
)
const standardKeyNameToCode = new Map<string, number>(
  standardKeyEntries.map(([code, name]) => [name, Number.parseInt(code, 16)]),
)

const mediaKeyEntries = Object.entries(mainJson.media_key_list) as [string, string][]
const mediaCodeToName = new Map<number, string>(
  mediaKeyEntries.map(([name, code]) => [Number.parseInt(code, 16), name]),
)

const mouseButtonMaskToValue: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  4: 3,
}

const dialActionCodeToValue: Record<number, number> = {
  0x01: 0,
  0xC4: 1,
  0x3C: 2,
}

const dialActionValueToCode: Record<number, [number, number]> = {
  0: [0x01, 0x00],
  1: [0xC4, 0xFF],
  2: [0x3C, 0x00],
}

function createDefaultKeyboardKeyConfig(id: number): KeyboardKeyConfig {
  return {
    id,
    functionIndex: 0,
    standardKey: '',
    modifiers: {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
    },
    mediaKey: mediaKeyEntries[0]?.[0] ?? '无',
    mouseButton: 0,
    mouseX: 0,
    mouseY: 0,
    mouseScroll: 0,
    touchGesture: 0,
    touchSlideMs: 100,
    touchSlidePx: 200,
    touchOsuN: 6,
    touchOsuR: 40,
    touchOsuFinishMs: 10,
    touchMouseX: 0,
    touchMouseY: 0,
    touchMouseMs: 100,
    dialAction: 0,
    dialScroll: 2,
    dialScrollEnable: false,
    dialDelay: 10,
  }
}

function toSignedByte(value: number) {
  const normalized = Math.max(-128, Math.min(127, Math.trunc(value)))
  return normalized < 0 ? normalized + 256 : normalized
}

function fromSignedByte(value: number) {
  return value > 127 ? value - 256 : value
}

function toUint16Parts(value: number): [number, number] {
  const normalized = Math.max(0, Math.trunc(value))
  return [normalized % 0xFF, Math.floor(normalized / 0xFF)]
}

function fromUint16Parts(low: number, high: number) {
  return low + high * 0xFF
}

function getBlockSize(keyType: number) {
  return KEY_BLOCK_SIZE[keyType] ?? KEY_BLOCK_SIZE[1]
}

function getGestureSlideDistance(data: number[], startIndex: number, gesture: number) {
  const startX = fromUint16Parts(data[startIndex + 4], data[startIndex + 5])
  const startY = fromUint16Parts(data[startIndex + 6], data[startIndex + 7])
  const endX = fromUint16Parts(data[startIndex + 12], data[startIndex + 13])
  const endY = fromUint16Parts(data[startIndex + 14], data[startIndex + 15])

  switch (gesture) {
    case 0:
      return startX - endX
    case 1:
      return endX - startX
    case 2:
      return endY - startY
    case 3:
      return startY - endY
    default:
      return 0
  }
}

function parseKeyConfig(data: number[], keyType: number, startIndex: number, id: number): KeyboardKeyConfig {
  const config = createDefaultKeyboardKeyConfig(id)
  config.functionIndex = KEY_TYPE_TO_FUNCTION_INDEX[keyType] ?? 0

  if (keyType === 1) {
    const modifierMask = data[startIndex + 3] ?? 0
    const keyCode = data[startIndex + 5] ?? 0
    config.standardKey = standardKeyCodeToName.get(keyCode) ?? ''
    config.modifiers.ctrl = (modifierMask & 0x01) !== 0
    config.modifiers.shift = (modifierMask & 0x02) !== 0
    config.modifiers.alt = (modifierMask & 0x04) !== 0
    config.modifiers.meta = (modifierMask & 0x08) !== 0
    return config
  }

  if (keyType === 2) {
    const mediaCode = fromUint16Parts(data[startIndex + 3] ?? 0, data[startIndex + 4] ?? 0)
    config.mediaKey = mediaCodeToName.get(mediaCode) ?? mediaKeyEntries[0]?.[0] ?? '无'
    return config
  }

  if (keyType === 3) {
    const buttonMask = data[startIndex + 3] ?? 0
    config.mouseButton = mouseButtonMaskToValue[buttonMask] ?? 0
    config.mouseX = fromSignedByte(data[startIndex + 4] ?? 0)
    config.mouseY = fromSignedByte(data[startIndex + 5] ?? 0)
    config.mouseScroll = fromSignedByte(data[startIndex + 6] ?? 0)
    return config
  }

  if (keyType === 4) {
    const gesture = data[startIndex + 9] ?? 0
    config.touchGesture = gesture
    if (gesture === 4) {
      config.touchOsuN = data[startIndex + 3] ?? config.touchOsuN
      config.touchOsuR = data[startIndex + 4] ?? config.touchOsuR
      config.touchOsuFinishMs = data[startIndex + 8] ?? config.touchOsuFinishMs
      return config
    }

    if (gesture === 5) {
      config.touchMouseX = fromUint16Parts(data[startIndex + 4] ?? 0, data[startIndex + 5] ?? 0)
      config.touchMouseY = fromUint16Parts(data[startIndex + 6] ?? 0, data[startIndex + 7] ?? 0)
      config.touchMouseMs = (data[startIndex + 8] ?? 0) * 10
      return config
    }

    config.touchSlideMs = (data[startIndex + 8] ?? 0) * 10
    config.touchSlidePx = getGestureSlideDistance(data, startIndex, gesture)
    return config
  }

  if (keyType === 5) {
    const dialActionCode = data[startIndex + 3] ?? 0
    const scrollRaw = data[startIndex + 5] ?? 0
    config.dialAction = dialActionCodeToValue[dialActionCode] ?? 0
    config.dialScroll = scrollRaw / 10
    config.dialScrollEnable = scrollRaw % 10 === 1
    config.dialDelay = data[startIndex + 6] ?? config.dialDelay
    return config
  }

  return config
}

function buildTouchPayload(config: KeyboardKeyConfig, resolutionX: number, resolutionY: number) {
  const centerX = Math.floor(resolutionX / 2)
  const centerY = Math.floor(resolutionY / 2)
  const payload = [4, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  const setPoint = (offset: number, x: number, y: number) => {
    const [xLow, xHigh] = toUint16Parts(x)
    const [yLow, yHigh] = toUint16Parts(y)
    payload[offset] = xLow
    payload[offset + 1] = xHigh
    payload[offset + 2] = yLow
    payload[offset + 3] = yHigh
  }

  if (config.touchGesture === 0) {
    payload[2] = 5
    payload[3] = 0x83
    setPoint(4, centerX + config.touchSlidePx / 2, centerY)
    payload[8] = Math.floor(config.touchSlideMs / 10)
    payload[9] = 0
    payload[10] = 5
    payload[11] = 0x83
    setPoint(12, centerX - config.touchSlidePx / 2, centerY)
    payload[16] = 0
    payload[17] = 0
    return payload
  }

  if (config.touchGesture === 1) {
    payload[2] = 5
    payload[3] = 0x83
    setPoint(4, centerX - config.touchSlidePx / 2, centerY)
    payload[8] = Math.floor(config.touchSlideMs / 10)
    payload[9] = 1
    payload[10] = 5
    payload[11] = 0x83
    setPoint(12, centerX + config.touchSlidePx / 2, centerY)
    payload[16] = 0
    payload[17] = 1
    return payload
  }

  if (config.touchGesture === 2) {
    payload[2] = 5
    payload[3] = 0x83
    setPoint(4, centerX, centerY - config.touchSlidePx / 2)
    payload[8] = Math.floor(config.touchSlideMs / 10)
    payload[9] = 2
    payload[10] = 5
    payload[11] = 0x83
    setPoint(12, centerX, centerY + config.touchSlidePx / 2)
    payload[16] = 0
    payload[17] = 2
    return payload
  }

  if (config.touchGesture === 3) {
    payload[2] = 5
    payload[3] = 0x83
    setPoint(4, centerX, centerY + config.touchSlidePx / 2)
    payload[8] = Math.floor(config.touchSlideMs / 10)
    payload[9] = 3
    payload[10] = 5
    payload[11] = 0x83
    setPoint(12, centerX, centerY - config.touchSlidePx / 2)
    payload[16] = 0
    payload[17] = 3
    return payload
  }

  if (config.touchGesture === 4) {
    payload[2] = 5
    payload[3] = config.touchOsuN
    payload[4] = config.touchOsuR
    payload[8] = config.touchOsuFinishMs
    payload[9] = 4
    payload[10] = 5
    return payload
  }

  payload[2] = 5
  payload[3] = 0x83
  setPoint(4, config.touchMouseX, config.touchMouseY)
  payload[8] = Math.floor(config.touchMouseMs / 10)
  payload[9] = 5
  payload[10] = 5
  payload[11] = 0x82
  setPoint(12, config.touchMouseX, config.touchMouseY)
  payload[16] = 0
  payload[17] = 5
  return payload
}

function buildKeyboardBuffer(config: KeyboardKeyConfig, unitId: UnitID, resolutionX: number, resolutionY: number) {
  const buffer = [PAGE_ID, ActionType.WRITE, unitId, 0]

  if (config.functionIndex === 0) {
    const modifierMask
      = (config.modifiers.ctrl ? 0x01 : 0)
        + (config.modifiers.shift ? 0x02 : 0)
        + (config.modifiers.alt ? 0x04 : 0)
        + (config.modifiers.meta ? 0x08 : 0)
    const keyCode = standardKeyNameToCode.get(config.standardKey) ?? 0
    return [
      ...buffer,
      1,
      4,
      1,
      modifierMask,
      0,
      keyCode,
      1,
      0,
      0,
      0,
    ]
  }

  if (config.functionIndex === 1) {
    const mediaCodeHex = mainJson.media_key_list[config.mediaKey] ?? '0x0000'
    const mediaCode = Number.parseInt(mediaCodeHex, 16)
    const [low, high] = toUint16Parts(mediaCode)
    return [
      ...buffer,
      2,
      3,
      2,
      low,
      high,
      2,
      0,
      0,
    ]
  }

  if (config.functionIndex === 2) {
    const buttonMask = config.mouseButton === 1 ? 1 : config.mouseButton === 2 ? 2 : config.mouseButton === 3 ? 4 : 0
    return [
      ...buffer,
      3,
      5,
      3,
      buttonMask,
      toSignedByte(config.mouseX),
      toSignedByte(config.mouseY),
      toSignedByte(config.mouseScroll),
      3,
      0,
      0,
      0,
    ]
  }

  if (config.functionIndex === 3) {
    return [
      ...buffer,
      ...buildTouchPayload(config, resolutionX, resolutionY),
    ]
  }

  const [low, high] = dialActionValueToCode[config.dialAction] ?? [0, 0]
  let scroll = Math.trunc(config.dialScroll * 10)
  if (config.dialScrollEnable) {
    scroll += 1
  }

  return [
    ...buffer,
    5,
    5,
    6,
    low,
    high,
    scroll,
    config.dialDelay,
    6,
    0,
    0,
    0,
    0,
  ]
}

export function useKeyboard(options: KeyboardHookOptions) {
  const wait = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms))

  const keyboardList = ref<KeyboardKeyConfig[]>([
    createDefaultKeyboardKeyConfig(0),
    createDefaultKeyboardKeyConfig(1),
    createDefaultKeyboardKeyConfig(2),
  ])

  const standardKeyOptions = standardKeyEntries.map(([, name]) => name)
  const mediaKeyOptions = mediaKeyEntries.map(([name]) => name)
  const touchKeyOptions = Object.keys(mainJson.touch_key_list)
  const dialKeyOptions = Object.keys(mainJson.dial_key_list)
  const mouseButtonOptions = ['无', '左键', '右键', '中键']

  function getSecondaryOptions(functionIndex: number) {
    if (functionIndex === 1) {
      return mediaKeyOptions
    }
    if (functionIndex === 3) {
      return touchKeyOptions
    }
    if (functionIndex === 4) {
      return dialKeyOptions
    }
    return []
  }

  function updateKeyFunction(key: KeyboardKeyConfig, functionIndex: number) {
    key.functionIndex = functionIndex
    if (functionIndex === 1 && !mediaKeyOptions.includes(key.mediaKey)) {
      key.mediaKey = mediaKeyOptions[0] ?? '无'
    }
    if (functionIndex === 3 && key.touchGesture >= touchKeyOptions.length) {
      key.touchGesture = 0
    }
    if (functionIndex === 4 && key.dialAction >= dialKeyOptions.length) {
      key.dialAction = 0
    }
  }

  async function loadKeyboardConfigs() {
    logger.debug('[keyboard] load start')
    const { data } = await options.writeData(ActionType.READ, [UnitID.ALL, 0, 0], true)
    logger.debug('[keyboard] load response', data)
    let startIndex = 7

    keyboardList.value = [0, 1, 2].map((id) => {
      const keyType = data[4 + id] ?? 1
      const config = parseKeyConfig(data, keyType, startIndex, id)
      startIndex += getBlockSize(keyType)
      return config
    })
    logger.debug('[keyboard] load applied', keyboardList.value)
  }

  async function saveKeyboardConfigs() {
    const resolution = options.getResolution()
    const unitIds = [UnitID.BTN1, UnitID.BTN2, UnitID.BTN3]
    logger.debug('[keyboard] save start', {
      resolution,
      keyboardList: keyboardList.value,
    })

    for (const [index, item] of keyboardList.value.entries()) {
      const buffer = buildKeyboardBuffer(item, unitIds[index], resolution.x, resolution.y)
      logger.debug('[keyboard] save item', {
        index,
        unitId: unitIds[index],
        item,
        buffer,
      })
      await options.writeDataRaw(buffer)
      logger.debug('[keyboard] save item finished, wait before next', {
        index,
        waitMs: 600,
      })
      await wait(600)
    }

    logger.debug('[keyboard] save all items finished, reload start')
    await options.writeData(ActionType.RELOAD)
    logger.debug('[keyboard] reload finished, wait before load', {
      waitMs: 300,
    })
    await wait(300)
    logger.debug('[keyboard] reload wait finished, load start')
    await loadKeyboardConfigs()
    logger.debug('[keyboard] save finished')
  }

  return {
    dialKeyOptions,
    getSecondaryOptions,
    keyboardList,
    loadKeyboardConfigs,
    mediaKeyOptions,
    mouseButtonOptions,
    saveKeyboardConfigs,
    standardKeyOptions,
    touchKeyOptions,
    updateKeyFunction,
  }
}
