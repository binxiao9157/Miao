import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Sparkles, AlertCircle } from "lucide-react";
import { catService } from "../services/catService";
import { motion, AnimatePresence } from "motion/react";
import { VolcanoService } from "../services/volcanoService";
import { GoogleGenAI } from "@google/genai";

export default function CreateCompanion() {
  const navigate = useNavigate();
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [showToast, setShowToast] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio?.hasSelectedApiKey) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for local dev if window.aistudio is not present
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleOpenKeyDialog = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio?.openSelectKey) {
      await aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!catName.trim() || !selectedBreed || !selectedColor) {
      triggerToast("请填写完整信息后再生成哦！");
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("正在构思猫咪的模样...");
    
    try {
      const breed = catService.breeds.find(b => b.id === selectedBreed);
      const color = catService.colors.find(c => c.id === selectedColor);
      const prompt = catService.getPrompt(selectedBreed, selectedColor);
      
      setGenerationStatus("正在提交生成任务 (火山引擎)...");
      
      const submitResult = await VolcanoService.submitTask(selectedImage || breed?.image || "");
      const taskId = submitResult.id;

      if (!taskId) {
        throw new Error("提交任务失败: 未获取到任务 ID");
      }
      
      // 轮询进度
      setGenerationStatus(`正在赋予灵魂 (0%)...`);
      
      const videoUrl = await VolcanoService.pollTaskResult(
        taskId,
        (status) => {
          if (status === 'running') {
            setGenerationStatus("AI 正在绘制视频帧...");
          }
        }
      );

      setGenerationStatus("猫咪正在赶来的路上...");
      
      catService.saveCat({
        id: taskId, // 使用任务 ID 作为唯一标识
        name: catName,
        breed: breed?.name || "",
        color: color?.name || "",
        avatar: selectedImage || breed?.image || "",
        source: 'created',
        videoPath: videoUrl,
        remoteVideoUrl: videoUrl
      });
      
      catService.playMeow();
      setIsGenerating(false);
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Generation failed:", error);
      triggerToast(error.message || "生成失败，请重试");
      setIsGenerating(false);
    }
  };

  const isFormComplete = catName.trim() !== "" && selectedBreed !== null && selectedColor !== null;

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm whitespace-nowrap"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">手捏小猫</h1>
      </header>

      {!hasKey && false && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-grow">
            <p className="text-sm text-amber-800 font-medium">需要配置 API Key</p>
            <p className="text-xs text-amber-700 mt-1">为了生成高质量视频，请先选择一个已开启计费的 Google Cloud 项目 Key。</p>
            <button 
              onClick={handleOpenKeyDialog}
              className="mt-2 text-xs font-bold text-amber-600 underline"
            >
              立即选择 Key
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow space-y-8 overflow-y-auto pb-32">
        {/* 预览区域 */}
        <div className="relative w-full aspect-square bg-white rounded-3xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white">
          {selectedImage ? (
            <img 
              src={selectedImage} 
              alt="Uploaded Preview" 
              className="w-full h-full object-cover"
            />
          ) : selectedBreed ? (
            <img 
              src={catService.breeds.find(b => b.id === selectedBreed)?.image} 
              alt="Cat Preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-on-surface-variant opacity-20" />
              </div>
              <p className="text-sm text-on-surface-variant">选择品种或上传图片，预览您的猫咪</p>
            </div>
          )}
          
          {isGenerating && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-primary animate-pulse" size={32} />
                </div>
              </div>
              <p className="text-primary font-bold text-lg mb-2">正在赋予灵魂...</p>
              <p className="text-xs text-on-surface-variant max-w-[200px] leading-relaxed">
                {generationStatus}
              </p>
              <p className="mt-4 text-[10px] text-on-surface-variant opacity-50 italic">
                视频生成可能需要 1-3 分钟，请耐心等待
              </p>
            </div>
          )}
        </div>

        {/* 名字输入 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">猫咪昵称</label>
            <input 
              type="text" 
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="给它起个好听的名字"
              className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">上传参考图 (可选)</label>
            <div className="flex items-center gap-4">
              <label className="flex-grow cursor-pointer">
                <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-surface-variant/30 flex items-center justify-center gap-2 text-on-surface-variant hover:bg-surface-variant/5 transition-all">
                  <Sparkles size={18} />
                  <span className="text-sm font-medium">{selectedImage ? "更换图片" : "上传猫咪美照"}</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const dataUrl = reader.result as string;
                        const img = new Image();
                        img.onload = () => {
                          if (img.width < 300) {
                            triggerToast(`图片宽度过小 (${img.width}px)。API 要求至少 300 像素。`);
                            return;
                          }
                          setSelectedImage(dataUrl);
                        };
                        img.onerror = () => {
                          triggerToast("图片加载失败，请重试。");
                        };
                        img.src = dataUrl;
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {selectedImage && (
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 品种选择 - 2x2 Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">选择品种</label>
          <div className="grid grid-cols-2 gap-4">
            {catService.breeds.map((breed) => (
              <button
                key={breed.id}
                onClick={() => setSelectedBreed(breed.id)}
                className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center gap-3 relative overflow-hidden ${
                  selectedBreed === breed.id 
                    ? "border-[#8B4513] bg-[#8B4513]/5 scale-[1.02]" 
                    : "border-transparent bg-white shadow-sm hover:bg-surface-variant/10"
                }`}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <img src={breed.image} alt={breed.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className={`text-sm font-bold ${selectedBreed === breed.id ? "text-[#8B4513]" : "text-on-surface"}`}>
                  {breed.name}
                </span>
                {selectedBreed === breed.id && (
                  <div className="absolute top-2 right-2 bg-[#8B4513] text-white rounded-full p-0.5">
                    <Check size={12} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 毛色选择 - Row */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">选择毛色</label>
          <div className="flex items-center gap-5 px-2 py-2 overflow-x-auto no-scrollbar">
            {catService.colors.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`relative shrink-0 w-12 h-12 rounded-full transition-all ${
                  selectedColor === color.id 
                    ? "scale-125 ring-4 ring-primary ring-offset-4 z-10" 
                    : "hover:scale-110"
                }`}
                style={{ background: color.hex }}
              >
                {selectedColor === color.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check 
                      size={24} 
                      className={color.id === 'white' ? "text-primary" : "text-white"} 
                      strokeWidth={3}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-6 right-6">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || !isFormComplete}
          className={`w-full py-5 rounded-full font-bold text-lg shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all ${
            isFormComplete && !isGenerating
              ? "bg-primary text-white"
              : "bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed"
          }`}
        >
          <Sparkles size={20} className={isGenerating ? "animate-spin" : ""} />
          {isGenerating ? "正在生成中..." : "确认生成"}
        </button>
      </div>
    </div>
  );
}
