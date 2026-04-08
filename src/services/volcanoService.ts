import CryptoJS from 'crypto-js';
import axios from 'axios';

/**
 * 火山引擎配置中心 (方舟 Ark 平台)
 */
export const VolcanoConfig = {
  // 开启 API 调用
  MOCK_MODE: false, 
  
  // 凭证信息 (从环境变量读取)
  AccessKey: import.meta.env.VITE_VOLC_ACCESS_KEY,
  SecretKey: import.meta.env.VITE_VOLC_SECRET_KEY,
  
  ApiKey: import.meta.env.VITE_VOLC_API_KEY,
  ModelId: import.meta.env.VITE_VOLC_MODEL_ID || 'doubao-seedance-1-5-pro-251215',
  T2IModelId: import.meta.env.VITE_VOLC_T2I_MODEL_ID || 'doubao-t2i-v2',
  BaseUrl: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
};

/**
 * 互动动作对应的 Prompt 模版 (Seedance 高精度指令)
 */
export const ACTION_PROMPTS = {
  rubbing: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，缓慢站起走向镜头轻蹭后退回蹲坐，尾帧回归初始蹲坐姿态，与首帧画面一致；保留原始毛色与真实质感，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；超写实风格，固定摄像头。",
  petting: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近聚焦面部，虚拟手轻摸头顶，猫咪眯眼、耳朵后贴呈现享受状态，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格。",
  feeding: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近，主人手从上方伸入递零食，猫咪低头嗅闻轻咬，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后主人手离开、镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格。",
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

    const apiKey = localStorage.getItem('VOLC_API_KEY') || VolcanoConfig.ApiKey;
    const modelId = localStorage.getItem('VOLC_MODEL_ID') || VolcanoConfig.ModelId;
    const accessKey = localStorage.getItem('VOLC_ACCESS_KEY') || VolcanoConfig.AccessKey;
    const secretKey = localStorage.getItem('VOLC_SECRET_KEY') || VolcanoConfig.SecretKey;

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
        headers: {
          'Content-Type': 'application/json',
          'X-Volc-API-Key': apiKey,
          'X-Volc-Model-Id': modelId,
          'X-Volc-Access-Key': accessKey,
          'X-Volc-Secret-Key': secretKey
        }
      });
      
      console.log("[DEBUG] Submit task response:", response.data);
      
      // 兼容不同的返回结构 (id 或 task_id)
      const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
      
      if (!taskId) {
        console.error("[DEBUG] Invalid response structure:", response.data);
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

    const apiKey = localStorage.getItem('VOLC_API_KEY') || VolcanoConfig.ApiKey;
    const modelId = localStorage.getItem('VOLC_MODEL_ID') || VolcanoConfig.ModelId;
    const accessKey = localStorage.getItem('VOLC_ACCESS_KEY') || VolcanoConfig.AccessKey;
    const secretKey = localStorage.getItem('VOLC_SECRET_KEY') || VolcanoConfig.SecretKey;

    try {
      const response = await axios.get(`/api/video-status/${taskId}`, {
        timeout: 60000, // Added 60 seconds timeout
        headers: {
          'X-Volc-API-Key': apiKey,
          'X-Volc-Model-Id': modelId,
          'X-Volc-Access-Key': accessKey,
          'X-Volc-Secret-Key': secretKey
        }
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

    const apiKey = localStorage.getItem('VOLC_API_KEY') || VolcanoConfig.ApiKey;
    const accessKey = localStorage.getItem('VOLC_ACCESS_KEY') || VolcanoConfig.AccessKey;
    const secretKey = localStorage.getItem('VOLC_SECRET_KEY') || VolcanoConfig.SecretKey;
    const t2iModelId = localStorage.getItem('VOLC_T2I_MODEL_ID') || VolcanoConfig.T2IModelId;

    try {
      const response = await axios.post("/api/generate-image", {
        prompt,
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'X-Volc-API-Key': apiKey,
          'X-Volc-Access-Key': accessKey,
          'X-Volc-Secret-Key': secretKey,
          'X-Volc-T2I-Model-Id': t2iModelId
        }
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
   * 轮询文生图结果
   */
  public static async pollImageResult(taskId: string, signal?: AbortSignal): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'https://picsum.photos/seed/cat/800/800';
    }

    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        if (signal?.aborted) {
          clearInterval(timer);
          reject(new Error("任务中止"));
          return;
        }

        try {
          const response = await axios.get(`/api/image-status/${taskId}`, {
            headers: {
              'X-Volc-API-Key': localStorage.getItem('VOLC_API_KEY') || VolcanoConfig.ApiKey
            }
          });
          
          const result = response.data;
          if (result.status === 'succeeded') {
            clearInterval(timer);
            const imageUrl = result.output?.image_url || result.data?.image_url || result.image_url;
            if (imageUrl) resolve(imageUrl);
            else reject(new Error("任务成功但未获取到图片地址"));
          } else if (result.status === 'failed') {
            clearInterval(timer);
            const errorInfo = result.error || result.message || "未知错误";
            reject(new Error(`图片生成失败: ${typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo)}`));
          }
        } catch (error: any) {
          clearInterval(timer);
          let errorMsg = "查询图片状态失败";
          if (error.response?.data) {
            const data = error.response.data;
            const innerError = data.error?.error || data.error || data;
            errorMsg = typeof innerError === 'string' ? innerError : (innerError.message || JSON.stringify(innerError));
          } else {
            errorMsg = error.message;
          }
          reject(new Error(errorMsg));
        }
      }, 3000);
    });
  }

  /**
   * 轮询逻辑 (Polling Logic)
   * 每隔 5 秒查询一次，直到成功或失败，增加超时和中止支持
   */
  public static async pollTaskResult(
    taskId: string, 
    onProgress?: (status: string) => void,
    signal?: AbortSignal,
    maxWaitTimeMs: number = 300000 // 默认 5 分钟超时
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const timer = setInterval(async () => {
        // 检查是否已中止
        if (signal?.aborted) {
          clearInterval(timer);
          reject(new Error("任务轮询已中止"));
          return;
        }

        // 检查是否超时
        if (Date.now() - startTime > maxWaitTimeMs) {
          clearInterval(timer);
          reject(new Error("任务轮询超时 (5分钟)"));
          return;
        }

        try {
          const result = await this.getTaskResult(taskId);
          console.log(`[DEBUG] Task ${taskId} status: ${result.status}`);

          const status = result.status;
          if (onProgress) onProgress(status);

          if (status === 'succeeded') {
            clearInterval(timer);
            console.log("[DEBUG] Task succeeded. Full result:", JSON.stringify(result, null, 2));
            
            // 优先从 output 或 content 中获取标准的 video_url
            let videoUrl = 
              result.output?.video_url || 
              result.content?.video_url || 
              result.data?.video_url ||
              result.video_url;

            // 如果上述都没有，尝试从 response 结构中找
            if (!videoUrl && result.response?.video?.uri) {
              console.warn("[DEBUG] Found URI instead of URL:", result.response.video.uri);
              videoUrl = result.response.video.uri;
            }
            
            console.log("[DEBUG] Extracted video URL:", videoUrl);
            
            if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('/api'))) {
              resolve(videoUrl);
            } else {
              console.error("[DEBUG] Invalid or missing video URL in response");
              reject(new Error(`任务成功但未获取到有效的视频播放地址。`));
            }
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(timer);
            reject(new Error(`任务失败，状态: ${status}, 错误: ${JSON.stringify(result.error || result.message)}`));
          }
          // 如果是 running, pending 等状态，继续轮询
        } catch (error) {
          clearInterval(timer);
          reject(error);
        }
      }, 5000);

      // 监听中止信号
      signal?.addEventListener('abort', () => {
        clearInterval(timer);
        reject(new Error("任务轮询已中止"));
      });
    });
  }
}
