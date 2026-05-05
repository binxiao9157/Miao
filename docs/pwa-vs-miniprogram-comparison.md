# Miao PWA vs 微信小程序 — 差异对比分析

> 生成日期：2026-05-04
> 对比对象：Miao_remote（PWA）vs miao-wechat-mini（小程序）
> 目的：梳理两端在 UI 设计、页面结构、功能实现细节上的差异，指导后续统一与优化

---

## 一、技术栈差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 框架 | React 18 + react-router-dom v6 | Taro v3.6.40 (React) |
| 构建 | Vite | Webpack 4 |
| 样式 | Tailwind CSS + 内联 style | Less + rpx 单位 |
| 路由 | react-router `<Routes>` 声明式 | Taro 路由配置 `app.config.ts` |
| 状态管理 | React Context + useState | React Context + useState |
| 本地存储 | localStorage + IndexedDB | Taro.getStorageSync + FileSystem + IndexedDB |
| HTTP 客户端 | axios | Taro.request（通过 httpAdapter 封装） |
| 动画 | motion/react (Framer Motion) | CSS animation / Taro.createAnimation |
| 懒加载 | React.lazy + Suspense + retry | 小程序分包加载 |
| 图标 | Lucide React（SVG 组件库） | PNG 图片 + Unicode Emoji |
| 分享卡 | html2canvas 截图 | Canvas 2D 纯手绘 |
| QR 码 | qrcode.react 组件 | 自写 qrCanvas.ts（Version 1-6） |
| PWA 特性 | Service Worker + Manifest + Install Prompt | 无 |

---

## 二、导航结构差异

### 2.1 底部 Tab 栏

两端 Tab 栏设计已统一，顺序和布局完全一致。

| 维度 | PWA | 小程序 |
|------|-----|--------|
| Tab 数量 | 5 | 5 |
| Tab 布局 | 浮动圆角毛玻璃条（fixed bottom + 圆角 + backdrop-blur） | 浮动圆角毛玻璃条（fixed bottom + 圆角 + backdrop-filter） |
| 首页 Tab | 居中，圆形暖色背景突出（`bg-[#D99B7A]` + `rotate-12`） | 居中，圆形暖色背景突出（`margin-top: -24rpx` + 圆形 + `#EFD9CB`） |
| 非活跃 Tab | 文字隐藏，仅图标 | 文字隐藏（`opacity: 0`），仅图标 |
| 活跃指示 | 底部圆点 + 图标放大 + 文字显示 | 底部圆点 + 图标放大 + 文字显示 |
| 首页特殊背景 | `bg-white/20 backdrop-blur-lg`（半透明） | `rgba(255,255,255,0.38) + backdrop-filter:blur`（半透明） |
| Tab 切换动画 | motion/react（opacity/zIndex/scale 过渡） | CSS transition |
| Tab 状态保持 | IndexedStack 模式（已访问 Tab 保持挂载） | 小程序原生页面栈保持 |
| Tab 预加载 | 首次挂载后微任务预取所有 Tab chunk | 小程序预加载机制 |

**Tab 顺序（两端一致）**：

| 位置 | Tab | PWA 路径 | 小程序路径 |
|------|-----|---------|-----------|
| 左1 | 📖 日志 | `/diary` | `pages/diary/index` |
| 左2 | ✉️ 时光 | `/time-letters` | `pages/time-letters/index` |
| 中 | 🏠 首页（突出样式） | `/` | `pages/home/index` |
| 右1 | ⭐ 积分 | `/points` | `pages/points/index` |
| 右2 | 👤 Miao/我的 | `/profile` | `pages/profile/index` |

> **结论**：两端 Tab 栏已完全对齐——5 Tab 顺序一致、首页居中突出、浮动毛玻璃设计、非活跃文字隐藏。差异仅在实现层：PWA 用 motion/react 动画 + IndexedStack 状态保持，小程序用 CSS transition + 原生页面栈。

### 2.2 页面栈管理

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 导航 API | `useNavigate()` / `<Link>` | `Taro.navigateTo()` / `navigateBack()` |
| 页面栈 | 浏览器 history（无限深） | 小程序页面栈（最多 10 层） |
| 返回行为 | 浏览器后退 | `navigateBack()` 或物理返回 |
| 深度链接 | `miao://` 自定义协议 + URL query | 小程序路径参数 + `onLoad(options)` |

---

## 三、页面级差异

### 3.1 页面清单对比

| 功能 | PWA 页面 | 小程序页面 | 差异说明 |
|------|---------|-----------|---------|
| 启动页 | `Welcome.tsx` | `welcome/index` | 相同 |
| 登录 | `Login.tsx` | `login/index` | 见 3.2 |
| 注册 | `Register.tsx` | `register/index` | 相同 |
| 重置密码 | `ResetPassword.tsx` | `reset-password/index` | 小程序 Mock 验证码，PWA 无短信 |
| 首页 | `Home.tsx` | `home/index` | 见 3.3 |
| 日记 | `Diary.tsx` | `diary/index` | 见 3.4 |
| 时光信件 | `TimeLetters.tsx` | `time-letters/index` | 见 3.5 |
| 积分 | `Points.tsx` | `points/index` | 见 3.6 |
| 个人中心 | `Profile.tsx` | `profile/index` | 见 3.7 |
| 通知列表 | `NotificationList.tsx` | `notification-list/index` | PWA 无通知设置页独立入口 |
| 通知设置 | `Notifications.tsx` | `notifications/index` | 小程序有独立通知开关页 |
| 编辑资料 | `EditProfile.tsx` | `edit-profile/index` | 小程序头像未上传服务端 |
| 修改密码 | `ChangePassword.tsx` | `change-password/index` | 相同 |
| 创建猫咪 | `CreateCompanion.tsx` | `create-companion/index` | 相同 |
| 上传素材 | `UploadMaterial.tsx` | `upload-material/index` | 相同 |
| 生成进度 | `GenerationProgress.tsx` | `generation-progress/index` | 小程序有后台竞态问题 |
| 猫咪播放 | `CatPlayer.tsx` | `cat-player/index` | 小程序"喜欢"按钮无效 |
| 猫咪历史 | `CatHistory.tsx` | `cat-history/index` | 相同 |
| 切换猫咪 | `SwitchCompanion.tsx` | `switch-companion/index` | 相同 |
| 里程碑 | `AccompanyMilestonePage.tsx` | `accompany-milestone/index` | 小程序日历跨月有 bug |
| 空猫引导 | `EmptyCatPage.tsx` | `empty-cat/index` | 相同 |
| 猫咪开始 | ❌ 无 | `cat-start/index` | 小程序独有，返回按钮实为登出 |
| 设置昵称 | ❌ 无 | `set-nickname/index` | 小程序独有，首次登录设昵称 |
| 好友二维码 | `AddFriendQR.tsx` | `add-friend-qr/index` | 小程序用原生 openType=share，PWA 用 Web Share API |
| 扫码加友 | `ScanFriend.tsx` | `scan-friend/index` | PWA 用浏览器摄像头，小程序用 wx.scanCode |
| 加入好友 | `ScanFriend.tsx`（同页面） | `join-friend/index` | 小程序独立页面 |
| 反馈 | `Feedback.tsx` | `feedback/index` | 两端数据均未提交服务端 |
| 下载引导 | `Download.tsx` | `download/index` | PWA 完整（平台检测+安装引导），小程序按钮无功能 |
| 隐私政策 | `PrivacyPolicy.tsx` | `privacy-policy/index` | 相同 |
| 服务条款 | `TermsOfService.tsx` | `terms-of-service/index` | 相同 |
| 隐私设置 | ❌ 无 | `privacy-settings/index` | 小程序独有，缓存清理入口 |
| 管理员设置 | `AdminSettings.tsx` | `admin-settings/index` | 小程序 5 点击隐藏入口 |
| PWA 安装提示 | `InstallPromptBanner.tsx` | ❌ 无 | PWA 独有 |
| 调试面板 | `FloatingDebugPanel.tsx` | ❌ 无 | PWA 独有，浮动面板 |

**页面数量**：PWA ~22 页，小程序 32 页。小程序多出 `cat-start`、`set-nickname`、`join-friend`、`privacy-settings` 四个独立页面。

### 3.2 登录页差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 密码登录 | ✅ | ✅ |
| 微信登录 | Mock 模式（无 open-id，自动生成 mock 用户） | 真实 wx.login + code2session |
| 手机号登录 | Mock 模式（跳过验证） | 真实 getPhoneNumber + 服务端验证 |
| 注册入口 | 页面内链接跳转 `/register` | 页面内链接跳转 |
| UI 布局 | Tailwind 居中卡片 | Less 布局，圆角输入框 |
| 错误提示 | 内联文字 | Taro.showToast |

### 3.3 首页差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 视频播放 | HTML5 `<video>` | 小程序 `<video>` 组件 |
| 手势交互 | 浏览器 Touch 事件 | 小程序 Touch 事件 |
| 点击延迟 | 无 | 300ms（区分双击） |
| 毛玻璃气泡 | FrostedGlassBubble + CSS backdrop-filter | FrostedGlassBubble + CSS backdrop-filter |
| 猫咪动作解锁 | idle→tail/rubbing/blink | idle→tail/rubbing/blink |
| 视频状态恢复 | 页面切回时自动恢复 | useDidHide 设 error 后不自动恢复 |

### 3.4 日记页差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 列表容器 | 普通滚动（div overflow-y） | ScrollView（refresherEnabled 下拉刷新） |
| Tab 切换 | CSS 状态切换 | CSS 状态切换 + 滑动动画 |
| 点赞机制 | 乐观更新 + 服务端确认 | 乐观更新 + 服务端确认 + 回滚 |
| 评论输入 | 底部弹窗输入 | 行内发送 + keyboard confirmType |
| 评论长按 | 浏览器原生 contextmenu | 自定义浮动气泡菜单 |
| 删除评论 | 服务端 API 调用 | 服务端 API 调用 + 好友同步 |
| 分享微信好友 | Web Share API（降级剪贴板） | useShareAppMessage 原生 |
| 分享朋友圈 | html2canvas 截图 + 下载 | Canvas 2D 手绘 9:16 分享卡 + showShareImageMenu |
| 媒体存储 | IndexedDB | IndexedDB + FileSystem + base64 降级 |
| 好友动态同步 | 1 分钟轮询 | 1 分钟轮询 + 手动刷新触发 |
| 评论后刷新 | 整页重新渲染 | scrollTop 重置修复 |

### 3.5 时光信件差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 写信 UI | Tailwind 模态框 | Less 底部弹窗 |
| 封存天数 | 1/3/7/30/100 天选项 | 1/3/7/30/100 天选项 |
| 强制解锁 | 无 | 长按可强制解锁（不可逆） |
| 调试快进 | 无 | 5 点击标题开启 60x 时间加速 |
| 服务端解锁 | 未强制（返回全部内容） | 未强制（返回全部内容） |
| 猫咪过滤 | 无 | 横向滑动选择 |

### 3.6 积分页差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 签到 | ✅ | ✅ |
| 互动奖励 | ✅ | ✅ |
| 在线时长 | ✅ | ✅（60s 间隔） |
| 兑换猫咪 | ✅ | ✅ |
| 调试模式 | FloatingDebugPanel 浮动按钮 | 5 点击标题 + 底部可见入口 |
| 历史记录 | ✅ | ✅（最多 50 条） |

### 3.7 个人中心差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 好友列表 | Profile 页内展示 | Profile 页内展示 |
| 头像修改 | 本地 + 服务端同步 | 本地路径未上传服务端 |
| 陪伴天数 | 简单展示 | 日历展示（accompany-milestone） |
| 缓存清理 | ❌ 无入口 | privacy-settings 页面 |
| 注销账户 | 清除本地数据 | 清除本地数据（按钮文字"注销账户"但未调服务端） |
| 管理员入口 | Profile 内链接 | 5 点击标题隐藏入口 |

---

## 四、UI 设计差异

### 4.1 设计语言

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 主色调 | `#E89F71`（暖橙）+ `#633E1D`（深棕） | `#E89F71` + `#633E1D`（一致） |
| 背景色 | `#FFF9F5` 渐变 | `#FFF9F5` 渐变（一致） |
| 圆角 | Tailwind `rounded-3xl`（24px）| Less `36rpx`/`44rpx`/`48rpx` 混用 |
| 阴影 | Tailwind `shadow-lg` | 多种阴影值混用 |
| 字体 | 系统字体栈 | 系统字体 |
| 图标体系 | Lucide React（统一 SVG） | PNG 图片 + Unicode Emoji（46 个 Icons 组件） |
| 毛玻璃 | CSS `backdrop-blur` | CSS `backdrop-filter` |

### 4.2 组件设计差异

#### ShareSheet

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 微信好友 | Web Share API / 剪贴板降级 | `useShareAppMessage` 原生 |
| 朋友圈 | html2canvas 截图 → 下载图片 | Canvas 2D 生成 9:16 卡 → `showShareImageMenu` |
| 分享卡生成 | html2canvas（DOM 截图） | Canvas 2D 纯手绘 |
| 分享卡内容 | PosterTemplate 组件渲染 | 品牌 Header + 大图 + 文字 + QR footer |
| 图标风格 | Lucide 图标 + 文字 | 扁平化官方微信/朋友圈图标（#07C160） |

#### DiaryCard

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 卡片圆角 | Tailwind rounded | `36rpx` |
| 降级头像 | 无 | `api.dicebear.com` 外部依赖 |
| 点赞动画 | 无 | 无 |
| 媒体展示 | `<img>` / `<video>` | `<Image>` / `<Video>` 组件 |

#### CommentInput

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 输入方式 | 底部弹窗 | 行内输入 + confirmType="send" |
| 字数限制 | 无 | 500 字 |
| 发送按钮 | Tailwind 渐变圆按钮 | Less 渐变圆按钮 |
| 键盘适配 | 浏览器原生 | adjustPosition + safe-area |

#### PageHeader

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 返回按钮 | Lucide ArrowLeft | PNG 箭头图标 |
| 标题 | 居中文字 | 居中文字 |
| 右侧操作 | 可配置 | 可配置 |

#### FrostedGlassBubble

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 实现 | CSS backdrop-blur + 动画 | CSS backdrop-filter + 动画 |
| bubbleId prop | ✅ 使用 | ✅ 声明但未使用 |

### 4.3 动效差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 页面切换 | motion/react 过渡动画 | 原生页面切换 |
| Tab 切换 | opacity/scale/zIndex 过渡 | CSS animation tabFadeIn |
| 列表项 | 无 | slideInRight/slideInLeft 动画 |
| 弹窗 | motion/react 弹出 | CSS transition |
| 下拉刷新 | 无原生效果 | ScrollView refresherEnabled |
| 安装提示 | 滑入 Banner | 无 |

---

## 五、功能实现差异

### 5.1 认证体系

| 功能 | PWA | 小程序 | 差异 |
|------|-----|--------|------|
| 密码登录 | ✅ 真实 | ✅ 真实 | 一致 |
| 微信登录 | ⚠️ Mock 模式 | ✅ 真实 | **PWA 无微信 SDK，降级为 Mock** |
| 手机号登录 | ⚠️ Mock 模式 | ✅ 真实 | **PWA 无法调用微信手机号 API** |
| 密码存储 | 明文 localStorage | 明文 SyncStorage | **两端均明文，同样不安全** |
| 重置密码 | 无短信验证 | Mock 验证码弹窗 | **两端均无真实短信** |
| 注销账户 | 仅清本地 | 仅清本地（文字误导） | **两端均未调服务端删除** |

### 5.2 猫咪系统

| 功能 | PWA | 小程序 | 差异 |
|------|-----|--------|------|
| AI 创建 | ✅ | ✅ | 一致 |
| 上传照片 | ✅ | ✅ | 一致 |
| 视频播放 | HTML5 Video | 小程序 Video | 播放器实现不同 |
| 手势交互 | ✅ | ✅ | 一致 |
| 多猫切换 | ✅ | ✅ | 一致 |
| 视频缓存 | Service Worker 缓存（50MB 上限） | FileSystem 存储 | **缓存策略不同** |
| 生成竞态 | 无（页面不卸载） | reLaunch 后组件卸载 | **小程序有竞态 bug** |

### 5.3 日记系统

| 功能 | PWA | 小程序 | 差异 |
|------|-----|--------|------|
| 发布日记 | ✅ | ✅ | 一致 |
| 点赞 | ✅ | ✅ 乐观+回滚 | **小程序有回滚机制，PWA 无** |
| 评论 | ✅ | ✅ | 一致 |
| 删除评论 | ✅ 服务端 API | ✅ 服务端 API + 好友同步 | **小程序额外同步好友** |
| 分享好友 | Web Share API | useShareAppMessage | **实现方式完全不同** |
| 分享朋友圈 | html2canvas 截图 | Canvas 2D 手绘 | **实现方式完全不同** |
| 媒体存储 | IndexedDB | IndexedDB + FileSystem + base64 | **小程序有三层降级** |
| 下拉刷新 | 无 | ScrollView refresherEnabled | **PWA 缺少下拉刷新** |

### 5.4 好友系统

| 功能 | PWA | 小程序 | 差异 |
|------|-----|--------|------|
| 扫码加友 | 浏览器摄像头 API | wx.scanCode | **实现方式不同** |
| 生成二维码 | qrcode.react 组件 | 自写 qrCanvas.ts | **库 vs 手写** |
| 分享邀请 | Web Share API / 剪贴板 | openType="share" 原生 | **实现方式不同** |
| 深度链接 | `miao://` 协议 + URL query | 小程序路径参数 | **机制不同** |
| 好友动态 | 服务端轮询 | 服务端轮询 | 一致 |

### 5.5 通知系统

| 功能 | PWA | 小程序 | 差异 |
|------|-----|--------|------|
| 通知列表 | ✅ | ✅ | 一致 |
| 通知设置 | ❌ 无独立设置页 | ✅ 独立 notifications 页 | **PWA 缺少通知设置** |
| 推送 | ❌ 无 Web Push | ❌ 无模板消息 | **两端均无主动推送** |
| 未读角标 | ❌ 无 | ✅ Profile 显示数量 | **PWA 缺少未读提示** |

### 5.6 分享体系

| 功能 | PWA | 小程序 | 差异 |
|------|-----|--------|------|
| 微信好友 | Web Share API（降级剪贴板） | useShareAppMessage | **小程序原生体验远优于 PWA** |
| 朋友圈 | html2canvas 截图下载 | Canvas 2D + showShareImageMenu | **小程序可直达朋友圈，PWA 需手动保存** |
| 分享卡 | PosterTemplate + html2canvas | Canvas 2D 纯手绘 9:16 | **PWA 截图质量依赖浏览器，小程序精确控制** |
| QR 码 | qrcode.react（成熟库） | qrCanvas.ts（Version 1-6 限制） | **PWA 更健壮** |
| 朋友圈 onShareTimeline | ❌ 不适用 | ✅ useShareTimeline | **小程序独有** |

---

## 六、数据与同步架构差异

### 6.1 存储架构

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 结构化数据 | localStorage | Taro.getStorageSync |
| 媒体文件 | IndexedDB | IndexedDB + FileSystem + base64 |
| 离线缓存 | Service Worker | 小程序包缓存 |
| 存储上限 | ~5MB localStorage / 无限 IndexedDB | 10MB SyncStorage / 无限 FileSystem |

### 6.2 同步机制

| 维度 | PWA | 小程序 |
|------|-----|--------|
| 增量同步 | 直接服务端 POST | syncQueue（5s 防抖 + 3 次重试）|
| 全量同步 | App 启动时服务端拉取 | syncManager.syncAll()（30s 冷却）|
| 合并策略 | 服务端覆盖本地 | ID 匹配 + 时间戳决胜 |
| 离线支持 | Service Worker 缓存 API 响应 | 本地存储 + 上线后同步 |
| 冲突处理 | 后写覆盖 | 智能合并（likes/comments 服务端优先） |

### 6.3 API 调用差异

| 维度 | PWA | 小程序 |
|------|-----|--------|
| HTTP 客户端 | axios | Taro.request（httpAdapter） |
| 请求拦截 | axios interceptor | httpAdapter 拦截器 |
| 响应字段 | `res.data` | `res.data`（Web 分支为 `res.responseData`） |
| 错误处理 | axios 统一 | httpAdapter 分平台 |
| 认证头 | axios defaults.headers | httpAdapter 自动注入 |

---

## 七、PWA 独有特性

| 特性 | 说明 |
|------|------|
| Service Worker | 缓存策略：CDN 媒体 cache-first、API network-first、Vite 资源 cache-first |
| Range 请求 | SW 支持 206 Partial Content，视频可拖动播放 |
| 自动更新 | SW updatefound → 自动 reload（sessionStorage 防循环） |
| Install Prompt | `beforeinstallprompt` 拦截 → Banner 引导安装 |
| Download 页 | 平台检测 + QR 码 + 安装步骤引导 + 已安装检测 |
| Web App Manifest | standalone 模式、暖色主题、512x512 图标 |
| 深度链接 | `miao://` 自定义协议 + `registerProtocolHandler` |
| 浮动调试面板 | FloatingDebugPanel（积分充值、状态重置） |
| Tab 预加载 | 首次挂载后微任务预取所有 Tab chunk |
| IndexedStack | 已访问 Tab 保持挂载，切换不重新渲染 |
| 手势禁用 | 禁用 pinch-zoom / double-tap-zoom |

---

## 八、小程序独有特性

| 特性 | 说明 |
|------|------|
| 微信登录 | wx.login + code2session 真实流程 |
| 手机号登录 | getPhoneNumber + 服务端验证 |
| 原生分享 | useShareAppMessage / useShareTimeline |
| 朋友圈直达 | Canvas 生成分享卡 + showShareImageMenu |
| 扫码 | wx.scanCode 原生扫码 |
| 下拉刷新 | ScrollView refresherEnabled |
| 隐私设置页 | 独立缓存清理入口 |
| 设置昵称页 | 首次登录引导设昵称 |
| 猫咪开始页 | 无猫到有猫的过渡引导 |
| 加入好友页 | 独立深度链接落地页 |
| 调试快进 | 积分/时光信件 5 点击隐藏入口 |
| 300ms 点击延迟 | 区分单击/双击的手势检测 |

---

## 九、两端共性问题

| 问题 | PWA | 小程序 |
|------|-----|--------|
| 明文密码存储 | localStorage 明文 | SyncStorage 明文 |
| 无真实短信验证 | 无重置密码功能 | Mock 验证码弹窗 |
| 注销未调服务端 | 仅清本地 | 仅清本地（文字误导） |
| 反馈未提交服务端 | 数据随组件卸载 | 数据随组件卸载 |
| 时光信件服务端未强制解锁 | 返回全部内容 | 返回全部内容 |
| 头像上传问题 | 本地路径 | 本地路径未上传 |
| 下载页功能缺失 | — | 按钮无 onClick |
| 颜色/圆角/阴影不统一 | Tailwind 值分散 | Less 硬编码值混用 |

---

## 十、统一化建议

### 10.1 优先统一项（高影响低成本）

| 项目 | 建议 | 理由 |
|------|------|------|
| 图标体系 | PWA Lucide 已统一，小程序迁移到 SVG 图标 | 减少 PNG 资源体积，提升一致性 |
| 颜色令牌 | 定义 `--primary`、`--bg`、`--text` 等设计令牌，两端统一引用 | 消除硬编码色值 |
| 圆角令牌 | 定义 `--radius-sm/md/lg/xl`，PWA 用 Tailwind preset，小程序用 Less 变量 | 消除 24px/36rpx/44rpx/48rpx 混用 |
| API 响应格式 | 统一为 `{ error, code, data }` | 消除 P0-5 httpAdapter 字段名不一致 |

### 10.2 功能补齐项（高影响中成本）

| 项目 | 缺失端 | 建议 |
|------|--------|------|
| 下拉刷新 | PWA | 添加 pull-to-refresh 组件 |
| 通知设置页 | PWA | 新增通知开关页面 |
| 未读角标 | PWA | Profile 页显示未读数 |
| 时光信件猫咪过滤 | PWA | 添加横向滑动猫咪选择 |
| 下载页功能 | 小程序 | 接入实际 App Store 链接或隐藏 |
| 头像上传 | 两端 | 统一走 `uploadFile` + 服务端 URL |

### 10.3 架构统一项（高影响高成本）

| 项目 | 现状 | 建议 |
|------|------|------|
| 同步架构 | PWA 直接 POST，小程序 syncQueue | 统一为 syncQueue 模式（防抖+重试+离线队列） |
| 媒体存储 | PWA IndexedDB，小程序三层降级 | 统一为 IndexedDB + 服务端 URL |
| 分享卡生成 | PWA html2canvas，小程序 Canvas 2D | 统一为服务端渲染分享卡，或两端均用 Canvas |
| 密码存储 | 两端明文 | 统一走服务端验证，本地不存密码 |
| QR 码 | PWA 用库，小程序手写 | 统一使用成熟 QR 库 |

### 10.4 长期演进项

| 方向 | 建议 |
|------|------|
| 跨端统一 | 考虑 Taro 跨端输出 H5（替代当前独立 PWA），减少双端维护成本 |
| 状态管理 | 引入 Zustand/Jotai 替代 Context，两端共享状态逻辑 |
| 组件库 | 抽取共享 UI 组件为独立包，两端按平台适配 |
| 国际化 | 两端统一 i18n 方案 |
| 测试 | 两端共享 API mock + 集成测试 |