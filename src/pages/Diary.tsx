import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Plus, Heart, MessageCircle, Share2, Image as ImageIcon, Video, X, Send } from "lucide-react";
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
    
    // Reset
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
      alert("模拟分享至微信：已复制链接到剪贴板");
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
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-outline-variant/30">
        <h1 className="text-2xl font-black tracking-tight text-on-surface">日常记录</h1>
        <button 
          onClick={() => setIsPosting(true)}
          className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="p-6 space-y-6">
        {diaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <div className="w-20 h-20 bg-outline-variant rounded-full flex items-center justify-center mb-4">
              <ImageIcon size={32} />
            </div>
            <p className="text-sm font-medium">还没有记录，快去分享第一条动态吧</p>
          </div>
        ) : (
          diaries.map((entry) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={entry.id} 
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-outline-variant/20"
            >
              {entry.media && (
                <div className="aspect-video w-full bg-black flex items-center justify-center">
                  {entry.mediaType === 'video' ? (
                    <video src={entry.media} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={entry.media} alt="Diary media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                </div>
              )}
              <div className="p-5">
                <p className="text-on-surface leading-relaxed mb-4 whitespace-pre-wrap">{entry.content}</p>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => handleLike(entry.id)}
                      className={`flex items-center gap-1.5 transition-colors ${entry.isLiked ? "text-red-500" : "hover:text-primary"}`}
                    >
                      <Heart size={20} fill={entry.isLiked ? "currentColor" : "none"} />
                      <span className="text-xs font-bold">{entry.likes}</span>
                    </button>
                    <button 
                      onClick={() => setCommentingId(entry.id)}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <MessageCircle size={20} />
                      <span className="text-xs font-bold">{entry.comments.length}</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => handleShare(entry)}
                    className="hover:text-primary transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                </div>

                {/* 评论列表 */}
                {entry.comments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-outline-variant/20 space-y-2">
                    {entry.comments.map((c, i) => (
                      <p key={i} className="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded-lg">
                        <span className="font-bold text-primary mr-2">我:</span>{c}
                      </p>
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">记录此刻</h2>
                <button onClick={() => setIsPosting(false)} className="p-2 bg-outline-variant/20 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <textarea 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="这一刻在想什么..."
                className="w-full h-32 p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none mb-6"
              />

              {selectedMedia && (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden mb-6 group">
                  {selectedMedia.type === 'video' ? (
                    <video src={selectedMedia.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={selectedMedia.url} className="w-full h-full object-cover" />
                  )}
                  <button 
                    onClick={() => setSelectedMedia(null)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <ImageIcon size={24} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
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
                <button 
                  onClick={handlePost}
                  disabled={!newContent.trim() && !selectedMedia}
                  className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
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
            className="fixed inset-0 z-50 bg-black/20 flex items-end justify-center p-4"
            onClick={() => setCommentingId(null)}
          >
            <motion.div 
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-white w-full max-w-lg rounded-3xl p-4 flex items-center gap-3 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <input 
                autoFocus
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="发表你的评论..."
                className="flex-grow p-3 bg-surface-container-low rounded-xl border-none outline-none"
                onKeyDown={e => e.key === 'Enter' && handleComment(commentingId)}
              />
              <button 
                onClick={() => handleComment(commentingId)}
                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              >
                <Send size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
