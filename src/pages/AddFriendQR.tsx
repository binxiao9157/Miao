import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Share2, Download, X, AlertCircle, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";
import { useState, useEffect, useMemo, useRef } from "react";
import { storage } from "../services/storage";
import html2canvas from "html2canvas";

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

  // 页面空闲时预渲染 QR 卡片图，加速后续保存操作
  useEffect(() => {
    const prerender = async () => {
      if (!qrCardRef.current) return;
      try {
        const canvas = await html2canvas(qrCardRef.current, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#FFFFFF',
          scale: 2,
          logging: false,
        });
        cachedImageRef.current = canvas.toDataURL("image/png");
      } catch (e) {
        // 预渲染失败不影响功能，保存时会重新渲染
      }
    };
    // 延迟到页面渲染完成后再执行
    const timer = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(prerender);
      } else {
        prerender();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cat, user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const cachedImageRef = useRef<string | null>(null);

  // 将图片 URL 转换为 DataURL 以规避 html2canvas 的跨域限制
  const toDataURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  };

  // 保存图片功能 — 三级降级：Web Share → <a download> → 长按保存
  const handleSaveImage = async () => {
    if (!qrCardRef.current || isSaving) return;

    try {
      setIsSaving(true);

      // 优先使用预渲染缓存，无缓存时实时渲染
      let dataUrl = cachedImageRef.current;
      if (!dataUrl) {
        const images = qrCardRef.current.querySelectorAll('img');
        const originalSrcs: string[] = [];
        try {
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            originalSrcs.push(img.src);
            const converted = await toDataURL(img.src);
            img.src = converted;
          }
        } catch (e) {
          console.warn("图片转换 DataURL 失败，尝试直接截图:", e);
        }

        const canvas = await html2canvas(qrCardRef.current, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#FFFFFF',
          scale: 3,
          logging: false,
        });

        images.forEach((img, i) => {
          if (originalSrcs[i]) img.src = originalSrcs[i];
        });
        dataUrl = canvas.toDataURL("image/png");
        cachedImageRef.current = dataUrl;
      }

      const fileName = `Miao_Card_${user?.nickname || 'friend'}.png`;

      // Stage 1: Web Share API (移动端原生分享)
      if (navigator.canShare && navigator.share) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '保存名片' });
            showToast("请选择保存图片或发送给好友");
            return;
          }
        } catch (e) {
          console.warn("Web Share 文件分享失败:", e);
        }
      }

      // Stage 2: <a download> 触发浏览器下载
      try {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("图片已保存到下载目录");
        return;
      } catch (e) {
        console.warn("<a download> 下载失败:", e);
      }

      // Stage 3: 长按保存预览图 (最终兜底)
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
