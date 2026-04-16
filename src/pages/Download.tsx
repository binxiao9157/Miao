import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Smartphone, Share, Plus, MoreVertical, ArrowRight } from "lucide-react";
import PawIcon from "../components/PawIcon";
import { motion } from "motion/react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DownloadPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  const appUrl = window.location.origin;

  useEffect(() => {
    // 检测平台
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform("ios");
    } else if (/Android/.test(ua)) {
      setPlatform("android");
    }

    // 检测是否已作为 PWA 运行
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // 监听安装提示事件
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 bg-background relative overflow-y-auto"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
    >
      {/* 装饰背景 */}
      <div className="fixed -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center relative z-10 py-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-6 group"
        >
          <PawIcon className="text-[#5D4037] -rotate-12" size={32} fill="#5D4037" />
          <span className="text-3xl font-black bg-gradient-to-r from-[#5D4037] to-primary bg-clip-text text-transparent tracking-tighter">
            Miao
          </span>
        </motion.div>

        {/* 标语 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-black text-on-surface mb-2">下载 Miao</h1>
          <p className="text-sm text-on-surface-variant">
            扫描二维码，开启与猫咪的治愈旅程
          </p>
        </motion.div>

        {/* QR 码卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] flex flex-col items-center w-full mb-8 border border-outline-variant/20"
        >
          <div className="bg-surface-container p-5 rounded-[24px] mb-5">
            <QRCodeCanvas
              value={appUrl}
              size={200}
              level="M"
              includeMargin={false}
              imageSettings={{
                src: "/icon-32.png",
                height: 28,
                width: 28,
                excavate: true,
              }}
            />
          </div>

          <p className="text-xs text-on-surface-variant text-center mb-1">
            使用手机相机或浏览器扫描
          </p>
          <p className="text-[10px] text-on-surface-variant/50 font-medium">
            {appUrl}
          </p>
        </motion.div>

        {/* 直接安装按钮（Android Chrome 支持时显示） */}
        {deferredPrompt && !isInstalled && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleInstall}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-8"
          >
            <Download size={20} />
            立即安装到桌面
          </motion.button>
        )}

        {/* 已安装提示 */}
        {isInstalled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full py-4 bg-green-50 text-green-700 rounded-2xl font-bold text-sm text-center mb-8 border border-green-200"
          >
            Miao 已安装到您的设备
          </motion.div>
        )}

        {/* 安装引导 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full space-y-4 mb-8"
        >
          <h2 className="text-sm font-black text-on-surface text-center mb-4">
            手动安装教程
          </h2>

          {/* iOS 引导 */}
          <div
            className={`p-5 rounded-[24px] border transition-all ${
              platform === "ios"
                ? "bg-white border-primary/20 shadow-sm"
                : "bg-surface-container border-transparent"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Smartphone size={16} className="text-white" />
              </div>
              <span className="font-black text-sm text-on-surface">iPhone / iPad</span>
              {platform === "ios" && (
                <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  当前设备
                </span>
              )}
            </div>
            <div className="space-y-2.5 pl-11">
              <Step icon={<Smartphone size={14} />} text="使用 Safari 浏览器打开链接" />
              <Step icon={<Share size={14} />} text='点击底部「分享」按钮' />
              <Step icon={<Plus size={14} />} text='选择「添加到主屏幕」' />
            </div>
          </div>

          {/* Android 引导 */}
          <div
            className={`p-5 rounded-[24px] border transition-all ${
              platform === "android"
                ? "bg-white border-primary/20 shadow-sm"
                : "bg-surface-container border-transparent"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Smartphone size={16} className="text-white" />
              </div>
              <span className="font-black text-sm text-on-surface">Android</span>
              {platform === "android" && (
                <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  当前设备
                </span>
              )}
            </div>
            <div className="space-y-2.5 pl-11">
              <Step icon={<Smartphone size={14} />} text="使用 Chrome 浏览器打开链接" />
              <Step icon={<MoreVertical size={14} />} text='点击右上角「更多」菜单' />
              <Step icon={<Download size={14} />} text='选择「安装应用」或「添加到主屏幕」' />
            </div>
          </div>
        </motion.div>

        {/* 底部入口 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center pb-8"
        >
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-bold text-primary flex items-center gap-1 mx-auto active:opacity-60 transition-opacity"
          >
            已有账号？去登录
            <ArrowRight size={16} />
          </button>
          <p className="text-[10px] text-on-surface-variant/40 font-bold tracking-[0.2em] uppercase mt-4">
            © 2026 MIAO SANCTUARY
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/** 安装步骤项 */
function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <span className="text-xs text-on-surface-variant font-medium">{text}</span>
    </div>
  );
}
