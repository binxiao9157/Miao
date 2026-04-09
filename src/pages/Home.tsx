import React, { useState, useEffect, useRef, useMemo, useCallback, TouchEvent, RefObject } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Coins, RefreshCw, Loader2, AlertCircle, Settings } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "../context/AuthContext";

const VIDEOS = {
  DEFAULT: "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4",
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshCatStatus } = useAuthContext();
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [visibleLayer, setVisibleLayer] = useState<string>('idle');
  const hasPlayedEntry = useRef(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [bubbleId, setBubbleId] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [showPointToast, setShowPointToast] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false); 
  const [canLoadActions, setCanLoadActions] = useState(false); // 延迟加载互动视频
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false); 
  
  const [loadError, setLoadError] = useState(false); 
  const [showControls, setShowControls] = useState(false); 
  const [interactionBubble, setInteractionBubble] = useState<{text: string, id: number} | null>(null);
  
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const secretTapTimer = useRef<NodeJS.Timeout | null>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onlineTimerRef = useRef<NodeJS.Timeout | null>(null);

  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const clickVideoRef = useRef<HTMLVideoElement>(null);
  const doubleClickVideoRef = useRef<HTMLVideoElement>(null);
  const swipeVideoRef = useRef<HTMLVideoElement>(null);
  const longPressVideoRef = useRef<HTMLVideoElement>(null);

  const actionRefs: { [key: string]: RefObject<HTMLVideoElement | null> } = {
    rubbing: clickVideoRef,
    feeding: doubleClickVideoRef,
    teasing: swipeVideoRef,
    petting: longPressVideoRef
  };
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const lastTapTime = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const showFloatingBubble = (text: string, duration: number = 10000) => {
    // 清除旧的定时器
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }

    setBubbleText(text);
    setBubbleId(Date.now());

    // 设置定时消失
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleText(null);
    }, duration);
  };

  const startGreetingTimer = useCallback(() => {
    const settings = storage.getSettings();
    if (settings.greetingsEnabled) {
      const hour = new Date().getHours();
      let text = null;
      if (hour >= 7 && hour < 10) {
        text = "早上好～";
      } else if (hour >= 22 && hour < 24) {
        text = "该休息啦～";
      }

      if (text && !bubbleText) { // 只有在没有互动气泡时才显示问候
        showFloatingBubble(text);
      }
    }
  }, [bubbleText]);

  useEffect(() => {
    const refreshCat = () => {
      const info = storage.getActiveCat();
      setCat(info);
      if (info) {
        setVideoAspectRatio(null);
      }
    };

    refreshCat();

    const pointsInfo = storage.getPoints();
    const today = new Date().toISOString().slice(0, 10);
    
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

    startGreetingTimer();

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
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, [startGreetingTimer]);

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
      const info = storage.getActiveCat();
      if (info && info.id !== cat?.id) {
        setCat(info);
        setIsInitialized(false);
        setIsVideoReady(false);
        setVisibleLayer('idle');
        hasPlayedEntry.current = false;
      }

      setCanLoadActions(true);

      if (!hasPlayedEntry.current) {
        hasPlayedEntry.current = true;
        const playEntryVideo = async () => {
          try {
            setTimeout(() => {
              const hasRubbing = cat?.videoPaths?.rubbing && actionRefs['rubbing']?.current;
              if (hasRubbing) {
                const video = actionRefs['rubbing'].current!;
                video.currentTime = 0;
                video.play().catch(e => console.log("Entry video play failed:", e));
              } else if (idleVideoRef.current) {
                idleVideoRef.current.currentTime = 0;
                idleVideoRef.current.play().catch(e => console.log("Idle video play failed:", e));
              }
            }, 100);
          } catch (err) {
            console.error("Entry video play failed:", err);
          }
        };
        playEntryVideo();
      }

      startGreetingTimer();
    } else {
      if (idleVideoRef.current) idleVideoRef.current.pause();
      Object.values(actionRefs).forEach(ref => ref.current?.pause());
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current);
        setBubbleText(null);
      }
    }
  }, [location.pathname, cat?.id]);

  const triggerPointToast = (msg: string) => {
    setShowPointToast(msg);
    setTimeout(() => setShowPointToast(null), 3000);
  };

  const handleInteraction = (actionName: string) => {
    const p = storage.getPoints();
    const today = new Date().toISOString().slice(0, 10);
    
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
      triggerPointToast(`互动任务达成！积分 +5 🌟`);
    }
  };

  const triggerInteraction = (actionName: string, bubbleText: string, actionKey?: string) => {
    showFloatingBubble(bubbleText);
    handleInteraction(actionName);
    
    const hasMultiVideo = cat?.videoPaths && actionKey && cat.videoPaths[actionKey as keyof typeof cat.videoPaths];

    if (hasMultiVideo && actionKey && actionRefs[actionKey]?.current) {
      const video = actionRefs[actionKey].current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    } else {
      if (idleVideoRef.current) {
        idleVideoRef.current.currentTime = 0;
        idleVideoRef.current.play().catch(() => {});
      }
    }
  };

  const handleRegenerate = () => {
    // 暂停所有视频
    idleVideoRef.current?.pause();
    clickVideoRef.current?.pause();
    doubleClickVideoRef.current?.pause();
    swipeVideoRef.current?.pause();
    longPressVideoRef.current?.pause();
    
    storage.deleteCat(); 
    refreshCatStatus();
    setCat(null);
    setShowRegenerateConfirm(false);
    navigate('/welcome', { replace: true });
  };

  const handleRetryPlay = () => {
    setLoadError(false);
    setIsInitialized(false);
    idleVideoRef.current?.load();
    idleVideoRef.current?.play().catch(() => {});
    clickVideoRef.current?.load();
    doubleClickVideoRef.current?.load();
    swipeVideoRef.current?.load();
    longPressVideoRef.current?.load();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.target as HTMLVideoElement;
    const error = videoElement.error;

    if (!error) return;
    if (error.code === 1) return; // MEDIA_ERR_ABORTED

    console.error("Fatal Video Error:", {
      code: error.code,
      message: error.message,
      src: videoElement.src
    });

    setLoadError(true);
    setIsInitialized(true);
  };

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>, key: string) => {
    const v = e.target as HTMLVideoElement;
    if (v.currentTime > 0) {
      if (!isVideoReady) setIsVideoReady(true);
      if (visibleLayer !== key) {
        setVisibleLayer(key);
        if (key !== 'idle' && idleVideoRef.current) idleVideoRef.current.pause();
        Object.entries(actionRefs).forEach(([k, ref]) => {
          if (k !== key && ref.current) ref.current.pause();
        });
      }
    }
  }, [isVideoReady, visibleLayer]);

  const handleLongPressStart = () => {
    isLongPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      triggerInteraction('摸头享受', '好舒服喵~ ❤️', 'petting');
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

    // 唤醒隐藏入口逻辑
    const wakeupUI = () => {
      setShowControls(true);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      touchStartPos.current = null;
      return;
    }

    if (absDx > 50 || absDy > 50) {
      // Swipe detected
      e.preventDefault(); // 阻止默认行为
      triggerInteraction('逗猫棒玩耍', '抓到了！', 'teasing');
      wakeupUI();
    } else if (absDx < 10 && absDy < 10) {
      if (now - lastTapTime.current < 300) {
        // Double tap
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        triggerInteraction('露肚皮抚摸', '咯咯咯咯...', 'feeding');
        wakeupUI();
        lastTapTime.current = 0;
      } else {
        // Single tap
        lastTapTime.current = now;
        setTimeout(() => {
          if (lastTapTime.current === now) {
            triggerInteraction('蹭镜头互动', '轻轻抚摸！', 'rubbing');
            wakeupUI();
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

  const handleSecretTap = () => {
    setSecretTapCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setShowRegenerateConfirm(true);
        // 同时震动反馈（如果支持）
        if (window.navigator.vibrate) {
          window.navigator.vibrate([50, 100, 50]);
        }
        return 0;
      }
      return next;
    });

    if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
    secretTapTimer.current = setTimeout(() => setSecretTapCount(0), 2000);
  };

  const actionVideoEntries = useMemo(() => {
    if (!canLoadActions || !cat?.videoPaths) return null;
    
    return Object.entries(cat.videoPaths).map(([key, url]) => {
      // 确保 key 在 actionRefs 中存在
      if (!actionRefs[key]) return null;
      
      return (
        <video
          key={key}
          ref={actionRefs[key]}
          src={url}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={(e) => handleTimeUpdate(e, key)}
          onEnded={(e) => {
            const video = e.target as HTMLVideoElement;
            video.pause();
          }}
          className={`absolute inset-0 w-full h-full z-20 object-cover pointer-events-none ${visibleLayer === key ? 'opacity-100' : 'opacity-0'}`}
        />
      );
    });
  }, [canLoadActions, cat?.videoPaths, visibleLayer, handleTimeUpdate]);

  if (!cat || !cat.name) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-black touch-none z-0">
      {/* 视频播放器区域 - 采用 Stack 堆叠布局实现无缝切换 */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#F8F9FA] overflow-hidden z-10">
        {/* 1. 待机视频层 (Idle) */}
        <video
          ref={idleVideoRef}
          src={cat?.videoPath || cat?.remoteVideoUrl || cat?.videoPaths?.petting || VIDEOS.DEFAULT}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={(e) => handleTimeUpdate(e, 'idle')}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.videoWidth && video.videoHeight) {
              setVideoAspectRatio(video.videoWidth / video.videoHeight);
            }
          }}
          onLoadedData={() => {
            setIsInitialized(true);
            setIsVideoReady(true);
            setLoadError(false);
            setCanLoadActions(true);
            if (idleVideoRef.current) {
              idleVideoRef.current.currentTime = 0;
            }
          }}
          onEnded={(e) => {
            const video = e.target as HTMLVideoElement;
            video.pause();
          }}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full z-10 object-cover ${visibleLayer === 'idle' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* 2. 互动视频层 (Actions) - 延迟加载并覆盖在待机层之上 */}
        {actionVideoEntries}
        
        {/* 初始加载状态 */}
        {!isInitialized && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-30">
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

      {/* 秘密入口触发区域 - 覆盖在右上角，完全透明 */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 z-[60] touch-none"
        onClick={(e) => {
          e.stopPropagation();
          handleSecretTap();
        }}
      />

      {/* 隐藏式功能按钮 - 已根据需求彻底移除常驻入口，仅通过上方秘密手势唤起确认弹窗 */}
      {/* 如果需要在开发模式下强制显示，可以取消下方注释 */}
      {/* 
      <AnimatePresence>
        {(showControls && isDev) && (
          <motion.div ... />
        )}
      </AnimatePresence> 
      */}

      {/* 统一对话气泡 - 仿对话框样式与左侧滑入动画 */}
      <AnimatePresence mode="wait">
        {bubbleText && (
          <motion.div 
            key={bubbleId}
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 100,
              restDelta: 0.001
            }}
            className="absolute top-[22%] left-8 z-40 pointer-events-none"
          >
            <div className="relative">
              {/* 装饰线条 - 增强手绘感 */}
              <div className="absolute -top-4 -left-2 w-8 h-4 border-t-2 border-white/30 rounded-[50%] -rotate-[25deg]" />
              <div className="absolute -bottom-2 -right-3 w-8 h-4 border-b-2 border-white/30 rounded-[50%] -rotate-[15deg]" />
              
              <div className="relative bg-white/90 backdrop-blur-xl px-10 py-5 rounded-[2.5rem_2rem_3rem_2.5rem] border-2 border-white/40 shadow-2xl min-w-[120px]">
                <p className="text-sm font-black text-[#5D4037] tracking-wide text-center">{bubbleText}</p>
                {/* 气泡小尾巴 */}
                <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white/90 border-r-2 border-b-2 border-white/40 rotate-45" />
              </div>
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
