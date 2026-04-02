import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { VolcanoService } from "../services/volcanoService";
import { FileManager } from "../services/fileManager";
import { storage } from "../services/storage";

export default function GenerationProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const { image } = location.state || {};

  const [status, setStatus] = useState<string>("正在分析图片...");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!image) {
      navigate("/upload-material");
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
        
        // 确保活跃 ID 已设置
        storage.setActiveCatId(taskId);
        
        setTimeout(() => {
          if (!abortController.signal.aborted) {
            navigate("/", { replace: true });
          }
        }, 1500);

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
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
            <h2 className="text-2xl font-black text-on-surface mb-4">生成遇到问题</h2>
            <p className="text-on-surface-variant mb-8 max-w-xs">{error}</p>
            <button 
              onClick={() => navigate("/upload-material")}
              className="miao-btn-primary px-12"
            >
              返回重试
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
                className="absolute inset-0 border-4 border-primary/10 border-t-primary rounded-[40px]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles size={64} className="text-primary" />
                </motion.div>
              </div>
            </div>

            <h2 className="text-2xl font-black text-on-surface mb-2">{status}</h2>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-4">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary"
              />
            </div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest opacity-60">
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
    </div>
  );
}

function StatusStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'}`}>
        {done ? <CheckCircle2 size={14} /> : <Loader2 size={14} className={active ? 'animate-spin' : ''} />}
      </div>
      <span className={`text-sm font-bold ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>{label}</span>
    </div>
  );
}
