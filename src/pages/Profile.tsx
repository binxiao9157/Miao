import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight, LogOut, Shield, Bell, FileText, Lock, User as UserIcon, Heart, Calendar, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { storage } from "../services/storage";
import { useState, useEffect } from "react";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ days: 0, entries: 0 });

  useEffect(() => {
    const userData = storage.getUserInfo();
    const diaries = storage.getDiaries();
    
    // Calculate days since registration (mocked for now or based on first diary)
    const firstDiary = diaries[diaries.length - 1];
    const days = firstDiary 
      ? Math.max(1, Math.ceil((Date.now() - new Date(firstDiary.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    setStats({
      days,
      entries: diaries.length
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { icon: UserIcon, label: "个人资料设置", path: "/edit-profile", color: "bg-blue-50 text-blue-500" },
    { icon: Lock, label: "修改密码", path: "/change-password", color: "bg-purple-50 text-purple-500" },
    { icon: Bell, label: "消息通知", path: "/notifications", color: "bg-orange-50 text-orange-500" },
    { icon: Shield, label: "隐私设置", path: "/privacy-settings", color: "bg-green-50 text-green-500" },
    { icon: FileText, label: "用户协议与隐私政策", path: "/privacy-policy", color: "bg-gray-50 text-gray-500" },
  ];

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-primary">Miao</h1>
        <button 
          onClick={() => navigate("/privacy-settings")}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
        >
          <Settings size={20} />
        </button>
      </header>

      <section className="flex flex-col items-center mb-10">
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary shadow-xl">
            <img 
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'default'}`} 
              alt="Avatar" 
              className="w-full h-full rounded-full border-4 border-white object-cover bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute bottom-1 right-1 w-7 h-7 bg-green-500 border-4 border-white rounded-full shadow-sm"></div>
        </div>
        <h2 className="text-xl font-black text-on-surface">{user?.nickname || "喵星人"}</h2>
        <p className="text-[10px] font-bold text-on-surface-variant opacity-50 uppercase tracking-widest mt-1">ID: {user?.username || "---"}</p>
        
        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
          <div className="miao-card p-4 flex flex-col items-center justify-center bg-white border-b-4 border-primary/20">
            <Calendar className="text-primary mb-1 opacity-40" size={16} />
            <p className="text-xl font-black text-primary">{stats.days}</p>
            <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-tighter">陪伴天数</p>
          </div>
          <div className="miao-card p-4 flex flex-col items-center justify-center bg-white border-b-4 border-secondary/20">
            <ImageIcon className="text-secondary mb-1 opacity-40" size={16} />
            <p className="text-xl font-black text-secondary">{stats.entries}</p>
            <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-tighter">记录瞬间</p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <p className="text-[10px] font-black text-on-surface-variant opacity-40 uppercase tracking-[0.2em] ml-2 mb-2">账户设置</p>
        {menuItems.map((item, index) => (
          <button 
            key={index}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center`}>
                <item.icon size={20} />
              </div>
              <span className="font-bold text-on-surface text-sm">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-on-surface-variant opacity-30" />
          </button>
        ))}
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 mt-8 text-red-500 font-black text-sm bg-red-50 rounded-2xl active:scale-[0.98] transition-all"
        >
          <LogOut size={18} />
          <span>退出登录</span>
        </button>
      </div>

      <footer className="mt-12 text-center">
        <p className="text-[10px] font-bold text-on-surface-variant opacity-30 uppercase tracking-widest">Miao Version 1.0.0</p>
        <div className="flex justify-center gap-1 mt-1">
          <Heart size={8} className="text-primary fill-current" />
          <Heart size={8} className="text-secondary fill-current" />
          <Heart size={8} className="text-primary fill-current" />
        </div>
      </footer>
    </div>
  );
}
