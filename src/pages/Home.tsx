import { useState, useEffect, useRef, TouchEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Coins, RefreshCw, Loader2, AlertCircle, Settings, Plus, Bell } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "../context/AuthContext";

const VIDEOS = {
  DEFAULT: "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4",
  // 由于真实的互动视频需要 AI 针对每只猫咪单独生成，这里在原型阶段统一使用可靠的默认视频进行动作模拟，避免 404 加载失败
  TAP: "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4",
  DOUBLE_TAP: "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4",
  LONG_PRESS: "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4",
  SWIPE: "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4"
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshCatStatus } = useAuthContext();
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
  const [interactionBubble, setInteractionBubble] = useState<{text: string, id: number} | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const onlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const lastTapTime = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

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
      pointsInfo.total += 10;
      pointsInfo.history.unshift({
        id: 'tx_' + Date.now() + Math.random().toString(36).substr(2, 5),
        type: 'earn',
        amount: 10,
        reason: '每日登录奖励',
        timestamp: Date.now()
      });
      if (pointsInfo.history.length > 50) pointsInfo.history.pop();
      pointsInfo.lastLoginDate = today;
      pointsInfo.onlineMinutes = 0; // Reset daily online minutes
      pointsInfo.lastOnlineUpdate = Date.now(); // Reset the timer start
      storage.savePoints(pointsInfo);
      setPoints(pointsInfo.total);
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
      
      // If the last update was more than 5 minutes ago, assume they were offline and don't count that gap
      if (now - p.lastOnlineUpdate > 5 * 60000) {
        p.lastOnlineUpdate = now;
        storage.savePoints(p);
        return;
      }

      const diffMinutes = Math.floor((now - p.lastOnlineUpdate) / 60000);
      
      if (diffMinutes >= 1) {
        p.onlineMinutes += diffMinutes;
        p.lastOnlineUpdate = now;
        
        // Check if we just crossed the 10 minute threshold
        if (p.onlineMinutes >= 10 && p.onlineMinutes - diffMinutes < 10) {
          p.total += 10;
          p.history.unshift({
            id: 'tx_' + Date.now() + Math.random().toString(36).substr(2, 5),
            type: 'earn',
            amount: 10,
            reason: '在线时长奖励',
            timestamp: Date.now()
          });
          if (p.history.length > 50) p.history.pop();
          setPoints(p.total);
          triggerPointToast("+10 在线时长奖励");
        }
        storage.savePoints(p);
      }
    }, 60000);

    return () => {
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
      
      // We no longer explicitly destroy the video here because Home is kept alive by MainLayout.
      // The component will only unmount if the user logs out or leaves the main app area.
    };
  }, []);

  useEffect(() => {
    if (interactionBubble) {
      const timer = setTimeout(() => {
        setInteractionBubble(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [interactionBubble]);

  // Handle visibility changes (KeepAlive resume) and cat changes
  useEffect(() => {
    if (location.pathname === "/") {
      // Refresh cat info in case it was changed in another tab (e.g., Switch Companion)
      const info = storage.getActiveCat();
      if (info && info.id !== cat?.id) {
        setCat(info);
        const videoSource = (info.source === 'uploaded' || info.source === 'created') 
          ? (info.videoPath || info.remoteVideoUrl || VIDEOS.DEFAULT)
          : VIDEOS.DEFAULT;
        setCurrentVideo(videoSource);
        setIsInitialized(false);
        setIsVideoReady(false);
      }

      // Resume video playback
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    } else {
      // Pause video when leaving the tab to save resources
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [location.pathname, cat?.id]);

  const triggerPointToast = (msg: string) => {
    setShowPointToast(msg);
    setTimeout(() => setShowPointToast(null), 3000);
  };

  const handleInteraction = (actionName: string) => {
    const p = storage.getPoints();
    const today = new Date().toLocaleDateString();
    
    if (p.lastInteractionDate !== today) {
      p.dailyInteractionPoints = 0;
      p.lastInteractionDate = today;
    }

    if (p.dailyInteractionPoints < 20) {
      p.dailyInteractionPoints += 5;
      p.total += 5;
      p.history.unshift({
        id: 'tx_' + Date.now() + Math.random().toString(36).substr(2, 5),
        type: 'earn',
        amount: 5,
        reason: '互动奖励',
        timestamp: Date.now()
      });
      if (p.history.length > 50) p.history.pop();
      storage.savePoints(p);
      setPoints(p.total);
      triggerPointToast(`${actionName}！+5 互动奖励`);
    } else {
      triggerPointToast(`${actionName}！`);
    }
  };

  const triggerInteraction = (actionName: string, bubbleText: string) => {
    setInteractionBubble({ text: bubbleText, id: Date.now() });
    handleInteraction(actionName);
  };

  const handleRegenerate = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.load();
    }
    storage.deleteCat(); // 清除存储中的猫咪
    refreshCatStatus();
    setCat(null);
    setShowRegenerateConfirm(false);
    navigate('/welcome', { replace: true });
  };

  const handleRetryPlay = () => {
    setLoadError(false);
    setIsInitialized(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoError = (e: any) => {
    const videoElement = e.target as HTMLVideoElement;
    const error = videoElement.error;

    if (!error) return;
    if (error.code === 1) return;

    console.error("Fatal Video Error:", error.code, error.message, "URL:", currentVideo);

    // 核心修复：如果 Blob URL 失效（如 App 重新加载），自动降级使用远程 URL
    if (currentVideo && currentVideo.startsWith('blob:') && cat?.remoteVideoUrl) {
      console.log("Blob video failed, falling back to remote URL");
      setCurrentVideo(cat.remoteVideoUrl);
      return;
    }

    setLoadError(true);
    setIsInitialized(true);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime > 0.1 && !isVideoReady) {
      setIsVideoReady(true);
    }
  };

  const handleLongPressStart = () => {
    isLongPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      triggerInteraction('贴贴猫咪', '呼噜呼噜... 🐾');
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
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const now = Date.now();

    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      touchStartPos.current = null;
      return;
    }

    if (absDx > 50 || absDy > 50) {
      // Swipe detected
      triggerInteraction('喂食成功', '吧唧吧唧... 🐟');
    } else if (absDx < 10 && absDy < 10) {
      if (now - lastTapTime.current < 300) {
        // Double tap
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        triggerInteraction('开心玩耍', '好开心！ 🧶');
        lastTapTime.current = 0;
      } else {
        // Single tap
        lastTapTime.current = now;
        tapTimeoutRef.current = setTimeout(() => {
          if (lastTapTime.current === now) {
            triggerInteraction('轻轻抚摸', '喵呜～ ❤️');
            setShowControls(prev => {
              const next = !prev;
              if (next) {
                setTimeout(() => setShowControls(false), 5000);
              }
              return next;
            });
          }
        }, 300);
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
      <div className="w-full h-full flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-black touch-none">
      {/* 视频播放器区域 - 采用 Stack 堆叠布局实现无缝切换 */}
      <div className="edge-to-edge flex items-center justify-center bg-black overflow-hidden">
        {/* 底层：动态占位图 */}
        <img 
          src={cat?.avatar || `https://picsum.photos/seed/${cat?.breed}-${cat?.color}/1080/1920`} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
          referrerPolicy="no-referrer"
        />

        {/* 隔离层：深色毛玻璃，防止视频切换时底图刺眼闪烁 */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xl z-[5]"></div>

        {/* 上层：原生视频控件 */}
        <video
          ref={videoRef}
          src={currentVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          loop={true}
          onError={handleVideoError}
          onLoadedData={() => setIsInitialized(true)}
          onPlaying={() => {
            setIsInitialized(true);
            setIsBuffering(false);
            setIsVideoReady(true);
            setLoadError(false); // 成功播放时清除错误状态
          }}
          onWaiting={() => setIsBuffering(true)}
          className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-150 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
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
              <h3 className="text-lg font-bold text-white">视频加载失败</h3>
              <p className="text-sm text-white/60">网络波动或视频文件暂时无法访问，请重试。</p>
              <div className="flex gap-4">
                <button 
                  onClick={handleRetryPlay}
                  className="px-6 py-3 bg-[#FF9D76] text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
                >
                  重试播放
                </button>
                <button 
                  onClick={() => setShowRegenerateConfirm(true)}
                  className="px-6 py-3 bg-white/10 text-white rounded-full font-bold active:scale-95 transition-transform"
                >
                  重新领养
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 交互层 */}
        <div 
          className="absolute inset-0 z-30 touch-none"
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
            {/* 顶部控制项 - 适配安全区 */}
            <div className="absolute left-6 flex flex-col gap-4 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
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

            <div className="absolute right-6 flex flex-col gap-4 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
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

      {/* 互动气泡 */}
      <AnimatePresence>
        {interactionBubble && (
          <motion.div 
            key={interactionBubble.id}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", damping: 15 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl border border-primary/20 flex items-center gap-2">
              <span className="text-primary font-black text-sm">{interactionBubble.text}</span>
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
