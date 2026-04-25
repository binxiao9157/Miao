import React, { useState, useEffect, useRef } from 'react';
import { Copy, Trash2 } from 'lucide-react';

interface CommentItemProps {
  comment: { id: string; content: string };
  diaryId: string;
  onDelete: (diaryId: string, commentId: string) => void;
}

export default function CommentItem({ comment, diaryId, onDelete }: CommentItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const itemRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      setIsMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const handleLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      isTouchDevice.current = true;
    } else if (isTouchDevice.current) {
      return; // 触屏设备忽略 mouse 事件，防止双重触发
    }
    longPressTimer.current = setTimeout(() => {
      const rect = itemRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          top: rect.top - 50,
          left: rect.left + rect.width / 2,
        });
        setIsMenuOpen(true);
      }
    }, 500);
  };

  const clearTimer = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(comment.content);
    } catch (e) {
      console.error("Failed to copy to clipboard:", e);
    }
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    onDelete(diaryId, comment.id);
    setIsMenuOpen(false);
  };

  return (
    <div
      ref={itemRef}
      className={`relative px-2 py-0.5 rounded-lg transition-colors ${isMenuOpen ? 'bg-[#F2F2F2]' : ''}`}
      style={{ touchAction: 'pan-y' }}
      onMouseDown={handleLongPress}
      onMouseUp={clearTimer}
      onMouseLeave={clearTimer}
      onTouchStart={handleLongPress}
      onTouchEnd={clearTimer}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-[12px] font-black text-[#633E1D] shrink-0">我:</span>
        <p className="flex-1 text-[12px] text-on-surface-variant/90 font-medium leading-[1.4] break-words whitespace-pre-wrap">{comment.content}</p>
      </div>

      {isMenuOpen && (
        <div
          className="fixed z-[1000] bg-[#333] text-white text-xs rounded-lg shadow-lg flex items-center p-1"
          style={{ top: menuPosition.top, left: menuPosition.left, transform: 'translateX(-50%)' }}
        >
          <button onClick={handleCopy} className="flex items-center gap-1 px-3 py-2 hover:bg-[#444] rounded-md">
            <Copy size={14} /> 复制
          </button>
          <div className="w-px h-4 bg-[#555]" />
          <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 hover:bg-[#444] rounded-md text-red-400">
            <Trash2 size={14} /> 删除
          </button>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#333] rotate-45" />
        </div>
      )}
    </div>
  );
}
