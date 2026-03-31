import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Sparkles, Coins } from "lucide-react";
import { storage, CatInfo, PointsInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

const VIDEOS = {
  DEFAULT: "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4",
  PETTING: "https://assets.mixkit.co/videos/preview/mixkit-cat-being-petted-on-the-head-34538-large.mp4",
  WAKEUP: "https://assets.mixkit.co/videos/preview/mixkit-cat-waking-up-and-looking-around-34540-large.mp4",
  PLAYING: "https://assets.mixkit.co/videos/preview/mixkit-cat-playing-with-a-toy-34541-large.mp4",
  EATING: "https://assets.mixkit.co/videos/preview/mixkit-cat-eating-from-a-bowl-34542-large.mp4",
};

export default function Home() {
  const navigate = useNavigate();
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [currentVideo, setCurrentVideo] = useState(VIDEOS.DEFAULT);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [showPointToast, setShowPointToast] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const onlineTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const info = storage.getActiveCat();
    setCat(info);

    // Points logic: Daily Login
    const pointsInfo = storage.getPoints();
    const today = new Date().toLocaleDateString();
    
    if (pointsInfo.lastLoginDate !== today) {
      const newTotal = storage.addPoints(10);
      pointsInfo.lastLoginDate = today;
      storage.savePoints(pointsInfo);
      setPoints(newTotal);
      triggerPointToast("+10 每日登录奖励");
    } else {
      setPoints(pointsInfo.total);
    }

    // Greeting logic
    const settings = storage.getSettings();
    if (settings.greetingsEnabled) {
      const hour = new Date().getHours();
      if (hour >= 7 && hour < 10) {
        setGreeting("早上好～");
      } else if (hour >= 22 || hour < 24 || hour < 1) { // 22:00-00:00
        setGreeting("该休息啦～");
      }
    }

    // Online time tracking
    onlineTimerRef.current = setInterval(() => {
      const p = storage.getPoints();
      const now = Date.now();
      const diffMinutes = Math.floor((now - p.lastOnlineUpdate) / 60000);
      
      if (diffMinutes >= 10) {
        const newTotal = storage.addPoints(10);
        p.lastOnlineUpdate = now;
        p.onlineMinutes += diffMinutes;
        storage.savePoints(p);
        setPoints(newTotal);
        triggerPointToast("+10 在线时长奖励");
      }
    }, 60000); // Check every minute

    return () => {
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
    };
  }, []);

  const triggerPointToast = (msg: string) => {
    setShowPointToast(msg);
    setTimeout(() => setShowPointToast(null), 3000);
  };

  const handleInteraction = () => {
    const p = storage.getPoints();
    const today = new Date().toLocaleDateString();
    
    if (p.lastInteractionDate !== today) {
      p.dailyInteractionPoints = 0;
      p.lastInteractionDate = today;
    }

    if (p.dailyInteractionPoints < 20) {
      p.dailyInteractionPoints += 5;
      const newTotal = storage.addPoints(5);
      storage.savePoints(p);
      setPoints(newTotal);
      triggerPointToast("+5 互动奖励");
    }
  };

  const playAction = (videoUrl: string) => {
    setCurrentVideo(videoUrl);
    handleInteraction();
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play();
    }
  };

  const handleVideoEnd = () => {
    if (currentVideo !== VIDEOS.DEFAULT) {
      setCurrentVideo(VIDEOS.DEFAULT);
    }
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      playAction(VIDEOS.WAKEUP);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  if (!cat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6">
          <Sparkles size={48} />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">还没有猫咪伙伴</h2>
        <p className="text-on-surface-variant text-sm opacity-70 mb-8">快去捏一只或者上传照片生成吧！</p>
        <button 
          onClick={() => navigate("/welcome")}
          className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
        >
          开启缘分
        </button>
      </div>
    );
  }

  return (
    <div className="h-full relative overflow-hidden bg-black">
      {/* 视频播放器区域 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          src={currentVideo}
          autoPlay
          muted
          loop={currentVideo === VIDEOS.DEFAULT}
          onEnded={handleVideoEnd}
          className="w-full h-full object-cover"
          playsInline
        />
        
        {/* 交互层 */}
        <motion.div 
          className="absolute inset-0 z-10"
          onClick={(e) => {
            if (e.detail === 1) {
              // 单击
              playAction(VIDEOS.PETTING);
            } else if (e.detail === 2) {
              // 双击
              playAction(VIDEOS.PLAYING);
            }
          }}
          onPointerDown={handleLongPressStart}
          onPointerUp={handleLongPressEnd}
          onPanEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 50 || Math.abs(info.offset.y) > 50) {
              playAction(VIDEOS.EATING);
            }
          }}
        />
      </div>

      {/* 积分奖励提示 */}
      <AnimatePresence>
        {showPointToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Coins size={16} />
            <span className="text-xs font-bold">{showPointToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 问候气泡 */}
      <AnimatePresence>
        {greeting && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-24 left-8 z-20 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl rounded-bl-none shadow-lg border border-white/20"
          >
            <p className="text-sm font-bold text-primary">{greeting}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部积分显示 */}
      <div className="absolute top-12 right-6 z-20">
        <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
          <Coins size={14} className="text-primary" />
          <span className="text-xs font-bold text-white">{points}</span>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-32 left-6 right-6 text-white z-20 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-primary/80 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">
            {cat.breed}
          </span>
          {cat.source === 'uploaded' && (
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} /> AI 生成
            </span>
          )}
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-1">{cat.name}</h1>
        <p className="text-sm opacity-80 font-medium">今天也是元气满满的一天喵~</p>
      </div>

      {/* 右侧操作栏 */}
      <div className="absolute right-6 bottom-48 flex flex-col gap-6 z-20">
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20">
            <Heart size={24} />
          </div>
          <span className="text-[10px] text-white font-bold">1.2k</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20">
            <MessageCircle size={24} />
          </div>
          <span className="text-[10px] text-white font-bold">互动</span>
        </button>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none z-10" />
    </div>
  );
}
