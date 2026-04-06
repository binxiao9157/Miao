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
  videoPath?: string; // 默认视频路径 (Idle/LongPress)
  videoPaths?: {
    click?: string;
    longPress?: string;
    doubleClick?: string;
    swipe?: string;
  };
  remoteVideoUrl?: string; // 视频远程路径 (Fallback)
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
  content: string;
  media?: string;
  mediaType?: 'image' | 'video';
  createdAt: number;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
}

export interface TimeLetter {
  id: string;
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

export interface PointsInfo {
  total: number;
  lastLoginDate: string | null;
  dailyInteractionPoints: number;
  lastInteractionDate: string | null;
  onlineMinutes: number;
  lastOnlineUpdate: number;
  history: PointTransaction[];
}

const STORAGE_KEYS = {
  USERS: 'miao_users', // 所有用户信息
  CURRENT_USER: 'miao_current_user', // 当前登录用户
  TOKEN: 'miao_auth_token',
  USER_AVATAR: 'user_avatar_key', // 保持兼容性
};

const USER_DATA_KEYS = {
  CAT_LIST: 'miao_cat_list',
  ACTIVE_CAT_ID: 'miao_active_cat_id',
  SETTINGS: 'miao_settings',
  DIARIES: 'miao_diaries',
  TIME_LETTERS: 'miao_time_letters',
  POINTS: 'miao_points',
};

// 动态生成用户相关的 Key
const getUserKey = (key: string) => {
  const currentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!currentUser) return `guest_${key}`;
  try {
    const user = JSON.parse(currentUser) as UserInfo;
    return `u_${user.username}_${key}`;
  } catch (e) {
    return `guest_${key}`;
  }
};

export const storage = {
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
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(info));
    
    // 2. 保存到用户列表（模拟数据库）
    const users = storage.safeParse<UserInfo[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.username === info.username);
    if (index >= 0) {
      users[index] = info;
    } else {
      users.push(info);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // 3. 同步保存头像
    if (info.avatar) {
      localStorage.setItem(getUserKey(STORAGE_KEYS.USER_AVATAR), info.avatar);
    }
  },
  
  getUserInfo: (): UserInfo | null => {
    const info = storage.safeParse<UserInfo | null>(STORAGE_KEYS.CURRENT_USER, null);
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
  
  saveToken: (token: string) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },
  
  getToken: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (e) {
      return null;
    }
  },
  
  removeToken: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch (e) {}
  },

  clearCurrentUser: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
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

  // Cat Management
  getCatList: (): CatInfo[] => {
    return storage.safeParse<CatInfo[]>(getUserKey(USER_DATA_KEYS.CAT_LIST), []);
  },

  saveCatList: (cats: CatInfo[]) => {
    localStorage.setItem(getUserKey(USER_DATA_KEYS.CAT_LIST), JSON.stringify(cats));
  },

  getActiveCatId: (): string | null => {
    return localStorage.getItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
  },

  setActiveCatId: (id: string) => {
    localStorage.setItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID), id);
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

  saveCatInfo: (info: CatInfo) => {
    const list = storage.getCatList();
    const index = list.findIndex(c => c.id === info.id);
    if (index >= 0) {
      list[index] = info;
    } else {
      list.push(info);
    }
    storage.saveCatList(list);
    storage.setActiveCatId(info.id);
  },

  // Points Management
  getPoints: (): PointsInfo => {
    const p = storage.safeParse<PointsInfo>(getUserKey(USER_DATA_KEYS.POINTS), {
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
    const today = new Date().toLocaleDateString();
    let expectedMinimum = 0;
    if (p.lastLoginDate === today) expectedMinimum += 10;
    if (p.lastInteractionDate === today) expectedMinimum += p.dailyInteractionPoints;
    if (p.onlineMinutes >= 10) expectedMinimum += 10;

    if (p.total < expectedMinimum) {
      p.total = expectedMinimum;
      localStorage.setItem(getUserKey(USER_DATA_KEYS.POINTS), JSON.stringify(p));
    }

    return p;
  },

  savePoints: (points: PointsInfo) => {
    localStorage.setItem(getUserKey(USER_DATA_KEYS.POINTS), JSON.stringify(points));
  },

  addPoints: (amount: number, reason: string = '系统奖励') => {
    const points = storage.getPoints();
    points.total += amount;
    points.history.unshift({
      id: 'tx_' + Date.now() + Math.random().toString(36).substr(2, 5),
      type: 'earn',
      amount,
      reason,
      timestamp: Date.now()
    });
    if (points.history.length > 50) points.history.pop();
    storage.savePoints(points);
    return points.total;
  },

  deductPoints: (amount: number, reason: string = '积分消耗') => {
    const points = storage.getPoints();
    if (points.total >= amount) {
      points.total -= amount;
      points.history.unshift({
        id: 'tx_' + Date.now() + Math.random().toString(36).substr(2, 5),
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
    localStorage.setItem(getUserKey(USER_DATA_KEYS.SETTINGS), JSON.stringify(settings));
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

  saveDiaries: (diaries: DiaryEntry[]) => {
    try {
      localStorage.setItem(getUserKey(USER_DATA_KEYS.DIARIES), JSON.stringify(diaries));
      return diaries;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn("LocalStorage quota exceeded, attempting to prune old media...");
        let prunedCount = 0;
        const prunedDiaries = [...diaries].reverse().map(d => {
          if (d.media && prunedCount < 5) {
            prunedCount++;
            return { ...d, media: undefined, mediaType: undefined };
          }
          return d;
        }).reverse();

        try {
          localStorage.setItem(getUserKey(USER_DATA_KEYS.DIARIES), JSON.stringify(prunedDiaries));
          return prunedDiaries;
        } catch (retryError) {
          throw retryError;
        }
      }
      throw e;
    }
  },

  deleteDiary: (id: string) => {
    const diaries = storage.getDiaries();
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
    localStorage.setItem(getUserKey(USER_DATA_KEYS.TIME_LETTERS), JSON.stringify(letters));
  },

  clearMediaCache: () => {
    const diaries = storage.getDiaries();
    const cleaned = diaries.map(d => ({ ...d, media: undefined }));
    storage.saveDiaries(cleaned);
  },

  deleteCat: () => {
    localStorage.removeItem(getUserKey(USER_DATA_KEYS.CAT_LIST));
    localStorage.removeItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
  }
};
