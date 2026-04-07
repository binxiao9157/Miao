import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Mail, Star, Bell, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { storage } from "../services/storage";

interface NotificationItem {
  id: string;
  type: 'letter' | 'points' | 'system';
  title: string;
  content: string;
  timestamp: number;
  link?: string;
}

const formatNotificationTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const date = new Date(timestamp);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export default function NotificationList() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const diaries = storage.getDiaries();
    const points = storage.getPoints();
    const letters = storage.getTimeLetters();
    const now = Date.now();

    const newNotifications: NotificationItem[] = [];

    // 1. 检查信件解锁 (模拟逻辑)
    const unlockedLetters = letters.filter(l => l.unlockAt <= now);
    if (unlockedLetters.length > 0) {
      newNotifications.push({
        id: 'letter_unlocked',
        type: 'letter',
        title: '时光信件解锁',
        content: `你有 ${unlockedLetters.length} 封时光信件已解锁，快去看看吧～`,
        timestamp: unlockedLetters[unlockedLetters.length - 1].unlockAt,
        link: '/time-letters'
      });
    }

    // 2. 检查积分变动
    if (points.history.length > 0) {
      const lastTx = points.history[0];
      newNotifications.push({
        id: 'points_update',
        type: 'points',
        title: '积分变动提醒',
        content: `${lastTx.type === 'earn' ? '获得' : '消耗'}了 ${lastTx.amount} 积分：${lastTx.reason}`,
        timestamp: lastTx.timestamp
      });
    }

    // 3. 系统问候
    newNotifications.push({
      id: 'system_greeting',
      type: 'system',
      title: '系统问候',
      content: '今天也是元气满满的一天，记得给猫咪加餐哦。',
      timestamp: now
    });

    setNotifications(newNotifications.sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'letter':
        return <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500"><Mail size={20} /></div>;
      case 'points':
        return <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500"><Star size={20} /></div>;
      default:
        return <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Bell size={20} /></div>;
    }
  };

  return (
    <div 
      className="min-h-screen bg-background px-6 pb-24 font-sans"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant active:scale-90 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-black text-on-surface ml-2">消息中心</h1>
        </div>
        <button 
          onClick={() => navigate("/notification-settings")}
          className="p-2 text-on-surface-variant active:scale-90 transition-transform"
        >
          <Settings size={22} />
        </button>
      </header>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-32 h-32 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 overflow-hidden">
              <img 
                src="https://picsum.photos/seed/waiting_cat/200/200" 
                alt="Waiting cat" 
                className="w-full h-full object-cover opacity-40 grayscale"
                referrerPolicy="no-referrer"
              />
            </div>
            <h3 className="text-lg font-black text-on-surface mb-2">暂时没有新消息哦</h3>
            <p className="text-xs text-on-surface-variant opacity-60">小猫正在努力为你收集动态...</p>
          </div>
        ) : (
          notifications.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => item.link && navigate(item.link)}
              className={`miao-card p-5 flex items-start gap-4 active:scale-[0.98] transition-all ${item.link ? 'cursor-pointer' : ''}`}
            >
              {getIcon(item.type)}
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-black text-on-surface truncate pr-2">{item.title}</h3>
                  <span className="text-[10px] text-on-surface-variant opacity-40 font-bold whitespace-nowrap">{formatNotificationTime(item.timestamp)}</span>
                </div>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed line-clamp-2">
                  {item.content}
                </p>
              </div>
              {item.link && (
                <div className="self-center text-on-surface-variant/20">
                  <ChevronRight size={16} />
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
