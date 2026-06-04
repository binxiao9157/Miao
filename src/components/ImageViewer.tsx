import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithDbSource } from "./DiaryImageGrid";

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    // Disable background page scrolling when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || touchStartY === null) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStart - touchEnd;
    const diffY = touchStartY - touchEndY;

    // Detect swipe down of substantial distance to close
    if (diffY < -100 && Math.abs(diffY) > Math.abs(diffX)) {
      onClose();
      return;
    }

    // Detect swipe left/right for next/previous image
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    setTouchStart(null);
    setTouchStartY(null);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-[9999] flex flex-col justify-between select-none touch-none"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header - Page Indicator */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 text-white/90 relative z-10 w-full" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        <button 
          onClick={onClose}
          className="p-2 -mr-2 text-white/80 hover:text-white transition-colors"
          title="关闭"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Image Slideshow Container */}
      <div className="flex-1 flex items-center justify-center relative px-2 overflow-hidden">
        {/* Left Arrow Button (Desktop / Larger screen helpful fallback) */}
        {currentIndex > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 z-10 w-10 h-10 bg-black/30 hover:bg-black/50 border border-white/10 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors hidden sm:flex"
            title="上一张"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Dynamic transition slide wrapper */}
        <div className="w-full max-h-[80vh] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full flex items-center justify-center max-w-full"
            >
              <ImageWithDbSource 
                src={images[currentIndex]} 
                className="max-w-full max-h-[75vh] object-contain pointer-events-none"
                alt={`Image ${currentIndex + 1}`}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow Button (Desktop / Larger screen helpful fallback) */}
        {currentIndex < images.length - 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-4 z-10 w-10 h-10 bg-black/30 hover:bg-black/50 border border-white/10 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors hidden sm:flex"
            title="下一张"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Footer Tip */}
      <div className="text-center pb-8 text-xs text-white/30 tracking-wide pointer-events-none">
        左右滑动切换 · 下滑或点击任意处关闭
      </div>
    </div>
  );
}
