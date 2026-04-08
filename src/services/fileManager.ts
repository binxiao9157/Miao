import axios from 'axios';
import { storage, CatInfo } from './storage';

/**
 * 文件管理服务 (模拟 Flutter 的 path_provider 和 dart:io)
 * 在 Web 环境下，我们使用 Blob URL 和 localStorage 来模拟本地存储
 */
export class FileManager {
  /**
   * 模拟下载视频并保存到 "本地"
   * @param videoUrls 视频下载地址映射 (click, longPress, etc.)
   * @param groupId 任务组 ID
   * @param catName 猫咪名字
   * @param avatarUrl 头像
   * @param metadata 元数据 (品种、毛色、来源)
   */
  public static async downloadVideos(
    videoUrls: { [key: string]: string }, 
    groupId: string, 
    catName: string, 
    avatarUrl: string,
    metadata?: { breed?: string; furColor?: string; source?: 'upload' | 'created' }
  ): Promise<{ [key: string]: string }> {
    const finalPaths: { [key: string]: string } = {};
    
    for (const [action, url] of Object.entries(videoUrls)) {
      finalPaths[action] = url;
    }

    // 3. 记录元数据到本地数据库
    const newCat: CatInfo = {
      id: groupId,
      name: catName,
      breed: metadata?.breed || 'AI 生成',
      color: metadata?.furColor || '未知',
      avatar: avatarUrl,
      source: metadata?.source === 'created' ? 'created' : 'uploaded',
      videoPath: finalPaths.petting || Object.values(finalPaths)[0], // 默认使用摸头(休息)作为待机视频
      videoPaths: finalPaths,
      remoteVideoUrl: finalPaths.petting || Object.values(finalPaths)[0],
    };

    storage.saveCatInfo(newCat);
    
    return finalPaths;
  }

  /**
   * 模拟下载单个视频 (保持兼容)
   */
  public static async downloadVideo(videoUrl: string, taskId: string, catName: string, avatarUrl: string): Promise<string> {
    const paths = await this.downloadVideos({ longPress: videoUrl }, taskId, catName, avatarUrl);
    return paths.longPress;
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
