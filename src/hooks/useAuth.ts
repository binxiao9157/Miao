import { useState, useEffect } from 'react';
import { storage, UserInfo } from '../services/storage';

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const info = storage.getUserInfo();
    const token = storage.getToken();
    if (info && token) {
      setUser(info);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const savedUser = storage.getUserInfo();
    // 模拟校验：如果用户名匹配且密码正确（或者如果是第一次登录模拟注册）
    if (savedUser && savedUser.username === username && savedUser.password === password) {
      storage.saveToken('mock_token_' + Date.now());
      setIsAuthenticated(true);
      setUser(savedUser);
      return true;
    }
    return false;
  };

  const register = (info: UserInfo): void => {
    storage.saveUserInfo(info);
    storage.saveToken('mock_token_' + Date.now());
    setUser(info);
    setIsAuthenticated(true);
  };

  const logout = () => {
    storage.clearAll();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = (updates: Partial<UserInfo>) => {
    if (user) {
      const newUser = { ...user, ...updates };
      storage.saveUserInfo(newUser);
      setUser(newUser);
    }
  };

  return { user, isAuthenticated, login, register, logout, updateProfile };
}
