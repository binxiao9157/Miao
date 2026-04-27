import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import https from "https";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import FormData from 'form-data';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // ── JSON 文件数据库 ──
  const dataDir = path.resolve(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const usersFile = path.join(dataDir, 'users.json');
  const catsFile = path.join(dataDir, 'cats.json');
  const diariesFile = path.join(dataDir, 'diaries.json');
  const lettersFile = path.join(dataDir, 'letters.json');
  const pointsFile = path.join(dataDir, 'points.json');

  function readJSON<T>(file: string, fallback: T): T {
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch { return fallback; }
  }
  function writeJSON(file: string, data: any) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  }

  interface ServerUser { username: string; nickname: string; avatar: string; password: string; }
  interface ServerCat {
    id: string; userId: string; name: string; breed: string; color: string;
    avatar: string; source: string; createdAt?: number;
    videoPath?: string; videoPaths?: Record<string, string>; remoteVideoUrl?: string;
    placeholderImage?: string; anchorFrame?: string; isUnlocking?: boolean;
  }

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

  const ARK_API_KEY = DASHSCOPE_CONFIG.API_KEY;
  const ARK_BASE_URL = DASHSCOPE_CONFIG.BASE_URL;

  // 辅助函数：将 fileid 转换为临时的公网 HTTP URL
  const getFileUrl = async (fileId: string): Promise<string> => {
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

    if (errorCode === "Arrearage" || errorMessage?.toLowerCase().includes("balance")) {
      return res.status(403).json({
        error: "账户欠费",
        message: "您的阿里云账户已欠费，请充值后重试。",
        code: "ARREARAGE",
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
  fs.mkdirSync(uploadsDir, { recursive: true });

  app.post("/api/persist-video", async (req, res) => {
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

      const catDir = path.join(uploadsDir, catId);
      fs.mkdirSync(catDir, { recursive: true });

      const filename = `${action}_${Date.now()}.mp4`;
      const filePath = path.join(catDir, filename);
      fs.writeFileSync(filePath, Buffer.from(response.data));

      const permanentUrl = `/uploads/videos/${catId}/${filename}`;
      console.log(`[Persist] Saved ${action} video for cat ${catId}: ${permanentUrl}`);
      res.json({ url: permanentUrl });
    } catch (error: any) {
      console.error(`[Persist] Failed to download video:`, error.message);
      res.status(500).json({ error: "Failed to persist video", originalUrl: videoUrl });
    }
  });

  app.use('/uploads', express.static(path.resolve(__dirname, 'uploads'), {
    maxAge: '30d',
    immutable: true,
  }));

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
