import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Check, Coins, Sparkles, Trash2 } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

export default function SwitchCompanion() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<CatInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [deletingCat, setDeletingCat] = useState<CatInfo | null>(null);
  const REDEEM_THRESHOLD = storage.getUnlockThreshold();

  useEffect(() => {
    const fetchData = () => {
      setCats(storage.getCatList());
      setActiveId(storage.getActiveCatId());
      setPoints(storage.getPoints().total);
    };
    
    fetchData();
    
    // 页面可见时刷新，替代 2s 轮询
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleSwitch = (id: string) => {
    storage.setActiveCatId(id);
    setActiveId(id);
    // Optional: show a success toast
  };

  const handleAddNew = () => {
    if (points >= REDEEM_THRESHOLD) {
      navigate("/welcome", { state: { isRedemption: true, redemptionAmount: REDEEM_THRESHOLD } });
    }
  };

  const handleDeleteCat = (cat: CatInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCat(cat);
  };

  const confirmDelete = () => {
    if (!deletingCat) return;
    const remaining = storage.deleteCatById(deletingCat.id);
    setCats(remaining);
    setActiveId(storage.getActiveCatId());
    setDeletingCat(null);
    if (remaining.length === 0) {
      navigate("/empty-cat", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <header 
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 pb-4 flex items-center border-b border-outline-variant/30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">切换伙伴</h1>
        
        <div className="ml-auto bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1.5">
          <Coins size={14} className="text-primary" />
          <span className="text-xs font-bold text-primary">{points}</span>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {cats.map((cat) => (
            <motion.div 
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSwitch(cat.id)}
              className={`relative p-4 rounded-[32px] border-2 transition-all ${
                activeId === cat.id 
                  ? "bg-white border-primary shadow-xl" 
                  : "bg-surface-container-low border-transparent opacity-80"
              }`}
            >
              <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-outline-variant/10">
                <img 
                  src={cat.avatar} 
                  alt={cat.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm truncate pr-2">{cat.name}</h3>
                  {activeId === cat.id && (
                    <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                      <Check size={12} strokeWidth={4} />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant font-medium opacity-60">
                  {cat.breed}
                </p>
              </div>

              {cat.source === 'uploaded' && (
                <div className="absolute top-6 right-6 w-6 h-6 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-primary shadow-sm">
                  <Sparkles size={12} />
                </div>
              )}

              {cats.length > 1 && (
                <button
                  onClick={(e) => handleDeleteCat(cat, e)}
                  className="absolute top-6 left-6 w-7 h-7 bg-red-500/80 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </motion.div>
          ))}

          {/* 添加新伙伴按钮 */}
          <button 
            onClick={handleAddNew}
            disabled={points < REDEEM_THRESHOLD}
            className={`flex flex-col items-center justify-center p-4 rounded-[32px] border-2 border-dashed transition-all ${
              points >= REDEEM_THRESHOLD 
                ? "bg-primary/5 border-primary/30 text-primary active:bg-primary/10" 
                : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant opacity-40 grayscale"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-current/10 flex items-center justify-center mb-3">
              <Plus size={24} />
            </div>
            <span className="text-xs font-bold">添加新伙伴</span>
            <div className="mt-2 flex items-center gap-1 opacity-80">
              <Coins size={10} />
              <span className="text-[10px] font-bold">{REDEEM_THRESHOLD} 积分</span>
            </div>
          </button>
        </div>

        {points < REDEEM_THRESHOLD && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-xs text-primary font-medium text-center leading-relaxed">
              积分不足喵～ 还需要 {(REDEEM_THRESHOLD - points)} 积分即可开启一段新的缘分。
              <br/>
              可以通过每日登录、互动、在线时长来获取积分。
            </p>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {deletingCat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setDeletingCat(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-lg font-bold text-center mb-2">确认告别</h3>
              <p className="text-sm text-on-surface-variant text-center mb-6">
                确定要和 <span className="font-bold text-on-surface">{deletingCat.name}</span> 说再见吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingCat(null)}
                  className="flex-1 py-3 bg-surface-container rounded-full font-bold text-on-surface active:scale-95 transition-transform"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-full font-bold active:scale-95 transition-transform"
                >
                  确认告别
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
