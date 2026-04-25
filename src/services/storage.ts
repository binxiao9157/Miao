import { mediaStorage } from "./mediaStorage";

/**
 * 本地存储服务，模拟移动端的 SharedPreferences/MMKV
 */

export interface UserInfo {
  username: string;
  nickname: string;
  avatar: string;
  password?: string; // 仅用于演示模拟校验
}

export interface CatInfo {
  id: string;
  name: string;
  breed: string;
  color: string;
  avatar: string;
  source: 'created' | 'uploaded';
  createdAt?: number; // 新增：猫咪创建/领养时间戳
  videoPath?: string; // 默认视频路径 (Idle/Petting)
  videoPaths?: {
    idle?: string;
    tail?: string;
    rubbing?: string;
    blink?: string;
    // Keep old ones for compatibility if needed, but we'll use the new ones
    petting?: string;
    feeding?: string;
    teasing?: string;
  };
  remoteVideoUrl?: string; // 视频远程路径 (Fallback)
  placeholderImage?: string; // 高画质静态占位图 (Base64)
  anchorFrame?: string; // 两阶段生成中的锚定底图 (Base64)
  isUnlocking?: boolean; // 是否正在后台解锁更多动作
}

export interface AppSettings {
  greetingsEnabled: boolean;
  pushNotifications: boolean;
  timeLetterReminder: boolean;
}

export interface Comment {
  id: string;
  content: string;
}

export interface DiaryEntry {
  id: string;
  catId: string; // 所属猫咪 ID
  content: string;
  media?: string;
  mediaType?: 'image' | 'video';
  createdAt: number;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
}

export interface FriendDiaryEntry extends DiaryEntry {
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  catName: string;
}

export interface TimeLetter {
  id: string;
  catId: string; // 关联的猫咪 ID
  catAvatar: string; // 猫咪头像缩略图 (冗余存储)
  title?: string; // 新增标题字段，可选以兼容旧数据
  content: string;
  unlockAt: number;
  createdAt: number;
}

export interface PointTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  timestamp: number;
}

export interface FriendInfo {
  id: string;
  nickname: string;
  avatar: string;
  catName: string;
  catAvatar: string;
  addedAt: number;
}

export interface PointsInfo {
  total: number;
  lastLoginDate: string | null;
  dailyInteractionPoints: number;
  lastInteractionDate: string | null;
  onlineMinutes: number;
  lastOnlineUpdate: number;
  history: PointTransaction[];
}

export interface PresetCat {
  id: string;
  name: string;
  imageUrl: string;
}

const STORAGE_KEYS = {
  USERS: 'miao_users', // 所有用户信息
  CURRENT_USER: 'miao_current_user', // 当前登录用户
  TOKEN: 'miao_auth_token',
  USER_AVATAR: 'user_avatar_key', // 保持兼容性
  LAST_CAT_IMAGE: 'miao_last_cat_image', // 全局最后一次使用的猫咪图片
  LAST_CAT_BREED: 'miao_last_cat_breed', // 全局最后一次使用的猫咪品种
  LAST_USERNAME: 'miao_last_username', // 记住上次登录的用户名
  APP_PRESET_CATS: 'app_preset_cats', // 预设猫咪底图
  LAST_READ_NOTIFICATION_TIME: 'miao_last_read_notifications', // 上次阅读通知时间
  READ_NOTIFICATION_IDS: 'miao_read_notification_ids', // 已读通知 ID 列表
};

const DEFAULT_PRESET_CATS: PresetCat[] = [
  { id: 'british_shorthair', name: '英国短毛猫', imageUrl: 'https://picsum.photos/seed/british_shorthair/800/800' },
  { id: 'ragdoll', name: '布偶猫', imageUrl: 'https://picsum.photos/seed/ragdoll/800/800' },
  { id: 'persian', name: '波斯猫', imageUrl: 'https://picsum.photos/seed/persian/800/800' },
  { id: 'maine_coon', name: '缅因猫', imageUrl: 'https://picsum.photos/seed/maine_coon/800/800' },
  { id: 'siamese', name: '暹罗猫', imageUrl: 'https://picsum.photos/seed/siamese/800/800' },
];

const USER_DATA_KEYS = {
  CAT_LIST: 'miao_cat_list',
  ACTIVE_CAT_ID: 'miao_active_cat_id',
  SETTINGS: 'miao_settings',
  DIARIES: 'miao_diaries',
  TIME_LETTERS: 'miao_time_letters',
  POINTS: 'miao_points',
  FRIENDS: 'miao_friends',
  FRIEND_DIARIES: 'miao_friend_diaries',
  HAS_SUBMITTED_SURVEY: 'miao_has_submitted_survey',
  IS_FAST_FORWARD: 'miao_debug_fast_forward', // 调试加速模式
};

function getCurrentUsername(): string | null {
  try {
    const raw = localStorage.getItem('miao_current_user');
    if (!raw) return null;
    return JSON.parse(raw).username || null;
  } catch { return null; }
}

function syncCatToServer(userId: string, cat: CatInfo) {
  fetch('/api/cats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, cat: { ...cat, placeholderImage: undefined, anchorFrame: undefined } }),
  }).catch(() => {});
}

function deleteCatFromServer(userId: string, catId: string) {
  fetch(`/api/cats/${encodeURIComponent(userId)}/${encodeURIComponent(catId)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

function deleteAllCatsFromServer(userId: string) {
  fetch(`/api/cats/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
}

/** 各类数据的滑动窗口上限 */
const MAX_DIARIES = 200;
const MAX_FRIEND_DIARIES = 100;
const MAX_TIME_LETTERS = 100;

// 内部缓存，减少频繁的 JSON.parse
let cachedUserPrefix: string = 'guest';
let cachedCurrentUserRaw: string | null = null;

// 高频读取的内存缓存（按 storageKey 索引）
const memCache = new Map<string, { raw: string | null; parsed: unknown }>();

// 跨 tab 同步：其他 tab 修改 localStorage 时清除本 tab 的内存缓存
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key) {
      // storage.clear() 被调用，清空所有缓存
      memCache.clear();
      cachedCurrentUserRaw = null;
      refreshUserPrefix();
      return;
    }
    invalidateCache(e.key);
    if (e.key === STORAGE_KEYS.CURRENT_USER) {
      cachedCurrentUserRaw = null;
      refreshUserPrefix();
    }
  });
}

// structuredClone polyfill：兼容 iOS Safari < 15.4 等旧浏览器
function safeClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function cachedRead<T>(storageKey: string, defaultValue: T): T {
  const raw = localStorage.getItem(storageKey);
  const entry = memCache.get(storageKey);
  if (entry && entry.raw === raw) {
    // 返回深拷贝，防止调用方修改缓存
    return safeClone(entry.parsed as T);
  }
  if (raw === null) {
    memCache.set(storageKey, { raw: null, parsed: defaultValue });
    return safeClone(defaultValue);
  }
  try {
    const parsed = JSON.parse(raw) as T;
    memCache.set(storageKey, { raw, parsed });
    return parsed ?? safeClone(defaultValue);
  } catch {
    memCache.set(storageKey, { raw, parsed: defaultValue });
    return safeClone(defaultValue);
  }
}

function invalidateCache(storageKey: string) {
  memCache.delete(storageKey);
}

// 刷新用户前缀缓存
const refreshUserPrefix = () => {
  const currentUserRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (currentUserRaw === cachedCurrentUserRaw) return; // 无变化，跳过 JSON.parse
  cachedCurrentUserRaw = currentUserRaw;

  if (!currentUserRaw) {
    cachedUserPrefix = 'guest';
    return;
  }

  try {
    const user = JSON.parse(currentUserRaw) as UserInfo;
    cachedUserPrefix = `u_${user.username}`;
  } catch (e) {
    console.error("Error parsing current user in refreshUserPrefix:", e);
    cachedUserPrefix = 'guest';
  }
};

// 动态生成用户相关的 Key
const getUserKey = (key: string) => {
  // 如果缓存为空，则初始化
  if (cachedCurrentUserRaw === null) {
    refreshUserPrefix();
  }
  return `${cachedUserPrefix}_${key}`;
};

export const storage = {
  // Helper for safe localStorage access
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error(`Error setting storage key "${key}":`, e);
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Handle quota exceeded gracefully by pruning
        console.warn("LocalStorage quota exceeded, attempting to prune storage...");
        storage.pruneStorage();
        try {
          // Retry after pruning
          localStorage.setItem(key, value);
          console.log(`Retry setting storage key "${key}" succeeded after pruning.`);
          return true;
        } catch (retryError) {
          console.error(`Retry setting storage key "${key}" failed even after pruning:`, retryError);
          return false;
        }
      }
      return false;
    }
  },

  // Prune storage to free up space
  pruneStorage: () => {
    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }

      // 1. 日记：超过 200 条时，对旧日记清理 media 字段释放空间，保留文字
      for (const key of allKeys) {
        if (key.endsWith(USER_DATA_KEYS.DIARIES)) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const diaries = JSON.parse(data) as DiaryEntry[];
              if (diaries.length > 200) {
                const old = diaries.slice(0, -200);
                const recent = diaries.slice(-200);
                for (const d of old) {
                  delete (d as any).media;
                  delete (d as any).mediaData;
                }
                localStorage.setItem(key, JSON.stringify([...old, ...recent]));
                console.log(`[Prune] Stripped media from ${old.length} old diaries for key ${key}`);
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // 2. 猫咪：超过 5 只时，对最早的猫咪清理 base64 大字段，但保留元数据和视频 URL
      const cats = storage.getCatList();
      if (cats.length > 5) {
        const activeId = storage.getActiveCatId();
        const sorted = [...cats].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const keep = new Set<string>();
        if (activeId) keep.add(activeId);
        for (const c of sorted) {
          if (keep.size >= 5) break;
          keep.add(c.id);
        }
        let freed = false;
        for (const c of cats) {
          if (!keep.has(c.id)) {
            delete c.placeholderImage;
            delete c.anchorFrame;
            freed = true;
          }
        }
        if (freed) {
          localStorage.setItem(getUserKey(USER_DATA_KEYS.CAT_LIST), JSON.stringify(cats));
          console.log(`[Prune] Stripped base64 fields from old cats, all ${cats.length} cats preserved.`);
        }
      }
    } catch (e) {
      console.error("Error during storage pruning:", e);
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing storage key "${key}":`, e);
    }
  },

  // Helper for safe JSON parsing
  safeParse: <T>(key: string, defaultValue: T): T => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : (parsed as T);
    } catch (e) {
      console.error(`Error parsing storage key "${key}":`, e);
      return defaultValue;
    }
  },

  // 用户管理
  saveUserInfo: (info: UserInfo) => {
    // 1. 保存到当前登录用户
    storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(info));
    invalidateCache(STORAGE_KEYS.CURRENT_USER);
    storage.setItem(STORAGE_KEYS.LAST_USERNAME, info.username);

    // 刷新前缀缓存
    refreshUserPrefix();

    
    // 2. 保存到用户列表（模拟数据库）
    const users = storage.safeParse<UserInfo[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.username === info.username);
    if (index >= 0) {
      users[index] = info;
    } else {
      users.push(info);
    }
    storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // 3. 同步保存头像
    if (info.avatar) {
      storage.setItem(getUserKey(STORAGE_KEYS.USER_AVATAR), info.avatar);
    }
  },
  
  getUserInfo: (): UserInfo | null => {
    const info = cachedRead<UserInfo | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (info) {
      const savedAvatar = localStorage.getItem(getUserKey(STORAGE_KEYS.USER_AVATAR));
      if (savedAvatar) {
        info.avatar = savedAvatar;
      }
    }
    return info;
  },

  getAllUsers: (): UserInfo[] => {
    return storage.safeParse<UserInfo[]>(STORAGE_KEYS.USERS, []);
  },
  
  findUser: (username: string): UserInfo | null => {
    const users = storage.getAllUsers();
    return users.find(u => u.username === username) || null;
  },

  updatePassword: (username: string, newPassword: string): boolean => {
    const users = storage.getAllUsers();
    const index = users.findIndex(u => u.username === username);
    if (index >= 0) {
      users[index].password = newPassword;
      storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // 如果是当前用户，也更新当前用户缓存
      const currentUser = storage.getUserInfo();
      if (currentUser && currentUser.username === username) {
        currentUser.password = newPassword;
        storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      }
      return true;
    }
    return false;
  },
  
  saveToken: (token: string) => {
    storage.setItem(STORAGE_KEYS.TOKEN, token);
  },
  
  getToken: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (e) {
      return null;
    }
  },
  
  removeToken: () => {
    storage.removeItem(STORAGE_KEYS.TOKEN);
  },

  saveLoginTime: (time: number) => {
    storage.setItem('miao_login_time', time.toString());
  },

  getLoginTime: () => {
    const time = localStorage.getItem('miao_login_time');
    return time ? parseInt(time, 10) : null;
  },

  saveLastActiveTime: (time: number) => {
    storage.setItem('miao_last_active_time', time.toString());
  },

  getLastActiveTime: () => {
    const time = localStorage.getItem('miao_last_active_time');
    return time ? parseInt(time, 10) : null;
  },

  clearCurrentUser: () => {
    storage.removeItem(STORAGE_KEYS.CURRENT_USER);
    invalidateCache(STORAGE_KEYS.CURRENT_USER);
    storage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem('miao_login_time');
    localStorage.removeItem('miao_last_active_time');
    refreshUserPrefix();
  },
  
  clearAll: () => {
    // 彻底清除当前用户的所有数据（注销账号用）
    const user = storage.getUserInfo();
    if (user) {
      const prefix = `u_${user.username}_`;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      // 从用户列表中移除
      const users = storage.getAllUsers().filter(u => u.username !== user.username);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    storage.clearCurrentUser();
  },

  getLastUsername: (): string => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_USERNAME) || "";
    } catch (e) {
      return "";
    }
  },

  // Cat Management
  getCatList: (): CatInfo[] => {
    return cachedRead<CatInfo[]>(getUserKey(USER_DATA_KEYS.CAT_LIST), []);
  },

  getCatById: (id: string): CatInfo | null => {
    const list = storage.getCatList();
    return list.find(c => c.id === id) || null;
  },

  saveCatList: (list: CatInfo[]) => {
    const key = getUserKey(USER_DATA_KEYS.CAT_LIST);
    storage.setItem(key, JSON.stringify(list));
    invalidateCache(key);
  },

  syncFromServer: async (username: string): Promise<void> => {
    try {
      const resp = await fetch(`/api/cats/${encodeURIComponent(username)}`);
      if (!resp.ok) return;
      const serverCats: CatInfo[] = await resp.json();
      if (!serverCats.length) {
        // 服务端无数据，将本地数据上传
        const local = storage.getCatList();
        for (const cat of local) syncCatToServer(username, cat);
        return;
      }

      const localCats = storage.getCatList();
      const localMap = new Map(localCats.map(c => [c.id, c]));
      const serverMap = new Map(serverCats.map(c => [c.id, c]));
      const merged: CatInfo[] = [];

      // 合并：以较新的为准
      const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);
      for (const id of allIds) {
        const local = localMap.get(id);
        const server = serverMap.get(id);
        if (local && server) {
          merged.push((local.createdAt || 0) >= (server.createdAt || 0) ? local : server);
        } else if (local) {
          merged.push(local);
          syncCatToServer(username, local);
        } else if (server) {
          merged.push(server);
        }
      }

      storage.saveCatList(merged);
      if (merged.length > 0 && !storage.getActiveCatId()) {
        storage.setActiveCatId(merged[0].id);
      }
    } catch {
      // 离线时静默失败
    }
  },

  saveCatInfo: (cat: CatInfo) => {
    const list = storage.getCatList();
    const index = list.findIndex(c => c.id === cat.id);
    if (index >= 0) {
      list[index] = cat;
    } else {
      list.push(cat);
    }
    storage.saveCatList(list);
    storage.setActiveCatId(cat.id);
    const userId = getCurrentUsername();
    if (userId) syncCatToServer(userId, cat);
  },

  getActiveCatId: (): string | null => {
    try {
      return localStorage.getItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
    } catch (e) {
      return null;
    }
  },

  setActiveCatId: (id: string) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID), id);
    // 触发自定义事件通知 UI 更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('active-cat-changed', { detail: { catId: id } }));
    }
  },

  getActiveCat: (): CatInfo | null => {
    const list = storage.getCatList();
    const activeId = storage.getActiveCatId();
    const active = list.find(c => c.id === activeId) || list[0] || null;
    return active;
  },

  // Legacy support for single cat info
  getCatInfo: (): CatInfo | null => {
    return storage.getActiveCat();
  },

  // 获取全局最后一次使用的猫咪图片
  getLastCatImage: (): string | null => {
    try {
      const lastUsername = storage.getLastUsername();
      if (lastUsername) {
        const listKey = `u_${lastUsername}_${USER_DATA_KEYS.CAT_LIST}`;
        const activeIdKey = `u_${lastUsername}_${USER_DATA_KEYS.ACTIVE_CAT_ID}`;
        
        const listData = localStorage.getItem(listKey);
        const activeId = localStorage.getItem(activeIdKey);
        
        if (listData) {
          const list = JSON.parse(listData) as CatInfo[];
          const active = list.find(c => c.id === activeId) || list[0];
          if (active) {
            return active.avatar;
          }
        }
      }
      return localStorage.getItem(STORAGE_KEYS.LAST_CAT_IMAGE);
    } catch (e) {
      return null;
    }
  },

  // 强制同步当前活跃猫咪到全局缓存
  syncLastCat: () => {
    // No longer needed as we derive it dynamically
    return true;
  },

  // Points Management
  getPoints: (): PointsInfo => {
    const p = cachedRead<PointsInfo>(getUserKey(USER_DATA_KEYS.POINTS), {
      total: 0,
      lastLoginDate: null,
      dailyInteractionPoints: 0,
      lastInteractionDate: null,
      onlineMinutes: 0,
      lastOnlineUpdate: Date.now(),
      history: []
    });

    if (!p.history) p.history = [];

    // Self-healing
    const today = new Date().toISOString().slice(0, 10);
    let expectedMinimum = 0;
    if (p.lastLoginDate === today) expectedMinimum += 10;
    if (p.lastInteractionDate === today) expectedMinimum += p.dailyInteractionPoints;
    if (p.onlineMinutes >= 10) expectedMinimum += 10;

    if (p.total < expectedMinimum) {
      p.total = expectedMinimum;
      storage.setItem(getUserKey(USER_DATA_KEYS.POINTS), JSON.stringify(p));
    }

    return p;
  },

  savePoints: (points: PointsInfo) => {
    const key = getUserKey(USER_DATA_KEYS.POINTS);
    storage.setItem(key, JSON.stringify(points));
    invalidateCache(key);
  },

  addPoints: (amount: number, reason: string = '系统奖励') => {
    const points = storage.getPoints();
    points.total += amount;
    points.history.unshift({
      id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
      type: 'earn',
      amount,
      reason,
      timestamp: Date.now()
    });
    if (points.history.length > 50) points.history.pop();
    storage.savePoints(points);
    return points.total;
  },

  getUnlockThreshold: (): number => {
    const cats = storage.getCatList();
    // 已有 1 只 -> 解锁第 2 只需 200 积分 (1 * 200)
    // 已有 2 只 -> 解锁第 3 只需 400 积分 (2 * 200)
    // 公式: threshold = ownedCats.length * 200
    return cats.length * 200;
  },

  deductPoints: (amount: number, reason: string = '积分消耗') => {
    const points = storage.getPoints();
    if (points.total >= amount) {
      points.total -= amount;
      points.history.unshift({
        id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
        type: 'spend',
        amount,
        reason,
        timestamp: Date.now()
      });
      if (points.history.length > 50) points.history.pop();
      storage.savePoints(points);
      return true;
    }
    return false;
  },

  saveSettings: (settings: AppSettings) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.SETTINGS), JSON.stringify(settings));
  },

  getSettings: (): AppSettings => {
    return storage.safeParse<AppSettings>(getUserKey(USER_DATA_KEYS.SETTINGS), { 
      greetingsEnabled: true, 
      pushNotifications: true,
      timeLetterReminder: true
    });
  },

  // Diary storage
  getDiaries: (): DiaryEntry[] => {
    return storage.safeParse<DiaryEntry[]>(getUserKey(USER_DATA_KEYS.DIARIES), []);
  },

  saveDiaries: (diaries: DiaryEntry[]): boolean => {
    // 滑动窗口：只保留最近 MAX_DIARIES 条，按时间倒序（新在前）
    const trimmed = diaries.length > MAX_DIARIES ? diaries.slice(0, MAX_DIARIES) : diaries;
    const success = storage.setItem(getUserKey(USER_DATA_KEYS.DIARIES), JSON.stringify(trimmed));
    
    if (success && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('diary-updated'));
    }
    
    return success;
  },

  deleteDiary: (id: string) => {
    const diaries = storage.getDiaries();
    const diary = diaries.find(d => d.id === id);
    if (diary?.media?.startsWith('indexeddb:')) {
      mediaStorage.deleteMedia(id);
    }
    const updated = diaries.filter(d => d.id !== id);
    storage.saveDiaries(updated);
    return updated;
  },

  deleteComment: (diaryId: string, commentId: string) => {
    const diaries = storage.getDiaries();
    const diary = diaries.find(d => d.id === diaryId);
    if (diary) {
      diary.comments = diary.comments.filter(c => c.id !== commentId);
      return storage.saveDiaries(diaries);
    }
    return diaries;
  },

  // Time Letters storage
  getTimeLetters: (): TimeLetter[] => {
    return storage.safeParse<TimeLetter[]>(getUserKey(USER_DATA_KEYS.TIME_LETTERS), []);
  },

  saveTimeLetters: (letters: TimeLetter[]) => {
    const trimmed = letters.length > MAX_TIME_LETTERS ? letters.slice(0, MAX_TIME_LETTERS) : letters;
    storage.setItem(getUserKey(USER_DATA_KEYS.TIME_LETTERS), JSON.stringify(trimmed));
  },

  deleteTimeLetter: (id: string): TimeLetter[] => {
    const letters = storage.getTimeLetters();
    const updated = letters.filter(l => l.id !== id);
    storage.saveTimeLetters(updated);
    return updated;
  },

  clearMediaCache: () => {
    const diaries = storage.getDiaries();
    const cleaned = diaries.map(d => ({ ...d, media: undefined }));
    storage.saveDiaries(cleaned);
  },

  deleteCatById: (id: string) => {
    const list = storage.getCatList();
    const updated = list.filter(c => c.id !== id);
    storage.saveCatList(updated);

    const activeId = storage.getActiveCatId();
    if (activeId === id) {
      if (updated.length > 0) {
        storage.setActiveCatId(updated[0].id);
      } else {
        storage.removeItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
      }
    }
    const userId = getCurrentUsername();
    if (userId) deleteCatFromServer(userId, id);
    return updated;
  },

  deleteCat: () => {
    storage.removeItem(getUserKey(USER_DATA_KEYS.CAT_LIST));
    storage.removeItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
    const userId = getCurrentUsername();
    if (userId) deleteAllCatsFromServer(userId);
  },

  // Friend Management
  getFriends: (): FriendInfo[] => {
    return storage.safeParse<FriendInfo[]>(getUserKey(USER_DATA_KEYS.FRIENDS), []);
  },

  addFriend: (friend: FriendInfo) => {
    const friends = storage.getFriends();
    if (!friends.find(f => f.id === friend.id)) {
      friends.push(friend);
      storage.setItem(getUserKey(USER_DATA_KEYS.FRIENDS), JSON.stringify(friends));
      
      // 当添加好友时，模拟生成几条好友日记以供展示
      const mockDiaries: FriendDiaryEntry[] = [
        {
          id: `fdiary_${friend.id}_1`,
          catId: `cat_${friend.id}`,
          authorId: friend.id,
          authorNickname: friend.nickname,
          authorAvatar: friend.avatar,
          catName: friend.catName,
          content: `今天和 ${friend.catName} 一起晒了太阳，它睡得好香呀～`,
          media: `https://picsum.photos/seed/${friend.id}_1/800/600`,
          mediaType: 'image',
          createdAt: Date.now() - 3600000,
          likes: 5,
          isLiked: false,
          comments: []
        },
        {
          id: `fdiary_${friend.id}_2`,
          catId: `cat_${friend.id}`,
          authorId: friend.id,
          authorNickname: friend.nickname,
          authorAvatar: friend.avatar,
          catName: friend.catName,
          content: `${friend.catName} 好像又胖了一点点，是不是该减肥了？`,
          media: `https://picsum.photos/seed/${friend.id}_2/800/600`,
          mediaType: 'image',
          createdAt: Date.now() - 86400000,
          likes: 12,
          isLiked: true,
          comments: [{ id: 'c1', content: '好可爱的猫咪！' }]
        },
        {
          id: `fdiary_${friend.id}_3`,
          catId: `cat_${friend.id}`,
          authorId: friend.id,
          authorNickname: friend.nickname,
          authorAvatar: friend.avatar,
          catName: friend.catName,
          content: `新买的逗猫棒，${friend.catName} 玩疯了哈哈。`,
          media: `https://picsum.photos/seed/${friend.id}_3/800/600`,
          mediaType: 'image',
          createdAt: Date.now() - 172800000,
          likes: 8,
          isLiked: false,
          comments: []
        }
      ];
      const existingFriendDiaries = storage.getFriendDiaries();
      storage.saveFriendDiaries([...mockDiaries, ...existingFriendDiaries]);
      
      return true;
    }
    return false;
  },

  getFriendDiaries: (): FriendDiaryEntry[] => {
    return storage.safeParse<FriendDiaryEntry[]>(getUserKey(USER_DATA_KEYS.FRIEND_DIARIES), []);
  },

  saveFriendDiaries: (diaries: FriendDiaryEntry[]) => {
    const trimmed = diaries.length > MAX_FRIEND_DIARIES ? diaries.slice(0, MAX_FRIEND_DIARIES) : diaries;
    storage.setItem(getUserKey(USER_DATA_KEYS.FRIEND_DIARIES), JSON.stringify(trimmed));
  },

  // Preset Cats Management
  getPresetCats: (): PresetCat[] => {
    return storage.safeParse<PresetCat[]>(STORAGE_KEYS.APP_PRESET_CATS, DEFAULT_PRESET_CATS);
  },

  savePresetCats: (presets: PresetCat[]) => {
    storage.setItem(STORAGE_KEYS.APP_PRESET_CATS, JSON.stringify(presets));
  },

  setHasSubmittedSurvey: (hasSubmitted: boolean) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.HAS_SUBMITTED_SURVEY), hasSubmitted.toString());
  },

  getHasSubmittedSurvey: (): boolean => {
    return localStorage.getItem(getUserKey(USER_DATA_KEYS.HAS_SUBMITTED_SURVEY)) === 'true';
  },

  setIsFastForward: (enabled: boolean) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.IS_FAST_FORWARD), enabled.toString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-forward-changed', { detail: { enabled } }));
    }
  },

  getIsFastForward: (): boolean => {
    return localStorage.getItem(getUserKey(USER_DATA_KEYS.IS_FAST_FORWARD)) === 'true';
  },

  getLastReadNotificationTime: (): number => {
    const val = localStorage.getItem(getUserKey(STORAGE_KEYS.LAST_READ_NOTIFICATION_TIME));
    return val ? parseInt(val, 10) : 0;
  },

  markNotificationsAsRead: () => {
    storage.setItem(getUserKey(STORAGE_KEYS.LAST_READ_NOTIFICATION_TIME), Date.now().toString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications-read'));
    }
  },
  
  getReadNotificationIds: (): string[] => {
    return storage.safeParse<string[]>(getUserKey(STORAGE_KEYS.READ_NOTIFICATION_IDS), []);
  },

  markNotificationAsRead: (id: string) => {
    const ids = storage.getReadNotificationIds();
    if (!ids.includes(id)) {
      ids.push(id);
      storage.setItem(getUserKey(STORAGE_KEYS.READ_NOTIFICATION_IDS), JSON.stringify(ids));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-read', { detail: { id } }));
      }
    }
  },
};
