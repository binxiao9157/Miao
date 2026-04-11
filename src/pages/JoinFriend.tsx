import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { storage, FriendInfo } from "../services/storage";
import { useState, useMemo } from "react";
import { UserPlus, LogIn, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export default function JoinFriend() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const [added, setAdded] = useState(false);

  const uid = searchParams.get("uid") || "";
  const catId = searchParams.get("cat") || "";

  // 尝试从本地查找邀请者信息
  const inviter = useMemo(() => {
    if (!uid) return null;
    const found = storage.findUser(uid);
    return {
      nickname: found?.nickname || `喵友_${uid.slice(-4)}`,
      avatar: found?.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23FEF6F0' width='100' height='100'/%3E%3Ctext x='50' y='62' text-anchor='middle' font-size='40'%3E😺%3C/text%3E%3C/svg%3E`,
    };
  }, [uid]);

  if (!uid) {
    return (
      <div className="min-h-screen bg-[#FFF5F0] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-on-surface-variant/30 mb-4" />
        <h2 className="text-xl font-black text-on-surface mb-2">链接无效</h2>
        <p className="text-sm text-on-surface-variant mb-8">该邀请链接缺少必要参数</p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="px-8 py-3 bg-primary text-white rounded-2xl font-black active:scale-95 transition-all"
        >
          前往登录
        </button>
      </div>
    );
  }

  const handleAddFriend = () => {
    const friend: FriendInfo = {
      id: uid,
      nickname: inviter?.nickname || uid,
      avatar: inviter?.avatar || "",
      catName: catId ? `猫咪` : "小橘",
      catAvatar: "",
      addedAt: Date.now(),
    };
    storage.addFriend(friend);
    setAdded(true);
    setTimeout(() => navigate("/", { replace: true }), 1500);
  };

  const handleLoginFirst = () => {
    // 携带 returnUrl，登录后回跳
    const returnUrl = `/join?uid=${uid}&cat=${catId}`;
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  return (
    <div className="min-h-screen bg-[#FFF5F0] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-[0_15px_45px_rgba(0,0,0,0.06)] text-center"
      >
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/10 mx-auto mb-4">
          <img
            src={inviter?.avatar}
            alt={inviter?.nickname}
            className="w-full h-full object-cover"
          />
        </div>

        <h2 className="text-xl font-black text-on-surface mb-1">
          {inviter?.nickname}
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">邀请你成为 Miao 好友</p>

        <div className="bg-primary/5 rounded-2xl p-4 mb-8 border border-primary/10">
          <p className="text-xs text-primary font-bold">
            一起记录萌宠瞬间，建立跨时空的温暖连接
          </p>
        </div>

        {added ? (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-2 text-green-500"
          >
            <CheckCircle size={40} />
            <p className="font-black">添加成功！</p>
          </motion.div>
        ) : isAuthenticated ? (
          <button
            onClick={handleAddFriend}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            添加好友
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleLoginFirst}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              登录后添加好友
            </button>
            <button
              onClick={() => navigate(`/register?returnUrl=${encodeURIComponent(`/join?uid=${uid}&cat=${catId}`)}`)}
              className="w-full py-3 bg-white text-primary rounded-2xl font-bold border border-primary/20 active:scale-95 transition-all"
            >
              注册新账号
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
