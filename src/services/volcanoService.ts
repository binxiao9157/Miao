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
  BaseUrl: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
};

/**
 * 互动动作对应的 Prompt 模版
 */
export const ACTION_PROMPTS = {
  click: "A human hand gently stroking the cat's head, the cat narrows its eyes in enjoyment, purring softly, cozy indoor nest background, realistic fur texture.",
  longPress: "The cat curled up in the nest, rhythmic breathing, peaceful sleeping, occasional ear twitching, extreme close-up, warm cinematic lighting.",
  doubleClick: "The cat pouncing on a feather toy, agile movements, playful expression, wide-angle shot of the cat nest, joyful atmosphere.",
  swipe: "The cat happily eating cat food from a bowl, licking lips, looking up at the camera with big bright eyes, tail wagging, satisfied expression."
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
      }, {
        timeout: 180000, // Increased to 180 seconds
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
        headers: {
          'X-Volc-API-Key': apiKey,
          'X-Volc-Model-Id': modelId,
          'X-Volc-Access-Key': accessKey,
          'X-Volc-Secret-Key': secretKey
        }
      });
      return response.data;
    } catch (error: any) {
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

    try {
      const response = await axios.post("/api/generate-image", {
        prompt,
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'X-Volc-API-Key': apiKey,
          'X-Volc-Access-Key': accessKey,
          'X-Volc-Secret-Key': secretKey
        }
      });
      
      const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
      
      if (!taskId) {
        throw new Error("文生图任务提交失败，未获取到 ID");
      }

      return { id: taskId };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `文生图提交失败: ${error.message}`);
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
            reject(new Error("图片生成失败"));
          }
        } catch (error) {
          clearInterval(timer);
          reject(error);
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
