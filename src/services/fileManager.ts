import { storage, CatInfo } from './storage';

async function persistVideoUrl(url: string, catId: string, action: string): Promise<string> {
  try {
    const resp = await fetch('/api/persist-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: url, catId, action }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.url || url;
  } catch {
    return url;
  }
}

/**
 * 压缩 base64 图片为缩略图，降低 localStorage 占用
 * 非 base64 数据（URL 等）原样返回
 */
function compressForStorage(base64: string | undefined, maxSize: number, quality: number): Promise<string | undefined> {
  if (!base64 || !base64.startsWith('data:image')) return Promise.resolve(base64);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

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
    metadata?: { breed?: string; furColor?: string; source?: 'upload' | 'created'; placeholderImage?: string; anchorFrame?: string }
  ): Promise<{ [key: string]: string }> {
    const finalPaths: { [key: string]: string } = {};

    const entries = Object.entries(videoUrls);
    const persisted = await Promise.all(
      entries.map(([action, url]) => persistVideoUrl(url, groupId, action))
    );
    entries.forEach(([action], i) => {
      finalPaths[action] = persisted[i];
    });

    // 压缩大图为缩略图再入库，防止 localStorage 爆容量
    const [compressedPlaceholder, compressedAnchor] = await Promise.all([
      compressForStorage(metadata?.placeholderImage, 200, 0.5),
      compressForStorage(metadata?.anchorFrame, 600, 0.7),
    ]);

    // 记录元数据到本地数据库
    const newCat: CatInfo = {
      id: groupId,
      name: catName,
      breed: metadata?.breed || 'AI 生成',
      color: metadata?.furColor || '未知',
      avatar: avatarUrl,
      source: metadata?.source === 'created' ? 'created' : 'uploaded',
      createdAt: Date.now(), // 记录领养时间
      videoPath: finalPaths.idle || finalPaths.petting || Object.values(finalPaths)[0], 
      videoPaths: finalPaths,
      remoteVideoUrl: finalPaths.idle || finalPaths.petting || Object.values(finalPaths)[0],
      placeholderImage: compressedPlaceholder,
      anchorFrame: compressedAnchor,
    };

    storage.saveCatInfo(newCat);
    
    return finalPaths;
  }

  /**
   * 更新现有猫咪的视频数据
   */
  public static async updateCatVideos(
    catId: string,
    newVideoUrls: { [key: string]: string },
    isUnlocking: boolean = false
  ): Promise<void> {
    const cat = storage.getCatById(catId);
    if (!cat) return;

    const entries = Object.entries(newVideoUrls);
    const persisted = await Promise.all(
      entries.map(([action, url]) => persistVideoUrl(url, catId, action))
    );
    const persistedUrls: { [key: string]: string } = {};
    entries.forEach(([action], i) => {
      persistedUrls[action] = persisted[i];
    });

    const updatedCat: CatInfo = {
      ...cat,
      videoPaths: {
        ...cat.videoPaths,
        ...persistedUrls
      },
      isUnlocking
    };

    storage.saveCatInfo(updatedCat);
    
    // 触发自定义事件通知 UI 更新
    window.dispatchEvent(new CustomEvent('cat-updated', { detail: { catId } }));
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
