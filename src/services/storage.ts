/**
 * 本地存储服务，模拟移动端的 SharedPreferences/MMKV
 */

const STORAGE_KEYS = {
  USER_INFO: 'miao_user_info',
  TOKEN: 'miao_auth_token',
  CAT_LIST: 'miao_cat_list',
  ACTIVE_CAT_ID: 'miao_active_cat_id',
  SETTINGS: 'miao_settings',
  DIARIES: 'miao_diaries',
  TIME_LETTERS: 'miao_time_letters',
  POINTS: 'miao_points',
};

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
  videoPath?: string; // 视频本地路径
  remoteVideoUrl?: string; // 视频远程路径 (Fallback)
}

export interface AppSettings {
  greetingsEnabled: boolean;
  pushNotifications: boolean;
  timeLetterReminder: boolean;
}

export interface DiaryEntry {
  id: string;
  content: string;
  media?: string;
  mediaType?: 'image' | 'video';
  createdAt: number;
  likes: number;
  isLiked: boolean;
  comments: string[];
}

export interface TimeLetter {
  id: string;
  content: string;
  unlockAt: number;
  createdAt: number;
}

export interface PointsInfo {
  total: number;
  lastLoginDate: string | null;
  dailyInteractionPoints: number;
  lastInteractionDate: string | null;
  onlineMinutes: number;
  lastOnlineUpdate: number;
}

export const storage = {
  saveUserInfo: (info: UserInfo) => {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(info));
  },
  
  getUserInfo: (): UserInfo | null => {
    return storage.safeParse<UserInfo | null>(STORAGE_KEYS.USER_INFO, null);
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
  
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    });
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

  // Cat Management
  getCatList: (): CatInfo[] => {
    return storage.safeParse<CatInfo[]>(STORAGE_KEYS.CAT_LIST, []);
  },

  saveCatList: (cats: CatInfo[]) => {
    localStorage.setItem(STORAGE_KEYS.CAT_LIST, JSON.stringify(cats));
  },

  getActiveCatId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CAT_ID);
  },

  setActiveCatId: (id: string) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CAT_ID, id);
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
    return storage.safeParse<PointsInfo>(STORAGE_KEYS.POINTS, {
      total: 0,
      lastLoginDate: null,
      dailyInteractionPoints: 0,
      lastInteractionDate: null,
      onlineMinutes: 0,
      lastOnlineUpdate: Date.now()
    });
  },

  savePoints: (points: PointsInfo) => {
    localStorage.setItem(STORAGE_KEYS.POINTS, JSON.stringify(points));
  },

  addPoints: (amount: number) => {
    const points = storage.getPoints();
    points.total += amount;
    storage.savePoints(points);
    return points.total;
  },

  deductPoints: (amount: number) => {
    const points = storage.getPoints();
    if (points.total >= amount) {
      points.total -= amount;
      storage.savePoints(points);
      return true;
    }
    return false;
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getSettings: (): AppSettings => {
    return storage.safeParse<AppSettings>(STORAGE_KEYS.SETTINGS, { 
      greetingsEnabled: true, 
      pushNotifications: true,
      timeLetterReminder: true
    });
  },

  // Diary storage
  getDiaries: (): DiaryEntry[] => {
    return storage.safeParse<DiaryEntry[]>(STORAGE_KEYS.DIARIES, []);
  },

  saveDiaries: (diaries: DiaryEntry[]) => {
    localStorage.setItem(STORAGE_KEYS.DIARIES, JSON.stringify(diaries));
  },

  deleteDiary: (id: string) => {
    const diaries = storage.getDiaries();
    const updated = diaries.filter(d => d.id !== id);
    storage.saveDiaries(updated);
    return updated;
  },

  // Time Letters storage
  getTimeLetters: (): TimeLetter[] => {
    return storage.safeParse<TimeLetter[]>(STORAGE_KEYS.TIME_LETTERS, []);
  },

  saveTimeLetters: (letters: TimeLetter[]) => {
    localStorage.setItem(STORAGE_KEYS.TIME_LETTERS, JSON.stringify(letters));
  },

  clearMediaCache: () => {
    const diaries = storage.getDiaries();
    const cleaned = diaries.map(d => ({ ...d, media: undefined }));
    storage.saveDiaries(cleaned);
  },

  deleteCat: () => {
    localStorage.removeItem(STORAGE_KEYS.CAT_LIST);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CAT_ID);
  }
};
