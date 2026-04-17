import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight, LogOut, Shield, Bell, FileText, Lock, User as UserIcon, Heart, Calendar, Image as ImageIcon, Camera, Trash2, QrCode, ScanQrCode } from "lucide-react";
import PawIcon from "../components/PawIcon";
import { useAuthContext } from "../context/AuthContext";
import { storage, CatInfo } from "../services/storage";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import InstallPromptBanner from "../components/InstallPromptBanner";
import PageHeader from "../components/PageHeader";
import AdminPresetConfig from "../components/AdminPresetConfig";
import Modal from "../components/Modal";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const [stats, setStats] = useState({ days: 0, entries: 0 });
  const [activeCat, setActiveCat] = useState<CatInfo | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBindModal, setShowBindModal] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  
  // 用于绑定逻辑
  const [bindPhone, setBindPhone] = useState("");
  const [bindCode, setBindCode] = useState("");
  const [bindError, setBindError] = useState("");
  const [isBindingLoading, setIsBindingLoading] = useState(false);
  const [bindCountdown, setBindCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bindCountdown > 0) {
      timer = setTimeout(() => setBindCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [bindCountdown]);

  const handleGetBindCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(bindPhone)) {
      setBindError("请输入有效的11位手机号");
      return;
    }
    setBindError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: bindPhone })
      });
      const data = await res.json();
      if (res.ok) {
        setBindCountdown(60);
        if (data.mockCode) setBindCode(data.mockCode);
      } else {
        setBindError(data.error || "验证码发送失败");
      }
    } catch (e) {
      setBindError("网络错误，请稍后再试");
    }
  };

  const handleBindPhone = async () => {
    if (!/^1[3-9]\d{9}$/.test(bindPhone)) {
      setBindError("手机号格式不正确");
      return;
    }
    if (!bindCode) {
      setBindError("请输入验证码");
      return;
    }
    
    setIsBindingLoading(true);
    setBindError("");

    try {
      const token = storage.getToken();
      const res = await fetch("/api/auth/bind-phone", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ phone: bindPhone, code: bindCode })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // 先在本地执行搬迁
        storage.bindPhoneAndMigrateData(bindPhone);
        alert("账号绑定及升级成功！页面将刷新同步数据。");
        window.location.reload();
      } else {
        setBindError(data.error || "绑定失败");
      }
    } catch (e) {
      setBindError("绑定请求失败，请检查网络");
    } finally {
      setIsBindingLoading(false);
    }
  };

  useEffect(() => {
    const loadStats = () => {
      const cat = storage.getActiveCat();
      setActiveCat(cat);

      if (!cat) {
        setStats({ days: 0, entries: 0 });
        return;
      }

      // 1. 计算陪伴天数 (专属)
      const diaries = storage.getDiaries();
      const catDiaries = diaries.filter(d => d.catId === cat.id);
      
      // 优先级：cat.createdAt > 第一条日记时间 > 1天
      let startTime = cat.createdAt;
      if (!startTime && catDiaries.length > 0) {
        // 兜底：取该猫咪最早的一条日记时间
        startTime = Math.min(...catDiaries.map(d => d.createdAt));
      }

      const days = startTime
        ? Math.max(1, Math.ceil((Date.now() - startTime) / (1000 * 60 * 60 * 24)))
        : 1;

      // 2. 计算记录瞬间 (专属)
      setStats({
        days,
        entries: catDiaries.length
      });
    };

    loadStats();

    // 监听活跃猫咪切换、猫咪更新以及日记更新事件，实现实时同步
    window.addEventListener('active-cat-changed', loadStats);
    window.addEventListener('cat-updated', loadStats);
    window.addEventListener('diary-updated', loadStats);
    
    return () => {
      window.removeEventListener('active-cat-changed', loadStats);
      window.removeEventListener('cat-updated', loadStats);
      window.removeEventListener('diary-updated', loadStats);
    };
  }, []);

  const handleLogout = () => {
    logout(); // AuthContext 中的 logout 已包含内存重置与 storage.clearCurrentUser()
    navigate("/login", { replace: true });
  };

  const handleDeleteAccount = () => {
    storage.clearAll(); // 物理删除当前用户的所有数据
    logout(); // 内存清理
    navigate("/register", { replace: true });
  };

  const menuItems = [
    { icon: UserIcon, label: "个人资料设置", path: "/edit-profile", color: "bg-blue-50 text-blue-500" },
    { icon: Shield, label: "绑定手机号", action: () => setShowBindModal(true), color: "bg-green-50 text-green-500" },
    { icon: Bell, label: "消息通知", path: "/notification-settings", color: "bg-orange-50 text-orange-500" },
    { icon: FileText, label: "意见反馈", path: "/feedback", color: "bg-purple-50 text-purple-500" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader 
        title="个人中心" 
        subtitle="Profile & Settings" 
        action={
          <button 
            onClick={() => navigate('/settings')}
            className="p-3 bg-white shadow-sm rounded-2xl active:scale-90 transition-transform"
          >
            <Settings size={20} className="text-on-surface-variant" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* User Stats Card */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-[32px] overflow-hidden shadow-xl ring-4 ring-white transition-all group-hover:shadow-2xl">
                <img 
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'miao'}`} 
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform border-2 border-white">
                <Camera size={14} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-1">
              <h2 className="text-2xl font-black text-on-surface tracking-tight">{user?.nickname || user?.username || '小主'}</h2>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded-full ${user?.phone ? 'bg-green-50' : 'bg-secondary/10'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${user?.phone ? 'text-green-600' : 'text-secondary'}`}>
                    {user?.phone ? '手机号已认证' : '游客账号'}
                  </span>
                </div>
                {!user?.phone && (
                  <button 
                    onClick={() => {
                      const res = storage.rescueMyCat();
                      if (res.count > 0) {
                        alert(`成功找回 ${res.count} 只猫咪！正在同步数据...`);
                        window.location.reload();
                      } else {
                        alert("未发现可同步的旧数据。");
                      }
                    }} 
                    className="text-[10px] font-bold text-primary underline decoration-2 underline-offset-4"
                  >
                    找回旧账号
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-white p-6 rounded-[32px] shadow-sm flex flex-col items-center group active:scale-[0.98] transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-3">
                <Calendar size={24} />
              </div>
              <span className="text-3xl font-black text-on-surface">{stats.days}</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">陪伴天数</span>
            </div>
            <div className="bg-white p-6 rounded-[32px] shadow-sm flex flex-col items-center group active:scale-[0.98] transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-3">
                <ImageIcon size={24} />
              </div>
              <span className="text-3xl font-black text-on-surface">{stats.entries}</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">记录瞬间</span>
            </div>
          </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black text-on-surface-variant opacity-40 uppercase tracking-[0.2em] ml-2 mb-2">账户设置</p>
          {menuItems.map((item, index) => (
            <button 
              key={index}
              onClick={item.action ? item.action : () => navigate(item.path!)}
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
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all hover:shadow-md mt-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
                    <LogOut size={20} />
                  </div>
                  <span className="font-bold text-on-surface text-sm">退出登录</span>
                </div>
                <ChevronRight size={16} className="text-on-surface-variant opacity-30" />
              </button>

              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl shadow-sm active:scale-[0.98] transition-all hover:shadow-md mt-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 text-red-500 rounded-xl flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  <span className="font-bold text-red-500 text-sm">注销账户</span>
                </div>
                <ChevronRight size={16} className="text-red-300" />
              </button>
          </div>
        </div>

        <footer className="mt-4 text-center pb-10">
          <p 
            onClick={() => {
              setClickCount(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setShowAdmin(true);
                  return 0;
                }
                return next;
              });
            }}
            className="text-[10px] font-bold text-on-surface-variant opacity-30 uppercase tracking-widest cursor-pointer select-none"
          >
            Miao Version 1.0.0
          </p>
          <div className="flex justify-center gap-1 mt-1">
            <Heart size={8} className="text-primary fill-current" />
            <Heart size={8} className="text-secondary fill-current" />
            <Heart size={8} className="text-primary fill-current" />
          </div>
        </footer>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showBindModal && (
          <Modal show={showBindModal} onClose={() => setShowBindModal(false)}>
            <div className="p-2">
              <h3 className="text-xl font-black text-gray-900 mb-2">绑定手机号</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">绑定后数据将永久关联至手机号</p>
              
              <div className="space-y-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 ml-1">手机号码</label>
                  <input 
                    type="tel"
                    placeholder="输入手机号"
                    value={bindPhone}
                    onChange={(e) => setBindPhone(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none text-base font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 ml-1">短信验证码</label>
                  <div className="flex gap-2">
                    <input 
                      type="tel"
                      placeholder="验证码"
                      value={bindCode}
                      onChange={(e) => setBindCode(e.target.value)}
                      className="flex-1 p-4 rounded-2xl bg-gray-50 border-none text-base font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button 
                      onClick={handleGetBindCode}
                      disabled={bindCountdown > 0}
                      className="px-6 py-4 bg-gray-100 text-xs font-black text-gray-500 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
                    >
                      {bindCountdown > 0 ? `${bindCountdown}s` : "获取"}
                    </button>
                  </div>
                </div>
                
                {bindError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-bold text-red-500 px-1"
                  >
                    {bindError}
                  </motion.p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleBindPhone}
                  disabled={isBindingLoading}
                  className="w-full py-4 bg-primary text-white rounded-[24px] font-black shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isBindingLoading ? '处理中...' : '确认绑定'}
                </button>
                <button 
                  onClick={() => setShowBindModal(false)}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-[24px] font-black active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showLogoutConfirm && (
          <Modal show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)}>
            <div className="text-center p-2">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">退出登录？</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                退出后您将需要重新验证身份进入。
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 bg-primary text-white rounded-[24px] font-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  确认退出
                </button>
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-[24px] font-black active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showDeleteConfirm && (
          <Modal show={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
            <div className="text-center p-2">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-red-600 mb-2">注销账户？</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed px-2">
                此操作将永久抹除在该设备上的所有数据，包括猫咪、相册和回忆，且无法找回。
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full py-4 bg-red-500 text-white rounded-[24px] font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  永久注销
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 bg-gray-100 text-gray-400 rounded-[24px] font-black active:scale-95 transition-all"
                >
                  我再想想
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showAdmin && (
          <AdminPresetConfig onClose={() => setShowAdmin(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
