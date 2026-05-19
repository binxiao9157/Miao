# PWA 桌宠集成方案

更新时间：2026-05-19

## 1. 目标与定位

当前桌宠方案是在 `Miao_remote` PWA/Web 工程内扩展桌面常驻能力，而不是另起独立业务工程。核心思路是：

- PWA 继续承载账号、猫咪数据、AI 生成、上传、缓存和主业务页面。
- 新增 `/desktop-pet` 作为轻量桌宠入口，复用现有猫咪数据和动作素材。
- Electron 只作为桌面壳层，负责透明窗口、置顶、托盘、点击穿透、开机启动、窗口拖动等系统能力。
- 素材来源支持两类：业务猫咪的视频/帧动画，以及仓库内置的 `spritesheet + pet.json` 桌宠素材包。

## 2. 当前代码结构

| 模块 | 文件 | 职责 |
|---|---|---|
| PWA 桌宠页面 | `src/pages/DesktopPet.tsx` | 渲染桌宠、动作按钮、设置面板、素材切换、业务猫咪/素材猫咪切换 |
| 桌宠素材模型 | `src/services/desktopPetManifest.ts` | 定义 manifest 类型、动作帧、默认动作、帧过滤、动作时长 |
| 桌宠样式 | `src/index.css` | 透明背景、宠物舞台、气泡、底部动作栏、设置面板 |
| PWA 路由 | `src/App.tsx` | 支持 `/desktop-pet` 路由和 `?desktopPet=1` 直达桌宠 |
| PWA 启动 | `src/main.tsx` | 桌宠入口跳过 service worker 注册，避免桌宠窗口被 PWA 缓存刷新干扰 |
| Electron 主进程 | `electron/main.cjs` | 透明窗口、托盘菜单、窗口状态、置顶、点击穿透、开机启动 |
| Electron preload | `electron/preload.cjs` | 暴露安全的 `window.miaoDesktop` IPC API |
| Electron dev runner | `electron/dev-runner.cjs` | 启动 Express/Vite 开发服务并打开 Electron 桌宠窗口 |
| 服务端 API | `server.ts` | 桌宠猫咪 API、素材 API、视频抽帧 API、静态资源托管 |
| 素材目录 | `public/desktop-pets/pets` | 仓库内置桌宠素材包 |
| 素材校验 | `scripts/validate-desktop-pets.cjs` | 校验素材 manifest、尺寸、动作帧、透明空帧 |

## 3. 入口与运行方式

### PWA 页面入口

桌宠页面可直接通过浏览器访问：

```text
http://localhost:3000/desktop-pet
```

素材预览模式：

```text
http://localhost:3000/desktop-pet?spritePet=orange-tabby-natural-pet
```

`src/App.tsx` 中同时支持 `?desktopPet=1`：

```text
http://localhost:3000/?desktopPet=1
```

### Electron 开发入口

```bash
npm run desktop:dev
```

指定某个素材桌宠：

```bash
MIAO_DESKTOP_DEV_URL='http://localhost:3000/desktop-pet?spritePet=orange-tabby-natural-pet' npm run desktop:dev
```

生产预览入口：

```bash
npm run desktop:prod
```

当前尚未接入正式 Electron 打包、签名和自动更新流程。

## 4. 数据与渲染模式

当前桌宠支持两种渲染模式。

### 4.1 业务猫咪模式

业务猫咪模式读取现有猫咪数据，优先级如下：

1. `storage.getActiveCat()` 本地缓存。
2. `/api/desktop/active-cat` 获取当前用户最新猫咪。
3. `/api/desktop/cats` 获取猫咪列表并支持托盘/设置内切换。

动作素材来源：

- `cat.frameAnimations[action]`：服务端抽帧后的 PNG 序列，桌宠优先使用。
- `cat.videoPaths[action]`：动作视频。
- `cat.videoPath` / `cat.remoteVideoUrl`：`idle` 兜底视频。
- `placeholderImage` / `anchorFrame` / `avatar`：视频不可用时兜底图片。

支持动作：

| 动作 key | UI 文案 | 触发方式 |
|---|---|---|
| `idle` | 蹭蹭 | 单击/默认 |
| `tail` | 摸头 | 双击/按钮 |
| `rubbing` | 踩奶 | 滚轮/按钮 |
| `blink` | 逗猫 | 右键/按钮 |

### 4.2 素材桌宠模式

素材桌宠模式读取 `public/desktop-pets/pets/{id}/pet.json` 和 `spritesheet.webp`。

运行时通过：

- `GET /api/desktop/pets` 获取可用素材列表。
- `GET /desktop-pet-assets/pets/{id}/pet.json` 获取素材 manifest。
- `GET /desktop-pet-assets/pets/{id}/spritesheet.webp` 获取精灵图。

素材 manifest 支持字段：

```json
{
  "id": "orange-tabby-natural-pet",
  "displayName": "Orange Tabby",
  "spritesheetPath": "spritesheet.webp",
  "columns": 8,
  "rows": 9,
  "frameWidth": 192,
  "frameHeight": 208,
  "fps": 10,
  "scale": 1,
  "animations": {
    "idle": { "frames": [0, 1, 2, 3, 4, 5], "fps": 8, "loop": true },
    "tail": { "frames": [8, 9, 10], "fps": 10, "loop": true, "next": "idle" }
  }
}
```

素材模式已实现：

- 设置面板中选择“桌宠素材”。
- 选择“业务猫咪”后清理 `spritePet` URL 参数和本地缓存，切回业务猫咪。
- 根据 manifest 的动作帧播放 spritesheet。
- 交互动作播放后自动回到 `idle`。
- 空闲状态随机触发 `tail / rubbing / blink`。

## 5. 服务端接口

### 5.1 桌宠猫咪接口

```http
GET /api/desktop/cats
GET /api/desktop/active-cat?catId={catId}
```

认证来源：

- 有效 JWT。
- 本机请求。
- `MIAO_DESKTOP_TOKEN` / `MIAO_DESKTOP_ACCESS_TOKEN` 对应的 `X-Miao-Desktop-Token`。

用户识别优先级：

1. JWT 内用户名。
2. query/body 中的 `username`。
3. `.env` 中的 `MIAO_DESKTOP_USERNAME`。
4. `.env` 中的 `MIAO_DESKTOP_USER`。

### 5.2 视频抽帧接口

```http
POST /api/desktop/frame-animation
```

用途：把已持久化的视频转成 PNG 帧序列，供桌宠播放，降低视频卡顿和矩形背景问题。

约束：

- 只允许 `idle / tail / rubbing / blink`。
- 当前要求源视频是 `/uploads` 下的本地持久化文件。
- 默认单并发。
- 默认 45 秒超时。
- 每个猫咪每个动作默认保留最近 2 份帧目录。

相关环境变量：

```bash
MIAO_DESKTOP_FRAME_TIMEOUT_MS=45000
MIAO_DESKTOP_FRAME_MAX_CONCURRENT=1
MIAO_DESKTOP_FRAME_KEEP_PER_ACTION=2
```

### 5.3 素材接口

```http
GET /api/desktop/pets
GET /desktop-pet-assets/pets/{id}/pet.json
GET /desktop-pet-assets/pets/{id}/spritesheet.webp
```

素材目录查找优先级：

1. `MIAO_DESKTOP_PETS_DIR`
2. `public/desktop-pets/pets`
3. `dist/desktop-pets/pets`
4. 旧本地兼容路径 `../pic/pets/pets`

## 6. Electron 桌面能力

Electron 主进程提供的桌面能力：

- 透明无边框窗口。
- `alwaysOnTop` 置顶。
- `skipTaskbar` 不显示任务栏。
- `setVisibleOnAllWorkspaces` 多桌面可见。
- 窗口拖动和位置记忆。
- 靠边吸附。
- 托盘菜单。
- 开机启动。
- 点击穿透。
- 临时点击穿透 10 秒。
- 打开主应用。

托盘菜单当前包含：

- 显示/隐藏桌面宠物。
- 刷新猫咪。
- 切换猫咪。
- 打开设置。
- 重置窗口位置。
- 打开主应用。
- 保持置顶。
- 点击穿透。
- 开机启动。
- 退出。

`preload.cjs` 暴露给 PWA 页面的方法都在 `window.miaoDesktop` 下，页面不直接访问 Node/Electron 原生能力。

## 7. 设置面板与交互

桌宠页面当前提供轻量设置面板：

- 桌宠素材切换。
- 业务猫咪切换。
- 保持置顶。
- 开机启动。
- 浮层模式。
- 临时穿透 10 秒。
- 生成帧动画。
- 刷新猫咪。
- 重置位置。
- 打开主应用。

关闭方式：

- 点击右上角 `X`。
- 点击面板外部空白。
- 按 `Esc`。

拖动方式：

- 拖动桌宠舞台可移动整个 Electron 窗口。
- 在 Electron 环境下拖动设置面板标题区域时，也会移动整个桌宠窗口。
- 浏览器预览环境下，设置面板可在页面内部拖动作为 fallback。

## 8. PWA 集成细节

### 8.1 Service Worker 处理

`src/main.tsx` 对桌宠入口做了特殊处理：

```ts
const isDesktopPetEntry =
  new URLSearchParams(window.location.search).get('desktopPet') === '1' ||
  window.location.pathname === '/desktop-pet';

if ('serviceWorker' in navigator && !isDesktopPetEntry) {
  // register service worker
}
```

目的：

- 避免桌宠透明窗口被 PWA service worker 更新刷新。
- 避免桌宠入口使用过期缓存。
- 让 Electron 桌宠窗口保持独立、轻量。

### 8.2 样式隔离

`DesktopPet` 挂载时会给 `html/body` 加：

```text
desktop-pet-mode
```

对应样式让页面变成透明、满屏、无滚动，并隐藏普通 PWA 背景。

### 8.3 与主应用关系

桌宠不是主应用的一部分 UI，而是复用同一个 React/Vite/Express 工程的独立入口：

- 主应用负责创建、生成、管理猫咪。
- 桌宠入口负责轻量展示和交互。
- Electron 负责桌面系统能力。

## 9. 素材校验与验收

素材校验：

```bash
npm run desktop:pets:validate
```

检查内容：

- `pet.json` 是否存在。
- `spritesheet.webp` 是否存在。
- 图片尺寸是否匹配 `columns * frameWidth` 和 `rows * frameHeight`。
- `idle / tail / rubbing / blink` 是否都有动作帧。
- 动作帧是否越界。
- 动作帧是否指向透明空帧。

常规工程验证：

```bash
npm run lint
npm run build
npm run desktop:pets:validate
```

开发态桌宠验证：

```bash
npm run desktop:dev
```

## 10. 当前已知限制

- 尚未接入 `electron-builder`，没有正式安装包、签名、公证和自动更新。
- 业务猫咪视频是否透明取决于生成素材本身；当前只是透明窗口，视频内部背景不一定透明。
- 点击穿透是整窗级能力，不是按像素透明区域穿透。
- 抽帧接口依赖 `ffmpeg-static`，并且要求源视频已经持久化到本地 `/uploads`。
- 素材包当前只支持内置和目录扫描，还没有 UI 导入素材包。
- `anchor / hitbox / bubbleOffset` 类型已预留，但渲染层尚未逐素材精调。
- Electron 开机启动在开发态可调用，最终体验需要在正式打包签名后验证。

## 11. 后续建议

优先级建议：

1. 接入 Electron 打包：`electron-builder`、图标、签名、公证、自动更新。
2. 做素材导入 UI：选择本地 zip/目录，校验后复制到用户数据目录。
3. 完善素材 manifest：落地 `anchor / hitbox / bubbleOffset / shadow` 渲染。
4. 优化业务猫咪透明度：优先使用 PNG 帧序列，逐步减少普通视频矩形背景。
5. 打通 AI 生成 spritesheet：生成后自动产出 `pet.json`，并跑 `desktop:pets:validate`。
6. 独立设置窗口：如果设置项继续增多，建议从桌宠浮层面板升级为 Electron 独立设置窗口。
