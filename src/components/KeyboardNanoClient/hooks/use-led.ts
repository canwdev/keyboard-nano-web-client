import { onBeforeUnmount, ref } from 'vue'
import { logger } from '../../../utils/logger.ts'
import { clearPreviewLock, setPreviewLock } from '../../../utils/preview-lock.ts'
import { ActionType, PAGE_ID, UnitID } from '../types.ts'

interface LedHookOptions {
  writeData: (action: ActionType, extraData?: number[], isRead?: boolean, useLoading?: boolean) => Promise<any>
  writeDataRaw: (buffer?: number[], isRead?: boolean, useLoading?: boolean) => Promise<any>
}

interface RgbColor {
  b: number
  g: number
  r: number
}

export interface LedEffectPreviewOption {
  description: string
  id: string
  intervalMs: number
  label: string
}

interface EffectWorkerTickMessage {
  step: number
  type: 'tick'
}

export interface LedGroupConfig {
  colors: [string, string, string]
  brightness: number
  id: number
  label: string
}

const LED_GROUP_COUNT = 6
const LED_COLOR_COUNT = 3
const AUTO_PREVIEW_DELAY_MS = 180
const ledEffectPreviewOptions: LedEffectPreviewOption[] = [
  { id: 'rainbow-wave', label: '彩虹波浪', intervalMs: 72, description: '三颗灯沿色环平滑流动。' },
  { id: 'neon-chase', label: '霓虹追光', intervalMs: 60, description: '高饱和蓝紫粉依次追逐。' },
  { id: 'aurora', label: '极光漂移', intervalMs: 84, description: '青蓝紫之间缓慢漂移。' },
  { id: 'lava', label: '熔岩脉冲', intervalMs: 78, description: '红橙黄像火焰一样鼓动。' },
  { id: 'ocean', label: '深海潮汐', intervalMs: 88, description: '蓝青色缓慢交替起伏。' },
  { id: 'matrix', label: '矩阵呼吸', intervalMs: 68, description: '绿色主色配移动高亮。' },
  { id: 'police', label: '红蓝警示', intervalMs: 96, description: '红蓝交替闪烁，中心白光点缀。' },
  { id: 'sunset', label: '晚霞流光', intervalMs: 84, description: '橙红粉金过渡更柔和。' },
  { id: 'glacier', label: '冰川冷焰', intervalMs: 80, description: '冰蓝、青色、深蓝循环切换。' },
  { id: 'candy', label: '糖果跳变', intervalMs: 74, description: '粉紫蓝的跳色节奏。' },
  { id: 'cyber', label: '赛博脉冲', intervalMs: 60, description: '蓝紫洋红高对比闪动。' },
  { id: 'forest', label: '森林萤火', intervalMs: 86, description: '多层绿色像萤火游动。' },
]

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toHexColor(r: number, g: number, b: number) {
  return `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`
}

function toRgbBytes(color: string) {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  }
}

function clampBrightness(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function applyBrightnessToColor(color: string, brightness: number): RgbColor {
  const ratio = clampBrightness(brightness) / 100
  const { r, g, b } = toRgbBytes(color)

  return {
    r: Math.round(r * ratio),
    g: Math.round(g * ratio),
    b: Math.round(b * ratio),
  }
}

function createDefaultLedGroups() {
  return Array.from({ length: LED_GROUP_COUNT }, (_, groupIndex) => ({
    brightness: 100,
    colors: ['#ffffff', '#ffffff', '#ffffff'] as [string, string, string],
    id: groupIndex + 1,
    label: `灯光组 ${groupIndex + 1}`,
  }))
}

function clampRgbValue(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function scaleRgbColor(color: RgbColor, ratio: number): RgbColor {
  return {
    r: clampRgbValue(color.r * ratio),
    g: clampRgbValue(color.g * ratio),
    b: clampRgbValue(color.b * ratio),
  }
}

function mixRgbColor(start: RgbColor, end: RgbColor, ratio: number): RgbColor {
  return {
    r: clampRgbValue(start.r + (end.r - start.r) * ratio),
    g: clampRgbValue(start.g + (end.g - start.g) * ratio),
    b: clampRgbValue(start.b + (end.b - start.b) * ratio),
  }
}

function hsvToRgb(hue: number, saturation = 1, value = 1): RgbColor {
  const normalizedHue = ((hue % 360) + 360) % 360
  const chroma = value * saturation
  const segment = normalizedHue / 60
  const x = chroma * (1 - Math.abs((segment % 2) - 1))
  let red = 0
  let green = 0
  let blue = 0

  if (segment >= 0 && segment < 1) {
    red = chroma
    green = x
  }
  else if (segment < 2) {
    red = x
    green = chroma
  }
  else if (segment < 3) {
    green = chroma
    blue = x
  }
  else if (segment < 4) {
    green = x
    blue = chroma
  }
  else if (segment < 5) {
    red = x
    blue = chroma
  }
  else {
    red = chroma
    blue = x
  }

  const match = value - chroma
  return {
    r: clampRgbValue((red + match) * 255),
    g: clampRgbValue((green + match) * 255),
    b: clampRgbValue((blue + match) * 255),
  }
}

function buildPreviewPayload(colors: RgbColor[]) {
  const data: number[] = [UnitID.LED, 0]
  colors.slice(0, LED_COLOR_COUNT).forEach(({ r, g, b }) => {
    data.push(b, r, g)
  })
  return data
}

function buildLedEffectFrame(effectId: string, step: number): RgbColor[] {
  const phase = step % 60
  const pulse = 0.5 + 0.5 * Math.sin((phase / 60) * Math.PI * 2)
  const sweep = (phase / 60) * 360
  const triad = [0, 120, 240].map(offset => hsvToRgb(sweep + offset, 1, 1))
  const shimmer = [0.35, 0.6, 1].map((base, index) =>
    Math.max(0.2, Math.min(1, base + 0.35 * Math.sin(((phase + index * 8) / 60) * Math.PI * 2))),
  )

  switch (effectId) {
    case 'rainbow-wave':
      return triad
    case 'neon-chase':
      return [0, 1, 2].map(index => hsvToRgb(sweep * 1.3 + index * 24, 1, shimmer[index]))
    case 'aurora': {
      const palette = [
        { r: 0, g: 255, b: 180 },
        { r: 0, g: 160, b: 255 },
        { r: 120, g: 0, b: 255 },
      ] as RgbColor[]
      return palette.map((color, index) => scaleRgbColor(color, shimmer[(index + 1) % 3]))
    }
    case 'lava':
      return [
        scaleRgbColor({ r: 255, g: 40, b: 0 }, shimmer[2]),
        scaleRgbColor({ r: 255, g: 100, b: 0 }, shimmer[1]),
        scaleRgbColor({ r: 255, g: 180, b: 0 }, shimmer[0]),
      ]
    case 'ocean':
      return [
        scaleRgbColor({ r: 0, g: 80, b: 255 }, shimmer[0]),
        scaleRgbColor({ r: 0, g: 220, b: 255 }, shimmer[2]),
        scaleRgbColor({ r: 0, g: 255, b: 170 }, shimmer[1]),
      ]
    case 'matrix': {
      const highlightIndex = step % 3
      return [0, 1, 2].map(index =>
        scaleRgbColor({ r: 0, g: index === highlightIndex ? 255 : 180, b: 40 }, index === highlightIndex ? 1 : 0.4),
      )
    }
    case 'police':
      return step % 2 === 0
        ? [{ r: 255, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 255 }]
        : [{ r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 255 }, { r: 255, g: 0, b: 0 }]
    case 'sunset':
      return [
        mixRgbColor({ r: 255, g: 70, b: 0 }, { r: 255, g: 0, b: 120 }, pulse),
        mixRgbColor({ r: 255, g: 120, b: 40 }, { r: 255, g: 70, b: 0 }, pulse),
        mixRgbColor({ r: 255, g: 200, b: 60 }, { r: 255, g: 120, b: 40 }, pulse),
      ]
    case 'glacier':
      return [
        scaleRgbColor({ r: 0, g: 150, b: 255 }, shimmer[2]),
        scaleRgbColor({ r: 0, g: 255, b: 255 }, shimmer[1]),
        scaleRgbColor({ r: 80, g: 60, b: 255 }, shimmer[0]),
      ]
    case 'candy':
      return [
        hsvToRgb(320 + sweep * 0.6, 0.9, shimmer[0]),
        hsvToRgb(285 + sweep * 0.6, 0.9, shimmer[1]),
        hsvToRgb(210 + sweep * 0.6, 0.9, shimmer[2]),
      ]
    case 'cyber':
      return [
        scaleRgbColor({ r: 0, g: 110, b: 255 }, shimmer[0]),
        scaleRgbColor({ r: 90, g: 0, b: 255 }, shimmer[2]),
        scaleRgbColor({ r: 255, g: 0, b: 180 }, shimmer[1]),
      ]
    case 'forest':
      return [
        scaleRgbColor({ r: 20, g: 255, b: 40 }, shimmer[0]),
        scaleRgbColor({ r: 0, g: 180, b: 80 }, shimmer[2]),
        scaleRgbColor({ r: 130, g: 255, b: 0 }, shimmer[1]),
      ]
    default:
      return triad
  }
}

export function useLed(options: LedHookOptions) {
  const ledGroups = ref<LedGroupConfig[]>(createDefaultLedGroups())
  const effectPreviewOptions = ledEffectPreviewOptions
  const previewingGroupId = ref<number | null>(null)
  const previewingEffectId = ref<string | null>(null)
  let autoPreviewTimer: ReturnType<typeof setTimeout> | undefined
  let effectWorker: Worker | null = null
  let isEffectFramePending = false

  function clearAutoPreviewTimer() {
    if (!autoPreviewTimer) {
      return
    }

    clearTimeout(autoPreviewTimer)
    autoPreviewTimer = undefined
  }

  function ensureEffectWorker() {
    if (effectWorker) {
      return effectWorker
    }

    effectWorker = new Worker(new URL('../../../workers/led-effect.worker.ts', import.meta.url), {
      type: 'module',
    })
    effectWorker.onmessage = (event: MessageEvent<EffectWorkerTickMessage>) => {
      if (event.data.type !== 'tick' || !previewingEffectId.value || isEffectFramePending) {
        return
      }

      isEffectFramePending = true
      void previewLedEffectFrame(previewingEffectId.value, event.data.step)
        .finally(() => {
          isEffectFramePending = false
        })
    }
    return effectWorker
  }

  function stopEffectPreviewLoop() {
    if (effectWorker) {
      effectWorker.postMessage({ type: 'stop' })
    }
    previewingEffectId.value = null
    isEffectFramePending = false
    clearPreviewLock()
  }

  function getScaledColors(group: LedGroupConfig) {
    return group.colors.map(color => applyBrightnessToColor(color, group.brightness)) as RgbColor[]
  }

  async function previewLedGroupNow(groupId: number) {
    const group = ledGroups.value.find(item => item.id === groupId)
    if (!group) {
      return
    }

    const scaledColors = getScaledColors(group)
    const data = buildPreviewPayload(scaledColors)

    logger.debug('[led] preview start', {
      brightness: group.brightness,
      colors: group.colors,
      data,
      groupId,
      scaledColors,
    })
    await options.writeData(ActionType.COMMAND, data, false, false)
    previewingGroupId.value = groupId
  }

  function scheduleLedPreview(groupId: number) {
    clearAutoPreviewTimer()
    stopEffectPreviewLoop()
    autoPreviewTimer = setTimeout(() => {
      autoPreviewTimer = undefined
      void previewLedGroupNow(groupId)
    }, AUTO_PREVIEW_DELAY_MS)
  }

  function updateLedGroupColor(groupId: number, colorIndex: number, value: string) {
    const group = ledGroups.value.find(item => item.id === groupId)
    if (!group || colorIndex < 0 || colorIndex >= LED_COLOR_COUNT) {
      return
    }

    group.colors[colorIndex] = value
    scheduleLedPreview(groupId)
  }

  function updateLedGroupBrightness(groupId: number, value: number) {
    const group = ledGroups.value.find(item => item.id === groupId)
    if (!group) {
      return
    }

    group.brightness = clampBrightness(value)
    scheduleLedPreview(groupId)
  }

  async function loadLedGroups() {
    logger.debug('[led] load start')
    const { data } = await options.writeData(ActionType.READ, [UnitID.LED, 0, 0], true)
    logger.debug('[led] load response', data)

    const nextGroups = createDefaultLedGroups()
    let offset = 4

    nextGroups.forEach((group) => {
      group.brightness = 100
      group.colors = group.colors.map(() => {
        const b = data[offset] ?? 0
        const r = data[offset + 1] ?? 0
        const g = data[offset + 2] ?? 0
        offset += 3
        return toHexColor(r, g, b)
      }) as [string, string, string]
    })

    clearAutoPreviewTimer()
    stopEffectPreviewLoop()
    ledGroups.value = nextGroups
    previewingGroupId.value = null
    logger.debug('[led] load applied', nextGroups)
  }

  function buildLedWriteBuffer() {
    const buffer = Array.from({ length: 60 }).fill(0) as number[]
    buffer[0] = PAGE_ID
    buffer[1] = ActionType.WRITE
    buffer[2] = UnitID.LED
    buffer[3] = 0

    let offset = 4
    ledGroups.value.forEach((group) => {
      getScaledColors(group).forEach(({ r, g, b }) => {
        buffer[offset] = b
        buffer[offset + 1] = r
        buffer[offset + 2] = g
        offset += 3
      })
    })

    return buffer
  }

  async function saveLedGroups() {
    clearAutoPreviewTimer()
    stopEffectPreviewLoop()
    const buffer = buildLedWriteBuffer()
    logger.debug('[led] save request', {
      groups: ledGroups.value,
      buffer,
    })
    await options.writeDataRaw(buffer)
    logger.debug('[led] save write finished, wait before next action', { waitMs: 1600 })
    await wait(1600)
    previewingGroupId.value = null
  }

  async function previewLedGroup(groupId: number) {
    clearAutoPreviewTimer()
    stopEffectPreviewLoop()
    await previewLedGroupNow(groupId)
  }

  async function previewLedEffectFrame(effectId: string, step: number) {
    const frame = buildLedEffectFrame(effectId, step)
    const data = buildPreviewPayload(frame)
    logger.debug('[led] effect preview frame', { effectId, step, data, frame })
    await options.writeData(ActionType.COMMAND, data, false, false)
    previewingGroupId.value = null
    previewingEffectId.value = effectId
  }

  async function startLedEffectPreview(effectId: string) {
    const effect = effectPreviewOptions.find(item => item.id === effectId)
    if (!effect) {
      return
    }

    clearAutoPreviewTimer()
    stopEffectPreviewLoop()
    setPreviewLock('灯效预览中，其他操作已锁定。', closeLedPreview)
    previewingEffectId.value = effectId
    await previewLedEffectFrame(effectId, 0)
    ensureEffectWorker().postMessage({
      type: 'start',
      intervalMs: effect.intervalMs,
    })
  }

  async function closeLedPreview() {
    clearAutoPreviewTimer()
    stopEffectPreviewLoop()
    const data = [UnitID.LED, 0]
    for (let index = 0; index < LED_COLOR_COUNT; index += 1) {
      data.push(0, 0, 0)
    }

    logger.debug('[led] preview close', { data })
    await options.writeData(ActionType.COMMAND, data, false, false)
    previewingGroupId.value = null
    clearPreviewLock()
  }

  onBeforeUnmount(() => {
    clearAutoPreviewTimer()
    stopEffectPreviewLoop()
    effectWorker?.terminate()
    effectWorker = null
  })

  return {
    closeLedPreview,
    effectPreviewOptions,
    ledGroups,
    loadLedGroups,
    previewingGroupId,
    previewingEffectId,
    previewLedGroup,
    saveLedGroups,
    startLedEffectPreview,
    updateLedGroupBrightness,
    updateLedGroupColor,
  }
}
