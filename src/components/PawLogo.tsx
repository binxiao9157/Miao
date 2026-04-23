import React from "react";

interface PawLogoProps {
  size?: number;
  className?: string;
  id?: string;
}

export default function PawLogo({ size = 48, className = "" }: PawLogoProps) {
  const pawColor = "#4B3621";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${className} overflow-visible`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Paper/Felt texture filter matching the organic look of the image */}
        <filter id="felt-texture-refined" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
          <feDiffuseLighting in="noise" lightingColor="white" surfaceScale="0.8">
            <feDistantLight azimuth="45" elevation="55" />
          </feDiffuseLighting>
          <feComposite operator="in" in2="SourceGraphic" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>

        {/* Subtle edge softening to mimic the stamp/felt look in the image */}
        <filter id="edge-soften">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>
      
      <g filter="url(#felt-texture-refined)">
        <g filter="url(#edge-soften)">
          {/* Main Pad (Metacarpal Pad): 3-lobed organic shape based on attachment */}
          <path
            d="M 50,88 
               C 32,88 20,78 20,62 
               C 20,55 24,52 30,54 
               C 35,46 45,44 50,46 
               C 55,44 65,46 70,54 
               C 76,52 80,55 80,62 
               C 80,78 68,88 50,88 Z"
            fill={pawColor}
          />

          {/* Four Toe Pads (Digital Pads): Organic ovals based on attachment */}
          {/* Leftmost toe - tilted outwards */}
          <ellipse
            cx="18"
            cy="45"
            rx="9"
            ry="11"
            transform="rotate(-28 18 45)"
            fill={pawColor}
          />
          {/* Center-left toe - tall, large oval */}
          <ellipse
            cx="38"
            cy="24"
            rx="11"
            ry="15"
            transform="rotate(-5 38 24)"
            fill={pawColor}
          />
          {/* Center-right toe - tall, large oval */}
          <ellipse
            cx="64"
            cy="24"
            rx="11"
            ry="15"
            transform="rotate(6 64 24)"
            fill={pawColor}
          />
          {/* Rightmost toe - tilted outwards */}
          <ellipse
            cx="84"
            cy="42"
            rx="9.5"
            ry="11.5"
            transform="rotate(28 84 42)"
            fill={pawColor}
          />
        </g>
      </g>
    </svg>
  );
}
