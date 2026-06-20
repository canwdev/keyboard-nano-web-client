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
  { id: 'rj45', label: '网口闪烁', intervalMs: 50, description: '模拟RJ45千兆网口，绿黄双色异步随机高频闪烁。' },
  { id: 'police', label: '红蓝警灯', intervalMs: 96, description: '红蓝交替闪烁，中心白光点缀。' },
  { id: 'sunset', label: '晚霞流光', intervalMs: 84, description: '橙红粉金过渡更柔和。' },
  { id: 'glacier', label: '冰川冷焰', intervalMs: 80, description: '冰蓝、青色、深蓝循环切换。' },
  { id: 'candy', label: '糖果跳变', intervalMs: 74, description: '粉紫蓝的跳色节奏。' },
  { id: 'cyber', label: '赛博脉冲', intervalMs: 60, description: '蓝紫洋红高对比闪动。' },
  { id: 'forest', label: '森林萤火', intervalMs: 86, description: '多层绿色像萤火游动。' },
  { id: 'savanna-chase', label: '原野追逐', intervalMs: 64, description: '金黄麦浪随微风平滑起伏，其间跃动着暖橙色的秋日阳光。' },
  { id: 'interstellar', label: '星际穿越', intervalMs: 45, description: '在静谧暗蓝的无垠深空中，突发幽蓝与炽白的光速跃迁。' },
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

  const pseudoRandom = (seed: number) => {
    const x = Math.sin(step * 12.9898 + seed * 78.233) * 43758.5453
    return x - Math.floor(x)
  }

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
    case 'rj45': {
      const r1 = pseudoRandom(1)
      const led1 = scaleRgbColor({ r: 0, g: 255, b: 30 }, r1 > 0.85 ? 1.0 : r1 > 0.4 ? 0.6 : 0.1)
      const r2 = pseudoRandom(2)
      const led2 = scaleRgbColor({ r: 220, g: 140, b: 0 }, r2 > 0.7 ? 1.0 : r2 > 0.3 ? 0.4 : 0.05)
      const r3 = pseudoRandom(3)
      const led3 = scaleRgbColor({ r: 0, g: 200, b: 20 }, r3 > 0.6 ? 0.7 : 0.4)
      return [led1, led2, led3]
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
    // 改造：麦田逐光 (柔和金黄麦浪)
    case 'savanna-chase': {
      const wheatDark = { r: 140, g: 85, b: 5 } // 麦穗阴影处的沉稳暗金
      const wheatGold = { r: 235, g: 170, b: 15 } // 盛夏熟透的饱满金黄
      const sunOrange = { r: 255, g: 115, b: 0 } // 顶层拂过的温暖阳光橙

      return [0, 1, 2].map((index) => {
        // 使用带有位置偏移（index * 1.5）的正弦波，模拟风吹过时产生的流动波浪感
        const wave = 0.5 + 0.5 * Math.sin((step * 0.1) + (index * 1.5))

        // 先让暗金色与标准金黄色根据波浪进行基础混合
        const baseField = mixRgbColor(wheatDark, wheatGold, wave)

        // 再引入一个更宏观的阳光呼吸节奏（取决于全局 pulse），局部点缀明亮的阳光橙
        const sunGlint = 0.5 + 0.5 * Math.cos((step * 0.05) - index)
        const finalRatio = wave * sunGlint * 0.6 // 控制阳光强度的权重，确保过渡平滑不刺眼

        return mixRgbColor(baseField, sunOrange, finalRatio)
      })
    }
    case 'interstellar': {
      const deepSpace = { r: 5, g: 10, b: 35 }
      const starRand = pseudoRandom(7)
      return [0, 1, 2].map((index) => {
        if (starRand > 0.88 && (step + index) % 3 === 0) {
          return { r: 255, g: 255, b: 255 }
        }
        if (starRand > 0.65 && (step + index) % 2 === 0) {
          return { r: 80, g: 190, b: 255 }
        }
        return scaleRgbColor(deepSpace, 0.5 + 0.5 * Math.sin(step * 0.2 + index))
      })
    }
    default:
      return triad
  }
}
