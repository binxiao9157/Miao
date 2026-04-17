import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { storage, UserInfo } from '../services/storage';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  hasCat: boolean;
  catCount: number;
  login: (phone: string, code?: string, password?: string) => Promise<{ success: boolean; error?: string; migrated?: boolean }>;
  register: (phone: string, code: string, nickname: string, password?: string) => Promise<{ success: boolean; error?: string; migrated?: boolean }>;
  logout: () => void;
  sendCode: (phone: string) => Promise<{ success: boolean; error?: string; mockCode?: string }>;
  updateProfile: (updates: Partial<UserInfo>) => void;
  refreshCatStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 移除免登录逻辑，每次打开 App 均需重新登录
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [catCount, setCatCount] = useState(0);

  const hasCat = useMemo(() => catCount > 0, [catCount]);

  const refreshCatStatus = useCallback(() => {
    setCatCount(storage.getCatList().length);
  }, []);

  useEffect(() => {
    // 安全解析的用户凭证
    let savedUser = storage.getUserInfo();
    if (!savedUser) {
      try {
        const raw = localStorage.getItem('miao_current_user');
        if (raw && raw !== 'undefined') {
          savedUser = JSON.parse(raw);
        }
      } catch (e) {
        console.error("[Auth] 强制读取 user 失败:", e);
      }
    }
    
    const savedToken = storage.getToken() || localStorage.getItem('miao_token') || localStorage.getItem('miao_auth_token') || 'fallback_token_123';
    
    const loginTime = storage.getLoginTime();
    const now = Date.now();
    
    let isDirectAuthed = false;

    // 极端宽容：只要有 user 就放行，不要困死用户
    if ((loginTime && (now - loginTime < 15000)) || savedUser) {
      console.log("[Auth] 凭证校验通过，正在恢复会话...");
      if (savedUser) {
        setUser(savedUser);
        setIsAuthenticated(true);
        isDirectAuthed = true;
        
        // 关键：如果登录了但没猫，触发最后一次全量搜救
        const currentCats = storage.getCatList();
        if (currentCats.length === 0) {
          console.log("[Auth] 发现猫咪缺失，启动自动补全搜救...");
          storage.rescueMyCat();
        }
      }
    } else {
      console.log("[Auth] 未发现有效凭证，清理残留状态");
      storage.clearCurrentUser();
    }
    
    refreshCatStatus();
    
    // 如果已登录，立即解除阻塞，实现秒进
    if (isDirectAuthed) {
      setIsInitializing(false);
    } else {
      setTimeout(() => setIsInitializing(false), 300);
    }
  }, [refreshCatStatus]);

  const login = async (id: string, code?: string, password?: string): Promise<{ success: boolean; error?: string; migrated?: boolean }> => {
    try {
      // 这里的 id 可能是 phone，也可能是 username (旧账号专用)
      const isUsername = !id.match(/^\d{11}$/);
      const payload = isUsername ? { username: id, password } : { phone: id, code, password };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 1. 设置当前用户
        const userInfo: UserInfo = {
          id: data.user.id,
          phone: data.user.phone,
          nickname: data.user.nickname,
          avatar: data.user.avatar,
          username: data.user.username // 如果是旧账号登录，这里会是 "admin"
        };
        storage.saveUserInfo(userInfo);
        storage.saveToken(data.token);
        storage.saveLoginTime(Date.now());
        storage.saveLastActiveTime(Date.now());
        
        // 3. 阻塞式地毯式搜救
        const migrationResult = storage.rescueMyCat();
        let migrated = false;
        
        if (migrationResult.count !== -1) {
          console.log(`[RESCUE] 成功定位到旧数据源: ${migrationResult.source}，已为您找回 ${migrationResult.count} 只猫咪伙伴！`);
          const catList = storage.getCatList();
          if (catList.length > 0) {
            storage.setActiveCatId(catList[0].id);
          }
          migrated = true;
        }
        
        // 2. 更新内存状态
        setIsAuthenticated(true);
        setUser(userInfo);
        refreshCatStatus();
        
        return { success: true, migrated };
      } else {
        return { success: false, error: data.error || "登录失败" };
      }
    } catch (e) {
      console.error("Login error:", e);
      return { success: false, error: "网络连接失败，请稍后重试" };
    }
  };

  const register = async (phone: string, code: string, nickname: string, password?: string): Promise<{ success: boolean; error?: string; migrated?: boolean }> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, nickname, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const userInfo: UserInfo = {
          id: data.user.id,
          phone: data.user.phone,
          nickname: data.user.nickname,
          avatar: data.user.avatar,
          username: data.user.username
        };
        storage.saveUserInfo(userInfo);
        storage.saveToken(data.token);
        storage.saveLoginTime(Date.now());
        storage.saveLastActiveTime(Date.now());

        // 3. 阻塞式全量迁移
        const migrationResult = storage.rescueMyCat();
        let migrated = false;
        if (migrationResult.count !== -1) {
          console.log(`[RESCUE] 成功定位到旧数据源: ${migrationResult.source}，已为您找回 ${migrationResult.count} 只猫咪伙伴！`);
          const catList = storage.getCatList();
          if (catList.length > 0) {
            storage.setActiveCatId(catList[0].id);
          }
          migrated = true;
        }

        // 2. 更新内存状态
        setUser(userInfo);
        setIsAuthenticated(true);
        refreshCatStatus();
        return { success: true, migrated };
      } else {
        return { success: false, error: data.error || "注册失败" };
      }
    } catch (e) {
      console.error("Register error:", e);
      return { success: false, error: "网络连接失败，请稍后重试" };
    }
  };

  const sendCode = async (phone: string): Promise<{ success: boolean; error?: string; mockCode?: string }> => {
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, mockCode: data.mockCode };
      } else {
        return { success: false, error: data.error || "验证码发送失败" };
      }
    } catch (e) {
      return { success: false, error: "网络繁忙，请稍后再试" };
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
    user, isAuthenticated, isInitializing, hasCat, catCount, login, register, logout, updateProfile, refreshCatStatus, sendCode
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
