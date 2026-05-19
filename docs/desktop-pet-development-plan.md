# Miao 桌面宠物开发计划

更新时间：2026-05-17

## 目标

在现有 PWA/Web 工程 `Miao_remote` 基础上扩展桌面宠物能力。桌面端优先复用现有猫咪数据、动作视频、AI 生成链路和本地缓存，新增 Electron 壳层实现桌面级窗口能力。

## 仓库分工

| 仓库 | 定位 | 是否承载桌面宠物 |
|------|------|------------------|
| `Miao_remote` | PWA/Web + Express 服务 + AI 生成 | 是，作为桌面宠物主工程 |
| `miao-wechat-mini` | Taro 微信小程序 | 否，作为移动端小程序继续维护 |
| `miao-native-weapp` | 微信原生小程序 | 否，作为微信原生端继续维护 |

## 分阶段计划

### Phase 1：桌面宠物 MVP

目标：跑通桌面悬浮宠物最小闭环。

- 新增 `/desktop-pet` 独立页面。
- 从现有 `storage.getActiveCat()` 读取当前猫咪。
- 播放 `idle / tail / rubbing / blink` 动作视频。
- 提供动作按钮、气泡反馈、刷新、打开主应用入口。
- 新增 Electron 透明无边框窗口。
- 支持窗口置顶、拖拽、位置记忆、托盘菜单、点击穿透开关。

验证方式：

- `npm run lint`
- `npm run build`
- `npm run desktop:dev`

当前状态：已完成源码实现；运行级验证受 Electron 二进制下载速度影响，尚未完成完整桌面启动验收。

### Phase 2：桌面交互增强

目标：让桌面宠物更像系统级常驻伙伴。

- 支持更自然的拖拽区域和窗口吸边。已实现。
- 支持托盘菜单切换猫咪、刷新猫咪、打开设置。已实现。
- 支持开机启动配置。已实现，正式可用性需在打包后的 Electron 应用中验证。
- 支持常驻静音播放和视频错误自动恢复。已实现。
- 支持桌面端轻量设置页。已实现。
- 支持桌面端服务接口读取猫咪列表和按 `catId` 读取单只猫咪。已实现。
- 支持保持当前选中猫咪，定时刷新不覆盖用户选择。已实现。
- 桌面服务接口需要明确用户标识，避免无登录态时读取全局猫咪。已实现。
- 点击穿透改为托盘菜单控制，浮窗按钮只提示入口，避免开启后无法从浮窗恢复。已实现。

验证方式：

- 在 macOS 桌面拖拽、置顶、最小化、托盘恢复。
- 关闭主窗口后通过托盘恢复。
- 重启桌面宠物后位置保持。
- 若 Electron 独立窗口没有浏览器登录态，需要在 `.env` 中配置 `MIAO_DESKTOP_USERNAME`，或由前端请求显式携带 `username`。
- 若 `MIAO_APP_URL` 指向非本机服务，需要同时配置 `MIAO_DESKTOP_TOKEN`，Electron 会通过 `X-Miao-Desktop-Token` 访问桌宠 API。

当前状态：已完成源码实现，待统一运行验收。

### Phase 3：透明素材与视觉质量

目标：减少普通视频矩形背景带来的桌面沉浸感问题。

- 评估当前模型生成视频背景是否可控。
- 增加纯色背景生成策略。
- 尝试视频背景抠色或服务端分割。
- 评估 WebM alpha / PNG 序列方案。
- 根据效果决定是否建立桌面专用素材生成链路。

验证方式：

- 在浅色/深色桌面背景下检查边缘效果。
- 对比原视频、抠色视频、透明序列的性能与观感。

### Phase 4：数据与多端一致性

目标：桌面、PWA、小程序共享猫咪状态和生成结果。

- 桌面端接入登录态或服务端猫咪 API。
- 多端同步 active cat。
- 桌面端触发动作生成或跳转主应用生成。
- 桌面端展示通知、日常提醒、时光信解锁提醒。

验证方式：

- Web/PWA 创建猫咪后，桌面宠物可刷新展示。
- 小程序生成动作后，桌面宠物可同步播放。
- 桌面端触发打开主应用后进入正确业务入口。

## 当前实现文件

- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/dev-runner.cjs`
- `src/pages/DesktopPet.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/vite-env.d.ts`
- `package.json`
- `server.ts`

## 已知限制

- 第一版仍使用普通视频素材，透明窗口外壳已经具备，但视频本身是否有背景取决于生成素材。
- 点击穿透是整窗级开关，不是像素级透明区域穿透。
- `desktop:dev` 首次运行需要下载 Electron 二进制，网络慢时会卡在下载阶段。
- 生产打包尚未接入 `electron-builder` 或签名流程。
- 开机启动配置在开发态可保存，但 macOS 最终体验仍应在打包、签名后的应用中确认。
- `desktop:open` 面向已经构建好的生产 `dist`，日常开发调试应使用 `desktop:dev`。

## 安全与资源保护

- 桌宠 API 现在接受三类访问：有效 JWT、本机请求、或带 `MIAO_DESKTOP_TOKEN` 的 Electron 请求。
- `/api/desktop/frame-animation` 只允许 `idle / tail / rubbing / blink` 动作，避免任意路径或无意义任务进入抽帧流程。
- 抽帧任务默认单并发，默认 45 秒超时；可通过 `MIAO_DESKTOP_FRAME_MAX_CONCURRENT` 和 `MIAO_DESKTOP_FRAME_TIMEOUT_MS` 调整。
- 每个猫咪每个动作默认保留最近 2 份帧目录，新生成成功后会清理旧帧目录，避免 `uploads/frames` 无限膨胀。
