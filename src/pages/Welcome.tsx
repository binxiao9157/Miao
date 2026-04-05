import { useNavigate, useLocation } from "react-router-dom";
import { Camera, ArrowRight, Upload, PawPrint, ArrowLeft, Settings } from "lucide-react";
import VolcConfigModal from "../components/VolcConfigModal";
import { useState } from "react";

export default function Welcome() {
  const navigate = useNavigate();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const location = useLocation();
  const isRedemption = location.state?.isRedemption || false;
  const isDebugRedemption = location.state?.isDebugRedemption || false;

  return (
    <div className="min-h-screen flex flex-col p-8 bg-background relative">
      {isRedemption && (
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-6 left-6 w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform z-10 shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <div className={`flex items-center gap-2 mb-12 group ${isRedemption ? 'mt-12' : ''}`}>
        <PawPrint className="text-[#5D4037] fill-[#5D4037] -rotate-12 transition-transform group-hover:-rotate-6" size={32} />
        <span className="text-2xl font-black bg-gradient-to-r from-[#5D4037] to-primary bg-clip-text text-transparent tracking-tight">Miao</span>
      </div>

      <h1 className="text-4xl font-black text-on-surface mb-3 leading-tight">
        遇见你的<br />数字猫咪
      </h1>
      <p className="text-on-surface-variant text-base mb-12 leading-relaxed">
        开启一段温暖的治愈旅程，记录你与毛<br />孩子的每一个瞬间。
      </p>

      <div className="space-y-6 flex-grow">
        <button 
          onClick={() => navigate("/upload-material", { state: { isRedemption, isDebugRedemption } })}
          className="w-full p-8 bg-surface-container rounded-[40px] text-left relative group active:scale-[0.98] transition-all"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Camera size={28} />
            </div>
            <ArrowRight className="text-on-surface-variant/30 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="text-xl font-black text-on-surface mb-2">我有猫咪</h2>
          <p className="text-sm text-on-surface-variant mb-6">上传照片，由 AI 为你的真实猫咪生成专属数字形象。</p>
          
          <div className="w-full h-24 border-2 border-dashed border-outline rounded-3xl flex flex-col items-center justify-center gap-2 bg-background/50">
            <Upload size={20} className="text-on-surface-variant/40" />
            <span className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wider">点击上传照片或视频</span>
          </div>
        </button>

        <button 
          onClick={() => navigate("/create-companion", { state: { isRedemption, isDebugRedemption } })}
          className="w-full p-8 bg-surface-container rounded-[40px] text-left relative group active:scale-[0.98] transition-all"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <PawPrint className="text-[#5D4037] fill-[#5D4037] -rotate-12" size={28} />
            </div>
            <ArrowRight className="text-on-surface-variant/30 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="text-xl font-black text-on-surface mb-2">我想养猫</h2>
          <p className="text-sm text-on-surface-variant">选择你心仪的品种，在数字世界领养你的第一只猫咪。</p>
        </button>
      </div>

      <div className="pt-12 pb-4 text-center">
        <button 
          onClick={() => setShowConfigModal(true)}
          className="text-[10px] text-on-surface-variant/40 tracking-widest uppercase flex items-center justify-center gap-2 w-full"
        >
          <Settings size={10} />
          © 2026 MIAO · 纯粹的猫咪生活
        </button>
      </div>
      <VolcConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />
    </div>
  );
}
