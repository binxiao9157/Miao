import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { PawPrint } from "lucide-react";
import { storage } from "../services/storage";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <div className="min-h-screen flex flex-col items-center justify-between p-8 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>

      <div className="w-full flex flex-col items-center pt-8 relative z-10">
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
        <div className="relative w-80 h-80 mb-14 flex items-center justify-center">
          {/* Outer soft glow/border - thick and soft as in design */}
          <div className="absolute inset-0 bg-[#FEF6F0] rounded-[72px] shadow-[0_20px_50px_rgba(232,159,113,0.1)]"></div>
          <div className="absolute inset-0 bg-[#FEF6F0] rounded-[72px] border-[16px] border-[#FEF6F0]"></div>
          
          {/* Inner Image Container */}
          <div className="relative w-[88%] h-[88%] bg-white rounded-[56px] shadow-xl overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1000&auto=format&fit=crop" 
              alt="Orange Tabby Cat" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

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
            <input 
              type="password" 
              placeholder="密码" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="miao-input" 
            />
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
          © 2024 MIAO SANCTUARY
        </p>
      </div>
    </div>
  );
}
