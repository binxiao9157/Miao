import express from "express";
import path from "path";
import axios from "axios";
import https from "https";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      hasApiKey: !!process.env.VOLC_API_KEY
    });
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
