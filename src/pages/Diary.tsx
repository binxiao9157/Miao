import { useState, useEffect, useRef, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Plus, Heart, MessageCircle, Share2, Image as ImageIcon, Video, X, Send, MoreHorizontal, Sparkles, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { storage, DiaryEntry } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "../context/AuthContext";
import CommentItem from "../components/CommentItem";

export default function Diary() {
  const { user } = useAuthContext();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [sharingEntry, setSharingEntry] = useState<DiaryEntry | null>(null);
  const [newContent, setNewContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [showPostToast, setShowPostToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showShareToast, setShowShareToast] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      // 在某些移动端浏览器中，innerHeight 会随键盘弹出而改变，有些则不会
      // 我们计算差值来模拟 viewInsets.bottom
      const offset = window.innerHeight - vh;
      setKeyboardHeight(Math.max(0, offset));
    };

    window.visualViewport.addEventListener('resize', handleResize);
    // 初始检查
    handleResize();
    
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setDiaries(storage.getDiaries());
  }, []);

  const handlePost = async () => {
    if ((!newContent.trim() && !selectedMedia) || isLoading) return;

    try {
      setIsLoading(true);
      
      // 模拟保存延迟与媒体文件处理耗时
      await new Promise(resolve => setTimeout(resolve, 1200));

      const newEntry: DiaryEntry = {
        id: 'diary_' + Date.now(),
        content: newContent,
        media: selectedMedia?.url,
        mediaType: selectedMedia?.type,
        createdAt: Date.now(),
        likes: 0,
        isLiked: false,
        comments: [],
      };

      // 1. 写入持久化存储
      const currentDiaries = storage.getDiaries();
      const updatedDiaries = [newEntry, ...currentDiaries];
      const savedDiaries = storage.saveDiaries(updatedDiaries) || updatedDiaries;
      
      // 2. 更新本地状态刷新列表 (使用保存后的数据，可能包含自动清理后的结果)
      setDiaries(savedDiaries);
      
      // 3. 重置输入状态
      setNewContent("");
      setSelectedMedia(null);
      
      // 4. 显示成功提示
      setShowPostToast(true);
      setTimeout(() => setShowPostToast(false), 2000);

    } catch (error) {
      console.error("发布日记失败:", error);
      alert("发布失败，请稍后重试");
    } finally {
      // 无论成功还是失败，强制关闭加载状态并关闭弹窗 (相当于 Navigator.pop)
      setIsLoading(false);
      setIsPosting(false);
    }
  };

  const handleLike = (id: string) => {
    const updated = diaries.map(d => {
      if (d.id === id) {
        return {
          ...d,
          isLiked: !d.isLiked,
          likes: d.isLiked ? d.likes - 1 : d.likes + 1
        };
      }
      return d;
    });
    const saved = storage.saveDiaries(updated) || updated;
    setDiaries(saved);
  };

  const handleComment = (id: string) => {
    if (!commentText.trim()) return;
    const updated = diaries.map(d => {
      if (d.id === id) {
        return {
          ...d,
          comments: [...d.comments, { id: Date.now().toString(), content: commentText }]
        };
      }
      return d;
    });
    const saved = storage.saveDiaries(updated) || updated;
    setDiaries(saved);
    setCommentText("");
    setCommentingId(null);
  };

  const handleShare = (entry: DiaryEntry) => {
    setSharingEntry(entry);
  };

  const handleDelete = (id: string) => {
    const updated = storage.deleteDiary(id);
    const saved = storage.saveDiaries(updated) || updated;
    setDiaries(saved);
    setDeletingId(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'image') {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800; // 日记图片可以稍微大一点，但也要限制
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // 导出压缩后的 Base64 (JPEG 格式体积更小)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setSelectedMedia({ url: compressedBase64, type: 'image' });
          };
          img.src = reader.result as string;
        } else {
          // 视频暂时不压缩（Web 端压缩较复杂），但提醒用户限制大小
          if (file.size > 2 * 1024 * 1024) {
            alert("视频文件太大啦，请选择 2MB 以内的视频哦");
            return;
          }
          setSelectedMedia({ url: reader.result as string, type: 'video' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-full bg-background pb-32">
      <header 
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-6 pb-6 flex justify-between items-center"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">日常记录</h1>
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Daily Moments</p>
        </div>
        <button 
          onClick={() => setIsPosting(true)}
          className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
        >
          <Plus size={28} />
        </button>
      </header>

      <div className="px-6 space-y-8">
        {diaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
              <ImageIcon size={40} />
            </div>
            <h3 className="text-xl font-black text-on-surface mb-2">还没有记录</h3>
            <p className="text-sm text-on-surface-variant max-w-[200px]">快去分享你与猫咪的第一个温暖瞬间吧</p>
          </div>
        ) : (
          diaries.map((entry) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={entry.id} 
              className="miao-card !p-0 overflow-hidden"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <img 
                      src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=miao_default"} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-black text-on-surface">{user?.nickname || "喵星人"}</p>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setDeletingId(entry.id)}
                  className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-all mr-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {entry.media && (
                <div className="aspect-square w-full bg-surface-container flex items-center justify-center overflow-hidden">
                  {entry.mediaType === 'video' ? (
                    <video src={entry.media} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={entry.media} alt="Diary media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                </div>
              )}

              <div className="p-6">
                <p className="text-on-surface text-base font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                  {entry.content}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => handleLike(entry.id)}
                      className={`flex items-center gap-2 transition-all ${entry.isLiked ? "text-red-500 scale-110" : "text-on-surface-variant hover:text-primary"}`}
                    >
                      <Heart size={24} fill={entry.isLiked ? "currentColor" : "none"} />
                      <span className="text-xs font-black">{entry.likes}</span>
                    </button>
                    <button 
                      onClick={() => setCommentingId(entry.id)}
                      className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all"
                    >
                      <MessageCircle size={24} />
                      <span className="text-xs font-black">{entry.comments.length}</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => handleShare(entry)}
                    className="text-on-surface-variant hover:text-primary transition-all"
                  >
                    <Share2 size={24} />
                  </button>
                </div>

                {/* 评论列表 */}
                {entry.comments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-outline-variant/30 space-y-3">
                    {entry.comments.map((comment) => (
                      <div key={comment.id}>
                        <CommentItem 
                          comment={comment} 
                          diaryId={entry.id} 
                          onDelete={(dId, cId) => {
                            const updated = storage.deleteComment(dId, cId);
                            setDiaries(updated);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {createPortal(
        <>
          {/* 发布弹窗 */}
          <AnimatePresence>
            {isPosting && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-6"
                onClick={() => setIsPosting(false)}
              >
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="bg-background w-full max-w-lg rounded-t-[32px] sm:rounded-[40px] shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden"
                  style={{ 
                    paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'env(safe-area-inset-bottom)',
                    transition: 'padding-bottom 0.2s ease-out'
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    // 点击非输入区域收起键盘
                    if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'INPUT') {
                      (document.activeElement as HTMLElement)?.blur();
                    }
                  }}
                >
                  {/* 弹窗头部 (固定) */}
                  <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                    <div>
                      <h2 className="text-2xl font-black text-on-surface">记录此刻</h2>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Capture the moment</p>
                    </div>
                    <button onClick={() => setIsPosting(false)} className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
                      <X size={20} />
                    </button>
                  </div>
    
                  {/* 弹窗内容区 (可滚动) */}
                  <div className="flex-grow overflow-y-auto custom-scrollbar p-6 pt-4">
                    <textarea 
                      autoFocus
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="这一刻在想什么..."
                      className="w-full min-h-[120px] h-32 p-5 bg-surface-container rounded-[28px] border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none mb-6 text-on-surface font-medium placeholder:text-on-surface-variant/40"
                    />

                    {selectedMedia && (
                  <div className="relative w-32 h-32 rounded-3xl overflow-hidden mb-2 group shadow-lg">
                    {selectedMedia.type === 'video' ? (
                      <video src={selectedMedia.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={selectedMedia.url} className="w-full h-full object-cover" />
                    )}
                    <button 
                      onClick={() => setSelectedMedia(null)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* 弹窗底部操作栏 (固定) */}
              <div className="flex items-center justify-between p-6 pt-4 border-t border-outline-variant/30 shrink-0 bg-background">
                <div className="flex gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90"
                    title="上传图片"
                  >
                    <ImageIcon size={24} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90"
                    title="上传视频"
                  >
                    <Video size={24} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*,video/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                {/* [FIX] 发布按钮位置：确保在右下角，并使用品牌色 */}
                <button 
                  onClick={handlePost}
                  disabled={(!newContent.trim() && !selectedMedia) || isLoading}
                  className="px-8 h-12 rounded-full font-bold flex items-center gap-2 transition-all disabled:opacity-30 disabled:scale-100 active:scale-95"
                  style={{ backgroundColor: '#FF9D76', color: 'white' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>发布中...</span>
                    </>
                  ) : (
                    "发布"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 微信分享菜单 */}
      <AnimatePresence>
        {sharingEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setSharingEntry(null)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-background w-full max-w-lg rounded-[40px] p-8 pb-12 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-10">
                <h3 className="text-xl font-black text-on-surface">分享至微信</h3>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Share to WeChat</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <button 
                  onClick={() => {
                    setSharingEntry(null);
                    setShareMessage("正在检测微信环境...\nWeb端暂不支持直接唤起微信，请复制链接分享");
                    setShowShareToast(true);
                    setTimeout(() => setShowShareToast(false), 3000);
                  }}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-[#07C160] rounded-3xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 active:scale-90 transition-all">
                    <MessageCircle size={32} fill="currentColor" />
                  </div>
                  <span className="text-sm font-bold text-on-surface">微信好友</span>
                </button>

                <button 
                  onClick={() => {
                    setSharingEntry(null);
                    setShareMessage("正在检测微信环境...\nWeb端暂不支持直接唤起微信，请复制链接分享");
                    setShowShareToast(true);
                    setTimeout(() => setShowShareToast(false), 3000);
                  }}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#07C160] to-[#00B050] rounded-3xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 active:scale-90 transition-all">
                    <div className="relative">
                      <Sparkles size={32} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-on-surface">朋友圈</span>
                </button>
              </div>

              <button 
                onClick={() => setSharingEntry(null)}
                className="w-full mt-12 py-4 bg-surface-container text-on-surface-variant rounded-2xl font-black active:scale-95 transition-all"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 评论弹窗 */}
      <AnimatePresence>
        {commentingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setCommentingId(null)}
          >
            <motion.div 
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-background w-full max-w-lg rounded-[32px] p-4 pr-2 flex items-center gap-3 shadow-2xl border border-outline-variant/30"
              onClick={e => e.stopPropagation()}
            >
              <input 
                autoFocus
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="发表你的评论..."
                className="flex-grow p-4 bg-transparent border-none outline-none text-on-surface font-medium placeholder:text-on-surface-variant/40"
                onKeyDown={e => e.key === 'Enter' && handleComment(commentingId)}
              />
              <button 
                onClick={() => handleComment(commentingId)}
                className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-primary/20"
              >
                <Send size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {deletingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setDeletingId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background w-full max-w-xs rounded-[40px] p-8 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-on-surface mb-3">确定删除吗？</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
                确定要删除这条记录吗？删除后将无法找回。
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deletingId)}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  确定删除
                </button>
                <button 
                  onClick={() => setDeletingId(null)}
                  className="w-full py-4 bg-surface-container text-on-surface-variant rounded-2xl font-black active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除成功提示 */}
      <AnimatePresence>
        {showDeleteToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[130] bg-on-surface text-surface px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm font-black">记录已删除</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 发布成功提示 */}
      <AnimatePresence>
        {showPostToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[130] bg-on-surface text-surface px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm font-black">发布成功啦～</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 分享提示 Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[130] bg-on-surface text-surface px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 max-w-[80vw]"
          >
            <Share2 size={20} className="text-primary flex-shrink-0" />
            <span className="text-sm font-black whitespace-pre-wrap leading-relaxed">{shareMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
