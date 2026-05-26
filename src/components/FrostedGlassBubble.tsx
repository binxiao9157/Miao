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
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{
        type: "spring",
        damping: 18,
        stiffness: 120,
        restDelta: 0.001
      }}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex justify-center w-max max-w-[85%]"
    >
      <div className="relative group">
        {/* 50% 缩小的 背景模糊层 (BackdropFilter) 与 半透明材质填充 */}
        <div className="relative backdrop-blur-[10px] bg-white/30 px-4 py-2 rounded-full border border-white/40 shadow-[0_10px_25px_rgba(0,0,0,0.1)] min-w-[70px] flex items-center justify-center">
          
          {/* 文字内容：同比例缩小50%至10px (原 text-base 为 16px) */}
          <p className="text-[10px] font-bold text-[#4A2E1B] tracking-wide text-center drop-shadow-sm leading-tight">
            {text}
          </p>
          
          {/* 边缘微光线叠加 (50% 比例增强过的小巧边框) */}
          <div className="absolute inset-0 rounded-full pointer-events-none border border-white/20" />
        </div>
        
        {/* 悬浮质感：同比例缩小50%的浅色光晖 */}
        <div className="absolute inset-0 -z-10 bg-white/5 blur-xl rounded-full scale-110 opacity-50" />
      </div>
    </motion.div>
  );
};
