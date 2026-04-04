import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Download, Trash2, Heart, Share2 } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { FileManager } from "../services/fileManager";
import { motion, AnimatePresence } from "motion/react";

export default function CatPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    const list = storage.getCatList();
    const found = list.find(c => c.id === id);
    if (found) {
      setCat(found);
    } else {
      navigate("/");
    }

    return () => {
      // 显式释放视频资源，防止内存泄漏
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.src = "";
          videoRef.current.load();
        } catch (e) {
          // 忽略清理过程中的错误
        }
      }
    };
  }, [id, navigate]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSaveToAlbum = () => {
    if (!cat?.videoPath) return;
    
    // 在 Web 环境下，我们通过下载 Blob 来模拟 "保存到相册"
    const link = document.createElement('a');
    link.href = cat.videoPath;
    link.download = `${cat.name}_${cat.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowToast("视频已开始下载到您的设备");
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    FileManager.deleteVideo(id!);
    navigate("/cat-history");
  };

  if (!cat) return null;

  return (
    <div className="h-screen bg-black relative overflow-hidden flex flex-col">
      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container rounded-[32px] p-8 shadow-2xl border border-outline-variant/30"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-on-surface text-center mb-2">确定要删除吗？</h3>
              <p className="text-sm text-on-surface-variant text-center mb-8">
                删除后将无法找回这个猫咪视频，确定要继续吗？
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-4 bg-surface-container-highest text-on-surface font-black text-sm rounded-2xl active:scale-95 transition-transform"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="py-4 bg-red-500 text-white font-black text-sm rounded-2xl active:scale-95 transition-transform shadow-lg shadow-red-500/20"
                >
                  确定删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast 提示 */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-white text-black rounded-full shadow-xl font-bold text-sm"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* 顶部栏 */}
      <header className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => navigate("/")} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-white font-black text-lg">{cat.name}</h1>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">AI 生成数字形象</p>
        </div>
        <div className="w-10" /> {/* 占位 */}
      </header>

      {/* 视频播放器 */}
      <div 
        className="flex-grow flex items-center justify-center relative"
        onClick={togglePlay}
      >
        <video 
          ref={videoRef}
          src={cat.videoPath}
          autoPlay
          loop
          playsInline
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* 播放/暂停指示器 */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                <Play size={40} fill="currentColor" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部操作栏 */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-8 pt-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-grow">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-4 py-1 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                {cat.breed}
              </div>
              <div className="text-white/60 text-xs font-bold">
                生成于 {new Date(parseInt(cat.id.split('_')[1])).toLocaleDateString()}
              </div>
            </div>
            <p className="text-white text-sm font-medium leading-relaxed opacity-90">
              这是您的专属 AI 猫咪，它会永远陪伴在您身边喵~ ✨
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
                <Heart size={24} />
              </div>
              <span className="text-[10px] text-white font-bold">喜欢</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
                <Share2 size={24} />
              </div>
              <span className="text-[10px] text-white font-bold">分享</span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4">
          <button 
            onClick={handleSaveToAlbum}
            className="flex items-center justify-center gap-2 py-4 bg-white text-black rounded-full font-black text-sm active:scale-95 transition-transform"
          >
            <Download size={18} />
            保存到相册
          </button>
          <button 
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 py-4 bg-red-500/20 backdrop-blur-md text-red-500 rounded-full font-black text-sm border border-red-500/30 active:scale-95 transition-transform"
          >
            <Trash2 size={18} />
            删除记录
          </button>
        </div>
      </div>
    </div>
  );
}
