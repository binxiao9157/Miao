import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { storage } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSave = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("请填写完整信息");
      return;
    }
    // 通过 storage.findUser 从持久层校验密码，避免仅依赖内存中可能过期的 user 对象
    const savedUser = user?.username ? storage.findUser(user.username) : null;
    if (!savedUser || currentPassword !== savedUser.password) {
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
    triggerToast("密码修改成功喵～");
    setTimeout(() => navigate(-1), 1500);
  };

  return (
    <div 
      className="h-dvh bg-background px-6 pb-6 relative overflow-y-auto"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center mb-8 relative z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-on-surface ml-4">修改登录密码</h1>
      </header>

      <div className="mb-10 relative z-10">
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black text-on-surface mb-2 tracking-tight">安全验证</h2>
        <p className="text-on-surface-variant text-sm opacity-60 leading-relaxed">为了您的账号安全，请在修改密码前进行身份验证。</p>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">当前密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="请输入当前使用的密码" 
                className="miao-input pl-12 pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 hover:text-primary transition-colors"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">新密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="设置 6-20 位新密码" 
                className="miao-input pl-12 pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 hover:text-primary transition-colors"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1 opacity-40">确认新密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-30" size={18} />
              <input 
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="请再次输入新密码" 
                className="miao-input pl-12 pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 hover:text-primary transition-colors"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold text-center">
            {error}
          </div>
        )}

        <button 
          onClick={handleSave}
          className="miao-btn-primary w-full py-5 text-lg font-black shadow-2xl mt-4"
        >
          保存修改
        </button>
      </div>
      
      <p className="mt-12 text-center text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">
        忘记密码？请联系客服进行人工找回
      </p>
    </div>
  );
}
