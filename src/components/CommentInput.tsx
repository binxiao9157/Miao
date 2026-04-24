import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send } from 'lucide-react';

interface CommentInputProps {
  isOpen: boolean;
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onClose: () => void;
  maxLength?: number;
  placeholder?: string;
}

export default function CommentInput({
  isOpen,
  value,
  onChange,
  onSend,
  onClose,
  maxLength = 100,
  placeholder = "发表你的温暖评论..."
}: CommentInputProps) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      
      // 计算键盘高度或由于键盘弹出导致的视口高度减小
      // window.innerHeight 是包含键盘的高度（在某些环境下）
      // viewport.height 是可见区域的高度
      const offset = window.innerHeight - viewport.height;
      setKeyboardOffset(Math.max(0, offset));
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
    
    // 初始执行一次
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // 极致自动聚焦逻辑
  useEffect(() => {
    if (isOpen) {
      // 第一次聚焦尝试（尽快缩短延迟）
      const focusTimer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // 在部分移动设备上，可能需要模拟点击或多次聚焦
          textareaRef.current.click();
        }
      }, 50);

      // 第二次兜底聚焦尝试（防止由于动画未完成导致的聚焦失效）
      const backupTimer = setTimeout(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 300);

      return () => {
        clearTimeout(focusTimer);
        clearTimeout(backupTimer);
      };
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="comment-modal" className="fixed inset-0 z-[1000] pointer-events-none">
          {/* 半透明遮罩层 - 点击关闭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
            onClick={onClose}
          />

          {/* 输入框组件 */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : 'max(20px, env(safe-area-inset-bottom))'
            }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: keyboardOffset > 0 ? 500 : 300, // 键盘弹出时更快
              bottom: { duration: 0.1 } // 底部偏移需要极其敏感
            }}
            className="absolute left-0 right-0 px-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`
              w-full max-w-lg mx-auto flex items-center gap-3 p-2 pl-6 
              bg-background/80 backdrop-blur-md rounded-full border border-white/50
              shadow-xl transition-shadow duration-300
              ${isFocused ? 'shadow-2xl ring-1 ring-primary/10' : ''}
            `}>
              <textarea
                ref={textareaRef}
                autoFocus
                rows={1}
                value={value}
                onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-grow py-3 bg-transparent border-none outline-none text-[#633E1D] font-bold placeholder:text-on-surface-variant/40 resize-none max-h-32 custom-scrollbar text-base"
                style={{ height: 'auto' }}
              />
              
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-black tabular-nums transition-colors ${
                  value.length >= maxLength ? 'text-red-500' : 'text-on-surface-variant/40'
                }`}>
                  {value.length}/{maxLength}
                </span>
                
                <button
                  onClick={onSend}
                  disabled={!value.trim()}
                  className={`
                    w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90
                    ${value.trim() ? 'bg-[#FFB677]/20 text-[#633E1D]' : 'bg-surface-container text-on-surface-variant/20'}
                  `}
                >
                  <Send size={20} className={value.trim() ? 'fill-current opacity-80' : ''} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
