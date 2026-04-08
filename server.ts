import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const ARK_API_KEY = process.env.VOLC_API_KEY;
  const ARK_MODEL_ID = process.env.VOLC_MODEL_ID || "doubao-seedance-1-5-pro-251215";
  const ARK_T2I_MODEL_ID = process.env.VOLC_T2I_MODEL_ID || "doubao-t2i-v2";
  // 还原为用户确认可用的 Seedance 专用任务接口端点
  const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

  console.log("Server Config:", {
    hasApiKey: !!ARK_API_KEY,
    modelId: ARK_MODEL_ID,
    t2iModelId: ARK_T2I_MODEL_ID,
    isEndpointId: ARK_MODEL_ID.startsWith("ep-"),
    baseUrl: ARK_BASE_URL,
    nodeEnv: process.env.NODE_ENV
  });

  // Volcengine AccessKey and SecretKey should be provided via environment variables
  const VOLC_ACCESS_KEY = process.env.VOLC_ACCESS_KEY;
  const VOLC_SECRET_KEY = process.env.VOLC_SECRET_KEY;

  const ARK_T2I_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

  // API Route for Image Generation (Ark T2I)
  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;
    const finalApiKey = req.headers['x-volc-api-key'] as string || ARK_API_KEY;
    const finalModelId = req.headers['x-volc-t2i-model-id'] as string || ARK_T2I_MODEL_ID;

    try {
      if (!finalApiKey) {
        return res.status(500).json({ error: "服务器未配置 API Key" });
      }

      const requestBody = {
        model: finalModelId,
        prompt: prompt,
        size: "1024x1024"
      };

      console.log("Submitting T2I task to Ark:", {
        model: finalModelId,
        url: ARK_T2I_URL,
        prompt: prompt.substring(0, 50) + "..."
      });

      const response = await axios.post(ARK_T2I_URL, requestBody, {
        headers: {
          'Authorization': `Bearer ${finalApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      // Synchronous response: return a "fake" taskId that is actually the URL
      // or return a structure that the frontend can handle.
      // To maintain compatibility with polling, we'll return the data directly
      // but the frontend will need to handle it.
      // Actually, let's return a response that looks like a task submission
      // but we'll modify the polling endpoint to handle it.
      
      const imageUrl = response.data?.data?.[0]?.url;
      if (imageUrl) {
        console.log("Ark T2I Success (Sync):", imageUrl.substring(0, 50) + "...");
        // Return a special ID that indicates it's a direct URL
        res.json({ id: `url:${imageUrl}`, status: 'succeeded', image_url: imageUrl });
      } else {
        throw new Error("未获取到生成的图片地址");
      }
    } catch (error: any) {
      const errorResponse = error.response?.data;
      console.error("Ark T2I API Error:", {
        message: error.message,
        status: error.response?.status,
        data: errorResponse
      });
      res.status(500).json({ error: errorResponse || error.message });
    }
  });

  // Image status polling
  app.get("/api/image-status/:taskId", async (req, res) => {
    const { taskId } = req.params;
    
    // Handle the "url:" prefix for synchronous results
    if (taskId.startsWith('url:')) {
      const url = taskId.substring(4);
      return res.json({ status: 'succeeded', image_url: url });
    }

    const finalApiKey = req.headers['x-volc-api-key'] as string || ARK_API_KEY;

    try {
      const response = await axios.get(`${ARK_BASE_URL}/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${finalApiKey}`
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

  // API Route for Video Generation (Ark Task API)
  app.post("/api/generate-video", async (req, res) => {
    const { prompt, negative_prompt, image_base64, parameters } = req.body;

    try {
      if (!ARK_API_KEY) {
        console.error("Missing VOLC_API_KEY environment variable");
        return res.status(500).json({ error: "服务器未配置 API Key，请检查环境变量" });
      }

      // 确保 base64 字符串没有多余的空格或换行符，并提取纯 base64 数据
      let dataUrl = "";
      if (image_base64) {
        let cleanBase64 = image_base64.replace(/\s/g, '');
        
        if (cleanBase64.startsWith('http')) {
          // 如果是远程 URL，直接使用
          dataUrl = cleanBase64;
        } else {
          let mimeType = 'image/png'; // Default
          if (cleanBase64.includes('base64,')) {
            const parts = cleanBase64.split('base64,');
            const header = parts[0];
            cleanBase64 = parts[1];
            
            // Extract MIME type from header like "data:image/jpeg;"
            const match = header.match(/data:([^;]+);/);
            if (match) {
              mimeType = match[1];
            }
          }
          dataUrl = `data:${mimeType};base64,${cleanBase64}`;
        }
      }

      // Seedance 1.5 Pro V3 任务接口规范
      const contentArray: any[] = [];
      if (dataUrl) {
        contentArray.push({
          type: "image_url",
          image_url: {
            url: dataUrl
          }
        });
      }
      contentArray.push({
        type: "text",
        text: prompt || "A high quality video of this cat, cinematic lighting, realistic."
      });

      const requestBody: any = {
        model: ARK_MODEL_ID,
        content: contentArray,
        parameters: {
          size: parameters?.resolution === "480p" ? "854x480" : (parameters?.size || "854x480"),
          seed: parameters?.seed || 12345,
          duration: parameters?.duration || 5,
          audio: parameters?.audio || false,
          // 开启首帧约束标记 (Seedance 专用)
          first_frame_constraint: true,
          // 注入负向提示词
          negative_prompt: negative_prompt || ""
        }
      };

      // Allow frontend to override API key and model ID for demo purposes
      const frontendApiKey = req.headers['x-volc-api-key'] as string;
      const frontendModelId = req.headers['x-volc-model-id'] as string;
      const frontendAccessKey = req.headers['x-volc-access-key'] as string;
      const frontendSecretKey = req.headers['x-volc-secret-key'] as string;
      
      const finalApiKey = frontendApiKey || ARK_API_KEY;
      const finalModelId = frontendModelId || ARK_MODEL_ID;

      console.log("Submitting task to Ark:", {
        model: finalModelId,
        url: ARK_BASE_URL,
        requestBody: {
          ...requestBody,
          content: requestBody.content.map((c: any) => 
            c.type === 'image_url' ? { ...c, image_url: { url: c.image_url.url.substring(0, 50) + "..." } } : c
          )
        },
        image_length: dataUrl ? dataUrl.length : 0,
        image_size_mb: dataUrl ? (dataUrl.length / 1024 / 1024).toFixed(2) + "MB" : "0MB",
        usingFrontendKey: !!frontendApiKey,
        usingFrontendModelId: !!frontendModelId,
        hasFrontendAccessKey: !!frontendAccessKey,
        hasFrontendSecretKey: !!frontendSecretKey
      });

      const response = await axios.post(
        ARK_BASE_URL,
        { ...requestBody, model: finalModelId },
        {
          headers: {
            'Authorization': `Bearer ${finalApiKey}`,
            'Content-Type': 'application/json'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 300000 // Increased to 300 seconds
        }
      );

      console.log("Ark Submit Success:", response.data.id || "No ID");
      res.json(response.data);
    } catch (error: any) {
      const errorResponse = error.response?.data;
      const errorMessage = error.message;
      const errorUrl = error.config?.url;
      
      console.error("Ark API Error:", {
        message: errorMessage,
        url: errorUrl,
        status: error.response?.status,
        data: errorResponse
      });
      
      // Check for quota or balance issues
      const isBalanceError = errorResponse && (
        errorResponse.error?.code === "AccountBalanceInsufficient" || 
        errorResponse.code === "AccountBalanceInsufficient" ||
        (errorResponse.message && errorResponse.message.toLowerCase().includes("balance"))
      );

      const isQuotaError = errorResponse && (
        errorResponse.error?.code === "QuotaExceeded" || 
        errorResponse.code === "QuotaExceeded" ||
        (errorResponse.message && errorResponse.message.toLowerCase().includes("quota"))
      );

      if (isBalanceError) {
        return res.status(403).json({ 
          error: "账户余额不足，请联系管理员充值",
          detail: errorResponse
        });
      }

      if (isQuotaError) {
        return res.status(403).json({ 
          error: "API 额度已耗尽，请检查资源包状态",
          detail: errorResponse
        });
      }

      // Handle parameter errors specifically
      if (errorResponse && errorResponse.error?.code === "InvalidParameter") {
        return res.status(400).json({
          error: `参数错误: ${errorResponse.error.message}`,
          detail: errorResponse
        });
      }

      if (error.response?.status === 404) {
        return res.status(404).json({
          error: "API 端点未找到 (404)。请检查 VOLC_MODEL_ID 是否为有效的推理接入点 ID (以 ep- 开头)。",
          detail: errorResponse || errorMessage
        });
      }

      res.status(500).json({ 
        error: errorResponse ? JSON.stringify(errorResponse) : `提交任务失败: ${errorMessage}`,
        detail: errorResponse || errorMessage
      });
    }
  });

  // Polling endpoint
  app.get("/api/video-status/:taskId", async (req, res) => {
    const { taskId } = req.params;
    const frontendApiKey = req.headers['x-volc-api-key'] as string;
    const frontendModelId = req.headers['x-volc-model-id'] as string;
    const finalApiKey = frontendApiKey || ARK_API_KEY;

    try {
      const response = await axios.get(
        `${ARK_BASE_URL}/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${finalApiKey}`
          },
          timeout: 60000 // Increased to 60 seconds
        }
      );
      
      console.log(`Ark Status for ${taskId}:`, response.data.status);
      if (response.data.status === 'succeeded') {
        console.log("Ark Success Data:", JSON.stringify(response.data, null, 2));
      }
      
      res.json(response.data);
    } catch (error: any) {
      const errorResponse = error.response?.data;
      const errorMessage = error.message;
      
      console.error("Ark Status Error:", JSON.stringify(errorResponse || errorMessage, null, 2));
      
      // If it's a quota issue, it will be in errorResponse
      if (errorResponse && (errorResponse.error?.code === "QuotaExceeded" || errorResponse.code === "QuotaExceeded")) {
        return res.status(403).json({ error: "API 额度已耗尽，请检查账户余额" });
      }

      res.status(500).json({ 
        error: errorResponse ? JSON.stringify(errorResponse) : `查询状态失败: ${errorMessage}` 
      });
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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
  });
}

startServer();
