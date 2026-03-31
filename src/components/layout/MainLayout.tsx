import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Mail, Home, Star, User } from "lucide-react";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: BookOpen, label: "日志", path: "/diary" },
    { icon: Mail, label: "时光", path: "/time-letters" },
    { icon: Home, label: "首页", path: "/" },
    { icon: Star, label: "积分", path: "/points" },
    { icon: User, label: "Miao", path: "/profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-grow pb-24">
        <Outlet />
      </main>
      
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 backdrop-blur-lg rounded-full shadow-2xl flex justify-around items-center px-2 py-2 z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.path === "/") {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${
                  isActive ? "bg-primary text-white" : "text-on-surface-variant hover:bg-primary/10"
                }`}
              >
                <Icon size={24} />
                <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all ${
                isActive ? "text-primary" : "text-on-surface-variant opacity-70 hover:opacity-100"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
