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
      }, {
        timeout: 180000, // Increased to 180 seconds
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
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
      const response = await axios.get(`/api/video-status/${taskId}`);
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

          const status = result.status;
          if (onProgress) onProgress(status);

          if (status === 'succeeded') {
            clearInterval(timer);
            const videoUrl = result.content?.video_url || result.output?.video_url || result.response?.video_url || result.video_url;
            
            if (videoUrl) {
              resolve(videoUrl);
            } else {
              reject(new Error(`任务成功但未找到视频 URL。`));
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
