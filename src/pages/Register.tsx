import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { ArrowLeft, User, Lock, ShieldCheck, PawPrint, Eye, EyeOff } from "lucide-react";
import { storage } from "../services/storage";
import { motion } from "motion/react";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [shake, setShake] = useState(false);

  const handleRegister = () => {
    if (!isAgreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      alert("请先阅读并勾选同意服务条款与隐私政策");
      return;
    }
    if (!username || !password || !confirmPassword) {
      setError("请填写完整信息");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    
    register({
      username,
      password,
      nickname: username, // 默认昵称为用户名
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    });
    
    const hasCat = storage.getCatList().length > 0;
    if (hasCat) {
      navigate("/", { replace: true });
    } else {
      navigate("/empty-cat", { replace: true });
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
          <PawPrint className="text-[#5D4037] fill-[#5D4037] -rotate-12 transition-transform group-hover:-rotate-6" size={32} />
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#5D4037] to-primary bg-clip-text text-transparent tracking-tight">加入 Miao</h1>
        </div>
        <p className="text-on-surface-variant text-sm opacity-60 leading-relaxed">开启您与宠物的精致陪伴之旅，记录每一个温暖瞬间。</p>
      </header>

      <div className="space-y-6 relative z-10 flex-grow">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">用户名</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type="text" 
                placeholder="请输入您的用户名" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="miao-input pl-12" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">设置密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="请输入您的密码" 
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

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">确认密码</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="请再次输入您的密码" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="miao-input pl-12 pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30 hover:opacity-60 transition-opacity"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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

        <button 
          onClick={handleRegister}
          className="miao-btn-primary w-full py-5 text-lg font-black shadow-2xl mt-4"
        >
          立即注册
        </button>
        
        <div className="text-center mt-6">
          <p className="text-xs text-on-surface-variant opacity-60">
            已有账号？ <button onClick={() => navigate("/login")} className="text-primary font-black ml-1">登入</button>
          </p>
        </div>
      </div>

      <footer className="mt-auto pt-8 text-center relative z-10">
        <p className="text-[10px] text-on-surface-variant opacity-40 leading-relaxed">
          注册即代表您同意 <span className="underline font-bold">用户协议</span> 与 <span className="underline font-bold">隐私政策</span>
        </p>
      </footer>
    </div>
  );
}
