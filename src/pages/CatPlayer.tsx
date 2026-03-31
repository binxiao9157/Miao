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

  useEffect(() => {
    const list = storage.getCatList();
    const found = list.find(c => c.id === id);
    if (found) {
      setCat(found);
    } else {
      navigate("/");
    }
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
    
    alert("视频已开始下载到您的设备");
  };

  const handleDelete = () => {
    if (window.confirm("确定要删除这个猫咪视频吗？")) {
      FileManager.deleteVideo(id!);
      navigate("/cat-history");
    }
  };

  if (!cat) return null;

  return (
    <div className="h-screen bg-black relative overflow-hidden flex flex-col">
      {/* 顶部栏 */}
      <header className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white">
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
