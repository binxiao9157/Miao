import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { storage, UserInfo } from '../services/storage';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  hasCat: boolean;
  catCount: number;
  login: (username: string, password: string) => boolean;
  register: (info: UserInfo) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserInfo>) => void;
  refreshCatStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    }
    refreshCatStatus();
  }, [refreshCatStatus]);

  const login = (username: string, password: string): boolean => {
    const users = storage.getAllUsers();
    const savedUser = users.find(u => u.username === username && u.password === password);
    
    if (savedUser) {
      // 1. 设置当前用户
      storage.saveUserInfo(savedUser);
      storage.saveToken('mock_token_' + Date.now());
      storage.saveLoginTime(Date.now()); // 记录登录时间
      storage.saveLastActiveTime(Date.now()); // 记录最后活跃时间
      
      // 2. 更新内存状态
      setIsAuthenticated(true);
      setUser(savedUser);
      
      refreshCatStatus();
      return true;
    }
    return false;
  };

  const register = (info: UserInfo): void => {
    // 1. 保存用户信息并设为当前用户
    storage.saveUserInfo(info);
    storage.saveToken('mock_token_' + Date.now());
    storage.saveLoginTime(Date.now());
    storage.saveLastActiveTime(Date.now());

    // 2. 更新内存状态
    setUser(info);
    setIsAuthenticated(true);
    refreshCatStatus(); // 新账号此时 catList 必为空
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
