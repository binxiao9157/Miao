import React from 'react';
import { motion } from 'motion/react';

interface FrostedGlassBubbleProps {
  text: string;
  bubbleId: number;
}

/**
 * 升级版的毛玻璃效果气泡组件 (FrostedGlassBubble)
 * 遵循视觉要求：背景模糊、半透明材质、边缘微光高光、柔和悬浮阴影
 */
export const FrostedGlassBubble: React.FC<FrostedGlassBubbleProps> = ({ text, bubbleId }) => {
  return (
    <motion.div
      key={bubbleId}
      initial={{ opacity: 0, x: -100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -50, scale: 0.9, transition: { duration: 0.3 } }}
      transition={{
        type: "spring",
        damping: 18,
        stiffness: 120,
        restDelta: 0.001
      }}
      className="absolute top-[22%] left-8 z-40 pointer-events-none"
    >
      <div className="relative group">
        {/* 背景模糊层 (BackdropFilter) 与 半透明材质填充 */}
        <div className="relative backdrop-blur-[10px] bg-white/30 px-8 py-4 rounded-full border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] min-w-[140px] flex items-center justify-center">
          
          {/* 文字内容：保证高对比度与可读性 */}
          <p className="text-base font-bold text-[#4A2E1B] tracking-wide text-center drop-shadow-sm">
            {text}
          </p>
          
          {/* 边缘微光线叠加 (额外的玻璃质感增强) */}
          <div className="absolute inset-0 rounded-full pointer-events-none border border-white/20" />
        </div>
        
        {/* 悬浮质感：额外的浅色光晖 */}
        <div className="absolute inset-0 -z-10 bg-white/5 blur-2xl rounded-full scale-150 opacity-50" />
      </div>
    </motion.div>
  );
};
