import axios from 'axios';
import { storage, CatInfo } from './storage';

/**
 * 文件管理服务 (模拟 Flutter 的 path_provider 和 dart:io)
 * 在 Web 环境下，我们使用 Blob URL 和 localStorage 来模拟本地存储
 */
export class FileManager {
  /**
   * 模拟下载视频并保存到 "本地"
   * @param videoUrl 视频下载地址
   * @param taskId 任务 ID，作为文件名
   * @param catName 猫咪名字
   */
  public static async downloadVideo(videoUrl: string, taskId: string, catName: string, avatarUrl: string): Promise<string> {
    let finalUrl = videoUrl;
    try {
      // 1. 尝试发起请求获取视频二进制数据 (可能会因为 CORS 失败)
      await axios.get(videoUrl, {
        responseType: 'blob',
        timeout: 10000, // 设置超时
      });

      // 2. 在 Web 环境下，Blob URL 在页面刷新后会失效
      // 因此我们不应该将其作为持久化路径保存。
      // 我们直接使用原始的远程地址作为 videoPath。
      finalUrl = videoUrl;
    } catch (error) {
      console.warn('下载视频到本地失败 (可能是跨域限制)，将直接使用远程地址:', error);
      finalUrl = videoUrl;
    }

    // 3. 记录元数据到本地数据库
    const newCat: CatInfo = {
      id: taskId,
      name: catName,
      breed: 'AI 生成',
      color: '未知',
      avatar: avatarUrl, // 使用原始图片作为头像
      source: 'uploaded',
      videoPath: finalUrl,
      remoteVideoUrl: videoUrl, // 记录原始远程地址作为备份
    };

    storage.saveCatInfo(newCat);
    
    return finalUrl;
  }

  /**
   * 获取所有已生成的猫咪视频历史
   */
  public static getHistory() {
    return storage.getCatList().filter(cat => cat.source === 'uploaded');
  }

  /**
   * 删除本地视频记录
   */
  public static deleteVideo(catId: string) {
    const list = storage.getCatList();
    const updated = list.filter(c => c.id !== catId);
    storage.saveCatList(updated);
    
    // 如果删除的是当前活跃猫咪，重置活跃 ID
    if (storage.getActiveCatId() === catId) {
      storage.setActiveCatId(updated[0]?.id || '');
    }
  }
}
