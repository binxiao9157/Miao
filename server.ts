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
  const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

  // Volcengine AccessKey and SecretKey should be provided via environment variables
  const VOLC_ACCESS_KEY = process.env.VOLC_ACCESS_KEY;
  const VOLC_SECRET_KEY = process.env.VOLC_SECRET_KEY;

  // API Route for Video Generation (Ark Task API)
  app.post("/api/generate-video", async (req, res) => {
    const { prompt, image_base64 } = req.body;

    try {
      // Ark Video Generation API often expects an 'input' object or direct fields
      // We'll try the most robust structure for the tasks endpoint
      const requestBody: any = {
        model: ARK_MODEL_ID,
        parameters: {
          size: "480p"
        }
      };

      // Handle both image and text
      if (image_base64) {
        // Ensure we have a clean data URL with prefix
        // Ark Video Generation API (Seedance) typically expects the full data URL
        const dataUrl = image_base64.startsWith('data:') 
          ? image_base64 
          : `data:image/jpeg;base64,${image_base64}`;
        
        console.log("Image size (data URL):", (dataUrl.length / 1024 / 1024).toFixed(2), "MB");

        // Seedance 1.5 Pro V3 Tasks API structure
        // The error "Invalid base64 image_url" often occurs when the prefix is missing
        // or the structure is incorrect.
        requestBody.content = [
          {
            type: "image_url",
            image_url: {
              url: dataUrl
            }
          },
          {
            type: "text",
            text: prompt || "A high quality video of this cat, cinematic lighting, realistic."
          }
        ];

        // We also include 'input' as some model versions might look there.
        requestBody.input = {
          prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic.",
          image_url: dataUrl
        };
      } else {
        requestBody.content = [
          {
            type: "text",
            text: prompt || "A high quality video of a cute cat."
          }
        ];
        requestBody.input = { prompt: prompt };
      }

      console.log("Submitting task to Ark:", {
        model: ARK_MODEL_ID,
        url: ARK_BASE_URL,
        has_image: !!image_base64,
        prompt: requestBody.input?.prompt?.substring(0, 30) + "..."
      });

      const response = await axios.post(
        ARK_BASE_URL,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${ARK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000 // 60 seconds for large uploads
        }
      );

      console.log("Ark Submit Success:", response.data.id || "No ID");
      res.json(response.data);
    } catch (error: any) {
      const errorResponse = error.response?.data;
      const errorMessage = error.message;
      
      console.error("Ark API Error Detail:", JSON.stringify(errorResponse || errorMessage, null, 2));
      
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
          error: "账户余额不足，请登录火山引擎控制台充值",
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

      res.status(500).json({ 
        error: errorResponse ? JSON.stringify(errorResponse) : `提交任务失败: ${errorMessage}` 
      });
    }
  });

  // Polling endpoint
  app.get("/api/video-status/:taskId", async (req, res) => {
    const { taskId } = req.params;

    try {
      const response = await axios.get(
        `${ARK_BASE_URL}/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${ARK_API_KEY}`
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
        return res.status(403).json({ error: "API 额度已耗尽，请检查火山引擎账户余额" });
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
}

startServer();
