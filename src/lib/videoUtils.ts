/**
 * 视频处理工具函数
 */

/**
 * 从视频 URL 中提取指定时间的帧
 * @param videoUrl 视频地址
 * @param time 提取时间点（秒），默认第 0.1 秒以避开可能的黑帧
 * @returns Promise<string> Base64 格式的图片数据
 */
export async function extractFrameFromUrl(videoUrl: string, time: number = 0.1): Promise<string> {
  try {
    // 策略：先尝试直接 fetch 视频 Blob（利用浏览器缓存和可能的 CORS 允许）
    // 如果失败，则通过我们的服务器代理 fetch
    let blob: Blob;
    try {
      const response = await fetch(videoUrl, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      blob = await response.blob();
    } catch (e) {
      console.warn("直接获取视频失败，尝试通过代理获取...", e);
      const proxiedUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(proxiedUrl);
      if (!response.ok) throw new Error(`代理获取失败! status: ${response.status}`);
      blob = await response.blob();
    }

    const objectUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      // 使用 Object URL 不需要 crossOrigin，因为它已经在本地了
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;

      // 超时处理
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('提取视频帧超时，请检查网络连接'));
      }, 25000);

      const cleanup = () => {
        clearTimeout(timeout);
        video.remove();
        URL.revokeObjectURL(objectUrl);
      };

      video.onloadedmetadata = () => {
        // 确保时间在有效范围内
        const seekTime = Math.min(time, video.duration > 0 ? video.duration : time);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('无法创建 Canvas 上下文');
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          cleanup();
          reject(new Error('Canvas 绘制失败: ' + (err instanceof Error ? err.message : '未知错误')));
        }
      };

      video.onerror = () => {
        const error = video.error;
        console.error("Video element error:", error);
        cleanup();
        reject(new Error(`视频解析失败 (代码: ${error?.code || '未知'})。请尝试重新生成。`));
      };

      video.load();
    });
  } catch (err) {
    console.error("extractFrameFromUrl outer error:", err);
    throw new Error(`提取帧失败: ${err instanceof Error ? err.message : '网络异常'}`);
  }
}
