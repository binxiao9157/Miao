import axios from 'axios';

/**
 * 阿里灵积 (DashScope) 配置中心
 */
export const VolcanoConfig = {
  get MOCK_MODE() { 
    // 优先从环境变量获取，如果没有则根据是否是开发环境和本地存储判断
    const envMock = import.meta.env.VITE_DASHSCOPE_MOCK_MODE;
    if (envMock === 'true') return true;
    if (envMock === 'false') return false;
    return import.meta.env.DEV && localStorage.getItem('DASHSCOPE_MOCK_MODE') === 'true'; 
  },
  get ModelId() {
    return localStorage.getItem('DASHSCOPE_VIDEO_MODEL') || "wan2.2-kf2v-flash";
  },
  get T2IModelId() {
    return localStorage.getItem('DASHSCOPE_IMAGE_MODEL') || "qwen-image-2.0";
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
  idle: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。猫咪缓慢站起走向镜头轻蹭后退回蹲坐，尾帧与首帧画面 100% 一致；保留原始毛色与真实质感，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；超写实风格，固定摄像头，竖屏 9:16，480P，5秒无音频，种子值 12345。",
    duration: 5
  },
  tail: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。虚拟手轻摸头顶，猫咪眯眼、耳朵后贴呈现享受状态，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。尾帧回归初始蹲坐姿态，与首帧画面 100% 一致；超写实风格，竖屏 9:16，480P，5秒无音频，种子值 12345。",
    duration: 5
  },
  rubbing: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。猫咪前爪在柔软地毯上缓慢交替踩奶，身体轻微起伏，呈现放松舒适状态，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。随后停止踩奶，尾帧回归初始蹲坐姿态，与首帧画面 100% 一致；超写实风格，固定摄像头，竖屏 9:16，480P，5秒无音频，种子值 12345。",
    duration: 5
  },
  blink: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。主人手从右侧伸入持羽毛逗猫棒晃动，猫咪兴奋抬头、挥爪、原地小跳 2 次，全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后逗猫棒移开，尾帧回归初始蹲坐姿态，与首帧画面 100% 一致；超写实风格，竖屏 9:16，480P，5 秒无音频，种子值 12345。",
    duration: 5
  }
};

/**
 * 形象生成对应的 Prompt 模版
 */
export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) => 
    `A ultra-realistic, high-detail portrait of a ${breed} cat with ${color} fur, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera.`
};

/**
 * 阿里灵积 (DashScope) 视频生成服务
 */
export class VolcanoService {
  /**
   * 提交视频生成任务 (SubmitTask) - 增加重试机制
   */
  public static async submitTask(imageBase64: string, actionData?: string | { prompt: string, duration?: number }, retries: number = 2) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_task_' + Date.now() };
    }

    const { prompt, duration } = typeof actionData === 'object' 
      ? actionData 
      : { prompt: actionData || "A high quality video of this cat, cinematic lighting, realistic.", duration: 5 };

    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await axios.post("/api/generate-video", {
          model: VolcanoConfig.ModelId,
          prompt: prompt,
          image_base64: imageBase64,
          parameters: {
            seed: 12345, // 固定种子值，确保连贯性
            resolution: "480P",
            duration: duration || 5,
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
        const status = error.response?.status;
        const isNetworkError = !error.response;
        
        // 专门处理 429 频率限制：增加专门的等待时间
        const isRateLimit = status === 429;
        const shouldRetry = (status && status >= 500) || isNetworkError || isRateLimit;
        
        if (!shouldRetry || i === retries) break;
        
        // 如果是频率限制，等待更久 (初始 5s)
        const backoffDelay = isRateLimit ? 5000 * Math.pow(2, i) : 2000 * (i + 1);
        console.warn(`提交任务失败 (${status || 'Network'}), 正在进行第 ${i + 1} 次重试... 延迟 ${backoffDelay}ms`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    // 统一错误处理
    const error = lastError;
    if (error.response) {
      const data = error.response.data;
      console.error("提交失败详情 (HTTP Error):", error.response.status, data);

      // 优先提取更详细的 message，如果没有则使用 error 字段
      // 同时保留 details 信息用于调试
      const detailedMsg = data.message || data.error?.message || data.error || `提交失败 (${error.response.status})`;

      // 将完整的响应数据附加到 error 对象上，传递给前端
      const err = new Error(detailedMsg);
      (err as any).response = error.response;
      throw err;
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
   * 提交文生图任务 (Text-to-Image / Image-to-Image)
   */
  public static async submitImageTask(prompt: string, imageBase64?: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_img_task_' + Date.now() };
    }

    try {
      const response = await axios.post("/api/generate-image", {
        prompt,
        image_base64: imageBase64,
        model: VolcanoConfig.T2IModelId
      }, {
        timeout: 60000,
        headers: buildHeaders()
      });
      
      const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
      
      if (!taskId) {
        throw new Error("文生图任务提交失败，未获取到 ID");
      }

      return { 
        id: taskId, 
        image_url: response.data?.image_url, 
        status: response.data?.status 
      };
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
  public static async pollImageResult(taskId: string, initialUrl?: string, signal?: AbortSignal): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'https://picsum.photos/seed/cat/800/800';
    }

    if (initialUrl) return initialUrl;
    if (taskId.startsWith('sync:')) {
      // In sync mode, the taskId might contain nothing or we might have passed initialUrl
      // If we don't have initialUrl but have sync: prefix, we need to check if the caller passed it
      throw new Error("同步任务未提供图片地址");
    }
    const maxDelay = 10000; // 最大 10s
    let delay = 2000; // 初始 2s
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
          result.output?.results?.[0]?.url ||
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
