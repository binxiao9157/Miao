import { useState, useEffect } from "react";
import { Plus, Lock, Unlock, ArrowLeft, Calendar, Send } from "lucide-react";
import { storage, TimeLetter } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";

type ViewState = 'list' | 'write' | 'detail';

export default function TimeLetters() {
  const [letters, setLetters] = useState<TimeLetter[]>([]);
  const [view, setView] = useState<ViewState>('list');
  const [selectedLetter, setSelectedLetter] = useState<TimeLetter | null>(null);
  
  // Write state
  const [content, setContent] = useState("");
  const [days, setDays] = useState(1);

  useEffect(() => {
    setLetters(storage.getTimeLetters());
  }, []);

  const handleSaveLetter = () => {
    if (!content.trim()) return;

    const newLetter: TimeLetter = {
      id: 'letter_' + Date.now(),
      content,
      createdAt: Date.now(),
      unlockAt: Date.now() + (days * 24 * 60 * 60 * 1000),
    };

    const updated = [newLetter, ...letters];
    setLetters(updated);
    storage.saveTimeLetters(updated);
    
    // Reset
    setContent("");
    setDays(1);
    setView('list');
  };

  const handleLetterClick = (letter: TimeLetter) => {
    const isUnlocked = Date.now() >= letter.unlockAt;
    if (isUnlocked) {
      setSelectedLetter(letter);
      setView('detail');
    } else {
      const daysLeft = Math.ceil((letter.unlockAt - Date.now()) / (1000 * 60 * 60 * 24));
      alert(`时间未到喵～ 还有 ${daysLeft} 天才能开启这封信。`);
    }
  };

  const renderList = () => (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-outline-variant/30">
        <h1 className="text-2xl font-black tracking-tight text-on-surface">时光信件</h1>
        <button 
          onClick={() => setView('write')}
          className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="p-6 space-y-4">
        {letters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <div className="w-20 h-20 bg-outline-variant rounded-full flex items-center justify-center mb-4">
              <Calendar size={32} />
            </div>
            <p className="text-sm font-medium">还没有写过信，给未来的自己留句话吧</p>
          </div>
        ) : (
          letters.map((letter) => {
            const isUnlocked = Date.now() >= letter.unlockAt;
            const daysLeft = Math.ceil((letter.unlockAt - Date.now()) / (1000 * 60 * 60 * 24));
            
            return (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={letter.id}
                onClick={() => handleLetterClick(letter)}
                className={`p-6 rounded-3xl border transition-all active:scale-95 ${
                  isUnlocked 
                    ? "bg-white border-primary/20 shadow-sm" 
                    : "bg-surface-container-low border-transparent opacity-80"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isUnlocked ? "bg-primary/10 text-primary" : "bg-outline-variant/20 text-on-surface-variant"}`}>
                    {isUnlocked ? <Unlock size={24} /> : <Lock size={24} />}
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant opacity-50">
                    {new Date(letter.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className={`font-bold mb-1 ${isUnlocked ? "text-on-surface" : "text-on-surface-variant"}`}>
                  {isUnlocked ? "一封已开启的信件" : "封存中的信件"}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {isUnlocked 
                    ? "点击阅读信件内容..." 
                    : `封存中，${daysLeft} 天后解锁`}
                </p>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderWrite = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background p-6 flex flex-col"
    >
      <header className="flex items-center mb-8">
        <button onClick={() => setView('list')} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">写给未来</h1>
      </header>

      <div className="flex-grow space-y-8">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">信件内容</label>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你想对未来自己或猫咪说的话..."
            className="w-full h-64 p-6 bg-white rounded-[32px] border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          />
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">封存时长 (天)</label>
          <div className="flex items-center gap-4">
            {[1, 3, 7, 30, 100].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-grow py-3 rounded-2xl font-bold text-sm transition-all ${
                  days === d ? "bg-primary text-white shadow-lg" : "bg-white text-on-surface-variant"
                }`}
              >
                {d}天
              </button>
            ))}
          </div>
          <input 
            type="range" 
            min="1" 
            max="365" 
            value={days} 
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <p className="text-center text-sm font-bold text-primary">{days} 天后开启</p>
        </div>
      </div>

      <button 
        onClick={handleSaveLetter}
        disabled={!content.trim()}
        className="mt-8 w-full py-5 bg-primary text-white rounded-full font-bold text-lg shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
      >
        <Send size={20} />
        封存信件
      </button>
    </motion.div>
  );

  const renderDetail = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-primary p-6 flex flex-col"
    >
      <header className="flex items-center mb-12">
        <button onClick={() => setView('list')} className="p-2 -ml-2 text-white/80">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white ml-2">时光回响</h1>
      </header>

      <div className="flex-grow bg-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary/40 mb-8">
            <Calendar size={16} />
            <span className="text-xs font-bold tracking-widest uppercase">
              写于 {new Date(selectedLetter?.createdAt || 0).toLocaleDateString()}
            </span>
          </div>
          
          <p className="text-lg text-on-surface leading-loose whitespace-pre-wrap font-serif italic">
            {selectedLetter?.content}
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-white/60 text-xs font-medium">这封信在时光中沉淀了很久，希望能带给你温暖。</p>
      </div>
    </motion.div>
  );

  return (
    <div className="h-full">
      {view === 'list' && renderList()}
      {view === 'write' && renderWrite()}
      {view === 'detail' && renderDetail()}
    </div>
  );
}
