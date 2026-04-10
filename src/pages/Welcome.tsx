import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, ArrowRight, Upload, PawPrint, ArrowLeft, Eye, EyeOff, Save, RotateCcw, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VolcanoConfig } from "../services/volcanoService";
import { useAuthContext } from "../context/AuthContext";
import { storage } from "../services/storage";

export default function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthContext();
  const isRedemption = location.state?.isRedemption || false;
  const isDebugRedemption = location.state?.isDebugRedemption || false;
  const redemptionAmount = location.state?.redemptionAmount || 200;

  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [debugClickCount, setDebugClickCount] = useState(0);
  const debugTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 资源预加载逻辑
  useEffect(() => {
    const preloadImages = () => {
      const catList = storage.getCatList();
      const imagesToPreload = [
        ...catList.map(cat => cat.avatar),
        "https://assets.mixkit.co/videos/preview/mixkit-cute-cat-lying-on-a-bed-34537-large.mp4" // 预加载视频（浏览器会处理缓存）
      ];

      imagesToPreload.forEach(src => {
        if (!src) return;
        if (src.endsWith('.mp4')) {
          const video = document.createElement('video');
          video.src = src;
          video.preload = 'auto';
        } else {
          const img = new Image();
          img.src = src;
        }
      });
    };

    // 在页面空闲时预加载
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadImages);
    } else {
      setTimeout(preloadImages, 1000);
    }
  }, []);

  const handleDebugTrigger = () => {
    if (debugTimerRef.current) {
      clearTimeout(debugTimerRef.current);
    }

    const nextCount = debugClickCount + 1;
    if (nextCount >= 5) {
      setDebugClickCount(0);
      setShowDebugDialog(true);
      showToast("进入调试模式");
    } else {
      setDebugClickCount(nextCount);
      debugTimerRef.current = setTimeout(() => {
        setDebugClickCount(0);
      }, 2000);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div 
      className="min-h-screen flex flex-col px-8 pb-8 bg-background relative"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
    >
      <button 
        onClick={isRedemption ? () => navigate(-1) : () => { logout(); navigate('/login', { replace: true }); }} 
        className="absolute left-6 w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-[#5D4037] active:scale-90 transition-transform z-10 shadow-sm"
        style={{ top: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
      >
        <ArrowLeft size={20} />
      </button>

      <div className={`flex items-center gap-2 mb-12 group mt-12`}>
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
          onClick={() => navigate("/upload-material", { state: { isRedemption, isDebugRedemption, redemptionAmount } })}
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
          onClick={() => navigate("/create-companion", { state: { isRedemption, isDebugRedemption, redemptionAmount } })}
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
          onClick={handleDebugTrigger}
          className="text-[10px] text-on-surface-variant/40 tracking-widest uppercase flex items-center justify-center gap-2 w-full active:opacity-60 transition-opacity"
        >
          © 2026 MIAO · 纯粹的猫咪生活
        </button>
      </div>

      {/* API 调试弹窗 */}
      <AnimatePresence>
        {showDebugDialog && (
          <DebugDialog 
            onClose={() => setShowDebugDialog(false)} 
            onSave={() => showToast("配置已保存")}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[120] bg-gray-800 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * API 调试弹窗组件
 */
function DebugDialog({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [config, setConfig] = useState({
    VOLC_API_KEY: localStorage.getItem('VOLC_API_KEY') || VolcanoConfig.ApiKey || '',
    VOLC_ACCESS_KEY: localStorage.getItem('VOLC_ACCESS_KEY') || '',
    VOLC_SECRET_KEY: localStorage.getItem('VOLC_SECRET_KEY') || '',
    VOLC_MODEL_ID: localStorage.getItem('VOLC_MODEL_ID') || VolcanoConfig.ModelId || '',
    VOLC_T2I_MODEL_ID: localStorage.getItem('VOLC_T2I_MODEL_ID') || VolcanoConfig.T2IModelId || '',
  });

  const [visible, setVisible] = useState({
    VOLC_API_KEY: false,
    VOLC_ACCESS_KEY: false,
    VOLC_SECRET_KEY: false,
    VOLC_MODEL_ID: false,
    VOLC_T2I_MODEL_ID: false,
  });

  const handleSave = () => {
    Object.entries(config).forEach(([key, value]) => {
      const val = value as string;
      if (val) {
        localStorage.setItem(key, val);
      } else {
        localStorage.removeItem(key);
      }
    });
    onSave();
    onClose();
  };

  const handleReset = () => {
    if (window.confirm("确定要恢复默认配置吗？")) {
      Object.keys(config).forEach(key => localStorage.removeItem(key));
      setConfig({
        VOLC_API_KEY: VolcanoConfig.ApiKey || '',
        VOLC_ACCESS_KEY: '',
        VOLC_SECRET_KEY: '',
        VOLC_MODEL_ID: VolcanoConfig.ModelId || '',
        VOLC_T2I_MODEL_ID: VolcanoConfig.T2IModelId || '',
      });
    }
  };

  const toggleVisibility = (key: keyof typeof visible) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fields = [
    { key: 'VOLC_API_KEY', label: 'API Key' },
    { key: 'VOLC_ACCESS_KEY', label: 'Access Key' },
    { key: 'VOLC_SECRET_KEY', label: 'Secret Key' },
    { key: 'VOLC_MODEL_ID', label: 'Video Model ID' },
    { key: 'VOLC_T2I_MODEL_ID', label: 'T2I Model ID' },
  ] as const;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900">API 核心参数调试</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Volcano Engine Ark Platform</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {field.label}
              </label>
              <div className="relative group">
                <input 
                  type={visible[field.key] ? "text" : "password"}
                  value={config[field.key]}
                  onChange={(e) => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-medium transition-all outline-none pr-12"
                  placeholder={`输入 ${field.label}...`}
                />
                <button 
                  onClick={() => toggleVisibility(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-orange-400 transition-colors"
                >
                  {visible[field.key] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}

          <div className="bg-blue-50 rounded-2xl p-4 flex gap-3">
            <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
              修改后的参数将保存在本地存储中，并立即覆盖环境变量。如果 API 调用出现异常，请尝试“恢复默认”。
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 border-t border-gray-100 grid grid-cols-2 gap-4">
          <button 
            onClick={handleReset}
            className="flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold text-sm active:scale-95 transition-all"
          >
            <RotateCcw size={16} />
            恢复默认
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center justify-center gap-2 py-3.5 bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 active:scale-95 transition-all"
          >
            <Save size={16} />
            保存并生效
          </button>
        </div>
      </motion.div>
    </div>
  );
}
