import React, { useState, useEffect } from "react";

const SplashScreen: React.FC = () => {
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Preload the splash image to ensure it shows immediately and doesn't flicker
    const img = new Image();
    img.src = "/splash.png";
    img.onload = () => {
      setIsLoaded(true);
    };
    // Fallback if image fails to load or takes too long, we still want to show the app
    const fallback = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Stage 1: Display for a shorter duration (1.5s) to feel snappier
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1500);

    // Stage 2: After 0.6s of fading (total 2.1s), completely unmount
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [isLoaded]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-opacity duration-600 ease-out ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ display: isVisible ? "flex" : "none" }}
    >
      {isLoaded && (
        <img
          src="/splash.png"
          alt="Splash Screen"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
};

export default SplashScreen;
