import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Mail, Home, Star, User } from "lucide-react";
import { motion } from "motion/react";
import HomePage from "../../pages/Home";
import { useAuthContext } from "../../context/AuthContext";
import { useStatusBar } from "../../hooks/useStatusBar";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasCat } = useAuthContext();

  const isHome = location.pathname === "/";
  
  // 动态管理状态栏样式
  useStatusBar(isHome ? 'immersive' : 'light');

  const navItems = [
    { icon: BookOpen, label: "日志", path: "/diary" },
    { icon: Mail, label: "时光", path: "/time-letters" },
    { icon: Home, label: "首页", path: "/" },
    { icon: Star, label: "积分", path: "/points" },
    { icon: User, label: "Miao", path: "/profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <main className={`flex-grow flex flex-col relative ${isHome ? '' : 'pb-28'}`}>
        {/* Keep Home alive by rendering it always. Use opacity/z-index instead of display:none to prevent video blanking issues in browsers */}
        <div className={`absolute inset-0 ${isHome ? 'z-0 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          {hasCat && <HomePage />}
        </div>
        
        {/* Other routes will render here - 适配安全区 */}
        <div 
          className={`absolute inset-0 z-10 bg-background overflow-y-auto ${isHome ? 'hidden' : 'block'}`}
          style={{ 
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <Outlet />
        </div>
      </main>
      
      <nav 
        className="fixed left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex justify-around items-center px-4 py-3 z-50 border border-white/50"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.path === "/") {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center w-14 h-14 -mt-10"
              >
                <div className={`absolute inset-0 rounded-full shadow-lg transition-all duration-300 ${
                  isActive ? "bg-primary scale-110 rotate-12" : "bg-primary/80"
                }`}></div>
                <div className="relative z-10 text-white flex flex-col items-center">
                  <Icon size={24} strokeWidth={2.5} />
                  <span className="text-[8px] font-black mt-0.5 uppercase tracking-tighter">{item.label}</span>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute -inset-2 bg-primary/20 rounded-full blur-xl -z-10"
                  />
                )}
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center p-2 transition-all duration-300 ${
                isActive ? "text-primary scale-110" : "text-on-surface-variant opacity-40 hover:opacity-100"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${isActive ? "opacity-100" : "opacity-0"}`}>
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
      </nav>
    </div>
  );
}
