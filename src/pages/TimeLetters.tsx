import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Lock, Unlock, ArrowLeft, Calendar, Send, Clock, ChevronRight, MailOpen, Filter, Trash2, AlertCircle } from "lucide-react";
import { storage, TimeLetter, CatInfo } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";

type ViewState = 'list' | 'write' | 'detail';

// 极轻量的局部倒计时组件，隔离重绘压力
const CountdownTimer = memo(({ unlockAt }: { unlockAt: number }) => {
  const [countdown, setCountdown] = useState(() => formatCountdown(unlockAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const next = formatCountdown(unlockAt);
      setCountdown(next);
      if (next === '已解锁') clearInterval(timer);
    }, 10000); // 10秒刷新一次即可，平衡性能与实时性
    return () => clearInterval(timer);
  }, [unlockAt]);

  return <span className="text-red-500 font-black">{countdown}</span>;
});

CountdownTimer.displayName = 'CountdownTimer';

// 记忆化信件项组件，防止不必要的重绘
const TimeLetterItem = memo(({ 
  letter, 
  targetCat, 
  isUnlocked,
  onDelete, 
  onClick
}: { 
  letter: TimeLetter; 
  targetCat?: CatInfo; 
  isUnlocked: boolean;
  onDelete: (e: React.MouseEvent, l: TimeLetter) => void;
  onClick: (l: TimeLetter) => void;
}) => {
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
      className="miao-card flex gap-4 group active:scale-[0.98] p-3 relative overflow-hidden will-change-transform"
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
              <p>距离解锁还有 <CountdownTimer unlockAt={letter.unlockAt} /></p>
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

function formatCountdown(unlockAt: number): string {
  const diff = unlockAt - Date.now();
  if (diff <= 0) return '已解锁';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
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
    const isUnlocked = Date.now() >= letter.unlockAt;
    if (isUnlocked) {
      setSelectedLetter(letter);
      setView('detail');
    } else {
      const unlockDate = new Date(letter.unlockAt);
      const month = unlockDate.getMonth() + 1;
      const date = unlockDate.getDate();
      triggerToast(`时光正在酿造这封信，请在 ${month} 月 ${date} 日后再来开启吧～`);
    }
  }, [triggerToast]);

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
    <div className="flex flex-col overflow-x-hidden">
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
        action={
          <button 
            onClick={() => setView('write')}
            className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
          >
            <Plus size={28} />
          </button>
        }
      />

      {/* 过滤器 */}
      {myCats.length > 0 && (
        <div className="px-6 mb-6 overflow-x-auto no-scrollbar flex items-center gap-3">
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

      <div className="px-6 pb-24 flex flex-col gap-6 min-h-[500px]">
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
              const isUnlocked = Date.now() >= letter.unlockAt;

              return (
                <TimeLetterItem
                  key={letter.id}
                  letter={letter}
                  isUnlocked={isUnlocked}
                  targetCat={targetCat}
                  onDelete={handleDeleteClick}
                  onClick={handleLetterClick}
                />
              );
            })
          )}
        </AnimatePresence>
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
        className="fixed inset-0 z-50 bg-on-primary-container flex flex-col overflow-y-auto"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* 猫咪 Banner */}
        <div className="relative h-64 shrink-0">
          <img 
            src={selectedLetter?.catAvatar || targetCat?.avatar || "https://picsum.photos/seed/cat/800/600"} 
            className="w-full h-full object-cover" 
            alt="" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-on-primary-container" />
          
          <header className="absolute top-8 left-8 right-8 flex items-center justify-between">
            <button onClick={() => setView('list')} className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white">
              <ArrowLeft size={24} />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-black text-white">时光回响</h1>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Echo from past</p>
            </div>
            <div className="w-12" />
          </header>

          <div className="absolute bottom-6 left-10">
            <p className="text-xs font-black text-white/60 uppercase tracking-widest mb-1">这是写给它的信</p>
            <h2 className="text-2xl font-black text-white">{targetCat?.name || "已离开的小猫"}</h2>
          </div>
        </div>

        <div className="flex-grow bg-background rounded-t-[56px] -mt-10 p-10 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3 text-primary/40">
                <Calendar size={20} />
                <span className="text-xs font-black tracking-widest uppercase">
                  写于 {new Date(selectedLetter?.createdAt || 0).toLocaleDateString()}
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-on-surface mb-6 text-center">
              {selectedLetter?.title || "时光回响"}
            </h2>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              <p className="text-xl text-on-surface leading-[2] font-serif italic whitespace-pre-wrap">
                {selectedLetter?.content}
              </p>
            </div>

            <div className="mt-12 pt-8 border-t border-outline-variant/30 flex flex-col items-center gap-2">
              <div className="w-12 h-1 bg-primary/20 rounded-full" />
              <p className="text-[10px] text-on-surface-variant/40 font-black uppercase tracking-[0.2em]">Miao Sanctuary</p>
            </div>
          </div>
        </div>

        <div className="py-12 text-center bg-background">
          <p className="text-on-surface-variant/40 text-xs font-bold leading-relaxed">这封信在时光中沉淀了很久，<br />希望能带给你温暖与力量。</p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full">
      {renderList()}
      <AnimatePresence>
        {view === 'write' && renderWrite()}
        {view === 'detail' && renderDetail()}
      </AnimatePresence>
    </div>
  );
}
