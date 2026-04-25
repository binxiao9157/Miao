import React from 'react';

interface PawLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export default function PawLogo({ size = 48, className = "", style, id = "paw-logo" }: PawLogoProps) {
  return (
    <img
      id={id}
      src="/logo.png"
      alt="Miao Logo"
      width={size}
      height={size}
      style={style}
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}
