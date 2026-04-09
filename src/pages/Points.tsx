import { Star, CheckCircle2, ArrowRight, Lock, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storage, PointsInfo, PointTransaction } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";
import FloatingDebugPanel from "../components/FloatingDebugPanel";

export default function Points() {
  const [points, setPoints] = useState(0);
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();
  const REDEEM_THRESHOLD = storage.getUnlockThreshold();
  const ownedCatsCount = storage.getCatList().length;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchPoints = () => {
      const data = storage.getPoints();
      setPointsInfo(data);
      setPoints(data.total || 0);
    };
    
    fetchPoints();
    
    // Poll for updates in case Home.tsx adds points in the background
    const interval = setInterval(fetchPoints, 2000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const loginCompleted = pointsInfo?.lastLoginDate === today;
  const interactionCompleted = pointsInfo?.lastInteractionDate === today && (pointsInfo?.dailyInteractionPoints || 0) > 0;
  const onlineCompleted = (pointsInfo?.onlineMinutes || 0) >= 10;

  const tasks = [
    { id: 1, title: '每日首次登录', reward: 10, completed: loginCompleted, description: '每天第一次打开APP即可获得' },
    { id: 2, title: '完成1次猫咪互动', reward: 5, completed: interactionCompleted, description: '在首页点击猫咪进行互动' },
    { id: 3, title: '单日登录时长超10分钟', reward: 10, completed: onlineCompleted, description: '累计在线时间达到10分钟' },
  ];

  const effectivePoints = isDebugMode ? Math.max(points, REDEEM_THRESHOLD) : points;

  return (
    <div className="flex flex-col">
      <PageHeader 
        title="积分中心" 
        subtitle="Points Center" 
      />

      <div 
        className="px-6 pb-32"
        style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}
      >
        <div 
          onClick={() => setShowHistory(true)}
          className="miao-card bg-primary text-white p-8 mb-8 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
        >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="absolute top-4 right-4 bg-white/20 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-white/30 transition-colors">
          <span className="text-[10px] font-bold tracking-wider">积分明细</span>
          <ChevronRight size={12} />
        </div>

        <Star className="mb-2 opacity-80" size={32} fill="currentColor" />
        <p className="text-xs font-bold tracking-widest uppercase opacity-80 mb-1">当前积分余额</p>
        <h2 className="text-5xl font-black">{effectivePoints.toLocaleString()}</h2>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">今日任务</h2>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">每日更新</span>
        </div>

        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="miao-card p-5 flex items-center justify-between group active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  task.completed ? "bg-green-50 text-green-500" : "bg-primary/5 text-primary"
                }`}>
                  {task.completed ? <CheckCircle2 size={24} /> : <Star size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-sm">{task.title}</h3>
                  <p className="text-[10px] text-on-surface-variant opacity-60 mt-0.5">{task.description}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-black text-primary">+{task.reward}</span>
                    <span className="text-[10px] text-on-surface-variant">积分</span>
                  </div>
                </div>
              </div>
              
              {task.completed ? (
                <span className="text-[10px] font-bold text-green-500 bg-green-50 px-3 py-1.5 rounded-full">已完成</span>
              ) : (
                <button className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-on-surface mb-4">积分兑换</h2>
        <div className={`miao-card p-6 flex flex-col items-center justify-center text-center transition-all ${
          effectivePoints < REDEEM_THRESHOLD 
            ? "bg-surface-container-low border-dashed border-2 border-outline-variant opacity-80" 
            : "bg-primary/5 border-2 border-primary/20"
        }`}>
          <div className={`w-16 h-16 rounded-full shadow-sm flex items-center justify-center mb-4 ${
            effectivePoints < REDEEM_THRESHOLD ? "bg-white text-on-surface-variant/40" : "bg-white text-primary"
          }`}>
            {effectivePoints < REDEEM_THRESHOLD ? <Lock size={32} /> : <Star size={32} />}
          </div>
          <h3 className="font-bold text-on-surface mb-1">解锁第 {ownedCatsCount + 1} 位伙伴</h3>
          <p className="text-xs text-on-surface-variant opacity-70 mb-2">消耗 {REDEEM_THRESHOLD} 积分，即可生成一只全新的猫咪伙伴</p>
          
          {effectivePoints < REDEEM_THRESHOLD && (
            <p className="text-[10px] font-black text-primary mb-4 uppercase tracking-widest">
              还差 {REDEEM_THRESHOLD - effectivePoints} 积分即可解锁第 {ownedCatsCount + 1} 位伙伴
            </p>
          )}

          <button 
            disabled={effectivePoints < REDEEM_THRESHOLD}
            onClick={() => navigate("/welcome", { state: { isRedemption: true, isDebugRedemption: isDebugMode, redemptionAmount: REDEEM_THRESHOLD } })}
            className={`w-full py-3 text-sm font-bold rounded-2xl transition-all active:scale-95 ${
              effectivePoints < REDEEM_THRESHOLD 
                ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                : "bg-primary text-white shadow-lg shadow-primary/20"
            }`}
          >
            前往兑换
          </button>
        </div>
      </section>
    </div>

      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm pt-[env(safe-area-inset-top)]"
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant/30 bg-surface">
              <h2 className="text-xl font-bold text-on-surface">积分明细</h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-11 h-11 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(!pointsInfo?.history || pointsInfo.history.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-40 text-on-surface-variant opacity-50">
                  <Star size={32} className="mb-2" />
                  <p className="text-sm">暂无积分记录</p>
                </div>
              ) : (
                pointsInfo.history.map((tx: PointTransaction) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
                    <div>
                      <p className="font-bold text-on-surface text-sm mb-1">{tx.reason}</p>
                      <p className="text-[10px] text-on-surface-variant opacity-70">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className={`font-black text-lg ${tx.type === 'earn' ? 'text-primary' : 'text-on-surface'}`}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingDebugPanel 
        isDebugMode={isDebugMode}
        setIsDebugMode={setIsDebugMode}
        setPoints={setPoints}
        setPointsInfo={setPointsInfo}
        showToast={showToast}
      />
    </div>
  );
}
