import { Star, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../services/storage";

export default function Points() {
  const [points, setPoints] = useState(0);
  const navigate = useNavigate();
  const REDEEM_THRESHOLD = 200;

  useEffect(() => {
    const data = storage.getPoints();
    setPoints(data.total || 0);
  }, []);

  const tasks = [
    { id: 1, title: '每日首次登录', reward: 10, completed: true, description: '每天第一次打开APP即可获得' },
    { id: 2, title: '完成1次猫咪互动', reward: 5, completed: false, description: '在首页点击猫咪进行互动' },
    { id: 3, title: '单日登录时长超10分钟', reward: 10, completed: false, description: '累计在线时间达到10分钟' },
  ];

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-primary">积分中心</h1>
        <p className="text-on-surface-variant text-sm opacity-70">完成任务，解锁更多猫咪伙伴</p>
      </header>

      <div className="miao-card bg-primary text-white p-8 mb-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        <Star className="mb-2 opacity-80" size={32} fill="currentColor" />
        <p className="text-xs font-bold tracking-widest uppercase opacity-80 mb-1">当前积分余额</p>
        <h2 className="text-5xl font-black">{points.toLocaleString()}</h2>
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
          points < REDEEM_THRESHOLD 
            ? "bg-surface-container-low border-dashed border-2 border-outline-variant opacity-80" 
            : "bg-primary/5 border-2 border-primary/20"
        }`}>
          <div className={`w-16 h-16 rounded-full shadow-sm flex items-center justify-center mb-4 ${
            points < REDEEM_THRESHOLD ? "bg-white text-on-surface-variant/40" : "bg-white text-primary"
          }`}>
            {points < REDEEM_THRESHOLD ? <Lock size={32} /> : <Star size={32} />}
          </div>
          <h3 className="font-bold text-on-surface mb-1">解锁新伙伴</h3>
          <p className="text-xs text-on-surface-variant opacity-70 mb-2">消耗 200 积分，即可生成一只全新的猫咪伙伴</p>
          
          {points < REDEEM_THRESHOLD && (
            <p className="text-[10px] font-black text-primary mb-4 uppercase tracking-widest">
              还差 {REDEEM_THRESHOLD - points} 积分即可解锁
            </p>
          )}

          <button 
            disabled={points < REDEEM_THRESHOLD}
            onClick={() => navigate("/welcome", { state: { isRedemption: true } })}
            className={`w-full py-3 text-sm font-bold rounded-2xl transition-all active:scale-95 ${
              points < REDEEM_THRESHOLD 
                ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                : "bg-primary text-white shadow-lg shadow-primary/20"
            }`}
          >
            前往兑换
          </button>
        </div>
      </section>
    </div>
  );
}
