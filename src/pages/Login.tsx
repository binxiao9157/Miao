import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const [isAgreed, setIsAgreed] = useState(false);
  const [shake, setShake] = useState(false);

  // Default cat image fallback
  const DEFAULT_CAT_IMAGE = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1000&auto=format&fit=crop";

  useEffect(() => {
    // 1. 实现数据读取逻辑 (Data Fetching)
    // 在登录页面初始化时，检查本地持久化存储
    const lastImage = storage.getLastCatImage();
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
    if (!isAgreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      alert("请先阅读并勾选同意服务条款与隐私政策");
      return;
    }
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
      className="min-h-screen overflow-y-auto flex flex-col items-center px-8 bg-background relative"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      {/* Decorative elements */}
      <div className="fixed -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full flex-1 flex flex-col items-center justify-center py-4 relative z-10">
        {/* Logo Section */}
        <div className="flex items-center gap-2 mb-4 group">
          <PawPrint className="text-[#5D4037] fill-[#5D4037] -rotate-12 transition-transform group-hover:-rotate-6" size={28} />
          <span className="text-3xl font-black bg-gradient-to-r from-[#5D4037] to-primary bg-clip-text text-transparent tracking-tighter">Miao</span>
        </div>
        
        {/* Title Section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-on-surface mb-1 tracking-tight">欢迎来到 Miao</h1>
          <p className="text-on-surface-variant/80 text-sm font-medium">以喵星之名，守护你的每一份温暖</p>
        </div>

        {/* Cat Image Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full max-w-[240px] aspect-square mb-8 flex items-center justify-center"
        >
          {/* Outer soft glow/border */}
          <div className="absolute inset-0 bg-[#FEF6F0] rounded-[48px] shadow-[0_10px_30px_rgba(232,159,113,0.1)]"></div>
          <div className="absolute inset-0 bg-[#FEF6F0] rounded-[48px] border-[12px] border-[#FEF6F0]"></div>
          
          {/* Inner Image Container */}
          <div className="relative w-[88%] h-[88%] bg-white rounded-[36px] shadow-lg overflow-hidden">
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
        <div className="w-full max-w-sm space-y-3">
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="用户名" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="miao-input py-3" 
            />
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="密码" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="miao-input py-3 pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30 hover:opacity-60 transition-opacity"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="text-right">
              <button 
                onClick={() => navigate("/reset-password")}
                className="text-xs font-medium text-primary hover:underline"
              >
                忘记密码？
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

          <motion.div
            animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2 mb-4"
          >
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="w-4 h-4 mt-1 text-orange-500 rounded focus:ring-orange-500 border-gray-300"
            />
            <span className="text-sm text-gray-500">
              我已阅读并同意
              <Link to="/terms" className="text-orange-500 hover:underline mx-1">《Miao 服务条款》</Link>
              和
              <Link to="/privacy-policy" className="text-orange-500 hover:underline ml-1">《隐私政策》</Link>
            </span>
          </motion.div>

          <div className="pt-4 space-y-3">
            <button onClick={handleLogin} className="miao-btn-primary py-3">
              登录
            </button>
            <button onClick={() => navigate("/register")} className="miao-btn-secondary py-3">
              注册
            </button>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="py-6 text-center space-y-2 relative z-10">
        <div className="flex items-center justify-center gap-4 text-[12px] font-medium text-on-surface-variant/60">
          <span>隐私政策</span>
          <span className="w-1 h-1 bg-on-surface-variant/20 rounded-full"></span>
          <span>服务条款</span>
        </div>
        <p className="text-[10px] text-on-surface-variant/40 font-bold tracking-[0.2em] uppercase">
          © 2026 MIAO SANCTUARY
        </p>
      </div>
    </div>
  );
}
