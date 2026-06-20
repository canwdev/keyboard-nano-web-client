import { onBeforeUnmount, ref } from 'vue'
import { ActionType, PAGE_ID, UnitID } from '../types.ts'

interface LedHookOptions {
  writeData: (action: ActionType, extraData?: number[], isRead?: boolean) => Promise<any>
  writeDataRaw: (buffer?: number[], isRead?: boolean) => Promise<any>
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

function applyBrightnessToColor(color: string, brightness: number) {
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

export function useLed(options: LedHookOptions) {
  const ledGroups = ref<LedGroupConfig[]>(createDefaultLedGroups())
  const previewingGroupId = ref<number | null>(null)
  let autoPreviewTimer: ReturnType<typeof setTimeout> | undefined

  function clearAutoPreviewTimer() {
    if (!autoPreviewTimer) {
      return
    }

    clearTimeout(autoPreviewTimer)
    autoPreviewTimer = undefined
  }

  function getScaledColors(group: LedGroupConfig) {
    return group.colors.map(color => applyBrightnessToColor(color, group.brightness)) as {
      b: number
      g: number
      r: number
    }[]
  }

  async function previewLedGroupNow(groupId: number) {
    const group = ledGroups.value.find(item => item.id === groupId)
    if (!group) {
      return
    }

    const scaledColors = getScaledColors(group)
    const data: number[] = [UnitID.LED, 0]
    scaledColors.forEach(({ r, g, b }) => {
      data.push(b, r, g)
    })

    console.log('[led] preview start', {
      brightness: group.brightness,
      colors: group.colors,
      data,
      groupId,
      scaledColors,
    })
    await options.writeData(ActionType.COMMAND, data)
    previewingGroupId.value = groupId
  }

  function scheduleLedPreview(groupId: number) {
    clearAutoPreviewTimer()
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
    console.log('[led] load start')
    const { data } = await options.writeData(ActionType.READ, [UnitID.LED, 0, 0], true)
    console.log('[led] load response', data)

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
    ledGroups.value = nextGroups
    previewingGroupId.value = null
    console.log('[led] load applied', nextGroups)
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
    const buffer = buildLedWriteBuffer()
    console.log('[led] save request', {
      groups: ledGroups.value,
      buffer,
    })
    await options.writeDataRaw(buffer)
    console.log('[led] save write finished, wait before next action', { waitMs: 1600 })
    await wait(1600)
    previewingGroupId.value = null
  }

  async function previewLedGroup(groupId: number) {
    clearAutoPreviewTimer()
    await previewLedGroupNow(groupId)
  }

  async function closeLedPreview() {
    clearAutoPreviewTimer()
    const data = [UnitID.LED, 0]
    for (let index = 0; index < LED_COLOR_COUNT; index += 1) {
      data.push(0, 0, 0)
    }

    console.log('[led] preview close', { data })
    await options.writeData(ActionType.COMMAND, data)
    previewingGroupId.value = null
  }

  onBeforeUnmount(() => {
    clearAutoPreviewTimer()
  })

  return {
    closeLedPreview,
    ledGroups,
    loadLedGroups,
    previewingGroupId,
    previewLedGroup,
    saveLedGroups,
    updateLedGroupBrightness,
    updateLedGroupColor,
  }
}
