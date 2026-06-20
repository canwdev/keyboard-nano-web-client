export interface HidDevice {
  vendorId: number
  productId: number
  path: string
  serialNumber: string
  manufacturer: string
  product: string
  release: number
  interface: number
  usagePage: number
  usage: number
}

// report_id
export const PAGE_ID = 4

// https://github.com/Jackadminx/Keyboard_nano_client/blob/main/Help/report.md
export enum ActionType {
  // 读取
  READ = 0x00,
  // 写入
  WRITE = 0x01,
  // 复位：重启单片机
  RESET = 0x02,
  // 测试
  TEST = 0x03,
  // 重载配置：从FLASH中重载灯光 键位 模式
  RELOAD = 0x04,
  // 命令模式
  COMMAND = 0x05,
  // echo 模式
  ECHO = 0x06,
  // 操作闪存
  FLASH = 0x07,
}

// 单元ID
export enum UnitID {
  // 功能
  FUNC = 0,
  // led
  LED,
  // 按键1
  BTN1,
  // 按键2
  BTN2,
  // 按键3
  BTN3,
  // 全部
  ALL = 0xff,
}
