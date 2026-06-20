export interface RgbColor {
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

export const ledEffectPreviewOptions: LedEffectPreviewOption[] = [
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

export function buildLedEffectFrame(effectId: string, step: number): RgbColor[] {
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
