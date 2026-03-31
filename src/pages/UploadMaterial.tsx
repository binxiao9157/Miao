import { useState, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { catService } from "../services/catService";

export default function UploadMaterial() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const playMeow = () => {
    const audio = new Audio("https://www.myinstants.com/media/sounds/meow.mp3");
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    
    // 跳转到生成进度页，并传递图片数据
    navigate("/generation-progress", { state: { image: selectedImage } });
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <header className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">上传猫咪素材</h1>
      </header>

      <div className="flex-grow flex flex-col">
        <section className="mb-8">
          <h2 className="text-2xl font-extrabold text-primary mb-2">AI 形象生成</h2>
          <p className="text-on-surface-variant text-sm opacity-70">上传一张您家猫咪的照片，AI 将为您生成专属的数字形象。</p>
        </section>

        <div className="flex-grow flex flex-col items-center justify-center">
          {selectedImage ? (
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center"
              >
                <X size={20} />
              </button>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={32} />
                  </div>
                  <p className="mt-6 text-white font-bold tracking-widest animate-bounce">AI 正在深度分析中...</p>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square rounded-3xl border-4 border-dashed border-outline-variant bg-white flex flex-col items-center justify-center gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="font-bold text-on-surface">点击上传照片</p>
                <p className="text-xs text-on-surface-variant opacity-60 mt-1">支持 JPG, PNG 格式</p>
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

        <div className="mt-10 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <ImageIcon size={20} />
            </div>
            <div className="flex-grow">
              <p className="text-xs font-bold text-on-surface">火山引擎 API 支持</p>
              <p className="text-[10px] text-on-surface-variant">精准识别品种、毛色及神态特征</p>
            </div>
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={!selectedImage || isAnalyzing}
            className="w-full py-5 bg-primary-container text-white rounded-full font-bold text-lg shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Sparkles size={20} />
            {isAnalyzing ? "正在生成..." : "开始生成数字形象"}
          </button>
        </div>
      </div>
    </div>
  );
}
