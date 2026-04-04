import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Check, Coins, Sparkles } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { motion } from "motion/react";

export default function SwitchCompanion() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<CatInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    setCats(storage.getCatList());
    setActiveId(storage.getActiveCatId());
    setPoints(storage.getPoints().total);
  }, []);

  const handleSwitch = (id: string) => {
    storage.setActiveCatId(id);
    setActiveId(id);
    // Optional: show a success toast
  };

  const handleAddNew = () => {
    if (points >= 200) {
      navigate("/welcome", { state: { isRedemption: true } });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center border-b border-outline-variant/30">
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
            </motion.div>
          ))}

          {/* 添加新伙伴按钮 */}
          <button 
            onClick={handleAddNew}
            disabled={points < 200}
            className={`flex flex-col items-center justify-center p-4 rounded-[32px] border-2 border-dashed transition-all ${
              points >= 200 
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
              <span className="text-[10px] font-bold">200 积分</span>
            </div>
          </button>
        </div>

        {points < 200 && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-xs text-primary font-medium text-center leading-relaxed">
              积分不足喵～ 还需要 {(200 - points)} 积分即可开启一段新的缘分。
              <br/>
              可以通过每日登录、互动、在线时长来获取积分。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
