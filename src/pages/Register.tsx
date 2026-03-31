import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = () => {
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
      avatar: "https://picsum.photos/seed/miao_user/200/200"
    });
    
    navigate("/welcome");
  };

  return (
    <div className="min-h-screen flex flex-col p-8 bg-background">
      <button onClick={() => navigate(-1)} className="self-start mb-8 text-primary font-bold flex items-center gap-1">
        <span>←</span> 返回
      </button>
      
      <section className="mb-12">
        <h1 className="text-3xl font-extrabold text-on-surface mb-2 tracking-tight">注册新账号</h1>
        <p className="text-on-surface-variant opacity-70">开启您与宠物的精致陪伴之旅，记录每一个温暖瞬间。</p>
      </section>

      <div className="space-y-6 flex-grow">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">用户名</label>
            <input 
              type="text" 
              placeholder="请输入您的用户名" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-4 rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">密码</label>
            <input 
              type="password" 
              placeholder="请输入您的密码" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">确认密码</label>
            <input 
              type="password" 
              placeholder="请再次输入您的密码" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-4 rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <button 
          onClick={handleRegister}
          className="w-full py-5 bg-primary-container text-white rounded-full font-bold text-lg shadow-lg active:scale-95 transition-transform mt-4"
        >
          立即注册
        </button>
        
        <p className="text-center text-sm text-on-surface-variant mt-4">
          已有账号？ <button onClick={() => navigate("/login")} className="text-primary font-bold">登入</button>
        </p>
      </div>
    </div>
  );
}
