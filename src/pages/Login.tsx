import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
      navigate("/");
    } else {
      setError("用户名或密码错误");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-8 bg-background">
      <div className="w-full flex flex-col items-center pt-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">🐾</span>
          </div>
          <span className="text-2xl font-black text-on-surface">Miao</span>
        </div>
        
        <h1 className="text-3xl font-black text-on-surface mb-2">欢迎来到 Miao</h1>
        <p className="text-on-surface-variant text-sm mb-12">以喵星之名，守护你的每一份温暖</p>

        <div className="relative w-64 h-64 mb-12">
          <div className="absolute inset-0 bg-primary/5 rounded-[48px] transform rotate-3"></div>
          <div className="absolute inset-0 bg-white rounded-[48px] shadow-xl overflow-hidden border-8 border-white">
            <img 
              src="https://picsum.photos/seed/miao-login/400/400" 
              alt="Cat" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4">
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

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <div className="pt-6 space-y-4">
            <button onClick={handleLogin} className="miao-btn-primary">
              登录
            </button>
            <button onClick={() => navigate("/register")} className="miao-btn-secondary">
              注册
            </button>
          </div>
        </div>
      </div>

      <div className="pb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs text-on-surface-variant">
          <span>隐私政策</span>
          <span className="w-1 h-1 bg-on-surface-variant/30 rounded-full"></span>
          <span>服务条款</span>
        </div>
        <p className="text-[10px] text-on-surface-variant/40 tracking-widest uppercase">
          © 2024 MIAO SANCTUARY
        </p>
      </div>
    </div>
  );
}
