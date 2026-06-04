import { useState, useRef, ChangeEvent, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Upload, Sparkles, X, Pencil, Check, Maximize2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Cropper from 'react-easy-crop';
import { VolcanoService, IMAGE_PROMPTS } from "../services/volcanoService";
import { storage } from "../services/storage";

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

  const query = new URLSearchParams(location.search);
  const isRedemption = location.state?.isRedemption ?? query.get("isRedemption") === "1";
  const isDebugRedemption = location.state?.isDebugRedemption ?? query.get("debug") === "1";
  const redemptionAmount = Number(location.state?.redemptionAmount ?? query.get("redemptionAmount")) || 200;

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

  const [isDrawing, setIsDrawing] = useState(false);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!selectedImage || !nickname.trim()) {
      triggerToast("请输入猫咪名字并上传照片哦～");
      return;
    }

    setIsDrawing(true);
    try {
      // Stage 1: Qwen Image Generation (using VolcanoService)
      // 使用用户定制的全新正反向提示词
      const prompt = `全身照视角，中心构图，画面四周留出充足的空白区域。确保猫咪和猫窝整体位于画面正中央，头顶上方与底座下方均有大面积留白，主体整体约占据画面的八分之一。竖屏 9:16，480P
主体要求：精确提取输入原图中猫咪的全部外观特征（毛色、花纹、体型、眼色）保持绝对不变。猫咪呈标准蹲坐姿态，前爪并拢，身体端正，头部微微抬起，双眼圆睁，目光平静且专注地直视镜头。
场景环境：猫咪蹲坐在一张带有简约几何暗纹的柔软米色猫窝中。背景是温馨的现代客厅。
光影与参数：镜头平视视角（与猫眼齐平），浅景深虚化背景（f/2.8光圈效果）以突出猫咪。色温3500K的柔和室内自然光，营造治愈宁静的氛围。照片级超写实画质，毛发纹理极度清晰。`.trim();
      
      const negativePrompt = `特写镜头，大头照，主体充满画面，画面裁切，截断的耳朵，截断的爪子，卡通化，绘画感，艺术化处理，添加文字，水印，签名，多余的玩具，食物，其他人物，其他动物，画面畸变。`.trim();
      
      const task = await VolcanoService.submitImageTask(prompt, selectedImage, negativePrompt); 
      const imageUrl = await VolcanoService.pollImageResult(task.id, task.image_url);
      setFirstFrameUrl(imageUrl);
    } catch (e: any) {
      console.error("Stage 1 Error:", e);
      triggerToast(e.message || "形象生成失败，请重试");
    } finally {
      setIsDrawing(false);
    }
  };

  const handleConfirmAndGenerateVideo = () => {
    if (!firstFrameUrl) return;
    const draft = {
      catId: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      image: firstFrameUrl,
      name: nickname,
      source: "uploaded" as const,
      originalImage: selectedImage || undefined,
      isRedemption,
      isDebugRedemption,
      redemptionAmount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    storage.saveGenerationDraft(draft);
    // Stage 3: Wan Video Generation (handled in GenerationProgress)
    navigate("/generation-progress", { 
      state: draft
    });
    setFirstFrameUrl(null);
  };

  const handleDownloadImage = async () => {
    if (!firstFrameUrl) return;
    try {
      // Use proxy to avoid CORS issues
      const proxiedUrl = `/api/proxy-resource?url=${encodeURIComponent(firstFrameUrl)}`;
      const response = await fetch(proxiedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${nickname}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      triggerToast("已尝试下载，或可长按下方预览图保存");
    } catch (e) {
      console.error("Save Error:", e);
      triggerToast("保存失败，请长按图片手动保存");
    }
  };

  const isReady = selectedImage && nickname.trim();

  return (
    <div 
      className="h-dvh bg-[#FFF9F5] px-6 pb-6 flex flex-col font-sans overflow-y-auto" 
      onClick={() => (document.activeElement as HTMLElement)?.blur()}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <header className="flex items-center mb-4 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#5D4037] active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-[#5D4037] ml-2">上传素材</h1>
      </header>

      <div className="flex-shrink-0 flex flex-col max-w-md mx-auto w-full">
        <section className="mb-4">
          <h2 className="text-3xl font-black text-[#5D4037] mb-2 tracking-tight">AI 形象生成</h2>
          <p className="text-[#5D4037]/40 text-sm font-bold uppercase tracking-widest">AI Image Generation</p>
          <p className="text-[#5D4037]/60 text-sm mt-3 leading-relaxed">上传一张您家猫咪的照片，AI 将为您生成专属的数字形象。</p>
        </section>

        <div className="flex flex-col items-center justify-start space-y-4">
          {/* 图片预览区 */}
          <div className="w-full max-h-[40dvh] aspect-square relative">
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

        <div className="mt-4 pb-4">
          <button 
            onClick={handleGenerateImage}
            disabled={!isReady || isDrawing}
            className={`w-full py-5 rounded-full font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isReady && !isDrawing
                ? "bg-[#FF9D76] text-white shadow-[#FF9D76]/30" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isDrawing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {isDrawing ? "绘制专属形象中..." : "开始生成数字形象"}
          </button>
        </div>
      </div>

      {/* Stage 2: First Frame Confirm Modal */}
      <AnimatePresence>
        {firstFrameUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl flex flex-col gap-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#5D4037]">专属形象初稿</h3>
                <p className="text-sm text-[#5D4037]/60">AI 已捕捉到了猫咪的灵魂特征</p>
              </div>

              {/* 生成图展示 */}
              <div className="w-full aspect-square rounded-[32px] overflow-hidden shadow-inner bg-gray-100 border-2 border-primary/10">
                <img src={firstFrameUrl} alt="First Frame" className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmAndGenerateVideo}
                  className="w-full py-4 bg-[#FF9D76] text-white rounded-2xl font-black shadow-lg shadow-[#FF9D76]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  确认并注入生命力
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setFirstFrameUrl(null);
                      handleGenerateImage();
                    }}
                    className="py-4 bg-gray-100 text-[#5D4037] rounded-2xl font-bold active:scale-95 transition-all text-sm"
                  >
                    重新生成
                  </button>
                  <button 
                    onClick={handleDownloadImage}
                    className="py-4 bg-gray-100 text-[#5D4037] rounded-2xl font-bold active:scale-95 transition-all text-sm"
                  >
                    保存图片
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 1: Loading Overlay */}
      <AnimatePresence>
        {isDrawing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative w-40 h-40 mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-[#FF9D76]/10 border-t-[#FF9D76] rounded-[40px]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={64} className="text-[#FF9D76] animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-[#5D4037] mb-2 tracking-tight">正在绘制专属形象...</h2>
            <p className="text-sm text-[#5D4037]/40 font-bold uppercase tracking-widest">Stage 1: Image Capture</p>
          </motion.div>
        )}
      </AnimatePresence>

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
