import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // 模拟保存延迟
    setTimeout(() => {
      updateProfile({ nickname, avatar });
      setIsSaving(false);
      navigate(-1);
    }, 800);
  };

  const handlePickAvatar = () => {
    // 模拟从相册选择：随机生成一个 picsum seed
    const newSeed = Math.floor(Math.random() * 1000);
    setAvatar(`https://picsum.photos/seed/${newSeed}/200/200`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface">编辑个人资料</h1>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="text-primary font-bold disabled:opacity-50"
        >
          {isSaving ? "..." : "保存"}
        </button>
      </header>

      <div className="flex flex-col items-center mb-10">
        <div className="relative">
          <img 
            src={avatar || "https://picsum.photos/seed/miao_user/200/200"} 
            alt="Avatar" 
            className="w-32 h-32 rounded-3xl object-cover shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={handlePickAvatar}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Camera size={20} />
          </button>
        </div>
        <p className="mt-4 text-xs text-on-surface-variant font-medium">点击相机图标更换头像</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">昵称</label>
          <div className="relative">
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入您的新昵称"
              className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none" 
            />
            {nickname === user?.nickname && (
              <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 opacity-50" />
            )}
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => navigate("/change-password")}
            className="w-full p-4 bg-white rounded-2xl flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
          >
            <span className="font-medium text-on-surface">修改登录密码</span>
            <span className="text-on-surface-variant opacity-40">→</span>
          </button>
        </div>
      </div>
      
      <div className="mt-12 p-4 bg-primary/5 rounded-2xl border border-primary/10">
        <p className="text-xs text-primary/70 leading-relaxed">
          提示：好的昵称能让您的猫咪伙伴更容易记住您哦。头像建议选择清晰的个人照片或可爱的宠物合照。
        </p>
      </div>
    </div>
  );
}
