import { useState, useEffect, useRef, TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Coins, RefreshCw, Loader2, AlertCircle, Settings, Plus, Bell } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { useAuth } from "../hooks/useAuth";
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
  const { user } = useAuth();
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [currentVideo, setCurrentVideo] = useState(VIDEOS.DEFAULT);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [showPointToast, setShowPointToast] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false); // 控制视频层淡入
  const [isBuffering, setIsBuffering] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false); // 确认弹窗状态
  const [loadError, setLoadError] = useState(false); // 加载错误状态
  const [showControls, setShowControls] = useState(false); // 控制按钮显示状态
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const onlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const refreshCat = () => {
      const info = storage.getActiveCat();
      setCat(info);

      if (info) {
        // 优先使用本地路径，如果没有则使用远程备份
        const videoSource = (info.source === 'uploaded' || info.source === 'created') 
          ? (info.videoPath || info.remoteVideoUrl || VIDEOS.DEFAULT)
          : VIDEOS.DEFAULT;
        
        setCurrentVideo(videoSource);
      }
    };

    refreshCat();

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

    const settings = storage.getSettings();
    if (settings.greetingsEnabled) {
      const hour = new Date().getHours();
      if (hour >= 7 && hour < 10) {
        setGreeting("早上好～");
      } else if (hour >= 22 && hour < 24) {
        setGreeting("该休息啦～");
      }
    }

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
    if (currentVideo === videoUrl) {
      // 如果已经在播放该视频，重置进度
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else {
      // 切换视频时不重置 isInitialized，避免闪烁
      setCurrentVideo(videoUrl);
    }
    handleInteraction();
  };

  const handleRegenerate = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    storage.deleteCat(); // 清除存储中的猫咪
    setCat(null);
    setShowRegenerateConfirm(false);
    navigate('/welcome', { replace: true });
  };

  const handleVideoError = (e: any) => {
    console.error("Video load error:", e);
    setLoadError(true);
    setIsInitialized(true);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime > 0.1 && !isVideoReady) {
      setIsVideoReady(true);
    }
  };

  const handleVideoEnd = () => {
    const defaultSource = cat?.videoPath || cat?.remoteVideoUrl || VIDEOS.DEFAULT;
    if (currentVideo !== defaultSource) {
      setCurrentVideo(defaultSource);
    }
  };

  const interactionVideos = [VIDEOS.PETTING, VIDEOS.WAKEUP, VIDEOS.PLAYING, VIDEOS.EATING];
  const shouldLoop = !interactionVideos.includes(currentVideo);

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

  const handleTouchStart = (e: TouchEvent) => {
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    handleLongPressStart();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    handleLongPressEnd();
    if (!touchStartPos.current) return;

    const touchEndPos = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const dx = touchEndPos.x - touchStartPos.current.x;
    const dy = touchEndPos.y - touchStartPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 50) {
      // Swipe detected
      playAction(VIDEOS.EATING);
    } else {
      // Single tap detected - toggle controls
      setShowControls(!showControls);
      // Auto hide controls after 5 seconds
      if (!showControls) {
        setTimeout(() => setShowControls(false), 5000);
      }
    }
    
    touchStartPos.current = null;
  };

  const handleResetCat = () => {
    const list = storage.getCatList();
    const activeId = storage.getActiveCatId();
    const updated = list.filter(c => c.id !== activeId);
    storage.saveCatList(updated);
    storage.setActiveCatId(updated[0]?.id || "");
    navigate("/upload-material");
  };

  if (!cat || !cat.name) {
    return (
      <div className="flex-grow flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow relative overflow-hidden bg-black">
      {/* 视频播放器区域 - 采用 Stack 堆叠布局实现无缝切换 */}
      <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
        {/* 底层：动态占位图 */}
        <img 
          src={cat?.avatar || `https://picsum.photos/seed/${cat?.breed}-${cat?.color}/1080/1920`} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover z-0"
          referrerPolicy="no-referrer"
        />

        {/* 上层：原生视频控件 */}
        <video
          ref={videoRef}
          src={currentVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          loop={shouldLoop}
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          onLoadedData={() => setIsInitialized(true)}
          onPlaying={() => {
            setIsInitialized(true);
            setIsBuffering(false);
            setIsVideoReady(true);
          }}
          onWaiting={() => setIsBuffering(true)}
          className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* 初始加载状态 */}
        {!isInitialized && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
              <span className="text-xs text-white/60 font-medium">正在唤醒小猫...</span>
            </div>
          </div>
        )}

        {/* 错误状态处理 */}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-40 p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white">小猫迷路了</h3>
              <p className="text-sm text-white/60">视频文件加载失败，可能已被移动或删除。</p>
              <button 
                onClick={handleRegenerate}
                className="px-8 py-3 bg-[#FF9D76] text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
              >
                重新领养
              </button>
            </div>
          </div>
        )}

        {/* 交互层 */}
        <div 
          className="absolute inset-0 z-30"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* 隐藏式功能按钮 - 仅在点击屏幕时浮现 */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 pointer-events-none"
          >
            {/* 顶部控制项 */}
            <div className="absolute top-12 left-6 flex flex-col gap-4 pointer-events-auto">
              <button 
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 bg-black/20 backdrop-blur-xl p-1.5 pr-4 rounded-full border border-white/10 active:scale-95 transition-all"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  <img 
                    src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=miao_default"} 
                    alt="User" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[80px]">{user?.nickname || "喵星人"}</span>
              </button>

              <div className="bg-black/20 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 w-fit">
                <Coins size={16} className="text-[#FF9D76]" />
                <span className="text-sm font-black text-white">{points}</span>
              </div>
            </div>

            <div className="absolute top-12 right-6 flex flex-col gap-4 pointer-events-auto">
              <button 
                onClick={() => navigate("/notifications")}
                className="w-12 h-12 bg-black/20 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Bell size={20} />
              </button>
              <button 
                onClick={() => setShowRegenerateConfirm(true)}
                className="w-12 h-12 bg-black/20 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <RefreshCw size={20} />
              </button>
              <button 
                onClick={() => navigate("/switch-companion")}
                className="w-12 h-12 bg-black/20 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Plus size={22} />
              </button>
              <button 
                onClick={() => navigate("/settings")}
                className="w-12 h-12 bg-black/20 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* 积分展示 */}
            {/* 已移动到左侧头像下方 */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 问候气泡 - 自动消失 */}
      <AnimatePresence>
        {greeting && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
              <p className="text-sm font-black text-white tracking-wide">{greeting}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 积分奖励提示 */}
      <AnimatePresence>
        {showPointToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-[#FF9D76] text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Coins size={16} />
            <span className="text-sm font-black">{showPointToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 重新生成确认弹窗 */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">重新领养？</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              确定要送走当前的小猫并重新领养一只吗？这会清除当前的猫咪形象。
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRegenerate}
                className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                确定送走
              </button>
              <button 
                onClick={() => setShowRegenerateConfirm(false)}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                再留一会儿
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
