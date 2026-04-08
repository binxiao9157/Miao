import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Share2, Download, X } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { motion } from "motion/react";
import PageHeader from "../components/PageHeader";

export default function AddFriendQR() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const cat = location.state?.cat;

  if (!user || !cat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-on-surface-variant mb-4">缺少必要信息</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-primary text-white rounded-full font-bold"
        >
          返回
        </button>
      </div>
    );
  }

  const qrData = JSON.stringify({
    type: 'miao_friend_invite',
    userId: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    catName: cat.name,
    catAvatar: cat.avatar,
    timestamp: Date.now()
  });

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <PageHeader 
        title="面对面添加" 
        subtitle="Face-to-Face" 
        action={
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
          >
            <X size={24} />
          </button>
        }
      />

      <div className="flex-grow flex flex-col items-center justify-center px-6 pb-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center w-full max-w-sm border border-outline-variant/30"
        >
          <div className="flex items-center gap-4 mb-8 w-full">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 p-0.5">
              <img src={user.avatar} alt={user.nickname} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black text-on-surface">{user.nickname}</h3>
              <p className="text-xs text-on-surface-variant font-bold">邀请你成为好友</p>
            </div>
          </div>

          <div className="relative p-4 bg-white rounded-3xl shadow-inner border border-outline-variant/20 mb-8">
            <QRCodeSVG 
              value={qrData} 
              size={200}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: cat.avatar,
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <div className="flex items-center gap-3 py-3 px-6 bg-primary/5 rounded-2xl mb-8">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white">
              <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <p className="text-sm font-bold text-primary">代表猫咪：{cat.name}</p>
          </div>

          <p className="text-xs text-on-surface-variant font-medium opacity-60 text-center leading-relaxed">
            让好友打开 Miao 扫描上方二维码<br/>即可建立跨时空的温暖连接
          </p>
        </motion.div>

        <div className="mt-10 flex gap-4">
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-on-surface-variant shadow-sm active:scale-90 transition-all border border-outline-variant/30">
              <Download size={24} />
            </div>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">保存图片</span>
          </button>
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-on-surface-variant shadow-sm active:scale-90 transition-all border border-outline-variant/30">
              <Share2 size={24} />
            </div>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">分享链接</span>
          </button>
        </div>
      </div>
    </div>
  );
}
