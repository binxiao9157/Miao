import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { ChevronLeft, Zap, Image as ImageIcon, QrCode, CheckCircle, AlertCircle, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage, FriendInfo } from "../services/storage";

export default function ScanFriend() {
  const navigate = useNavigate();
  const [scannedUID, setScannedUID] = useState<string | null>(null);
  const [pendingFriend, setPendingFriend] = useState<FriendInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopTracks = () => {
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject instanceof MediaStream) {
          video.srcObject.getTracks().forEach(track => {
            track.stop();
          });
          video.srcObject = null;
        }
      });
    } catch (e) {
      console.error("Manual track stop error:", e);
    }
  };

  const startScanner = async (isUnmounted = false) => {
    if (isUnmounted) return;
    
    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {}
      }
      
      stopTracks();

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 30, 
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: window.innerWidth / window.innerHeight,
        videoConstraints: {
          facingMode: { exact: "environment" },
          width: { ideal: 4096 },
          height: { ideal: 2160 },
          focusMode: "continuous"
        }
      };

      await html5QrCode.start(
        { facingMode: { exact: "environment" } },
        config,
        async (decodedText) => {
          if (isUnmounted) return;
          handleScanResult(decodedText);
        },
        () => {}
      );
    } catch (err) {
      try {
        if (scannerRef.current) {
          await scannerRef.current.start(
            { facingMode: "environment" },
            { 
              fps: 30, 
              qrbox: (w: number, h: number) => ({ width: Math.floor(Math.min(w, h) * 0.7), height: Math.floor(Math.min(w, h) * 0.7) }),
              aspectRatio: window.innerWidth / window.innerHeight
            },
            async (decodedText) => {
              handleScanResult(decodedText);
            },
            () => {}
          );
        }
      } catch (secondErr) {
        console.error("Camera start error:", secondErr);
        if (!isUnmounted) {
          setError("无法启动相机，请检查权限设置");
        }
      }
    }
  };

  const handleScanResult = async (decodedText: string) => {
    try {
      // 尝试解析 JSON
      const data = JSON.parse(decodedText);
      if (data.type === 'miao_friend_invite' && data.uid) {
        // 模拟获取用户信息
        const mockFriend: FriendInfo = {
          id: data.uid,
          nickname: data.nickname || `喵友_${data.uid.slice(-4)}`,
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid}`,
          catName: data.catName || "小橘",
          catAvatar: data.catAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.uid}`,
          addedAt: Date.now()
        };
        
        setPendingFriend(mockFriend);
        
        // 扫码成功第一时间释放资源
        if (scannerRef.current?.isScanning) {
          await scannerRef.current.stop();
          scannerRef.current.clear();
          stopTracks();
        }
      } else {
        setScannedUID(decodedText);
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setScannedUID(null);
        }, 3000);
      }
    } catch (e) {
      // 非 JSON 格式，当作普通文本处理
      setScannedUID(decodedText);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setScannedUID(null);
      }, 3000);
    }
  };

  const confirmAddFriend = () => {
    if (pendingFriend) {
      storage.addFriend(pendingFriend);
      setShowToast(true);
      setScannedUID(`已添加 ${pendingFriend.nickname}`);
      setPendingFriend(null);
      setTimeout(() => {
        setShowToast(false);
        setScannedUID(null);
        startScanner();
      }, 2000);
    }
  };

  useEffect(() => {
    let isUnmounted = false;
    const timer = setTimeout(() => startScanner(isUnmounted), 100);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().then(() => stopTracks()).catch(() => stopTracks());
        }
      } else {
        if (scannerRef.current && !scannerRef.current.isScanning && !scannedUID && !pendingFriend) {
          startScanner(isUnmounted);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isUnmounted = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().finally(() => {
            scanner.clear();
            stopTracks();
          });
        } else {
          scanner.clear();
          stopTracks();
        }
      } else {
        stopTracks();
      }
    };
  }, [navigate]);

  const handleBack = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        stopTracks();
      } catch (e) {}
    }
    navigate(-1);
  };

  const toggleFlash = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const track = scannerRef.current.getRunningTrack();
        if (track && 'applyConstraints' in track) {
          const constraints: any = { advanced: [{ torch: !isFlashOn }] };
          await track.applyConstraints(constraints);
          setIsFlashOn(!isFlashOn);
        }
      } catch (e) {
        console.warn("Flashlight not supported");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent overflow-hidden z-[100]">
      {/* 1. 极简底层架构 (Pure Camera Backdrop)：100% 全屏铺满 */}
      <div 
        id="reader" 
        className="absolute inset-0 w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>div]:!hidden [&>span]:!hidden [&>canvas]:!hidden [&>video]:!block"
      ></div>
      
      {/* 2. 支付宝式橙色激光束 (Alipay Style Laser Beam) */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ top: "25%", opacity: 0 }}
          animate={{ 
            top: ["25%", "75%"],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            times: [0, 0.1, 0.9, 1],
            ease: "easeInOut" 
          }}
          className="absolute left-[12.5%] right-[12.5%] h-[60px] pointer-events-none"
        >
          {/* 渐变光晕尾迹 (Glow Tail) - 位于主线上方，模拟激光划过空气的质感 */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#FF9D76]/60 to-transparent" />
          {/* 激光束主线 (2px) - 位于容器底部，居中 3/4 长度 */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF9D76] shadow-[0_0_15px_#FF9D76] rounded-full" />
        </motion.div>

        {/* 配套文字提示 */}
        <div className="absolute w-full text-center bottom-[20%]">
          <p className="text-white/60 text-[13px] font-medium tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            将二维码/条码放入区域内，即可自动扫描
          </p>
        </div>
      </div>

      {/* 3. 玻璃拟态悬浮控件 (Glassmorphism Controls) */}
      <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
        {/* 顶部返回区 */}
        <div 
          className="w-full px-6 flex items-center pointer-events-auto"
          style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(env(safe-area-inset-top) + 4rem)' }}
        >
          <button 
            onClick={handleBack}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-grow" />

        {/* 底部功能组 */}
        <div 
          className="w-full flex justify-center gap-10 items-center pb-16 px-6 pointer-events-auto"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}
        >
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-active:scale-90 transition-all shadow-lg">
              <ImageIcon size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">相册</span>
          </button>

          <button 
            onClick={() => {
              const activeCat = storage.getActiveCat();
              navigate("/add-friend-qr", { state: { cat: activeCat } });
            }}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-active:scale-90 transition-all shadow-lg">
              <QrCode size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">二维码</span>
          </button>

          <button 
            onClick={toggleFlash}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-14 h-14 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all group-active:scale-90 shadow-lg ${isFlashOn ? 'bg-white text-[#FF9D76]' : 'bg-white/10 text-white'}`}>
              <Zap size={24} strokeWidth={1.5} fill={isFlashOn ? "currentColor" : "none"} />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">手电筒</span>
          </button>
        </div>
      </div>

      {/* 好友添加确认弹窗 - 玻璃拟态 */}
      <AnimatePresence>
        {pendingFriend && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white/80 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 overflow-hidden"
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <img 
                    src={pendingFriend.avatar} 
                    alt={pendingFriend.nickname}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-xl"
                  />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FF9D76] rounded-full border-4 border-white flex items-center justify-center text-white">
                    <UserPlus size={18} />
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-on-surface mb-2">添加好友</h3>
                <p className="text-sm text-on-surface/60 mb-8 leading-relaxed">
                  是否添加 <span className="text-[#FF9D76] font-bold">{pendingFriend.nickname}</span> 为好友？<br/>
                  TA 的小猫是 <span className="font-bold">{pendingFriend.catName}</span>
                </p>
                
                <div className="w-full flex gap-4">
                  <button 
                    onClick={() => {
                      setPendingFriend(null);
                      startScanner();
                    }}
                    className="flex-1 py-4 rounded-2xl bg-black/5 text-on-surface font-bold active:scale-95 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    onClick={confirmAddFriend}
                    className="flex-1 py-4 rounded-2xl bg-[#FF9D76] text-white font-bold shadow-lg shadow-[#FF9D76]/30 active:scale-95 transition-all"
                  >
                    确认添加
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 成功提示 - 玻璃拟态 */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] bg-white/20 backdrop-blur-xl px-10 py-8 rounded-[40px] shadow-2xl border border-white/30 flex flex-col items-center gap-4 min-w-[220px]"
          >
            <div className="w-16 h-16 bg-[#FF9D76]/20 rounded-full flex items-center justify-center text-[#FF9D76]">
              <CheckCircle size={40} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-[#FF9D76] uppercase tracking-widest mb-1">操作成功</span>
              <span className="text-sm font-bold text-white truncate max-w-[240px]">{scannedUID}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-6 right-6 z-[110] bg-red-500/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <span className="text-sm font-bold">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
