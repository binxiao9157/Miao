import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import https from "https";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import * as tencentSms from "tencentcloud-sdk-nodejs-sms";

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";
const TEST_SMS_CODE = process.env.TEST_SMS_CODE || "888888";
const SMS_ENABLED = process.env.SMS_ENABLED === "true";
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();
const sendStats = new Map<string, { lastSentAt: number; countToday: number; date: string }>();

// 腾讯云 SMS 客户端（仅在 SMS_ENABLED=true 时初始化）
let smsClient: InstanceType<typeof tencentSms.sms.v20210111.Client> | null = null;
if (SMS_ENABLED) {
  const SmsClient = tencentSms.sms.v20210111.Client;
  smsClient = new SmsClient({
    credential: {
      secretId: process.env.SMS_SECRET_ID || "",
      secretKey: process.env.SMS_SECRET_KEY || "",
    },
    region: process.env.SMS_REGION || "ap-guangzhou",
  });
  console.log("[SMS] 腾讯云短信服务已启用");
} else {
  console.log("[SMS] 模拟模式（SMS_ENABLED=false），验证码仅打印到控制台");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 100,
    timeout: 60000
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      hasApiKey: !!process.env.VOLC_API_KEY
    });
  });

  // Auth: Send verification code
  app.post("/api/auth/send-code", async (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "请输入有效的手机号", code: "INVALID_PHONE" });
    }

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const stats = sendStats.get(phone) || { lastSentAt: 0, countToday: 0, date: today };

    // Reset daily count if date changed
    if (stats.date !== today) {
      stats.countToday = 0;
      stats.date = today;
    }

    // 60s throttle
    if (now - stats.lastSentAt < 60000) {
      return res.status(429).json({ error: "操作过于频繁，请 60 秒后再试", code: "TOO_MANY_REQUESTS_60S" });
    }

    // 24h limit (10 times)
    if (stats.countToday >= 10) {
      return res.status(429).json({ error: "今日发送次数已达上限（每天最多10次）", code: "TOO_MANY_REQUESTS_24H" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 5 * 60000; // 5 mins

    verificationCodes.set(phone, { code, expiresAt });
    
    // Update stats
    stats.lastSentAt = now;
    stats.countToday += 1;
    sendStats.set(phone, stats);

    // 发送短信
    if (SMS_ENABLED && smsClient) {
      try {
        const sendResult = await smsClient.SendSms({
          SmsSdkAppId: process.env.SMS_SDK_APP_ID || "",
          SignName: process.env.SMS_SIGN_NAME || "",
          TemplateId: process.env.SMS_TEMPLATE_ID || "",
          TemplateParamSet: [code, "5"],
          PhoneNumberSet: [`+86${phone}`],
        });
        const statusCode = sendResult.SendStatusSet?.[0]?.Code;
        if (statusCode !== "Ok") {
          const statusMsg = sendResult.SendStatusSet?.[0]?.Message || "未知错误";
          console.error(`[SMS] 发送失败: ${statusCode} - ${statusMsg}`);
          return res.status(500).json({ error: `短信发送失败: ${statusMsg}`, code: "SMS_SEND_FAILED" });
        }
        console.log(`[SMS] 验证码已发送至 ${phone}`);
      } catch (smsError: any) {
        console.error("[SMS] 腾讯云 SDK 调用异常:", smsError.message);
        return res.status(500).json({ error: "短信服务暂不可用，请稍后重试", code: "SMS_SERVICE_ERROR" });
      }
    } else {
      // 模拟模式：验证码仅打印到控制台
      console.log("==========================================");
      console.log(`[SMS-MOCK] Verification code for ${phone}: ${code}`);
      console.log(`[SMS-MOCK] Expires at: ${new Date(expiresAt).toLocaleTimeString()}`);
      console.log("==========================================");
    }

    const responseBody: Record<string, string> = {
      message: "验证码已发送",
      status: "ok"
    };
    // 仅模拟模式下返回万能码，方便开发调试
    if (!SMS_ENABLED) {
      responseBody.mockCode = TEST_SMS_CODE;
    }
    res.json(responseBody);
  });

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    const { phone, code, password, nickname } = req.body;

    if (!phone || !code || !nickname) {
      return res.status(400).json({ error: "参数不完整", code: "MISSING_PARAMS" });
    }

    // Verify code — 万能码仅在模拟模式下可用
    const cached = verificationCodes.get(phone);
    const isTestCode = !SMS_ENABLED && code === TEST_SMS_CODE;

    const isCodeValid = isTestCode || (cached && cached.code === code && Date.now() <= cached.expiresAt);

    if (!isCodeValid) {
      return res.status(400).json({ error: "验证码无效或已过期", code: "INVALID_CODE" });
    }

    try {
      // Check if user exists
      let user = await prisma.user.findUnique({ where: { phone } });
      if (user) {
        // 模拟模式下测试码可当登录用
        if (isTestCode) {
          const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
          return res.json({
            message: "登录成功（通过测试码）",
            token,
            user: {
              id: user.id,
              phone: user.phone,
              nickname: user.nickname,
              avatar: user.avatar,
              username: user.username || null
            }
          });
        }
        return res.status(400).json({ error: "该手机号已注册", code: "USER_EXISTS" });
      }

      // Hash password if provided
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      // Create user
      user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
          nickname,
          avatar: `https://picsum.photos/seed/${phone}/200`
        }
      });

      // Clear code from cache
      verificationCodes.delete(phone);

      // Sign token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

      res.json({
        message: "注册成功",
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          username: user.username || null
        }
      });
    } catch (error: any) {
      console.error("[AUTH] Registration error:", error?.message || error, error?.stack);
      res.status(500).json({ error: "注册失败，服务器内部错误" });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { phone, username, code, password } = req.body;

    if (!phone && !username) {
      return res.status(400).json({ error: "手机号或用户名不能为空", code: "MISSING_IDENTITY" });
    }

    try {
      let user = null;
      if (phone) {
        user = await prisma.user.findUnique({ where: { phone } });
      } else if (username) {
        // 通用 username 查找：先精确匹配 username 字段，再尝试 phone/nickname
        user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: username },
                { nickname: username }
              ]
            }
          });
        }
      }

      // Mode A: Verification Code Login
      if (code) {
        if (!phone) {
          return res.status(400).json({ error: "验证码登录需要提供手机号", code: "PHONE_REQUIRED" });
        }
        const cached = verificationCodes.get(phone);
        const isTestCode = !SMS_ENABLED && code === TEST_SMS_CODE;

        const isCodeValid = isTestCode || (cached && cached.code === code && Date.now() <= cached.expiresAt);

        if (!isCodeValid) {
          return res.status(400).json({ error: "验证码无效或已过期", code: "INVALID_CODE" });
        }

        // Auto-register if user doesn't exist
        if (!user) {
          user = await prisma.user.create({
            data: {
              phone,
              nickname: `手机用户${phone.slice(-4)}`,
              avatar: `https://picsum.photos/seed/${phone}/200`
            }
          });
        }

        // Clear code
        verificationCodes.delete(phone);
      } 
      // Mode B: Password Login
      else if (password) {
        if (!user) {
          return res.status(404).json({ error: "用户不存在", code: "USER_NOT_FOUND" });
        }
        if (!user.password) {
          return res.status(400).json({ error: "该账户未设置密码，请使用验证码登录", code: "NO_PASSWORD_SET" });
        }
        // 兼容旧明文密码：检测是否为 bcrypt hash（以 $2 开头）
        const isBcryptHash = user.password.startsWith('$2');
        if (!isBcryptHash) {
          // 明文密码：直接比较，成功后自动迁移为 bcrypt hash
          if (password !== user.password) {
            return res.status(400).json({ error: "密码不正确", code: "INVALID_PASSWORD" });
          }
          const migrated = await bcrypt.hash(password, 10);
          await prisma.user.update({ where: { id: user.id }, data: { password: migrated } });
          console.log(`[AUTH] 用户 ${user.id} 密码已从明文自动迁移为 bcrypt`);
        } else {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(400).json({ error: "密码不正确", code: "INVALID_PASSWORD" });
          }
        }
      } 
      else {
        return res.status(400).json({ error: "请输入验证码或密码", code: "MISSING_AUTH_METHOD" });
      }

      // Sign token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

      res.json({
        message: "登录成功",
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          username: user.username || null
        }
      });
    } catch (error: any) {
      console.error("[AUTH] Login error:", error?.message || error, error?.stack);
      res.status(500).json({ error: "登录失败，服务器内部错误" });
    }
  });

  // Auth: Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    const { phone, code, newPassword } = req.body;

    if (!phone || !code || !newPassword) {
      return res.status(400).json({ error: "参数不完整", code: "MISSING_PARAMS" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "密码长度至少为6位", code: "PASSWORD_TOO_SHORT" });
    }

    // Verify code
    const cached = verificationCodes.get(phone);
    const isTestCode = !SMS_ENABLED && code === TEST_SMS_CODE;
    const isCodeValid = isTestCode || (cached && cached.code === code && Date.now() <= cached.expiresAt);

    if (!isCodeValid) {
      return res.status(400).json({ error: "验证码无效或已过期", code: "INVALID_CODE" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        return res.status(404).json({ error: "该手机号未注册", code: "USER_NOT_FOUND" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { phone },
        data: { password: hashedPassword }
      });

      // Clear code
      verificationCodes.delete(phone);

      res.json({ message: "密码重置成功" });
    } catch (error: any) {
      console.error("[AUTH] Reset password error:", error?.message || error, error?.stack);
      res.status(500).json({ error: "重置密码失败，服务器内部错误" });
    }
  });

  // Auth: Change Password (requires current password)
  app.post("/api/auth/change-password", async (req, res) => {
    const { phone, currentPassword, newPassword } = req.body;

    if (!phone || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "参数不完整", code: "MISSING_PARAMS" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "新密码长度至少为6位", code: "PASSWORD_TOO_SHORT" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        return res.status(404).json({ error: "用户不存在", code: "USER_NOT_FOUND" });
      }
      if (!user.password) {
        return res.status(400).json({ error: "该账户未设置密码", code: "NO_PASSWORD_SET" });
      }

      // 兼容旧明文密码：与 login 端点保持一致的检测逻辑
      const isBcryptHash = user.password.startsWith('$2');
      if (!isBcryptHash) {
        if (currentPassword !== user.password) {
          return res.status(400).json({ error: "当前密码错误", code: "INVALID_PASSWORD" });
        }
      } else {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: "当前密码错误", code: "INVALID_PASSWORD" });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { phone },
        data: { password: hashedPassword }
      });

      res.json({ message: "密码修改成功" });
    } catch (error: any) {
      console.error("[AUTH] Change password error:", error?.message || error, error?.stack);
      res.status(500).json({ error: "修改密码失败，服务器内部错误" });
    }
  });

  // Auth: Bind Phone (update phone for existing user)
  app.put("/api/auth/bind-phone", async (req, res) => {
    const { userId, phone, code } = req.body;

    if (!userId || !phone || !code) {
      return res.status(400).json({ error: "参数不完整", code: "MISSING_PARAMS" });
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "手机号格式不正确", code: "INVALID_PHONE" });
    }

    // Verify code
    const cached = verificationCodes.get(phone);
    const isTestCode = !SMS_ENABLED && code === TEST_SMS_CODE;
    const isCodeValid = isTestCode || (cached && cached.code === code && Date.now() <= cached.expiresAt);

    if (!isCodeValid) {
      return res.status(400).json({ error: "验证码无效或已过期", code: "INVALID_CODE" });
    }

    try {
      // Check if phone is already taken by another user
      const existingUser = await prisma.user.findUnique({ where: { phone } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "该手机号已被其他账号使用", code: "PHONE_TAKEN" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { phone }
      });

      verificationCodes.delete(phone);

      res.json({ message: "手机号绑定成功", phone });
    } catch (error: any) {
      console.error("[AUTH] Bind phone error:", error?.message || error, error?.stack);
      res.status(500).json({ error: "绑定手机号失败，服务器内部错误" });
    }
  });

  const ARK_API_KEY = (process.env.VOLC_API_KEY || process.env.VITE_VOLC_API_KEY || "").trim();
  const ARK_MODEL_ID = (process.env.VOLC_MODEL_ID || process.env.VITE_VOLC_MODEL_ID || "doubao-seedance-1-5-pro-251215").trim();
  const ARK_T2I_MODEL_ID = (process.env.VOLC_T2I_MODEL_ID || process.env.VITE_VOLC_T2I_MODEL_ID || "doubao-t2i-v2").trim();

  // 确保 ARK_BASE_URL 是一个有效的绝对 URL，且移除末尾斜杠
  let ARK_BASE_URL = (process.env.VOLC_ENDPOINT || process.env.VITE_VOLC_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks").trim().replace(/\/$/, '');
  if (!ARK_BASE_URL.startsWith('http')) {
    console.warn(`[Server] Warning: ARK_BASE_URL "${ARK_BASE_URL}" is not a valid URL. Falling back to default.`);
    ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";
  }

  console.log("Server Config:", {
    hasApiKey: !!ARK_API_KEY,
    modelId: ARK_MODEL_ID,
    t2iModelId: ARK_T2I_MODEL_ID,
    isEndpointId: ARK_MODEL_ID.startsWith("ep-"),
    baseUrl: ARK_BASE_URL,
    nodeEnv: process.env.NODE_ENV
  });

  const ARK_T2I_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

  // Helper to send standardized error responses
  const sendError = (res: express.Response, error: any, defaultMessage: string) => {
    const status = error.response?.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const errorData = error.response?.data;
    
    // Check for specific Volcengine error codes
    const errorCode = errorData?.error?.code || errorData?.code;
    const errorMessage = errorData?.error?.message || errorData?.message || error.message;

    if (errorCode === "AccountBalanceInsufficient" || errorMessage?.toLowerCase().includes("balance")) {
      return res.status(403).json({ 
        error: "账户余额不足",
        message: "您的火山引擎账户余额不足，请及时充值以恢复服务。",
        code: "BALANCE_INSUFFICIENT"
      });
    }

    if (errorCode === "QuotaExceeded" || errorMessage?.toLowerCase().includes("quota")) {
      return res.status(403).json({ 
        error: "API 额度已耗尽",
        message: "您的资源包额度已用完或 QPS 超过限制，请检查火山引擎控制台。",
        code: "QUOTA_EXCEEDED"
      });
    }

    if (errorCode === "AccessDenied" || errorCode === "Forbidden" || status === 403) {
      return res.status(403).json({
        error: "访问被拒绝 (403)",
        message: "鉴权失败。请检查 API Key 是否有效，以及该 Key 是否拥有访问指定推理接入点 (Model ID) 的权限。",
        code: "ACCESS_DENIED"
      });
    }

    if (errorCode === "InvalidParameter") {
      return res.status(400).json({
        error: `参数错误: ${errorMessage}`,
        code: "INVALID_PARAMETER"
      });
    }

    if (status === 404) {
      return res.status(404).json({
        error: "API 端点未找到 (404)。请检查推理接入点 ID 是否正确。",
        code: "NOT_FOUND"
      });
    }

    res.status(status).json({ 
      error: defaultMessage,
      message: errorMessage
      // detail 字段已移除：生产环境不返回上游错误原始数据
    });
  };

  // API Route for Image Generation (Ark T2I)
  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;
    
    // 恢复前置校验，防止空指针
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "缺少必要参数: prompt", code: "INVALID_PARAMETER" });
    }

    try {
      if (!ARK_API_KEY) {
        return res.status(500).json({ error: "服务器未配置 API Key" });
      }

      const requestBody = {
        model: req.body.model || ARK_T2I_MODEL_ID,
        prompt: prompt,
        size: "1024x1024"
      };

      console.log("Submitting T2I task to Ark:", {
        model: requestBody.model,
        url: ARK_T2I_URL,
        prompt: prompt.substring(0, 50) + "..."
      });

      let response;
      let retries = 2;
      while (retries >= 0) {
        try {
          response = await axios.post(ARK_T2I_URL, requestBody, {
            headers: {
              'Authorization': `Bearer ${ARK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            httpsAgent,
            timeout: 60000
          });
          break;
        } catch (error: any) {
          if (error.code === 'ECONNRESET' && retries > 0) {
            console.warn(`Ark T2I Connection Reset, retrying... (${retries} left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw new Error("Failed to get response from Ark T2I API after retries");
      }

      const imageUrl = response.data?.data?.[0]?.url;
      if (imageUrl) {
        console.log("Ark T2I Success (Sync):", imageUrl.substring(0, 50) + "...");
        res.json({ id: `url:${imageUrl}`, status: 'succeeded', image_url: imageUrl });
      } else {
        throw new Error("未获取到生成的图片地址");
      }
    } catch (error: any) {
      console.error("Ark T2I API Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      sendError(res, error, "生成图片失败");
    }
  });

  // SSRF Protection: Validate taskId format
  const isValidTaskId = (id: string) => {
    if (id.startsWith('url:')) {
      const url = id.substring(4);
      // 仅允许 HTTPS URL，且必须以 https:// 开头
      if (!/^https:\/\/[a-zA-Z0-9]/.test(url)) return false;
      return true;
    }
    // 修复正则漏洞：支持下划线并严格限制 128 位长度
    return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
  };

  // Image status polling
  app.get("/api/image-status/:taskId", async (req, res) => {
    const { taskId } = req.params;

    if (!isValidTaskId(taskId)) {
      return res.status(400).json({ error: "无效的任务 ID 格式" });
    }
    
    if (taskId.startsWith('url:')) {
      const url = taskId.substring(4);
      return res.json({ status: 'succeeded', image_url: url });
    }

    try {
      let response;
      let retries = 2;
      while (retries >= 0) {
        try {
          response = await axios.get(`${ARK_BASE_URL}/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${ARK_API_KEY}`
            },
            httpsAgent
          });
          break;
        } catch (error: any) {
          if (error.code === 'ECONNRESET' && retries > 0) {
            console.warn(`Ark Image Status Connection Reset, retrying... (${retries} left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }
      if (!response) throw new Error("Failed to get image status after retries");
      res.json(response.data);
    } catch (error: any) {
      sendError(res, error, "查询图片状态失败");
    }
  });

  // API Route for Video Generation (Ark Task API)
  app.post("/api/generate-video", async (req, res) => {
    const { prompt, negative_prompt, image_base64, parameters } = req.body;
    
    // 恢复 image_base64 非空校验
    if (!image_base64) {
      return res.status(400).json({ error: "缺少必要参数: image_base64", code: "INVALID_PARAMETER" });
    }

    try {
      if (!ARK_API_KEY) {
        console.error("Missing VOLC_API_KEY environment variable");
        return res.status(500).json({ error: "服务器未配置 API Key，请检查环境变量" });
      }

      let dataUrl = "";
      if (image_base64) {
        let cleanBase64 = image_base64.replace(/\s/g, '');
        
        if (cleanBase64.startsWith('http')) {
          dataUrl = cleanBase64;
        } else {
          let mimeType = 'image/png';
          if (cleanBase64.includes('base64,')) {
            const parts = cleanBase64.split('base64,');
            const header = parts[0];
            cleanBase64 = parts[1];
            const match = header.match(/data:([^;]+);/);
            if (match) mimeType = match[1];
          }
          dataUrl = `data:${mimeType};base64,${cleanBase64}`;
        }
      }

      const contentArray: any[] = [];
      if (dataUrl) {
        contentArray.push({
          type: "image_url",
          image_url: { url: dataUrl }
        });
      }
      contentArray.push({
        type: "text",
        text: prompt || "A high quality video of this cat, cinematic lighting, realistic."
      });

      const requestBody: any = {
        model: req.body.model || ARK_MODEL_ID,
        content: contentArray,
        parameters: {
          size: parameters?.resolution === "480p" ? "720x1280" : (parameters?.size || "720x1280"),
          seed: parameters?.seed || 12345,
          duration: parameters?.duration || 5,
          fps: 25,
          first_frame_constraint: true
        }
      };
      
      if (negative_prompt) {
        requestBody.parameters.negative_prompt = negative_prompt;
      }

      console.log("Submitting task to Ark:", {
        model: requestBody.model,
        url: ARK_BASE_URL,
        payloadSize: JSON.stringify(requestBody).length
      });

      let response;
      let retries = 2;
      while (retries >= 0) {
        try {
          response = await axios.post(
            ARK_BASE_URL,
            requestBody,
            {
              headers: {
                'Authorization': `Bearer ${ARK_API_KEY}`,
                'Content-Type': 'application/json'
              },
              httpsAgent,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              timeout: 120000 // 2 minutes for submission
            }
          );
          break; // Success, exit loop
        } catch (error: any) {
          if (error.code === 'ECONNRESET' && retries > 0) {
            console.warn(`Ark API Connection Reset, retrying... (${retries} left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error; // Re-throw if not ECONNRESET or no retries left
        }
      }

      if (!response) {
        throw new Error("Failed to get response from Ark API after retries");
      }

      console.log("Ark Submit Success:", response.data.id || "No ID");
      res.json(response.data);
    } catch (error: any) {
      console.error("Ark API Error (Video Submit):", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // 针对 SetLimitExceeded 错误提供友好提示
      if (error.response?.data?.code === 'SetLimitExceeded') {
        return res.status(403).json({
          error: "账号推理限额已达上限",
          message: "您的火山引擎账号已触发安全限额保护。请前往火山引擎方舟控制台，在『模型接入』页面关闭『安全体验模式』或调高限额。",
          raw: error.response.data
        });
      }
      
      sendError(res, error, "提交任务失败");
    }
  });

  // Polling endpoint
  app.get("/api/video-status/:taskId", async (req, res) => {
    const { taskId } = req.params;

    if (!isValidTaskId(taskId)) {
      return res.status(400).json({ error: "无效的任务 ID 格式" });
    }

    try {
      let response;
      let retries = 2;
      while (retries >= 0) {
        try {
          response = await axios.get(
            `${ARK_BASE_URL}/${taskId}`,
            {
              headers: {
                'Authorization': `Bearer ${ARK_API_KEY}`
              },
              httpsAgent,
              timeout: 60000
            }
          );
          break;
        } catch (error: any) {
          if (error.code === 'ECONNRESET' && retries > 0) {
            console.warn(`Ark Video Status Connection Reset, retrying... (${retries} left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }
      
      if (!response) throw new Error("Failed to get video status after retries");
      
      if (response.data.status === 'failed') {
        console.error(`Ark Task ${taskId} FAILED. Full Response:`, JSON.stringify(response.data, null, 2));
        const arkError = response.data.error || response.data.message || "Unknown Ark Error";
        
        // 针对任务执行过程中的限额错误提供友好提示
        if (typeof arkError === 'object' && arkError.code === 'SetLimitExceeded') {
          return res.status(200).json({
            ...response.data,
            error: "账号推理限额已达上限。请前往火山引擎方舟控制台，在『模型接入』页面关闭『安全体验模式』或调高限额。"
          });
        }

        return res.status(200).json({
          ...response.data,
          error: typeof arkError === 'string' ? arkError : JSON.stringify(arkError)
        });
      }

      console.log(`Ark Status for ${taskId}:`, response.data.status);
      res.json(response.data);
    } catch (error: any) {
      console.error("Ark Status Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      sendError(res, error, "查询状态失败");
    }
  });

  // Video proxy to bypass CORS for frame extraction
  app.get("/api/proxy-video", async (req, res) => {
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
        timeout: 60000 // 增加到 60 秒
      });

      // Forward headers
      res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
      res.setHeader('Access-Control-Allow-Origin', 'https://www.mmdd10.tech');
      
      response.data.pipe(res);
    } catch (error: any) {
      console.error("Video proxy error:", error.message);
      res.status(500).send("Failed to proxy video");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
