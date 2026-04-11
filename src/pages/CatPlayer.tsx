import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Download, Trash2, Heart, Share2, AlertCircle } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import { FileManager } from "../services/fileManager";
import { motion, AnimatePresence } from "motion/react";

export default function CatPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const list = storage.getCatList();
    const found = list.find(c => c.id === id);
    if (found) {
      setCat(found);
      setVideoAspectRatio(null);
    } else {
      setErrorDetails("找不到该猫咪的数据记录");
      navigate("/");
    }

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      // 显式释放视频资源，防止内存泄漏
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.src = "";
          videoRef.current.load();
        } catch (e) {
          console.warn("视频清理时出错:", e);
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
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(null), 3000);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    FileManager.deleteVideo(id!);
    navigate("/cat-history");
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = videoRef.current;
    let errorMsg = "视频加载失败";
    
    if (videoElement && videoElement.error) {
      const code = videoElement.error.code;
      const message = videoElement.error.message;
      switch (code) {
        case 1: errorMsg = "视频加载被中止 (Aborted)"; break;
        case 2: errorMsg = "网络错误，无法下载视频 (Network Error)"; break;
        case 3: errorMsg = "视频解码失败 (Decode Error)"; break;
        case 4: errorMsg = "视频格式不支持或链接失效 (Source Not Supported)"; break;
      }
    }

    setErrorDetails(errorMsg);
    setIsLoading(false);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
    setErrorDetails(null);
  };

  if (!cat) return null;

  return (
    <div className="edge-to-edge bg-black relative overflow-hidden flex flex-col">
      {/* 错误提示 */}
      <AnimatePresence>
        {errorDetails && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container rounded-[32px] p-8 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-on-surface mb-2">视频加载失败</h3>
              <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
                网络波动或视频文件暂时无法访问，请重试。<br/>
                <span className="text-[10px] opacity-50 block mt-2 font-mono break-all">{errorDetails}</span>
                <span className="text-[8px] opacity-30 block mt-2 font-mono break-all">URL: {cat.videoPath}</span>
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl active:scale-95 transition-transform"
                >
                  重试
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-4 bg-surface-container-highest text-on-surface font-black rounded-2xl active:scale-95 transition-transform"
                >
                  返回首页
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
      {/* 顶部栏 - 适配安全区 */}
      <header 
        className="absolute left-0 right-0 z-30 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
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
        className="flex-grow flex items-center justify-center relative bg-black overflow-hidden"
        onClick={togglePlay}
      >
        {/* 背景补位：使用模糊的头像或视频首帧填充 */}
        <div className="absolute inset-0 z-0">
          <img 
            src={cat.avatar || `https://picsum.photos/seed/${cat.breed}/1080/1920`} 
            alt="" 
            className="w-full h-full object-cover opacity-30 blur-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <video 
          ref={videoRef}
          src={cat.videoPaths?.idle || cat.videoPaths?.petting || cat.videoPath || cat.remoteVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.videoWidth && video.videoHeight) {
              setVideoAspectRatio(video.videoWidth / video.videoHeight);
            }
          }}
          className={`relative z-10 w-full h-full transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${
            videoAspectRatio && videoAspectRatio >= 1 
              ? 'object-contain' 
              : 'object-cover'
          }`}
          onPlay={() => {
            setIsPlaying(true);
            setIsLoading(false);
          }}
          onPause={() => setIsPlaying(false)}
          onCanPlay={() => {
            setIsLoading(false);
            setErrorDetails(null);
          }}
          onError={handleVideoError}
        />

        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"
            />
          </div>
        )}

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
