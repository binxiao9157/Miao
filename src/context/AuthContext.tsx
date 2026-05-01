import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { storage, UserInfo } from '../services/storage';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  hasCat: boolean;
  catCount: number;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: 'credentials' | 'network' }>;
  register: (info: UserInfo) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserInfo>) => void;
  refreshCatStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthResponse = {
  token?: string;
  user?: Partial<UserInfo>;
};

class AuthApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

const toUserInfo = (serverUser: Partial<UserInfo> | undefined, password: string, fallbackUsername: string): UserInfo => {
  const username = (serverUser?.username || fallbackUsername).trim();
  return {
    username,
    password,
    nickname: serverUser?.nickname || username,
    avatar: serverUser?.avatar || '',
  };
};

const requestAuth = async (path: string, payload: Record<string, string | undefined>): Promise<AuthResponse> => {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new AuthApiError(data.error || '认证请求失败', resp.status, data.code);
  }
  return data;
};

const ensureServerAccountForLocalUser = async (localUser: UserInfo): Promise<UserInfo | null> => {
  if (!localUser.password) return null;

  try {
    const data = await requestAuth('/api/v1/auth/password-login', {
      username: localUser.username,
      password: localUser.password,
    });
    const userInfo = toUserInfo(data.user, localUser.password, localUser.username);
    storage.saveUserInfo(userInfo);
    if (data.token) storage.saveToken(data.token);
    return userInfo;
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.status !== 401) return null;
  }

  try {
    const data = await requestAuth('/api/v1/auth/register', {
      username: localUser.username,
      password: localUser.password,
      nickname: localUser.nickname,
      avatar: localUser.avatar,
    });
    const userInfo = toUserInfo(data.user, localUser.password, localUser.username);
    storage.saveUserInfo(userInfo);
    if (data.token) storage.saveToken(data.token);
    return userInfo;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 移除免登录逻辑，每次打开 App 均需重新登录
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [catCount, setCatCount] = useState(0);

  const hasCat = useMemo(() => catCount > 0, [catCount]);

  const refreshCatStatus = useCallback(() => {
    setCatCount(storage.getCatList().length);
  }, []);

  useEffect(() => {
    // 初始挂载时从本地存储同步状态，而不是暴力清除
    const currentUser = storage.getUserInfo();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
      ensureServerAccountForLocalUser(currentUser).then((syncedUser) => {
        if (syncedUser) setUser(syncedUser);
      });
    }
    refreshCatStatus();
  }, [refreshCatStatus]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: 'credentials' | 'network' }> => {
    const persistLogin = (userInfo: UserInfo, token?: string) => {
      storage.saveUserInfo(userInfo);
      storage.saveToken(token || 'mock_token_' + Date.now());
      storage.saveLoginTime(Date.now());
      storage.saveLastActiveTime(Date.now());

      setIsAuthenticated(true);
      setUser(userInfo);

      storage.syncFromServer(userInfo.username).then(() => refreshCatStatus());
      refreshCatStatus();
    };

    // 老版本 PWA 曾允许服务端注册失败后仅保存本地；这里用于把这类历史账号补写到服务端。
    const users = storage.getAllUsers();
    const savedUser = users.find(u => u.username === username && u.password === password);

    try {
      const data = await requestAuth('/api/v1/auth/password-login', { username, password });
      persistLogin(toUserInfo(data.user, password, username), data.token);
      return { success: true };
    } catch (error) {
      if (!(error instanceof AuthApiError)) {
        return { success: false, error: 'network' };
      }

      if (error.status !== 401 || !savedUser) {
        return { success: false, error: error.status >= 500 ? 'network' : 'credentials' };
      }

      try {
        const data = await requestAuth('/api/v1/auth/register', {
          username: savedUser.username,
          password: savedUser.password,
          nickname: savedUser.nickname,
          avatar: savedUser.avatar,
        });
        const userInfo = toUserInfo(data.user, savedUser.password || password, savedUser.username);
        persistLogin(userInfo, data.token);
        return { success: true };
      } catch (migrationError) {
        if (migrationError instanceof AuthApiError && migrationError.status >= 500) {
          return { success: false, error: 'network' };
        }
        return { success: false, error: 'credentials' };
      }
    }
  };

  const register = async (info: UserInfo): Promise<void> => {
    try {
      const data = await requestAuth('/api/v1/auth/register', {
        username: info.username,
        password: info.password,
        nickname: info.nickname,
        avatar: info.avatar,
      });
      const userInfo = toUserInfo(data.user, info.password || '', info.username);
      storage.saveUserInfo(userInfo);
      storage.saveToken(data.token || 'mock_token_' + Date.now());
      storage.saveLoginTime(Date.now());
      storage.saveLastActiveTime(Date.now());

      setIsAuthenticated(true);
      setUser(userInfo);
      refreshCatStatus();
    } catch (e: any) {
      if (e instanceof AuthApiError && e.status === 409) {
        throw new Error('用户名已被注册');
      }
      throw new Error(e?.message || '注册失败，请重试');
    }
  };

  const logout = () => {
    // 1. 同步当前猫咪到全局，确保登录页能看到
    storage.syncLastCat();
    
    // 2. 清除当前用户标识和 Token
    storage.clearCurrentUser();
    
    // 3. 重置所有内存状态，防止数据污染
    setUser(null);
    setIsAuthenticated(false);
    setCatCount(0);
  };

  const updateProfile = (updates: Partial<UserInfo>) => {
    if (user) {
      const newUser = { ...user, ...updates };
      storage.saveUserInfo(newUser);
      setUser(newUser);
    }
  };

  const contextValue = useMemo(() => ({
    user, isAuthenticated, isInitializing, hasCat, catCount, login, register, logout, updateProfile, refreshCatStatus
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, isAuthenticated, isInitializing, hasCat, catCount]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
