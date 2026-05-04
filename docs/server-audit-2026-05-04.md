# server.ts 代码审查报告

**审查日期：** 2026-05-04  
**审查范围：** Miao_remote/server.ts（ef3024c 之后的全部改动 + 历史代码）  
**审查目标：** 功能有效性、PWA/小程序兼容性、安全性、可靠性

---

## 结论

**当前 server.ts 不影响功能有效性，调试阶段可正常使用。** 核心功能（认证、CRUD、好友、通知、点赞/评论）的请求流程均能正确走通。问题集中在安全加固和生产就绪性上，调试阶段单用户/少用户场景下不会触发并发问题。

最值得留意的功能性问题是 `enrichDiariesWithInteractions` 会覆盖旧 likes 数据（上线后旧点赞归零），这属于数据迁移问题，见问题 #15。

---

## 问题清单

### 严重问题（安全/数据安全）

| # | 行号 | 问题 | 影响 | 优先级 |
|---|------|------|------|--------|
| 1 | 227, 256 | **密码明文存储和比较** — `u.password === password`，密码以明文存在 users.json 中 | 任何能读取该文件的人可看到所有密码；泄露后无法撤销 | P0 |
| 2 | 203-231 | **旧 `/api/auth/` 路由无速率限制且无 JWT** — 仍可被外部访问，无限次尝试登录 | 暴力破解风险 | P0 |
| 3 | 473-601 | **旧 `/api/` 路由无 authRequired** — `/api/cats/:userId`、`/api/diaries/:userId` 等不需要认证，任何人知道 userId 可读写数据 | 数据泄露/篡改 | P0 |
| 4 | 687-711 | **点赞接口无好友关系校验** — 只验证日记存在，不验证请求者是否为日记所有者的好友 | 任何人可给非好友日记点赞 | P1 |
| 5 | 714-743 | **评论接口无好友关系校验 + 无内容长度限制** — 同上，且 content 无长度上限 | 恶意评论 + 超长内容攻击 | P1 |
| 6 | 1856-1880 | **`/api/proxy-resource` 无认证 + SSRF 风险** — 任何人可代理任意 URL，包括内网地址 | 攻击者可访问 `http://localhost:3000`、云元数据 169.254.169.254 | P0 |
| 7 | 88 | **JWT Secret 默认值不安全** — 默认 `"miao-dev-secret-change-me"`，生产环境未配置则 token 可被伪造 | 任意用户身份伪造 | P0 |

### PWA/小程序兼容问题

| # | 行号 | 问题 | 影响 | 优先级 |
|---|------|------|------|--------|
| 8 | 全局 | **无 CORS 头** — 除 `/api/proxy-resource` 外所有 API 无 `Access-Control-Allow-Origin` | PWA 从不同域访问时被 CORS 拦截；小程序不受影响 | P0（PWA 部署必需） |
| 9 | 348-351 | **phone-login Mock 模式判断不一致** — wechat-login 允许 `WECHAT_LOGIN_DEV_MOCK=true` 在生产环境 mock，phone-login 不允许 | 生产环境无法测试手机号登录 mock | P2 |
| 10 | 94-110 | **`getAccessToken()` 无并发保护** — 高并发下多次请求微信 API 获取 access_token | 浪费 access_token 配额（2000次/天） | P2 |

### 性能/可靠性问题

| # | 行号 | 问题 | 影响 | 优先级 |
|---|------|------|------|--------|
| 11 | 64-66 | **`writeJSON` 同步阻塞** — `fs.writeFileSync` 在高并发时阻塞事件循环，每次写入序列化整个 JSON 文件 | 多用户同时操作时性能下降；点赞/评论接口尤其受影响 | P1 |
| 12 | 529-537 | **`enrichDiariesWithInteractions` 每次调用读 2 个额外 JSON 文件** — 每次 GET diary 请求需读 diaries.json + diary-likes.json + diary-comments.json | 请求延迟增加 | P1 |
| 13 | 687-743 | **点赞/评论接口无并发控制** — 两个请求同时点赞，后写覆盖先写（lost update） | 并发点赞计数不准确 | P1 |
| 14 | 529-537 | **`enrichDiariesWithInteractions` 覆盖旧 likes/comments** — 用独立文件数据替换 ServerDiary 中的 likes/isLiked/comments | 上线后旧日记的点赞数归零（diary-likes.json 为空），需要数据迁移 | P1 |
| 15 | 660-669 | **`POST /api/v1/diaries` 可写入任意 likes/comments** — 客户端上传的 diary 对象包含 likes/isLiked/comments，服务端直接存储 | 旧数据兼容问题；enrich 会覆盖，但上传时旧值被存入 diaries.json | P2 |

### 代码质量问题

| # | 行号 | 问题 | 优先级 |
|---|------|------|--------|
| 16 | 1491-1750 | 旧 `/api/` AI 路由与 `/api/v1/ai/` 路由大量重复代码 | P2 |
| 17 | 203-231 | 旧 `/api/auth/` 路由不返回 JWT，不兼容现代客户端，应废弃 | P2 |
| 18 | 1933-1958 | SPA fallback `app.get('*')` 在生产模式会捕获所有未匹配路由，新增 API 路由时需注意注册顺序 | P2 |

---

## 修复优先级建议

### P0 — 上线前必须修复

**1. 添加 CORS 中间件（PWA 必需）**
```typescript
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

**2. `/api/proxy-resource` 添加认证 + URL 白名单**
```typescript
app.get("/api/proxy-resource", authRequired, async (req, res) => {
  const { url } = req.query;
  // 白名单：只允许代理特定域名
  const allowedHosts = ['dashscope.aliyuncs.com', 'ark.cn-beijing.volces.com'];
  const parsed = new URL(url);
  if (!allowedHosts.some(h => parsed.hostname.endsWith(h))) {
    return res.status(403).json({ error: "Domain not allowed" });
  }
  // ...
});
```

**3. JWT Secret 生产环境强制检查**
```typescript
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'miao-dev-secret-change-me') {
  console.error('FATAL: JWT_SECRET must be set in production');
  process.exit(1);
}
```

**4. 旧 `/api/` 无认证路由加保护或标记废弃**
- 方案 A：添加 `authRequired` 中间件
- 方案 B：添加注释 `// DEPRECATED: 使用 /api/v1/ 替代` 并在非开发环境禁用

### P1 — 近期修复（上线初期）

**5. 密码哈希（bcrypt）**
- 注册时 `bcrypt.hash(password, 10)` 存储
- 登录时 `bcrypt.compare(password, user.password)` 验证
- 需要数据迁移脚本处理旧明文密码

**6. 点赞/评论接口添加好友关系校验**
```typescript
// 在 /api/v1/diaries/:diaryId/like 和 /comments 中
const diary = allDiaries.find(d => d.id === diaryId);
if (!diary) return res.status(404).json({ error: "Diary not found" });
// 自己的日记可以直接操作
if (diary.userId !== userId) {
  // 好友的日记需要验证好友关系
  const friends = readJSON<ServerFriend[]>(friendsFile, []).filter(f => f.userId === userId);
  if (!friends.some(f => f.friendId === diary.userId)) {
    return res.status(403).json({ error: "Not a friend", code: "FORBIDDEN" });
  }
}
```

**7. 评论内容长度限制**
```typescript
if (content.length > 500) return res.status(400).json({ error: "Comment too long", code: "CONTENT_TOO_LONG" });
```

**8. writeJSON 改为异步 + 文件锁（或用 better-sqlite3 替代 JSON 文件）**

**9. enrichDiariesWithInteractions 添加缓存**
```typescript
let interactionCache: {  any; mtime: number } | null = null;
function getInteractions() {
  // 检查文件修改时间，未变则用缓存
}
```

**10. 旧 likes 数据迁移脚本**
```javascript
// 迁移脚本：遍历 diaries.json，将旧 likes/comments 迁移到 diary-likes.json/diary-comments.json
```

### P2 — 后续优化

- 清理旧 `/api/` 路由，统一到 `/api/v1/`
- AI 路由去重
- `getAccessToken()` 加并发锁（Promise 缓存）
- phone-login mock 模式与 wechat-login 统一
- 添加速率限制中间件（express-rate-limit）