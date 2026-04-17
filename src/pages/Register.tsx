import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { ArrowLeft, Phone, ShieldCheck, User, Lock, Eye, EyeOff } from "lucide-react";
import PawIcon from "../components/PawIcon";
import { storage } from "../services/storage";
import { motion } from "motion/react";

export default function Register() {
  const navigate = useNavigate();
  const { register, sendCode } = useAuthContext();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (result.mockCode) {
        setCode(result.mockCode);
      }
    } else {
      setError(result.error || "获取验证码失败");
    }
  };

  const handleRegister = async () => {
    if (!isAgreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setError("请先阅读并勾选同意服务条款与隐私政策");
      return;
    }
    if (!phone || !code || !nickname) {
      setError("请填写手机号、验证码和昵称");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("手机号格式不正确");
      return;
    }
    if (code.length < 4) {
      setError("请输入完整的验证码");
      return;
    }

    setIsLoading(true);
    setError("");
    
    const result = await register(phone, code, nickname, password || undefined);
    
    setIsLoading(false);

    if (result.success) {
      const hasCat = storage.getCatList().length > 0;
      if (hasCat) {
        navigate("/", { replace: true });
      } else {
        navigate("/empty-cat", { replace: true });
      }
    } else {
      setError(result.error || "注册失败");
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col px-8 pb-8 bg-background relative overflow-y-auto no-scrollbar"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
    >
      {/* Decorative elements */}
      <div className="fixed -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="relative z-10 mb-12">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform mb-8"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex items-center gap-2 mb-8 group">
          <PawIcon className="text-[#5D4037] -rotate-12 transition-transform group-hover:-rotate-6" size={32} fill="#5D4037" />
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#5D4037] to-primary bg-clip-text text-transparent tracking-tight">加入 Miao</h1>
        </div>
        <p className="text-on-surface-variant text-sm opacity-60 leading-relaxed">开启您与宠物的精致陪伴之旅，记录每一个温暖瞬间。</p>
      </header>

      <div className="space-y-6 relative z-10 flex-grow">
        <div className="space-y-5">
          {/* Phone Input */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">手机号码</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type="tel" 
                inputMode="numeric"
                placeholder="请输入11位手机号" 
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="miao-input pl-12" 
              />
            </div>
          </div>

          {/* Verification Code */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">验证码</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
                <input 
                  type="tel" 
                  inputMode="numeric"
                  placeholder="请输入验证码" 
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="miao-input pl-12" 
                />
              </div>
              <button 
                type="button"
                onClick={handleGetCode}
                disabled={countdown > 0}
                className="px-4 rounded-2xl bg-primary/10 text-primary font-black text-xs transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </button>
            </div>
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">昵称</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type="text" 
                placeholder="起一个好听的名字吧" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="miao-input pl-12" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">设置密码 (可选)</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="设置密码以便下次登录" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="miao-input pl-12 pr-12" 
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

        <button 
          onClick={handleRegister}
          disabled={isLoading}
          className="miao-btn-primary w-full py-5 text-lg font-black shadow-2xl mt-4 disabled:opacity-70"
        >
          {isLoading ? "正在注册..." : "立即注册"}
        </button>
        
        <div className="text-center mt-6 pb-8">
          <p className="text-xs text-on-surface-variant opacity-60">
            已有账号？ <button onClick={() => navigate("/login")} className="text-primary font-black ml-1">登入</button>
          </p>
        </div>
      </div>
    </div>
  );
}
