import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Plus, Heart, MessageCircle, Share2, Image as ImageIcon, Video, X, Send, MoreHorizontal } from "lucide-react";
import { storage, DiaryEntry } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

export default function Diary() {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDiaries(storage.getDiaries());
  }, []);

  const handlePost = () => {
    if (!newContent.trim() && !selectedMedia) return;

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

    const updatedDiaries = [newEntry, ...diaries];
    setDiaries(updatedDiaries);
    storage.saveDiaries(updatedDiaries);
    
    setNewContent("");
    setSelectedMedia(null);
    setIsPosting(false);
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
    setDiaries(updated);
    storage.saveDiaries(updated);
  };

  const handleComment = (id: string) => {
    if (!commentText.trim()) return;
    const updated = diaries.map(d => {
      if (d.id === id) {
        return {
          ...d,
          comments: [...d.comments, commentText]
        };
      }
      return d;
    });
    setDiaries(updated);
    storage.saveDiaries(updated);
    setCommentText("");
    setCommentingId(null);
  };

  const handleShare = (entry: DiaryEntry) => {
    if (navigator.share) {
      navigator.share({
        title: 'Miao 日常记录',
        text: entry.content,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback for desktop or non-supporting browsers
      const dummy = document.createElement('input');
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand('copy');
      document.body.removeChild(dummy);
      alert("链接已复制到剪贴板");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedMedia({ url: reader.result as string, type });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-6 py-6 flex justify-between items-center">
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
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-xs">
                    M
                  </div>
                  <div>
                    <p className="text-sm font-black text-on-surface">我的猫咪</p>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button className="text-on-surface-variant/40">
                  <MoreHorizontal size={20} />
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
                    {entry.comments.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs font-black text-primary whitespace-nowrap">我:</span>
                        <p className="text-xs text-on-surface-variant font-medium leading-relaxed">{c}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 发布弹窗 */}
      <AnimatePresence>
        {isPosting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-on-primary-container/40 backdrop-blur-md flex items-end justify-center p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-background w-full max-w-lg rounded-[48px] p-8 pb-12 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-on-surface">记录此刻</h2>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Capture the moment</p>
                </div>
                <button onClick={() => setIsPosting(false)} className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <textarea 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="这一刻在想什么..."
                className="w-full h-40 p-6 bg-surface-container rounded-[32px] border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none mb-8 text-on-surface font-medium placeholder:text-on-surface-variant/40"
              />

              {selectedMedia && (
                <div className="relative w-28 h-28 rounded-3xl overflow-hidden mb-8 group shadow-lg">
                  {selectedMedia.type === 'video' ? (
                    <video src={selectedMedia.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={selectedMedia.url} className="w-full h-full object-cover" />
                  )}
                  <button 
                    onClick={() => setSelectedMedia(null)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90"
                  >
                    <ImageIcon size={28} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90"
                  >
                    <Video size={28} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*,video/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                <button 
                  onClick={handlePost}
                  disabled={!newContent.trim() && !selectedMedia}
                  className="miao-btn-primary !w-auto px-10 disabled:opacity-30 disabled:scale-100"
                >
                  发布
                </button>
              </div>
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
            className="fixed inset-0 z-50 bg-on-primary-container/20 backdrop-blur-sm flex items-end justify-center p-4"
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
    </div>
  );
}
