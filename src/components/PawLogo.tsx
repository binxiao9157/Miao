import React from 'react';

interface PawLogoProps {
  size?: number;
  className?: string;
  id?: string;
}

export default function PawLogo({ size = 48, className = "", id = "paw-logo" }: PawLogoProps) {
  return (
    <img
      id={id}
      src="/logo.png"
      alt="Miao Logo"
      width={size}
      height={size}
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}
