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
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'miao_friend_invite') {
            html5QrCode.stop();
            setScanResult(data);
          } else {
            setError("无效的二维码类型");
          }
        } catch (e) {
          setError("无法解析二维码数据");
        }
      },
      (errorMessage) => {
        // 扫码过程中的错误通常可以忽略
      }
    ).catch((err) => {
      console.error("Camera start error:", err);
      setError("无法启动相机，请检查权限设置");
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

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
        setTimeout(() => setError(null), 3000);
        // 重新开始扫码
        if (scannerRef.current) {
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          scannerRef.current.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
               try {
                const data = JSON.parse(decodedText);
                if (data.type === 'miao_friend_invite') {
                  scannerRef.current?.stop();
                  setScanResult(data);
                }
              } catch (e) {}
            },
            () => {}
          );
        }
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="absolute top-0 left-0 right-0 z-50">
        <PageHeader 
          title="扫一扫" 
          subtitle="Scan QR Code" 
          dark
          action={
            <button 
              onClick={() => navigate(-1)}
              className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>
          }
        />
      </div>

      <div className="flex-grow flex flex-col items-center justify-center relative">
        <div id="reader" className="w-full h-full"></div>
        
        {/* 扫描框装饰 */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[250px] h-[250px] border-2 border-primary/50 rounded-3xl relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
            
            {/* 扫描线动画 */}
            <motion.div 
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(255,157,118,0.8)]"
            />
          </div>
        </div>

        <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-10 px-10">
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
