import React from "react";

interface PawLogoProps {
  size?: number;
  className?: string;
  id?: string;
}

export default function PawLogo({ size = 48, className = "", id = "paw-watercolor" }: PawLogoProps) {
  const filterId = `${id}-filter`;
  const gradientId = `${id}-gradient`;
  const strokeFilterId = `${id}-stroke-filter`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${className} overflow-visible`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 水彩晕染滤镜：模拟笔触边缘的粗糙感 */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* 描边滤镜：让黑边更有手绘的厚重不规则感 */}
        <filter id={strokeFilterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
        </filter>

        {/* 水彩橙色渐变 */}
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="45%" fy="45%">
          <stop offset="0%" stopColor="#F49D60" />
          <stop offset="60%" stopColor="#E87A3B" />
          <stop offset="100%" stopColor="#D46927" />
        </radialGradient>
      </defs>

      <g filter={`url(#${filterId})`}>
        {/* 大肉垫 - 使用路径模拟手绘不规则性 */}
        <path
          d="M50,85 C35,85 22,75 22,58 C22,45 35,42 50,42 C65,42 78,45 78,58 C78,75 65,85 50,85 Z"
          fill={`url(#${gradientId})`}
          stroke="#2C2C2C"
          strokeWidth="3.5"
          strokeLinejoin="round"
          filter={`url(#${strokeFilterId})`}
        />

        {/* 4个脚趾肉垫 */}
        {/* 左一 */}
        <ellipse
          cx="24"
          cy="42"
          rx="10"
          ry="14"
          transform="rotate(-25 24 42)"
          fill={`url(#${gradientId})`}
          stroke="#2C2C2C"
          strokeWidth="3.5"
          filter={`url(#${strokeFilterId})`}
        />
        {/* 左二 */}
        <ellipse
          cx="40"
          cy="28"
          rx="11"
          ry="16"
          transform="rotate(-5 40 28)"
          fill={`url(#${gradientId})`}
          stroke="#2C2C2C"
          strokeWidth="3.5"
          filter={`url(#${strokeFilterId})`}
        />
        {/* 右二 */}
        <ellipse
          cx="62"
          cy="28"
          rx="11"
          ry="16"
          transform="rotate(8 62 28)"
          fill={`url(#${gradientId})`}
          stroke="#2C2C2C"
          strokeWidth="3.5"
          filter={`url(#${strokeFilterId})`}
        />
        {/* 右一 */}
        <ellipse
          cx="78"
          cy="42"
          rx="10"
          ry="14"
          transform="rotate(28 78 42)"
          fill={`url(#${gradientId})`}
          stroke="#2C2C2C"
          strokeWidth="3.5"
          filter={`url(#${strokeFilterId})`}
        />
      </g>

      {/* 额外的纹理噪点，模拟水彩纸质感 */}
      <rect width="100" height="100" fill="transparent" style={{ mixBlendMode: 'overlay' }} opacity="0.3" pointerEvents="none" />
    </svg>
  );
}
