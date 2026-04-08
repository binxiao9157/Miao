import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { motion } from "motion/react";

/**
 * MyQRCodePage - 面对面添加好友的名片展示页
 * 修复了路由死循环与生命周期问题，采用标准的 Scaffold 结构
 */
export default function MyQRCodePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  
  // 从路由状态获取选中的猫咪信息
  const cat = location.state?.cat;

  // 安全检查：如果缺少必要数据，安全返回
  if (!user || !cat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF5F0] p-6 text-center">
        <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-4 text-on-surface-variant/20">
          <Sparkles size={40} />
        </div>
        <p className="text-on-surface-variant font-bold mb-6 text-sm">缺少必要信息，请重新选择猫咪</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-10 py-3 bg-[#FF9D76] text-white rounded-full font-black shadow-lg shadow-[#FF9D76]/20 active:scale-95 transition-all"
        >
          返回
        </button>
      </div>
    );
  }

  // 构造二维码数据，确保与 ScanFriend.tsx 的解析逻辑匹配
  const qrData = JSON.stringify({
    type: 'miao_friend_invite',
    uid: user.username || 'unknown',
    nickname: user.nickname || '喵星人',
    avatar: user.avatar || '',
    catName: cat.name || '小猫',
    catAvatar: cat.avatar || ''
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF5F0]">
      {/* 标准顶部导航栏 (AppBar) */}
      <div 
        className="sticky top-0 z-50 bg-[#FFF5F0] px-4 flex items-center justify-between"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      >
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center text-on-surface active:scale-90 transition-transform"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-black text-on-surface">我的二维码</h1>
        <div className="w-10" /> {/* 占位符保持标题居中 */}
      </div>

      {/* 页面主体内容 */}
      <div className="flex-grow flex flex-col items-center justify-center px-6 pb-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="bg-white w-full max-w-sm rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white overflow-hidden"
        >
          <div className="p-8">
            {/* 名片头部信息 */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-[#FFF5F0] shadow-sm bg-surface-container">
                <img 
                  src={cat.avatar} 
                  alt={cat.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-on-surface leading-tight">{user.nickname}</h3>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-40">
                  UID: {user.username?.toUpperCase() || 'UNKNOWN'}
                </p>
              </div>
            </div>

            {/* 二维码展示区 - 固定大小容器防止布局抖动 */}
            <div className="flex flex-col items-center justify-center bg-[#FDFDFD] rounded-[32px] p-6 border border-black/[0.02] shadow-inner mb-8">
              <div className="w-[250px] h-[250px] flex items-center justify-center bg-white p-2 rounded-2xl shadow-sm">
                <QRCodeSVG 
                  value={qrData || "error_data"} 
                  size={230}
                  level="H"
                  includeMargin={true}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            </div>

            {/* 底部提示文字 */}
            <div className="text-center">
              <p className="text-sm font-bold text-on-surface-variant/60 leading-relaxed">
                扫一扫上面的二维码图案，<br/>加我为 <span className="text-[#FF9D76]">Miao</span> 友
              </p>
            </div>
          </div>
          
          {/* 装饰性底部条 */}
          <div className="h-2 bg-gradient-to-r from-[#FF9D76] to-[#FFAF8E] opacity-20" />
        </motion.div>

        {/* 额外提示 */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-[11px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em]"
        >
          Miao - 跨越时空的温暖连接
        </motion.p>
      </div>
    </div>
  );
}
