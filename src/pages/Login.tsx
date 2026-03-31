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
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-white">🐾</span>
        </div>
        <h1 className="text-3xl font-bold text-primary">欢迎来到 Miao</h1>
        <p className="text-on-surface-variant text-sm mt-2">以喵星之名，守护你的每一份温暖</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <input 
            type="text" 
            placeholder="用户名" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none" 
          />
          <input 
            type="password" 
            placeholder="密码" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none" 
          />
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <div className="pt-4 space-y-3">
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-primary-container text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
          >
            登录
          </button>
          <button 
            onClick={() => navigate("/register")}
            className="w-full py-4 bg-transparent border border-outline-variant text-primary rounded-full font-bold hover:bg-surface-container-low transition-colors"
          >
            注册
          </button>
        </div>
      </div>
    </div>
  );
}
