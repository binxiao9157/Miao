import React from 'react';

interface PawIconProps {
  size?: number;
  className?: string;
  fill?: string;
}

const PawIcon: React.FC<PawIconProps> = ({ size = 24, className = "", fill = "currentColor" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 掌垫 (Large pad) */}
      <path 
        d="M12 13C14.5 13 17.5 14.5 17.5 17.5C17.5 20.5 15 22 12 22C9 22 6.5 20.5 6.5 17.5C6.5 14.5 9.5 13 12 13Z" 
        fill={fill} 
      />
      {/* 4个脚趾 (4 Toe pads) */}
      <circle cx="6" cy="11" r="2.2" fill={fill} />
      <circle cx="10" cy="6.5" r="2.5" fill={fill} />
      <circle cx="15" cy="7.5" r="2.5" fill={fill} />
      <circle cx="19" cy="12" r="2.2" fill={fill} />
    </svg>
  );
};

export default PawIcon;
