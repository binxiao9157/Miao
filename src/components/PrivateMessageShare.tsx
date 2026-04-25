import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Check, Send } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: string;
  lastActive: string;
}

interface PrivateMessageShareProps {
  isOpen: boolean;
  onClose: () => void;
  diaryData: {
    id: string;
    title: string;
    imageUrl: string;
  };
  onSend: (selectedUserIds: string[], message: string) => void;
}

const MOCK_FRIENDS: Friend[] = [
  { id: '1', name: '小甜甜', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky', status: '昨天在线', lastActive: '2024-04-23' },
  { id: '2', name: '大橘为重', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kitty', status: '刚刚在线', lastActive: '2024-04-24' },
  { id: '3', name: '猫咪老师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo', status: '2小时前', lastActive: '2024-04-24' },
  { id: '4', name: '雪球', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Snow', status: '刚刚在线', lastActive: '2024-04-24' },
  { id: '5', name: '黑炭', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight', status: '昨天在线', lastActive: '2024-04-23' },
  { id: '6', name: '芝麻糊', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sesame', status: '刚刚在线', lastActive: '2024-04-24' },
  { id: '7', name: '奶油', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cream', status: '3天前', lastActive: '2024-04-21' },
];

export const PrivateMessageShare: React.FC<PrivateMessageShareProps> = ({ 
  isOpen, 
  onClose, 
  diaryData,
  onSend 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const filteredFriends = useMemo(() => {
    return MOCK_FRIENDS.filter(f => f.name.includes(searchQuery));
  }, [searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (selectedIds.length === 0) return;
    onSend(selectedIds, message);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[600] flex items-end justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-lg h-[90dvh] bg-background rounded-t-[32px] flex flex-col overflow-hidden text-on-surface font-sans"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b border-outline-variant/10">
              <button onClick={onClose} className="text-on-surface-variant text-base font-medium">取消</button>
              <h3 className="text-lg font-black tracking-tight text-on-surface">分享至</h3>
              <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
              {/* Search Bar */}
              <div className="px-5 py-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="搜索"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container border-none rounded-full py-3.5 pl-11 pr-5 text-sm font-medium focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/40 text-on-surface"
                  />
                </div>
              </div>

              {/* Quick Share (Horizontal) */}
              <div className="mb-6">
                <div className="px-5 mb-3 text-[11px] font-black text-on-surface-variant/60 uppercase tracking-widest">快捷分享</div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 py-2">
                  {MOCK_FRIENDS.slice(0, 7).map(friend => {
                    const isSelected = selectedIds.includes(friend.id);
                    return (
                      <button 
                        key={friend.id}
                        onClick={() => toggleSelect(friend.id)}
                        className="flex flex-col items-center gap-2 shrink-0 relative active:scale-95 transition-transform"
                      >
                        <div className="relative">
                          <div className={`w-14 h-14 rounded-full p-0.5 transition-all duration-300 ${isSelected ? 'bg-primary' : 'bg-transparent'}`}>
                             <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                               <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover bg-surface-container" />
                             </div>
                          </div>
                          {isSelected && (
                            <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                              <Check size={12} className="text-white" strokeWidth={4} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold transition-colors ${isSelected ? 'text-primary' : 'text-on-surface/60'}`}>{friend.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Chats List */}
              <div className="px-5">
                <div className="mb-4 text-[11px] font-black text-on-surface-variant/60 uppercase tracking-widest">最近聊天</div>
                <div className="space-y-1">
                  {filteredFriends.map(friend => {
                    const isSelected = selectedIds.includes(friend.id);
                    return (
                      <button 
                        key={friend.id}
                        onClick={() => toggleSelect(friend.id)}
                        className="w-full flex items-center justify-between py-3 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                             <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container">
                               <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                             </div>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-on-surface group-active:text-on-surface/60 transition-colors uppercase tracking-tight">{friend.name}</div>
                            <div className="text-[11px] text-on-surface-variant">{friend.status}</div>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-primary border-primary scale-110' : 'bg-transparent border-on-surface/10'}`}>
                          {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Floating Message Panel */}
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div
                  initial={{ y: 200, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 200, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute bottom-0 left-0 right-0 bg-surface border-t border-outline-variant/10 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] flex flex-col p-5 gap-4"
                >
                  {/* Selected Avatars Row */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-on-surface-variant/60">发送给:</span>
                    <div className="flex -space-x-2">
                       {selectedIds.slice(0, 5).map(id => {
                         const friend = MOCK_FRIENDS.find(f => f.id === id);
                         return (
                           <div key={id} className="w-7 h-7 rounded-full border-2 border-surface overflow-hidden bg-surface-container">
                             <img src={friend?.avatar} alt="" className="w-full h-full object-cover" />
                           </div>
                         );
                       })}
                       {selectedIds.length > 5 && (
                         <div className="w-7 h-7 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                           +{selectedIds.length - 5}
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Input and Preview */}
                  <div className="flex gap-4 bg-surface-container rounded-2xl p-3 border border-outline-variant/5">
                    <textarea 
                      placeholder="跟朋友说点什么吧..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-on-surface placeholder:text-on-surface-variant/40 h-16 pt-1"
                    />
                    <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden relative group shadow-sm">
                      <img src={diaryData.imageUrl} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent p-1 flex items-end">
                        <span className="text-[9px] font-bold text-white truncate w-full">{diaryData.title}</span>
                      </div>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button 
                    onClick={handleSend}
                    className="w-full bg-primary hover:opacity-90 text-white py-4 rounded-full font-black text-lg shadow-xl shadow-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    发送 {selectedIds.length > 0 && `(${selectedIds.length})`}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
