import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Sparkles, Link, Send, X, Check, Download } from 'lucide-react';
import PawLogo from './PawLogo';
import { PosterTemplate } from './PosterTemplate';
import html2canvas from 'html2canvas';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  diaryData: {
    id: string;
    title: string;
    imageUrl: string;
    authorName: string;
    authorAvatar: string;
  } | null;
  onPrivateShare: () => void;
  onToast: (msg: string) => void;
}

const WeChatIcon = ({ className = "" }) => (
  <div className={`bg-[#07C160] rounded-full flex items-center justify-center text-white ${className}`}>
    <MessageCircle size={26} fill="white" />
  </div>
);

const MomentsIcon = ({ className = "" }) => (
  <div className={`bg-[#07C160] rounded-full flex items-center justify-center text-white ${className}`}>
    <Sparkles size={24} fill="white" />
  </div>
);

const MOCK_FRIENDS = [
  { id: '1', name: '小甜甜', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky', heat: 95, isOnline: true },
  { id: '2', name: '大橘为重', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kitty', heat: 88, isOnline: false },
  { id: '3', name: '猫咪老师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo', heat: 72, isOnline: true },
  { id: '4', name: '雪球', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Snow', heat: 60, isOnline: true },
  { id: '5', name: '黑炭', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight', heat: 50, isOnline: false },
  { id: '6', name: '芝麻糊', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sesame', heat: 45, isOnline: true },
  { id: '7', name: '奶油', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cream', heat: 40, isOnline: false },
  { id: '8', name: '可乐', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Coke', heat: 35, isOnline: true },
].sort((a, b) => b.heat - a.heat);

export const ShareSheet: React.FC<ShareSheetProps> = ({ 
  isOpen, 
  onClose, 
  diaryData, 
  onPrivateShare, 
  onToast
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  
  const posterRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);

  // 【核心逻辑：状态重置】每次面板打开或状态改变时，清空选择和输入内容，确保下次打开是干净的初始状态
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setMessage('');
      setPosterDataUrl(null);
    }
  }, [isOpen]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/diary/${diaryData?.id || ''}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      onToast("链接已复制，请去微信发送给好友");
    });
    onClose();
  };

  const handleShareToWeChat = async () => {
    const shareData = {
      title: '在 Miao 看到一个超可爱的瞬间',
      text: diaryData?.title || '快来看看这只可爱的小猫咪！',
      url: `${window.location.origin}/diary/${diaryData?.id || ''}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        onClose();
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSend = () => {
    if (selectedIds.length === 0) return;
    onToast(`成功分享给 ${selectedIds.length} 位好友！`);
    setSelectedIds([]);
    setMessage('');
    onClose();
  };

  const handleGeneratePoster = async () => {
    if (!posterRef.current || isGeneratingPoster) return;
    try {
      setIsGeneratingPoster(true);

      // Wait for all fonts to be fully loaded and applied
      await document.fonts.ready;
      
      // Wait for all images inside the poster to be fully decoded/loaded
      const imgs = Array.from(posterRef.current.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Safely bypass erroring images
        });
      }));

      // Extra short delay for visual stabilization
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(posterRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#FFF9F5',
      });
      const dataUrl = canvas.toDataURL('image/png');
      setPosterDataUrl(dataUrl);
    } catch (err: any) {
      console.error('Failed to generate poster:', err);
      // Fallback for strict CORS blocks
      if (err.message && err.message.includes('tainted')) {
        onToast("安全限制无法生成，可试试直接截图");
      } else {
        onToast(`海报生成失败: ${err.message || '未知错误'}`);
      }
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const diaryUrl = `${window.location.origin}/diary/${diaryData?.id || ''}`;

  return (
    <AnimatePresence>
      {/* 预览海报的弹窗模式 */}
      {posterDataUrl && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[1100] bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-md"
           onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={() => setPosterDataUrl(null)} 
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-90 transition-all z-10"
          >
            <X size={24} />
          </button>

          <img src={posterDataUrl} alt="Share Poster" className="w-full max-w-[320px] object-contain rounded-[24px] shadow-2xl bg-white" />

          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="text-white/70 text-[13px] font-bold flex items-center gap-2 tracking-wide">
              <div className="w-1.5 h-1.5 bg-[#FF2442] rounded-full" />
              长按图片保存，或点击下方按钮
              <div className="w-1.5 h-1.5 bg-[#FF2442] rounded-full" />
            </div>
            <button
               onClick={() => {
                 const link = document.createElement('a');
                 link.download = `share-miao-${diaryData?.id || 'poster'}.png`;
                 link.href = posterDataUrl;
                 link.click();
                 onToast("海报已保存到相册！");
                 setPosterDataUrl(null);
                 onClose();
               }}
               className="px-10 py-3.5 bg-[#FF2442] text-white rounded-full text-[15px] font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-[#FF2442]/20"
            >
               <Download size={18} strokeWidth={2.5} />
               保存海报
            </button>
          </div>
        </motion.div>
      )}

      {isOpen && !posterDataUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="backdrop-overlay !z-[1000] !bg-black/60 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-lg bg-[#FFF9F5] rounded-t-[32px] sm:rounded-b-[32px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-[#4A2E1B]/5"
            onClick={e => e.stopPropagation()}
          >
            {/* 顶部标题 */}
            <div className="relative pt-8 pb-4 text-center shrink-0 border-b border-[#4A2E1B]/5">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-[#4A2E1B]/40 hover:text-[#4A2E1B]/60 active:scale-95 transition-all"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
              <h3 className="text-lg font-black text-[#4A2E1B]">分享至</h3>
              <p className="text-[10px] text-[#4A2E1B]/40 font-bold uppercase tracking-widest mt-0.5">Share To</p>
            </div>

            {/* 第一排：站内好友 (直接选择) */}
            <div className="px-2 overflow-x-auto no-scrollbar flex py-4">
              <div className="flex gap-4 px-4 pb-2">
                {MOCK_FRIENDS.map(friend => {
                  const isSelected = selectedIds.includes(friend.id);
                  return (
                    <button 
                      key={friend.id}
                      onClick={() => toggleSelect(friend.id)}
                      className="flex flex-col items-center gap-2 shrink-0 group active:scale-95 transition-transform"
                    >
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${isSelected ? 'border-primary scale-105' : 'border-[#4A2E1B]/10'}`}>
                          <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover bg-[#4A2E1B]/5" />
                        </div>
                        {isSelected ? (
                            <div className="absolute -right-0.5 -bottom-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-[#FFF9F5] z-10 shadow-sm">
                                <Check size={12} className="text-white" strokeWidth={4} />
                            </div>
                        ) : (
                          friend.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#4CAF50] rounded-full border-2 border-[#FFF9F5]" />
                          )
                        )}
                      </div>
                      <span className={`text-[11px] font-bold transition-colors ${isSelected ? 'text-primary' : 'text-[#4A2E1B]/80'} max-w-[56px] truncate`}>{friend.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!selectedIds.length ? (
                <motion.div
                  key="social-row"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* 分割线 */}
                  <div className="mx-8 border-t border-[#4A2E1B]/5" />

                  {/* 第二排：外部社交分享 */}
                  <div className="px-2 overflow-x-auto no-scrollbar flex py-6">
                    <div className="flex gap-6 px-6 pb-2">
                      <button 
                        onClick={() => {
                            onPrivateShare();
                            onClose();
                        }}
                        className="flex flex-col items-center gap-2 shrink-0 group active:scale-95 transition-transform"
                      >
                        <div className="w-14 h-14 bg-[#4A2E1B]/5 rounded-full flex items-center justify-center text-[#4A2E1B] shadow-sm hover:bg-[#4A2E1B]/10 transition-colors">
                          <Send size={24} />
                        </div>
                        <span className="text-[11px] font-bold text-[#4A2E1B]/60">更多好友</span>
                      </button>

                      <button 
                        onClick={handleShareToWeChat}
                        className="flex flex-col items-center gap-2 shrink-0 group active:scale-95 transition-transform"
                      >
                        <WeChatIcon className="w-14 h-14 shadow-lg shadow-green-500/10" />
                        <span className="text-[11px] font-bold text-[#4A2E1B]/60">微信好友</span>
                      </button>

                      <button 
                        onClick={handleGeneratePoster}
                        disabled={isGeneratingPoster}
                        className="flex flex-col items-center gap-2 shrink-0 group active:scale-95 transition-transform"
                      >
                        <MomentsIcon className="w-14 h-14 shadow-lg shadow-green-500/10" />
                        <span className="text-[11px] font-bold text-[#4A2E1B]/60">
                           {isGeneratingPoster ? '正在生成...' : '朋友圈'}
                        </span>
                      </button>

                      <button 
                        onClick={handleCopyLink}
                        className="flex flex-col items-center gap-2 shrink-0 group active:scale-95 transition-transform"
                      >
                        <div className="w-14 h-14 bg-[#4A2E1B]/5 rounded-full flex items-center justify-center text-[#4A2E1B] shadow-sm hover:bg-[#4A2E1B]/10 transition-colors">
                          <Link size={24} />
                        </div>
                        <span className="text-[11px] font-bold text-[#4A2E1B]/60">复制链接</span>
                      </button>
                    </div>
                  </div>

                  {/* 取消按钮 */}
                  <button 
                    onClick={onClose}
                    className="w-full py-5 bg-transparent border-t border-[#4A2E1B]/5 text-[#4A2E1B] font-black text-base active:bg-[#4A2E1B]/5 transition-colors"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
                  >
                    取消
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="message-area"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="overflow-hidden bg-[#FFF5F0]/50 border-t border-[#4A2E1B]/5"
                >
                  <div className="p-5 space-y-4">
                    {/* 已选好友预览 */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#4A2E1B]/40">发送给:</span>
                      <div className="flex -space-x-2">
                        {selectedIds.slice(0, 5).map(id => {
                          const friend = MOCK_FRIENDS.find(f => f.id === id);
                          return (
                            <div key={id} className="w-7 h-7 rounded-full border-2 border-[#FFF5F0] overflow-hidden bg-[#4A2E1B]/5">
                              <img src={friend?.avatar} alt="" className="w-full h-full object-cover" />
                            </div>
                          );
                        })}
                        {selectedIds.length > 5 && (
                          <div className="w-7 h-7 rounded-full border-2 border-[#FFF5F0] bg-[#4A2E1B]/10 flex items-center justify-center text-[10px] font-bold text-[#4A2E1B]/60">
                            +{selectedIds.length - 5}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 输入框与分享图预览 */}
                    <div className="flex gap-4 bg-white rounded-2xl p-3 border border-[#4A2E1B]/5 shadow-sm">
                      <textarea 
                        placeholder="跟朋友说点什么吧..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-[#4A2E1B] placeholder:text-[#4A2E1B]/30 h-16 pt-1"
                      />
                      <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden relative shadow-sm bg-[#FFF5F0] flex flex-col items-center justify-center border border-[#4A2E1B]/5">
                        {diaryData?.imageUrl ? (
                          <img src={diaryData.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                        ) : (
                          <PawLogo className="w-6 h-6 text-[#4A2E1B]/10 absolute top-3" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-1.5 flex items-end">
                          <span className="text-[9px] font-bold text-white line-clamp-2 w-full leading-tight">{diaryData?.title}</span>
                        </div>
                      </div>
                    </div>

                    {/* 发送按钮 */}
                    <button 
                      onClick={handleSend}
                      className="w-full bg-primary text-white py-4 rounded-full font-black text-lg active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                      发送
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {/* 隐藏的 DOM 节点用于海报渲染 */}
          {diaryData && (
            <PosterTemplate 
              ref={posterRef}
              diaryImage={diaryData.imageUrl}
              contentText={diaryData.title}
              authorName={diaryData.authorName}
              authorAvatar={diaryData.authorAvatar}
              date={new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
              diaryUrl={diaryUrl}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

