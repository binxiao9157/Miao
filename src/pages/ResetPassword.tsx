import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Phone, ShieldCheck, Lock } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { storage } from "../services/storage";
import { motion } from "motion/react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { sendCode } = useAuthContext();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
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

  const handleReset = async () => {
    if (!phone || !code || !newPassword) {
      setError("请填写完整信息");
      return;
    }
    if (newPassword.length < 6) {
      setError("密码长度至少为6位");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        alert("密码已更新，请重新登录");
        navigate("/login", { replace: true });
      } else {
        setError(data.error || "重置失败");
      }
    } catch (e) {
      setError("网络连接失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = phone.length === 11 && code.length >= 4 && newPassword.length >= 6;

  return (
    <div className="min-h-screen flex flex-col items-center px-8 bg-background pt-12 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="fixed -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <header className="w-full flex items-center mb-12 relative z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-on-surface flex-1 text-center pr-10">重置密码</h1>
      </header>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
            <input 
              type="tel" 
              inputMode="numeric"
              placeholder="手机号" 
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="miao-input py-4 pl-12"
            />
          </div>
          
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
              className="px-4 bg-primary/10 text-primary rounded-2xl font-black text-xs transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {countdown > 0 ? `${countdown}s` : "获取验证码"}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="新密码" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="miao-input py-4 pl-12 pr-12"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold text-center animate-shake">
            {error}
          </div>
        )}

        <button 
          onClick={handleReset}
          disabled={!isFormValid || isLoading}
          className="miao-btn-primary py-4 w-full shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isLoading ? "提交中..." : "保存新密码"}
        </button>
        
        <p className="text-center text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest pt-4">
          验证码将发送至您绑定的手机号
        </p>
      </div>
    </div>
  );
}
