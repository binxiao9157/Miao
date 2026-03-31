import CryptoJS from 'crypto-js';
import axios from 'axios';

/**
 * 火山引擎配置中心 (方舟 Ark 平台)
 */
export const VolcanoConfig = {
  ApiKey: '46527621-b924-40e6-b6cf-4d457669f7a8',
  ModelId: 'doubao-seedance-1-5-pro-251215',
  BaseUrl: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
};

/**
 * 火山引擎方舟视频生成服务
 */
export class VolcanoService {
  /**
   * 提交视频生成任务 (SubmitTask)
   */
  public static async submitTask(imageBase64: string) {
    const body = {
      model: VolcanoConfig.ModelId,
      content: [
        {
          type: "image_url",
          image_url: {
            url: imageBase64,
          },
        },
        {
          type: "text",
          text: "A high quality video of this cat, cinematic lighting, realistic.",
        },
      ],
    };

    try {
      const response = await axios.post(VolcanoConfig.BaseUrl, body, {
        headers: {
          'Authorization': `Bearer ${VolcanoConfig.ApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // 打印详细的错误信息，帮助诊断 400 错误
        console.error("火山引擎提交失败详情:", error.response.data);
        throw new Error(`提交失败 (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 查询任务结果 (GetTaskResult)
   */
  public static async getTaskResult(taskId: string) {
    const url = `${VolcanoConfig.BaseUrl}/${taskId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${VolcanoConfig.ApiKey}`,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error("火山引擎查询失败详情:", error.response.data);
        throw new Error(`查询失败 (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 轮询逻辑 (Polling Logic)
   * 每隔 5 秒查询一次，直到成功或失败
   */
  public static async pollTaskResult(taskId: string, onProgress?: (status: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const result = await this.getTaskResult(taskId);
          // 打印完整的任务结果，方便调试结构变化
          console.log("任务状态查询结果:", JSON.stringify(result));

          // 方舟 API 状态字段通常在 status 中
          const status = result.status;
          
          if (onProgress) onProgress(status);

          if (status === 'succeeded') {
            clearInterval(timer);
            
            // 兼容性处理：尝试从不同路径获取视频 URL
            const videoUrl = result.content?.video_url || result.output?.video_url || result.response?.video_url || result.video_url;
            
            if (videoUrl) {
              console.log("获取到视频 URL:", videoUrl);
              resolve(videoUrl);
            } else {
              console.error("任务成功但未找到视频 URL, 完整响应:", result);
              reject(new Error(`任务成功但未找到视频 URL。`));
            }
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(timer);
            reject(new Error(`任务失败，状态: ${status}, 错误: ${JSON.stringify(result.error || result.message)}`));
          }
        } catch (error) {
          clearInterval(timer);
          reject(error);
        }
      }, 5000);
    });
  }
}
