import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Mail, Star, Bell, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, useCallback } from "react";
import { storage } from "../services/storage";
import PageHeader from "../components/PageHeader";

interface NotificationItem {
  id: string;
  type: 'letter' | 'points' | 'system';
  unreadCount: number;
  isRead: boolean; // 新增：是否已读
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

/** 从 localStorage 同步计算通知列表 */
export function computeNotifications(): NotificationItem[] {
  const points = storage.getPoints();
  const letters = storage.getTimeLetters();
  const readIds = storage.getReadNotificationIds();
  const isFastForward = storage.getIsFastForward();
  const now = Date.now();
  const items: NotificationItem[] = [];

  const unlockedLetters = letters.filter(l => {
    if (!isFastForward) return l.unlockAt <= now;
    // 加速模式计算逻辑
    const totalDuration = l.unlockAt - l.createdAt;
    const scaledDuration = totalDuration / 86400;
    return (now - l.createdAt) >= scaledDuration;
  });

  if (unlockedLetters.length > 0) {
    // 使用最新一封解锁信件的时间戳作为 ID 的一部分，确保新解锁能触发红点
    const latestUnlock = Math.max(...unlockedLetters.map(l => l.unlockAt));
    const id = `letter_unlocked_${unlockedLetters.length}_${latestUnlock}`;
    items.push({
      id,
      type: 'letter',
      unreadCount: unlockedLetters.length,
      isRead: readIds.includes(id),
      title: '时光信件解锁',
      content: `你有 ${unlockedLetters.length} 封时光信件已解锁，快去看看吧～`,
      timestamp: unlockedLetters[unlockedLetters.length - 1].unlockAt,
      link: '/time-letters'
    });
  }

  if (points.history.length > 0) {
    const lastTx = points.history[0];
    const id = 'points_update';
    items.push({
      id,
      type: 'points',
      unreadCount: 1,
      isRead: readIds.includes(id),
      title: '积分变动提醒',
      content: `${lastTx.type === 'earn' ? '获得' : '消耗'}了 ${lastTx.amount} 积分：${lastTx.reason}`,
      timestamp: lastTx.timestamp
    });
  }

  const systemId = 'system_greeting';
  items.push({
    id: systemId,
    type: 'system',
    unreadCount: 1,
    isRead: readIds.includes(systemId),
    title: '系统问候',
    content: '今天也是元气满满的一天，记得给猫咪加餐哦。',
    timestamp: now
  });

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export default function NotificationList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => computeNotifications());
  const [lastReadTime, setLastReadTime] = useState(() => storage.getLastReadNotificationTime());

  // keep-alive：路由激活时静默刷新数据，不清空列表，无闪烁
  useEffect(() => {
    const refresh = () => {
      setNotifications(computeNotifications());
    };

    if (location.pathname === '/notifications') {
      refresh();
    }

    window.addEventListener('fast-forward-changed', refresh);
    return () => window.removeEventListener('fast-forward-changed', refresh);
  }, [location.pathname]);

  const handleNotificationClick = (item: NotificationItem) => {
    // 动作一：标记已读
    storage.markNotificationAsRead(item.id);
    
    // 动作二：执行跳转
    if (item.id === 'system_greeting') {
      // 系统问候跳转到首页
      navigate("/", { state: { fromNotification: true, notificationType: 'system' } });
    } else if (item.id === 'points_update') {
      // 积分变动跳转到积分页
      navigate("/points");
    } else if (item.link) {
      navigate(item.link);
    } else {
      // 没有任何跳转则只刷新本地状态
      setNotifications(computeNotifications());
    }
  };

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

  return (
    <div 
      className="bg-background font-sans h-full overflow-y-auto no-scrollbar flex flex-col"
    >
      <PageHeader 
        title="消息中心" 
        subtitle="Message Center" 
        onBack={() => navigate("/profile")}
        action={
          <button 
            onClick={() => navigate("/notification-settings")}
            className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
          >
            <Settings size={22} />
          </button>
        }
      />

      <div className="px-6 space-y-4 pb-24 shrink-0 overflow-visible">
        {notifications.length === 0 ? (
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
          notifications.map((item, index) => {
            const isUnread = !item.isRead;
            return (
              <div 
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`miao-card p-5 flex items-start gap-4 active:scale-[0.98] transition-all relative cursor-pointer ${isUnread ? 'bg-primary/[0.03] border-l-4 border-primary' : ''}`}
              >
                <div className="relative shrink-0">
                  {getIcon(item.type)}
                  {isUnread && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-md animate-bounce">
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </span>
                  )}
                </div>
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
            );
          })
        )}
      </div>
    </div>
  );
}
