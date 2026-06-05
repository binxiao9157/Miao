import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Trash2, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";
import { storage, FriendInfo, CatInfo } from "../services/storage";
import { mockFriendService } from "../services/mockFriendService";

export default function FriendManage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [cats, setCats] = useState<CatInfo[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendInfo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let currentFriends = storage.getFriends();
    if (currentFriends.length === 0) {
      mockFriendService.initializeMockData();
      currentFriends = storage.getFriends();
    }
    setFriends(currentFriends);
    setCats(storage.getCatList());
  }, []);

  const formatPermissionText = (visibleCatsList: string[] | undefined) => {
    if (cats.length === 0) return "不可见任何猫咪";
    const actualVisibleIds = visibleCatsList ?? cats.map(c => c.id);
    const visibleList = cats.filter(c => actualVisibleIds.includes(c.id));
    
    if (visibleList.length === 0) {
      return "不可见任何猫咪";
    }
    const firstCatName = visibleList[0].name;
    if (visibleList.length === 1) {
      return `可见: ${firstCatName}`;
    }
    return `可见: ${firstCatName} 等${visibleList.length}只`;
  };

  const handleToggleCat = (catId: string) => {
    if (!selectedFriend) return;
    const currentList = selectedFriend.visibleCats ?? cats.map(c => c.id);
    const nextList = currentList.includes(catId)
      ? currentList.filter(id => id !== catId)
      : [...currentList, catId];
    
    const updatedFriend = { ...selectedFriend, visibleCats: nextList };
    setSelectedFriend(updatedFriend);

    const updatedFriends = friends.map(f => f.id === selectedFriend.id ? updatedFriend : f);
    setFriends(updatedFriends);
    storage.saveFriends(updatedFriends);
  };

  const handleDeleteFriend = () => {
    if (!selectedFriend) return;
    const updatedFriends = friends.filter(f => f.id !== selectedFriend.id);
    setFriends(updatedFriends);
    storage.saveFriends(updatedFriends);
    setSelectedFriend(null);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="h-dvh bg-[#FFF9F5] flex flex-col overflow-hidden">
      <PageHeader 
        title="好友管理" 
        subtitle="FRIEND MANAGEMENT" 
        onBack={() => navigate(-1)} 
      />

      <main className="flex-1 overflow-y-auto px-6 pb-24 space-y-4 no-scrollbar">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-white shadow-xs rounded-full flex items-center justify-center mb-4 border border-[#5D4037]/10">
              <Users className="w-10 h-10 text-[#5D4037]/30" />
            </div>
            <p className="text-sm font-bold text-[#5D4037]/50">目前还没有添加好友哦</p>
            <button 
              onClick={() => navigate("/scan-friend")}
              className="mt-6 px-6 py-3 bg-[#FF9D76] text-white rounded-2xl font-black text-sm active:scale-95 transition-transform shadow-md shadow-[#FF9D76]/25"
            >
              扫码加好友
            </button>
          </div>
        ) : (
          friends.map(friend => (
            <div 
              key={friend.id} 
              className="w-full p-5 bg-white rounded-[28px] shadow-xs border border-[#5D4037]/10 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <img 
                    src={friend.avatar} 
                    alt={friend.nickname} 
                    className="w-12 h-12 rounded-full object-cover bg-[#FFF9F5] border border-[#5D4037]/10"
                    referrerPolicy="no-referrer"
                  />
                  <img 
                    src={friend.catAvatar} 
                    alt={friend.catName} 
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-white object-cover shadow-xs bg-white"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#5D4037] truncate">{friend.nickname}</p>
                  <p className="text-[11px] text-[#5D4037]/50 font-bold mt-1">
                    {formatPermissionText(friend.visibleCats)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFriend(friend)}
                className="px-4 py-2 bg-[#FF9D76]/10 hover:bg-[#FF9D76]/20 text-[#FF9D76] rounded-full flex items-center gap-1.5 active:scale-95 transition-all text-xs font-black border border-[#FF9D76]/20"
              >
                <Settings size={13} />
                <span>设置</span>
              </button>
            </div>
          ))
        )}
      </main>

      {/* Drawer Panel */}
      <AnimatePresence>
        {selectedFriend && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFriend(null)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            
            {/* Slide up Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#FFF9F5] rounded-t-[32px] p-6 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] max-h-[85dvh] flex flex-col"
            >
              {/* Grab Handle */}
              <div className="w-12 h-1.5 bg-[#5D4037]/15 rounded-full mx-auto mb-4 shrink-0" />

              {/* Title Header */}
              <div className="text-center mb-6 shrink-0">
                <h3 className="text-lg font-black text-[#5D4037] flex items-center justify-center gap-2">
                  猫咪可见权限控制
                </h3>
                <p className="text-xs text-[#5D4037]/60 font-bold mt-1.5">
                  设置 【{selectedFriend.nickname}】 对你的猫咪查看权限
                </p>
              </div>

              {/* Scrollable list of user's cats */}
              <div className="flex-grow overflow-y-auto no-scrollbar pr-1">
                <div className="space-y-3 mb-6">
                  <p className="text-[10px] font-black text-[#5D4037]/45 tracking-[0.2em] ml-2 uppercase">猫咪伙伴列表</p>
                  {cats.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-[#5D4037]/10">
                      <p className="text-xs text-[#5D4037]/50 font-bold">暂无猫咪，先前往首页创建吧！</p>
                    </div>
                  ) : (
                    cats.map(cat => {
                      const visibleIds = selectedFriend.visibleCats ?? cats.map(c => c.id);
                      const isChecked = visibleIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleToggleCat(cat.id)}
                          className="w-full p-4 bg-white rounded-2xl shadow-xs border border-[#5D4037]/5 flex items-center justify-between gap-4 text-left active:scale-[0.98] transition-transform"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={cat.avatar} 
                              alt={cat.name} 
                              className="w-10 h-10 rounded-xl object-cover bg-[#FFF9F5] shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="text-sm font-black text-[#5D4037]">{cat.name}</p>
                              <p className="text-[10px] text-[#5D4037]/40 font-bold mt-0.5">{cat.breed || "未知品种"}</p>
                            </div>
                          </div>
                          
                          {/* Beautiful Custom Toggle Switch */}
                          <span className={`w-12 h-7 rounded-full shrink-0 p-1 transition-colors ${isChecked ? "bg-[#FF9D76]" : "bg-[#5D4037]/15"}`}>
                            <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${isChecked ? "translate-x-5" : "translate-x-0"}`} />
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dangerous Area */}
              <div className="pt-4 border-t border-[#5D4037]/10 shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-4 bg-red-50 hover:bg-red-100/50 text-red-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Trash2 size={16} />
                  <span>解除好友关系</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && selectedFriend && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl text-center border border-[#5D4037]/10"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">解除好友？</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                确定要解除与 【{selectedFriend.nickname}】 的好友关系吗？解除后对方将无法查看任何共享瞬间。
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteFriend}
                  className="w-full py-3 bg-red-500 text-white rounded-2xl font-black active:scale-95 transition-transform"
                >
                  确定解除
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3 bg-gray-100 text-[#5D4037]/75 rounded-2xl font-black active:scale-95 transition-transform"
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
}
