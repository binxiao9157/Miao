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
  // 还原为用户确认可用的 Seedance 专用任务接口端点
  const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

  console.log("Server Config:", {
    hasApiKey: !!ARK_API_KEY,
    modelId: ARK_MODEL_ID,
    isEndpointId: ARK_MODEL_ID.startsWith("ep-"),
    baseUrl: ARK_BASE_URL,
    nodeEnv: process.env.NODE_ENV
  });

  // Volcengine AccessKey and SecretKey should be provided via environment variables
  const VOLC_ACCESS_KEY = process.env.VOLC_ACCESS_KEY;
  const VOLC_SECRET_KEY = process.env.VOLC_SECRET_KEY;

  // API Route for Video Generation (Ark Task API)
  app.post("/api/generate-video", async (req, res) => {
    const { prompt, image_base64 } = req.body;

    try {
      if (!ARK_API_KEY) {
        console.error("Missing VOLC_API_KEY environment variable");
        return res.status(500).json({ error: "服务器未配置 API Key，请检查环境变量" });
      }

      // 确保 base64 字符串没有多余的空格或换行符，并提取纯 base64 数据
      let dataUrl = "";
      if (image_base64) {
        let cleanBase64 = image_base64.replace(/\s/g, '');
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

      // Seedance 1.5 Pro V3 任务接口规范
      // 根据用户反馈，还原为 content 在根节点的结构
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
          // 请求 9:16 比例以适配手机全屏
          size: "540x960"
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
          timeout: 150000 // Increased to 150 seconds
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
          timeout: 15000 // 15 seconds timeout
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
}

startServer();
