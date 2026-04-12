import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Share2, Download, X, AlertCircle, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";
import { useState, useEffect, useMemo, useRef } from "react";
import { storage } from "../services/storage";

export default function AddFriendQR() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [qrError, setQrError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const qrCardRef = useRef<HTMLDivElement>(null);

  // 1. 统一数据初始化逻辑：处理从不同入口进入的情况
  const cat = useMemo(() => {
    // 优先使用路由 state 传入的猫咪（日记页入口）
    if (location.state?.cat) return location.state.cat;
    // 兜底：获取当前活跃猫咪或列表第一只（扫一扫入口）
    return storage.getActiveCat() || storage.getCatList()[0] || null;
  }, [location.state]);

  // 页面卸载时清理可能影响全局的样式
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // 加载图片为 HTMLImageElement，跨域失败时返回 null
  const loadImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!src || src.startsWith('image/svg')) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  // 在 canvas 上绘制圆形裁剪的头像
  const drawCircleAvatar = (ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, r: number, fallbackText: string) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img) {
      ctx.drawImage(img, x, y, r * 2, r * 2);
    } else {
      ctx.fillStyle = '#FEF6F0';
      ctx.fillRect(x, y, r * 2, r * 2);
      ctx.fillStyle = '#D99B7A';
      ctx.font = `${r}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallbackText, x + r, y + r);
    }
    ctx.restore();
  };

  // 纯 Canvas 2D 绘制名片图 — 完全不依赖 html2canvas
  const renderCardToCanvas = async (): Promise<string> => {
    const S = 3; // 缩放倍率
    const W = 320 * S, H = 480 * S;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // 顶部渐变装饰条
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#D99B7A');
    grad.addColorStop(1, '#F5C5A3');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, 0, W, 5 * S);
    ctx.globalAlpha = 1;

    // 加载头像
    const [avatarImg, catAvatarImg] = await Promise.all([
      loadImage(user?.avatar || ''),
      loadImage(cat?.avatar || ''),
    ]);

    // 用户头像 (圆形)
    const avatarR = 28 * S;
    drawCircleAvatar(ctx, avatarImg, 24 * S, 24 * S, avatarR, '😺');

    // 用户昵称
    ctx.fillStyle = '#1C1B1F';
    ctx.font = `bold ${18 * S}px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(user?.nickname || '', (24 + 56 + 12) * S, 28 * S);

    // 副标题
    ctx.fillStyle = '#79747E';
    ctx.font = `bold ${10 * S}px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.fillText('邀请你成为好友', (24 + 56 + 12) * S, (28 + 24) * S);

    // QR 码 — 直接从页面中 QRCodeCanvas 渲染的 <canvas> 拷贝
    const qrCanvas = qrCardRef.current?.querySelector('canvas');
    const qrSize = 200 * S;
    const qrX = (W - qrSize) / 2;
    const qrY = 100 * S;

    // QR 背景区域
    ctx.fillStyle = '#F5F0EB';
    const bgPad = 20 * S;
    ctx.beginPath();
    const bgX = qrX - bgPad, bgY = qrY - bgPad, bgW = qrSize + bgPad * 2, bgH = qrSize + bgPad * 2, bgR = 28 * S;
    ctx.moveTo(bgX + bgR, bgY);
    ctx.arcTo(bgX + bgW, bgY, bgX + bgW, bgY + bgH, bgR);
    ctx.arcTo(bgX + bgW, bgY + bgH, bgX, bgY + bgH, bgR);
    ctx.arcTo(bgX, bgY + bgH, bgX, bgY, bgR);
    ctx.arcTo(bgX, bgY, bgX + bgW, bgY, bgR);
    ctx.closePath();
    ctx.fill();

    // QR 白底
    ctx.fillStyle = '#FFFFFF';
    const qrPad = 8 * S;
    ctx.fillRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);

    if (qrCanvas) {
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    }

    // 猫咪信息栏
    const catY = qrY + qrSize + bgPad + 20 * S;
    ctx.fillStyle = 'rgba(217, 155, 122, 0.05)';
    const catBarX = 40 * S, catBarW = W - 80 * S, catBarH = 36 * S, catBarR = 12 * S;
    ctx.beginPath();
    ctx.moveTo(catBarX + catBarR, catY);
    ctx.arcTo(catBarX + catBarW, catY, catBarX + catBarW, catY + catBarH, catBarR);
    ctx.arcTo(catBarX + catBarW, catY + catBarH, catBarX, catY + catBarH, catBarR);
    ctx.arcTo(catBarX, catY + catBarH, catBarX, catY, catBarR);
    ctx.arcTo(catBarX, catY, catBarX + catBarW, catY, catBarR);
    ctx.closePath();
    ctx.fill();

    // 猫咪头像
    const catR = 14 * S;
    drawCircleAvatar(ctx, catAvatarImg, (catBarX + 10 * S), catY + (catBarH - catR * 2) / 2, catR, '🐱');

    // 猫咪名字
    ctx.fillStyle = '#D99B7A';
    ctx.font = `bold ${12 * S}px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`代表猫咪：${cat?.name || ''}`, catBarX + 10 * S + catR * 2 + 10 * S, catY + catBarH / 2);

    // 底部提示文字
    ctx.fillStyle = '#79747E';
    ctx.globalAlpha = 0.6;
    ctx.font = `${10 * S}px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    const footY = catY + catBarH + 24 * S;
    ctx.fillText('让好友打开 Miao 扫描上方二维码', W / 2, footY);
    ctx.fillText('即可建立跨时空的温暖连接', W / 2, footY + 16 * S);
    ctx.globalAlpha = 1;

    return canvas.toDataURL('image/png');
  };

  // 保存图片 — 纯 Canvas 绘制，不依赖 html2canvas
  const handleSaveImage = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      const dataUrl = await renderCardToCanvas();
      const fileName = `Miao_Card_${user?.nickname || 'friend'}.png`;

      // Stage 1: Web Share API
      if (navigator.canShare && navigator.share) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '保存名片' });
            showToast("请选择保存图片或发送给好友");
            return;
          }
        } catch (e) {
          console.warn("Web Share 失败:", e);
        }
      }

      // Stage 2: <a download> + Blob URL
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        showToast("图片已保存到下载目录");
        return;
      } catch (e) {
        console.warn("<a download> 失败:", e);
      }

      // Stage 3: 长按保存
      setGeneratedImageUrl(dataUrl);
      showToast("请长按图片保存到相册");

    } catch (error) {
      console.error("保存图片失败:", error);
      showToast("保存失败，请尝试截屏保存", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 分享链接功能
  const handleShareLink = async () => {
    if (!user || !cat) return;

    const inviteUrl = `${window.location.origin}/join?uid=${user.username}&cat=${cat.id}`;
    const shareData = {
      title: 'Miao - 萌宠陪伴',
      text: `我是 ${user.nickname}，快来 Miao 看看我的小猫 ${cat.name} 吧！一起记录萌宠瞬间～`,
      url: inviteUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} 链接: ${inviteUrl}`);
        showToast("链接已复制，快去发给好友吧");
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          showToast("链接已复制");
        } catch (e) {
          showToast("分享失败，请手动复制链接", "error");
        }
      }
    }
  };

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

  const qrData = useMemo(() => JSON.stringify({
    type: 'miao_friend_invite',
    uid: user.username,
    nickname: user.nickname,
    catName: cat?.name,
    timestamp: Date.now()
  }), [user.username, user.nickname, cat?.name]);

  if (!cat) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <p className="text-on-surface-variant text-sm">暂无猫咪数据，请先创建一只猫咪</p>
        <button onClick={() => navigate("/welcome")} className="mt-4 text-primary font-bold text-sm">去创建</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-y-auto">
      <PageHeader 
        title="面对面添加" 
        subtitle="Face-to-Face" 
        action={
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform border border-outline-variant/30"
          >
            <X size={20} />
          </button>
        }
      />

      <div className="flex-grow flex flex-col items-center justify-evenly px-6 py-2">
        {/* 名片卡片区 */}
        <motion.div 
          ref={qrCardRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[40px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] flex flex-col items-center w-full max-w-[320px] border border-outline-variant/20 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary opacity-20"></div>

          <div className="flex items-center gap-3 mb-5 w-full">
            <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-surface-container shadow-sm shrink-0">
              <img 
                src={user.avatar} 
                alt={user.nickname} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>
            <div className="text-left min-w-0">
              <h3 className="text-lg font-black text-on-surface truncate">{user.nickname}</h3>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">邀请你成为好友</p>
            </div>
          </div>

          <div className="relative p-4 bg-surface-container rounded-[28px] shadow-inner border border-outline-variant/10 mb-5 w-full aspect-square flex items-center justify-center">
            {qrError ? (
              <div className="flex flex-col items-center gap-2 text-on-surface-variant/40">
                <AlertCircle size={40} />
                <p className="text-[10px] font-bold">二维码生成失败</p>
                <button onClick={() => setQrError(false)} className="mt-1 text-primary text-[10px] flex items-center gap-1">
                  <RefreshCw size={10} /> 重试
                </button>
              </div>
            ) : (
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <QRCodeCanvas 
                  value={qrData} 
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 py-2 px-5 bg-primary/5 rounded-xl mb-5 border border-primary/10">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
              <img 
                src={cat.avatar} 
                alt={cat.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>
            <p className="text-xs font-black text-primary truncate">代表猫咪：{cat.name}</p>
          </div>

          <p className="text-[10px] text-on-surface-variant font-medium opacity-60 text-center leading-tight">
            让好友打开 Miao 扫描上方二维码<br/>即可建立跨时空的温暖连接
          </p>
        </motion.div>

        {/* 底部按钮区 */}
        <div className="flex gap-8 mb-4">
          <button 
            onClick={handleSaveImage}
            disabled={isSaving}
            className="flex flex-col items-center gap-2 group disabled:opacity-50"
          >
            <div className="w-14 h-14 bg-white rounded-[24px] flex items-center justify-center text-on-surface-variant shadow-sm active:scale-90 transition-all border border-outline-variant/30 group-hover:bg-primary/5 group-hover:text-primary">
              {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
            </div>
            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
              {isSaving ? "保存中..." : "保存图片"}
            </span>
          </button>
          <button 
            onClick={handleShareLink}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-white rounded-[24px] flex items-center justify-center text-on-surface-variant shadow-sm active:scale-90 transition-all border border-outline-variant/30 group-hover:bg-secondary/5 group-hover:text-secondary">
              <Share2 size={24} />
            </div>
            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">分享链接</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
          >
            {toast.type === 'success' ? (
              <CheckCircle size={18} className="text-green-400" />
            ) : (
              <AlertCircle size={18} className="text-red-400" />
            )}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图片预览弹窗 (用于 App 内长按保存) */}
      <AnimatePresence>
        {generatedImageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-lg"
          >
            <button 
              onClick={() => setGeneratedImageUrl(null)}
              className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white"
            >
              <X size={24} />
            </button>
            
            <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl">
              <img 
                src={generatedImageUrl} 
                alt="Generated Card" 
                className="w-full h-auto"
                onContextMenu={(e) => e.stopPropagation()} // 允许原生长按菜单
              />
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-white text-lg font-black mb-2">名片已生成</p>
              <p className="text-white/60 text-sm">请长按上方图片选择“保存到相册”</p>
            </div>

            <button 
              onClick={() => setGeneratedImageUrl(null)}
              className="mt-12 px-8 py-3 bg-white/10 text-white rounded-2xl font-bold border border-white/10"
            >
              返回修改
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
