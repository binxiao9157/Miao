import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import https from "https";
import dotenv from "dotenv";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import { spawn } from "child_process";
import ffmpegStaticPath from "ffmpeg-static";

dotenv.config();
// Local development machines may have HTTP(S)_PROXY configured. Several AI
// providers reject proxied JSON requests with an empty 400 response, so bypass
// environment proxies for server-side axios calls by default.
axios.defaults.proxy = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '50mb' }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  app.use((req, res, next) => {
    const headerType = String(req.headers['x-client-type'] || '').toLowerCase();
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    const referer = String(req.headers.referer || '').toLowerCase();
    const clientType =
      headerType ||
      (ua.includes('miniprogram') || referer.includes('servicewechat.com') ? 'wechat-miniprogram' : 'pwa');
    (req as any).clientType = clientType;
    res.setHeader('X-Detected-Client-Type', clientType);
    next();
  });

  const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 100,
    timeout: 60000
  });

  // ── JSON 文件数据库 ──
  const dataDir = path.resolve(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const usersFile = path.join(dataDir, 'users.json');
  const catsFile = path.join(dataDir, 'cats.json');
  const diariesFile = path.join(dataDir, 'diaries.json');
  const lettersFile = path.join(dataDir, 'letters.json');
  const pointsFile = path.join(dataDir, 'points.json');
  const friendsFile = path.join(dataDir, 'friends.json');
  const friendInvitesFile = path.join(dataDir, 'friend-invites.json');
  const notificationsFile = path.join(dataDir, 'notifications.json');
  const diaryLikesFile = path.join(dataDir, 'diary-likes.json');
  const diaryCommentsFile = path.join(dataDir, 'diary-comments.json');

  function readJSON<T>(file: string, fallback: T): T {
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch { return fallback; }
  }
  function writeJSON(file: string, data: any) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  }

  function timingSafeStringEqual(a: string, b: string) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) return false;
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  }

  interface ServerUser { username: string; nickname: string; avatar: string; password: string; phone?: string; openid?: string; unionid?: string; }
  interface ServerCat {
    id: string; userId: string; name: string; breed: string; color: string;
    avatar: string; source: string; createdAt?: number; updatedAt?: number;
    videoPath?: string; videoPaths?: Record<string, string>; remoteVideoUrl?: string;
    frameAnimations?: Record<string, {
      frames: string[];
      fps: number;
      format: "webp" | "png";
      generatedAt: number;
      sourceVideo?: string;
    }>;
    placeholderImage?: string; anchorFrame?: string; isUnlocking?: boolean;
  }
  interface ServerFriend {
    userId: string; friendId: string; nickname: string; avatar: string;
    catName: string; catAvatar: string; addedAt: number;
  }
  interface ServerFriendInvite {
    code: string; ownerId: string; catId?: string; catName?: string;
    catAvatar?: string; createdAt: number; expiresAt: number;
  }
  interface ServerNotification {
    id: string; recipientId: string; senderId: string; type: string;
    title: string; content: string; catAvatar?: string; createdAt: number; read: boolean;
  }

  const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "miao-dev-secret-change-me";
  const tokenTtlMs = Number(process.env.SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);

  // ── 微信 access_token 缓存（用于 getPhoneNumber 接口）──
  let cachedAccessToken: { token: string; expiresAt: number } | null = null;

  async function getAccessToken(): Promise<string> {
    if (!process.env.WECHAT_APPID || !process.env.WECHAT_APPSECRET) return '';
    if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
      return cachedAccessToken.token;
    }
    const resp = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_APPSECRET}`,
      { timeout: 10000, httpsAgent }
    );
    if (!resp.data?.access_token) throw new Error('Failed to get access_token: ' + (resp.data?.errmsg || 'unknown'));
    const expiresIn = typeof resp.data.expires_in === 'number' && resp.data.expires_in > 0 ? resp.data.expires_in : 7200;
    cachedAccessToken = {
      token: resp.data.access_token,
      expiresAt: Date.now() + (expiresIn - 300) * 1000,
    };
    return cachedAccessToken.token;
  }

  const base64url = (input: Buffer | string) =>
    Buffer.from(input).toString('base64url');

  const signToken = (payload: Record<string, any>) => {
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + tokenTtlMs }));
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  };

  const verifyToken = (token: string): { username: string } | null => {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (expected.length !== parts[2].length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) return null;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      if (!payload?.username || Number(payload.exp || 0) < Date.now()) return null;
      return { username: payload.username };
    } catch {
      return null;
    }
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return undefined;
    if (phone.length < 7) return '******';
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  };

  const publicUser = (user: ServerUser) => ({
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    phone: maskPhone(user.phone),
    openidBound: !!user.openid,
    passwordSet: !!user.password
  });

  const authRequired: express.RequestHandler = (req, res, next) => {
    const raw = String(req.headers.authorization || '');
    const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
    const auth = token ? verifyToken(token) : null;
    if (!auth) return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    (req as any).auth = auth;
    next();
  };

  const getAuthedUsername = (req: express.Request) => (req as any).auth?.username as string;

  const getBearerToken = (req: express.Request) => {
    const raw = String(req.headers.authorization || '');
    return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  };

  const isLocalDesktopRequest = (req: express.Request) => {
    const candidates = [
      req.ip,
      req.socket.remoteAddress,
    ].filter(Boolean);
    return candidates.some((address) =>
      address === '::1' ||
      address === '127.0.0.1' ||
      address === 'localhost' ||
      address === '::ffff:127.0.0.1'
    );
  };

  const getDesktopToken = () =>
    String(process.env.MIAO_DESKTOP_TOKEN || process.env.MIAO_DESKTOP_ACCESS_TOKEN || '').trim();

  const hasValidDesktopToken = (req: express.Request) => {
    const expected = getDesktopToken();
    if (!expected) return false;
    const provided = String(
      req.headers['x-miao-desktop-token'] ||
      getBearerToken(req) ||
      ''
    ).trim();
    return Boolean(provided) && timingSafeStringEqual(provided, expected);
  };

  const getUserPublicProfile = (username: string) => {
    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.username === username);
    return user ? publicUser(user) : { username, nickname: username, avatar: "", openidBound: false, passwordSet: false };
  };

  const getUserPrimaryCat = (username: string) => {
    const cats = readJSON<ServerCat[]>(catsFile, [])
      .filter(c => c.userId === username)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return cats[0] || null;
  };

  const toClientFriend = (friend: ServerFriend) => ({
    id: friend.friendId,
    nickname: friend.nickname,
    avatar: friend.avatar,
    catName: friend.catName,
    catAvatar: friend.catAvatar,
    addedAt: friend.addedAt,
  });

  const upsertFriend = (all: ServerFriend[], userId: string, friendId: string, cat?: Partial<ServerFriend>) => {
    const profile = getUserPublicProfile(friendId);
    const primaryCat = getUserPrimaryCat(friendId);
    const entry: ServerFriend = {
      userId,
      friendId,
      nickname: String(profile.nickname || friendId),
      avatar: String(profile.avatar || ""),
      catName: String(cat?.catName || primaryCat?.name || "小猫"),
      catAvatar: String(cat?.catAvatar || primaryCat?.avatar || ""),
      addedAt: cat?.addedAt || Date.now(),
    };
    const idx = all.findIndex(f => f.userId === userId && f.friendId === friendId);
    if (idx >= 0) all[idx] = { ...all[idx], ...entry, addedAt: all[idx].addedAt || entry.addedAt };
    else all.push(entry);
  };

  // ── 用户注册/登录 API ──
  app.post("/api/auth/register", (req, res) => {
    const username = (req.body.username || "").trim();
    const password = (req.body.password || "").trim();
    const nickname = (req.body.nickname || "").trim();
    const avatar = (req.body.avatar || "").trim();
    if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

    const users = readJSON<ServerUser[]>(usersFile, []);
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const user: ServerUser = { username, password, nickname: nickname || username, avatar: avatar || '' };
    users.push(user);
    writeJSON(usersFile, users);
    console.log(`[Auth] Registered user: ${username}`);
    res.json({ username: user.username, nickname: user.nickname, avatar: user.avatar });
  });

  app.post("/api/auth/login", (req, res) => {
    const username = (req.body.username || "").trim();
    const password = (req.body.password || "").trim();
    if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    console.log(`[Auth] Login: ${username}`);
    res.json({ username: user.username, nickname: user.nickname, avatar: user.avatar });
  });

  app.post("/api/v1/auth/register", (req, res) => {
    const username = (req.body.username || "").trim();
    const password = (req.body.password || "").trim();
    const nickname = (req.body.nickname || "").trim();
    const avatar = (req.body.avatar || "").trim();
    if (!username || !password) return res.status(400).json({ error: "Missing username or password", code: "INVALID_PARAMETER" });

    const users = readJSON<ServerUser[]>(usersFile, []);
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ error: "Username already exists", code: "USERNAME_EXISTS" });
    }
    const user: ServerUser = { username, password, nickname: nickname || username, avatar: avatar || '' };
    users.push(user);
    writeJSON(usersFile, users);
    res.json({ token: signToken({ username: user.username }), user: publicUser(user) });
  });

  app.post("/api/v1/auth/password-login", (req, res) => {
    const username = (req.body.username || "").trim();
    const password = (req.body.password || "").trim();
    if (!username || !password) return res.status(400).json({ error: "Missing username or password", code: "INVALID_PARAMETER" });

    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    res.json({ token: signToken({ username: user.username }), user: publicUser(user) });
  });

  app.post("/api/v1/auth/wechat-login", async (req, res) => {
    const code = (req.body.code || "").trim();
    const nickname = (req.body.nickname || "").trim();
    const avatar = (req.body.avatar || "").trim();
    if (!code) return res.status(400).json({ error: "Missing code", code: "INVALID_PARAMETER" });
    if (!process.env.WECHAT_APPID || !process.env.WECHAT_APPSECRET) {
      if (process.env.NODE_ENV !== "production" || process.env.WECHAT_LOGIN_DEV_MOCK === "true") {
        const requestedDevOpenid = (req.body.devOpenid || process.env.WECHAT_DEV_OPENID || "dev_local_wechat_user").trim();
        const devOpenid = requestedDevOpenid.startsWith("dev_")
          ? requestedDevOpenid
          : `dev_${crypto.createHash('sha256').update(requestedDevOpenid).digest('hex').slice(0, 16)}`;
        const users = readJSON<ServerUser[]>(usersFile, []);
        let user = users.find(u => u.openid === devOpenid);
        if (!user) {
          user = {
            username: `wx_${devOpenid}`,
            password: "",
            nickname: nickname || `微信测试用户_${devOpenid.slice(-4)}`,
            avatar,
            openid: devOpenid
          };
          users.push(user);
        } else {
          if (nickname) user.nickname = nickname;
          if (avatar) user.avatar = avatar;
        }
        writeJSON(usersFile, users);
        return res.json({
          token: signToken({ username: user.username }),
          user: publicUser(user),
          openidBound: true,
          devMock: true
        });
      }
      return res.status(501).json({ error: "WeChat login is not configured", code: "WECHAT_NOT_CONFIGURED" });
    }

    try {
      const wxResp = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
        params: {
          appid: process.env.WECHAT_APPID,
          secret: process.env.WECHAT_APPSECRET,
          js_code: code,
          grant_type: "authorization_code"
        },
        timeout: 10000,
        httpsAgent
      });
      const openid = wxResp.data?.openid;
      if (!openid) {
        return res.status(401).json({ error: wxResp.data?.errmsg || "WeChat code exchange failed", code: "WECHAT_LOGIN_FAILED" });
      }

      const users = readJSON<ServerUser[]>(usersFile, []);
      let user = users.find(u => u.openid === openid);
      if (!user) {
        user = {
          username: `wx_${openid}`,
          password: "",
          nickname: nickname || `微信用户_${openid.slice(-4)}`,
          avatar,
          openid,
          unionid: wxResp.data?.unionid
        };
        users.push(user);
      } else {
        if (nickname) user.nickname = nickname;
        if (avatar) user.avatar = avatar;
        if (wxResp.data?.unionid) user.unionid = wxResp.data.unionid;
      }
      writeJSON(usersFile, users);
      res.json({ token: signToken({ username: user.username }), user: publicUser(user), openidBound: true });
    } catch (error: any) {
      res.status(502).json({ error: "WeChat login request failed", message: error.message, code: "WECHAT_UPSTREAM_ERROR" });
    }
  });

  // ── 手机号快捷登录 ──
  app.post("/api/v1/auth/phone-login", async (req, res) => {
    const phoneCode = String(req.body.phoneCode || "").trim();
    const loginCode = String(req.body.loginCode || "").trim();
    if (!phoneCode) return res.status(400).json({ error: "Missing phoneCode", code: "INVALID_PARAMETER" });

    let phone: string;
    let openid: string | undefined;

    // Mock 模式：未配置 WECHAT_APPID 时用 phoneCode hash 生成模拟手机号
    if (!process.env.WECHAT_APPID || !process.env.WECHAT_APPSECRET) {
      if (process.env.NODE_ENV === "production") {
        return res.status(501).json({ error: "Phone login is not configured", code: "WECHAT_NOT_CONFIGURED" });
      }
      const hash = crypto.createHash('sha256').update(phoneCode).digest('hex');
      phone = '138' + hash.slice(-8);
    } else {
      // 生产模式：用 access_token + phoneCode 调微信 getPhoneNumber 接口
      try {
        const accessToken = await getAccessToken();
        const wxResp = await axios.post(
          `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
          { code: phoneCode },
          { timeout: 10000, httpsAgent }
        );
        const phoneNumber = wxResp.data?.phone_info?.phoneNumber;
        if (!phoneNumber) {
          return res.status(401).json({ error: wxResp.data?.errmsg || "Failed to get phone number", code: "PHONE_LOGIN_FAILED" });
        }
        phone = phoneNumber;
      } catch (error: any) {
        return res.status(502).json({ error: "WeChat phone number request failed", message: error.message, code: "WECHAT_UPSTREAM_ERROR" });
      }
    }

    // 可选：用 loginCode 换取 openid
    if (loginCode && process.env.WECHAT_APPID && process.env.WECHAT_APPSECRET) {
      try {
        const wxResp = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
          params: {
            appid: process.env.WECHAT_APPID,
            secret: process.env.WECHAT_APPSECRET,
            js_code: loginCode,
            grant_type: "authorization_code"
          },
          timeout: 10000,
          httpsAgent
        });
        if (wxResp.data?.openid) openid = wxResp.data.openid;
      } catch { /* non-fatal */ }
    } else if (loginCode && (!process.env.WECHAT_APPID || !process.env.WECHAT_APPSECRET)) {
      openid = `dev_${crypto.createHash('sha256').update(loginCode).digest('hex').slice(0, 16)}`;
    }

    const users = readJSON<ServerUser[]>(usersFile, []);
    let user = users.find(u => u.phone === phone);
    let isNewUser = false;

    if (!user) {
      // 创建新用户：username=手机号, phone=手机号, nickname=喵星人_{尾号4位}
      user = {
        username: phone,
        password: "",
        nickname: `喵星人_${phone.slice(-4)}`,
        avatar: "",
        phone,
        openid,
      };
      users.push(user);
      isNewUser = true;
    } else {
      // 已有用户：更新 openid（如有）
      if (openid) user.openid = openid;
    }
    writeJSON(usersFile, users);
    res.json({ token: signToken({ username: user.username }), user: publicUser(user), isNewUser });
  });

  // ── 密码重置：发送验证码 ──
  app.post("/api/v1/auth/send-reset-code", (req, res) => {
    const phone = String(req.body.phone || "").trim();
    if (!phone) return res.status(400).json({ error: "Missing phone number", code: "INVALID_PARAMETER" });

    // 生产环境需要接入短信服务商；开发环境直接返回模拟验证码
    if (process.env.NODE_ENV !== "production" || process.env.SMS_PROVIDER === "mock") {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      console.log(`[ResetCode] Dev mock code for ${phone}: ${code}`);
      return res.json({ success: true, mock: true, code });
    }

    // TODO: 接入实际短信服务（阿里云 SMS / 腾讯云 SMS）
    return res.status(501).json({ error: "SMS service not configured", code: "SMS_NOT_CONFIGURED" });
  });

  // ── 密码重置：验证码校验并重置密码 ──
  app.post("/api/v1/auth/reset-password", (req, res) => {
    const phone = String(req.body.phone || "").trim();
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();

    if (!phone || !code || !newPassword) {
      return res.status(400).json({ error: "Missing phone, code, or newPassword", code: "INVALID_PARAMETER" });
    }
    if (newPassword.length < 6 || newPassword.length > 20) {
      return res.status(400).json({ error: "Password length must be 6-20 characters", code: "INVALID_PASSWORD_LENGTH" });
    }

    // 开发环境：验证码固定为 6 位数字即可通过
    if (process.env.NODE_ENV !== "production" || process.env.SMS_PROVIDER === "mock") {
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "Invalid verification code", code: "INVALID_CODE" });
      }
    } else {
      // TODO: 校验短信验证码
      return res.status(501).json({ error: "SMS service not configured", code: "SMS_NOT_CONFIGURED" });
    }

    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.phone === phone);
    if (!user) return res.status(404).json({ error: "Phone number not registered", code: "PHONE_NOT_FOUND" });

    user.password = newPassword;
    writeJSON(usersFile, users);
    console.log(`[ResetPassword] Password reset for phone: ${maskPhone(phone)}`);
    res.json({ success: true });
  });

  app.post("/api/v1/auth/set-password", authRequired, (req, res) => {
    const username = getAuthedUsername(req);
    const currentPassword = String(req.body.currentPassword || "").trim();
    const password = String(req.body.password || "").trim();

    if (!password) {
      return res.status(400).json({ error: "Missing password", code: "INVALID_PARAMETER" });
    }
    if (password.length < 6 || password.length > 20) {
      return res.status(400).json({ error: "Password length must be 6-20 characters", code: "INVALID_PASSWORD_LENGTH" });
    }

    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    }

    if (user.password && user.password !== currentPassword) {
      return res.status(401).json({ error: "Invalid current password", code: "INVALID_CURRENT_PASSWORD" });
    }

    user.password = password;
    writeJSON(usersFile, users);
    res.json({ success: true, user: publicUser(user) });
  });

  app.get("/api/v1/me", authRequired, (req, res) => {
    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.username === getAuthedUsername(req));
    if (!user) return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    res.json({ user: publicUser(user), clientType: (req as any).clientType });
  });

  app.patch("/api/v1/me", authRequired, (req, res) => {
    const username = getAuthedUsername(req);
    const nickname = req.body.nickname;
    const avatar = req.body.avatar;

    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });

    if (typeof nickname === 'string') {
      const trimmed = nickname.trim();
      if (trimmed.length < 2 || trimmed.length > 12) {
        return res.status(400).json({ error: "Nickname must be 2-12 characters", code: "INVALID_NICKNAME_LENGTH" });
      }
      user.nickname = trimmed;
    }
    if (typeof avatar === 'string') user.avatar = avatar.trim();

    writeJSON(usersFile, users);
    res.json({ user: publicUser(user) });
  });

  // ── 注销账户：删除用户及关联数据 ──
  app.delete("/api/v1/me", authRequired, (req, res) => {
    const username = getAuthedUsername(req);

    const users = readJSON<ServerUser[]>(usersFile, []);
    const idx = users.findIndex(u => u.username === username);
    if (idx < 0) return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    users.splice(idx, 1);
    writeJSON(usersFile, users);

    // 删除关联的猫咪
    const cats = readJSON<ServerCat[]>(catsFile, []);
    writeJSON(catsFile, cats.filter(c => c.userId !== username));

    // 删除关联的日记
    const diaries = readJSON<any[]>(diariesFile, []);
    writeJSON(diariesFile, diaries.filter(d => d.userId !== username));

    // 删除关联的信件
    const letters = readJSON<any[]>(lettersFile, []);
    writeJSON(lettersFile, letters.filter(l => l.userId !== username));

    // 删除关联的积分
    const points = readJSON<any[]>(pointsFile, []);
    writeJSON(pointsFile, points.filter(p => p.userId !== username));

    // 删除好友关系（双向）
    const friends = readJSON<ServerFriend[]>(friendsFile, []);
    writeJSON(friendsFile, friends.filter(f => f.userId !== username && f.friendId !== username));

    // 删除关联的通知
    const notifications = readJSON<ServerNotification[]>(notificationsFile, []);
    writeJSON(notificationsFile, notifications.filter(n => n.recipientId !== username && n.senderId !== username));

    // 删除关联的邀请
    const invites = readJSON<ServerFriendInvite[]>(friendInvitesFile, []);
    writeJSON(friendInvitesFile, invites.filter(i => i.ownerId !== username));

    console.log(`[Account] Deleted user: ${username}`);
    res.json({ success: true });
  });

  // ── 用户设置 ──
  const settingsFile = path.join(dataDir, 'user-settings.json');
  interface UserSettings { userId: string; notifications?: { friendRequest?: boolean; diaryLike?: boolean; diaryComment?: boolean; letterUnlock?: boolean }; updatedAt?: number }

  app.put("/api/v1/me/settings", authRequired, (req, res) => {
    const username = getAuthedUsername(req);
    const allSettings = readJSON<UserSettings[]>(settingsFile, []);
    let settings = allSettings.find(s => s.userId === username);
    if (!settings) {
      settings = { userId: username };
      allSettings.push(settings);
    }
    if (req.body.notifications && typeof req.body.notifications === 'object') {
      settings.notifications = { ...settings.notifications, ...req.body.notifications };
    }
    settings.updatedAt = Date.now();
    writeJSON(settingsFile, allSettings);
    res.json({ success: true, settings });
  });

  app.get("/api/v1/me/settings", authRequired, (req, res) => {
    const username = getAuthedUsername(req);
    const allSettings = readJSON<UserSettings[]>(settingsFile, []);
    const settings = allSettings.find(s => s.userId === username) || { userId: username };
    res.json(settings);
  });

  // ── 猫咪 CRUD API ──
  app.get("/api/cats/:userId", (req, res) => {
    const cats = readJSON<ServerCat[]>(catsFile, []);
    const userCats = cats.filter(c => c.userId === req.params.userId);
    res.json(userCats);
  });

  app.post("/api/cats", (req, res) => {
    const { userId, cat } = req.body;
    if (!userId || !cat?.id) return res.status(400).json({ error: "Missing userId or cat.id" });

    const cats = readJSON<ServerCat[]>(catsFile, []);
    const entry: ServerCat = { ...cat, userId };
    const idx = cats.findIndex(c => c.userId === userId && c.id === cat.id);
    if (idx >= 0) {
      // 深度合并 videoPaths，保留已有的动作
      cats[idx] = {
        ...entry,
        videoPaths: {
          ...cats[idx].videoPaths,
          ...entry.videoPaths
        }
      };
    } else {
      cats.push(entry);
    }
    writeJSON(catsFile, cats);
    res.json({ success: true });
  });

  app.delete("/api/cats/:userId/:catId", (req, res) => {
    const { userId, catId } = req.params;
    const cats = readJSON<ServerCat[]>(catsFile, []);
    const filtered = cats.filter(c => !(c.userId === userId && c.id === catId));
    writeJSON(catsFile, filtered);
    res.json({ success: true });
  });

  app.delete("/api/cats/:userId", (req, res) => {
    const cats = readJSON<ServerCat[]>(catsFile, []);
    const filtered = cats.filter(c => c.userId !== req.params.userId);
    writeJSON(catsFile, filtered);
    res.json({ success: true });
  });

  // ── 日记 CRUD API ──
  interface ServerDiary {
    id: string; userId: string; catId: string; content: string;
    media?: string; mediaType?: string; createdAt: number;
    likes: number; isLiked: boolean; comments: any[];
  }

  interface ServerComment {
    id: string; authorId: string; authorNickname: string; content: string; createdAt: number;
  }

  // 辅助函数：为日记列表注入点赞/评论交互数据
  function enrichDiariesWithInteractions(diaries: any[], userId: string): any[] {
    const allLikes = readJSON<Record<string, string[]>>(diaryLikesFile, {});
    const allComments = readJSON<Record<string, ServerComment[]>>(diaryCommentsFile, {});
    return diaries.map(d => ({
      ...d,
      likes: (allLikes[d.id] || []).length,
      isLiked: (allLikes[d.id] || []).includes(userId),
      comments: allComments[d.id] || [],
    }));
  }

  app.get("/api/diaries/:userId", (req, res) => {
    const all = readJSON<ServerDiary[]>(diariesFile, []);
    res.json(all.filter(d => d.userId === req.params.userId));
  });

  app.post("/api/diaries", (req, res) => {
    const { userId, diary } = req.body;
    if (!userId || !diary?.id) return res.status(400).json({ error: "Missing userId or diary.id" });
    const all = readJSON<ServerDiary[]>(diariesFile, []);
    const entry: ServerDiary = { ...diary, userId };
    const idx = all.findIndex(d => d.userId === userId && d.id === diary.id);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    writeJSON(diariesFile, all);
    res.json({ success: true });
  });

  app.delete("/api/diaries/:userId/:diaryId", (req, res) => {
    const { userId, diaryId } = req.params;
    const all = readJSON<ServerDiary[]>(diariesFile, []);
    writeJSON(diariesFile, all.filter(d => !(d.userId === userId && d.id === diaryId)));
    res.json({ success: true });
  });

  // ── 时光信件 CRUD API ──
  interface ServerLetter {
    id: string; userId: string; catId: string; catAvatar: string;
    title?: string; content: string; unlockAt: number; createdAt: number;
  }

  app.get("/api/letters/:userId", (req, res) => {
    const all = readJSON<ServerLetter[]>(lettersFile, []);
    res.json(all.filter(l => l.userId === req.params.userId));
  });

  app.post("/api/letters", (req, res) => {
    const { userId, letter } = req.body;
    if (!userId || !letter?.id) return res.status(400).json({ error: "Missing userId or letter.id" });
    const all = readJSON<ServerLetter[]>(lettersFile, []);
    const entry: ServerLetter = { ...letter, userId };
    const idx = all.findIndex(l => l.userId === userId && l.id === letter.id);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    writeJSON(lettersFile, all);
    res.json({ success: true });
  });

  app.delete("/api/letters/:userId/:letterId", (req, res) => {
    const { userId, letterId } = req.params;
    const all = readJSON<ServerLetter[]>(lettersFile, []);
    writeJSON(lettersFile, all.filter(l => !(l.userId === userId && l.id === letterId)));
    res.json({ success: true });
  });

  // ── 积分 API ──
  interface ServerPoints { userId: string; data: any; }

  app.get("/api/points/:userId", (req, res) => {
    const all = readJSON<ServerPoints[]>(pointsFile, []);
    const entry = all.find(p => p.userId === req.params.userId);
    res.json(entry?.data || null);
  });

  app.post("/api/points", (req, res) => {
    const { userId, data } = req.body;
    if (!userId || !data) return res.status(400).json({ error: "Missing userId or data" });
    const all = readJSON<ServerPoints[]>(pointsFile, []);
    const idx = all.findIndex(p => p.userId === userId);
    if (idx >= 0) all[idx].data = data; else all.push({ userId, data });
    writeJSON(pointsFile, all);
    res.json({ success: true });
  });

  app.get("/api/v1/cats", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const cats = readJSON<ServerCat[]>(catsFile, []);
    res.json(cats.filter(c => c.userId === userId));
  });

  app.post("/api/v1/cats", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const cat = req.body.cat || req.body;
    if (!cat?.id) return res.status(400).json({ error: "Missing cat.id", code: "INVALID_PARAMETER" });
    const cats = readJSON<ServerCat[]>(catsFile, []);
    const entry: ServerCat = { ...cat, userId };
    const idx = cats.findIndex(c => c.userId === userId && c.id === cat.id);
    if (idx >= 0) {
      cats[idx] = {
        ...entry,
        videoPaths: {
          ...cats[idx].videoPaths,
          ...entry.videoPaths
        }
      };
    } else {
      cats.push(entry);
    }
    writeJSON(catsFile, cats);
    res.json({ success: true, cat: entry });
  });

  app.delete("/api/v1/cats/:catId", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const cats = readJSON<ServerCat[]>(catsFile, []);
    writeJSON(catsFile, cats.filter(c => !(c.userId === userId && c.id === req.params.catId)));
    res.json({ success: true });
  });

  app.delete("/api/v1/cats", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const cats = readJSON<ServerCat[]>(catsFile, []);
    writeJSON(catsFile, cats.filter(c => c.userId !== userId));
    res.json({ success: true });
  });

  app.get("/api/v1/diaries", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const all = readJSON<ServerDiary[]>(diariesFile, []);
    const own = all.filter(d => d.userId === userId);
    res.json(enrichDiariesWithInteractions(own, userId));
  });

  app.post("/api/v1/diaries", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const diary = req.body.diary || req.body;
    if (!diary?.id) return res.status(400).json({ error: "Missing diary.id", code: "INVALID_PARAMETER" });
    const all = readJSON<ServerDiary[]>(diariesFile, []);
    const entry: ServerDiary = { ...diary, userId };
    const idx = all.findIndex(d => d.userId === userId && d.id === diary.id);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    writeJSON(diariesFile, all);
    res.json({ success: true, diary: entry });
  });

  app.delete("/api/v1/diaries/:diaryId", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const all = readJSON<ServerDiary[]>(diariesFile, []);
    writeJSON(diariesFile, all.filter(d => !(d.userId === userId && d.id === req.params.diaryId)));
    // 清理该日记的点赞和评论
    const allLikes = readJSON<Record<string, string[]>>(diaryLikesFile, {});
    const allComments = readJSON<Record<string, ServerComment[]>>(diaryCommentsFile, {});
    delete allLikes[req.params.diaryId];
    delete allComments[req.params.diaryId];
    writeJSON(diaryLikesFile, allLikes);
    writeJSON(diaryCommentsFile, allComments);
    res.json({ success: true });
  });

  // ── 日记点赞/评论 API ──
  app.post("/api/v1/diaries/:diaryId/like", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const { diaryId } = req.params;
    if (!diaryId) return res.status(400).json({ error: "Missing diaryId", code: "INVALID_PARAMETER" });

    // 验证日记存在
    const allDiaries = readJSON<ServerDiary[]>(diariesFile, []);
    if (!allDiaries.find(d => d.id === diaryId)) {
      return res.status(404).json({ error: "Diary not found", code: "NOT_FOUND" });
    }

    const allLikes = readJSON<Record<string, string[]>>(diaryLikesFile, {});
    const likedBy = allLikes[diaryId] || [];
    const idx = likedBy.indexOf(userId);
    let liked: boolean;
    if (idx >= 0) {
      likedBy.splice(idx, 1);
      liked = false;
    } else {
      likedBy.push(userId);
      liked = true;
    }
    allLikes[diaryId] = likedBy;
    writeJSON(diaryLikesFile, allLikes);
    res.json({ liked, likes: likedBy.length });
  });

  app.post("/api/v1/diaries/:diaryId/comments", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const { diaryId } = req.params;
    const content = String(req.body.content || "").trim();
    if (!diaryId) return res.status(400).json({ error: "Missing diaryId", code: "INVALID_PARAMETER" });
    if (!content) return res.status(400).json({ error: "Missing content", code: "INVALID_PARAMETER" });

    // 验证日记存在
    const allDiaries = readJSON<ServerDiary[]>(diariesFile, []);
    if (!allDiaries.find(d => d.id === diaryId)) {
      return res.status(404).json({ error: "Diary not found", code: "NOT_FOUND" });
    }

    // 获取用户昵称
    const users = readJSON<ServerUser[]>(usersFile, []);
    const user = users.find(u => u.username === userId);

    const comment: ServerComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      authorId: userId,
      authorNickname: user?.nickname || userId,
      content,
      createdAt: Date.now(),
    };

    const allComments = readJSON<Record<string, ServerComment[]>>(diaryCommentsFile, {});
    if (!allComments[diaryId]) allComments[diaryId] = [];
    allComments[diaryId].push(comment);
    writeJSON(diaryCommentsFile, allComments);
    res.json({ comment });
  });

  // 删除评论
  app.delete("/api/v1/diaries/:diaryId/comments/:commentId", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const { diaryId, commentId } = req.params;
    if (!diaryId || !commentId) return res.status(400).json({ error: "Missing diaryId or commentId", code: "INVALID_PARAMETER" });

    const allComments = readJSON<Record<string, ServerComment[]>>(diaryCommentsFile, {});
    const comments = allComments[diaryId] || [];
    const target = comments.find(c => c.id === commentId);
    if (!target) return res.status(404).json({ error: "Comment not found", code: "NOT_FOUND" });

    // 只有评论作者或日记作者可以删除
    const allDiaries = readJSON<ServerDiary[]>(diariesFile, []);
    const diary = allDiaries.find(d => d.id === diaryId);
    const isCommentAuthor = target.authorId === userId;
    const isDiaryOwner = diary?.userId === userId;
    if (!isCommentAuthor && !isDiaryOwner) {
      return res.status(403).json({ error: "Not authorized to delete this comment", code: "FORBIDDEN" });
    }

    allComments[diaryId] = comments.filter(c => c.id !== commentId);
    writeJSON(diaryCommentsFile, allComments);
    res.json({ success: true });
  });

  app.get("/api/v1/letters", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const all = readJSON<ServerLetter[]>(lettersFile, []);
    res.json(all.filter(l => l.userId === userId));
  });

  app.post("/api/v1/letters", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const letter = req.body.letter || req.body;
    if (!letter?.id) return res.status(400).json({ error: "Missing letter.id", code: "INVALID_PARAMETER" });
    const all = readJSON<ServerLetter[]>(lettersFile, []);
    const entry: ServerLetter = { ...letter, userId };
    const idx = all.findIndex(l => l.userId === userId && l.id === letter.id);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    writeJSON(lettersFile, all);
    res.json({ success: true, letter: entry });
  });

  app.delete("/api/v1/letters/:letterId", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const all = readJSON<ServerLetter[]>(lettersFile, []);
    writeJSON(lettersFile, all.filter(l => !(l.userId === userId && l.id === req.params.letterId)));
    res.json({ success: true });
  });

  app.get("/api/v1/points", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const all = readJSON<ServerPoints[]>(pointsFile, []);
    const entry = all.find(p => p.userId === userId);
    res.json(entry?.data || null);
  });

  app.post("/api/v1/points", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const data = req.body.data || req.body;
    if (!data) return res.status(400).json({ error: "Missing data", code: "INVALID_PARAMETER" });
    const all = readJSON<ServerPoints[]>(pointsFile, []);
    const nextData = { ...data, updatedAt: data.updatedAt || Date.now() };
    const idx = all.findIndex(p => p.userId === userId);
    if (idx >= 0) all[idx].data = nextData; else all.push({ userId, data: nextData });
    writeJSON(pointsFile, all);
    res.json({ success: true, data: nextData });
  });

  app.post("/api/v1/friend-invites", authRequired, (req, res) => {
    const ownerId = getAuthedUsername(req);
    const code = crypto.randomBytes(9).toString('base64url');
    const now = Date.now();
    const invite: ServerFriendInvite = {
      code,
      ownerId,
      catId: String(req.body.catId || "").trim(),
      catName: String(req.body.catName || "").trim(),
      catAvatar: String(req.body.catAvatar || "").trim(),
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    };
    const invites = readJSON<ServerFriendInvite[]>(friendInvitesFile, [])
      .filter(i => i.expiresAt > now && i.ownerId !== ownerId);
    invites.push(invite);
    writeJSON(friendInvitesFile, invites);
    res.json({ invite: { ...invite, inviter: getUserPublicProfile(ownerId) } });
  });

  app.get("/api/v1/friend-invites/:code", authRequired, (req, res) => {
    const code = String(req.params.code || "").trim();
    const invite = readJSON<ServerFriendInvite[]>(friendInvitesFile, [])
      .find(i => i.code === code && i.expiresAt > Date.now());
    if (!invite) return res.status(404).json({ error: "Invite not found or expired", code: "INVITE_NOT_FOUND" });
    res.json({ invite: { ...invite, inviter: getUserPublicProfile(invite.ownerId) } });
  });

  app.get("/api/v1/friends", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const friends = readJSON<ServerFriend[]>(friendsFile, [])
      .filter(f => f.userId === userId)
      .map(toClientFriend);
    res.json(friends);
  });

  app.post("/api/v1/friends/accept", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const code = String(req.body.code || "").trim();
    const invite = readJSON<ServerFriendInvite[]>(friendInvitesFile, [])
      .find(i => i.code === code && i.expiresAt > Date.now());
    if (!invite) return res.status(404).json({ error: "Invite not found or expired", code: "INVITE_NOT_FOUND" });
    if (invite.ownerId === userId) {
      return res.status(400).json({ error: "Cannot add yourself", code: "CANNOT_ADD_SELF" });
    }

    const friends = readJSON<ServerFriend[]>(friendsFile, []);
    upsertFriend(friends, userId, invite.ownerId, {
      catName: invite.catName || undefined,
      catAvatar: invite.catAvatar || undefined,
      addedAt: Date.now(),
    });
    const accepterCat = getUserPrimaryCat(userId);
    upsertFriend(friends, invite.ownerId, userId, {
      catName: accepterCat?.name,
      catAvatar: accepterCat?.avatar,
      addedAt: Date.now(),
    });
    writeJSON(friendsFile, friends);

    const acceptedFriend = friends.find(f => f.userId === userId && f.friendId === invite.ownerId);
    res.json({ success: true, friend: acceptedFriend ? toClientFriend(acceptedFriend) : null });
  });

  app.get("/api/v1/friends/diaries", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const friends = readJSON<ServerFriend[]>(friendsFile, []).filter(f => f.userId === userId);
    const friendIds = new Set(friends.map(f => f.friendId));
    const users = readJSON<ServerUser[]>(usersFile, []);
    const cats = readJSON<ServerCat[]>(catsFile, []);
    const diaries = readJSON<ServerDiary[]>(diariesFile, [])
      .filter(d => friendIds.has(d.userId))
      .map(d => {
        const user = users.find(u => u.username === d.userId);
        const cat = cats.find(c => c.userId === d.userId && c.id === d.catId) || getUserPrimaryCat(d.userId);
        return {
          ...d,
          authorId: d.userId,
          authorNickname: user?.nickname || d.userId,
          authorAvatar: user?.avatar || "",
          catName: cat?.name || "小猫",
        };
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(enrichDiariesWithInteractions(diaries, userId));
  });

  // ── 通知 API ──
  app.get("/api/v1/notifications", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const notifications = readJSON<ServerNotification[]>(notificationsFile, [])
      .filter(n => n.recipientId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(notifications);
  });

  app.post("/api/v1/notifications", authRequired, (req, res) => {
    const senderId = getAuthedUsername(req);
    const { recipientId, type, title, content, catAvatar } = req.body;
    if (!recipientId || !type || !title || !content) {
      return res.status(400).json({ error: "Missing required fields: recipientId, type, title, content", code: "MISSING_FIELDS" });
    }
    if (recipientId === senderId) {
      return res.status(400).json({ error: "Cannot send notification to yourself", code: "CANNOT_NOTIFY_SELF" });
    }
    // Verify recipient exists
    const users = readJSON<ServerUser[]>(usersFile, []);
    if (!users.find(u => u.username === recipientId)) {
      return res.status(404).json({ error: "Recipient not found", code: "RECIPIENT_NOT_FOUND" });
    }
    const notifications = readJSON<ServerNotification[]>(notificationsFile, []);
    const notification: ServerNotification = {
      id: crypto.randomBytes(8).toString('hex'),
      recipientId,
      senderId,
      type,
      title,
      content,
      catAvatar: catAvatar || undefined,
      createdAt: Date.now(),
      read: false,
    };
    notifications.push(notification);
    writeJSON(notificationsFile, notifications);
    res.json({ success: true, notification });
  });

  app.put("/api/v1/notifications/:id/read", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const notifId = req.params.id;
    const notifications = readJSON<ServerNotification[]>(notificationsFile, []);
    const notif = notifications.find(n => n.id === notifId && n.recipientId === userId);
    if (!notif) return res.status(404).json({ error: "Notification not found", code: "NOT_FOUND" });
    notif.read = true;
    writeJSON(notificationsFile, notifications);
    res.json({ success: true });
  });

  app.put("/api/v1/notifications/read-all", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const notifications = readJSON<ServerNotification[]>(notificationsFile, []);
    notifications.forEach(n => { if (n.recipientId === userId) n.read = true; });
    writeJSON(notificationsFile, notifications);
    res.json({ success: true });
  });

  // ── 意见反馈 API ──
  const feedbackFile = path.join(dataDir, 'feedback.json');
  interface FeedbackEntry { id: string; userId: string; type: string; content?: string; answers?: Record<string, any>; createdAt: number }

  app.post("/api/v1/feedback", authRequired, (req, res) => {
    const userId = getAuthedUsername(req);
    const { type, content, answers } = req.body;
    if (!type) return res.status(400).json({ error: "Missing feedback type", code: "INVALID_PARAMETER" });

    const feedback = readJSON<FeedbackEntry[]>(feedbackFile, []);
    const entry: FeedbackEntry = {
      id: crypto.randomBytes(8).toString('hex'),
      userId,
      type,
      content: content || undefined,
      answers: answers || undefined,
      createdAt: Date.now(),
    };
    feedback.push(entry);
    writeJSON(feedbackFile, feedback);
    console.log(`[Feedback] ${type} from ${userId}`);
    res.json({ success: true, id: entry.id });
  });

  // ── 文件上传 API（头像等） ──
  const avatarUploadsDir = path.resolve(__dirname, 'uploads', 'avatars');
  fs.mkdirSync(avatarUploadsDir, { recursive: true });

  app.post("/api/v1/upload", authRequired, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded", code: "MISSING_FILE" });

    const ext = path.extname(file.originalname || '.jpg').toLowerCase() || '.jpg';
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ error: "Unsupported file type", code: "INVALID_FILE_TYPE" });
    }

    const filename = `${getAuthedUsername(req)}_${Date.now()}${ext}`;
    const filePath = path.join(avatarUploadsDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const url = `/uploads/avatars/${filename}`;
    console.log(`[Upload] Avatar saved: ${url}`);
    res.json({ url });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      hasApiKey: !!process.env.DASHSCOPE_API_KEY
    });
  });

  // ── 阿里灵积 (DashScope) 配置 ──
  const DASHSCOPE_CONFIG = {
    API_KEY: (process.env.DASHSCOPE_API_KEY || "").trim(),
    BASE_URL: (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1").trim().replace(/\/$/, ''),
    IMAGE_MODEL: (process.env.DASHSCOPE_IMAGE_MODEL || "qwen-image-2.0").trim(),
    VIDEO_MODEL: (process.env.DASHSCOPE_VIDEO_MODEL || "wan2.2-kf2v-flash").trim()
  };

  // ── 火山引擎 Ark 配置 ──
  const VOLC_CONFIG = {
    API_KEY: (process.env.VOLC_API_KEY || "").trim(),
    BASE_URL: (process.env.VOLC_BASE_URL || process.env.VOLC_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks").trim().replace(/\/$/, ''),
    IMAGE_URL: (process.env.VOLC_IMAGE_URL || "https://ark.cn-beijing.volces.com/api/v3/images/generations").trim().replace(/\/$/, ''),
    IMAGE_MODEL: (process.env.VOLC_IMAGE_MODEL || "doubao-seedream-4-5-251128").trim(),
    VIDEO_MODEL: (process.env.VOLC_VIDEO_MODEL || "doubao-seedance-1-5-pro-251215").trim()
  };

  const ARK_API_KEY = DASHSCOPE_CONFIG.API_KEY;
  const ARK_BASE_URL = DASHSCOPE_CONFIG.BASE_URL;

  const ensureDashScopeApiKey = () => {
    if (!ARK_API_KEY) {
      const err: any = new Error("服务器未配置 DASHSCOPE_API_KEY，无法调用阿里灵积模型");
      err.response = {
        status: 500,
        data: {
          code: "MISSING_DASHSCOPE_API_KEY",
          message: err.message
        }
      };
      throw err;
    }
  };

  // 辅助函数：将 fileid 转换为临时的公网 HTTP URL
  const getFileUrl = async (fileId: string): Promise<string> => {
    ensureDashScopeApiKey();
    try {
      const response = await axios.get(`${ARK_BASE_URL}/files/${fileId}`, {
        headers: { 'Authorization': `Bearer ${ARK_API_KEY}` },
        httpsAgent,
        timeout: 10000
      });
      // DashScope API 返回的对象中包含 url 字段，是一个带签名的临时下载链接
      const url = response.data?.url || response.data?.data?.url;
      if (url) return url;
      // 退而求其次，尝试使用原始 fileid
      return `fileid://${fileId}`;
    } catch (e) {
      console.warn(`[Video] Failed to get URL for file ${fileId}, using fallback:`, e);
      return `fileid://${fileId}`;
    }
  };

  // 临时文件内存存储（用于 DashScope 回调抓取）
  const tempFiles = new Map<string, { buffer: Buffer, contentType: string, expiry: number }>();
  
  // 清理过期临时文件 (每小时一次)
  setInterval(() => {
    const now = Date.now();
    for (const [id, file] of tempFiles.entries()) {
      if (now > file.expiry) tempFiles.delete(id);
    }
  }, 3600000);

  app.get("/api/temp-file/:id", (req, res) => {
    const file = tempFiles.get(req.params.id);
    if (!file) return res.status(404).send("File not found or expired");
    res.setHeader('Content-Type', file.contentType);
    res.send(file.buffer);
  });

  // 辅助函数：上传图片到 DashScope 文件系统（支持 Base64 和外部 URL）
  // 返回格式：{ success: true, fileId: string } | { success: false, error: string }
  const uploadImageToDashScope = async (imageSource: string, sourceType: "Base64" | "URL"): Promise<{ success: boolean; fileId?: string; error?: string }> => {
    ensureDashScopeApiKey();
    try {
      let buffer: Buffer;
      let filename = 'frame.jpg';
      let contentType = 'image/jpeg';

      if (sourceType === "Base64") {
        // Base64 图片：直接解码
        const base64Clean = imageSource.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Clean, 'base64');
        console.log("[Video] Processing Base64 image as JPEG");
      } else {
        // 外部 URL：先下载图片
        console.log(`[Video] Downloading image from URL: ${imageSource.substring(0, 80)}...`);
        try {
          const downloadResp = await axios.get(imageSource, {
            responseType: 'arraybuffer',
            timeout: 30000,
            httpsAgent
          });
          buffer = Buffer.from(downloadResp.data);
          console.log("[Video] Processing downloaded image as JPEG");
        } catch (downloadErr: any) {
          const errMsg = downloadErr.response?.data?.message || downloadErr.message;
          console.error("[Video] Download image failed:", errMsg);
          return { success: false, error: `下载图片失败: ${errMsg}` };
        }
      }

      const form = new FormData();
      form.append('file', buffer, { filename, contentType });
      form.append('description', 'Cat video keyframe');

      const uploadResp = await axios.post(`${ARK_BASE_URL}/files`, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${ARK_API_KEY}`
        },
        httpsAgent,
        timeout: 30000
      });

      if (uploadResp.data?.id) {
        const fileId = `fileid://${uploadResp.data.id}`;
        console.log(`[Video] File upload succeeded: ${fileId}`);
        return { success: true, fileId };
      } else if (uploadResp.data?.data?.id) {
        const fileId = `fileid://${uploadResp.data.data.id}`;
        console.log(`[Video] File upload succeeded (nested): ${fileId}`);
        return { success: true, fileId };
      } else if (uploadResp.data?.data?.uploaded_files?.[0]?.file_id) {
        const fileId = `fileid://${uploadResp.data.data.uploaded_files[0].file_id}`;
        console.log(`[Video] File upload succeeded (uploaded_files): ${fileId}`);
        return { success: true, fileId };
      } else {
        console.error("[Video] File upload failed - unexpected response structure:", JSON.stringify(uploadResp.data));
        return { success: false, error: "上传响应格式异常: " + JSON.stringify(uploadResp.data).substring(0, 200) };
      }
    } catch (uploadErr: any) {
      const uploadData = uploadErr.response?.data;
      const errMsg = uploadData?.message || uploadErr.message;
      console.error("[Video] DashScope file upload error:", {
        status: uploadErr.response?.status,
        data: uploadData,
        message: uploadErr.message
      });
      return { success: false, error: `上传失败 (${uploadErr.response?.status}): ${errMsg}` };
    }
  };

  if (!ARK_API_KEY) {
    console.warn("⚠️ 警告: DASHSCOPE_API_KEY 环境变量未设置。图片和视频生成功能将无法工作。");
  }

  console.log("Server DashScope Config Initialized:", {
    hasApiKey: !!ARK_API_KEY,
    imageModel: DASHSCOPE_CONFIG.IMAGE_MODEL,
    videoModel: DASHSCOPE_CONFIG.VIDEO_MODEL,
    baseUrl: ARK_BASE_URL
  });

  console.log("Server Volcengine Config Initialized:", {
    hasApiKey: !!VOLC_CONFIG.API_KEY,
    imageModel: VOLC_CONFIG.IMAGE_MODEL,
    videoModel: VOLC_CONFIG.VIDEO_MODEL,
    baseUrl: VOLC_CONFIG.BASE_URL
  });

  // Helper to send standardized error responses
  const sendError = (res: express.Response, error: any, defaultMessage: string) => {
    const status = error.response?.status || 500;
    const errorData = error.response?.data;

    // DashScope error format: { code: "...", message: "..." } or { request_id: "...", code: "...", message: "..." }
    const errorCode = errorData?.code;
    const errorMessage = errorData?.message || error.message;

    // 构建详细的错误信息用于调试
    const detailedError = {
      httpStatus: status,
      code: errorCode,
      message: errorMessage,
      originalData: errorData
    };
    console.error("[Server Error Details]:", JSON.stringify(detailedError, null, 2));

    if (errorCode === "InvalidApiKey" || status === 401) {
      return res.status(401).json({
        error: "鉴权失败",
        message: "API Key 无效或已过期。",
        code: "INVALID_API_KEY",
        details: JSON.stringify(detailedError)
      });
    }

    if (errorCode === "MISSING_DASHSCOPE_API_KEY") {
      return res.status(500).json({
        error: "阿里灵积未配置",
        message: "服务器未配置 DASHSCOPE_API_KEY，请在 Miao_remote/.env 中配置有效的阿里灵积 API Key 后重启服务。",
        code: "MISSING_DASHSCOPE_API_KEY",
        details: JSON.stringify(detailedError)
      });
    }

    if (errorCode === "Arrearage" || errorMessage?.toLowerCase().includes("balance")) {
      return res.status(403).json({
        error: "账户欠费",
        message: "您的阿里云账户已欠费，请充值后重试。",
        code: "ARREARAGE",
        details: JSON.stringify(detailedError)
      });
    }

    if (errorCode === "AllocationQuota.FreeTierOnly") {
      return res.status(403).json({
        error: "免费额度已用尽",
        message: "阿里灵积当前模型的免费额度已用尽，且账号开启了“仅使用免费额度”。请到阿里云百炼/DashScope 控制台关闭该限制并开通付费调用，或切换到仍有额度的模型/API Key。",
        code: "DASHSCOPE_FREE_TIER_EXHAUSTED",
        details: JSON.stringify(detailedError)
      });
    }

    res.status(status).json({
      error: defaultMessage,
      message: errorMessage,
      code: errorCode,
      details: JSON.stringify(detailedError)
    });
  };

  type AIProviderName = "dashscope" | "volcengine";

  const normalizeProvider = (provider: unknown): AIProviderName => {
    return provider === "volcengine" ? "volcengine" : "dashscope";
  };

  const toImageUrl = (imageSource: string) => imageSource;

  const normalizeDashScopeStatus = (data: any) => {
    const output = data?.output;
    const status = output?.task_status || (data?.request_id ? 'PENDING' : 'FAILED');
    if (status === 'SUCCEEDED') {
      let imageUrl = output?.results?.[0]?.url || output?.image_url;
      const videoUrl = output?.video_url || output?.results?.[0]?.url;
      if (!imageUrl && output?.choices) {
        const content = output.choices[0]?.message?.content;
        if (Array.isArray(content)) {
          const imgItem = content.find((c: any) => c.image);
          if (imgItem) imageUrl = imgItem.image;
        }
      }
      return {
        status: 'succeeded',
        image_url: imageUrl,
        video_url: videoUrl,
        output: { ...output, image_url: imageUrl, video_url: videoUrl }
      };
    }
    if (status === 'FAILED') {
      return { status: 'failed', message: output?.message || "任务生成失败", output };
    }
    return { status: 'running', output };
  };

  const normalizeVolcStatus = (data: any) => {
    const rawStatus = String(data?.status || data?.task_status || data?.data?.status || '').toLowerCase();
    const succeeded = ['succeeded', 'success', 'completed', 'done'].includes(rawStatus);
    const failed = ['failed', 'error', 'cancelled', 'canceled'].includes(rawStatus);
    const imageUrl = data?.data?.[0]?.url || data?.image_url || data?.result?.image_url;
    const videoUrl =
      data?.content?.video_url ||
      data?.data?.video_url ||
      data?.video_url ||
      data?.response?.video?.uri ||
      data?.result?.video_url;

    if (succeeded) return { status: 'succeeded', image_url: imageUrl, video_url: videoUrl, output: data };
    if (failed) return { status: 'failed', message: data?.error || data?.message || "任务生成失败", output: data };
    return { status: 'running', output: data };
  };

  const generateDashScopeImage = async (body: any) => {
    ensureDashScopeApiKey();
    const { prompt, image_base64 } = body;
    if (!prompt || typeof prompt !== 'string') {
      const err: any = new Error("缺少必要参数: prompt");
      err.response = { status: 400, data: { code: "INVALID_PARAMETER", message: err.message } };
      throw err;
    }

    const url = `${ARK_BASE_URL}/services/aigc/multimodal-generation/generation`;
    const messages = [{ role: "user", content: [] as any[] }];
    if (image_base64) messages[0].content.push({ image: image_base64 });
    messages[0].content.push({ text: prompt });

    const requestBody = {
      model: body.model || DASHSCOPE_CONFIG.IMAGE_MODEL,
      input: { messages },
      parameters: {
        n: 1,
        result_format: "message",
        watermark: false
      }
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        'Authorization': `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      httpsAgent,
      timeout: 90000
    });

    const output = response.data?.output;
    const content = output?.choices?.[0]?.message?.content;
    if (Array.isArray(content)) {
      const imgItem = content.find((c: any) => c.image);
      if (imgItem?.image) {
        return { id: `sync:${Date.now()}`, status: 'succeeded', image_url: imgItem.image, provider: 'dashscope' };
      }
    }
    const taskId = output?.task_id;
    if (taskId) return { id: taskId, status: 'pending', provider: 'dashscope' };
    throw new Error("DashScope 未返回图片地址或任务 ID。响应内容: " + JSON.stringify(response.data));
  };

  const generateVolcImage = async (body: any) => {
    const { prompt, image_base64 } = body;
    if (!prompt || typeof prompt !== 'string') {
      const err: any = new Error("缺少必要参数: prompt");
      err.response = { status: 400, data: { code: "INVALID_PARAMETER", message: err.message } };
      throw err;
    }
    if (!VOLC_CONFIG.API_KEY) {
      const err: any = new Error("服务器未配置 VOLC_API_KEY");
      err.response = { status: 500, data: { code: "MISSING_API_KEY", message: err.message } };
      throw err;
    }

    const requestBody: any = {
      model: body.model || VOLC_CONFIG.IMAGE_MODEL,
      prompt,
      size: body.parameters?.size || "1920x1920"
    };
    if (image_base64) requestBody.image = image_base64;

    const response = await axios.post(VOLC_CONFIG.IMAGE_URL, requestBody, {
      headers: {
        'Authorization': `Bearer ${VOLC_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      },
      httpsAgent,
      timeout: 90000
    });

    const imageUrl = response.data?.data?.[0]?.url || response.data?.image_url || response.data?.url;
    const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
    if (imageUrl) return { id: `sync:${Date.now()}`, status: 'succeeded', image_url: imageUrl, provider: 'volcengine' };
    if (taskId) return { id: taskId, status: 'pending', provider: 'volcengine' };
    throw new Error("火山引擎未返回图片地址或任务 ID。响应内容: " + JSON.stringify(response.data));
  };

  const getDashScopeVideoFrameUrl = async (source: string): Promise<string> => {
    if (source.startsWith('fileid://')) {
      return getFileUrl(source.replace('fileid://', ''));
    }
    return source;
  };

  const uploadDashScopeFrameAndGetUrl = async (source: string): Promise<string> => {
    const uploadResult = await uploadImageToDashScope(
      source,
      source.startsWith('http') ? 'URL' : 'Base64'
    );
    if (!uploadResult.success || !uploadResult.fileId) {
      throw new Error(uploadResult.error || "DashScope 首帧上传失败");
    }
    return getFileUrl(uploadResult.fileId.replace('fileid://', ''));
  };

  const postDashScopeVideoTask = async (
    body: any,
    firstFrameUrl: string,
    lastFrameUrl: string,
    clientParams: any
  ) => {
    const requestBody = {
      model: body.model || DASHSCOPE_CONFIG.VIDEO_MODEL,
      input: {
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        prompt: body.prompt || "A high quality video of this cat, cinematic lighting, realistic."
      },
      parameters: {
        resolution: clientParams?.resolution || "480P",
        prompt_extend: clientParams?.prompt_extend !== undefined ? clientParams.prompt_extend : true,
        duration: clientParams?.duration || 5,
        seed: clientParams?.seed || 12345
      }
    };

    return axios.post(`${ARK_BASE_URL}/services/aigc/image2video/video-synthesis`, requestBody, {
      headers: {
        'Authorization': `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      httpsAgent,
      timeout: 60000
    });
  };

  const generateDashScopeVideo = async (body: any) => {
    ensureDashScopeApiKey();
    const { parameters: clientParams } = body;
    const firstFrame = body.first_frame || body.image_base64;
    const lastFrame = body.last_frame || firstFrame;
    if (!firstFrame) {
      const err: any = new Error("缺少必要参数: first_frame");
      err.response = { status: 400, data: { code: "INVALID_PARAMETER", message: err.message } };
      throw err;
    }

    let firstFrameUrl = await getDashScopeVideoFrameUrl(toImageUrl(firstFrame));
    let lastFrameUrl = await getDashScopeVideoFrameUrl(toImageUrl(lastFrame));
    let response;

    try {
      response = await postDashScopeVideoTask(body, firstFrameUrl, lastFrameUrl, clientParams);
    } catch (error: any) {
      const status = error.response?.status;
      const code = error.response?.data?.code;
      const quotaLimited = code === "AllocationQuota.FreeTierOnly";
      const shouldRetryWithUploadedFrame = !quotaLimited && (status === 403 || code === "Forbidden" || code === "AccessDenied");
      if (!shouldRetryWithUploadedFrame) throw error;

      console.warn("[Video] DashScope direct frame URL was rejected, retrying with uploaded DashScope file URL:", {
        status,
        code,
        message: error.response?.data?.message || error.message,
      });

      firstFrameUrl = await uploadDashScopeFrameAndGetUrl(toImageUrl(firstFrame));
      lastFrameUrl = lastFrame === firstFrame
        ? firstFrameUrl
        : await uploadDashScopeFrameAndGetUrl(toImageUrl(lastFrame));
      response = await postDashScopeVideoTask(body, firstFrameUrl, lastFrameUrl, clientParams);
    }

    const taskId = response.data?.output?.task_id;
    if (taskId) return { id: taskId, status: 'pending', provider: 'dashscope' };
    throw new Error("提交视频任务后未获取到 task_id. 响应: " + JSON.stringify(response.data));
  };

  const generateVolcVideo = async (body: any) => {
    const { prompt, parameters: clientParams, negative_prompt } = body;
    const firstFrame = body.first_frame || body.image_base64;
    const lastFrame = body.last_frame || firstFrame;
    if (!firstFrame) {
      const err: any = new Error("缺少必要参数: image_base64");
      err.response = { status: 400, data: { code: "INVALID_PARAMETER", message: err.message } };
      throw err;
    }
    if (!VOLC_CONFIG.API_KEY) {
      const err: any = new Error("服务器未配置 VOLC_API_KEY");
      err.response = { status: 500, data: { code: "MISSING_API_KEY", message: err.message } };
      throw err;
    }

    const normalizeImageUrl = (source: string) => {
      let cleanBase64 = source.replace(/\s/g, '');
      if (cleanBase64.startsWith('http')) {
        return cleanBase64;
      }
      let mimeType = 'image/png';
      if (cleanBase64.includes('base64,')) {
        const parts = cleanBase64.split('base64,');
        const header = parts[0];
        cleanBase64 = parts[1];
        const match = header.match(/data:([^;]+);/);
        if (match) mimeType = match[1];
      }
      return `data:${mimeType};base64,${cleanBase64}`;
    };

    const firstFrameUrl = normalizeImageUrl(firstFrame);
    const lastFrameUrl = normalizeImageUrl(lastFrame);
    const contentArray: any[] = [
      {
        type: "text",
        text: prompt || "A high quality video of this cat, cinematic lighting, realistic."
      },
      {
        type: "image_url",
        image_url: { url: firstFrameUrl },
        role: "first_frame"
      },
      {
        type: "image_url",
        image_url: { url: lastFrameUrl },
        role: "last_frame"
      }
    ];

    const requestBody: any = {
      model: body.model || VOLC_CONFIG.VIDEO_MODEL,
      content: contentArray,
      generate_audio: clientParams?.audio === true,
      ratio: clientParams?.ratio || "adaptive",
      duration: clientParams?.duration || 5,
      parameters: {
        size: clientParams?.resolution === "480P" || clientParams?.resolution === "480p" ? "720x1280" : (clientParams?.size || "720x1280"),
        seed: clientParams?.seed || 12345,
        fps: 25
      }
    };
    if (negative_prompt) requestBody.parameters.negative_prompt = negative_prompt;

    let response;
    let retries = 2;
    while (retries >= 0) {
      try {
        response = await axios.post(VOLC_CONFIG.BASE_URL, requestBody, {
          headers: {
            'Authorization': `Bearer ${VOLC_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
          },
          httpsAgent,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 120000
        });
        break;
      } catch (error: any) {
        if (error.code === 'ECONNRESET' && retries > 0) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }
    }
    if (!response) throw new Error("Failed to get response from Volcengine API after retries");

    const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
    if (taskId) return { ...response.data, id: taskId, status: 'pending', provider: 'volcengine' };
    throw new Error("提交火山视频任务后未获取到 task_id. 响应: " + JSON.stringify(response.data));
  };

  app.post("/api/ai/generate-image", async (req, res) => {
    try {
      const provider = normalizeProvider(req.body.provider);
      const result = provider === "volcengine"
        ? await generateVolcImage(req.body)
        : await generateDashScopeImage(req.body);
      res.json(result);
    } catch (error: any) {
      sendError(res, error, "生成图片失败");
    }
  });

  app.post("/api/ai/generate-video", async (req, res) => {
    try {
      const provider = normalizeProvider(req.body.provider);
      const result = provider === "volcengine"
        ? await generateVolcVideo(req.body)
        : await generateDashScopeVideo(req.body);
      res.json(result);
    } catch (error: any) {
      sendError(res, error, "提交视频生成失败");
    }
  });

  app.get("/api/ai/:type(image|video)-status/:provider/:taskId", async (req, res) => {
    const provider = normalizeProvider(req.params.provider);
    const { taskId } = req.params;
    try {
      if (taskId.startsWith('sync:')) {
        return res.status(400).json({ status: 'failed', message: '同步任务无需轮询' });
      }
      if (provider === "volcengine") {
        const response = await axios.get(`${VOLC_CONFIG.BASE_URL}/${taskId}`, {
          headers: { 'Authorization': `Bearer ${VOLC_CONFIG.API_KEY}` },
          httpsAgent,
          timeout: 60000
        });
        return res.json(normalizeVolcStatus(response.data));
      }
      ensureDashScopeApiKey();
      const response = await axios.get(`${ARK_BASE_URL}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${ARK_API_KEY}` },
        httpsAgent,
        timeout: 20000
      });
      res.json(normalizeDashScopeStatus(response.data));
    } catch (error: any) {
      sendError(res, error, "查询状态失败");
    }
  });

  app.post("/api/v1/ai/tasks", authRequired, async (req, res) => {
    const type = req.body.type === "image" ? "image" : "video";
    try {
      const provider = normalizeProvider(req.body.provider);
      const result = type === "image"
        ? (provider === "volcengine" ? await generateVolcImage(req.body) : await generateDashScopeImage(req.body))
        : (provider === "volcengine" ? await generateVolcVideo(req.body) : await generateDashScopeVideo(req.body));
      res.json({ ...result, type, provider });
    } catch (error: any) {
      sendError(res, error, type === "image" ? "生成图片失败" : "提交视频生成失败");
    }
  });

  app.post("/api/v1/ai/tasks-file", authRequired, upload.single('image'), async (req, res) => {
    const type = req.body.type === "image" ? "image" : "video";
    if (!req.file) return res.status(400).json({ error: "缺少图片文件", code: "INVALID_PARAMETER" });
    const mime = req.file.mimetype || 'image/jpeg';
    const imageData = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    const body = {
      ...req.body,
      image_base64: imageData,
      first_frame: imageData,
      last_frame: imageData,
      parameters: {
        seed: req.body.seed ? Number(req.body.seed) : undefined,
        resolution: req.body.resolution,
        duration: req.body.duration ? Number(req.body.duration) : undefined,
        audio: req.body.audio === 'true',
      }
    };
    try {
      const provider = normalizeProvider(req.body.provider);
      const result = type === "image"
        ? (provider === "volcengine" ? await generateVolcImage(body) : await generateDashScopeImage(body))
        : (provider === "volcengine" ? await generateVolcVideo(body) : await generateDashScopeVideo(body));
      res.json({ ...result, type, provider });
    } catch (error: any) {
      sendError(res, error, type === "image" ? "生成图片失败" : "提交视频生成失败");
    }
  });

  app.get("/api/v1/ai/tasks/:taskId", authRequired, async (req, res) => {
    const provider = normalizeProvider(req.query.provider);
    const type = req.query.type === "image" ? "image" : "video";
    const { taskId } = req.params;
    try {
      if (taskId.startsWith('sync:')) {
        return res.status(400).json({ status: 'failed', message: '同步任务无需轮询' });
      }
      if (provider === "volcengine") {
        const response = await axios.get(`${VOLC_CONFIG.BASE_URL}/${taskId}`, {
          headers: { 'Authorization': `Bearer ${VOLC_CONFIG.API_KEY}` },
          httpsAgent,
          timeout: 60000
        });
        return res.json({ ...normalizeVolcStatus(response.data), type, provider });
      }
      ensureDashScopeApiKey();
      const response = await axios.get(`${ARK_BASE_URL}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${ARK_API_KEY}` },
        httpsAgent,
        timeout: 20000
      });
      res.json({ ...normalizeDashScopeStatus(response.data), type, provider });
    } catch (error: any) {
      sendError(res, error, "查询状态失败");
    }
  });

  // API Route for Image Generation (DashScope)
  app.post("/api/generate-image", async (req, res) => {
    const { prompt, image_base64 } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "缺少必要参数: prompt", code: "INVALID_PARAMETER" });
    }

    try {
      // DashScope MultiModalConversation REST API endpoint
      const url = `${ARK_BASE_URL}/services/aigc/multimodal-generation/generation`;
      
      const messages = [
        {
          role: "user",
          content: [] as any[]
        }
      ];

      // Add reference image if provided
      if (image_base64) {
        messages[0].content.push({ image: image_base64 });
      }
      // Add text instructions
      messages[0].content.push({ text: prompt });

      const requestBody: any = {
        model: req.body.model || DASHSCOPE_CONFIG.IMAGE_MODEL,
        input: {
          messages: messages
        },
        parameters: {
          n: 1,
          result_format: "message",
          watermark: false
        }
      };

      console.log("Submitting Qwen-Image task to DashScope (restful sync):", {
        model: requestBody.model,
        url: url,
        hasRefImage: !!image_base64,
        prompt: prompt.substring(0, 50) + "..."
      });

      // Try calling synchronously first (removing X-DashScope-Async)
      const response = await axios.post(url, requestBody, {
        headers: {
          'Authorization': `Bearer ${ARK_API_KEY}`,
          'Content-Type': 'application/json'
          // Some models like qwen-image-2.0 might prefer sync if they are fast
        },
        httpsAgent,
        timeout: 90000 // Increase to 90s for sync generation
      });

      console.log("DashScope Response received:", JSON.stringify(response.data).substring(0, 200) + "...");

      const output = response.data?.output;
      
      // Check for sync result first
      if (output?.choices?.[0]?.message?.content) {
        const content = output.choices[0].message.content;
        let imageUrl = "";
        
        if (Array.isArray(content)) {
          const imgItem = content.find((c: any) => c.image);
          if (imgItem) imageUrl = imgItem.image;
        } else if (typeof content === 'string') {
          // Sometimes it might return just text or something else
          console.warn("Content is string:", content);
        }

        if (imageUrl) {
          console.log("Qwen-Image Sync Success:", imageUrl.substring(0, 50) + "...");
          return res.json({ id: `sync:${Date.now()}`, status: 'succeeded', image_url: imageUrl });
        }
      }

      // If no sync result, check if it returned a taskId for async
      const taskId = output?.task_id;
      if (taskId) {
        console.log("Qwen-Image Task Started (Async):", taskId);
        return res.json({ id: taskId, status: 'pending' });
      }

      throw new Error("DashScope 未返回图片地址或任务 ID。响应内容: " + JSON.stringify(response.data));
    } catch (error: any) {
      console.error("DashScope Image API Error:", error.response?.data || error.message);
      sendError(res, error, "生成图片失败");
    }
  });

  // DashScope task status polling (Unified for both image and video)
  app.get("/api/:type(image|video)-status/:taskId", async (req, res) => {
    const { taskId } = req.params;
    try {
      const url = `${ARK_BASE_URL}/tasks/${taskId}`;
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${ARK_API_KEY}` },
        httpsAgent,
        timeout: 20000
      });

      const output = response.data?.output;
      const status = output?.task_status || (response.data?.request_id ? 'PENDING' : 'FAILED'); // Fallback logic

      console.log(`[TaskStatus] ID: ${taskId}, Status: ${status}`);

      if (status === 'SUCCEEDED') {
        // Results might be in different locations depending on the model
        let imageUrl = output?.results?.[0]?.url || output?.image_url;
        const videoUrl = output?.video_url || output?.results?.[0]?.url; // WAN2.1+ usually uses video_url

        // If qwen-image-2.0 results (multimodal choices format)
        if (!imageUrl && output?.choices) {
          const choice = output.choices[0];
          if (choice?.message?.content) {
            const content = choice.message.content;
            const imgItem = content.find((c: any) => c.image);
            if (imgItem) imageUrl = imgItem.image;
          }
        }
        
        res.json({ 
          status: 'succeeded', 
          image_url: imageUrl,
          video_url: videoUrl,
          output: { ...output, image_url: imageUrl, video_url: videoUrl }
        });
      } else if (status === 'FAILED') {
        res.json({ status: 'failed', message: output?.message || "任务生成失败" });
      } else {
        res.json({ status: 'running' });
      }
    } catch (error: any) {
      sendError(res, error, "查询状态失败");
    }
  });

  // API Route for Video Generation (DashScope)
  app.post("/api/generate-video", async (req, res) => {
    const { prompt, image_base64, parameters: clientParams } = req.body;
    if (!image_base64) {
      return res.status(400).json({ error: "缺少必要参数: image_base64", code: "INVALID_PARAMETER" });
    }

    let firstFrameUrl = "";
    let lastFrameUrl = "";

    try {
      const url = `${ARK_BASE_URL}/services/aigc/image2video/video-synthesis`;

      // 打印更详细的日志用于调试
      console.log(`[Video] Image format: ${image_base64.substring(0, 50)}...`);

      // 根据官方示例，支持三种格式：
      // 1. Base64: data:image/jpeg;base64,xxx
      // 2. 公网URL: https://xxx.jpg
      // 3. fileid://xxx (DashScope文件ID)
      firstFrameUrl = image_base64;
      lastFrameUrl = image_base64;

      if (image_base64.startsWith('fileid://')) {
        // fileid 格式，尝试转换为 HTTP URL (带签名的临时链接)
        const fileId = image_base64.replace('fileid://', '');
        console.log(`[Video] Converting fileid ${fileId} to HTTP URL...`);
        const httpUrl = await getFileUrl(fileId);
        firstFrameUrl = httpUrl;
        lastFrameUrl = httpUrl;
        console.log("[Video] Resulting URL:", firstFrameUrl.substring(0, 100) + "...");
      }

      // 定义请求格式 - 根据官方示例使用 first_frame_url + last_frame_url
      const requestBody = {
        model: req.body.model || DASHSCOPE_CONFIG.VIDEO_MODEL,
        input: {
          first_frame_url: firstFrameUrl,
          last_frame_url: lastFrameUrl,
          prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic."
        },
        parameters: {
          resolution: clientParams?.resolution || "480P",
          prompt_extend: clientParams?.prompt_extend !== undefined ? clientParams.prompt_extend : true,
          duration: clientParams?.duration || 5,
          seed: clientParams?.seed || 12345
        }
      };

      console.log("[Video] Request body:", JSON.stringify(requestBody, null, 2));

      const response = await axios.post(url, requestBody, {
        headers: {
          'Authorization': `Bearer ${ARK_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        },
        httpsAgent,
        timeout: 60000
      });

      const taskId = response.data?.output?.task_id;
      if (taskId) {
        console.log(`[Video] SUCCESS, taskId: ${taskId}`);
        res.json({ id: taskId, status: 'pending' });
      } else {
        const output = response.data?.output;
        if (output?.task_id) {
           res.json({ id: output.task_id, status: 'pending' });
        } else {
           throw new Error("提交视频任务后未获取到 task_id. 响应: " + JSON.stringify(response.data));
        }
      }
    } catch (error: any) {
      console.error("DashScope Video API Error:", error.response?.data || error.message);

      // 返回更详细的错误信息
      const errorData = error.response?.data;
      const status = error.response?.status || 500;
      
      const requestDetails = {
        model: req.body.model || DASHSCOPE_CONFIG.VIDEO_MODEL,
        baseUrl: ARK_BASE_URL,
        apiKeyPrefix: ARK_API_KEY ? ARK_API_KEY.substring(0, 10) + '...' : 'NOT_SET',
        fullRequestBody: {
          model: req.body.model || DASHSCOPE_CONFIG.VIDEO_MODEL,
          input: {
            first_frame_url: firstFrameUrl.substring(0, 50) + "...",
            last_frame_url: lastFrameUrl.substring(0, 50) + "...",
            prompt: prompt || "..."
          },
          parameters: clientParams
        }
      };

      res.status(status).json({
        error: "提交视频生成失败",
        message: errorData?.message || error.message,
        code: errorData?.code,
        requestDetails: requestDetails,
        details: JSON.stringify(errorData)
      });
    }
  });

  // Generic resource proxy to bypass CORS for assets (images/videos)
  app.get("/api/proxy-resource", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send("Missing url parameter");
    }

    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        httpsAgent,
        timeout: 60000
      });

      // Forward content type
      res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for the proxy
      
      response.data.pipe(res);
    } catch (error: any) {
      console.error("Resource proxy error:", error.message);
      res.status(500).send("Failed to proxy resource");
    }
  });

  // Keep existing proxy-video for compatibility but reuse logic or just keep it
  app.get("/api/proxy-video", async (req, res) => {
    // Redirection to the generic one or just keep it
    const { url } = req.query;
    res.redirect(`/api/proxy-resource?url=${encodeURIComponent(url as string)}`);
  });

  // ── 视频持久化：将临时 URL 下载到服务器本地，返回永久可访问的 URL ──
  const uploadsDir = path.resolve(__dirname, 'uploads', 'videos');
  const frameUploadsDir = path.resolve(__dirname, 'uploads', 'frames');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(frameUploadsDir, { recursive: true });
  const DESKTOP_FRAME_ACTIONS = new Set(['idle', 'tail', 'rubbing', 'blink']);
  const DESKTOP_FRAME_TIMEOUT_MS = Math.max(Number(process.env.MIAO_DESKTOP_FRAME_TIMEOUT_MS || 45000), 5000);
  const DESKTOP_FRAME_MAX_CONCURRENT = Math.max(Number(process.env.MIAO_DESKTOP_FRAME_MAX_CONCURRENT || 1), 1);
  const DESKTOP_FRAME_KEEP_PER_ACTION = Math.max(Number(process.env.MIAO_DESKTOP_FRAME_KEEP_PER_ACTION || 2), 1);
  let desktopFrameJobs = 0;

  const sanitizePathSegment = (value: string) =>
    String(value || '').replace(/[^\w.-]/g, '_').slice(0, 96) || 'item';

  function resolveLocalUploadPath(url: string): string | null {
    if (!url) return null;
    let pathname = url;
    try {
      if (/^https?:\/\//.test(url)) pathname = new URL(url).pathname;
    } catch {}
    if (!pathname.startsWith('/uploads/')) return null;
    const localPath = path.resolve(__dirname, pathname.replace(/^\//, ''));
    const uploadsRoot = path.resolve(__dirname, 'uploads');
    if (!localPath.startsWith(uploadsRoot + path.sep)) return null;
    return fs.existsSync(localPath) ? localPath : null;
  }

  function runCommand(command: string, args: string[], timeoutMs = DESKTOP_FRAME_TIMEOUT_MS) {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGKILL');
        reject(new Error(`${command} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', finish);
      child.on('close', code => {
        if (code === 0) {
          finish();
          return;
        }
        finish(new Error(stderr || `${command} exited with code ${code}`));
      });
    });
  }

  function removeFrameDirectoryFromUrl(frameUrl?: string) {
    if (!frameUrl) return;
    let pathname = frameUrl;
    try {
      if (/^https?:\/\//.test(frameUrl)) pathname = new URL(frameUrl).pathname;
    } catch {}
    if (!pathname.startsWith('/uploads/frames/')) return;
    const localPath = path.resolve(__dirname, pathname.replace(/^\//, ''));
    if (!localPath.startsWith(frameUploadsDir + path.sep)) return;
    fs.rmSync(path.dirname(localPath), { recursive: true, force: true });
  }

  function cleanupFrameGenerations(catId: string, action: string, keepFrameUrls: string[]) {
    const catFrameRoot = path.join(frameUploadsDir, sanitizePathSegment(catId));
    if (!fs.existsSync(catFrameRoot)) return;
    const keepDirs = new Set(
      keepFrameUrls.map((url) => {
        let pathname = url;
        try {
          if (/^https?:\/\//.test(url)) pathname = new URL(url).pathname;
        } catch {}
        const localPath = path.resolve(__dirname, pathname.replace(/^\//, ''));
        return path.dirname(localPath);
      })
    );
    const prefix = `${sanitizePathSegment(action)}_`;
    const entries = fs.readdirSync(catFrameRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
      .map((entry) => {
        const fullPath = path.join(catFrameRoot, entry.name);
        return {
          fullPath,
          mtimeMs: fs.statSync(fullPath).mtimeMs,
        };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    entries.slice(DESKTOP_FRAME_KEEP_PER_ACTION).forEach((entry) => {
      if (!keepDirs.has(entry.fullPath)) {
        fs.rmSync(entry.fullPath, { recursive: true, force: true });
      }
    });
  }

  const persistVideoHandler: express.RequestHandler = async (req, res) => {
    const { videoUrl, catId, action } = req.body;
    if (!videoUrl || !catId || !action) {
      return res.status(400).json({ error: "Missing videoUrl, catId, or action" });
    }

    try {
      const response = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'arraybuffer',
        httpsAgent,
        timeout: 120000,
      });

      const safeCatId = sanitizePathSegment(catId);
      const safeAction = sanitizePathSegment(action);
      const catDir = path.join(uploadsDir, safeCatId);
      fs.mkdirSync(catDir, { recursive: true });

      const filename = `${safeAction}_${Date.now()}.mp4`;
      const filePath = path.join(catDir, filename);
      fs.writeFileSync(filePath, Buffer.from(response.data));

      const permanentUrl = `/uploads/videos/${safeCatId}/${filename}`;
      console.log(`[Persist] Saved ${action} video for cat ${catId}: ${permanentUrl}`);
      res.json({ url: permanentUrl });
    } catch (error: any) {
      console.error(`[Persist] Failed to download video:`, error.message);
      res.status(500).json({ error: "Failed to persist video", originalUrl: videoUrl });
    }
  };

  app.post("/api/persist-video", persistVideoHandler);
  app.post("/api/v1/assets/persist-video", authRequired, persistVideoHandler);

  const getDesktopRequestContext = (req: express.Request, res: express.Response) => {
    const bearerToken = getBearerToken(req);
    const jwtAuth = bearerToken ? verifyToken(bearerToken) : null;
    const validDesktopToken = hasValidDesktopToken(req);
    const localRequest = isLocalDesktopRequest(req);
    const localFallbackAllowed = localRequest;

    if (!jwtAuth && !validDesktopToken && !localFallbackAllowed) {
      res.status(401).json({
        error: "Desktop access is not authorized",
        code: "DESKTOP_UNAUTHORIZED"
      });
      return null;
    }

    const username = String(
      jwtAuth?.username ||
      req.query.username ||
      req.body?.username ||
      process.env.MIAO_DESKTOP_USERNAME ||
      process.env.MIAO_DESKTOP_USER ||
      ""
    ).trim();
    if (!username) {
      res.status(400).json({
        error: "Missing desktop username",
        code: "DESKTOP_USERNAME_REQUIRED"
      });
      return null;
    }

    return { username, jwtAuthed: Boolean(jwtAuth), validDesktopToken, localRequest };
  };

  app.post("/api/desktop/frame-animation", async (req, res) => {
    const desktopContext = getDesktopRequestContext(req, res);
    if (!desktopContext) return;
    const username = desktopContext.username;
    const catId = String(req.body?.catId || "").trim();
    const action = String(req.body?.action || "idle").trim();
    const fps = Math.min(Math.max(Number(req.body?.fps || 10), 4), 16);
    const maxFrames = Math.min(Math.max(Number(req.body?.maxFrames || 90), 12), 180);
    const width = Math.min(Math.max(Number(req.body?.width || 360), 180), 720);

    if (!catId || !action) {
      return res.status(400).json({ error: "Missing catId or action" });
    }
    if (!DESKTOP_FRAME_ACTIONS.has(action)) {
      return res.status(400).json({ error: "Unsupported desktop action", action });
    }
    if (!ffmpegStaticPath) {
      return res.status(500).json({ error: "ffmpeg binary is unavailable" });
    }
    if (desktopFrameJobs >= DESKTOP_FRAME_MAX_CONCURRENT) {
      return res.status(429).json({
        error: "Desktop frame builder is busy",
        code: "DESKTOP_FRAME_BUSY"
      });
    }

    const cats = readJSON<ServerCat[]>(catsFile, []);
    const index = cats.findIndex(cat => cat.userId === username && cat.id === catId);
    if (index < 0) {
      return res.status(404).json({ error: "Cat not found" });
    }

    const cat = cats[index];
    const sourceVideo = cat.videoPaths?.[action] ||
      (action === "idle" ? cat.videoPath || cat.remoteVideoUrl : "");
    const inputPath = resolveLocalUploadPath(sourceVideo || "");
    if (!inputPath) {
      return res.status(400).json({
        error: "Frame animation currently requires a persisted local upload video",
        sourceVideo,
      });
    }

    const safeCatId = sanitizePathSegment(catId);
    const safeAction = sanitizePathSegment(action);
    const previousFrameUrl = cat.frameAnimations?.[action]?.frames?.[0];
    const frameId = `${safeAction}_${Date.now()}`;
    const frameDir = path.join(frameUploadsDir, safeCatId, frameId);
    fs.mkdirSync(frameDir, { recursive: true });

    desktopFrameJobs += 1;
    try {
      // PNG is used for discrete desktop-pet frame sequences. FFmpeg's WebP
      // encoder writes an animated WebP container for multi-frame output, which
      // appears as a single file and is not suitable for frame-by-frame playback.
      const outputPattern = path.join(frameDir, "frame_%04d.png");
      await runCommand(ffmpegStaticPath, [
        "-y",
        "-i", inputPath,
        "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos`,
        "-vframes", String(maxFrames),
        "-compression_level", "6",
        outputPattern,
      ], DESKTOP_FRAME_TIMEOUT_MS);

      const frames = fs.readdirSync(frameDir)
        .filter(file => file.endsWith(".png"))
        .sort()
        .map(file => `/uploads/frames/${safeCatId}/${frameId}/${file}`);

      if (frames.length === 0) {
        throw new Error("No frames generated");
      }

      const frameAnimations = {
        ...(cat.frameAnimations || {}),
        [action]: {
          frames,
          fps,
          format: "png" as const,
          generatedAt: Date.now(),
          sourceVideo,
        },
      };
      cats[index] = {
        ...cat,
        frameAnimations,
        updatedAt: Date.now(),
      };
      writeJSON(catsFile, cats);
      removeFrameDirectoryFromUrl(previousFrameUrl);
      cleanupFrameGenerations(catId, action, frames);

      res.json({
        cat: cats[index],
        animation: frameAnimations[action],
      });
    } catch (error: any) {
      fs.rmSync(frameDir, { recursive: true, force: true });
      console.error("[Desktop Frame] Failed to build frame animation:", error.message);
      res.status(500).json({ error: "Failed to build frame animation", message: error.message });
    } finally {
      desktopFrameJobs = Math.max(desktopFrameJobs - 1, 0);
    }
  });

  const getDesktopCats = (username?: string) => {
    const cats = readJSON<ServerCat[]>(catsFile, []);
    const candidates = username ? cats.filter(cat => cat.userId === username) : cats;
    return candidates
      .filter(item => item && item.id)
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  };

  app.get("/api/desktop/cats", (req, res) => {
    const desktopContext = getDesktopRequestContext(req, res);
    if (!desktopContext) return;
    const username = desktopContext.username;
    const cats = getDesktopCats(username || undefined).map((cat) => {
      const { userId, ...publicCat } = cat;
      return { ...publicCat, ownerId: userId };
    });

    res.json({ cats });
  });

  app.get("/api/desktop/active-cat", (req, res) => {
    const desktopContext = getDesktopRequestContext(req, res);
    if (!desktopContext) return;
    const username = desktopContext.username;
    const catId = String(req.query.catId || "").trim();
    const cats = getDesktopCats(username || undefined);
    const cat = catId
      ? cats.find(item => item.id === catId)
      : cats[0];

    if (!cat) {
      return res.status(404).json({
        error: "No cat found",
        code: "DESKTOP_CAT_NOT_FOUND"
      });
    }

    const { userId, ...publicCat } = cat;
    res.json({ cat: publicCat, userId });
  });

  app.use('/uploads', express.static(path.resolve(__dirname, 'uploads'), {
    maxAge: '30d',
    immutable: true,
  }));

  const desktopPetAssetCandidates = [
    process.env.MIAO_DESKTOP_PETS_DIR,
    path.resolve(__dirname, 'public', 'desktop-pets', 'pets'),
    path.resolve(__dirname, 'dist', 'desktop-pets', 'pets'),
    // Backward compatibility for local workspaces created before the assets
    // were moved into this repository.
    path.resolve(__dirname, '..', 'pic', 'pets', 'pets'),
  ].filter(Boolean) as string[];
  const desktopPetsAssetsDir = desktopPetAssetCandidates.find((candidate) => fs.existsSync(candidate)) ||
    desktopPetAssetCandidates[0];
  const listDesktopPets = () => {
    if (!fs.existsSync(desktopPetsAssetsDir)) return [];
    return fs.readdirSync(desktopPetsAssetsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const manifestPath = path.join(desktopPetsAssetsDir, entry.name, 'pet.json');
        if (!fs.existsSync(manifestPath)) return null;
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          return {
            id: String(manifest.id || entry.name),
            displayName: String(manifest.displayName || manifest.id || entry.name),
            description: manifest.description ? String(manifest.description) : '',
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  };

  app.get('/api/desktop/pets', (_req, res) => {
    res.json({ pets: listDesktopPets() });
  });

  if (fs.existsSync(desktopPetsAssetsDir)) {
    app.use('/desktop-pet-assets/pets', express.static(desktopPetsAssetsDir, {
      maxAge: '1h',
    }));
  } else {
    console.warn(`[Desktop Pet] Sprite assets directory not found: ${desktopPetsAssetsDir}`);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 生产环境下，由于 server.ts 在根目录运行，静态资源始终在 dist 文件夹中
    const distPath = path.resolve(__dirname, 'dist');
    console.log(`[Server] Production mode: serving static files from ${distPath}`);
    
    // Vite 哈希资源（JS/CSS）：强缓存1年，浏览器无需重新验证
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }));
    // 其他静态文件（图片、manifest 等）：短缓存
    app.use(express.static(distPath, {
      maxAge: '1h',
    }));
    // index.html：不缓存，确保用户总是拿到最新版本
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

startServer();
