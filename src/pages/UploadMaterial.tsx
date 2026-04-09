import { useState, useRef, ChangeEvent, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Upload, Sparkles, X, Pencil, Check, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Cropper from 'react-easy-crop';

export default function UploadMaterial() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(location.state?.image || null);
  const [nickname, setNickname] = useState(location.state?.name || "");
  const [showToast, setShowToast] = useState<string | null>(null);

  // Cropping State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
        setImageToCrop(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // 1. Smart Resizing Logic
    // Seedance prefers 1280px as max side for high quality
    let targetWidth = pixelCrop.width;
    let targetHeight = pixelCrop.height;
    const maxSide = 1280;

    if (targetWidth > maxSide || targetHeight > maxSide) {
      if (targetWidth > targetHeight) {
        targetHeight = (targetHeight / targetWidth) * maxSide;
        targetWidth = maxSide;
      } else {
        targetWidth = (targetWidth / targetHeight) * maxSide;
        targetHeight = maxSide;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // 2. High Quality Strategy
    // Try 95% quality first
    let quality = 0.95;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    
    // 3. Size Threshold Protection
    // If > 4MB, drop quality slightly
    const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
    const sizeInBytes = (base64Length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 4) {
      quality = 0.90;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return dataUrl;
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (croppedImage) {
        setSelectedImage(croppedImage);
        setImageToCrop(null);
      }
    } catch (e) {
      console.error(e);
      triggerToast("图片处理失败，请重试");
    } finally {
      setIsProcessing(false);
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

      {/* 图片裁剪弹窗 */}
      <AnimatePresence>
        {imageToCrop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
              <button onClick={() => setImageToCrop(null)} className="text-white p-2">
                <X size={24} />
              </button>
              <h3 className="text-white font-black">调整猫咪位置</h3>
              <button 
                onClick={handleCropSave} 
                disabled={isProcessing}
                className="bg-[#FF9D76] text-white px-6 py-2 rounded-full font-black text-sm flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                完成
              </button>
            </div>

            <div className="flex-grow relative bg-black/50">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={9 / 16}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-8 space-y-6 bg-black/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">缩放</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-grow h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF9D76]"
                />
              </div>
              <p className="text-white/60 text-[11px] text-center leading-relaxed">
                请将猫咪置于画面中心，以获得最佳的生成效果。<br/>
                建议保留完整的头部和身体细节。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

function Loader2({ className, size }: { className?: string, size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={className}
    >
      <X size={size || 24} className="opacity-20" />
    </motion.div>
  );
}
