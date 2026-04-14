import axios from 'axios';

/**
 * 火山引擎配置中心 (方舟 Ark 平台)
 */
export const VolcanoConfig = {
  get MOCK_MODE() { return import.meta.env.DEV && localStorage.getItem('VOLC_MOCK_MODE') === 'true'; },
  get ModelId() {
    return localStorage.getItem('VOLC_MODEL_ID') || "doubao-seedance-1-5-pro-251215";
  },
  get T2IModelId() {
    return localStorage.getItem('VOLC_T2I_MODEL_ID') || "doubao-t2i-v2";
  },
};

/** 请求头 */
function buildHeaders() {
  return { 
    'Content-Type': 'application/json' 
  };
}

/**
 * 互动动作对应的 Prompt 模版 (Seedance 高精度指令)
 */
export const ACTION_PROMPTS = {
  idle: "一只可爱的猫咪蹲坐在温馨的房间里，正视镜头。它缓慢站起来，走向镜头轻轻蹭了一下，然后退回到原来的位置蹲好。画面清晰，光影真实，竖屏构图。",
  tail: "特写猫咪的面部。一只手轻轻抚摸猫咪的头顶，猫咪舒服地眯起眼睛。随后镜头拉远，猫咪保持蹲坐姿态。细节丰富。",
  rubbing: "聚焦猫咪的前爪。猫咪左右交替踩奶，看起来非常放松和舒适。随后它停止动作，静静地蹲坐在原地。",
  blink: "猫咪兴奋地看着镜头。主人拿着羽毛逗猫棒在旁边晃动，猫咪抬头挥动爪子尝试捕捉。随后逗猫棒移开，猫咪恢复安静蹲坐。"
};

/**
 * 形象生成对应的 Prompt 模版
 */
export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) => 
    `A ultra-realistic, high-detail portrait of a ${breed} cat with ${color} fur, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera.`
};

/**
 * 火山引擎方舟视频生成服务
 */
export class VolcanoService {
  /**
   * 提交视频生成任务 (SubmitTask) - 增加重试机制
   */
  public static async submitTask(imageBase64: string, prompt?: string, retries: number = 2) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_task_' + Date.now() };
    }

    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await axios.post("/api/generate-video", {
          model: VolcanoConfig.ModelId,
          prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic.",
          image_base64: imageBase64,
          parameters: {
            seed: 12345, // 固定种子值，确保连贯性
            resolution: "480p",
            duration: 5,
            audio: false
          }
        }, {
          timeout: 120000, // 2 minutes for browser to wait
          headers: buildHeaders()
        });
        
        const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
        
        if (!taskId) {
          throw new Error("服务器返回数据格式错误，未获取到任务 ID");
        }

        return {
          ...response.data,
          id: taskId
        };
      } catch (error: any) {
        lastError = error;
        // 仅对 5xx 或网络错误进行重试
        const status = error.response?.status;
        const isNetworkError = !error.response;
        const shouldRetry = (status && status >= 500) || isNetworkError;
        
        if (!shouldRetry || i === retries) break;
        
        console.warn(`提交任务失败，正在进行第 ${i + 1} 次重试...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // 指数退避
      }
    }

    // 统一错误处理
    const error = lastError;
    if (error.response) {
      const data = error.response.data;
      console.error("提交失败详情 (HTTP Error):", error.response.status, data);
      
      // 优先提取更详细的 message，如果没有则使用 error 字段
      const detailedMsg = data.message || data.error?.message || data.error || `提交失败 (${error.response.status})`;
      throw new Error(detailedMsg);
    } else if (error.request) {
      console.error("网络错误 (No Response):", error.request);
      throw new Error("网络错误: 无法连接到服务器，请检查网络或稍后重试");
    } else {
      console.error("请求配置错误:", error.message);
      throw new Error(`请求错误: ${error.message}`);
    }
  }

  /**
   * 查询任务结果 (GetTaskResult)
   */
  public static async getTaskResult(taskId: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const progress = Math.random();
      if (progress > 0.8) {
        return {
          status: 'succeeded',
          content: {
            video_url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          }
        };
      }
      return { status: 'running' };
    }

    try {
      const response = await axios.get(`/api/video-status/${taskId}`, {
        timeout: 60000, // Added 60 seconds timeout
        headers: buildHeaders()
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error("查询状态超时，请检查网络连接或稍后重试");
      }
      if (error.response) {
        console.error("查询失败详情 (HTTP Error):", error.response.status, error.response.data);
        throw new Error(error.response.data.error || `查询失败 (${error.response.status})`);
      } else if (error.request) {
        console.error("网络错误 (No Response):", error.request);
        throw new Error("网络错误: 无法连接到服务器");
      } else {
        throw new Error(`查询错误: ${error.message}`);
      }
    }
  }

  /**
   * 提交文生图任务 (Text-to-Image)
   */
  public static async submitImageTask(prompt: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_img_task_' + Date.now() };
    }

    try {
      const response = await axios.post("/api/generate-image", {
        prompt,
        model: VolcanoConfig.T2IModelId
      }, {
        timeout: 60000,
        headers: buildHeaders()
      });
      
      const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
      
      if (!taskId) {
        throw new Error("文生图任务提交失败，未获取到 ID");
      }

      return { id: taskId };
    } catch (error: any) {
      let errorMsg = "文生图提交失败";
      if (error.response?.data) {
        const data = error.response.data;
        // Handle nested error object from server.ts
        const innerError = data.error?.error || data.error || data;
        errorMsg = typeof innerError === 'string' ? innerError : (innerError.message || JSON.stringify(innerError));
      } else {
        errorMsg = error.message;
      }
      throw new Error(errorMsg);
    }
  }

  /**
   * 轮询文生图结果 (指数退避策略)
   */
  public static async pollImageResult(taskId: string, signal?: AbortSignal): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'https://picsum.photos/seed/cat/800/800';
    }

    let delay = 2000; // 初始 2s
    const maxDelay = 10000; // 最大 10s
    const startTime = Date.now();
    const maxWaitTimeMs = 120000; // 2分钟超时

    while (true) {
      if (signal?.aborted) throw new Error("任务中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("图片生成超时");

      // 1. 网络请求（可重试）
      let result: any;
      try {
        const response = await axios.get(`/api/image-status/${taskId}`, {
          headers: buildHeaders(),
          signal
        });
        result = response.data;
      } catch (error: any) {
        if (axios.isCancel(error) || signal?.aborted) throw new Error("任务中止");
        // 网络错误或 5xx → 重试；4xx → 直接抛出
        const status = error.response?.status;
        if (status && status < 500) throw error;
        console.warn("Polling encountered network/server error, retrying...", error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, maxDelay);
        continue;
      }

      // 2. 结果解析（业务逻辑错误，直接抛出不重试）
      if (result.status === 'succeeded') {
        const imageUrl = result.output?.image_url || result.data?.image_url || result.image_url;
        if (imageUrl) return imageUrl;
        throw new Error("任务成功但未获取到图片地址");
      } else if (result.status === 'failed') {
        const errorInfo = result.error || result.message || "未知错误";
        throw new Error(`图片生成失败: ${typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo)}`);
      }

      // 等待并增加延迟（指数退避）
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }

  /**
   * 轮询视频生成结果 (指数退避策略)
   */
  public static async pollTaskResult(
    taskId: string, 
    onProgress?: (status: string) => void,
    signal?: AbortSignal,
    maxWaitTimeMs: number = 300000 // 默认 5 分钟超时
  ): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }

    let delay = 3000; // 初始 3s
    const maxDelay = 15000; // 最大 15s
    const startTime = Date.now();

    while (true) {
      if (signal?.aborted) throw new Error("任务轮询已中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("任务轮询超时 (5分钟)");

      // 1. 网络请求（可重试）
      let result: any;
      try {
        result = await this.getTaskResult(taskId);
      } catch (error: any) {
        if (signal?.aborted) throw new Error("任务轮询已中止");
        // getTaskResult 内部已处理网络/超时错误并抛出友好消息
        // 检查是否为可重试的网络错误
        const httpStatus = error.response?.status;
        if (httpStatus && httpStatus < 500) throw error;
        console.warn("Polling encountered error, retrying...", error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, maxDelay);
        continue;
      }

      // 2. 结果解析（业务逻辑错误，直接抛出不重试）
      const status = result.status;
      if (onProgress) onProgress(status);

      if (status === 'succeeded') {
        let videoUrl = 
          result.output?.video_url || 
          result.content?.video_url || 
          result.data?.video_url ||
          result.video_url;

        if (!videoUrl && result.response?.video?.uri) {
          videoUrl = result.response.video.uri;
        }
        
        if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('/api'))) {
          return videoUrl;
        } else {
          throw new Error(`任务成功但未获取到有效的视频播放地址。`);
        }
      } else if (status === 'failed' || status === 'cancelled') {
        const errorDetail = result.error || result.message || "未知错误";
        const errorMsg = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
        throw new Error(`任务失败 (${status}): ${errorMsg}`);
      }

      // 等待并增加延迟
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }
}
