export type DesktopPetActionKey = "idle" | "tail" | "rubbing" | "blink";

export type DesktopPetAnimation = {
  frames: number[];
  fps?: number;
  loop?: boolean;
  next?: DesktopPetActionKey;
};

export type DesktopPetAnchor = {
  x: number;
  y: number;
};

export type DesktopPetHitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DesktopPetBubbleOffset = {
  x: number;
  y: number;
};

export type DesktopPetManifest = {
  id: string;
  displayName?: string;
  description?: string;
  spritesheetPath: string;
  columns?: number;
  rows?: number;
  frameWidth?: number;
  frameHeight?: number;
  fps?: number;
  scale?: number;
  anchor?: DesktopPetAnchor;
  hitbox?: DesktopPetHitbox;
  bubbleOffset?: DesktopPetBubbleOffset;
  animations?: Partial<Record<DesktopPetActionKey, DesktopPetAnimation>>;
};

export type DesktopPetSummary = {
  id: string;
  displayName: string;
  description?: string;
};

export const DESKTOP_PET_ACTIONS: Array<{ key: DesktopPetActionKey; label: string; text: string }> = [
  { key: "idle", label: "蹭蹭", text: "蹭蹭你~" },
  { key: "tail", label: "摸头", text: "摸摸头，真乖~" },
  { key: "rubbing", label: "踩奶", text: "踩奶中，好舒服~" },
  { key: "blink", label: "逗猫", text: "小羽毛，抓不到~" },
];

function createFrameRange(start: number, end: number) {
  return Array.from({ length: Math.max(end - start + 1, 0) }, (_, index) => start + index);
}

export const DEFAULT_DESKTOP_PET_ANIMATIONS: Record<DesktopPetActionKey, DesktopPetAnimation> = {
  idle: { frames: createFrameRange(0, 5), fps: 8, loop: true },
  tail: { frames: createFrameRange(8, 23), fps: 10, loop: true, next: "idle" },
  rubbing: { frames: [24, 25, 26, 27, 32, 33, 34, 35, 36], fps: 10, loop: true, next: "idle" },
  blink: { frames: createFrameRange(40, 53), fps: 8, loop: true, next: "idle" },
};

export function normalizeDesktopPetManifest(
  manifest: DesktopPetManifest,
  fallbackId: string
): Required<Pick<DesktopPetManifest, "id" | "spritesheetPath" | "columns" | "rows" | "frameWidth" | "frameHeight" | "fps" | "scale">>
  & DesktopPetManifest {
  return {
    columns: 8,
    rows: 9,
    frameWidth: 192,
    frameHeight: 208,
    fps: 10,
    scale: 1,
    ...manifest,
    id: manifest.id || fallbackId,
  };
}

export function getDesktopPetFrameCount(manifest: DesktopPetManifest | null) {
  if (!manifest) return 0;
  return (manifest.columns || 8) * (manifest.rows || 9);
}

export function getDesktopPetAnimation(
  manifest: DesktopPetManifest | null,
  action: DesktopPetActionKey
) {
  if (!manifest) return null;
  const frameCount = getDesktopPetFrameCount(manifest);
  const animation = manifest.animations?.[action] || DEFAULT_DESKTOP_PET_ANIMATIONS[action];
  const frames = (animation.frames || [])
    .filter((frame) => Number.isInteger(frame) && frame >= 0 && frame < frameCount);
  return frames.length ? { ...animation, frames } : null;
}

export function getDesktopPetAnimationDuration(
  manifest: DesktopPetManifest | null,
  action: DesktopPetActionKey
) {
  const animation = getDesktopPetAnimation(manifest, action);
  if (!animation) return 0;
  const fps = Math.max(animation.fps || manifest?.fps || 10, 1);
  return Math.ceil((animation.frames.length / fps) * 1000);
}
