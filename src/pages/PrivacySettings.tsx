import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, ChevronRight, ShieldCheck } from "lucide-react";
import { storage } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

export default function PrivacySettings() {
  const navigate = useNavigate();
  const [cacheSize, setCacheSize] = useState("124.8 MB");
  const [isClearing, setIsClearing] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleClearCache = () => {
    setIsClearing(true);
    // Simulate clearing process
    setTimeout(() => {
      storage.clearMediaCache();
      setCacheSize("0 KB");
      setIsClearing(false);
      triggerToast("缓存已清除喵～");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
      <header 
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 pb-4 flex items-center border-b border-outline-variant/30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">隐私设置</h1>
      </header>

      <div className="p-6 space-y-4">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleClearCache}
          disabled={isClearing}
          className="w-full p-6 bg-white rounded-[32px] shadow-sm border border-outline-variant/30 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-active:scale-90 transition-transform">
              <Trash2 size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-on-surface">清除缓存</h3>
              <p className="text-xs text-on-surface-variant font-medium opacity-60">释放设备存储空间</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-primary">{isClearing ? "清理中..." : cacheSize}</span>
            <ChevronRight size={16} className="text-on-surface-variant opacity-30" />
          </div>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/privacy-policy")}
          className="w-full p-6 bg-white rounded-[32px] shadow-sm border border-outline-variant/30 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-active:scale-90 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-on-surface">隐私政策</h3>
              <p className="text-xs text-on-surface-variant font-medium opacity-60">了解我们如何处理数据</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant opacity-30" />
        </motion.button>

        <div className="mt-8 p-6 bg-surface-container-low rounded-[32px] border border-transparent">
          <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed opacity-60">
            * 清除缓存将删除本地存储的日记图片和视频预览，不会删除您的文字记录。
            <br/>
            * 您的数据将严格按照隐私政策进行保护，不会泄露给第三方。
          </p>
        </div>
      </div>
    </div>
  );
}
