import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Upload, Sparkles, X, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function UploadMaterial() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(location.state?.image || null);
  const [nickname, setNickname] = useState(location.state?.name || "");
  const [showToast, setShowToast] = useState<string | null>(null);

  const isRedemption = location.state?.isRedemption || false;
  const isDebugRedemption = location.state?.isDebugRedemption || false;
  const redemptionAmount = location.state?.redemptionAmount || 200;

  useEffect(() => {
    if (location.state?.image) {
      setSelectedImage(location.state.image);
    }
    if (location.state?.name) {
      setNickname(location.state.name);
    }
  }, [location.state]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2000);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        
        const img = new Image();
        img.onload = () => {
          if (img.width < 300) {
            triggerToast("图片宽度至少需 300 像素哦～");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }
          
          // 压缩并调整大小，减小 payload
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
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
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setSelectedImage(compressedDataUrl);
          } else {
            setSelectedImage(dataUrl);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (!selectedImage || !nickname.trim()) {
      triggerToast("请输入猫咪名字并上传照片哦～");
      return;
    }
    
    // 跳转到生成进度页，并传递图片和昵称数据
    navigate("/generation-progress", { state: { image: selectedImage, name: nickname, isRedemption, isDebugRedemption, redemptionAmount } });
  };

  const isReady = selectedImage && nickname.trim();

  return (
    <div 
      className="min-h-screen bg-[#FFF5F0] px-6 pb-6 flex flex-col font-sans" 
      onClick={() => (document.activeElement as HTMLElement)?.blur()}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <header className="flex items-center mb-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#5D4037] active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-[#5D4037] ml-2">上传素材</h1>
      </header>

      <div className="flex-grow flex flex-col max-w-md mx-auto w-full">
        <section className="mb-10">
          <h2 className="text-3xl font-black text-[#5D4037] mb-2 tracking-tight">AI 形象生成</h2>
          <p className="text-[#5D4037]/40 text-sm font-bold uppercase tracking-widest">AI Image Generation</p>
          <p className="text-[#5D4037]/60 text-sm mt-3 leading-relaxed">上传一张您家猫咪的照片，AI 将为您生成专属的数字形象。</p>
        </section>

        <div className="flex-grow flex flex-col items-center justify-start space-y-8">
          {/* 图片预览区 */}
          <div className="w-full aspect-square relative">
            {selectedImage ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full h-full rounded-[40px] overflow-hidden shadow-2xl border-4 border-white relative"
              >
                <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </motion.div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full rounded-[40px] border-4 border-dashed border-outline-variant/30 bg-white flex flex-col items-center justify-center gap-4 active:scale-[0.98] transition-all group"
              >
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black text-on-surface">点击上传照片</p>
                  <p className="text-[10px] font-bold text-on-surface-variant opacity-40 mt-1 uppercase tracking-widest">JPG, PNG Support</p>
                </div>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* 昵称输入框 */}
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                <Pencil size={18} />
              </div>
              <input 
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给猫咪起个好听的名字"
                className="w-full py-5 pl-14 pr-6 bg-white rounded-[24px] border-2 border-transparent focus:border-primary/20 focus:bg-white shadow-sm outline-none text-on-surface font-bold placeholder:text-on-surface-variant/30 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 pb-8">
          <button 
            onClick={handleGenerate}
            className={`w-full py-5 rounded-full font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isReady 
                ? "bg-[#FF9D76] text-white shadow-[#FF9D76]/30" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Sparkles size={20} />
            开始生成数字形象
          </button>
        </div>
      </div>

      {/* 轻提示 Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
