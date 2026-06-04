import { useState, useEffect } from "react";
import { mediaStorage } from "../services/mediaStorage";

interface ImageWithDbSourceProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export function ImageWithDbSource({ src, className, style, alt = "Image" }: ImageWithDbSourceProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (src.startsWith("indexeddb:")) {
      const mediaId = src.split(":")[1];
      mediaStorage.getMedia(mediaId)
        .then((data) => {
          if (data) {
            setDataUrl(data);
          }
        })
        .catch((err) => {
          console.error("Failed to load indexeddb image:", err);
        });
    } else {
      setDataUrl(src);
    }
  }, [src]);

  if (!dataUrl) {
    return (
      <div 
        className={`${className} bg-[#5D4037]/5 animate-pulse flex items-center justify-center`}
        style={style}
      >
        <div className="w-4 h-4 rounded-full border-2 border-[#FF9D76]/40 border-t-[#FF9D76] animate-spin"></div>
      </div>
    );
  }

  return (
    <img 
      src={dataUrl} 
      className={className} 
      style={style} 
      alt={alt} 
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}

interface DiaryImageGridProps {
  images: string[];
  onImageClick: (index: number) => void;
}

export default function DiaryImageGrid({ images, onImageClick }: DiaryImageGridProps) {
  if (!images || images.length === 0) return null;

  const count = images.length;

  if (count === 1) {
    return (
      <div 
        className="w-full mt-2 mb-3 overflow-hidden rounded-xl cursor-pointer max-w-[85%]"
        onClick={() => onImageClick(0)}
      >
        <ImageWithDbSource 
          src={images[0]} 
          className="w-full object-cover rounded-xl hover:scale-[1.02] transition-transform duration-300"
          style={{ maxHeight: '300px' }}
        />
      </div>
    );
  }

  // 2 or 4 images: 2-column layout. 4 images is specifically 2x2.
  if (count === 2 || count === 4) {
    const gridClass = count === 4 
      ? "grid grid-cols-2 gap-1.5 mt-2 mb-3 w-[70%] sm:w-[60%]" 
      : "grid grid-cols-2 gap-1.5 mt-2 mb-3 w-full";

    return (
      <div className={gridClass}>
        {images.map((src, idx) => (
          <div 
            key={idx} 
            className="aspect-square w-full overflow-hidden rounded-xl cursor-pointer"
            onClick={() => onImageClick(idx)}
          >
            <ImageWithDbSource 
              src={src} 
              className="w-full h-full object-cover rounded-xl hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    );
  }

  // 3, 5, 6, 7, 8, 9 images: 3-column layout
  return (
    <div className="grid grid-cols-3 gap-1.5 mt-2 mb-3 w-full">
      {images.map((src, idx) => (
        <div 
          key={idx} 
          className="aspect-square w-full overflow-hidden rounded-xl cursor-pointer"
          onClick={() => onImageClick(idx)}
        >
          <ImageWithDbSource 
            src={src} 
            className="w-full h-full object-cover rounded-xl hover:scale-105 transition-transform duration-300"
          />
        </div>
      ))}
    </div>
  );
}
