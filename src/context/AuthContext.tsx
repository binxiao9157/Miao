import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage, UserInfo } from '../services/storage';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  register: (info: UserInfo) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserInfo>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, updateProfile }}>
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
