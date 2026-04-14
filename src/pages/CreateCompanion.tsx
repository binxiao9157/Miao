import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Sparkles, Loader2 } from "lucide-react";
import { storage, PresetCat } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "../context/AuthContext";

export default function CreateCompanion() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRedemption = location.state?.isRedemption || false;
  const isDebugRedemption = location.state?.isDebugRedemption || false;
  const redemptionAmount = location.state?.redemptionAmount || 200;
  
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    setPresets(storage.getPresetCats());
  }, []);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleGenerate = () => {
    if (!catName.trim() || !selectedPresetId) {
      triggerToast("请填写完整信息后再生成哦！");
      return;
    }

    const selectedPreset = presets.find(p => p.id === selectedPresetId);
    if (!selectedPreset) return;

    // 跳转到生成进度页，执行 I2V 链路
    navigate("/generation-progress", { 
      state: { 
        image: selectedPreset.imageUrl, // 直接传递预设图片 URL
        name: catName, 
        breed: selectedPreset.name, 
        furColor: "预设",
        isRedemption, 
        isDebugRedemption,
        redemptionAmount
      } 
    });
  };

  // 交互逻辑：只有输入了昵称且选择了预设后，按钮才变为高亮可点击状态
  const isFormComplete = catName.trim() !== "" && selectedPresetId !== null;

  return (
    <div 
      className="h-screen bg-background flex flex-col overflow-hidden"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[300] bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm whitespace-nowrap"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center p-6 bg-background">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">手捏小猫</h1>
      </header>

      {/* 滚动内容区域 */}
      <div className="flex-grow overflow-y-auto px-6 no-scrollbar">
        <div className="pt-4 pb-40 space-y-10">
          {/* 名字输入 */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-[#5D4037]/40 ml-1">猫咪昵称</label>
            <input 
              type="text" 
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="给它起个好听的名字"
              className="w-full p-5 bg-white rounded-[24px] border-none shadow-sm focus:ring-4 focus:ring-[#FF9D76]/10 outline-none transition-all font-bold text-[#5D4037]" 
            />
          </div>

          {/* 品种选择 - Grid */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-[#5D4037]/40 ml-1">选择品种</label>
            <div className="grid grid-cols-2 gap-4">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-4 rounded-[32px] border-[3px] transition-all flex flex-col items-center gap-3 relative overflow-hidden ${
                    selectedPresetId === preset.id 
                      ? "border-[#8B4513] bg-[#8B4513]/5 scale-[1.02] shadow-lg" 
                      : "border-transparent bg-white shadow-sm hover:bg-[#5D4037]/5"
                  }`}
                >
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md bg-[#5D4037]/5">
                    <img 
                      src={preset.imageUrl} 
                      alt={preset.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${preset.id}&backgroundColor=f8d4c1`;
                      }}
                    />
                  </div>
                  <span className={`text-sm font-black ${selectedPresetId === preset.id ? "text-[#8B4513]" : "text-[#5D4037]/60"}`}>
                    {preset.name}
                  </span>
                  {selectedPresetId === preset.id && (
                    <div className="absolute top-3 right-3 bg-[#8B4513] text-white rounded-full p-1 shadow-sm">
                      <Check size={14} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部固定按钮区域 */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#FFF5F0] via-[#FFF5F0] to-transparent pt-12 z-50">
        <div className="max-w-md mx-auto w-full">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !isFormComplete}
            className={`w-full py-5 rounded-full font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all relative overflow-hidden ${
              isFormComplete && !isGenerating
                ? "bg-[#FF9D76] text-white shadow-[#FF9D76]/30"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles size={22} />
                <span>确认生成</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
