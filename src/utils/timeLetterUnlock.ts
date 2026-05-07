import { TimeLetter } from "../services/storage";

const FAST_FORWARD_RATIO = 60;

export function getEffectiveUnlockAt(letter: Pick<TimeLetter, "createdAt" | "unlockAt">, isFastForward: boolean): number {
  if (!isFastForward) return letter.unlockAt;
  const totalDuration = Math.max(0, letter.unlockAt - letter.createdAt);
  return letter.createdAt + Math.ceil(totalDuration / FAST_FORWARD_RATIO);
}

export function isTimeLetterUnlocked(letter: Pick<TimeLetter, "createdAt" | "unlockAt">, isFastForward: boolean, now = Date.now()): boolean {
  return now >= getEffectiveUnlockAt(letter, isFastForward);
}

export function formatTimeLetterCountdown(letter: Pick<TimeLetter, "createdAt" | "unlockAt">, isFastForward: boolean): string {
  const remainingMs = Math.max(0, getEffectiveUnlockAt(letter, isFastForward) - Date.now());
  if (remainingMs <= 0) return "已解锁";

  if (isFastForward) {
    const seconds = Math.ceil(remainingMs / 1000);
    return `${seconds} 秒`;
  }

  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  return `${minutes} 分钟`;
}
