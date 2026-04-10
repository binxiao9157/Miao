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
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [catCount, setCatCount] = useState(0);

  const hasCat = useMemo(() => catCount > 0, [catCount]);

  const refreshCatStatus = useCallback(() => {
    setCatCount(storage.getCatList().length);
  }, []);

  useEffect(() => {
    // 尝试从 localStorage 恢复用户会话，并检查 5 分钟免登录有效期
    const savedUser = storage.getUserInfo();
    const token = storage.getToken();
    const lastActiveTime = storage.getLastActiveTime();
    const currentTime = Date.now();
    const threshold = 5 * 60 * 1000; // 5 分钟测试阈值

    if (savedUser && token && lastActiveTime && (currentTime - lastActiveTime <= threshold)) {
      // 在有效期内，恢复会话并更新活跃时间戳（滑动窗口）
      setUser(savedUser);
      setIsAuthenticated(true);
      storage.saveLastActiveTime(currentTime);
      refreshCatStatus();
    } else {
      // 超过 5 分钟或无会话数据，强制登出
      storage.clearCurrentUser();
      refreshCatStatus();
    }
    
    // 校验逻辑完成，关闭初始化状态
    setIsInitializing(false);
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
