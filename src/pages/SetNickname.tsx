import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useAuthContext } from "../context/AuthContext";

export default function SetNickname() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthContext();
  const [nickname, setNickname] = useState(user?.nickname || "");

  const handleSave = () => {
    const next = nickname.trim() || "喵星人";
    updateProfile({ nickname: next });
    navigate("/", { replace: true });
  };

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <PageHeader title="设置昵称" subtitle="SET NICKNAME" onBack={() => navigate(-1)} />
      <main className="flex-1 px-6 pb-24 flex flex-col justify-center">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-outline-variant/40">
          <label className="block">
            <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.16em] ml-1">昵称</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="mt-3 w-full h-14 px-4 bg-surface-container rounded-[20px] text-base font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="给自己起个昵称"
            />
          </label>
          <button
            onClick={handleSave}
            className="mt-5 w-full h-14 bg-primary text-white rounded-full font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Save size={18} />
            保存昵称
          </button>
        </div>
      </main>
    </div>
  );
}
