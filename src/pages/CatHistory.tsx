import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Trash2, Sparkles, Plus } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { FileManager } from "../services/fileManager";
import { motion, AnimatePresence } from "motion/react";

export default function CatHistory() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<CatInfo[]>([]);

  useEffect(() => {
    setCats(FileManager.getHistory());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("确定要删除这条记录吗？")) {
      FileManager.deleteVideo(id);
      setCats(FileManager.getHistory());
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 pb-32">
      <header className="flex items-center mb-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">我的 AI 猫咪历史</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {cats.map((cat, index) => (
            <motion.div 
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/cat-player/${cat.id}`)}
              className="relative aspect-[3/4] bg-surface-container rounded-3xl overflow-hidden shadow-lg border border-outline-variant/30 group active:scale-95 transition-transform"
            >
              {/* 视频缩略图 (这里直接用视频 URL 模拟) */}
              <video 
                src={cat.videoPath} 
                className="w-full h-full object-cover"
                muted
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
              
              {/* 遮罩层 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              
              {/* 播放按钮 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
                  <Play size={24} fill="currentColor" />
                </div>
              </div>

              {/* 信息 */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-sm font-black truncate">{cat.name}</h3>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                  {new Date(parseInt(cat.id.split('_')[1])).toLocaleDateString()}
                </p>
              </div>

              {/* 删除按钮 */}
              <button 
                onClick={(e) => handleDelete(e, cat.id)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-md text-white/60 rounded-full flex items-center justify-center hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 添加新猫咪卡片 */}
        <button 
          onClick={() => navigate("/upload-material")}
          className="aspect-[3/4] rounded-3xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-3 text-on-surface-variant/40 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center">
            <Plus size={24} />
          </div>
          <span className="text-xs font-bold">生成新猫咪</span>
        </button>
      </div>

      {cats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
            <Sparkles size={40} />
          </div>
          <h3 className="text-xl font-black text-on-surface mb-2">还没有生成记录</h3>
          <p className="text-sm text-on-surface-variant max-w-[200px]">快去上传照片，生成您的第一个 AI 猫咪吧！</p>
        </div>
      )}
    </div>
  );
}
