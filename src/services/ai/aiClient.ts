import axios from 'axios';
import { aiConfig } from './aiConfig';
import { AIProfile, AITaskResponse, VideoActionPrompt } from './types';

function buildHeaders() {
  return { 'Content-Type': 'application/json' };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const aiClient = {
  getProfile(): AIProfile {
    return aiConfig.getProfile();
  },

  async submitImageTask(prompt: string, imageBase64?: string): Promise<AITaskResponse> {
    const profile = aiConfig.getProfile();
    if (profile.mockMode) {
      await delay(1000);
      return { id: 'mock_img_task_' + Date.now(), provider: profile.provider };
    }

    const response = await axios.post('/api/ai/generate-image', {
      provider: profile.provider,
      model: profile.imageModel,
      prompt,
      image_base64: imageBase64,
      parameters: {
        seed: profile.seed,
      }
    }, {
      timeout: 90000,
      headers: buildHeaders()
    });

    const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
    if (!taskId) throw new Error("文生图任务提交失败，未获取到 ID");
    return {
      ...response.data,
      id: taskId,
      provider: profile.provider,
    };
  },

  async submitVideoTask(
    imageBase64: string,
    actionData?: string | VideoActionPrompt,
    retries: number = 2,
    firstFrame?: string,
    lastFrame?: string
  ): Promise<AITaskResponse> {
    const profile = aiConfig.getProfile();
    if (profile.mockMode) {
      await delay(1000);
      return { id: 'mock_task_' + Date.now(), provider: profile.provider };
    }

    const { prompt, duration } = typeof actionData === 'object'
      ? actionData
      : { prompt: actionData || "A high quality video of this cat, cinematic lighting, realistic.", duration: profile.duration };

    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await axios.post('/api/ai/generate-video', {
          provider: profile.provider,
          model: profile.videoModel,
          prompt,
          first_frame: firstFrame || imageBase64,
          last_frame: lastFrame || imageBase64,
          image_base64: firstFrame || imageBase64,
          parameters: {
            seed: profile.seed,
            resolution: profile.resolution,
            duration: duration || profile.duration,
            prompt_extend: profile.promptExtend,
            audio: false,
          }
        }, {
          timeout: 120000,
          headers: buildHeaders()
        });

        const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
        if (!taskId) throw new Error("服务器返回数据格式错误，未获取到任务 ID");
        return {
          ...response.data,
          id: taskId,
          provider: profile.provider,
        };
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        const isRateLimit = status === 429;
        const shouldRetry = (status && status >= 500) || !error.response || isRateLimit;
        if (!shouldRetry || i === retries) break;
        await delay(isRateLimit ? 5000 * Math.pow(2, i) : 2000 * (i + 1));
      }
    }

    if (lastError?.response) {
      const data = lastError.response.data;
      const detailedMsg = data.message || data.error?.message || data.error || `提交失败 (${lastError.response.status})`;
      const err = new Error(detailedMsg);
      (err as any).response = lastError.response;
      throw err;
    }
    if (lastError?.request) throw new Error("网络错误: 无法连接到服务器，请检查网络或稍后重试");
    throw new Error(`请求错误: ${lastError?.message || '未知错误'}`);
  },

  async getTaskResult(taskId: string, type: 'image' | 'video' = 'video') {
    const profile = aiConfig.getProfile();
    if (profile.mockMode) {
      await delay(500);
      if (Math.random() > 0.8) {
        return type === 'image'
          ? { status: 'succeeded', image_url: 'https://picsum.photos/seed/cat/800/800' }
          : { status: 'succeeded', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4' };
      }
      return { status: 'running' };
    }

    const response = await axios.get(`/api/ai/${type}-status/${profile.provider}/${taskId}`, {
      timeout: 60000,
      headers: buildHeaders()
    });
    return response.data;
  },

  async pollImageResult(taskId: string, initialUrl?: string, signal?: AbortSignal): Promise<string> {
    const profile = aiConfig.getProfile();
    if (profile.mockMode) {
      await delay(2000);
      return 'https://picsum.photos/seed/cat/800/800';
    }
    if (initialUrl) return initialUrl;
    if (taskId.startsWith('sync:')) throw new Error("同步任务未提供图片地址");

    let wait = 2000;
    const maxDelay = 10000;
    const startTime = Date.now();
    while (true) {
      if (signal?.aborted) throw new Error("任务中止");
      if (Date.now() - startTime > 120000) throw new Error("图片生成超时");

      let result: any;
      try {
        const response = await axios.get(`/api/ai/image-status/${profile.provider}/${taskId}`, {
          headers: buildHeaders(),
          signal
        });
        result = response.data;
      } catch (error: any) {
        if (axios.isCancel(error) || signal?.aborted) throw new Error("任务中止");
        const status = error.response?.status;
        if (status && status < 500) throw error;
        await delay(wait);
        wait = Math.min(wait * 1.5, maxDelay);
        continue;
      }

      if (result.status === 'succeeded') {
        const imageUrl = result.output?.image_url || result.data?.image_url || result.image_url;
        if (imageUrl) return imageUrl;
        throw new Error("任务成功但未获取到图片地址");
      }
      if (result.status === 'failed') {
        const errorInfo = result.error || result.message || "未知错误";
        throw new Error(`图片生成失败: ${typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo)}`);
      }

      await delay(wait);
      wait = Math.min(wait * 1.5, maxDelay);
    }
  },

  async pollVideoResult(
    taskId: string,
    onProgress?: (status: string) => void,
    signal?: AbortSignal,
    maxWaitTimeMs: number = 300000
  ): Promise<string> {
    const profile = aiConfig.getProfile();
    if (profile.mockMode) {
      await delay(3000);
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }

    let wait = 3000;
    const maxDelay = 15000;
    const startTime = Date.now();
    while (true) {
      if (signal?.aborted) throw new Error("任务轮询已中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("任务轮询超时 (5分钟)");

      let result: any;
      try {
        result = await this.getTaskResult(taskId, 'video');
      } catch (error: any) {
        if (signal?.aborted) throw new Error("任务轮询已中止");
        const httpStatus = error.response?.status;
        if (httpStatus && httpStatus < 500) throw error;
        await delay(wait);
        wait = Math.min(wait * 1.5, maxDelay);
        continue;
      }

      const status = result.status;
      if (onProgress) onProgress(status);
      if (status === 'succeeded') {
        const videoUrl =
          result.output?.video_url ||
          result.output?.results?.[0]?.url ||
          result.content?.video_url ||
          result.data?.video_url ||
          result.video_url ||
          result.response?.video?.uri;
        if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('/api'))) return videoUrl;
        throw new Error("任务成功但未获取到有效的视频播放地址。");
      }
      if (status === 'failed' || status === 'cancelled') {
        const errorDetail = result.error || result.message || "未知错误";
        throw new Error(`任务失败 (${status}): ${typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)}`);
      }

      await delay(wait);
      wait = Math.min(wait * 1.5, maxDelay);
    }
  }
};
