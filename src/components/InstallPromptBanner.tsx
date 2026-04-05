import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { motion } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-[24px] p-5 flex items-center justify-between mb-8 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
          <Download size={24} />
        </div>
        <div>
          <p className="font-black text-on-surface text-sm">下载 Miao 桌面客户端</p>
          <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-wider">获取类原生的流畅治愈体验</p>
        </div>
      </div>
      <button 
        onClick={handleInstall}
        className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
      >
        立即安装
      </button>
    </motion.div>
  );
}
