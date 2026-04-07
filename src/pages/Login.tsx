import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { PawPrint, Eye, EyeOff } from "lucide-react";
import { storage } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [catImage, setCatImage] = useState<string | null>(null);

  // Default cat image fallback
  const DEFAULT_CAT_IMAGE = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1000&auto=format&fit=crop";

  useEffect(() => {
    // 1. 实现数据读取逻辑 (Data Fetching)
    // 在登录页面初始化时，检查本地持久化存储
    const lastImage = storage.getLastCatImage();
    console.log("[DEBUG] Login Page - Last Cat Image:", lastImage ? "Found" : "Not Found");
    if (lastImage) {
      setCatImage(lastImage);
    }
    
    // 记住上次登录的用户名
    const lastUsername = storage.getLastUsername();
    if (lastUsername) {
      setUsername(lastUsername);
    }
  }, []);

  const handleLogin = () => {
    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }
    const success = login(username, password);
    if (success) {
      const hasCat = storage.getCatList().length > 0;
      if (hasCat) {
        navigate("/", { replace: true });
      } else {
        navigate("/empty-cat", { replace: true });
      }
    } else {
      setError("用户名或密码错误");
    }
  };

  return (
    <div 
      className="min-h-screen overflow-y-auto flex flex-col items-center px-8 pb-8 bg-background relative"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
    >
      {/* Decorative elements */}
      <div className="fixed -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full flex flex-col items-center pt-8 pb-12 relative z-10">
        {/* Logo Section */}
        <div className="flex items-center gap-3 mb-10 group">
          <PawPrint className="text-[#5D4037] fill-[#5D4037] -rotate-12 transition-transform group-hover:-rotate-6" size={36} />
          <span className="text-4xl font-black bg-gradient-to-r from-[#5D4037] to-primary bg-clip-text text-transparent tracking-tighter">Miao</span>
        </div>
        
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-on-surface mb-3 tracking-tight">欢迎来到 Miao</h1>
          <p className="text-on-surface-variant/80 text-lg font-medium">以喵星之名，守护你的每一份温暖</p>
        </div>

        {/* Cat Image Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-80 h-80 mb-14 flex items-center justify-center"
        >
          {/* Outer soft glow/border - thick and soft as in design */}
          <div className="absolute inset-0 bg-[#FEF6F0] rounded-[72px] shadow-[0_20px_50px_rgba(232,159,113,0.1)]"></div>
          <div className="absolute inset-0 bg-[#FEF6F0] rounded-[72px] border-[16px] border-[#FEF6F0]"></div>
          
          {/* Inner Image Container */}
          <div className="relative w-[88%] h-[88%] bg-white rounded-[56px] shadow-xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img 
                key={catImage || 'default'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                src={catImage || DEFAULT_CAT_IMAGE} 
                alt="Cat Companion" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Form Section */}
        <div className="w-full max-w-sm space-y-5">
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="用户名" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="miao-input" 
            />
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="密码" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="miao-input pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30 hover:opacity-60 transition-opacity"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <div className="pt-6 space-y-5">
            <button onClick={handleLogin} className="miao-btn-primary">
              登录
            </button>
            <button onClick={() => navigate("/register")} className="miao-btn-secondary">
              注册
            </button>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="pb-8 text-center space-y-4 relative z-10">
        <div className="flex items-center justify-center gap-4 text-sm font-medium text-on-surface-variant/60">
          <span>隐私政策</span>
          <span className="w-1.5 h-1.5 bg-on-surface-variant/20 rounded-full"></span>
          <span>服务条款</span>
        </div>
        <p className="text-[11px] text-on-surface-variant/40 font-bold tracking-[0.2em] uppercase">
          © 2026 MIAO SANCTUARY
        </p>
      </div>
    </div>
  );
}
