# Miao PWA 全方位分析报告

> 扫描日期：2026-05-04
> 仓库：Miao_remote（PWA 前端 + Express 后端）
> 技术栈：React + TypeScript + Vite + Express + JSON 文件存储

---

## 一、应用功能全景

### 1.1 用户体系

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 用户名密码注册 | `Register.tsx` | 创建账户，设置昵称 |
| 用户名密码登录 | `Login.tsx` | 传统登录方式 |
| 微信登录 | `Login.tsx` | 小程序 code 换 openid，PWA 端 mock 模式 |
| 手机号快捷登录 | `Login.tsx` | 微信 getPhoneNumber API |
| 修改密码 | `ChangePassword.tsx` | 需验证旧密码（已有密码时） |
| 重置密码 | `ResetPassword.tsx` | 忘记密码场景 |
| 个人资料编辑 | `EditProfile.tsx` | 修改昵称、头像 |
| 用户资料查看 | `Profile.tsx` | 个人中心页 |

### 1.2 猫咪伴侣系统

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 猫咪创建（预设） | `CreateCompanion.tsx` | 从预设模板生成猫咪 |
| 猫咪创建（上传） | `UploadMaterial.tsx` | 上传照片生成猫咪 |
| AI 生成进度 | `GenerationProgress.tsx` | 图片→视频生成流程 |
| 猫咪播放器 | `CatPlayer.tsx` | 播放猫咪视频动画 |
| 猫咪历史 | `CatHistory.tsx` | 查看生成历史 |
| 切换猫咪 | `SwitchCompanion.tsx` | 多猫咪切换 |
| 陪伴里程碑 | `AccompanyMilestonePage.tsx` | 互动里程碑记录 |
| 空猫咪引导 | `EmptyCatPage.tsx` | 首次无猫引导页 |
| 管理员预设配置 | `AdminPresetConfig.tsx` | 管理猫咪预设模板 |

### 1.3 日记系统

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 日记列表（我的/好友） | `Diary.tsx` | 双 Tab 切换 |
| 日记卡片 | `DiaryCard.tsx` | 日记展示卡片 |
| 日记发布 | `Diary.tsx`（compose） | 支持文字+图片/视频 |
| 日记点赞 | `Diary.tsx` | 乐观更新+服务端同步 |
| 日记评论 | `Diary.tsx` + `CommentInput.tsx` + `CommentItem.tsx` | 评论添加/展示/删除 |
| 日记删除 | `Diary.tsx` | 确认弹窗+服务端同步 |
| 日记分享 | `ShareSheet.tsx` + `PosterTemplate.tsx` | 微信好友/朋友圈分享 |

### 1.4 好友系统

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 好友邀请码生成 | `AddFriendQR.tsx` | 生成邀请码+二维码 |
| 扫码添加好友 | `ScanFriend.tsx` | 扫描二维码添加 |
| 好友列表 | `Profile.tsx` | 好友管理 |
| 好友动态 Feed | `Diary.tsx`（好友 Tab） | 查看好友日记 |
| Mock 好友 | `mockFriendService.ts` | 开发模式模拟好友 |

### 1.5 时光信件系统

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 信件列表 | `TimeLetters.tsx` | 时光信件管理 |
| 信件创建 | `TimeLetters.tsx` | 写给未来的自己和猫咪 |
| 信件解锁 | `TimeLetters.tsx` | 到达 unlockAt 时间后可查看 |

### 1.6 积分系统

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 积分中心 | `Points.tsx` | 积分查看和兑换 |
| 积分获取 | 多处触发 | 互动、签到等获取积分 |

### 1.7 通知系统

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 通知列表 | `Notifications.tsx` | 系统通知 |
| 通知详情 | `NotificationList.tsx` | 通知详情页 |
| 好友分享通知 | 服务端推送 | 好友分享日记时通知 |

### 1.8 其他功能

| 功能 | 页面/组件 | 说明 |
|------|----------|------|
| 欢迎页 | `Welcome.tsx` | App 启动欢迎/引导 |
| 下载页 | `Download.tsx` | App 下载引导 |
| 隐私政策 | `PrivacyPolicy.tsx` | 法律合规 |
| 服务条款 | `TermsOfService.tsx` | 法律合规 |
| 反馈 | `Feedback.tsx` | 用户反馈入口 |
| 管理员设置 | `AdminSettings.tsx` | 后台管理 |
| PWA 安装提示 | `InstallPromptBanner.tsx` | 引导用户安装 PWA |
| 调试面板 | `FloatingDebugPanel.tsx` | 开发调试 |
| 启动画面 | `SplashScreen.tsx` | App 启动动画 |
| 私信分享 | `PrivateMessageShare.tsx` | 私信分享卡片 |

---

## 二、后端 API 全景

### 2.1 认证 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | 无 | 注册（返回 JWT） |
| POST | `/api/v1/auth/password-login` | 无 | 密码登录 |
| POST | `/api/v1/auth/wechat-login` | 无 | 微信登录 |
| POST | `/api/v1/auth/phone-login` | 无 | 手机号登录 |
| POST | `/api/v1/auth/set-password` | authRequired | 设置/修改密码 |

### 2.2 用户 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/v1/me` | authRequired | 获取当前用户 |
| PATCH | `/api/v1/me` | authRequired | 更新昵称/头像 |

### 2.3 猫咪 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/v1/cats` | authRequired | 获取猫咪列表 |
| POST | `/api/v1/cats` | authRequired | 创建/更新猫咪 |
| DELETE | `/api/v1/cats/:catId` | authRequired | 删除猫咪 |
| DELETE | `/api/v1/cats` | authRequired | 删除所有猫咪 |

### 2.4 日记 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/v1/diaries` | authRequired | 获取日记（含 likes/comments） |
| POST | `/api/v1/diaries` | authRequired | 创建/更新日记 |
| DELETE | `/api/v1/diaries/:diaryId` | authRequired | 删除日记 |
| POST | `/api/v1/diaries/:diaryId/like` | authRequired | 点赞/取消点赞 |
| POST | `/api/v1/diaries/:diaryId/comments` | authRequired | 添加评论 |
| DELETE | `/api/v1/diaries/:diaryId/comments/:commentId` | authRequired | 删除评论 |

### 2.5 时光信件 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/v1/letters` | authRequired | 获取信件列表 |
| POST | `/api/v1/letters` | authRequired | 创建/更新信件 |
| DELETE | `/api/v1/letters/:letterId` | authRequired | 删除信件 |

### 2.6 积分 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/v1/points` | authRequired | 获取积分 |
| POST | `/api/v1/points` | authRequired | 创建/更新积分 |

### 2.7 好友 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/friend-invites` | authRequired | 创建邀请码 |
| GET | `/api/v1/friend-invites/:code` | authRequired | 查询邀请码 |
| POST | `/api/v1/friends/accept` | authRequired | 接受好友邀请 |
| GET | `/api/v1/friends` | authRequired | 获取好友列表 |
| GET | `/api/v1/friends/diaries` | authRequired | 获取好友动态 Feed |

### 2.8 通知 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/v1/notifications` | authRequired | 获取通知列表 |
| POST | `/api/v1/notifications` | authRequired | 发送通知 |
| PUT | `/api/v1/notifications/:id/read` | authRequired | 标记已读 |
| PUT | `/api/v1/notifications/read-all` | authRequired | 全部标记已读 |

### 2.9 AI 生成 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/ai/tasks` | authRequired | 提交 AI 任务 |
| POST | `/api/v1/ai/tasks-file` | authRequired | 提交 AI 任务（含文件上传） |
| GET | `/api/v1/ai/tasks/:taskId` | authRequired | 轮询任务状态 |
| POST | `/api/v1/assets/persist-video` | authRequired | 持久化视频到磁盘 |

### 2.10 Legacy 无认证 API（安全风险）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（无 JWT） |
| POST | `/api/auth/login` | 登录（无 JWT） |
| GET/POST/DELETE | `/api/cats/:userId[/...]` | 猫咪 CRUD（无认证） |
| GET/POST/DELETE | `/api/diaries/:userId[/...]` | 日记 CRUD（无认证） |
| GET/POST/DELETE | `/api/letters/:userId[/...]` | 信件 CRUD（无认证） |
| GET/POST | `/api/points/:userId[/...]` | 积分 CRUD（无认证） |
| POST | `/api/ai/generate-image` | AI 图片生成（无认证） |
| POST | `/api/ai/generate-video` | AI 视频生成（无认证） |
| GET | `/api/proxy-resource` | 开放 CORS 代理（无认证） |
| POST | `/api/persist-video` | 下载视频到磁盘（无认证） |

---

## 三、数据存储

### 3.1 JSON 文件存储

| 文件 | 数据类型 | 说明 |
|------|---------|------|
| `users.json` | `ServerUser[]` | 用户账户（含明文密码） |
| `cats.json` | `ServerCat[]` | 猫咪数据 |
| `diaries.json` | `ServerDiary[]` | 日记数据 |
| `diary-likes.json` | `Record<diaryId, userId[]>` | 点赞关系 |
| `diary-comments.json` | `Record<diaryId, ServerComment[]>` | 评论数据 |
| `letters.json` | `ServerLetter[]` | 时光信件 |
| `points.json` | `ServerPoints[]` | 积分数据 |
| `friends.json` | `ServerFriend[]` | 好友关系 |
| `friend-invites.json` | `ServerFriendInvite[]` | 邀请码 |
| `notifications.json` | `ServerNotification[]` | 通知 |

### 3.2 文件系统存储

| 目录 | 说明 |
|------|------|
| `uploads/videos/{catId}/` | AI 生成的猫咪视频 MP4 |

### 3.3 内存存储

| 变量 | 说明 |
|------|------|
| `tempFiles` Map | 临时文件缓冲（有过期清理） |
| `accessTokenCache` | 微信 access_token 缓存 |

---

## 四、AI 集成

### 4.1 双 Provider 架构

| Provider | 图片模型 | 视频模型 | 配置变量前缀 |
|----------|---------|---------|------------|
| DashScope（阿里灵积） | `qwen-image-2.0` | `wan2.2-kf2v-flash` | `DASHSCOPE_*` |
| Volcengine（火山引擎） | `doubao-seedream-4-5-251128` | `doubao-seedance-1-5-pro-251215` | `VOLC_*` |

### 4.2 生成流程

```
用户上传照片 → 服务端提交 AI 任务 → 返回 taskId
  → 客户端轮询 /api/v1/ai/tasks/:taskId
  → AI 完成后返回图片/视频 URL
  → 客户端调用 persist-video 持久化到服务端磁盘
```

### 4.3 前端 AI 服务

| 文件 | 职责 |
|------|------|
| `services/ai/aiConfig.ts` | AI Provider 配置 |
| `services/ai/aiClient.ts` | AI API 客户端 |
| `services/ai/actionPrompts.ts` | 动作提示词模板 |
| `services/ai/types.ts` | AI 类型定义 |
| `services/volcanoService.ts` | 火山引擎视频服务 |
| `services/fileManager.ts` | 文件管理 |
| `services/mediaStorage.ts` | 媒体存储 |

---

## 五、问题扫描与修复方案

### 🔴 P0 — 严重安全问题

#### 5.1 明文密码存储

**问题**：`users.json` 中密码以明文存储，`u.password === password` 做比较（时序攻击可探测）。

**影响**：数据文件泄露即暴露全部用户密码。

**修复方案**：
```ts
// 注册时使用 bcrypt 哈希
import bcrypt from 'bcryptjs';
const hashed = await bcrypt.hash(password, 12);
// 存储 hashed 而非 password

// 登录时使用 bcrypt 比较
const match = await bcrypt.compare(password, u.password);
```

**优先级**：立即修复

---

#### 5.2 Legacy API 无认证

**问题**：所有 `/api/cats/:userId`、`/api/diaries/:userId`、`/api/letters/:userId`、`/api/points/:userId` 路由无任何认证，任何人知道用户名即可读写删除数据。

**影响**：用户数据可被任意篡改、删除。

**修复方案**：
1. 所有 Legacy 路由添加 `authRequired` 中间件
2. 或在路由注册前统一拦截：`app.use('/api/cats', authRequired)`
3. 长期：标记 Legacy 路由为 deprecated，客户端统一迁移到 `/api/v1/`

**优先级**：立即修复

---

#### 5.3 开放 CORS 代理（SSRF）

**问题**：`/api/proxy-resource?url=` 可代理任意 URL，包括 `http://169.254.169.254/`（云元数据）、`http://localhost:*` 等内部服务。

**影响**：攻击者可探测内网、窃取云凭证。

**修复方案**：
```ts
// 添加 URL 白名单校验
const ALLOWED_PROXY_HOSTS = ['dashscope.aliyuncs.com', 'ark.cn-beijing.volces.com'];
const targetUrl = new URL(url);
if (!ALLOWED_PROXY_HOSTS.includes(targetUrl.hostname)) {
  return res.status(403).json({ error: 'Host not allowed' });
}
// 阻止内网地址
if (targetUrl.hostname === 'localhost' || targetUrl.hostname.startsWith('127.') || 
    targetUrl.hostname.startsWith('10.') || targetUrl.hostname.startsWith('172.') ||
    targetUrl.hostname.startsWith('192.168.') || targetUrl.hostname === '169.254.169.254') {
  return res.status(403).json({ error: 'Private network not allowed' });
}
```

**优先级**：立即修复

---

#### 5.4 默认 JWT Secret

**问题**：`JWT_SECRET` 未设置时回退到 `"miao-dev-secret-change-me"`，攻击者可伪造任意用户 Token。

**修复方案**：
```ts
// 启动时强制检查
if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
  console.error('FATAL: JWT_SECRET or SESSION_SECRET must be set in production');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
```

**优先级**：立即修复

---

#### 5.5 AI 端点无认证

**问题**：`/api/ai/generate-image`、`/api/ai/generate-video` 无需登录即可调用，可无限消耗 API 额度。

**修复方案**：添加 `authRequired` 中间件 + 调用频率限制。

**优先级**：立即修复

---

### 🟠 P1 — 数据一致性问题

#### 5.6 并发读写竞态条件

**问题**：所有 read-modify-write 操作（注册、CRUD 等）非原子性。并发请求会导致后写覆盖先写，造成数据丢失。

**影响**：多用户同时操作时数据可能丢失。

**修复方案**：
```ts
// 方案 A：文件级锁
import { lock } from 'proper-lockfile';
const release = await lock(dataFilePath);
try {
  const data = readJSON(filePath);
  // ... modify ...
  writeJSON(filePath, data);
} finally {
  await release();
}

// 方案 B：迁移到 SQLite / Redis（长期）
```

**优先级**：高

---

#### 5.7 日记 likes/isLiked 字段与 diary-likes.json 脱节

**问题**：`ServerDiary` 模型中 `likes: number` 和 `isLiked: boolean` 是存储在 `diaries.json` 中的静态值，与 `diary-likes.json` 中的实际点赞数据会逐渐脱节。只有 V1 GET 端点通过 `enrichDiariesWithInteractions()` 修正，其他端点（POST/legacy）直接读写模型中的旧值。

**修复方案**：
1. 从 `ServerDiary` 接口中移除 `likes` 和 `isLiked` 字段
2. 所有读取日记的地方统一走 `enrichDiariesWithInteractions()`
3. 或在 POST/update 时也调用 enrichment 函数同步

**优先级**：高

---

#### 5.8 时光信件服务端未强制解锁

**问题**：`ServerLetter` 有 `unlockAt` 字段，但 GET `/api/v1/letters` 返回所有信件内容，不检查 `Date.now() >= unlockAt`。解锁逻辑完全依赖客户端。

**修复方案**：
```ts
// 返回信件时，未到解锁时间的隐藏内容
const letters = rawLetters.map(l => {
  if (l.unlockAt && Date.now() < l.unlockAt) {
    return { ...l, content: '🔒 信件尚未到解锁时间', locked: true };
  }
  return l;
});
```

**优先级**：中

---

### 🟡 P2 — 输入验证缺失

#### 5.9 用户名无验证

**问题**：注册时用户名无长度限制、无字符限制，可为空字符串或超长字符串。

**修复方案**：
```ts
if (!username || username.trim().length < 2 || username.trim().length > 20) {
  return res.status(400).json({ error: 'Username must be 2-20 characters' });
}
if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username.trim())) {
  return res.status(400).json({ error: 'Username contains invalid characters' });
}
```

---

#### 5.10 密码强度仅 set-password 校验

**问题**：注册端点不校验密码长度（1 位密码可通过），只有 `/api/v1/auth/set-password` 校验 6-20 位。

**修复方案**：注册端点也添加 `if (password.length < 6 || password.length > 20)` 校验。

---

#### 5.11 日记/信件/通知内容无长度限制

**问题**：`content` 字段无最大长度限制，客户端可提交超长字符串撑爆 JSON 文件。

**修复方案**：添加 `if (content.length > 5000)` 等长度校验。

---

#### 5.12 积分数据无 Schema

**问题**：`ServerPoints.data` 类型为 `any`，客户端可存储任意数据结构。`if (!data)` 判断错误——`0`、`false`、`""` 均为 falsy 但合法。

**修复方案**：
```ts
// 定义积分 Schema
interface PointsData {
  total: number;
  history: { amount: number; reason: string; timestamp: number }[];
  updatedAt?: number;
}
// 修复 falsy 检查
if (data === undefined || data === null) { ... }
```

---

### 🟢 P3 — 设计优化

#### 5.13 错误响应格式不一致

**问题**：V1 返回 `{ error, code }`，Legacy 返回 `{ error }`，AI 端点返回 `{ error, message, code, details }`，部分返回纯字符串。

**修复方案**：统一为 `{ error: string; code?: string; details?: any }` 格式。

---

#### 5.14 API Key 前缀泄露

**问题**：`apiKeyPrefix: ARK_API_KEY.substring(0, 10)` 在错误响应中暴露 API Key 前 10 位。

**修复方案**：移除或仅显示前 4 位 `substring(0, 4) + '***'`。

---

#### 5.15 全量 base64 图片日志

**问题**：`console.log("[Video] Request body:", JSON.stringify(requestBody))` 会打印完整 base64 图片数据，日志文件暴增。

**修复方案**：
```ts
const logBody = { ...requestBody };
if (logBody.image_base64) logBody.image_base64 = `[${logBody.image_base64.length} chars]`;
console.log("[Video] Request body:", JSON.stringify(logBody));
```

---

#### 5.16 未安装安全中间件

**问题**：无 `helmet`（安全头）、无 `cors`（跨域配置）、无 `express-rate-limit`（频率限制）、无 `compression`（压缩）。

**修复方案**：
```ts
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));
app.use(compression());
```

---

#### 5.17 writeJSON 无错误处理

**问题**：`fs.writeFileSync` 抛异常时，`uncaughtException` handler 会 `process.exit(1)`，磁盘满即服务崩溃。

**修复方案**：
```ts
function writeJSON(filePath: string,  any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
    throw err; // 让调用方处理
  }
}
```

---

#### 5.18 Legacy 和 V1 路由重复

**问题**：猫咪、日记、信件、积分都有两套路由（`/api/` 和 `/api/v1/`），写同一份 JSON 文件，行为不同，维护成本高。

**修复方案**：标记 Legacy 路由为 deprecated，设置 3 个月过渡期后移除。

---

#### 5.19 通知无频率限制

**问题**：任何认证用户可向任何其他用户发送无限量通知，存在骚扰风险。

**修复方案**：添加每人每分钟 5 条的频率限制。

---

#### 5.20 邀请码过期清理仅靠创建触发

**问题**：过期邀请码只在同一用户创建新邀请时清理，其他用户的过期邀请码不会被清理。

**修复方案**：添加定时任务每小时清理过期邀请码。

---

#### 5.21 tempFiles 内存无上限

**问题**：`tempFiles` Map 仅按过期时间清理，短时间大量上传可导致内存溢出。

**修复方案**：添加 `MAX_TEMP_FILES = 100` 上限，超出时拒绝新上传。

---

#### 5.22 JSON body 50MB 限制过大

**问题**：`express.json({ limit: '50mb' })` 允许 50MB JSON body，远超正常需求。

**修复方案**：降至 `1mb`，特殊端点（如含 base64 图片）单独设置更大限制。

---

## 六、前端组件与页面映射

```
src/
├── App.tsx                          # 路由配置 + 全局布局
├── main.tsx                         # 入口 + PWA 注册
├── context/
│   └── AuthContext.tsx               # 认证状态管理
├── hooks/
│   └── useAuth.ts                   # 认证 Hook
├── components/
│   ├── layout/MainLayout.tsx        # 主布局（含导航栏）
│   ├── PageHeader.tsx               # 通用页面头部
│   ├── PawLogo.tsx                  # 品牌 Logo
│   ├── SplashScreen.tsx             # 启动画面
│   ├── InstallPromptBanner.tsx      # PWA 安装提示
│   ├── FrostedGlassBubble.tsx       # 毛玻璃气泡
│   ├── DiaryCard.tsx                # 日记卡片
│   ├── CommentInput.tsx             # 评论输入
│   ├── CommentItem.tsx              # 评论项
│   ├── ShareSheet.tsx               # 分享面板
│   ├── PosterTemplate.tsx           # 分享海报模板
│   ├── PrivateMessageShare.tsx      # 私信分享
│   ├── AdminPresetConfig.tsx        # 管理员预设配置
│   ├── ErrorBoundary.tsx            # 错误边界
│   └── FloatingDebugPanel.tsx       # 调试面板
├── pages/
│   ├── Welcome.tsx                  # 欢迎页
│   ├── Login.tsx                    # 登录
│   ├── Register.tsx                 # 注册
│   ├── ResetPassword.tsx            # 重置密码
│   ├── ChangePassword.tsx           # 修改密码
│   ├── Home.tsx                     # 首页（猫咪播放器）
│   ├── Diary.tsx                    # 日记
│   ├── TimeLetters.tsx              # 时光信件
│   ├── Points.tsx                   # 积分
│   ├── Profile.tsx                  # 个人中心
│   ├── EditProfile.tsx              # 编辑资料
│   ├── Notifications.tsx            # 通知
│   ├── NotificationList.tsx         # 通知列表
│   ├── CreateCompanion.tsx          # 创建猫咪（预设）
│   ├── UploadMaterial.tsx           # 创建猫咪（上传）
│   ├── GenerationProgress.tsx       # AI 生成进度
│   ├── CatPlayer.tsx                # 猫咪播放器
│   ├── CatHistory.tsx               # 猫咪历史
│   ├── SwitchCompanion.tsx          # 切换猫咪
│   ├── AccompanyMilestonePage.tsx   # 陪伴里程碑
│   ├── EmptyCatPage.tsx             # 无猫引导
│   ├── AddFriendQR.tsx              # 添加好友
│   ├── ScanFriend.tsx               # 扫码加友
│   ├── AdminSettings.tsx            # 管理员设置
│   ├── Download.tsx                 # 下载页
│   ├── Feedback.tsx                 # 反馈
│   ├── PrivacyPolicy.tsx            # 隐私政策
│   └── TermsOfService.tsx           # 服务条款
└── services/
    ├── ai/aiConfig.ts               # AI 配置
    ├── ai/aiClient.ts               # AI 客户端
    ├── ai/actionPrompts.ts           # 动作提示词
    ├── ai/types.ts                  # AI 类型
    ├── catService.ts                # 猫咪服务
    ├── fileManager.ts               # 文件管理
    ├── friendService.ts             # 好友服务
    ├── mediaStorage.ts              # 媒体存储
    ├── mockFriendService.ts         # Mock 好友
    ├── shareService.ts              # 分享服务
    ├── storage.ts                   # 本地存储
    └── volcanoService.ts            # 火山引擎服务
```

---

## 七、修复优先级总览

| 优先级 | 编号 | 问题 | 工作量 |
|--------|------|------|--------|
| 🔴 P0 | 5.1 | 明文密码存储 | 中 |
| 🔴 P0 | 5.2 | Legacy API 无认证 | 小 |
| 🔴 P0 | 5.3 | 开放 SSRF 代理 | 小 |
| 🔴 P0 | 5.4 | 默认 JWT Secret | 小 |
| 🔴 P0 | 5.5 | AI 端点无认证 | 小 |
| 🟠 P1 | 5.6 | 并发读写竞态 | 大 |
| 🟠 P1 | 5.7 | likes/isLiked 脱节 | 中 |
| 🟠 P1 | 5.8 | 信件未强制解锁 | 小 |
| 🟡 P2 | 5.9 | 用户名无验证 | 小 |
| 🟡 P2 | 5.10 | 注册密码强度 | 小 |
| 🟡 P2 | 5.11 | 内容无长度限制 | 小 |
| 🟡 P2 | 5.12 | 积分 Schema 缺失 | 中 |
| 🟢 P3 | 5.13 | 错误格式不一致 | 中 |
| 🟢 P3 | 5.14 | API Key 前缀泄露 | 小 |
| 🟢 P3 | 5.15 | base64 图片日志 | 小 |
| 🟢 P3 | 5.16 | 缺少安全中间件 | 中 |
| 🟢 P3 | 5.17 | writeJSON 无错误处理 | 小 |
| 🟢 P3 | 5.18 | Legacy/V1 路由重复 | 大 |
| 🟢 P3 | 5.19 | 通知无频率限制 | 小 |
| 🟢 P3 | 5.20 | 邀请码清理机制 | 小 |
| 🟢 P3 | 5.21 | tempFiles 无上限 | 小 |
| 🟢 P3 | 5.22 | JSON body 50MB | 小 |