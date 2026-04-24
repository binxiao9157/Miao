import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Lock, Unlock, ArrowLeft, Calendar, Send, Clock, ChevronRight, MailOpen, Filter, Trash2, AlertCircle, Bug, FastForward, Key, RefreshCcw } from "lucide-react";
import { storage, TimeLetter, CatInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";

type ViewState = 'list' | 'write' | 'detail';

// 极轻量的局部倒计时组件，隔离重绘压力
const CountdownTimer = memo(({ unlockAt, createdAt, isFastForward }: { unlockAt: number; createdAt: number; isFastForward?: boolean }) => {
  const [countdown, setCountdown] = useState(() => formatCountdown(unlockAt, createdAt, isFastForward));

  useEffect(() => {
    const timer = setInterval(() => {
      const next = formatCountdown(unlockAt, createdAt, isFastForward);
      setCountdown(next);
      if (next === '已解锁') clearInterval(timer);
    }, isFastForward ? 500 : 10000); // 开启加速模式后刷新频率大幅提升
    return () => clearInterval(timer);
  }, [unlockAt, createdAt, isFastForward]);

  return <span className="text-red-500 font-black tracking-wider">{countdown}</span>;
});

CountdownTimer.displayName = 'CountdownTimer';

// 记忆化信件项组件，防止不必要的重绘
const TimeLetterItem = memo(({ 
  letter, 
  targetCat, 
  isUnlocked,
  isFastForward,
  onDelete, 
  onClick,
  onLongPress
}: { 
  letter: TimeLetter; 
  targetCat?: CatInfo; 
  isUnlocked: boolean;
  isFastForward: boolean;
  onDelete: (e: React.MouseEvent, l: TimeLetter) => void;
  onClick: (l: TimeLetter) => void;
  onLongPress?: (l: TimeLetter) => void;
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = () => {
    if (isUnlocked || !onLongPress) return;
    longPressTimer.current = setTimeout(() => {
      onLongPress(letter);
      // 触感反馈
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 1000);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <motion.div 
      layout="position" // 仅对位置进行布局动画，彻底解决颤动问题
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      onClick={() => onClick(letter)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`miao-card flex gap-4 group active:scale-[0.98] p-3 relative overflow-hidden will-change-transform ${!isUnlocked ? 'cursor-help' : ''}`}
    >
      {/* 核心视觉：猫咪头像 - 绝对稳定的容器 */}
      <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-surface-container">
        <img 
          src={letter.catAvatar || "https://picsum.photos/seed/cat/200/200"} 
          className={`w-full h-full object-cover ${!isUnlocked ? 'blur-sm scale-110 brightness-75' : 'blur-0 scale-100 brightness-100'}`}
          alt="" 
          referrerPolicy="no-referrer"
          decoding="async"
          loading="eager"
        />
        
        {/* 稳定遮罩层 - 使用内联样式避免类名切换导致的重排 */}
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300"
          style={{ opacity: isUnlocked ? 0 : 1, pointerEvents: 'none' }}
        >
          <Lock size={24} className="text-white drop-shadow-lg" />
        </div>
        
        <div 
          className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded-full shadow-lg transition-opacity duration-300"
          style={{ opacity: isUnlocked ? 1 : 0, pointerEvents: 'none' }}
        >
          <MailOpen size={10} />
        </div>
      </div>
      
      <div className="flex-grow min-w-0 flex flex-col justify-between py-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-black text-on-surface truncate flex-1">
              {letter.title || "时光回响"}
            </h3>
            <button 
              onClick={(e) => onDelete(e, letter)}
              className="p-1.5 text-on-surface-variant/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="text-xs text-on-surface-variant font-medium leading-relaxed">
            {isUnlocked ? (
              <p className="line-clamp-2">{letter.content}</p>
            ) : (
              <p>距离解锁还有 <CountdownTimer unlockAt={letter.unlockAt} createdAt={letter.createdAt} isFastForward={isFastForward} /></p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-on-surface-variant/40 font-bold">
            收信喵：{targetCat?.name || "已离开的小猫"}
          </p>
          <span className="text-[10px] font-black text-on-surface-variant/20 uppercase tracking-widest">
            {new Date(letter.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="flex items-center">
        <ChevronRight size={16} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
});

TimeLetterItem.displayName = 'TimeLetterItem';

function formatCountdown(unlockAt: number, createdAt: number, isFastForward?: boolean): string {
  const now = Date.now();
  let remainingMs = 0;

  if (isFastForward) {
    // 1天 = 1秒
    const totalDuration = unlockAt - createdAt;
    const scaledDuration = totalDuration / 86400;
    remainingMs = Math.max(0, createdAt + scaledDuration - now);
  } else {
    remainingMs = unlockAt - now;
  }
  
  if (remainingMs <= 0) return '已解锁';

  if (isFastForward) {
    const seconds = Math.ceil(remainingMs / 1000);
    return `${seconds} 秒`;
  }

  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  return `${minutes} 分钟`;
}

export default function TimeLetters() {
  const location = useLocation();
  const [letters, setLetters] = useState<TimeLetter[]>(() => storage.getTimeLetters());
  const [view, setView] = useState<ViewState>('list');
  const [selectedLetter, setSelectedLetter] = useState<TimeLetter | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [letterToDelete, setLetterToDelete] = useState<TimeLetter | null>(null);
  
  // Debug State
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [isFastForward, setIsFastForward] = useState(() => storage.getIsFastForward());
  const [forceUnlockedIds, setForceUnlockedIds] = useState<Set<string>>(new Set());

  const handleTitleClick = () => {
    const newCount = debugClickCount + 1;
    setDebugClickCount(newCount);
    if (newCount >= 5) {
      if (!isDebugEnabled) {
        setIsDebugEnabled(true);
        triggerToast("🚀 调试模式（Debug Mode）已开启");
      }
      setDebugClickCount(0);
    }
    // 3秒后重置计数
    setTimeout(() => setDebugClickCount(0), 3000);
  };

  const handleForceUnlock = (letter: TimeLetter) => {
    if (!isDebugEnabled) return;
    setForceUnlockedIds(prev => new Set(prev).add(letter.id));
    triggerToast(`🔓 信件《${letter.title}》已强制开启`);
  };

  const isLetterUnlocked = (letter: TimeLetter) => {
    if (forceUnlockedIds.has(letter.id)) return true;
    const now = Date.now();
    if (!isFastForward) return now >= letter.unlockAt;
    
    // 加速模式：1天 -> 1秒
    const totalDuration = letter.unlockAt - letter.createdAt;
    const scaledDuration = totalDuration / 86400;
    return (now - letter.createdAt) >= scaledDuration;
  };
  
  // Write state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [days, setDays] = useState(1);
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  // List state
  const [filterCatId, setFilterCatId] = useState<string>("all");

  const myCats = useMemo(() => storage.getCatList(), []);
  const activeCat = useMemo(() => storage.getActiveCat(), []);

  useEffect(() => {
    if (activeCat) {
      setSelectedCatId(activeCat.id);
    }
  }, [activeCat]);

  // keep-alive：路由激活时静默刷新数据
  useEffect(() => {
    if (location.pathname === '/time-letters') {
      setLetters(storage.getTimeLetters());
    }
  }, [location.pathname]);

  const triggerToast = useCallback((msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  }, []);

  const handleSaveLetter = useCallback(() => {
    if (!selectedCatId) {
      triggerToast("请先选择收信的小猫哦");
      return;
    }
    if (!title.trim()) {
      triggerToast("请先输入信件标题哦");
      return;
    }
    if (!content.trim()) return;

    const targetCat = myCats.find(c => c.id === selectedCatId);
    if (!targetCat) return;

    // 归一化日期逻辑：当前日期凌晨 + X天
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    const unlockAt = targetDate.getTime() + (days * 24 * 60 * 60 * 1000);

    const newLetter: TimeLetter = {
      id: 'letter_' + Date.now(),
      catId: targetCat.id,
      catAvatar: targetCat.avatar,
      title: title.trim(),
      content: content.trim(),
      createdAt: Date.now(),
      unlockAt: unlockAt,
    };

    const updated = [newLetter, ...letters];
    setLetters(updated);
    storage.saveTimeLetters(updated);
    
    setTitle("");
    setContent("");
    setDays(1);
    setView('list');
    triggerToast("封存成功！信件已存入本地时光机");
  }, [selectedCatId, title, content, days, letters, myCats, triggerToast]);

  const handleLetterClick = useCallback((letter: TimeLetter) => {
    const isUnlocked = isLetterUnlocked(letter);
    if (isUnlocked) {
      setSelectedLetter(letter);
      setView('detail');
    } else {
      const unlockDate = new Date(letter.unlockAt);
      const month = unlockDate.getMonth() + 1;
      const date = unlockDate.getDate();
      triggerToast(`时光正在酿造这封信，请在 ${month} 月 ${date} 日后再来开启吧～`);
    }
  }, [triggerToast, forceUnlockedIds, isFastForward]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, letter: TimeLetter) => {
    e.stopPropagation();
    setLetterToDelete(letter);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!letterToDelete) return;
    const updated = storage.deleteTimeLetter(letterToDelete.id);
    setLetters(updated);
    setLetterToDelete(null);
    triggerToast("信件已永久删除");
  }, [letterToDelete, triggerToast]);

  const filteredLetters = useMemo(() => {
    if (filterCatId === "all") return letters;
    return letters.filter(l => l.catId === filterCatId);
  }, [letters, filterCatId]);

  const renderList = () => (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-2xl font-black text-sm text-center min-w-[280px]"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
      
      <PageHeader 
        title="时光信件" 
        subtitle="Time Capsules" 
        onTitleClick={handleTitleClick}
        action={
          <button 
            onClick={() => setView('write')}
            className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all font-black"
          >
            <Plus size={28} />
          </button>
        }
      />

      <div className="flex flex-col shrink-0 overflow-visible">
        {/* 过滤器 */}
        {myCats.length > 0 && (
          <div className="px-6 mb-6 flex items-center gap-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterCatId("all")}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all shrink-0 ${
                filterCatId === "all" ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              全部
            </button>
            {myCats.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCatId(cat.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition-all shrink-0 ${
                  filterCatId === cat.id ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                <img src={cat.avatar} className="w-5 h-5 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 pb-24 flex flex-col gap-6">
          <AnimatePresence mode="popLayout">
            {filteredLetters.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
                  <Clock size={40} />
                </div>
                <h3 className="text-xl font-black text-on-surface mb-2">还没有信件</h3>
                <p className="text-sm text-on-surface-variant max-w-[200px]">写一封信给未来的自己，让时光见证温暖</p>
              </motion.div>
            ) : (
              filteredLetters.map((letter) => {
                const targetCat = myCats.find(c => c.id === letter.catId);
                const isUnlocked = isLetterUnlocked(letter);

                return (
                  <TimeLetterItem
                    key={letter.id}
                    letter={letter}
                    isUnlocked={isUnlocked}
                    isFastForward={isFastForward}
                    targetCat={targetCat}
                    onDelete={handleDeleteClick}
                    onClick={handleLetterClick}
                    onLongPress={handleForceUnlock}
                  />
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {letterToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-xs shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">确认删除信件</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                您确定要永久删除这封写给 <span className="text-red-500 font-bold">{myCats.find(c => c.id === letterToDelete.catId)?.name || "小猫"}</span> 的时光信件吗？此操作不可撤销。
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
                >
                  确认删除
                </button>
                <button 
                  onClick={() => setLetterToDelete(null)}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderWrite = () => (
    <motion.div 
      key="write"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-y-auto"
    >
      <div className="p-8 pb-32" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <header className="flex items-center justify-between mb-8 pt-4">
          <button onClick={() => setView('list')} className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black text-on-surface">写给未来</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Write to future</p>
          </div>
          <div className="w-12" />
        </header>

        <div className="space-y-8">
          {/* 收信喵选择器 */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-2">收信喵</label>
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-2 py-1">
              {myCats.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`relative shrink-0 transition-all ${selectedCatId === cat.id ? 'scale-110' : 'opacity-40 scale-90'}`}
                >
                  <div className={`w-16 h-16 rounded-2xl overflow-hidden border-4 transition-all ${selectedCatId === cat.id ? 'border-primary shadow-xl shadow-primary/20' : 'border-transparent'}`}>
                    <img src={cat.avatar} className="w-full h-full object-cover" alt={cat.name} referrerPolicy="no-referrer" />
                  </div>
                  {selectedCatId === cat.id && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full shadow-lg">
                      <Plus size={10} className="rotate-45" />
                    </div>
                  )}
                  <p className={`text-[10px] font-black mt-1 text-center ${selectedCatId === cat.id ? 'text-primary' : 'text-on-surface-variant'}`}>{cat.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-2">信件标题</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给未来的信起个题目吧..."
                className="w-full p-6 bg-surface-container rounded-3xl border-none outline-none text-lg font-black text-on-surface placeholder:text-on-surface-variant/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-2">信件内容</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下此刻想说的话..."
                className="w-full h-64 p-8 bg-surface-container rounded-[48px] border-none outline-none resize-none text-on-surface font-medium placeholder:text-on-surface-variant/30 leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">封存时长</label>
              <span className="text-sm font-black text-primary">{days} 天后开启</span>
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              {[1, 3, 7, 30, 100].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`py-4 rounded-2xl font-black text-xs transition-all ${
                    days === d ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={handleSaveLetter}
          disabled={!title.trim() || !content.trim()}
          className="w-full mt-12 h-14 rounded-full font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:scale-100 active:scale-95 shadow-lg"
          style={{ backgroundColor: '#FF9D76', color: 'white' }}
        >
          <Send size={20} />
          封存信件
        </button>
      </div>
    </motion.div>
  );

  const renderDetail = () => {
    const targetCat = myCats.find(c => c.id === selectedLetter?.catId);
    
    return (
      <motion.div 
        key="detail"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 bg-[#1a1c1e] flex flex-col overflow-y-auto no-scrollbar"
      >
        {/* 背景层：猫咪 Banner - 这一层通过 absolute 保持在顶部背景位置，并与后面内容自然叠加 */}
        <div className="absolute top-0 h-[60vh] w-full shrink-0 -z-10 overflow-hidden">
          <img 
            src={selectedLetter?.catAvatar || targetCat?.avatar || "https://picsum.photos/seed/cat/800/600"} 
            className="w-full h-full object-cover" 
            alt="" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
        </div>

        {/* 顶部导航栏 - 现在放在滚动视图内部作为第一个元素 */}
        <header className="px-8 flex items-center justify-between shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(env(safe-area-inset-top) + 6rem)' }}>
          <button 
            onClick={() => setView('list')} 
            className="w-12 h-12 bg-black/20 backdrop-blur-2xl rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all shadow-xl"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black text-white drop-shadow-lg">时光回响</h1>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest drop-shadow-sm">Echo from past</p>
          </div>
          <div className="w-12" />
        </header>

        {/* 横向引导文字层 */}
        <div className="h-[25vh] flex flex-col justify-end px-10 pb-12 shrink-0">
          <p className="text-xs font-black text-white/60 uppercase tracking-widest mb-1.5 drop-shadow-sm">这是写给它的信</p>
          <h2 className="text-3xl font-black text-white drop-shadow-md">{targetCat?.name || "已离开的小猫"}</h2>
        </div>

        {/* 前景层：白色信件卡片 */}
        <div className="relative z-10 w-full flex-grow">
          {/* 卡片顶部圆角及主要内容容器 */}
          <div 
            className="bg-background rounded-t-[32px] p-10 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col"
            style={{ 
              minHeight: '65vh',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 8rem)' 
            }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16" />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-primary/40">
                  <Calendar size={18} />
                  <span className="text-xs font-black tracking-widest uppercase">
                    写于 {new Date(selectedLetter?.createdAt || 0).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black text-on-surface mb-10 text-center leading-tight">
                {selectedLetter?.title || "时光回响"}
              </h2>
              
              <div className="flex-grow">
                <p className="text-xl text-on-surface leading-[2.2] font-serif italic whitespace-pre-wrap">
                  {selectedLetter?.content}
                </p>
              </div>

              {/* 页脚描述与平台标识统一归纳在主卡片底部 */}
              <div className="mt-20 flex flex-col items-center">
                <div className="w-full h-px bg-outline-variant/10 mb-8" />
                
                <p className="text-on-surface-variant/30 text-[10px] font-bold leading-relaxed uppercase tracking-[0.3em] text-center mb-8">
                  这封信在时光中沉淀了很久<br />
                  希望能带给你温暖与力量
                </p>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-1 bg-primary/20 rounded-full mb-1" />
                  <p className="text-[10px] text-on-surface-variant/40 font-black uppercase tracking-[0.2em]">MIAO SANCTUARY</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full relative">
      {renderList()}
      <AnimatePresence>
        {view === 'write' && renderWrite()}
        {view === 'detail' && renderDetail()}
        
        {/* Debug Control Panel */}
        {isDebugEnabled && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 z-[200] bg-black/80 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary font-black">
                <Bug size={18} />
                <span className="text-xs uppercase tracking-widest">Debug Controls</span>
              </div>
              <button 
                onClick={() => setIsDebugEnabled(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                关闭
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const next = !isFastForward;
                  setIsFastForward(next);
                  storage.setIsFastForward(next);
                }}
                className={`flex items-center justify-center gap-3 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${
                  isFastForward ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/10 text-white/60"
                }`}
              >
                <FastForward size={14} />
                {isFastForward ? "Fast: On" : "Fast: Off"}
              </button>
              <button
                onClick={() => {
                  setForceUnlockedIds(new Set());
                  setIsFastForward(false);
                  storage.setIsFastForward(false);
                  triggerToast("🔄 调试状态已重置");
                }}
                className="flex items-center justify-center gap-3 py-3 rounded-2xl bg-white/10 text-white/60 font-black text-[10px] uppercase"
              >
                <RefreshCcw size={14} />
                Reset All
              </button>
            </div>
            
            <p className="mt-4 text-[10px] text-white/30 text-center font-medium leading-relaxed">
              * 加速模式: 1天 → 1秒<br />
              * 强制开启: 长按未解锁信件 1s
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
