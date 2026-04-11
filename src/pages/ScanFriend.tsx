import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { ChevronLeft, Zap, Image as ImageIcon, QrCode, CheckCircle, AlertCircle, UserPlus, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage, FriendInfo } from "../services/storage";
import { QRCodeCanvas } from "qrcode.react";

export default function ScanFriend() {
  const navigate = useNavigate();
  const [scannedUID, setScannedUID] = useState<string | null>(null);
  const [pendingFriend, setPendingFriend] = useState<FriendInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        } catch (e) {
          console.warn("Scanner cleanup warning:", e);
        }
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
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (isUnmounted) return;
          handleScanResult(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Camera start error:", err);
      if (!isUnmounted) {
        const isPermissionDenied = err?.name === 'NotAllowedError' || err?.message?.includes('Permission');
        setError(isPermissionDenied
          ? "摄像头权限被拒绝，请在系统设置 > 隐私 > 摄像头中开启本应用的权限后重试"
          : "无法启动相机，请检查权限设置");
      }
    }
  };

  const handleScanResult = async (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.type === 'miao_friend_invite' && data.uid) {
        const mockFriend: FriendInfo = {
          id: data.uid,
          nickname: data.nickname || `喵友_${data.uid.slice(-4)}`,
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid}`,
          catName: data.catName || "小橘",
          catAvatar: data.catAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.uid}`,
          addedAt: Date.now()
        };
        
        setPendingFriend(mockFriend);
        
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
      setScannedUID(decodedText);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setScannedUID(null);
      }, 3000);
    }
  };

  const handleAlbumClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanResult(decodedText);
    } catch (err) {
      setError("未在图片中识别到二维码");
      setTimeout(() => setError(null), 3000);
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
      
      // 强制重置可能被修改的全局样式，确保返回后页面可交互
      document.body.style.overflow = 'auto';
      
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
        const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
        const stream = videoElement?.srcObject as MediaStream;
        const track = stream?.getVideoTracks()[0];
        
        if (track && track.getCapabilities && (track.getCapabilities() as any).torch) {
          const newFlashState = !isFlashOn;
          await track.applyConstraints({
            advanced: [{ torch: newFlashState }]
          } as any);
          setIsFlashOn(newFlashState);
        } else {
          setError("当前设备或浏览器不支持手电筒");
          setTimeout(() => setError(null), 3000);
        }
      } catch (e) {
        console.warn("Flashlight control error:", e);
        setError("手电筒切换失败，请重试");
        setTimeout(() => setError(null), 3000);
      }
    } else {
      setError("请先开启相机再使用手电筒");
      setTimeout(() => setError(null), 3000);
    }
  };

  const activeCat = storage.getActiveCat();
  const currentUser = storage.getUserInfo();
  const inviteData = JSON.stringify({
    type: 'miao_friend_invite',
    uid: currentUser?.username || 'unknown',
    nickname: currentUser?.nickname || '喵星人',
    avatar: currentUser?.avatar || '',
    catName: activeCat?.name || '小猫',
    catAvatar: activeCat?.avatar || ''
  });

  return (
    <div className="fixed inset-0 bg-transparent overflow-hidden z-[100]">
      <div 
        id="reader" 
        className="absolute inset-0 w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>div]:!hidden [&>span]:!hidden [&>canvas]:!hidden [&>video]:!block"
      ></div>
      
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ top: "25%", opacity: 0 }}
          animate={{ 
            top: ["25%", "75%"],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            duration: 2.2, 
            repeat: Infinity, 
            times: [0, 0.1, 0.9, 1],
            ease: "linear" 
          }}
          className="absolute left-[12.5%] right-[12.5%] h-[60px] pointer-events-none"
        >
          {/* 支付宝式网格光晕 (Advanced Grid Glow Effect) */}
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute inset-0 bg-gradient-to-t from-[#FF9D76]/60 to-transparent"
              style={{
                backgroundImage: `
                  linear-gradient(to top, rgba(255,157,118,0.6), transparent),
                  linear-gradient(to right, rgba(255,157,118,0.25) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,157,118,0.25) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 2px 2px, 2px 2px'
              }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF9D76] shadow-[0_0_15px_#FF9D76] rounded-full" />
        </motion.div>

        <div className="absolute w-full text-center bottom-[20%]">
          <p className="text-white/60 text-[13px] font-medium tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            将二维码/条码放入区域内，即可自动扫描
          </p>
        </div>
      </div>

      <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
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

        <div 
          className="w-full flex justify-center gap-10 items-center pb-16 px-6 pointer-events-auto"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}
        >
          <button 
            onClick={handleAlbumClick}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white group-active:scale-90 transition-all shadow-lg">
              <ImageIcon size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">相册</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept="image/*" 
            onChange={handleFileChange} 
          />

          <button 
            onClick={async () => {
              // 1. 停止相机扫描，释放硬件资源
              if (scannerRef.current?.isScanning) {
                try {
                  await scannerRef.current.stop();
                  scannerRef.current.clear();
                  stopTracks();
                } catch (e) {}
              }
              // 2. 跳转至统一的二维码展示页
              navigate("/add-friend-qr");
            }}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white group-active:scale-90 transition-all shadow-lg">
              <QrCode size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">我的二维码</span>
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

      <AnimatePresence>
        {showMyQR && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowMyQR(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-full flex justify-end mb-2">
                  <button onClick={() => setShowMyQR(false)} className="w-8 h-8 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant">
                    <X size={18} />
                  </button>
                </div>
                <div className="w-20 h-20 bg-primary/10 rounded-full overflow-hidden mb-4 border-4 border-white shadow-md">
                  <img src={currentUser?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-black text-on-surface mb-1">{currentUser?.nickname}</h3>
                <p className="text-xs text-on-surface-variant mb-6">扫一扫上面的二维码，加我为好友</p>
                
                <div className="p-6 bg-white rounded-3xl shadow-inner border border-outline-variant/30 mb-6 flex items-center justify-center">
                  <QRCodeCanvas 
                    value={inviteData} 
                    size={200} 
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  <Sparkles size={12} className="text-primary" />
                  <span>Miao - 萌宠社交</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
