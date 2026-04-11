import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
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
  const [phase, setPhase] = useState<'t2i' | 'preview' | 'i2v' | 'success'>('t2i');

  const resetGenerationState = () => {
    setIsGenerating(false);
    setError(null);
    setProgress(0);
    setStatus("正在准备生成...");
    setAnchorImage(null);
    setPhase('t2i');
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

      // 第一阶段：生成核心待机视频 (0-40%)
      setStatus("第一阶段：正在生成核心待机视频...");
      setProgress(10);
      
      const idleTask = await VolcanoService.submitTask(optimizedImg, ACTION_PROMPTS.idle);
      setProgress(20);
      
      const idleVideoUrl = await VolcanoService.pollTaskResult(
        idleTask.id,
        (s) => setStatus(`正在生成待机视频 (${s})...`),
        abortSignal
      );
      setProgress(40);

      // 第二阶段：提取锚定帧 (40-50%)
      setStatus("第二阶段：正在提取高精度锚定帧...");
      let anchorFrame;
      try {
        anchorFrame = await extractFrameFromUrl(idleVideoUrl, 0.1);
      } catch (e) {
        console.warn("锚定帧提取失败，将使用原始图片作为备选:", e);
        // 如果提取失败，回退到原始优化后的图片，确保流程不中断
        anchorFrame = optimizedImg;
      }
      setProgress(50);

      // 第三阶段：并行提交后续任务 (50-100%)
      setStatus("第三阶段：正在同步生成系列互动动作...");
      const secondaryActions = ['tail', 'rubbing', 'blink'] as const;
      const tasks = secondaryActions.map(action => 
        VolcanoService.submitTask(anchorFrame, ACTION_PROMPTS[action])
      );
      
      const taskResults = await Promise.all(tasks);
      setProgress(60);

      // 轮询后续任务
      const videoUrls: { [key: string]: string } = { idle: idleVideoUrl };
      const pollPromises = taskResults.map((task, index) => 
        VolcanoService.pollTaskResult(
          task.id, 
          undefined, 
          abortSignal
        ).then(url => {
          videoUrls[secondaryActions[index]] = url;
          // 每完成一个增加一点进度
          setProgress(prev => Math.min(95, prev + 10));
        })
      );

      await Promise.all(pollPromises);
      setStatus("所有技能已就绪！");
      setProgress(95);

      const groupId = 'group_' + Date.now();
      
      // 保存猫咪信息，包含锚定帧
      await FileManager.downloadVideos(
        videoUrls, 
        groupId, 
        name || breed || "我的 AI 猫咪", 
        img,
        { 
          breed, 
          furColor, 
          source: image ? 'upload' : 'created', 
          placeholderImage: anchorFrame, // 使用锚定帧作为占位图
          anchorFrame: anchorFrame 
        }
      );

      // 扣除积分
      if (isRedemption && !isDebugRedemption) {
        storage.deductPoints(redemptionAmount || 200, "解锁新伙伴");
      }

      // 完成并显示入场
      setStatus("生成成功！");
      setProgress(100);
      setPhase('success');

      storage.setActiveCatId(groupId);
      refreshCatStatus();
      
      setTimeout(() => {
        if (!abortSignal.aborted) {
          setShowSuccess(true);
        }
      }, 1000);
    } catch (err: any) {
      if (err.message === "任务轮询已中止" || err.message === "任务中止") return;
      console.error("生成过程出错:", err);
      setError(err.message || "生成失败");
    }
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
          setPhase('preview');
          setStatus("形象已就绪，准备生成视频");
        } else {
          setStatus("正在分析图片...");
          setProgress(25);
          setAnchorImage(image);
          setPhase('preview');
          setStatus("图片已就绪，准备生成视频");
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
        ) : phase === 'preview' ? (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <div className="relative w-64 h-64 mb-8 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white">
              <img 
                src={anchorImage || ""} 
                alt="Anchor" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">
                  形象锚点已生成
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-[#5D4037] mb-2">这就是它的样子！</h2>
            <p className="text-sm text-[#5D4037]/60 mb-8 px-4 leading-relaxed">
              我们已经成功构思出了小猫的形象。接下来，AI 将以此为基准，为你绘制 4 段生动的互动视频。
            </p>

            <button 
              onClick={() => {
                const controller = new AbortController();
                i2vAbortRef.current = controller;
                if (anchorImage) startI2VPhase(anchorImage, controller.signal);
              }}
              className="w-full py-4 bg-[#FF9D76] text-white rounded-full font-black text-lg shadow-xl shadow-[#FF9D76]/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              开始生成互动视频
              <ArrowRight size={20} />
            </button>
            
            <button 
              onClick={handleRetry}
              className="mt-6 text-[#5D4037]/40 font-bold text-sm uppercase tracking-widest"
            >
              不满意？重新捏猫
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
              <StatusStep label="生成核心待机动作" active={progress >= 10} done={progress > 40} />
              <StatusStep label="提取高精度锚定帧" active={progress >= 40} done={progress > 50} />
              <StatusStep label="渲染系列互动视频" active={progress >= 50} done={progress > 95} />
              <StatusStep label="同步到本地猫窝" active={progress >= 100} done={progress === 100} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成功预览 - 全屏沉浸式 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden"
          >
            {/* 视频背景 */}
            <div className="absolute inset-0 z-0">
              <video 
                src={storage.getActiveCat()?.videoPaths?.petting || storage.getActiveCat()?.videoPath}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
              {/* 模糊底层补位 */}
              <div 
                className="absolute inset-0 -z-10 bg-cover bg-center blur-3xl opacity-50"
                style={{ backgroundImage: `url(${storage.getActiveCat()?.avatar})` }}
              />
              <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* 成功信息浮层 - 半透明毛玻璃 */}
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[40px] p-8 w-[85%] max-w-sm shadow-2xl text-center border border-white/20"
            >
              <div className="w-20 h-20 bg-[#FF9D76]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <PartyPopper className="text-[#FF9D76]" size={40} />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2">恭喜获得新伙伴！</h2>
              <p className="text-sm text-white/80 mb-8 leading-relaxed">
                你成功领养了 <span className="text-[#FF9D76] font-bold">{name || "小猫"}</span>，它已经在猫窝里等你啦～
              </p>
              
              {isRedemption && (
                <div className="bg-white/5 rounded-2xl p-4 mb-8 flex items-center justify-center gap-2 border border-white/10">
                  <Coins size={16} className="text-[#FF9D76]" />
                  <span className="text-xs font-bold text-[#FF9D76]">已消耗 {redemptionAmount || 200} 积分</span>
                </div>
              )}

              <button 
                onClick={() => navigate("/", { replace: true })}
                className="w-full py-4 bg-[#FF9D76] text-white rounded-2xl font-black shadow-lg shadow-[#FF9D76]/20 active:scale-95 transition-all"
              >
                立即去见它
              </button>
            </motion.div>
          </motion.div>
        )}
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
