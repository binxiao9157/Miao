import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Download, X, AlertCircle, RefreshCw } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { motion } from "motion/react";
import PageHeader from "../components/PageHeader";
import { useState, useEffect, useMemo } from "react";
import { storage } from "../services/storage";

export default function AddFriendQR() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [qrError, setQrError] = useState(false);

  // 1. 统一数据初始化逻辑：处理从不同入口进入的情况
  const cat = useMemo(() => {
    // 优先使用路由 state 传入的猫咪（日记页入口）
    if (location.state?.cat) return location.state.cat;
    // 兜底：获取当前活跃猫咪或列表第一只（扫一扫入口）
    return storage.getActiveCat() || storage.getCatList()[0];
  }, [location.state]);

  // 页面卸载时清理可能影响全局的样式
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!user || !cat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background">
        <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6 text-on-surface-variant/20">
          <AlertCircle size={40} />
        </div>
        <h3 className="text-xl font-black text-on-surface mb-2">缺少必要信息</h3>
        <p className="text-sm text-on-surface-variant mb-8">请先去生成或选择一只猫咪哦</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          返回
        </button>
      </div>
    );
  }

  // 2. 统一 Payload 结构：严禁包含 Base64 图片字符串，确保扫码端解析一致
  const qrData = useMemo(() => JSON.stringify({
    type: 'miao_friend_invite',
    uid: user.username,
    nickname: user.nickname,
    catName: cat.name,
    timestamp: Date.now()
  }), [user.username, user.nickname, cat.name]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader 
        title="面对面添加" 
        subtitle="Face-to-Face" 
        action={
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform border border-outline-variant/30"
          >
            <X size={24} />
          </button>
        }
      />

      <div className="flex-grow flex flex-col items-center justify-center px-6 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[48px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] flex flex-col items-center w-full max-w-sm border border-outline-variant/30 relative overflow-hidden"
        >
          {/* 背景装饰 */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary opacity-20"></div>

          <div className="flex items-center gap-4 mb-8 w-full">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-surface-container shadow-sm">
              <img src={user.avatar} alt={user.nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-black text-on-surface">{user.nickname}</h3>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">邀请你成为好友</p>
            </div>
          </div>

          <div className="relative p-6 bg-surface-container rounded-[32px] shadow-inner border border-outline-variant/20 mb-8 w-full aspect-square flex items-center justify-center">
            {qrError ? (
              <div className="flex flex-col items-center gap-3 text-on-surface-variant/40">
                <AlertCircle size={48} />
                <p className="text-xs font-bold">二维码生成失败</p>
                <button onClick={() => setQrError(false)} className="mt-2 text-primary text-xs flex items-center gap-1">
                  <RefreshCw size={12} /> 重试
                </button>
              </div>
            ) : (
              <div className="bg-white p-2 rounded-2xl">
                <QRCodeSVG 
                  value={qrData} 
                  size={220}
                  level="M" // 降低容错率以减小二维码复杂度，提升识别率
                  includeMargin={false}
                  onError={() => setQrError(true)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 py-3 px-6 bg-primary/5 rounded-2xl mb-8 border border-primary/10">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <p className="text-sm font-black text-primary">代表猫咪：{cat.name}</p>
          </div>

          <p className="text-xs text-on-surface-variant font-medium opacity-60 text-center leading-relaxed">
            让好友打开 Miao 扫描上方二维码<br/>即可建立跨时空的温暖连接
          </p>
        </motion.div>

        <div className="mt-12 flex gap-6">
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-on-surface-variant shadow-sm active:scale-90 transition-all border border-outline-variant/30 group-hover:bg-primary/5 group-hover:text-primary">
              <Download size={28} />
            </div>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">保存图片</span>
          </button>
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-on-surface-variant shadow-sm active:scale-90 transition-all border border-outline-variant/30 group-hover:bg-secondary/5 group-hover:text-secondary">
              <Share2 size={28} />
            </div>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">分享链接</span>
          </button>
        </div>
      </div>
    </div>
  );
}
