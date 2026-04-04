import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, PartyPopper, Coins } from "lucide-react";
import { VolcanoService } from "../services/volcanoService";
import { FileManager } from "../services/fileManager";
import { storage } from "../services/storage";

export default function GenerationProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const { image, name, isRedemption } = location.state || {};

  const [status, setStatus] = useState<string>("正在分析图片...");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const resetGenerationState = () => {
    setIsGenerating(false);
    setError(null);
    setProgress(0);
    setStatus("正在分析图片...");
  };

  const handleRetry = () => {
    resetGenerationState();
    navigate("/upload-material", { state: { image, name: location.state?.name }, replace: true });
  };

  useEffect(() => {
    if (!image) {
      navigate("/upload-material", { replace: true });
      return;
    }

    const abortController = new AbortController();

    const startGeneration = async () => {
      try {
        // 1. 提交任务
        setStatus("正在分析图片...");
        setProgress(20);
        const submitResult = await VolcanoService.submitTask(image);
        const taskId = submitResult.id;

        if (!taskId) {
          throw new Error("提交任务失败: 未获取到任务 ID");
        }

        // 2. 轮询结果
        setStatus("猫咪数字化建模中...");
        setProgress(50);
        const videoUrl = await VolcanoService.pollTaskResult(
          taskId, 
          (pollingStatus) => {
            if (pollingStatus === 'running') {
              setStatus("AI 正在绘制视频帧...");
            }
          },
          abortController.signal
        );

        // 3. 下载视频
        setStatus("正在下载视频...");
        setProgress(80);
        const localPath = await FileManager.downloadVideo(videoUrl, taskId, "我的 AI 猫咪", image);

        // 4. 完成
        setStatus("生成成功！");
        setProgress(100);
        
        // 扣除积分 (如果是兑换)
        if (isRedemption) {
          const success = storage.deductPoints(200);
          if (!success) {
            throw new Error("积分不足，兑换失败");
          }
        }

        // 确保活跃 ID 已设置
        storage.setActiveCatId(taskId);
        
        setTimeout(() => {
          if (!abortController.signal.aborted) {
            setShowSuccess(true);
          }
        }, 1000);

      } catch (err: any) {
        if (err.message === "任务轮询已中止") return;
        
        console.error("生成过程出错:", err);
        const errorMessage = err.message || "生成失败，请稍后重试";
        setError(errorMessage);
      }
    };

    startGeneration();

    return () => {
      abortController.abort();
    };
  }, [image, navigate]);

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
              <StatusStep label="AI 视频建模" active={progress >= 50} done={progress > 50} />
              <StatusStep label="渲染高清视频" active={progress >= 80} done={progress > 80} />
              <StatusStep label="保存到本地" active={progress >= 100} done={progress === 100} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成功弹窗 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF9D76] to-orange-300"></div>
              
              <div className="w-20 h-20 bg-[#FF9D76]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <PartyPopper className="text-[#FF9D76]" size={40} />
              </div>
              
              <h2 className="text-2xl font-black text-[#5D4037] mb-2">恭喜获得新伙伴！</h2>
              <p className="text-sm text-[#5D4037]/60 mb-8 leading-relaxed">
                你成功领养了 <span className="text-[#FF9D76] font-bold">{name || "小猫"}</span>，它已经在猫窝里等你啦～
              </p>
              
              {isRedemption && (
                <div className="bg-[#FF9D76]/5 rounded-2xl p-4 mb-8 flex items-center justify-center gap-2">
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
