import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, PartyPopper, Coins } from "lucide-react";
import { VolcanoService, ACTION_PROMPTS, IMAGE_PROMPTS } from "../services/volcanoService";
import { FileManager } from "../services/fileManager";
import { storage } from "../services/storage";
import { useAuthContext } from "../context/AuthContext";

export default function GenerationProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshCatStatus } = useAuthContext();
  const { image, name, breed, furColor, isRedemption, isDebugRedemption } = location.state || {};

  const [status, setStatus] = useState<string>("正在准备生成...");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const resetGenerationState = () => {
    setIsGenerating(false);
    setError(null);
    setProgress(0);
    setStatus("正在准备生成...");
  };

  const handleRetry = () => {
    resetGenerationState();
    const target = image ? "/upload-material" : "/create-cat";
    navigate(target, { state: { image, name, breed, furColor }, replace: true });
  };

  useEffect(() => {
    if (!image && (!breed || !furColor)) {
      navigate("/create-cat", { replace: true });
      return;
    }

    const abortController = new AbortController();

    const startGeneration = async () => {
      try {
        let anchorImage = image;

        // 1. 如果没有图片，先执行 T2I 生成形象锚点 (0% - 20%)
        if (!image && breed && furColor) {
          setStatus("正在构思小猫的可爱形象...");
          setProgress(5);
          
          const imgPrompt = IMAGE_PROMPTS.anchor(breed, furColor);
          const submitRes = await VolcanoService.submitImageTask(imgPrompt);
          setProgress(10);
          
          anchorImage = await VolcanoService.pollImageResult(submitRes.id, abortController.signal);
          setProgress(20);
        } else {
          setStatus("正在分析图片...");
          setProgress(20);
        }

        // 2. 提交 I2V 任务 (并行提交 4 个) (20% - 100%)
        setStatus("正在教小猫学习 4 种互动技能...");
        setProgress(30);
        
        const actions = Object.keys(ACTION_PROMPTS) as Array<keyof typeof ACTION_PROMPTS>;
        const submitPromises = actions.map(action => 
          VolcanoService.submitTask(anchorImage, ACTION_PROMPTS[action])
        );
        
        const submitResults = await Promise.all(submitPromises);
        const taskGroup: { [key: string]: string } = {};
        actions.forEach((action, index) => {
          taskGroup[action] = submitResults[index].id;
        });

        console.log("[DEBUG] Task group submitted:", taskGroup);

        // 3. 轮询结果 (并行轮询 4 个)
        setStatus("AI 正在绘制 4 段互动视频...");
        setProgress(50);
        
        const pollPromises = actions.map(action => 
          VolcanoService.pollTaskResult(
            taskGroup[action],
            undefined,
            abortController.signal
          )
        );

        const videoUrls = await Promise.all(pollPromises);
        const videoUrlMap: { [key: string]: string } = {};
        actions.forEach((action, index) => {
          videoUrlMap[action] = videoUrls[index];
        });

        // 4. 下载/保存视频
        setStatus("正在同步互动技能到本地...");
        setProgress(85);
        const groupId = 'group_' + Date.now();
        const finalPaths = await FileManager.downloadVideos(
          videoUrlMap, 
          groupId, 
          name || breed || "我的 AI 猫咪", 
          anchorImage,
          { breed, furColor, source: image ? 'upload' : 'created' }
        );

        // 5. 完成
        setStatus("生成成功！");
        setProgress(100);
        
        // 扣除积分 (如果是兑换)
        if (isRedemption && !isDebugRedemption) {
          const success = storage.deductPoints(200, "解锁新伙伴");
          if (!success) {
            throw new Error("积分不足，兑换失败");
          }
        }

        // 确保活跃 ID 已设置
        storage.setActiveCatId(groupId);
        
        // 更新全局猫咪状态
        refreshCatStatus();
        
        setTimeout(() => {
          if (!abortController.signal.aborted) {
            setShowSuccess(true);
          }
        }, 1000);

      } catch (err: any) {
        if (err.message === "任务轮询已中止" || err.message === "任务中止") return;
        
        console.error("生成过程出错:", err);
        const errorMessage = err.message || "生成失败，请稍后重试";
        setError(errorMessage);
      }
    };

    startGeneration();

    return () => {
      abortController.abort();
    };
  }, [image, breed, furColor, navigate]);

  return (
    <div className="min-h-screen bg-[#FFF5F0] flex flex-col items-center justify-center p-8 text-center">
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
              <StatusStep label="分析图片特征" active={progress >= 20} done={progress > 20} />
              <StatusStep label="注入 4 种灵魂技能" active={progress >= 50} done={progress > 50} />
              <StatusStep label="渲染高清互动视频" active={progress >= 80} done={progress > 80} />
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
                src={storage.getActiveCat()?.videoPaths?.longPress || storage.getActiveCat()?.videoPath}
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
                  <span className="text-xs font-bold text-[#FF9D76]">已消耗 200 积分</span>
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
