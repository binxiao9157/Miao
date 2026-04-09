import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Sparkles, AlertCircle, Coins, PartyPopper, Loader2 } from "lucide-react";
import { catService } from "../services/catService";
import { storage } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import { VolcanoService } from "../services/volcanoService";
import { useAuthContext } from "../context/AuthContext";

export default function CreateCompanion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshCatStatus } = useAuthContext();
  const isRedemption = location.state?.isRedemption || false;
  const isDebugRedemption = location.state?.isDebugRedemption || false;
  const redemptionAmount = location.state?.redemptionAmount || 200;
  
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [showToast, setShowToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const getBase64FromUrl = async (url: string, fallbackId: string): Promise<string> => {
    try {
      let response;
      try {
        response = await fetch(url);
        if (!response.ok) throw new Error("Not found");
      } catch (e) {
        console.warn(`Local asset not found or fetch failed: ${url}, using fallback.`);
        const fallbackUrl = `https://picsum.photos/seed/cat_${fallbackId}/400/400`;
        response = await fetch(fallbackUrl);
      }
      
      const blob = await response.blob();
      
      // 使用 Canvas 进行图片压缩和尺寸调整，确保 API 兼容性
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 限制最大尺寸为 512px，减小 payload 大小，加快上传速度
          const maxSide = 512;
          if (width > maxSide || height > maxSide) {
            if (width > height) {
              height = (height / width) * maxSide;
              width = maxSide;
            } else {
              width = (width / height) * maxSide;
              height = maxSide;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 导出为 jpeg 格式，质量设为 0.8
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error("Failed to convert image to base64:", error);
      return url;
    }
  };

  const handleGenerate = () => {
    if (!catName.trim() || !selectedBreed || !selectedColor) {
      triggerToast("请填写完整信息后再生成哦！");
      return;
    }

    const breed = catService.breeds.find(b => b.id === selectedBreed);
    const color = catService.colors.find(c => c.id === selectedColor);

    // 跳转到生成进度页，执行两步式生成 (T2I -> I2V)
    navigate("/generation-progress", { 
      state: { 
        image: null, // T2I 模式
        name: catName, 
        breed: breed?.name || "", 
        furColor: color?.name || "",
        isRedemption, 
        isDebugRedemption,
        redemptionAmount
      } 
    });
  };

  // 交互逻辑：只有输入了昵称且选择了品种后，按钮才变为高亮可点击状态
  const isFormComplete = catName.trim() !== "" && selectedBreed !== null;

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

          {/* 品种选择 - 2x2 Grid */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-[#5D4037]/40 ml-1">选择品种</label>
            <div className="grid grid-cols-2 gap-4">
              {catService.breeds.map((breed) => (
                <button
                  key={breed.id}
                  onClick={() => setSelectedBreed(breed.id)}
                  className={`p-5 rounded-[32px] border-[3px] transition-all flex flex-col items-center gap-4 relative overflow-hidden ${
                    selectedBreed === breed.id 
                      ? "border-[#8B4513] bg-[#8B4513]/5 scale-[1.02] shadow-lg" 
                      : "border-transparent bg-white shadow-sm hover:bg-[#5D4037]/5"
                  }`}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-[#5D4037]/5">
                    <img 
                      src={breed.image} 
                      alt={breed.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        // 如果本地素材缺失，使用高质量的占位图
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${breed.id}&backgroundColor=f8d4c1`;
                      }}
                    />
                  </div>
                  <span className={`text-sm font-black ${selectedBreed === breed.id ? "text-[#8B4513]" : "text-[#5D4037]/60"}`}>
                    {breed.name}
                  </span>
                  {selectedBreed === breed.id && (
                    <div className="absolute top-3 right-3 bg-[#8B4513] text-white rounded-full p-1 shadow-sm">
                      <Check size={14} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 毛色选择 */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-[#5D4037]/40 ml-1">选择毛色</label>
            <div className="flex flex-wrap items-center gap-6 px-2">
              {catService.colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`relative shrink-0 w-14 h-14 rounded-full transition-all shadow-md ${
                    selectedColor === color.id 
                      ? "scale-110 ring-4 ring-[#FF9D76] ring-offset-4 z-10" 
                      : "hover:scale-105 active:scale-95"
                  }`}
                  style={{ background: color.hex }}
                >
                  {selectedColor === color.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check 
                        size={28} 
                        className={color.id === 'white' ? "text-[#FF9D76]" : "text-white"} 
                        strokeWidth={4}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部固定按钮区域 - 使用 SafeArea 逻辑 */}
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
                <span>{generationStatus}</span>
              </>
            ) : (
              <>
                <Sparkles size={22} />
                <span>确认生成</span>
              </>
            )}
          </button>
          
          {generationStatus === "PWA 缓存异常，建议清理" && (
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
              className="w-full mt-4 py-3 bg-white text-[#5D4037]/40 rounded-full font-bold text-xs border border-[#5D4037]/10 active:scale-95 transition-all"
            >
              清理缓存并重置 PWA
            </button>
          )}
        </div>
      </div>

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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-orange-300"></div>
              
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <PartyPopper className="text-primary" size={40} />
              </div>
              
              <h2 className="text-2xl font-black text-on-surface mb-2">恭喜获得新伙伴！</h2>
              <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
                你成功领养了 <span className="text-primary font-bold">{catName}</span>，它已经在猫窝里等你啦～
              </p>
              
              {isRedemption && (
                <div className="bg-primary/5 rounded-2xl p-4 mb-8 flex items-center justify-center gap-2">
                  <Coins size={16} className="text-primary" />
                  <span className="text-xs font-bold text-primary">已消耗 {redemptionAmount || 200} 积分</span>
                </div>
              )}

              <button 
                onClick={() => navigate("/", { replace: true })}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
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
