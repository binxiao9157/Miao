import React, { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, Trash2, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DiaryEntry, FriendDiaryEntry } from "../services/storage";
import CommentItem from "./CommentItem";

import { mediaStorage } from "../services/mediaStorage";

interface DiaryCardProps {
  entry: DiaryEntry | FriendDiaryEntry;
  isFriend?: boolean;
  userAvatar?: string;
  userNickname?: string;
  onLike: (id: string) => void;
  onComment: (id: string | null) => void;
  onShare: (entry: DiaryEntry | FriendDiaryEntry) => void;
  onDelete?: (id: string | null) => void;
  onDeleteComment?: (diaryId: string, commentId: string) => void;
}

const DiaryCard: React.FC<DiaryCardProps> = ({
  entry,
  isFriend = false,
  userAvatar,
  userNickname,
  onLike,
  onComment,
  onShare,
  onDelete,
  onDeleteComment
}) => {
  const [displayMedia, setDisplayMedia] = useState<string | undefined>(entry.media);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setDisplayMedia(undefined);
    if (entry.media?.startsWith('indexeddb:')) {
      const mediaId = entry.media.split(':')[1];
      mediaStorage.getMedia(mediaId).then(data => {
        if (data) setDisplayMedia(data);
      });
    } else {
      setDisplayMedia(entry.media);
    }
  }, [entry.media]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const friendEntry = isFriend ? (entry as FriendDiaryEntry) : null;
  
  const avatar = isFriend ? friendEntry?.authorAvatar : userAvatar;
  const nickname = isFriend ? friendEntry?.authorNickname : userNickname;
  const date = new Date(entry.createdAt).toLocaleDateString();
  const timeStr = new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      id={entry.id}
      className="flex w-full py-5"
    >
      {/* 左侧：极简时间轴区 (固定宽度) */}
      <div className="w-[32px] flex flex-col items-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-[#FF9D76] mt-2 z-10"></div> {/* 极简小圆点，不要用复杂的猫爪图标 */}
      </div>

      {/* 右侧：沉浸式内容区 (占据剩余全部宽度) */}
      <div className="flex-1 pr-4 pb-2">
        
        {/* 1. 头部：作者与时间 (同行紧凑排列) */}
        <div className="flex items-center justify-between mb-2">
          {isFriend ? (
            <div className="flex items-center gap-2">
              <img 
                className="w-8 h-8 rounded-full object-cover" 
                src={avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=miao_default"} 
                referrerPolicy="no-referrer"
                alt="Avatar" 
              />
              <span className="text-sm font-bold text-[#5D4037]">{nickname || "喵星人"}</span>
              {friendEntry && (
                <span className="px-2 py-0.5 bg-[#FF9D76]/10 text-[#FF9D76] text-[8px] font-black rounded-full uppercase tracking-tighter shrink-0">
                  {friendEntry.catName}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-[#5D4037]/60">{timeStr}</span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {isFriend ? (
              <span className="text-xs text-[#5D4037]/40">{date}</span>
            ) : (
              !isFriend && onDelete && (
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="w-6 h-6 flex items-center justify-center text-[#5D4037]/40 hover:text-red-500 rounded-full transition-colors"
                  title="删除记录"
                >
                  <Trash2 size={14} />
                </button>
              )
            )}
          </div>
        </div>

        {/* 2. 核心媒体区：全宽大图 / 视频 (强制要求) */}
        {displayMedia && (
          <div 
            className="w-full mt-2 mb-3 overflow-hidden relative cursor-pointer group rounded-xl"
            onClick={entry.mediaType === 'video' ? togglePlay : undefined}
          >
            {entry.mediaType === 'video' ? (
              <>
                <video 
                  ref={videoRef}
                  src={displayMedia} 
                  playsInline
                  muted
                  loop
                  disablePictureInPicture
                  webkit-playsinline="true"
                  className="w-full object-cover rounded-xl" 
                  style={{ maxHeight: '400px' }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl"
                    >
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-xl">
                        <Play size={24} className="text-white fill-white ml-0.5" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <img 
                className="w-full object-cover rounded-xl" 
                style={{ maxHeight: '400px' }}
                src={displayMedia} 
                referrerPolicy="no-referrer"
                alt="Diary media" 
              />
            )}
          </div>
        )}

        {/* 3. 正文区 */}
        <p className="text-sm text-[#5D4037]/80 leading-relaxed mb-3 whitespace-pre-wrap">
          {entry.content}
        </p>

        {/* 4. 极简操作区 (点赞、评论、分享) */}
        <div className="flex items-center gap-6 text-[#5D4037]/40">
          <button 
            onClick={() => onLike(entry.id)}
            className={`flex items-center gap-1 hover:text-[#FF9D76] transition-colors ${entry.isLiked ? "text-red-500 font-bold" : ""}`}
          >
            <Heart size={16} fill={entry.isLiked ? "currentColor" : "none"} />
            <span className="text-xs">{entry.likes}</span>
          </button>
          <button 
            onClick={() => onComment(entry.id)}
            className="flex items-center gap-1 hover:text-[#FF9D76] transition-colors"
          >
            <MessageCircle size={16} />
            <span className="text-xs">{entry.comments.length}</span>
          </button>
          <button 
            onClick={() => onShare(entry)}
            className="flex items-center gap-1 hover:text-[#FF9D76] transition-colors ml-auto pr-2"
            title="分享"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* 5. 评论列表 */}
        {entry.comments.length > 0 && (
          <div className="mt-3 p-3 bg-[#5D4037]/5 rounded-xl space-y-1">
            {entry.comments.map((comment) => (
              <div key={comment.id} className="last:mb-0">
                {isFriend ? (
                  <div className="flex gap-1.5 px-1 py-0.5">
                    <span className="text-xs font-black text-[#5D4037] shrink-0">好友:</span>
                    <p className="text-xs text-[#5D4037]/80 font-medium leading-relaxed">{comment.content}</p>
                  </div>
                ) : (
                  <CommentItem
                    comment={comment}
                    diaryId={entry.id}
                    onDelete={onDeleteComment || (() => {})}
                  />
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default DiaryCard;
