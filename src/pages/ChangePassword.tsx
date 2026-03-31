import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSave = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("请填写完整信息");
      return;
    }
    if (currentPassword !== user?.password) {
      setError("当前密码错误");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密码长度不能少于6位");
      return;
    }

    updateProfile({ password: newPassword });
    alert("密码修改成功，请牢记您的新密码");
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">修改登录密码</h1>
      </header>

      <div className="mb-10">
        <h2 className="text-2xl font-extrabold text-primary mb-2">安全验证</h2>
        <p className="text-on-surface-variant text-sm opacity-70">为了您的账号安全，请在修改密码前进行身份验证。</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">当前密码</label>
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前使用的密码" 
                className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none" 
              />
              <button 
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">新密码</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="设置 6-20 位新密码" 
              className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">确认新密码</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码" 
              className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

        <button 
          onClick={handleSave}
          className="w-full py-5 bg-primary-container text-white rounded-full font-bold text-lg shadow-lg active:scale-95 transition-transform mt-4"
        >
          保存修改
        </button>
      </div>
      
      <p className="mt-8 text-center text-xs text-on-surface-variant">
        忘记密码？请联系客服进行人工找回。
      </p>
    </div>
  );
}
