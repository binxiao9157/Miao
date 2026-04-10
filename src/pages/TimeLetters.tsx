import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Lock, Unlock, ArrowLeft, Calendar, Send, Clock, ChevronRight } from "lucide-react";
import { storage, TimeLetter } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";

type ViewState = 'list' | 'write' | 'detail';

export default function TimeLetters() {
  const location = useLocation();
  const [letters, setLetters] = useState<TimeLetter[]>(() => storage.getTimeLetters());
  const [view, setView] = useState<ViewState>('list');
  const [selectedLetter, setSelectedLetter] = useState<TimeLetter | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  
  // Write state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [days, setDays] = useState(1);

  // keep-alive：路由激活时静默刷新数据
  useEffect(() => {
    if (location.pathname === '/time-letters') {
      setLetters(storage.getTimeLetters());
    }
  }, [location.pathname]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSaveLetter = () => {
    if (!title.trim()) {
      triggerToast("请先输入信件标题哦");
      return;
    }
    if (!content.trim()) return;

    // 归一化日期逻辑：当前日期凌晨 + X天
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    const unlockAt = targetDate.getTime() + (days * 24 * 60 * 60 * 1000);

    const newLetter: TimeLetter = {
      id: 'letter_' + Date.now(),
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
  };

  const handleLetterClick = (letter: TimeLetter) => {
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
  };

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

      <div className="px-6 space-y-6">
        {letters.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
              <Clock size={40} />
            </div>
            <h3 className="text-xl font-black text-on-surface mb-2">还没有信件</h3>
            <p className="text-sm text-on-surface-variant max-w-[200px]">写一封信给未来的自己，让时光见证温暖</p>
          </motion.div>
        ) : (
          letters.map((letter, index) => {
            const now = Date.now();
            const isUnlocked = now >= letter.unlockAt;
            
            // 计算剩余天数：目标日期凌晨 - 当前日期凌晨
            const targetStart = new Date(letter.unlockAt).setHours(0,0,0,0);
            const nowStart = new Date(now).setHours(0,0,0,0);
            const daysLeft = Math.max(0, Math.ceil((targetStart - nowStart) / (1000 * 60 * 60 * 24)));
            
            const unlockDateStr = new Date(letter.unlockAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '/');

            return (
              <div 
                key={letter.id}
                onClick={() => handleLetterClick(letter)}
                className={`miao-card flex items-center gap-6 group active:scale-[0.98] transition-all ${!isUnlocked && 'opacity-70 grayscale-[0.5]'}`}
              >
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 ${isUnlocked ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant/40"}`}>
                  {isUnlocked ? <Unlock size={28} /> : <Lock size={28} />}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className="text-lg font-black text-on-surface truncate flex-1">
                      {letter.title || (isUnlocked ? "时光回响" : "封存中")}
                    </h3>
                    <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest shrink-0">
                      {new Date(letter.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className={`text-sm text-on-surface-variant font-medium ${isUnlocked ? 'line-clamp-1' : ''}`}>
                      {isUnlocked 
                        ? letter.content 
                        : `距离解锁还有 ${daysLeft} 天`}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/30 font-bold">
                      解锁日期：{unlockDateStr}
                    </p>
                  </div>
                </div>
                
                <ChevronRight className="text-on-surface-variant/20 group-hover:text-primary transition-colors shrink-0" />
              </div>
            );
          })
        )}
      </div>
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
        <header className="flex items-center justify-between mb-12 pt-4">
          <button onClick={() => setView('list')} className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black text-on-surface">写给未来</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Write to future</p>
          </div>
          <div className="w-12" />
        </header>

        <div className="space-y-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-2">信件标题</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给未来的信起个题目吧..."
                className="w-full p-6 bg-surface-container rounded-3xl border-none outline-none text-xl font-black text-on-surface placeholder:text-on-surface-variant/30"
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
            
            <div className="px-2">
              <input 
                type="range" 
                min="1" 
                max="365" 
                value={days} 
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
              />
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

  const renderDetail = () => (
    <motion.div 
      key="detail"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-on-primary-container p-8 pb-32 flex flex-col overflow-y-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header className="flex items-center justify-between mb-12 pt-4">
        <button onClick={() => setView('list')} className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white/80">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black text-white">时光回响</h1>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Echo from past</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex-grow bg-background rounded-[56px] p-10 shadow-2xl relative overflow-hidden flex flex-col">
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

      <div className="mt-12 text-center">
        <p className="text-white/40 text-xs font-bold leading-relaxed">这封信在时光中沉淀了很久，<br />希望能带给你温暖与力量。</p>
      </div>
    </motion.div>
  );

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
