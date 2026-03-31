import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Sparkles, Coins, Plus, Share2 } from "lucide-react";
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
  const [isLiked, setIsLiked] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const onlineTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const info = storage.getActiveCat();
    setCat(info);

    // 如果是 AI 生成的猫咪，默认播放其生成的视频
    if (info && info.source === 'uploaded' && info.videoPath) {
      setCurrentVideo(info.videoPath);
    }

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
      } else if (hour >= 22 && hour < 24) {
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
    }, 60000);

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
    const defaultSource = (cat?.source === 'uploaded' && cat.videoPath) ? cat.videoPath : VIDEOS.DEFAULT;
    if (currentVideo !== defaultSource) {
      setCurrentVideo(defaultSource);
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

  if (!cat || !cat.name) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-12 text-center bg-background">
        <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-8">
          <Sparkles size={64} />
        </div>
        <h2 className="text-3xl font-black text-on-surface mb-3">还没有猫咪伙伴</h2>
        <p className="text-on-surface-variant text-base mb-12">快去捏一只或者上传照片生成吧！</p>
        <button 
          onClick={() => navigate("/welcome")}
          className="miao-btn-primary max-w-xs"
        >
          开启缘分
        </button>
      </div>
    );
  }

  return (
    <div className="flex-grow relative overflow-hidden bg-black">
      {/* 视频播放器区域 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          src={currentVideo}
          autoPlay
          muted
          loop={currentVideo === (cat?.source === 'uploaded' ? cat.videoPath : VIDEOS.DEFAULT)}
          onEnded={handleVideoEnd}
          className="w-full h-full object-cover"
          playsInline
        />
        
        {/* 交互层 */}
        <motion.div 
          className="absolute inset-0 z-10"
          onClick={(e) => {
            if (e.detail === 1) {
              playAction(VIDEOS.PETTING);
            } else if (e.detail === 2) {
              playAction(VIDEOS.PLAYING);
            }
          }}
          onPointerDown={handleLongPressStart}
          onPointerUp={handleLongPressEnd}
        />
      </div>

      {/* 顶部状态栏 */}
      <div className="absolute top-12 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center text-white overflow-hidden">
            <img src={cat.avatar || "https://picsum.photos/seed/cat-avatar/100/100"} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="bg-white/20 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/20">
            <span className="text-xs font-black text-white">{cat.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-white/20 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
            <Coins size={14} className="text-primary" />
            <span className="text-xs font-black text-white">{points}</span>
          </div>
          <button onClick={() => navigate("/settings")} className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center text-white">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* 积分奖励提示 */}
      <AnimatePresence>
        {showPointToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Coins size={16} />
            <span className="text-sm font-black">{showPointToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 问候气泡 */}
      <AnimatePresence>
        {greeting && (
          <motion.div 
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-32 left-8 z-20 bg-white/90 backdrop-blur-md px-5 py-3 rounded-3xl rounded-bl-none shadow-xl border border-white/20"
          >
            <p className="text-sm font-black text-on-primary-container">{greeting}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右侧操作栏 */}
      <div className="absolute right-6 bottom-40 flex flex-col gap-6 z-20">
        <button 
          onClick={() => setIsLiked(!isLiked)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-14 h-14 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 transition-all ${isLiked ? 'bg-red-500 text-white border-red-500' : 'bg-white/10 text-white'}`}>
            <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
          </div>
          <span className="text-[10px] text-white font-black drop-shadow-md">1.2k</span>
        </button>
        
        <button className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20">
            <MessageCircle size={28} />
          </div>
          <span className="text-[10px] text-white font-black drop-shadow-md">86</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20">
            <Share2 size={28} />
          </div>
          <span className="text-[10px] text-white font-black drop-shadow-md">分享</span>
        </button>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-32 left-6 right-24 text-white z-20 pointer-events-none">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-4 py-1 bg-primary/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
            {cat.breed}
          </span>
          {cat.source === 'uploaded' && (
            <span className="px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} /> AI 生成
            </span>
          )}
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2 drop-shadow-lg">{cat.name}</h1>
        <p className="text-base opacity-90 font-bold drop-shadow-md leading-relaxed">
          今天也是元气满满的一天喵~ 快来和我一起玩耍吧！✨
        </p>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none z-10" />
    </div>
  );
}
