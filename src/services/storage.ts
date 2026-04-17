import { mediaStorage } from "./mediaStorage";

/**
 * 本地存储服务，模拟移动端的 SharedPreferences/MMKV
 */

export interface UserInfo {
  id?: string;
  phone: string;
  username?: string;
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
  LAST_PHONE: 'miao_last_phone', // 记住上次登录的手机号
  APP_PRESET_CATS: 'app_preset_cats', // 预设猫咪底图
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
};

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
  cachedCurrentUserRaw = currentUserRaw;

  if (!currentUserRaw) {
    cachedUserPrefix = 'guest_';
    return;
  }

  try {
    const user = JSON.parse(currentUserRaw) as UserInfo;
    // 优先级: phone > username > unknown
    // 最终 key 格式: u_{identifier}_miao_cat_list（getUserKey 负责拼 _）
    const identifier = user.phone || user.username || 'unknown';
    cachedUserPrefix = `u_${identifier}`;
  } catch (e) {
    console.error("Error parsing current user in refreshUserPrefix:", e);
    cachedUserPrefix = 'guest_';
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
      // 先收集所有 key，避免遍历时修改 localStorage 导致跳过元素
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }
      for (const key of allKeys) {
        if (key.endsWith(USER_DATA_KEYS.DIARIES)) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const diaries = JSON.parse(data) as DiaryEntry[];
              const cleanedDiaries = diaries; // 不再暴力删除旧日记的媒体字段
              if (diaries.length > 10) {
                const trimmed = diaries.slice(0, 10);
                localStorage.setItem(key, JSON.stringify(trimmed));
                console.log(`Pruned diaries for key ${key} to free space.`);
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // 2. Prune cat list (if more than 5 cats, keep only the active one and recent ones)
      const cats = storage.getCatList();
      if (cats.length > 5) {
        const activeId = storage.getActiveCatId();
        const cleanedCats = cats.filter((c, index) => c.id === activeId || index < 5);
        if (cleanedCats.length < cats.length) {
          localStorage.setItem(getUserKey(USER_DATA_KEYS.CAT_LIST), JSON.stringify(cleanedCats));
          console.log("Pruned cat list to free space.");
        }
      }
      
      // 3. Clear global last cat image if still full (it will be re-synced later)
      // But we are usually trying to set this, so clearing it might not help much if it's the one we want.
      
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
    storage.setItem(STORAGE_KEYS.LAST_PHONE, info.phone);

    // 刷新前缀缓存
    refreshUserPrefix();

    
    // 2. 保存到用户列表（模拟数据库，仅保留本地离线支持）
    const users = storage.safeParse<UserInfo[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.phone === info.phone);
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
  
  findUserByPhone: (phone: string): UserInfo | null => {
    const users = storage.getAllUsers();
    return users.find(u => u.phone === phone) || null;
  },

  updatePassword: (phone: string, newPassword: string): boolean => {
    const users = storage.getAllUsers();
    const index = users.findIndex(u => u.phone === phone);
    if (index >= 0) {
      users[index].password = newPassword;
      storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // 如果是当前用户，也更新当前用户缓存
      const currentUser = storage.getUserInfo();
      if (currentUser && currentUser.phone === phone) {
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
    
    // 内存清理
    memCache.clear();
    cachedCurrentUserRaw = null;
    refreshUserPrefix();
  },
  
  clearAll: () => {
    // 彻底清除当前用户的所有数据（注销账号用）
    const user = storage.getUserInfo();
    if (user) {
      const prefix = `u_${user.phone || user.username}_`;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      // 从用户列表中移除
      const users = storage.getAllUsers().filter(u => u.phone !== user.phone);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    storage.clearCurrentUser();
  },

  getLastPhone: (): string => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_PHONE) || "";
    } catch (e) {
      return "";
    }
  },

  rescueMyCat: (): { count: number; source: string | null } => {
    refreshUserPrefix();
    const currentPrefix = `${cachedUserPrefix}_`;

    // 获取当前用户的 username（用于旧账号精准匹配）
    const currentUser = storage.getUserInfo();
    const currentUsername = currentUser?.username;

    console.log(`[RESCUE] 开启数据搜救，当前前缀: ${currentPrefix}, username: ${currentUsername || '无'}`);

    // 收集所有候选数据源
    interface CandidateSource {
      prefix: string;
      identifier: string;
      catCount: number;
      isUsernameMatch: boolean; // 是否与当前用户 username 匹配
    }
    const candidates: CandidateSource[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 模式1: u_{name}_miao_cat_list
      const catListSuffix = `_${USER_DATA_KEYS.CAT_LIST}`;
      const isPattern1 = key.startsWith('u_') && key.endsWith(catListSuffix);
      // 模式2: miao_cats_{name}（极早期格式）
      const isPattern2 = key.startsWith('miao_cats_');

      if (!isPattern1 && !isPattern2) continue;
      if (key.startsWith(currentPrefix)) continue; // 排除当前账号

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const list = JSON.parse(raw) as any[];
        if (!Array.isArray(list) || list.length === 0) continue;

        let prefix = "";
        let identifier = "";

        if (isPattern1) {
          // key = "u_admin_miao_cat_list" → identifier = "admin", prefix = "u_admin_"
          // catListSuffix = "_miao_cat_list" (含前导 _)
          identifier = key.slice(2, key.length - catListSuffix.length);
          prefix = `u_${identifier}_`;
        } else {
          // key = "miao_cats_admin" → identifier = "admin", prefix = "miao_cats_"
          identifier = key.slice('miao_cats_'.length);
          prefix = "miao_cats_";
        }

        const isUsernameMatch = !!(currentUsername && identifier === currentUsername);
        candidates.push({ prefix, identifier, catCount: list.length, isUsernameMatch });
        console.log(`[RESCUE] 发现数据源: "${identifier}", 猫咪数: ${list.length}, username匹配: ${isUsernameMatch}`);
      } catch (e) { /* skip */ }
    }

    if (candidates.length === 0) {
      return { count: -1, source: null };
    }

    // 选择最佳数据源：优先 username 精准匹配，其次猫咪数最多
    candidates.sort((a, b) => {
      if (a.isUsernameMatch !== b.isUsernameMatch) return a.isUsernameMatch ? -1 : 1;
      return b.catCount - a.catCount;
    });
    const best = candidates[0];

    console.log(`[RESCUE] 选定数据源: [${best.identifier}], 猫咪数: ${best.catCount}`);

    // 检查是否已经迁移过（防止重复搬运）
    const migratedFlag = `${currentPrefix}__migrated_from_${best.identifier}`;
    if (localStorage.getItem(migratedFlag)) {
      console.log(`[RESCUE] 已从 [${best.identifier}] 迁移过，跳过`);
      return { count: 0, source: best.identifier };
    }

    // 清理缓存
    memCache.clear();
    cachedCurrentUserRaw = null;

    // 严格前缀匹配搬迁
    const migratedOldKeys: string[] = [];
    const keys = Object.keys(localStorage);
    keys.forEach(oldKey => {
      if (!oldKey.startsWith(best.prefix)) return;
      if (oldKey.startsWith(currentPrefix)) return;

      const value = localStorage.getItem(oldKey);
      if (value === null) return;

      const newKey = oldKey.replace(best.prefix, currentPrefix);
      console.log(`[RESCUE] 搬运: ${oldKey} -> ${newKey}`);
      localStorage.setItem(newKey, value);
      migratedOldKeys.push(oldKey);
    });

    // 标记已迁移，防止下次登录重复搬运
    localStorage.setItem(migratedFlag, Date.now().toString());

    // 删除旧 key（搬迁完成后清理）
    migratedOldKeys.forEach(oldKey => {
      console.log(`[RESCUE] 清理旧 key: ${oldKey}`);
      localStorage.removeItem(oldKey);
    });

    // 重刷缓存
    memCache.clear();
    cachedCurrentUserRaw = null;
    refreshUserPrefix();

    const catList = storage.getCatList();
    const finalCount = catList.length;

    if (finalCount > 0) {
      storage.setActiveCatId(catList[0].id);
    }

    console.log(`[RESCUE] 迁移完成，最终猫咪数: ${finalCount}`);
    return { count: finalCount, source: best.identifier };
  },

  // Cat Management
  getCatList: (): CatInfo[] => {
    const rawList = cachedRead<CatInfo[]>(getUserKey(USER_DATA_KEYS.CAT_LIST), []);
    if (!Array.isArray(rawList)) return [];
    // cachedRead 已做 safeClone，无需再次深拷贝；仅补全 videoPaths 结构
    return rawList.map(cat => {
      if (!cat.videoPaths || typeof cat.videoPaths !== 'object') {
        cat.videoPaths = {
          idle: cat.videoPath || '',
          rubbing: '', petting: '', teasing: '', feeding: '', tail: '', blink: ''
        };
      } else {
        cat.videoPaths = {
          idle: cat.videoPaths.idle || cat.videoPath || '',
          rubbing: cat.videoPaths.rubbing || '',
          petting: cat.videoPaths.petting || '',
          teasing: cat.videoPaths.teasing || '',
          feeding: cat.videoPaths.feeding || '',
          tail: cat.videoPaths.tail || '',
          blink: cat.videoPaths.blink || ''
        };
      }
      return cat;
    });
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
    
    // 强制补全
    if (active && (!active.videoPaths || typeof active.videoPaths !== 'object')) {
      active.videoPaths = {
        idle: active.videoPath || active.remoteVideoUrl || '',
        rubbing: '', petting: '', teasing: '', feeding: '', tail: '', blink: ''
      };
    }
    return active;
  },

  // Legacy support for single cat info
  getCatInfo: (): CatInfo | null => {
    return storage.getActiveCat();
  },

  // 获取全局最后一次使用的猫咪图片
  getLastCatImage: (): string | null => {
    try {
      // 策略1: 通过上次登录的手机号精准查找
      const lastPhone = storage.getLastPhone();
      if (lastPhone) {
        const listKey = `u_${lastPhone}_${USER_DATA_KEYS.CAT_LIST}`;
        const activeIdKey = `u_${lastPhone}_${USER_DATA_KEYS.ACTIVE_CAT_ID}`;

        const listData = localStorage.getItem(listKey);
        const activeId = localStorage.getItem(activeIdKey);

        if (listData) {
          const list = JSON.parse(listData) as CatInfo[];
          const active = list.find(c => c.id === activeId) || list[0];
          if (active) return active.avatar;
        }
      }

      // 策略2: 遍历所有 u_*_miao_cat_list（兼容旧 username 账号）
      const catListSuffix = `_${USER_DATA_KEYS.CAT_LIST}`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('u_') || !key.endsWith(catListSuffix)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const list = JSON.parse(raw) as CatInfo[];
          if (list.length > 0) return list[0].avatar;
        } catch { /* skip */ }
      }

      // 策略3: 旧的全局缓存 fallback
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

  // 绑定手机号并迁移数据
  bindPhoneAndMigrateData: (phone: string): boolean => {
    const user = storage.getUserInfo();
    if (!user) return false;
    if (user.phone === phone) return true;

    const oldPrefix = cachedUserPrefix;
    user.phone = phone;
    storage.saveUserInfo(user);
    
    // 迁移数据
    const newPrefix = cachedUserPrefix;
    console.log(`[MIGRATE] 账号升级搬迁: ${oldPrefix} -> ${newPrefix}`);
    
    memCache.clear();
    cachedCurrentUserRaw = null;
    
    const keys = Object.keys(localStorage);
    keys.forEach(oldKey => {
      if (oldKey.startsWith(oldPrefix)) {
        const value = localStorage.getItem(oldKey);
        if (value !== null) {
          const newKey = oldKey.replace(oldPrefix, newPrefix);
          localStorage.setItem(newKey, value);
          // 既然是“搬家”，成功复制后删除旧 Key
          if (newKey !== oldKey) {
            localStorage.removeItem(oldKey);
          }
        }
      }
    });
    
    return true;
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
    return updated;
  },

  deleteCat: () => {
    storage.removeItem(getUserKey(USER_DATA_KEYS.CAT_LIST));
    storage.removeItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
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
};
