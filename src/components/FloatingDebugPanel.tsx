import { useState } from "react";
import { Bug, X, Star, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage, PointsInfo } from "../services/storage";

interface Props {
  isDebugMode: boolean;
  setIsDebugMode: (val: boolean) => void;
  setPoints: (val: number) => void;
  setPointsInfo: (val: PointsInfo) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function FloatingDebugPanel({ isDebugMode, setIsDebugMode, setPoints, setPointsInfo, showToast }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      {/* 隐蔽触发图标 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-[100] w-10 h-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white/50 active:scale-90 transition-transform"
      >
        <Bug size={20} />
      </button>

      {/* 弹出面板 */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-24 right-6 z-[120] w-72 bg-surface-container rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">调试面板</h3>
                <button onClick={() => setIsOpen(false)} className="text-on-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold text-on-surface">满额积分 (9999)</span>
                <button 
                  onClick={() => {
                    const nextMode = !isDebugMode;
                    setIsDebugMode(nextMode);
                    if (nextMode) {
                      const p = storage.getPoints();
                      p.total = 9999;
                      storage.savePoints(p);
                      setPoints(9999);
                    } else {
                      const p = storage.getPoints();
                      setPoints(p.total);
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isDebugMode ? 'bg-primary' : 'bg-outline-variant/50'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isDebugMode ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>

              <button 
                onClick={() => {
                  const p = storage.getPoints();
                  p.total = 0;
                  p.history = [];
                  p.lastLoginDate = null;
                  p.lastInteractionDate = null;
                  p.dailyInteractionPoints = 0;
                  p.onlineMinutes = 0;
                  p.lastOnlineUpdate = Date.now();
                  storage.savePoints(p);
                  setPoints(0);
                  setPointsInfo(p);
                  setIsDebugMode(false);
                  showToast("真实积分已重置");
                }}
                className="w-full py-3 text-sm font-bold text-error bg-error/10 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RotateCcw size={16} />
                重置真实积分
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
