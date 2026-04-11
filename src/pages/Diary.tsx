import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Plus, Heart, MessageCircle, Share2, Image as ImageIcon, Video, X, Send, Sparkles, Trash2, CheckCircle, Loader2, ArrowUpRight, UserPlus, QrCode } from "lucide-react";
import { storage, DiaryEntry, CatInfo, FriendDiaryEntry } from "../services/storage";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { useAuthContext } from "../context/AuthContext";
import DiaryCard from "../components/DiaryCard";
import { shareService } from "../services/shareService";
import PageHeader from "../components/PageHeader";
import { mockFriendService } from "../services/mockFriendService";

export default function Diary() {
  const { user } = useAuthContext();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [sharingEntry, setSharingEntry] = useState<DiaryEntry | null>(null);
  const [showWeChatGuide, setShowWeChatGuide] = useState(false);
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
  const [showAddFriendMenu, setShowAddFriendMenu] = useState(false);
  const [addFriendStep, setAddFriendStep] = useState(1);
  const [selectedCatForQR, setSelectedCatForQR] = useState<CatInfo | null>(null);
  const [catList, setCatList] = useState<CatInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'mine' | 'friends'>('mine');
  const [friendDiaries, setFriendDiaries] = useState<FriendDiaryEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  const MAX_COMMENT_LENGTH = 100;

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
    if (!commentingId) return;
    // 延迟一小会儿等待键盘弹出或弹窗渲染
    const timer = setTimeout(() => {
      const element = document.getElementById(commentingId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [commentingId]);

  useEffect(() => {
    // 缩短延迟，平衡动画流畅度与加载速度
    const timer = setTimeout(() => {
      mockFriendService.initializeMockData();
      setDiaries(storage.getDiaries());
      setFriendDiaries(storage.getFriendDiaries());
      setCatList(storage.getCatList());
    }, 50);
    
    return () => clearTimeout(timer);
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
    if (activeTab === 'mine') {
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
    } else {
      const updated = friendDiaries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            isLiked: !d.isLiked,
            likes: d.isLiked ? d.likes - 1 : d.likes + 1
          };
        }
        return d;
      });
      storage.saveFriendDiaries(updated);
      setFriendDiaries(updated);
    }
  };

  const handleComment = (id: string) => {
    if (!commentText.trim() || commentText.length > MAX_COMMENT_LENGTH) return;
    
    if (activeTab === 'mine') {
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
    } else {
      const updated = friendDiaries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            comments: [...d.comments, { id: Date.now().toString(), content: commentText }]
          };
        }
        return d;
      });
      storage.saveFriendDiaries(updated);
      setFriendDiaries(updated);
    }
    
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

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!isMountedRef.current) return;
        if (type === 'image') {
          // 图片压缩逻辑：限制最大尺寸并降低质量以节省存储空间
          const img = new Image();
          img.onload = () => {
            if (!isMountedRef.current) return;
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800; // 限制最大宽度/高度为 800px
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
            
            // 导出压缩后的 Base64 (JPEG 格式，质量 0.6)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setSelectedMedia({ url: compressedBase64, type: 'image' });
          };
          img.src = reader.result as string;
        } else {
          // 视频处理：Web 端实时压缩成本较高，此处采取限制文件大小的策略
          if (file.size > 2 * 1024 * 1024) { // 严格限制在 2MB 以内
            alert("视频文件太大啦，请选择 2MB 以内的视频哦");
            return;
          }
          setSelectedMedia({ url: reader.result as string, type: 'video' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWechatInvite = async () => {
    if (!selectedCatForQR) return;

    const inviteUrl = `${window.location.origin}/join?uid=${user?.username || 'unknown'}&cat=${selectedCatForQR.id}`;
    const options = {
      title: `快来 Miao 看看我的小猫 ${selectedCatForQR.name} 吧！`,
      text: "我正在 Miao 养猫，邀请你成为我的好友，一起记录萌宠瞬间～",
      url: inviteUrl,
    };

    const result = await shareService.share(options);
    
    if (result.method === 'wechat') {
      setShowWeChatGuide(true);
    } else if (result.method === 'copy') {
      setShareMessage(result.success ? "链接已复制，请手动去微信发给好友吧～" : "复制失败，请手动复制链接");
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    }
  };

  const handleShareAction = async () => {
    if (!sharingEntry) return;

    const options = {
      title: "Miao - 日常记录",
      text: sharingEntry.content.substring(0, 30) + (sharingEntry.content.length > 30 ? "..." : ""),
      url: window.location.href,
    };

    const result = await shareService.share(options);

    if (result.method === 'wechat') {
      setSharingEntry(null);
      setShowWeChatGuide(true);
    } else if (result.method === 'copy') {
      setSharingEntry(null);
      setShareMessage(result.success ? "链接已复制，快去发给好友吧～" : "复制失败，请手动复制链接");
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } else if (result.method === 'native') {
      setSharingEntry(null);
      if (!result.success) {
        // 用户取消或失败，不显示提示
      }
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader 
        title="日常记录" 
        subtitle="Daily Moments" 
        action={
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddFriendMenu(true)}
              className="w-12 h-12 bg-white text-on-surface-variant rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all border border-outline-variant/30"
            >
              <UserPlus size={24} />
            </button>
            <button 
              onClick={() => setIsPosting(true)}
              className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
            >
              <Plus size={28} />
            </button>
          </div>
        }
      />

      <div className="px-6 mb-8">
        <div className="bg-[#FF9D76]/10 p-1.5 rounded-full flex relative overflow-hidden">
          <LayoutGroup id="diary-tabs">
            <button 
              onClick={() => setActiveTab('mine')}
              className={`flex-1 py-3 rounded-full text-sm font-black transition-all relative z-10 ${activeTab === 'mine' ? 'text-white' : 'text-[#5D4037]/60 hover:bg-black/5'}`}
            >
              我的记录
              {activeTab === 'mine' && (
                <motion.div 
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-[#FF9D76] rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 rounded-full text-sm font-black transition-all relative z-10 ${activeTab === 'friends' ? 'text-white' : 'text-[#5D4037]/60 hover:bg-black/5'}`}
            >
              好友动态
              {activeTab === 'friends' && (
                <motion.div 
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-[#FF9D76] rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          </LayoutGroup>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {activeTab === 'mine' ? (
          diaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
                <ImageIcon size={40} />
              </div>
              <h3 className="text-xl font-black text-on-surface mb-2">还没有记录</h3>
              <p className="text-sm text-on-surface-variant max-w-[200px]">快去分享你与猫咪的第一个温暖瞬间吧</p>
            </div>
          ) : (
            diaries.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                userAvatar={user?.avatar}
                userNickname={user?.nickname}
                onLike={handleLike}
                onComment={setCommentingId}
                onShare={handleShare}
                onDelete={(id) => setDeletingId(id)}
                onDeleteComment={(dId, cId) => {
                  const updated = storage.deleteComment(dId, cId);
                  setDiaries(updated);
                }}
              />
            ))
          )
        ) : (
          friendDiaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
                <UserPlus size={40} />
              </div>
              <h3 className="text-xl font-black text-on-surface mb-2">还没有好友动态</h3>
              <p className="text-sm text-on-surface-variant max-w-[200px]">快去添加好友，看看 TA 们的猫咪在做什么吧</p>
            </div>
          ) : (
            friendDiaries.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                isFriend
                onLike={handleLike}
                onComment={setCommentingId}
                onShare={handleShare}
              />
            ))
          )
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

      {/* 添加好友菜单 */}
      <AnimatePresence>
        {showAddFriendMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-end justify-center sm:p-6"
            onClick={() => {
              setShowAddFriendMenu(false);
              setAddFriendStep(1);
            }}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-background w-full max-w-lg rounded-t-[32px] sm:rounded-[40px] shadow-2xl p-8 pb-12"
              onClick={e => e.stopPropagation()}
            >
              {addFriendStep === 1 ? (
                <>
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-black text-on-surface">选择代表猫咪</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Select your cat representative</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-8 max-h-[300px] overflow-y-auto p-2">
                    {catList.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => {
                          setSelectedCatForQR(cat);
                          setAddFriendStep(2);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${selectedCatForQR?.id === cat.id ? 'bg-primary/10 ring-2 ring-primary' : 'bg-surface-container'}`}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm">
                          <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-xs font-bold text-on-surface truncate w-full text-center">{cat.name}</span>
                      </button>
                    ))}
                    {catList.length === 0 && (
                      <div className="col-span-3 py-8 text-center text-on-surface-variant/40 text-sm font-bold">
                        还没有生成的猫咪哦
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-10">
                    <h3 className="text-xl font-black text-on-surface">选择添加方式</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Choose addition method</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <button 
                      onClick={() => {
                        setShowAddFriendMenu(false);
                        setAddFriendStep(1);
                        handleWechatInvite();
                      }}
                      className="flex flex-col items-center gap-3 group"
                    >
                      <div className="w-16 h-16 bg-[#07C160] rounded-3xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 active:scale-90 transition-all">
                        <MessageCircle size={32} fill="currentColor" />
                      </div>
                      <span className="text-sm font-bold text-on-surface">微信邀请</span>
                    </button>

                    <button 
                      onClick={() => {
                        setShowAddFriendMenu(false);
                        // 延迟跳转，确保 AnimatePresence 退出动画执行完毕，防止路由切换时的状态机冲突
                        setTimeout(() => {
                          setAddFriendStep(1);
                          navigate("/add-friend-qr", { state: { cat: selectedCatForQR } });
                        }, 300);
                      }}
                      className="flex flex-col items-center gap-3 group"
                    >
                      <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center text-white shadow-lg shadow-primary/20 active:scale-90 transition-all">
                        <QrCode size={32} />
                      </div>
                      <span className="text-sm font-bold text-on-surface">面对面添加</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setAddFriendStep(1)}
                    className="w-full mt-12 py-4 bg-surface-container text-on-surface-variant rounded-2xl font-black active:scale-95 transition-all"
                  >
                    返回上一步
                  </button>
                </>
              )}
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
                  onClick={handleShareAction}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-[#07C160] rounded-3xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 active:scale-90 transition-all">
                    <MessageCircle size={32} fill="currentColor" />
                  </div>
                  <span className="text-sm font-bold text-on-surface">微信好友</span>
                </button>

                <button 
                  onClick={handleShareAction}
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

      {/* 微信分享引导 */}
      <AnimatePresence>
        {showWeChatGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-end p-8"
            onClick={() => setShowWeChatGuide(false)}
          >
            <div className="flex flex-col items-end text-white">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="mb-4"
              >
                <ArrowUpRight size={64} className="text-primary" />
              </motion.div>
              <h3 className="text-2xl font-black mb-2">点击右上角分享</h3>
              <p className="text-lg opacity-80">点击右上角的三个点 <span className="font-bold">···</span></p>
              <p className="text-lg opacity-80">选择分享给好友或朋友圈</p>
            </div>
            
            <div className="mt-auto w-full text-center">
              <button 
                onClick={() => setShowWeChatGuide(false)}
                className="px-12 py-4 bg-white/10 border border-white/20 rounded-full text-white font-black backdrop-blur-md active:scale-95 transition-all"
              >
                我知道了
              </button>
            </div>
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
            className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-[2px] flex items-end justify-center p-4"
            onClick={() => setCommentingId(null)}
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-primary-container/90 backdrop-blur-xl w-full max-w-lg rounded-[32px] p-2 pl-6 flex items-center gap-3 shadow-2xl border border-primary/10"
              style={{ 
                marginBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'env(safe-area-inset-bottom)',
                transition: 'margin-bottom 0.2s ease-out'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-grow relative flex items-end">
                <textarea 
                  autoFocus
                  rows={1}
                  value={commentText}
                  onChange={e => {
                    setCommentText(e.target.value.slice(0, MAX_COMMENT_LENGTH));
                    // 简单的自动高度调整
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="发表你的温暖评论..."
                  className="w-full py-4 bg-transparent border-none outline-none text-on-primary-container font-bold placeholder:text-on-primary-container/30 pr-12 resize-none max-h-32 custom-scrollbar"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment(commentingId);
                    }
                  }}
                />
                <span className={`absolute right-0 bottom-4 text-[10px] font-black transition-colors ${
                  commentText.length >= MAX_COMMENT_LENGTH ? 'text-red-500' : 'text-on-primary-container/30'
                }`}>
                  {commentText.length}/{MAX_COMMENT_LENGTH}
                </span>
              </div>
              <button 
                onClick={() => handleComment(commentingId)}
                disabled={!commentText.trim() || commentText.length > MAX_COMMENT_LENGTH}
                className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-30"
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
