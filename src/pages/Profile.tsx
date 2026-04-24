import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight, LogOut, Shield, Bell, FileText, Lock, User as UserIcon, Heart, Calendar, Image as ImageIcon, Camera, Trash2, QrCode, ScanQrCode } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { storage, CatInfo } from "../services/storage";
import { computeNotifications } from "./NotificationList";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import InstallPromptBanner from "../components/InstallPromptBanner";
import PageHeader from "../components/PageHeader";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const [stats, setStats] = useState({ days: 0, entries: 0 });
  const [activeCat, setActiveCat] = useState<CatInfo | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

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

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 逻辑复用：计算未读消息个数
    const checkNotifications = () => {
      const allNotifications = computeNotifications();
      // 过滤出未读的通知
      const unreadList = allNotifications.filter(n => !n.isRead);
      setUnreadCount(unreadList.length);
    };

    checkNotifications();
    window.addEventListener('active-cat-changed', checkNotifications);
    window.addEventListener('diary-updated', checkNotifications);
    window.addEventListener('notifications-read', checkNotifications);
    window.addEventListener('fast-forward-changed', checkNotifications);
    
    return () => {
      window.removeEventListener('active-cat-changed', checkNotifications);
      window.removeEventListener('diary-updated', checkNotifications);
      window.removeEventListener('notifications-read', checkNotifications);
      window.removeEventListener('fast-forward-changed', checkNotifications);
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
    { icon: Bell, label: "通知设置", path: "/notification-settings", color: "bg-orange-50 text-orange-500" },
    { icon: FileText, label: "意见反馈", path: "/feedback", color: "bg-purple-50 text-purple-500" },
  ];

  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      <PageHeader 
        title="Miao" 
        subtitle="MIAO SANCTUARY" 
        action={
          <div className="flex gap-2">
            <button 
              onClick={() => navigate("/scan-friend")}
              className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform border border-outline-variant/30"
            >
              <ScanQrCode size={24} />
            </button>
            <button 
              onClick={handleNotificationClick}
              className="relative w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 hover:bg-orange-50/50 transition-all border border-outline-variant/30 group"
            >
              <Bell size={24} className="group-active:rotate-12 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        }
      />

      <div className="px-6 pb-6 flex flex-col shrink-0 overflow-visible">
        <div className="flex-grow">
          <InstallPromptBanner />
        <section className="flex flex-col items-center mb-10">
          <div className="relative mb-4 group">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary shadow-xl overflow-hidden">
              <img 
                src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=miao_default"} 
                alt="Avatar" 
                className="w-full h-full rounded-full border-4 border-white object-cover bg-white"
                referrerPolicy="no-referrer"
              />
            </div>
            <button 
              onClick={() => navigate("/edit-profile")}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={14} />
            </button>
          </div>
          <h2 className="text-xl font-black text-on-surface">{user?.nickname || "喵星人"}</h2>
          <p className="text-[10px] font-bold text-on-surface-variant opacity-50 uppercase tracking-widest mt-1">ID: {user?.username || "---"}</p>
          
          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/accompany-milestone", { state: { catName: activeCat?.name || "猫咪", days: stats.days } })}
              className="miao-card p-4 flex flex-col items-center justify-center bg-white border-b-4 border-primary/20 cursor-pointer"
            >
              <Calendar className="text-primary mb-1 opacity-40" size={16} />
              <p className="text-xl font-black text-primary">{stats.days}</p>
              <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-tighter">陪伴天数</p>
            </motion.div>
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/diary")}
              className="miao-card p-4 flex flex-col items-center justify-center bg-white border-b-4 border-secondary/20 cursor-pointer"
            >
              <ImageIcon className="text-secondary mb-1 opacity-40" size={16} />
              <p className="text-xl font-black text-secondary">{stats.entries}</p>
              <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-tighter">记录瞬间</p>
            </motion.div>
          </div>

          {/* 猫咪切换入口 */}
          <button 
            onClick={() => navigate("/switch-companion")}
            className="w-full mt-4 flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all hover:shadow-md border-l-4 border-primary"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Heart size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-on-surface text-sm">我的伙伴</p>
                <p className="text-[10px] text-on-surface-variant opacity-60">当前：{activeCat?.name || "未选择"}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-on-surface-variant opacity-30" />
          </button>
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">退出登录？</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                确定要退出登录吗？
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleLogout}
                  className="w-full py-3 bg-primary text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
                >
                  确定退出
                </button>
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-500 mb-2">注销账户？</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                注销账户将永久删除您的所有数据（包括猫咪、日记、信件），此操作不可撤销。确定继续吗？
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
                >
                  确定注销
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  再想想
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-12 text-center pb-10">
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
          MIAO SANCTUARY
        </p>
        <div className="flex justify-center gap-1 mt-1">
          <Heart size={8} className="text-primary fill-current" />
          <Heart size={8} className="text-secondary fill-current" />
          <Heart size={8} className="text-primary fill-current" />
        </div>
        <a 
          href="https://beian.miit.gov.cn/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-on-surface-variant/30 tracking-wider mt-2 hover:opacity-100 transition-opacity inline-block"
        >
          浙ICP备2026026483号-1
        </a>
      </footer>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdmin && (
          <AdminPresetConfig onClose={() => setShowAdmin(false)} />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

import AdminPresetConfig from "../components/AdminPresetConfig";
