import { useState, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, Image as ImageIcon, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "motion/react";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!nickname.trim()) return;
    
    setIsSaving(true);
    // 模拟保存延迟，增强交互感
    setTimeout(() => {
      updateProfile({ nickname, avatar });
      setIsSaving(false);
      setShowSuccessToast(true);
      
      // 1.5秒后返回上一页
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    }, 800);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // 使用 Canvas 进行压缩，防止 Base64 过大导致 localStorage 溢出
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 导出压缩后的 Base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setAvatar(compressedBase64);
          setShowActionSheet(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleMockCamera = () => {
    const newSeed = Math.floor(Math.random() * 1000);
    const mockUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`;
    setAvatar(mockUrl);
    setShowActionSheet(false);
  };

  return (
    <div 
      className="min-h-screen bg-background px-6 pb-6 relative overflow-hidden"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />

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
        <motion.div 
          className="relative group cursor-pointer z-10"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowActionSheet(true)}
        >
          <div className="w-32 h-32 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white bg-white">
            <img 
              src={avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=miao_default"} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* 相机图标层级提升，确保点击有效 */}
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-background group-active:scale-90 transition-transform z-20">
            <Camera size={22} />
          </div>
        </motion.div>
        <p className="mt-6 text-xs text-on-surface-variant font-bold opacity-40 tracking-widest uppercase">点击更换头像</p>
      </div>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[300] bg-green-500 text-white px-8 py-3 rounded-full shadow-2xl font-bold text-sm"
          >
            修改成功！
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">昵称</label>
          <div className="relative">
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入您的新昵称"
              className="w-full p-5 bg-white rounded-[24px] border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold text-on-surface" 
            />
            {nickname === user?.nickname && nickname !== "" && (
              <Check size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-green-500" />
            )}
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => navigate("/change-password")}
            className="w-full p-5 bg-white rounded-[24px] flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform group"
          >
            <span className="font-bold text-on-surface">修改登录密码</span>
            <span className="text-primary opacity-40 group-active:opacity-100 transition-opacity">→</span>
          </button>
        </div>
      </div>
      
      <div className="mt-12 p-6 bg-primary/5 rounded-[32px] border border-primary/10">
        <p className="text-xs text-primary/60 font-medium leading-relaxed">
          提示：好的昵称能让您的猫咪伙伴更容易记住您哦。头像建议选择清晰的个人照片或可爱的宠物合照。
        </p>
      </div>

      {/* Action Sheet */}
      <AnimatePresence>
        {showActionSheet && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActionSheet(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[40px] p-8 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-on-surface">更换头像</h3>
                <button onClick={() => setShowActionSheet(false)} className="p-2 bg-surface-container-high rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={triggerFilePicker}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-[32px] border border-outline-variant/30 active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                    <ImageIcon size={28} />
                  </div>
                  <span className="font-bold text-sm text-on-surface">从相册选择</span>
                </button>

                <button 
                  onClick={handleMockCamera}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-[32px] border border-outline-variant/30 active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                    <Camera size={28} />
                  </div>
                  <span className="font-bold text-sm text-on-surface">拍照</span>
                </button>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setShowActionSheet(false)}
                  className="w-full p-5 bg-surface-container-high rounded-[24px] font-bold text-on-surface-variant"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
