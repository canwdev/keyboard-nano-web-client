import { ref } from 'vue'
import { ActionType, PAGE_ID, UnitID } from '../types.ts'

interface LedHookOptions {
  writeData: (action: ActionType, extraData?: number[], isRead?: boolean) => Promise<any>
  writeDataRaw: (buffer?: number[], isRead?: boolean) => Promise<any>
}

export interface LedGroupConfig {
  colors: [string, string, string]
  id: number
  label: string
}

const LED_GROUP_COUNT = 6
const LED_COLOR_COUNT = 3

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

function createDefaultLedGroups() {
  return Array.from({ length: LED_GROUP_COUNT }, (_, groupIndex) => ({
    colors: ['#ffffff', '#ffffff', '#ffffff'] as [string, string, string],
    id: groupIndex + 1,
    label: `灯光组 ${groupIndex + 1}`,
  }))
}

export function useLed(options: LedHookOptions) {
  const ledGroups = ref<LedGroupConfig[]>(createDefaultLedGroups())
  const previewingGroupId = ref<number | null>(null)

  function updateLedGroupColor(groupId: number, colorIndex: number, value: string) {
    const group = ledGroups.value.find(item => item.id === groupId)
    if (!group || colorIndex < 0 || colorIndex >= LED_COLOR_COUNT) {
      return
    }

    group.colors[colorIndex] = value
  }

  async function loadLedGroups() {
    console.log('[led] load start')
    const { data } = await options.writeData(ActionType.READ, [UnitID.LED, 0, 0], true)
    console.log('[led] load response', data)

    const nextGroups = createDefaultLedGroups()
    let offset = 4

    nextGroups.forEach((group) => {
      group.colors = group.colors.map(() => {
        const b = data[offset] ?? 0
        const r = data[offset + 1] ?? 0
        const g = data[offset + 2] ?? 0
        offset += 3
        return toHexColor(r, g, b)
      }) as [string, string, string]
    })

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
      group.colors.forEach((color) => {
        const { r, g, b } = toRgbBytes(color)
        buffer[offset] = b
        buffer[offset + 1] = r
        buffer[offset + 2] = g
        offset += 3
      })
    })

    return buffer
  }

  async function saveLedGroups() {
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
    const group = ledGroups.value.find(item => item.id === groupId)
    if (!group) {
      return
    }

    const data: number[] = [UnitID.LED, 0]
    group.colors.forEach((color) => {
      const { r, g, b } = toRgbBytes(color)
      data.push(b, r, g)
    })

    console.log('[led] preview start', {
      groupId,
      colors: group.colors,
      data,
    })
    await options.writeData(ActionType.COMMAND, data)
    previewingGroupId.value = groupId
  }

  async function closeLedPreview() {
    const data = [UnitID.LED, 0]
    for (let index = 0; index < LED_COLOR_COUNT; index += 1) {
      data.push(0, 0, 0)
    }

    console.log('[led] preview close', { data })
    await options.writeData(ActionType.COMMAND, data)
    previewingGroupId.value = null
  }

  return {
    closeLedPreview,
    ledGroups,
    loadLedGroups,
    previewingGroupId,
    previewLedGroup,
    saveLedGroups,
    updateLedGroupColor,
  }
}
