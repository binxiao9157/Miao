import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { storage } from "../services/storage";
import { motion } from "motion/react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleGetCode = () => {
    if (phone.length !== 11) {
      setError("请输入11位手机号");
      return;
    }
    const user = storage.findUser(phone);
    if (!user) {
      setError("该手机号尚未注册");
      return;
    }
    
    // Mock SMS
    const mockCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("[DEBUG] Verification Code:", mockCode);
    setGeneratedCode(mockCode);
    alert(`验证码已发送至您的手机: ${mockCode}`);
    
    setCountdown(60);
    setError("");
  };

  const handleReset = () => {
    if (!generatedCode) {
      setError("请先获取验证码");
      return;
    }
    if (code !== generatedCode) {
      setError("验证码错误，请重新输入");
      return;
    }
    if (newPassword.length < 6) {
      setError("密码长度至少为6位");
      return;
    }
    
    const success = storage.updatePassword(phone, newPassword);
    if (success) {
      alert("密码重置成功，请重新登录");
      navigate("/login", { replace: true });
    } else {
      setError("重置失败，请稍后重试");
    }
  };

  const isFormValid = phone.length === 11 && code.length === 4 && newPassword.length >= 6;

  return (
    <div className="min-h-screen flex flex-col items-center px-8 bg-background pt-12">
      <header className="w-full flex items-center mb-12">
        <button onClick={() => navigate(-1)} className="p-2 bg-surface-container rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-on-surface flex-1 text-center pr-10">重置密码</h1>
      </header>

      <div className="w-full max-w-sm space-y-4">
        <input 
          type="tel" 
          placeholder="手机号" 
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          className="miao-input py-3"
        />
        
        <div className="flex gap-2">
          <input 
            type="tel" 
            placeholder="验证码" 
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="miao-input py-3 flex-1"
          />
          <button 
            onClick={handleGetCode}
            disabled={countdown > 0}
            className="px-4 py-3 bg-primary text-white rounded-2xl font-bold text-sm disabled:bg-on-surface-variant/20"
          >
            {countdown > 0 ? `已发送 ${countdown}s` : "获取验证码"}
          </button>
        </div>

        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="新密码" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="miao-input py-3 pr-12"
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

        <button 
          onClick={handleReset}
          disabled={!isFormValid}
          className="miao-btn-primary py-3 w-full disabled:opacity-30"
        >
          提交
        </button>
      </div>
    </div>
  );
}
