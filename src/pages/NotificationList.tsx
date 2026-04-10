import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Mail, Star, Bell, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { storage } from "../services/storage";
import PageHeader from "../components/PageHeader";

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
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const points = storage.getPoints();
    const letters = storage.getTimeLetters();
    const now = Date.now();
    const newNotifications: NotificationItem[] = [];

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

    newNotifications.push({
      id: 'system_greeting',
      type: 'system',
      title: '系统问候',
      content: '今天也是元气满满的一天，记得给猫咪加餐哦。',
      timestamp: now
    });

    return newNotifications.sort((a, b) => b.timestamp - a.timestamp);
  });

  useEffect(() => {
    // Keep alive component, re-fetch logic can be added here if needed
  }, []);

  const getIcon = (type: string) => {
    const baseClass = "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm";
    switch (type) {
      case 'letter':
        return <div className={`${baseClass} bg-blue-50 text-blue-500`}><Mail size={22} /></div>;
      case 'points':
        return <div className={`${baseClass} bg-orange-50 text-orange-500`}><Star size={22} /></div>;
      default:
        return <div className={`${baseClass} bg-primary/5 text-primary`}><Bell size={22} /></div>;
    }
  };

  const NotificationSkeleton = () => (
    <div className="miao-card p-5 flex items-start gap-4 animate-pulse">
      <div className="w-12 h-12 bg-surface-container-high rounded-2xl shrink-0" />
      <div className="flex-grow space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-surface-container-high rounded-full w-1/3" />
          <div className="h-2 bg-surface-container-high rounded-full w-12" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-surface-container-high rounded-full w-full" />
          <div className="h-3 bg-surface-container-high rounded-full w-2/3" />
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="bg-background pb-24 font-sans overflow-x-hidden"
    >
      <PageHeader 
        title="消息中心" 
        subtitle="Message Center" 
        onBack={() => navigate(-1)}
        action={
          <button 
            onClick={() => navigate("/notification-settings")}
            className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
          >
            <Settings size={22} />
          </button>
        }
      />

      <div className="px-6 space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <NotificationSkeleton key={i} />)
        ) : notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
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
          </motion.div>
        ) : (
          notifications.map((item, index) => (
            <div 
              key={item.id}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
