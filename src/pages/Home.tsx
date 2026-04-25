import React, { useState, useEffect, useRef, useMemo, useCallback, TouchEvent, RefObject } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Coins, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "../context/AuthContext";
import { FrostedGlassBubble } from "../components/FrostedGlassBubble";

// 不再依赖外部 CDN 兜底视频，离线场景下显示猫咪头像

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
  
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const secretTapTimer = useRef<NodeJS.Timeout | null>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onlineTimerRef = useRef<NodeJS.Timeout | null>(null);

  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const doubleClickVideoRef = useRef<HTMLVideoElement>(null);
  const swipeVideoRef = useRef<HTMLVideoElement>(null);
  const longPressVideoRef = useRef<HTMLVideoElement>(null);

  const actionRefs = useMemo<{ [key: string]: RefObject<HTMLVideoElement | null> }>(() => ({
    tail: doubleClickVideoRef,
    rubbing: swipeVideoRef,
    blink: longPressVideoRef,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  
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

  // 问候逻辑：仅挂载时检查一次，不依赖 bubbleText 避免 Effect 循环
  const greetingShownRef = useRef(false);
  const showGreetingOnce = () => {
    if (greetingShownRef.current) return;
    const settings = storage.getSettings();
    if (settings.greetingsEnabled) {
      const hour = new Date().getHours();
      let text = null;
      if (hour >= 7 && hour < 10) {
        text = "早上好～";
      } else if (hour >= 22 && hour < 24) {
        text = "该休息啦～";
      }
      if (text) {
        greetingShownRef.current = true;
        showFloatingBubble(text);
      }
    }
  };

  useEffect(() => {
    // 同步初始化猫咪数据，避免首屏空白
    const info = storage.getActiveCat();
    setCat(info);
    if (info) setVideoAspectRatio(null);

    // 延迟执行积分等重度逻辑，确保 UI 先渲染
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timer = setTimeout(() => {
      const pointsInfo = storage.getPoints();
      const today = new Date().toISOString().slice(0, 10);
      
      if (pointsInfo.lastLoginDate !== today) {
        pointsInfo.total += 10;
        pointsInfo.history.unshift({
          id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
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

      showGreetingOnce();

      intervalId = setInterval(() => {
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
              id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
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
      onlineTimerRef.current = intervalId;
    }, 50);

    return () => {
      clearTimeout(timer);
      if (intervalId) clearInterval(intervalId);
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (pointToastTimerRef.current) clearTimeout(pointToastTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleCatUpdate = (e: any) => {
      if (e.detail?.catId === cat?.id || !cat) {
        const updatedCat = storage.getActiveCat();
        if (updatedCat) {
          setCat(updatedCat);
          // 如果是解锁完成，显示一个气泡提示
          if (cat && Object.keys(updatedCat.videoPaths || {}).length > Object.keys(cat.videoPaths || {}).length) {
            showFloatingBubble("新动作已解锁！快来试试双击、滑动或长按吧～");
          }
        }
      }
    };

    window.addEventListener('cat-updated', handleCatUpdate);
    return () => window.removeEventListener('cat-updated', handleCatUpdate);
  }, [cat]);

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

      // 延迟加载互动视频，防止首次切换卡顿
      setTimeout(() => {
        setCanLoadActions(true);
      }, 500);

      if (!hasPlayedEntry.current) {
        hasPlayedEntry.current = true;
        const playEntryVideo = async () => {
          try {
            setTimeout(() => {
              const hasRubbing = cat?.videoPaths?.rubbing && (actionRefs['rubbing'] as React.RefObject<HTMLVideoElement | null>)?.current;
              if (hasRubbing) {
                const video = (actionRefs['rubbing'] as React.RefObject<HTMLVideoElement | null>).current!;
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

      showGreetingOnce();

      // 新增：处理从通知中心跳转过来的逻辑
      if (location.state?.fromNotification && location.state?.notificationType === 'system') {
        setTimeout(() => {
          showFloatingBubble("猫咪感受到了你的关心 ❤️");
          // 清除 state，防止刷新页面再次触发
          navigate(location.pathname, { replace: true, state: {} });
        }, 800);
      }

      // 新增：处理从任务页面跳转过来的互动引导逻辑
      if (location.state?.triggerInteraction === 'feather') {
        setTimeout(() => {
          triggerInteraction('逗猫棒玩耍', '小羽毛，抓不到～', 'blink');
          // 清除 state，防止刷新页面再次触发
          navigate(location.pathname, { replace: true, state: {} });
        }, 1200);
      }
    } else {
      if (idleVideoRef.current) idleVideoRef.current.pause();
      (Object.values(actionRefs) as React.RefObject<HTMLVideoElement | null>[]).forEach(ref => ref.current?.pause());
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current);
        setBubbleText(null);
      }
    }
  }, [location.pathname, cat?.id]);

  const pointToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerPointToast = (msg: string) => {
    if (pointToastTimerRef.current) clearTimeout(pointToastTimerRef.current);
    setShowPointToast(msg);
    pointToastTimerRef.current = setTimeout(() => setShowPointToast(null), 3000);
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
        id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
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
    const videoCount = Object.keys(cat?.videoPaths || {}).length;
    const isUnlocked = actionKey === 'idle' || (cat?.videoPaths && actionKey && cat.videoPaths[actionKey as keyof typeof cat.videoPaths]);

    if (!isUnlocked && actionKey !== 'idle') {
      showFloatingBubble("该动作尚未解锁哦～");
      return;
    }

    showFloatingBubble(bubbleText);
    handleInteraction(actionName);
    
    const hasMultiVideo = cat?.videoPaths && actionKey && cat.videoPaths[actionKey as keyof typeof cat.videoPaths];

    if (hasMultiVideo && actionKey && actionRefs[actionKey]?.current) {
      const video = actionRefs[actionKey].current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => { /* autoplay may be blocked by browser */ });
      }
    } else {
      if (idleVideoRef.current) {
        idleVideoRef.current.currentTime = 0;
        idleVideoRef.current.play().catch(() => { /* autoplay may be blocked by browser */ });
      }
    }
  };

  const handleRegenerate = () => {
    if (!cat) return;

    // 暂停所有视频
    idleVideoRef.current?.pause();
    (Object.values(actionRefs) as React.RefObject<HTMLVideoElement | null>[]).forEach(ref => ref.current?.pause());
    
    // 执行精准删除逻辑
    const remainingCats = storage.deleteCatById(cat.id);
    
    // 同步刷新全局状态 (AuthContext)
    refreshCatStatus();
    
    if (remainingCats.length > 0) {
      // 还有其他猫咪，切换到下一只
      const nextCat = storage.getActiveCat();
      setCat(nextCat);
      
      // 重置视频播放状态
      setIsInitialized(false);
      setIsVideoReady(false);
      setVisibleLayer('idle');
      hasPlayedEntry.current = false;
      setShowRegenerateConfirm(false);
      
      // 提示用户
      showFloatingBubble(`已送走 ${cat.name}，正在迎接新伙伴...`);
    } else {
      // 没有猫咪了，清理状态并跳转欢迎页
      setCat(null);
      setShowRegenerateConfirm(false);
      navigate('/welcome', { replace: true });
    }
  };

  const handleRetryPlay = () => {
    setLoadError(false);
    setIsInitialized(false);
    idleVideoRef.current?.load();
    idleVideoRef.current?.play().catch(() => { /* autoplay may be blocked by browser */ });
    doubleClickVideoRef.current?.load();
    swipeVideoRef.current?.load();
    longPressVideoRef.current?.load();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.target as HTMLVideoElement;
    const error = videoElement.error;

    if (!error) return;
    if (error.code === 1) return; // MEDIA_ERR_ABORTED

    const currentSrc = videoElement.src;
    console.error("Video Error:", { code: error.code, message: error.message, src: currentSrc });

    // 自动尝试代理 URL 重试（仅对外部 URL 且未使用代理时）
    if (currentSrc && !currentSrc.includes('/api/proxy-video') && !currentSrc.startsWith(window.location.origin + '/uploads')) {
      const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(currentSrc)}`;
      console.log("[VideoRetry] Switching to proxy:", proxyUrl);
      videoElement.src = proxyUrl;
      videoElement.load();
      videoElement.play().catch(() => {});
      return;
    }

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
        (Object.entries(actionRefs) as [string, React.RefObject<HTMLVideoElement | null>][]).forEach(([k, ref]) => {
          if (k !== key && ref.current) ref.current.pause();
        });
      }
    }
  }, [isVideoReady, visibleLayer]);

  const handleLongPressStart = () => {
    isLongPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      triggerInteraction('逗猫棒玩耍', '小羽毛，抓不到～', 'blink');
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
      triggerInteraction('踩奶互动', '踩奶中，好舒服～', 'rubbing');
      wakeupUI();
    } else if (absDx < 10 && absDy < 10) {
      if (now - lastTapTime.current < 300) {
        // Double tap
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        triggerInteraction('摸头享受', '摸摸头，真乖～', 'tail');
        wakeupUI();
        lastTapTime.current = 0;
      } else {
        // Single tap
        lastTapTime.current = now;
        setTimeout(() => {
          if (lastTapTime.current === now) {
            triggerInteraction('蹭镜头互动', '蹭蹭你～', 'idle');
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
          preload="metadata"
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
      {/* 0. 高画质静态占位图层 - 确保视频加载前的无缝衔接 */}
      {cat?.placeholderImage && (
        <img 
          src={cat.placeholderImage} 
          alt="Cat Placeholder" 
          className="absolute inset-0 w-full h-full object-cover z-0"
          referrerPolicy="no-referrer"
        />
      )}

      {/* 视频播放器区域 - 采用 Stack 堆叠布局实现无缝切换 */}
      <div className="absolute inset-0 flex items-center justify-center bg-transparent overflow-hidden z-10">
        {/* 1. 待机视频层 (Idle) */}
        <video
          ref={idleVideoRef}
          src={cat?.videoPaths?.idle || cat?.videoPath || cat?.remoteVideoUrl || ''}
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
              <h3 className="text-lg font-bold text-white">视频暂时无法播放</h3>
              <p className="text-sm text-white/60">可能是网络波动，请稍后重试。猫咪数据不会丢失。</p>
              <button
                onClick={handleRetryPlay}
                className="px-8 py-3 bg-[#FF9D76] text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
              >
                重试播放
              </button>
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="text-xs text-white/30 underline mt-2 active:text-white/50"
              >
                视频无法恢复？重新生成
              </button>
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

      {/* 统一对话气泡 - 升级为毛玻璃效果 (Frosted Glass) */}
      <AnimatePresence mode="wait">
        {bubbleText && (
          <FrostedGlassBubble text={bubbleText} bubbleId={bubbleId} />
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

      {/* 后台解锁进度提示 */}
      <AnimatePresence>
        {cat?.isUnlocking && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-28 right-4 z-50 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-2xl flex items-center gap-2"
          >
            <Loader2 size={14} className="text-white animate-spin" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">更多动作加载中...</span>
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">调试确认</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              确定要永久送走这只当前的小猫吗？（不影响其他小伙伴）
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
