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
}

export interface AppSettings {
  greetingsEnabled: boolean;
  pushNotifications: boolean;
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
    const data = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    return data ? JSON.parse(data) : null;
  },
  
  saveToken: (token: string) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },
  
  getToken: () => {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },
  
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  // Cat Management
  getCatList: (): CatInfo[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CAT_LIST);
    return data ? JSON.parse(data) : [];
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
    return list.find(c => c.id === activeId) || list[0] || null;
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
    const data = localStorage.getItem(STORAGE_KEYS.POINTS);
    return data ? JSON.parse(data) : {
      total: 0,
      lastLoginDate: null,
      dailyInteractionPoints: 0,
      lastInteractionDate: null,
      onlineMinutes: 0,
      lastOnlineUpdate: Date.now()
    };
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

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getSettings: (): AppSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : { greetingsEnabled: true, pushNotifications: true };
  },

  // Diary storage
  getDiaries: (): DiaryEntry[] => {
    const data = localStorage.getItem(STORAGE_KEYS.DIARIES);
    return data ? JSON.parse(data) : [];
  },

  saveDiaries: (diaries: DiaryEntry[]) => {
    localStorage.setItem(STORAGE_KEYS.DIARIES, JSON.stringify(diaries));
  },

  // Time Letters storage
  getTimeLetters: (): TimeLetter[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TIME_LETTERS);
    return data ? JSON.parse(data) : [];
  },

  saveTimeLetters: (letters: TimeLetter[]) => {
    localStorage.setItem(STORAGE_KEYS.TIME_LETTERS, JSON.stringify(letters));
  },

  clearMediaCache: () => {
    const diaries = storage.getDiaries();
    const cleaned = diaries.map(d => ({ ...d, media: undefined }));
    storage.saveDiaries(cleaned);
  }
};
