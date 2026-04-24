import { useEffect } from "react";

export default function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById("splash-screen");
    if (!el) return;

    const fadeTimer = setTimeout(() => {
      el.classList.add("fade-out");
    }, 1200);

    const removeTimer = setTimeout(() => {
      el.remove();
    }, 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return null;
}
