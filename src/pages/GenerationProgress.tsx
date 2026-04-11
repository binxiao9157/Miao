import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, PartyPopper, Coins, ArrowRight } from "lucide-react";
import { VolcanoService, ACTION_PROMPTS, IMAGE_PROMPTS } from "../services/volcanoService";
import { FileManager } from "../services/fileManager";
import { storage } from "../services/storage";
import { useAuthContext } from "../context/AuthContext";
import { extractFrameFromUrl } from "../lib/videoUtils";

import { GoogleGenAI } from "@google/genai";

export default function GenerationProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  // 管理 I2V 阶段的 AbortController 生命周期
  const i2vAbortRef = useRef<AbortController | null>(null);

  const { refreshCatStatus } = useAuthContext();
  const { image, name, breed, furColor, isRedemption, isDebugRedemption, redemptionAmount } = location.state || {};

  const [status, setStatus] = useState<string>("正在准备生成...");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [anchorImage, setAnchorImage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'t2i' | 'preview' | 'i2v' | 'confirm' | 'success'>('t2i');
  const [idleVideoUrl, setIdleVideoUrl] = useState<string | null>(null);
  const [loopCount, setLoopCount] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const resetGenerationState = () => {
    setIsGenerating(false);
    setError(null);
    setProgress(0);
    setStatus("正在准备生成...");
    setAnchorImage(null);
    setPhase('t2i');
    setLoopCount(0);
    setShowConfirmDialog(false);
  };

  const handleRetry = () => {
    resetGenerationState();
    const target = image ? "/upload-material" : "/create-cat";
    navigate(target, { state: { image, name, breed, furColor }, replace: true });
  };

  const startI2VPhase = async (img: string, abortSignal: AbortSignal) => {
    try {
      setPhase('i2v');

      // 积分前置检查
      if (isRedemption && !isDebugRedemption) {
        const currentPoints = storage.getPoints();
        const required = redemptionAmount || 200;
        if (currentPoints.total < required) {
          throw new Error(`积分不足，需要 ${required} 积分，当前仅有 ${currentPoints.total} 积分`);
        }
      }
      
      let optimizedImg = img;
      if (img.startsWith('data:image')) {
        setStatus("正在优化图像数据...");
        try {
          optimizedImg = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              const canvas = document.createElement('canvas');
              const maxSide = 1280;
              let width = image.width;
              let height = image.height;
              if (width > maxSide || height > maxSide) {
                if (width > height) {
                  height = (height / width) * maxSide;
                  width = maxSide;
                } else {
                  width = (width / height) * maxSide;
                  height = maxSide;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(image, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            image.onerror = reject;
            image.src = img;
          });
        } catch (e) {
        }
      }

      // 第一阶段：生成核心待机视频 (0-100%)
      setStatus("正在生成核心待机视频...");
      setProgress(10);
      
      const idleTask = await VolcanoService.submitTask(optimizedImg, ACTION_PROMPTS.idle);
      setProgress(30);
      
      const url = await VolcanoService.pollTaskResult(
        idleTask.id,
        (s) => setStatus(`正在生成待机视频 (${s})...`),
        abortSignal
      );
      
      console.log("Idle video generated:", url);
      setIdleVideoUrl(url);
      setProgress(100);
      setPhase('confirm');
      setStatus("生成成功！");
    } catch (err: any) {
      if (err.message === "任务轮询已中止" || err.message === "任务中止") return;
      console.error("生成过程出错:", err);
      setError(err.message || "生成失败");
    }
  };

  const handleUnlockAll = async () => {
    if (!idleVideoUrl) return;
    
    const groupId = 'group_' + Date.now();
    const optimizedImg = anchorImage || image;

    // 1. 提取锚定帧
    let anchorFrame;
    try {
      anchorFrame = await extractFrameFromUrl(idleVideoUrl, 0.1);
    } catch (e) {
      anchorFrame = optimizedImg;
    }

    // 2. 先以基础版保存并进入首页
    await FileManager.downloadVideos(
      { idle: idleVideoUrl }, 
      groupId, 
      name || breed || "我的 AI 猫咪", 
      image || anchorImage || "",
      { 
        breed, 
        furColor, 
        source: image ? 'upload' : 'created', 
        placeholderImage: anchorFrame,
        anchorFrame: anchorFrame 
      }
    );
    
    // 标记为正在解锁
    await FileManager.updateCatVideos(groupId, {}, true);

    // 扣除积分
    if (isRedemption && !isDebugRedemption) {
      storage.deductPoints(redemptionAmount || 200, "解锁新伙伴");
    }

    storage.setActiveCatId(groupId);
    refreshCatStatus();
    navigate("/", { replace: true });

    // 3. 后台静默发起剩余任务
    const secondaryActions = ['tail', 'rubbing', 'blink'] as const;
    try {
      const tasks = secondaryActions.map(action => 
        VolcanoService.submitTask(anchorFrame, ACTION_PROMPTS[action])
      );
      const taskResults = await Promise.all(tasks);
      
      const videoUrls: { [key: string]: string } = {};
      const pollPromises = taskResults.map((task, index) => 
        VolcanoService.pollTaskResult(task.id).then(url => {
          videoUrls[secondaryActions[index]] = url;
        })
      );

      await Promise.all(pollPromises);
      // 更新猫咪信息并取消解锁标记
      await FileManager.updateCatVideos(groupId, videoUrls, false);
    } catch (e) {
      console.error("后台生成任务失败:", e);
      await FileManager.updateCatVideos(groupId, {}, false);
    }
  };

  const handleStayBasic = async () => {
    if (!idleVideoUrl) return;
    
    const groupId = 'group_' + Date.now();
    const optimizedImg = anchorImage || image;

    // 提取锚定帧作为占位
    let anchorFrame;
    try {
      anchorFrame = await extractFrameFromUrl(idleVideoUrl, 0.1);
    } catch (e) {
      anchorFrame = optimizedImg;
    }

    await FileManager.downloadVideos(
      { idle: idleVideoUrl }, 
      groupId, 
      name || breed || "我的 AI 猫咪", 
      image || anchorImage || "",
      { 
        breed, 
        furColor, 
        source: image ? 'upload' : 'created', 
        placeholderImage: anchorFrame,
        anchorFrame: anchorFrame 
      }
    );

    // 扣除积分
    if (isRedemption && !isDebugRedemption) {
      storage.deductPoints(redemptionAmount || 200, "解锁新伙伴");
    }

    storage.setActiveCatId(groupId);
    refreshCatStatus();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        await axios.get('/api/health', { timeout: 5000 });
        console.log("Server connectivity confirmed");
      } catch (e) {
        console.warn("Server connectivity check failed, but proceeding anyway...", e);
      }
    };
    checkConnectivity();

    if (!image && (!breed || !furColor)) {
      navigate("/create-cat", { replace: true });
      return;
    }

    const abortController = new AbortController();

    const startT2IPhase = async () => {
      try {
        let currentAnchor = image;

        // 1. 如果没有图片，先执行 T2I 生成形象锚点 (0% - 25%)
        if (!image && breed && furColor) {
          setStatus("正在构思小猫的可爱形象...");
          setProgress(5);
          
          const imgPrompt = IMAGE_PROMPTS.anchor(breed, furColor);
          
          // 策略：由于火山引擎 T2I 模型配置复杂（容易 404），我们优先尝试火山，失败后立即切换 Gemini
          // 如果用户没有配置火山 T2I，也可以直接在这里调整优先级
          try {
            const submitRes = await VolcanoService.submitImageTask(imgPrompt);
            setProgress(10);
            
            currentAnchor = await VolcanoService.pollImageResult(submitRes.id, abortController.signal);
          } catch (vError: any) {
            setStatus("正在使用 Gemini 引擎构思形象...");
            
            try {
              const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
              if (!apiKey) {
                throw new Error("未配置 Gemini API Key，无法使用备用引擎");
              }
              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-image",
                contents: { parts: [{ text: imgPrompt }] },
              });
              
              let geminiImage = "";
              for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                  geminiImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  break;
                }
              }
              
              if (!geminiImage) {
                throw new Error("Gemini 未返回有效的图像数据");
              }
              
              currentAnchor = geminiImage;
            } catch (gError: any) {
              throw new Error(`形象生成失败: 火山(${vError.message}) & Gemini(${gError.message})`);
            }
          }

          setAnchorImage(currentAnchor);
          setProgress(25);
          
          // 自动进入 I2V 阶段，不再停留于图片预览
          const controller = new AbortController();
          i2vAbortRef.current = controller;
          if (currentAnchor) startI2VPhase(currentAnchor, controller.signal);
        } else {
          setStatus("正在分析图片...");
          setProgress(25);
          setAnchorImage(image);
          
          // 自动进入 I2V 阶段
          const controller = new AbortController();
          i2vAbortRef.current = controller;
          startI2VPhase(image, controller.signal);
        }
      } catch (err: any) {
        if (err.message === "任务轮询已中止" || err.message === "任务中止") return;
        console.error("T2I 过程出错:", err);
        const errorMsg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
        setError(errorMsg);
      }
    };

    startT2IPhase();

    return () => {
      abortController.abort();
      // 同时中止 I2V 阶段的任务
      if (i2vAbortRef.current) {
        i2vAbortRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, name, breed, furColor, navigate]);

  return (
    <div 
      className="min-h-screen bg-[#FFF5F0] flex flex-col items-center justify-center px-8 pb-8 text-center"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
    >
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-[#5D4037] mb-4">生成遇到问题</h2>
            <p className="text-[#5D4037]/60 mb-8 max-w-xs">{error}</p>
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <button 
                onClick={handleRetry}
                className="w-full py-4 bg-[#FF9D76] text-white rounded-full font-black text-lg shadow-xl shadow-[#FF9D76]/20 active:scale-95 transition-all"
              >
                重新尝试
              </button>
              <button 
                onClick={async () => {
                  if ('caches' in window) {
                    const names = await caches.keys();
                    await Promise.all(names.map(name => caches.delete(name)));
                  }
                  if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(reg => reg.unregister()));
                  }
                  window.location.reload();
                }}
                className="w-full py-3 bg-white text-[#5D4037]/60 rounded-full font-bold text-sm border border-[#5D4037]/10 active:scale-95 transition-all"
              >
                清理缓存并重置 PWA
              </button>
              <button 
                onClick={() => {
                  resetGenerationState();
                  navigate("/upload-material", { replace: true });
                }}
                className="text-[#5D4037]/40 font-bold text-sm uppercase tracking-widest"
              >
                返回上传页
              </button>
            </div>
          </motion.div>
        ) : (phase === 't2i' || phase === 'i2v') ? (
          <motion.div 
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            {/* 猫爪加载动画 (模拟) */}
            <div className="relative w-40 h-40 mb-12">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-[#FF9D76]/10 border-t-[#FF9D76] rounded-[40px]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles size={64} className="text-[#FF9D76]" />
                </motion.div>
              </div>
            </div>

            <h2 className="text-2xl font-black text-[#5D4037] mb-2">{status}</h2>
            <div className="w-full h-2 bg-[#FF9D76]/10 rounded-full overflow-hidden mb-4">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-[#FF9D76]"
              />
            </div>
            <p className="text-xs text-[#5D4037]/40 font-bold uppercase tracking-widest">
              {progress < 100 ? "请耐心等待，魔法正在发生..." : "即将完成"}
            </p>

            {/* 状态步骤列表 */}
            <div className="mt-12 w-full space-y-4 text-left">
              <StatusStep label="分析图片特征" active={progress >= 5} done={progress > 5} />
              <StatusStep label="生成核心待机动作" active={progress >= 10} done={progress === 100} />
              <StatusStep label="同步到本地猫窝" active={progress >= 100} done={progress === 100} />
            </div>
          </motion.div>
        ) : phase === 'confirm' ? (
          <motion.div 
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden"
          >
            {/* 视频背景 */}
            <div className="absolute inset-0 z-0">
              {/* 初始底图占位，防止视频加载时的黑屏 */}
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: isVideoLoading ? 1 : 0 }}
                className="absolute inset-0 z-10 bg-cover bg-center"
                style={{ backgroundImage: `url(${anchorImage})` }}
              >
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                  <Loader2 className="text-white animate-spin mb-4" size={48} />
                  <p className="text-white font-bold">正在加载互动预览...</p>
                </div>
              </motion.div>

              <video 
                ref={videoRef}
                src={idleVideoUrl || ""}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
                onCanPlay={() => {
                  console.log("Video can play (direct)");
                  setIsVideoLoading(false);
                  videoRef.current?.play().catch(e => console.warn("Auto-play failed:", e));
                }}
                onError={(e) => {
                  console.error("Video playback error (direct), trying proxy...", e);
                  // If direct URL fails, try proxy as fallback
                  if (idleVideoUrl && !videoRef.current?.src.includes('/api/proxy-video')) {
                    const proxiedUrl = `/api/proxy-video?url=${encodeURIComponent(idleVideoUrl)}`;
                    if (videoRef.current) videoRef.current.src = proxiedUrl;
                  } else {
                    setError("视频加载失败，请检查网络连接或重新尝试");
                  }
                }}
                onEnded={() => {
                  setLoopCount(prev => {
                    const next = prev + 1;
                    if (next >= 2) {
                      setShowConfirmDialog(true);
                      return next;
                    }
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play();
                    }
                    return next;
                  });
                }}
              />
              {/* 模糊底层补位 */}
              <div 
                className="absolute inset-0 -z-10 bg-cover bg-center blur-3xl opacity-50"
                style={{ backgroundImage: `url(${anchorImage})` }}
              />
              <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* 确认对话框 */}
            <AnimatePresence>
              {showConfirmDialog && (
                <motion.div 
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[40px] p-8 w-[85%] max-w-sm shadow-2xl text-center border border-white/20"
                >
                  <div className="w-20 h-20 bg-[#FF9D76]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="text-[#FF9D76]" size={40} />
                  </div>
                  
                  <h2 className="text-2xl font-black text-white mb-2">我是你的梦中情猫吗？</h2>
                  <p className="text-sm text-white/80 mb-8 leading-relaxed">
                    形象已初步锁定！是否还需要解锁我更多动作（摸头、踩奶、玩耍）？
                  </p>
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={handleUnlockAll}
                      className="w-full py-4 bg-[#FF9D76] text-white rounded-2xl font-black shadow-lg shadow-[#FF9D76]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      是，全部解锁
                      <ArrowRight size={18} />
                    </button>
                    <button 
                      onClick={handleStayBasic}
                      className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 active:scale-95 transition-all"
                    >
                      否，就这样吧
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatusStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-500 ${active ? 'opacity-100' : 'opacity-30'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-500 ${done ? 'bg-green-500 text-white' : active ? 'bg-[#FF9D76] text-white' : 'bg-[#FF9D76]/10 text-[#FF9D76]'}`}>
        {done ? <CheckCircle2 size={14} /> : <Loader2 size={14} className={active ? 'animate-spin' : ''} />}
      </div>
      <span className={`text-sm font-bold transition-colors duration-500 ${active ? 'text-[#5D4037]' : 'text-[#5D4037]/40'}`}>{label}</span>
    </div>
  );
}
