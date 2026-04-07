import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Mail, Home, Star, User } from "lucide-react";
import { motion } from "motion/react";
import HomePage from "../../pages/Home";
import { useAuthContext } from "../../context/AuthContext";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasCat } = useAuthContext();

  const isHome = location.pathname === "/";
  
  const navItems = [
    { icon: BookOpen, label: "日志", path: "/diary" },
    { icon: Mail, label: "时光", path: "/time-letters" },
    { icon: Home, label: "首页", path: "/" },
    { icon: Star, label: "积分", path: "/points" },
    { icon: User, label: "Miao", path: "/profile" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-background relative overflow-hidden">
      <main className="flex-grow relative w-full h-full">
        {/* Keep Home alive by rendering it always. Use opacity/z-index instead of display:none to prevent video blanking issues in browsers */}
        <div className={`absolute inset-0 w-full h-full ${isHome ? 'z-0 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          {hasCat && <HomePage />}
        </div>
        
        {/* Other routes will render here - 适配安全区 */}
        <div 
          className={`absolute inset-0 z-10 bg-background overflow-y-auto no-scrollbar ${isHome ? 'hidden' : 'block'}`}
        >
          <div 
            className="min-h-full flex flex-col"
            style={{ 
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)', // 为底部导航栏留出足够空间
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)'
            }}
          >
            <Outlet />
          </div>
        </div>
      </main>
      
      <nav 
        className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex justify-around items-center px-4 z-50 border border-white/50 rounded-3xl"
        style={{ 
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
          paddingTop: '0.75rem'
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.path === "/") {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center w-14 h-14 -mt-8"
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
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-black uppercase tracking-tighter ${isActive ? "opacity-100" : "opacity-0"}`}>
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
