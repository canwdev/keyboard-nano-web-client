# AGENTS

## 项目概览

- 本项目是一个基于 `Vue 3 + TypeScript + Vite + Bun` 的单前端应用。
- 应用直接通过浏览器 `WebHID` API 与键盘硬件通信，不再依赖本地 Node/Express 后端代理。
- 主要用途是读取和写入 Keyboard Nano 设备配置，并提供 LED、按键、模式等交互界面。

## 目录结构

- `src/main.ts`
  - 应用入口，挂载 Vue 应用。
- `src/App.vue`
  - 顶层页面与全局加载状态展示。
- `src/components/KeyboardNanoClient`
  - 设备主界面与协议相关逻辑。
  - `KeyboardNanoClient.vue`: 连接设备、发送命令、读取状态、渲染设置页面。
  - `hooks/use-settings.ts`: 设备设置的读写与字节映射。
  - `types.ts`: 协议常量、动作枚举和设备类型定义。
  - `data/*.json`: 界面展示所需的配置数据。
- `src/components/CommonUI`
  - 通用 UI 组件，如标签页、通知列表、输入弹窗。
- `src/utils/webhid.ts`
  - `WebHID` 设备发现、连接、发送 report、读取 input report、超时处理。
- `src/utils/api.ts`
  - 前端对外统一调用层，保留 `getStatus / deviceInit / write / ping / deviceClose` 接口形态，内部转发到 `WebHID` 实现。
- `src/assets`
  - 全局样式与主题样式。
- `vite.config.ts`
  - Vite 构建和开发配置，当前为纯前端单项目配置。

## 通信与协议

- 设备通信基于 HID report。
- 页面中的业务代码尽量不要直接操作 `navigator.hid`，统一通过 `src/utils/webhid.ts` 封装。
- 上层组件继续沿用 `keyboardNanoApi`，避免把硬件访问细节散落到页面逻辑中。
- 协议字段如 `PAGE_ID`、`ActionType`、`UnitID` 统一维护在 `src/components/KeyboardNanoClient/types.ts`。

## 开发命令

- 安装依赖: `bun install`
- 启动开发环境: `bun run dev`
- 构建生产包: `bun run build`
- 类型检查: `bun run type-check`
- 检查 lint: `bun run lint`
- 自动修复并格式化: `bun run format`

## 代码约定

- 使用 `ESLint + @antfu/eslint-config` 作为唯一格式化与风格约束工具，不使用 Prettier。
- 对代码进行格式化时，优先运行 `bun run format`。
- 新增与设备通信有关的逻辑时，优先放入 `src/utils/webhid.ts` 或其相邻模块，不直接堆到 Vue 组件中。
- 修改协议读写时，保持“协议常量定义”和“字节解析/组包逻辑”同步更新。
- 若新增 UI 功能，优先复用 `src/components/CommonUI` 中已有组件。

## 修改建议

- 若需要扩展更多硬件命令，先在 `types.ts` 增加枚举或常量，再在 `use-settings.ts` 或页面动作中接入。
- 若未来需要兼容非 `WebHID` 环境，建议在 `src/utils/api.ts` 这一层做能力探测和回退，而不是改页面组件。
