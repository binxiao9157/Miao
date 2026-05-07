# Miao_remote PWA 与 miao-wechat-mini 小程序差异分析

分析日期：2026-05-07

对比对象：

- PWA 工程：`Miao_remote`
- 微信小程序工程：`miao-wechat-mini`

本次分析聚焦功能实现、页面覆盖、跳转逻辑、业务流程、服务层能力和 UI 设计差异。结论是：两个工程的产品主线高度一致，都是围绕“登录 - 创建猫咪伙伴 - 生成视频 - 养成陪伴 - 日记/时光信/好友/积分/个人中心”的闭环实现，但两端不是简单的同构迁移。PWA 更偏 Web App 与服务端一体化，小程序更偏微信原生能力与移动端端内体验，因此在登录、媒体存储、AI 生成状态、分享扫码、隐藏后台入口、缓存清理和部分页面拆分上存在明显差异。

## 1. 总体结论

| 维度 | miao-wechat-mini 小程序 | Miao_remote PWA | 差异影响 |
| --- | --- | --- | --- |
| 路由体系 | Taro 静态页面栈，`app.config.ts` 注册页面，底部 Tab 为自定义组件 | React Router 7，`ProtectedRoute` + `MainLayout`，主 Tab 页面保持挂载 | PWA 可减少 Tab 切换重建，小程序更依赖页面生命周期 |
| 登录方式 | 用户名密码、微信登录、手机号登录、注册、重置密码 | 用户名密码登录、注册、重置密码，本地用户迁移 | 小程序登录能力更完整，PWA 更适合浏览器账号体系 |
| 无猫引导 | `cat-start` 和 `empty-cat` 分离 | `empty-cat` 承担起始空状态，继续进入 `welcome` | 两端首只猫创建路径不完全一致 |
| 创建/上传生成 | 小程序先保存 pending 猫咪，再进入生成页读取当前猫 | PWA 通过 `location.state` 传递图片和参数，视频成功后再落库 | 失败恢复、刷新页面、回退行为差异较大 |
| 媒体存储 | 小程序端优先本地文件系统，H5 兜底 localStorage | IndexedDB 存储大媒体，支持 `indexeddb:` URL | PWA 对大图/视频更友好，小程序依赖端能力 |
| AI 生成代理 | 通过 Taro 适配器、上传适配器和远端 API 调用 | 前端服务层 + Express 代理端点 | PWA 可在服务端处理资源代理和持久化，小程序更依赖 API 网关 |
| 好友/扫码 | 微信扫码、原生分享、保存相册、专门 join-friend 页 | Web Share、剪贴板、html5-qrcode、协议处理 | 两端邀请链路体验不同 |
| 隐藏后台 | 个人页多个区域 5 连击，3 秒窗口 | PageHeader 标题和页脚区域 5 连击，2 秒窗口 | 触发区域和容错时间不一致 |
| UI 技术 | Taro + Less + 微信原生组件语义 | React + Tailwind + motion + lucide | PWA 动效和 Web 交互更丰富，小程序更端内原生 |

## 2. 技术栈与运行环境差异

### 2.1 小程序工程

核心位置：

- `miao-wechat-mini/src/app.config.ts`
- `miao-wechat-mini/src/custom-tab-bar/index.tsx`
- `miao-wechat-mini/src/context/AuthContext.tsx`
- `miao-wechat-mini/src/services/*`

主要特点：

- 使用 Taro 3.6 + React 18 + TypeScript。
- 页面必须在 `app.config.ts` 中声明。
- 底部导航是微信自定义 TabBar，通过 `Taro.switchTab`、`Taro.reLaunch`、`Taro.navigateTo` 等 API 跳转。
- 登录、扫码、保存图片、分享、文件系统、媒体选择等大量使用小程序端能力。
- 服务层通过 `httpAdapter`、`uploadAdapter`、`storageAdapter` 隔离 Taro 环境。

### 2.2 PWA 工程

核心位置：

- `Miao_remote/src/App.tsx`
- `Miao_remote/src/layouts/MainLayout.tsx`
- `Miao_remote/src/context/AuthContext.tsx`
- `Miao_remote/src/services/*`
- `Miao_remote/server.ts`

主要特点：

- 使用 Vite 6 + React 19 + React Router 7 + Tailwind 4 + motion。
- PWA 有自己的 Express 服务端，承担 API 代理、AI 代理、资源代理、上传和持久化等能力。
- 底部导航由 `MainLayout` 渲染，并维护主 Tab 页面的持久挂载。
- 浏览器能力包括 Web Share、Clipboard、IndexedDB、FileReader、Canvas、Service Worker 等。
- 页面动效、过渡、悬停和响应式布局明显更多。

## 3. 页面覆盖差异

### 3.1 双端共有页面

| 功能 | 小程序页面 | PWA 页面 | 主要差异 |
| --- | --- | --- | --- |
| 登录 | `pages/login/index` | `pages/Login` | 小程序支持微信/手机号登录，PWA 只支持账号密码 |
| 注册 | `pages/register/index` | `pages/Register` | 小程序走 `authService.register`，PWA 走 `requestAuth` |
| 重置密码 | `pages/reset-password/index` | `pages/ResetPassword` | 流程目标一致，UI 与请求封装不同 |
| 首页 | `pages/home/index` | `pages/Home` | PWA 在主 Tab 栈内保持挂载，小程序依赖页面生命周期 |
| 日记 | `pages/diary/index` | `pages/Diary` | 小程序接入原生分享与本地文件系统，PWA 使用 Web Share/IndexedDB |
| 时光信 | `pages/time-letters/index` | `pages/TimeLetters` | 业务相近，但通知解锁与快进联动存在实现差异 |
| 通知列表 | `pages/notification-list/index` | `pages/NotificationList` | PWA 作为 MainLayout 的内部页，小程序为独立页面 |
| 通知设置 | `pages/notifications/index` | `pages/Notifications` | 路由命名不同，PWA 路由是 `/notification-settings` |
| 积分 | `pages/points/index` | `pages/Points` | 主流程一致，兑换后新增猫咪路径不同 |
| 个人中心 | `pages/profile/index` | `pages/Profile` | 小程序原生能力更强，PWA 有安装提示与 Web 能力 |
| 编辑资料 | `pages/edit-profile/index` | `pages/EditProfile` | 小程序会同步服务端用户信息，PWA 更偏本地/账号信息 |
| 修改密码 | `pages/change-password/index` | `pages/ChangePassword` | 功能对应 |
| 空猫页 | `pages/empty-cat/index` | `pages/EmptyCatPage` | 小程序直接二选一，PWA 先展示空状态再去 welcome |
| 欢迎页 | `pages/welcome/index` | `pages/Welcome` | PWA 承担更多创建入口，Mini 配合 cat-start/empty-cat |
| 上传素材 | `pages/upload-material/index` | `pages/UploadMaterial` | PWA 有裁剪、压缩、跳过生图开关，小程序走 chooseMedia |
| 创建伙伴 | `pages/create-companion/index` | `pages/CreateCompanion` | 小程序先落库 pending，PWA 先传 state |
| 生成进度 | `pages/generation-progress/index` | `pages/GenerationProgress` | 状态来源、失败恢复、视频持久化差异明显 |
| 猫咪播放器 | `pages/cat-player/index` | `pages/CatPlayer` | 小程序 query 参数，PWA route param |
| 猫咪历史 | `pages/cat-history/index` | `pages/CatHistory` | 功能对应 |
| 陪伴里程碑 | `pages/accompany-milestone/index` | `pages/AccompanyMilestonePage` | 功能对应 |
| 切换伙伴 | `pages/switch-companion/index` | `pages/SwitchCompanion` | 小程序会拉取云端猫列表，PWA 以本地刷新为主 |
| 好友二维码 | `pages/add-friend-qr/index` | `pages/AddFriendQR` | 小程序原生分享/保存相册，PWA Web Share/剪贴板 |
| 扫码加好友 | `pages/scan-friend/index` | `pages/ScanFriend` | 小程序用 `Taro.scanCode`，PWA 用浏览器相机/图片识别 |
| 反馈 | `pages/feedback/index` | `pages/Feedback` | 功能对应 |
| 后台设置 | `pages/admin-settings/index` | `pages/AdminSettings` | PWA 调试项更多，小程序更贴近端内配置 |
| 下载页 | `pages/download/index` | `pages/Download` | PWA 更自然，小程序多用于引导 |
| 协议/隐私 | `pages/terms-of-service` / `pages/privacy-policy` | `pages/TermsOfService` / `pages/PrivacyPolicy` | 页面对应 |

### 3.2 小程序独有页面

| 页面 | 作用 | PWA 对应情况 |
| --- | --- | --- |
| `pages/cat-start/index` | 首次无猫的起始页，提示“还没有猫咪伙伴” | PWA 将这个起始页合并在 `EmptyCatPage` |
| `pages/join-friend/index` | 处理好友邀请加入链路 | PWA 的 `/join-friend` 路由直接复用 `ScanFriend` |
| `pages/privacy-settings/index` | 隐私设置独立页 | PWA 当前没有独立页面 |
| `pages/set-nickname/index` | 手机号登录新用户设置昵称 | PWA 当前没有手机号登录流程，因此没有对应页 |

### 3.3 PWA 独有或更突出的模块

PWA 没有明显“页面数量上独有”的业务页，但有一些 Web 专属能力由组件或服务承担：

- `MainLayout`：主 Tab 页面持久挂载、预加载 Tab chunk、浏览器安全区处理。
- `InstallPromptBanner`：PWA 安装提示。
- `DeepLinkHandler`：处理 `miao://friend?invite=...` 和 `/join-friend?deep_link=...`。
- `server.ts`：PWA 自带服务端代理、AI 代理、资源代理和持久化接口。
- `mediaStorage.ts`：IndexedDB 媒体存储。

## 4. 路由与跳转逻辑差异

### 4.1 小程序路由

小程序页面全部声明在 `app.config.ts`，主 Tab 为：

- `pages/diary/index`
- `pages/time-letters/index`
- `pages/home/index`
- `pages/points/index`
- `pages/profile/index`

跳转方式主要是：

- `Taro.switchTab`：主 Tab 切换。
- `Taro.navigateTo`：普通详情页、设置页、流程页。
- `Taro.redirectTo`：流程内替换当前页。
- `Taro.reLaunch`：登录后、退出后、无猫状态等重置页面栈场景。

自定义 TabBar 通过 `eventCenter` 同步当前路由，部分弹窗或全屏页会隐藏/显示 TabBar。

### 4.2 PWA 路由

PWA 路由由 `App.tsx` 统一声明，主要结构是：

- 公开路由：`/login`、`/register`、`/terms`、`/download`、`/reset-password`
- 受保护流程页：`/empty-cat`、`/welcome`、`/upload-material`、`/create-companion`、`/generation-progress`
- 主布局页：`/`、`/diary`、`/time-letters`、`/notifications`、`/points`、`/profile`
- 设置/详情页：`/edit-profile`、`/change-password`、`/notification-settings`、`/privacy-policy`、`/switch-companion`、`/add-friend-qr`、`/scan-friend`、`/join-friend`、`/feedback`、`/admin-settings`

主布局 `MainLayout` 有一个重要差异：它不是每次切换 Tab 都卸载页面，而是通过 `visitedTabs` 保持访问过的 Tab 页面挂载。这会让 PWA 的 Tab 切换体验更像原生 App，但也意味着页面内部状态更容易被保留。

### 4.3 关键跳转差异表

| 场景 | 小程序 | PWA | 风险或影响 |
| --- | --- | --- | --- |
| 登录成功且无猫 | 进入 `cat-start` 或空猫相关流程 | 进入 `/empty-cat` | 首次引导页面表现不一致 |
| 点击开始创建 | `cat-start` -> `empty-cat` -> 上传/创建 | `empty-cat` -> `welcome` -> 上传/创建 | 页面层级和文案节奏不同 |
| 上传素材生成 | 上传页完成生图后保存 pending 猫，跳 `generation-progress` | 上传页通过路由 state 传入图片，跳 `generation-progress` | PWA 刷新生成页会丢失 state，小程序恢复性更好 |
| 创建预设猫 | 创建页立即保存 pending 猫，生成页读取 active cat | 创建页传 state，生成成功后再创建 cat | 失败时本地是否已有猫记录不同 |
| 生成失败返回 | 小程序会删除 failed cat，并根据来源回到上传/创建页 | PWA 展示错误详情，可清缓存重置 PWA | 用户恢复路径不同 |
| 积分兑换新增猫 | 小程序 `switch-companion` 新增进入 `empty-cat` 并携带兑换参数 | PWA 进入 `/welcome` 并携带兑换 state | 兑换参数传递方式不同 |
| 好友邀请 | 专用 `join-friend` 页面 + 微信扫码/分享 | `/join-friend` 复用扫码页 + deep link 处理 | Web 与微信分享语义不同 |
| 隐藏后台 | 个人页 5 连击进入小程序页面 | 个人页标题/页脚 5 连击进入 `/admin-settings` | 触发范围和窗口时间不一致 |

## 5. 核心业务功能差异

### 5.1 登录与用户态

小程序 `AuthContext`：

- 通过 `authService` 统一处理登录、注册、微信登录、手机号登录、退出和当前用户获取。
- 支持 token 失效事件监听，收到 401 后自动退出。
- 初始化时会优先读取缓存用户，再请求服务端 `/api/v1/me`。
- 登录后会触发 `syncManager.syncAll` 同步猫、日记、时光信等数据。
- 手机号登录的新用户可跳转 `set-nickname` 补充昵称。

PWA `AuthContext`：

- 使用 `requestAuth` 直接请求认证接口。
- 支持用户名密码登录、注册、退出、本地用户迁移。
- 没有微信登录和手机号登录。
- 登录后根据本地猫列表数量决定进入首页还是空猫页。
- 退出时会同步最后活跃猫并清理当前用户。

主要差异：

- 小程序更完整地接入移动端登录能力。
- PWA 更依赖浏览器本地状态和账号密码体系。
- 双端在“登录后是否同步云端数据”和“无猫跳转目标”上不完全一致。

### 5.2 猫咪创建与 AI 生成

小程序生成流程：

1. 上传页或创建页得到图片。
2. 先创建 `CatInfo`，设置 `generationStatus: "pending"`。
3. 保存为 active cat。
4. 跳转到 `generation-progress`。
5. 生成页读取 active cat，提交视频任务。
6. 视频完成后下载并通过 `FileManager` 持久化。
7. 成功后更新 active cat，失败后标记 failed 或删除失败猫。

PWA 生成流程：

1. 上传页或创建页得到图片。
2. 通过 `navigate("/generation-progress", { state })` 传递图片、名字、品种、兑换信息。
3. 生成页用 `location.state` 创建 `newCatId`。
4. 提交视频任务，成功后下载/持久化。
5. 完成后再创建猫咪记录并进入首页。
6. 如果缺少 state，会重定向到 `/create-companion`。

主要差异：

- 小程序更适合从异常中恢复，因为 pending 猫已经在本地存储。
- PWA 的 `location.state` 更轻，但刷新生成页会丢失关键参数。
- 小程序失败后会退还积分并清理 failed cat，PWA 更偏调试错误展示和清理缓存重置。
- PWA 上传页支持裁剪、压缩、Canvas 优化和 `skipImageStage` 调试开关；小程序上传页主要依赖 `chooseMedia` 和上传适配器。

### 5.3 火山引擎/AI 调试配置

小程序：

- `services/volcanoService.ts` 直接封装图片和视频生成调用。
- `services/aiConfig.ts` 管理 provider、模型、尺寸、时长、seed、mock mode 等。
- 本地路径通过 `uploadAdapter` 上传，避免小程序直接传大 base64。
- 后台设置页用于切换 provider、模型、mock、调试参数。

PWA：

- `services/volcanoService.ts` 更像前端 facade。
- `server.ts` 承担 API 代理、资源代理、视频持久化和火山引擎请求。
- 支持环境变量、服务端代理、资源下载、`/api/proxy-resource` 等 Web 端能力。
- `UploadMaterial` 支持跳过第一阶段生图，更适合调试视频阶段。

主要差异：

- PWA 更适合把密钥留在服务端，小程序必须避免把 AK/SK 等敏感信息直接打入前端包。
- 小程序为了端内文件限制做了专门上传适配。
- 两端后台设置项并非完全等价，PWA 的调试开关更丰富。

### 5.4 日记、媒体与分享

小程序日记：

- 使用 `Taro.chooseMedia` 选择图片/视频。
- 小程序端通过文件系统保存媒体。
- 支持微信原生分享、朋友圈分享、保存图片到相册。
- 使用分享卡片生成工具和自定义分享面板。
- 页面显示时会同步自己的日记和好友日记。

PWA 日记：

- 使用浏览器文件选择和 FileReader。
- 大媒体进入 IndexedDB，生成 `indexeddb:` URL。
- 分享依赖 Web Share API、剪贴板、下载等浏览器能力。
- UI 动效和弹窗更接近 Web App。

主要差异：

- 小程序分享能力更自然，PWA 受浏览器权限和兼容性影响更大。
- PWA 的 IndexedDB 更适合保存大视频，避免 localStorage 容量限制。
- 小程序端媒体处理要同时考虑小程序文件系统和 H5 fallback。

### 5.5 时光信与通知

两端都支持：

- 写给未来的信。
- 等待解锁。
- 解锁通知。
- 关联猫咪。
- 管理未读通知数量。

需要关注的差异：

- PWA 的通知列表和时光信快进逻辑更集中，按“创建时间到现在的真实间隔是否达到总等待时间的 1/60”计算。
- 小程序 `time-letters` 与 `notification-list` 中的快进判断存在实现差异，通知列表里有使用 `Date.now() * 10` 的逻辑，容易导致解锁状态和信件页不一致。
- 两端都存在通过 `storage.getCatList()` 初始化 active cat 的实现，部分页面可能不会自动响应猫列表变化。

这属于功能一致性风险，建议优先抽出统一的“是否已解锁”工具函数，并让小程序和 PWA 使用同一套规则。

### 5.6 好友、二维码与深链

小程序：

- 添加好友二维码使用小程序 Canvas 能力。
- 支持 `openType="share"` 原生分享。
- 支持 `Taro.scanCode`。
- 有专用 `join-friend` 页面承接邀请。
- 保存二维码到相册更符合微信用户习惯。

PWA：

- 使用 `qrcode.react` 生成二维码。
- 使用 Web Share API 或剪贴板分享邀请链接。
- 使用 `html5-qrcode` 做摄像头扫码或图片识别。
- `DeepLinkHandler` 处理 `miao://friend?invite=...` 和 deep link query。
- `/join-friend` 当前复用 `ScanFriend`。

主要差异：

- 小程序是“端内分享/扫码”模型，PWA 是“链接/协议/浏览器扫码”模型。
- PWA 的深链能力更灵活，但依赖浏览器是否支持协议处理。
- 小程序的 join-friend 页面更明确，PWA 复用扫码页会让邀请进入路径略不直观。

### 5.7 个人中心、账户与缓存

小程序 Profile：

- 支持微信分享和朋友圈分享。
- 支持服务端通知拉取。
- 支持隐藏后台 5 连击。
- 清理缓存时会保留一批关键 key，并清理文件系统。
- 删除账号会调用 `/api/v1/me DELETE`。

PWA Profile：

- 支持安装提示。
- 支持 Web 方式的分享、复制、二维码。
- 隐藏后台也是 5 连击，但触发区域和时间窗口不同。
- 清理缓存当前偏粗暴，存在 `localStorage.clear()` 类型的全量清理。
- 删除账号更偏本地清理和退出，不等价于小程序服务端删除。

主要差异：

- PWA 缓存清理和删除账号语义比小程序更弱，需要谨慎对齐。
- 小程序对服务端账户状态处理更完整。

### 5.8 积分与兑换

两端都支持积分展示、积分流水、兑换生成名额等能力。

差异点：

- 小程序兑换后新增猫入口在 `switch-companion` 中进入 `empty-cat`，通过 query 继续传递兑换状态。
- PWA 兑换后更倾向进入 `/welcome`，通过 router state 传递兑换状态。
- 小程序生成失败时有更明确的积分退还处理。
- PWA 的兑换状态更依赖路由 state，刷新页面后更容易丢失上下文。

## 6. UI 设计与交互差异

### 6.1 整体视觉

两端都使用温暖、柔和、陪伴感较强的视觉方向，主色围绕橙色、米白、暖色卡片、圆角和柔光背景展开。

差异：

- 小程序更像移动端原生 App，界面由 Taro View/Text/Image 和 Less 样式构成。
- PWA 更像高完成度 Web App，Tailwind 原子类、motion 动效、lucide 图标、渐变和 hover 反馈更多。
- PWA 的圆角更大，常见 `rounded-[32px]`、`rounded-[40px]`；小程序更偏 Less 中定义的卡片和按钮样式。

### 6.2 底部导航

小程序：

- 自定义 TabBar。
- 使用 PNG 图标资源。
- 首页 Tab 有特殊视觉状态。
- 依赖 `Taro.switchTab` 和事件同步 active tab。

PWA：

- `MainLayout` 内部 Bottom Nav。
- 使用 lucide 图标和 motion 动画。
- 主 Tab 页面保持挂载。
- PWA 中 `/notifications` 是 MainLayout 内页面，但并不是底部导航项，主要通过个人中心入口进入。

影响：

- PWA Tab 切换体验更顺滑，页面状态保留更多。
- 小程序更符合微信容器行为，但页面重建和数据刷新更依赖生命周期。

### 6.3 页面层级与信息密度

小程序：

- 页面拆分更细，例如 `cat-start`、`empty-cat`、`set-nickname`、`privacy-settings`。
- 流程更符合端内小步推进。
- 弹窗更多使用 Taro modal、toast 或自定义小程序组件。

PWA：

- 部分流程合并或通过组件承载，例如空猫起始页合并到 `EmptyCatPage`。
- 动效和过渡更强，页面视觉更丰富。
- Web 端有更明显的安装、复制、下载、浏览器扫码等功能入口。

### 6.4 上传与生成页面体验

小程序上传：

- 原生选择媒体。
- 生成图预览。
- 保存到相册。
- 端内提示为主。

PWA 上传：

- 文件输入、裁剪、Canvas 压缩。
- 可跳过第一阶段生图。
- 可通过浏览器保存、复制、下载。
- 错误详情和调试引导更丰富。

影响：

- PWA 对调试 AI 生成更友好。
- 小程序对普通用户更接近微信使用习惯。

### 6.5 分享与二维码 UI

小程序：

- 分享按钮、扫码、保存相册都更接近微信用户预期。
- 依赖微信平台权限与生命周期。

PWA：

- 分享按钮依赖浏览器支持。
- 需要提供复制链接、下载二维码、图片扫码等替代路径。
- 深链逻辑更复杂，UI 需要解释不同浏览器的行为差异。

## 7. 当前发现的重点不一致与潜在问题

### 7.1 高优先级

1. 小程序时光信通知快进判断不一致  
   小程序 `notification-list` 和 `time-letters` 对快进解锁的判断逻辑不同，可能造成“信件页未解锁、通知页已显示解锁”或相反的状态。建议抽出统一函数。

2. PWA 生成页依赖 router state，刷新恢复能力弱  
   PWA `/generation-progress` 如果刷新页面，`location.state` 会丢失，只能跳回创建页。小程序因为先保存 pending cat，恢复能力更强。建议 PWA 也保存 generation draft 或 pending cat。

3. PWA 删除账号与清理缓存语义弱于小程序  
   小程序删除账号会调用服务端 DELETE，PWA 更偏本地清理。若产品语义是“注销账号”，PWA 需要补齐服务端删除。

4. PWA 清理缓存过粗  
   `localStorage.clear()` 容易清掉不该清的数据，例如认证态、调试配置或未来接入的第三方状态。建议改为白名单/前缀清理。

5. 双端新增猫兑换路径不一致  
   小程序兑换新增猫进入 `empty-cat`，PWA 进入 `/welcome`，一个用 query，一个用 router state。建议统一为更稳定的 URL query 或持久化兑换上下文。

### 7.2 中优先级

1. 隐藏后台触发规则不一致  
   小程序是 3 秒窗口，PWA 是 2 秒窗口；触发区域也不同。体验版无法进入后台时，这类差异会增加排查成本。建议统一为相同窗口和相同可点区域。

2. 页面覆盖不完全一致  
   PWA 缺少 `set-nickname`、`privacy-settings` 独立页面；小程序缺少 PWA 的安装提示、深链协议处理等 Web 能力。

3. 认证能力不一致  
   小程序支持微信/手机号，PWA 不支持。这是平台差异，但会导致用户数据合并、昵称设置、新用户引导不同。

4. AI 调试项不完全一致  
   PWA 有跳过第一阶段生图能力，小程序没有完全等价的前台入口。调试同一条 AI 链路时，两端不一定能复现相同条件。

5. 服务端 API 风格不统一  
   小程序更集中使用 `/api/v1/...`，PWA 同时存在 `/api/v1/...` 与 `/api/...` 老接口。长期建议收敛。

### 7.3 低优先级

1. UI 圆角、图标风格和动效强度不一致  
   PWA 更偏现代 Web 动效，小程序更静态和原生。这不是 bug，但会造成品牌一致性差异。

2. PWA 主 Tab 保持挂载，小程序页面生命周期刷新  
   这会导致某些数据刷新时机不同。建议对关键数据统一使用显式 refresh 事件或页面显示时同步。

3. PWA `/notifications` 在主布局内但不在底部导航中  
   这不是错误，但需要确认产品预期。若通知列表是主功能，底部导航是否应展示需要明确。

## 8. 建议的修复/对齐顺序

1. 统一时光信解锁与通知解锁判断  
   先修小程序中 `notification-list` 与 `time-letters` 的快进逻辑，避免用户看到互相矛盾的状态。

2. 增强 PWA 生成流程恢复能力  
   给 PWA 增加 generation draft 或 pending cat 状态，避免刷新 `/generation-progress` 后丢失上下文。

3. 对齐兑换新增猫上下文  
   双端统一使用稳定 query 或持久化上下文传递 `isRedemption`、`redemptionAmount`、`debug` 等字段。

4. 对齐隐藏后台入口  
   双端统一 5 连击窗口、触发区域和提示逻辑，降低体验版排查成本。

5. 收敛缓存清理和账号删除语义  
   PWA 避免全量 `localStorage.clear()`，删除账号补齐服务端请求。

6. 梳理页面覆盖  
   决定 PWA 是否需要补独立隐私设置页、昵称设置页；决定小程序是否需要与 PWA 一样提供更明确的深链说明。

7. 收敛 AI 调试配置  
   确认两端后台设置项是否需要一致，尤其是 mock mode、provider、image model、video model、skip image stage、resolution、duration。

## 9. 页面跳转流程对照

### 9.1 首次进入

小程序：

```text
login/register
  -> sync user/cats
  -> has cat ? home : cat-start
  -> cat-start
  -> empty-cat
  -> upload-material/create-companion
  -> generation-progress
  -> home
```

PWA：

```text
login/register
  -> read local cats
  -> has cat ? / : /empty-cat
  -> /empty-cat
  -> /welcome
  -> /upload-material or /create-companion
  -> /generation-progress
  -> /
```

### 9.2 上传猫咪素材

小程序：

```text
empty-cat
  -> upload-material
  -> chooseMedia
  -> generate image
  -> create pending cat in storage
  -> generation-progress reads active cat
  -> submit video task
  -> persist video
  -> home
```

PWA：

```text
/welcome
  -> /upload-material
  -> file input
  -> crop/compress
  -> generate image or skip image stage
  -> navigate with location.state
  -> /generation-progress
  -> submit video task
  -> persist video
  -> create cat in storage
  -> /
```

### 9.3 好友邀请

小程序：

```text
profile or friend entry
  -> add-friend-qr
  -> native share / save QR / scan
  -> join-friend
  -> add friend
```

PWA：

```text
/profile or friend entry
  -> /add-friend-qr
  -> web share / copy link / download QR
  -> /scan-friend or /join-friend
  -> DeepLinkHandler parses invite
  -> add friend
```

## 10. 对齐建议结论

两个工程目前不是“一个功能的两个皮肤”，而是“同一个产品方向下的两个平台实现”。这种状态是合理的，但需要把会影响业务一致性的部分收敛，包括：

- 生成流程状态恢复。
- 积分兑换上下文传递。
- 时光信解锁判断。
- 隐藏后台入口。
- 账户删除与缓存清理语义。
- AI 调试配置项。

UI 层面不需要追求完全一致。小程序应保留微信原生分享、扫码、保存相册的优势；PWA 应保留裁剪、IndexedDB、大媒体、安装提示、Web 分享和服务端代理优势。更重要的是让同一用户在两端看到一致的业务状态，并且在关键路径失败时有一致、可恢复的处理方式。
