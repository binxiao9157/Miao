import React, { lazy, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Mail, Home, Star, User } from "lucide-react";
import { motion } from "motion/react";
import { useAuthContext } from "../../context/AuthContext";

// 延迟加载所有页面组件，首屏只加载当前 tab
const HomePage = lazy(() => import("../../pages/Home"));
const DiaryPage = lazy(() => import("../../pages/Diary"));
const TimeLettersPage = lazy(() => import("../../pages/TimeLetters"));
const NotificationListPage = lazy(() => import("../../pages/NotificationList"));
const PointsPage = lazy(() => import("../../pages/Points"));
const ProfilePage = lazy(() => import("../../pages/Profile"));

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasCat } = useAuthContext();

  const isHome = location.pathname === "/";
  const persistentPaths = ['/diary', '/time-letters', '/notifications', '/points', '/profile'];
  const isPersistentTab = persistentPaths.includes(location.pathname);
  
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

  // 首屏渲染后立即预加载所有 tab chunk（不等 idle/2s），确保用户切换时 chunk 已就绪
  React.useEffect(() => {
    // 微任务中触发，不阻塞首帧渲染但比 requestIdleCallback/setTimeout 更快完成
    Promise.resolve().then(() => {
      import("../../pages/Home");
      import("../../pages/Diary");
      import("../../pages/TimeLetters");
      import("../../pages/NotificationList");
      import("../../pages/Points");
      import("../../pages/Profile");
    });
  }, []);

  // 模拟 IndexedStack，保持页面状态并消除切换跳动
  const renderPersistentTab = (path: string, Component: React.ComponentType) => {
    const isActive = location.pathname === path;
    const hasBeenVisited = visitedTabs.has(path);
    
    if (!hasBeenVisited) return null;

    return (
      <motion.div 
        key={path}
        initial={false}
        animate={{ 
          opacity: isActive ? 1 : 0,
          zIndex: isActive ? 10 : -10,
          scale: isActive ? 1 : 0.98
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`absolute inset-0 ${isActive ? 'overflow-y-auto' : 'pointer-events-none overflow-hidden'}`}
      >
        <div 
          className="w-full flex-grow flex flex-col min-h-full"
          style={{ 
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <Suspense fallback={null}>
            <Component />
          </Suspense>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`fixed inset-0 overflow-hidden ${isHome ? 'bg-black' : 'bg-background'}`}>
      {/* Keep Home alive */}
      <motion.div 
        initial={false}
        animate={{ 
          opacity: isHome ? 1 : 0,
          zIndex: isHome ? 0 : -10,
          scale: isHome ? 1 : 0.98
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`absolute inset-0 ${isHome ? 'overflow-y-auto' : 'pointer-events-none overflow-hidden'}`}
      >
        {hasCat && <Suspense fallback={null}><HomePage /></Suspense>}
      </motion.div>
      
      {/* Keep Diary alive */}
      {hasCat && renderPersistentTab("/diary", DiaryPage)}
      
      {/* Keep TimeLetters alive */}
      {hasCat && renderPersistentTab("/time-letters", TimeLettersPage)}

      {/* Keep Notifications alive */}
      {hasCat && renderPersistentTab("/notifications", NotificationListPage)}

      {/* Keep Points alive */}
      {hasCat && renderPersistentTab("/points", PointsPage)}

      {/* Keep Profile alive */}
      {hasCat && renderPersistentTab("/profile", ProfilePage)}
      
      {/* Other routes will render here */}
      {!isHome && !isPersistentTab && (
        <div className="absolute inset-0 z-10 w-full flex flex-col overflow-y-auto">
          <div 
            className="flex flex-col min-h-full"
            style={{ 
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)'
            }}
          >
            <Outlet />
          </div>
        </div>
      )}
      
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 h-[52px] flex items-center justify-center">
        {/* 底座背景 */}
        <div className={`absolute inset-0 rounded-2xl border transition-all duration-300 ${
          isHome ? "bg-white/20 backdrop-blur-lg border-white/20" : "bg-white/90 backdrop-blur-xl border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.1)]"
        }`} />

        {/* 导航内容 */}
        <div className="relative w-full h-full flex items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            const activeColor = "text-[#FF9D76]";
            const inactiveColor = isHome ? "text-white/40 hover:text-white/70" : "text-[#5D4037]/45 hover:text-[#5D4037]/75";
            const bgColor = isActive 
              ? (isHome ? "bg-white/10" : "bg-[#FF9D76]/10") 
              : "bg-transparent active:scale-95";

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-all duration-200 gap-0.5 ${bgColor} ${
                  isActive ? activeColor : inactiveColor
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[9.5px] uppercase tracking-wider transition-colors ${
                  isActive ? "font-semibold" : "font-normal"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
