import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { Eye, EyeOff, Phone, ShieldCheck, Lock } from "lucide-react";
import PawIcon from "../components/PawIcon";
import { storage, UserInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

export default function Login() {
  const navigate = useNavigate();
  const { login, sendCode } = useAuthContext();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'code' | 'password'>('code');
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [catImage, setCatImage] = useState<string | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Default cat image fallback
  const DEFAULT_CAT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23FEF6F0' width='200' height='200'/%3E%3Ctext x='100' y='115' text-anchor='middle' font-size='80'%3E🐱%3C/text%3E%3C/svg%3E";

  useEffect(() => {
    // 1. Data Fetching initialization (不再自动填充，保持初始为空)
    const lastImage = storage.getLastCatImage();
    if (lastImage) setCatImage(lastImage);
  }, []);

  const handleModeSwitch = (mode: 'code' | 'password') => {
    setLoginMode(mode);
    setError("");
    setPhone("");
    setPassword("");
    setCode("");
  };

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const handleGetCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的11位手机号");
      return;
    }
    setError("");
    const result = await sendCode(phone);
    if (result.success) {
      setCountdown(60);
      // 模拟模式下自动填充验证码（后端 SMS_ENABLED=false 时返回 mockCode）
      if (result.mockCode) {
        setCode(result.mockCode);
      }
    } else {
      setError(result.error || "获取验证码失败");
    }
  };

  const handleLogin = async () => {
    if (!isAgreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setError("请先阅读并勾选同意服务条款与隐私政策");
      return;
    }

    if (!phone) {
      setError(loginMode === 'code' ? "请输入手机号" : "请输入用户名/手机号");
      return;
    }

    if (loginMode === 'code' && !code) {
      setError("请输入验证码");
      return;
    }

    if (loginMode === 'password' && !password) {
      setError("请输入密码");
      return;
    }

    setIsLoading(true);
    setError("");

    // 所有登录统一走后端 API，不做前端绕过
    const result = await login(
      phone,
      loginMode === 'code' ? code : undefined,
      loginMode === 'password' ? password : undefined
    );

    setIsLoading(false);

    if (result.success) {
      // 如果发生了数据迁移，用 location.replace 确保状态完全刷新
      if (result.migrated) {
        window.location.replace("/");
      } else {
        const hasCat = storage.getCatList().length > 0;
        navigate(hasCat ? "/" : "/empty-cat", { replace: true });
      }
    } else {
      setError(result.error || "登录失败");
    }
  };

  return (
    <div 
      className="min-h-screen overflow-y-auto flex flex-col items-center px-8 bg-background relative no-scrollbar"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      {/* Decorative elements */}
      <div className="fixed -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full flex-1 flex flex-col items-center justify-center py-4 relative z-10">
        {/* Logo Section */}
        <div className="flex items-center gap-2 mb-4 group cursor-pointer" onClick={() => navigate("/welcome")}>
          <PawIcon className="text-[#5D4037] -rotate-12 transition-transform group-hover:-rotate-6" size={28} fill="#5D4037" />
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
          className="relative w-full max-w-[200px] aspect-square mb-8 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-[#FEF6F0] rounded-[40px] shadow-[0_10px_30px_rgba(232,159,113,0.1)]"></div>
          <div className="relative w-[88%] h-[88%] bg-white rounded-[32px] shadow-lg overflow-hidden border-2 border-white/50">
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

        {/* Mode Switcher */}
        <div className="w-full max-w-sm flex p-1 bg-surface-container rounded-2xl mb-6">
          <button 
            onClick={() => handleModeSwitch('code')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${loginMode === 'code' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
          >
            验证码登录
          </button>
          <button 
            onClick={() => handleModeSwitch('password')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${loginMode === 'password' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
          >
            密码登录
          </button>
        </div>

        {/* Form Section */}
        <div className="w-full max-w-sm space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type={loginMode === 'code' ? "tel" : "text"} 
                inputMode={loginMode === 'code' ? "numeric" : "text"}
                placeholder={loginMode === 'code' ? "手机号" : "用户名 / 手机号"} 
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (loginMode === 'code') {
                    setPhone(val.replace(/\D/g, '').slice(0, 11));
                  } else {
                    setPhone(val);
                  }
                }}
                className="miao-input py-4 pl-12" 
              />
            </div>
            
            {loginMode === 'code' ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    placeholder="验证码" 
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="miao-input py-4 pl-12" 
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleGetCode}
                  disabled={countdown > 0}
                  className="px-4 bg-primary text-white rounded-2xl font-black text-xs transition-all active:scale-95 disabled:bg-on-surface-variant/20 disabled:active:scale-100"
                >
                  {countdown > 0 ? `${countdown}s` : "获取验证码"}
                </button>
              </div>
            ) : (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="密码" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="miao-input py-4 pl-12 pr-12" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30 hover:opacity-60 transition-opacity"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            <div className="text-right">
              <button 
                onClick={() => navigate("/reset-password")}
                className="text-xs font-bold text-primary hover:underline"
              >
                忘记密码？
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold text-center animate-shake">
              {error}
            </div>
          )}

          <motion.div
            animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2 mb-4"
          >
            <input
              type="checkbox"
              id="agree-checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="w-4 h-4 mt-1 accent-primary rounded cursor-pointer"
            />
            <label htmlFor="agree-checkbox" className="text-sm text-gray-500 cursor-pointer">
              我已阅读并同意
              <Link to="/terms" className="text-primary hover:underline mx-1">《Miao 服务条款》</Link>
              和
              <Link to="/privacy-policy" className="text-primary hover:underline ml-1">《隐私政策》</Link>
            </label>
          </motion.div>

          <div className="pt-2 space-y-3 pb-8">
            <button 
              onClick={handleLogin} 
              disabled={isLoading}
              className="miao-btn-primary py-4 text-lg font-black shadow-xl disabled:opacity-70 transition-all active:scale-[0.98]"
            >
              {isLoading ? "进入中..." : "登录"}
            </button>
            <button 
              onClick={() => navigate("/register")} 
              className="miao-btn-secondary py-4 text-lg font-black"
            >
              创建新账号
            </button>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="py-6 text-center space-y-3 relative z-10 w-full bg-background mt-auto">
        <button
          onClick={() => navigate("/download")}
          className="text-xs font-bold text-primary hover:underline active:opacity-60 transition-opacity"
        >
          关注 Miao 官方公众号
        </button>
        <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
          <span>隐私政策</span>
          <span className="w-1 h-1 bg-on-surface-variant/20 rounded-full"></span>
          <span>服务条款</span>
        </div>
        <p className="text-[9px] text-on-surface-variant/30 font-bold tracking-[0.25em] uppercase">
          © 2026 MIAO SANCTUARY · ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
}
