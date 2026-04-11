import axios from 'axios';

/**
 * 火山引擎配置中心 (方舟 Ark 平台)
 */
export const VolcanoConfig = {
  MOCK_MODE: false,
  // API Key 已迁移至 server.ts 环境变量，前端不再持有凭证
};

/** 请求头：API Key 已迁移至 server.ts 环境变量，前端不再发送凭证 */
function buildHeaders() {
  return { 'Content-Type': 'application/json' };
}

/**
 * 互动动作对应的 Prompt 模版 (Seedance 高精度指令)
 */
export const ACTION_PROMPTS = {
  rubbing: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，缓慢站起走向镜头轻蹭后退回蹲坐，尾帧回归初始蹲坐姿态，与首帧画面一致；保留原始毛色与真实质感，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；超写实风格，固定摄像头。",
  petting: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近聚焦面部，虚拟手轻摸头顶，猫咪眯眼、耳朵后贴呈现享受状态，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格。",
  feeding: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近，猫咪缓慢放松躺平、自然露出肚皮，虚拟手轻柔抚摸腹部，猫咪姿态放松舒适，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后猫咪起身恢复蹲坐、镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格，固定摄像头，480P，5 秒无音频，种子值 12345。",
  teasing: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近，主人手从右侧伸入持羽毛逗猫棒晃动，猫咪兴奋抬头、挥爪、原地小跳 2 次，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后逗猫棒移开、镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格。"
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
   * 提交视频生成任务 (SubmitTask)
   */
  public static async submitTask(imageBase64: string, prompt?: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_task_' + Date.now() };
    }

    try {
      const response = await axios.post("/api/generate-video", {
        prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic.",
        image_base64: imageBase64,
        parameters: {
          seed: 12345, // 固定种子值，确保连贯性
          resolution: "480p",
          duration: 5,
          audio: false
        }
      }, {
        timeout: 310000, 
        headers: buildHeaders()
      });
      
      // 兼容不同的返回结构 (id 或 task_id)
      const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
      
      if (!taskId) {
        throw new Error("服务器返回数据格式错误，未获取到任务 ID");
      }

      return {
        ...response.data,
        id: taskId
      };
    } catch (error: any) {
      if (error.response) {
        console.error("提交失败详情 (HTTP Error):", error.response.status, error.response.data);
        throw new Error(error.response.data.error || `提交失败 (${error.response.status})`);
      } else if (error.request) {
        console.error("网络错误 (No Response):", error.request);
        throw new Error("网络错误: 无法连接到服务器，请检查网络或稍后重试");
      } else {
        console.error("请求配置错误:", error.message);
        throw new Error(`请求错误: ${error.message}`);
      }
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
        throw new Error(`任务失败，状态: ${status}, 错误: ${JSON.stringify(result.error || result.message)}`);
      }

      // 等待并增加延迟
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }
}
