import { useCallback, useEffect, useRef, useState } from "react";

export function useTimedMessage(defaultDuration = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    cancelTimer();
    setMessage(null);
  }, [cancelTimer]);

  const show = useCallback((nextMessage: string, duration = defaultDuration) => {
    cancelTimer();
    setMessage(nextMessage);
    timerRef.current = setTimeout(() => {
      setMessage(null);
      timerRef.current = null;
    }, duration);
  }, [cancelTimer, defaultDuration]);

  useEffect(() => cancelTimer, [cancelTimer]);

  return { message, show, clear };
}
