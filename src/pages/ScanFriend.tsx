import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { X, Camera, Zap, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage, FriendInfo } from "../services/storage";
import PageHeader from "../components/PageHeader";

export default function ScanFriend() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isUnmounted = false;

    const stopTracks = () => {
      try {
        // 查找所有视频轨道并停止
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          if (video.srcObject instanceof MediaStream) {
            video.srcObject.getTracks().forEach(track => {
              track.stop();
              console.log("Track stopped manually:", track.label);
            });
            video.srcObject = null;
          }
        });
      } catch (e) {
        console.error("Manual track stop error:", e);
      }
    };

    const startScanner = async () => {
      if (isUnmounted) return;
      
      try {
        // 彻底清理旧实例
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) await scannerRef.current.stop();
            scannerRef.current.clear();
          } catch (e) {}
        }
        
        // 再次确保轨道停止
        stopTracks();

        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const width = window.innerWidth;
        const qrBoxSize = Math.floor(width * 0.65);

        const config = { 
          fps: 25, 
          qrbox: { width: qrBoxSize, height: qrBoxSize },
          // 强制设置一个标准比例，帮助库选择正确的摄像头流
          aspectRatio: 1.7777777778 // 16:9
        };

        // 简化约束，仅请求环境摄像头，不带任何可能导致多摄拼接的理想分辨率
        const videoConstraints = {
          facingMode: { exact: "environment" }
        };

        await html5QrCode.start(
          videoConstraints,
          config,
          async (decodedText) => {
            if (isUnmounted) return;
            try {
              const data = JSON.parse(decodedText);
              if (data.type === 'miao_friend_invite') {
                if (html5QrCode?.isScanning) {
                  await html5QrCode.stop();
                  html5QrCode.clear();
                  stopTracks();
                }
                setScanResult(data);
              }
            } catch (e) {
              setError("无法解析二维码数据");
              setTimeout(() => setError(null), 3000);
            }
          },
          () => {}
        );
      } catch (err) {
        // 如果 exact: "environment" 失败（某些设备不支持），尝试普通 environment
        try {
          if (html5QrCode) {
            await html5QrCode.start(
              { facingMode: "environment" },
              { fps: 25, qrbox: { width: Math.floor(window.innerWidth * 0.65), height: Math.floor(window.innerWidth * 0.65) } },
              async (decodedText) => {
                // ... 同样的成功处理逻辑
                const data = JSON.parse(decodedText);
                if (data.type === 'miao_friend_invite') {
                  await html5QrCode?.stop();
                  html5QrCode?.clear();
                  stopTracks();
                  setScanResult(data);
                }
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

    startScanner();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().then(() => stopTracks()).catch(() => stopTracks());
        }
      } else {
        if (scannerRef.current && !scannerRef.current.isScanning && !scanResult && !showSuccess) {
          startScanner();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isUnmounted = true;
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
      } catch (e) {}
    }
    navigate(-1);
  };

  const handleAddFriend = () => {
    if (!scanResult) return;
    
    setIsAdding(true);
    
    // 模拟网络延迟
    setTimeout(() => {
      const friend: FriendInfo = {
        id: scanResult.userId,
        nickname: scanResult.nickname,
        avatar: scanResult.avatar,
        catName: scanResult.catName,
        catAvatar: scanResult.catAvatar,
        addedAt: Date.now()
      };
      
      const success = storage.addFriend(friend);
      setIsAdding(false);
      
      if (success) {
        setShowSuccess(true);
        setTimeout(() => {
          navigate("/diary");
        }, 2000);
      } else {
        setError("该好友已在你的列表中");
        setTimeout(() => {
          setError(null);
          window.location.reload(); // 简单粗暴的重置方式，确保相机状态干净
        }, 2000);
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50">
        <PageHeader 
          title="扫一扫" 
          subtitle="Scan QR Code" 
          dark
          action={
            <button 
              onClick={handleBack}
              className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>
          }
        />
      </div>

      <div className="flex-grow relative flex items-center justify-center bg-black overflow-hidden">
        {/* 相机预览容器 - 强制单视频显示，隐藏所有库生成的额外元素 */}
        <div 
          id="reader" 
          className="absolute inset-0 w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>div]:!hidden [&>span]:!hidden [&>canvas]:!hidden [&>video]:!block"
        ></div>
        
        {/* 扫描遮罩层 (Custom Overlay - 增加背景深度以掩盖可能的边缘伪影) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* 上遮罩 */}
          <div className="absolute top-0 left-0 right-0 bg-black/80" style={{ height: 'calc(50% - 32.5vw)' }}></div>
          {/* 下遮罩 */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: 'calc(50% - 32.5vw)' }}></div>
          {/* 左遮罩 */}
          <div className="absolute left-0 bg-black/80" style={{ top: 'calc(50% - 32.5vw)', bottom: 'calc(50% - 32.5vw)', width: 'calc(50% - 32.5vw)' }}></div>
          {/* 右遮罩 */}
          <div className="absolute right-0 bg-black/80" style={{ top: 'calc(50% - 32.5vw)', bottom: 'calc(50% - 32.5vw)', width: 'calc(50% - 32.5vw)' }}></div>

          {/* 中心扫描框 - 严格 65vw 正方形 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[65vw] h-[65vw] border-2 border-white/10">
            {/* 扫描框边角装饰 - 品牌橙色 */}
            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-[#FF9D76] rounded-tl-sm"></div>
            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-[#FF9D76] rounded-tr-sm"></div>
            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-[#FF9D76] rounded-bl-sm"></div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-[#FF9D76] rounded-br-sm"></div>
            
            {/* 扫描线动画 - 增强发光效果 */}
            <motion.div 
              animate={{ top: ["2%", "98%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              className="absolute left-2 right-2 h-1 bg-[#FF9D76] shadow-[0_0_20px_#FF9D76] z-20 opacity-80"
            />
          </div>

          {/* 提示文字 - 位置固定在框下方 */}
          <div className="absolute w-full text-center" style={{ top: 'calc(50% + 38vw)' }}>
            <p className="inline-block text-white/90 text-[13px] font-bold tracking-[0.2em] bg-black/40 px-6 py-2.5 rounded-full backdrop-blur-md border border-white/5">
              将二维码放入框内即可自动扫描
            </p>
          </div>
        </div>

        <div className="absolute bottom-20 left-0 right-0 z-20 flex justify-center gap-10 px-10">
          <button className="flex flex-col items-center gap-2 text-white/60">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Zap size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">手电筒</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-white/60">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
              <ImageIcon size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">相册</span>
          </button>
        </div>
      </div>

      {/* 扫码结果确认弹窗 */}
      <AnimatePresence>
        {scanResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center shadow-2xl"
            >
              <div className="relative mb-6 mx-auto w-24 h-24">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 p-1">
                  <img src={scanResult.avatar} alt={scanResult.nickname} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full p-1 shadow-lg">
                  <img src={scanResult.catAvatar} alt={scanResult.catName} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>

              <h3 className="text-xl font-black text-on-surface mb-2">发现新好友</h3>
              <p className="text-sm text-on-surface-variant mb-8">
                <span className="font-bold text-primary">{scanResult.nickname}</span> 带着 TA 的伙伴 <span className="font-bold text-secondary">{scanResult.catName}</span> 向你打招呼呢～
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleAddFriend}
                  disabled={isAdding}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isAdding ? "添加中..." : "确认添加"}
                </button>
                <button 
                  onClick={() => {
                    setScanResult(null);
                    // 重新开始扫码逻辑
                    window.location.reload();
                  }}
                  className="w-full py-4 bg-surface-container text-on-surface-variant rounded-2xl font-black active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </motion.div>
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
            className="fixed top-24 left-6 right-6 z-[110] bg-red-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <span className="text-sm font-bold">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成功提示 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-[200] bg-primary flex flex-col items-center justify-center text-white p-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle size={48} />
            </motion.div>
            <h3 className="text-2xl font-black mb-2">添加成功！</h3>
            <p className="opacity-80 font-bold">新的温暖连接已建立</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
