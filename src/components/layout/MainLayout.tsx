import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Mail, Home, Star, User } from "lucide-react";
import { motion } from "motion/react";
import HomePage from "../../pages/Home";
import DiaryPage from "../../pages/Diary";
import TimeLettersPage from "../../pages/TimeLetters";
import { useAuthContext } from "../../context/AuthContext";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasCat } = useAuthContext();

  const isHome = location.pathname === "/";
  const isDiary = location.pathname === "/diary";
  const isTimeLetters = location.pathname === "/time-letters";
  
  const navItems = [
    { icon: BookOpen, label: "日志", path: "/diary" },
    { icon: Mail, label: "时光", path: "/time-letters" },
    { icon: Home, label: "首页", path: "/" },
    { icon: Star, label: "积分", path: "/points" },
    { icon: User, label: "Miao", path: "/profile" },
  ];

  const [visitedTabs, setVisitedTabs] = React.useState<Set<string>>(new Set([location.pathname]));
  
  React.useEffect(() => {
    setVisitedTabs(prev => new Set(prev).add(location.pathname));
  }, [location.pathname]);

  // 模拟 IndexedStack，保持页面状态并消除切换跳动
  const renderPersistentTab = (path: string, Component: React.ComponentType) => {
    const isActive = location.pathname === path;
    const hasBeenVisited = visitedTabs.has(path);
    
    if (!hasBeenVisited) return null;

    return (
      <div 
        key={path}
        className={`fixed inset-0 transition-opacity duration-300 ${isActive ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'}`}
      >
        <div className="w-full h-full overflow-y-auto no-scrollbar bg-background">
          <div 
            className="min-h-full flex flex-col"
            style={{ 
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)'
            }}
          >
            <Component />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full relative overflow-hidden ${isHome ? 'bg-black' : 'bg-background'}`}>
      {/* Keep Home alive */}
      <div className={`fixed inset-0 ${isHome ? 'z-0 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
        {hasCat && <HomePage />}
      </div>
      
      {/* Keep Diary alive */}
      {hasCat && renderPersistentTab("/diary", DiaryPage)}
      
      {/* Keep TimeLetters alive */}
      {hasCat && renderPersistentTab("/time-letters", TimeLettersPage)}
      
      {/* Other routes will render here - 适配安全区 */}
      {!isHome && !isDiary && !isTimeLetters && (
        <div className="relative z-10 w-full h-full flex flex-col overflow-y-auto no-scrollbar bg-background">
          <div 
            className="min-h-full flex flex-col"
            style={{ 
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)', // 为底部导航栏留出足够空间
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)'
            }}
          >
            <Outlet />
          </div>
        </div>
      )}
      
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 h-16 flex items-center justify-center">
        {/* 底座背景 */}
        <div className={`absolute inset-0 rounded-3xl border transition-all duration-300 ${
          isHome ? "bg-white/20 backdrop-blur-lg border-white/20" : "bg-white/90 backdrop-blur-xl border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.1)]"
        }`} />

        {/* 导航内容 */}
        <div className="relative w-full h-full flex items-center justify-around px-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            // 首页按钮逻辑
            if (item.path === "/") {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center w-12 h-12"
                >
                  <div className={`absolute inset-0 rounded-full backdrop-blur-md border border-white/20 transition-all duration-300 ${
                    isActive ? "bg-[#D99B7A]/50 scale-110 rotate-12" : "bg-[#D99B7A]/40"
                  }`}></div>
                  <div className="relative z-10 text-white/60 flex flex-col items-center">
                    <Icon size={20} strokeWidth={2.5} />
                    <span className="text-[7px] font-black mt-0.5 uppercase tracking-tighter">{item.label}</span>
                  </div>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-glow"
                      className="absolute -inset-2 bg-[#FF9D76]/20 rounded-full blur-xl -z-10"
                    />
                  )}
                </button>
              );
            }
            
            // 普通按钮逻辑
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center p-1.5 transition-all duration-300 ${
                  isActive ? "text-primary scale-110" : "text-on-surface-variant opacity-60 hover:opacity-100"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[9px] mt-0.5 font-black uppercase tracking-tighter ${isActive ? "opacity-100" : "opacity-0"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-dot"
                    className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
