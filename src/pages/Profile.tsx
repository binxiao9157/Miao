import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight, LogOut, Shield, Bell, FileText, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { icon: UserIcon, label: "个人资料设置", path: "/edit-profile" },
    { icon: Lock, label: "修改密码", path: "/change-password" },
    { icon: Bell, label: "消息通知", path: "/notifications" },
    { icon: Shield, label: "隐私设置", path: "/privacy-settings" },
    { icon: FileText, label: "用户协议与隐私政策", path: "/privacy-policy" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-primary">Miao</h1>
        <button onClick={() => navigate("/privacy-settings")}>
          <Settings className="text-on-surface-variant" size={24} />
        </button>
      </header>

      <section className="flex flex-col items-center mb-10">
        <div className="relative mb-4">
          <img 
            src={user?.avatar || "https://picsum.photos/seed/miao_user/200/200"} 
            alt="Avatar" 
            className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <h2 className="text-xl font-bold text-on-surface">{user?.nickname || "未登录"}</h2>
        <p className="text-on-surface-variant text-sm opacity-70">ID: {user?.username || "---"}</p>
        
        <div className="mt-6 flex gap-8">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">12</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">陪伴天数</p>
          </div>
          <div className="w-px h-8 bg-outline-variant self-center"></div>
          <div className="text-center">
            <p className="text-lg font-bold text-primary">156</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">记录瞬间</p>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <button 
            key={index}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-primary">
                <item.icon size={20} />
              </div>
              <span className="font-medium text-on-surface">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant opacity-40" />
          </button>
        ))}
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 mt-6 text-red-500 font-bold"
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <LogOut size={20} />
          </div>
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
}
