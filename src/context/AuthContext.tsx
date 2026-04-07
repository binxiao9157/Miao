import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage, UserInfo } from '../services/storage';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  hasCat: boolean;
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
  const [hasCat, setHasCat] = useState(false);

  const refreshCatStatus = () => {
    setHasCat(storage.getCatList().length > 0);
  };

  useEffect(() => {
    // 强制每次冷启动都显示登录页，清除之前的会话状态
    storage.clearCurrentUser();
    
    // 仅刷新猫咪状态（如果有的话）
    refreshCatStatus();
  }, []);

  const login = (username: string, password: string): boolean => {
    const users = storage.getAllUsers();
    const savedUser = users.find(u => u.username === username && u.password === password);
    
    if (savedUser) {
      // 1. 设置当前用户（这会改变 storage 的 getUserKey 行为）
      storage.saveUserInfo(savedUser);
      storage.saveToken('mock_token_' + Date.now());
      
      // 2. 更新内存状态
      setIsAuthenticated(true);
      setUser(savedUser);
      
      // 3. 立即同步猫咪形象到全局缓存
      storage.getActiveCat();
      
      refreshCatStatus();
      return true;
    }
    return false;
  };

  const register = (info: UserInfo): void => {
    // 1. 保存用户信息并设为当前用户
    storage.saveUserInfo(info);
    storage.saveToken('mock_token_' + Date.now());
    
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
    setHasCat(false);
  };

  const updateProfile = (updates: Partial<UserInfo>) => {
    if (user) {
      const newUser = { ...user, ...updates };
      storage.saveUserInfo(newUser);
      setUser(newUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, hasCat, login, register, logout, updateProfile, refreshCatStatus }}>
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
