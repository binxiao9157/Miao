import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { storage, CatInfo } from "../services/storage";
import {
  DESKTOP_PET_ACTIONS,
  DesktopPetActionKey,
  DesktopPetManifest,
  DesktopPetSummary,
  getDesktopPetAnimation,
  getDesktopPetAnimationDuration,
  getDesktopPetFrameCount,
  normalizeDesktopPetManifest,
} from "../services/desktopPetManifest";

type ActionKey = DesktopPetActionKey;
type VisualMode = "soft" | "frame";
type PanelPosition = { x: number; y: number };
const ACTIONS = DESKTOP_PET_ACTIONS;
const SPRITE_PET_STORAGE_KEY = "miao_desktop_sprite_pet_id";
const SPRITE_IDLE_RANDOM_ACTIONS: ActionKey[] = ["tail", "rubbing", "blink"];

function getActionUrl(cat: CatInfo | null, action: ActionKey): string {
  if (!cat) return "";
  if (action === "idle") {
    return cat.videoPaths?.idle || cat.videoPath || cat.remoteVideoUrl || "";
  }
  return cat.videoPaths?.[action] || "";
}

function getFrameAnimation(cat: CatInfo | null, action: ActionKey) {
  if (!cat) return null;
  return cat.frameAnimations?.[action] || (action !== "idle" ? null : cat.frameAnimations?.idle) || null;
}

function getPoster(cat: CatInfo | null): string {
  return cat?.placeholderImage || cat?.anchorFrame || cat?.avatar || "";
}

function getDesktopCatUrl(username?: string, appUrl?: string, catId?: string) {
  const query = new URLSearchParams();
  if (username) query.set("username", username);
  if (catId) query.set("catId", catId);
  const base = appUrl ? appUrl.replace(/\/$/, "") : "";
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `${base}/api/desktop/active-cat${suffix}`;
}

function getDesktopCatsUrl(username?: string, appUrl?: string) {
  const query = new URLSearchParams();
  if (username) query.set("username", username);
  const base = appUrl ? appUrl.replace(/\/$/, "") : "";
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `${base}/api/desktop/cats${suffix}`;
}

function resolveMediaUrl(url: string, appUrl?: string) {
  if (!url) return "";
  if (/^(https?:|data:|blob:|file:)/.test(url)) return url;
  const base = appUrl ? appUrl.replace(/\/$/, "") : window.location.origin;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalizeCatForDesktop(cat: CatInfo, appUrl?: string): CatInfo {
  const videoPaths = cat.videoPaths
    ? Object.fromEntries(
        Object.entries(cat.videoPaths).map(([key, url]) => [key, resolveMediaUrl(url || "", appUrl)])
      )
    : cat.videoPaths;
  const frameAnimations = cat.frameAnimations
    ? Object.fromEntries(
        Object.entries(cat.frameAnimations).map(([key, animation]) => [
          key,
          {
            ...animation,
            frames: animation.frames.map(frame => resolveMediaUrl(frame || "", appUrl)),
          },
        ])
      )
    : cat.frameAnimations;

  return {
    ...cat,
    avatar: resolveMediaUrl(cat.avatar, appUrl),
    placeholderImage: resolveMediaUrl(cat.placeholderImage || "", appUrl),
    anchorFrame: resolveMediaUrl(cat.anchorFrame || "", appUrl),
    videoPath: resolveMediaUrl(cat.videoPath || "", appUrl),
    videoPaths,
    frameAnimations,
    remoteVideoUrl: resolveMediaUrl(cat.remoteVideoUrl || "", appUrl),
  };
}

function getInitialVisualMode(): VisualMode {
  if (typeof window === "undefined") return "soft";
  return window.localStorage.getItem("miao_desktop_visual_mode") === "frame" ? "frame" : "soft";
}

function getSpritePetId() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("spritePet") || window.localStorage.getItem(SPRITE_PET_STORAGE_KEY) || "";
}

export default function DesktopPet() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [cats, setCats] = useState<CatInfo[]>([]);
  const [action, setAction] = useState<ActionKey>("idle");
  const [bubble, setBubble] = useState("桌面小猫已就位");
  const [panelOpen, setPanelOpen] = useState(false);
  const [clickThrough, setClickThrough] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [, setIsRefreshing] = useState(false);
  const [isBuildingFrames, setIsBuildingFrames] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [visualMode, setVisualMode] = useState<VisualMode>(getInitialVisualMode);
  const [desktopUsername, setDesktopUsername] = useState("");
  const [frameIndex, setFrameIndex] = useState(0);
  const [spritePetId, setSpritePetId] = useState(getSpritePetId);
  const [spritePet, setSpritePet] = useState<DesktopPetManifest | null>(null);
  const [spritePets, setSpritePets] = useState<DesktopPetSummary[]>([]);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const randomActionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelDragState = useRef({
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
  });
  const dragState = useRef({
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    totalX: 0,
    totalY: 0,
    dragging: false,
    suppressClick: false,
  });
  const activeCatIdRef = useRef<string | undefined>(undefined);

  const desktopApi = typeof window !== "undefined" ? window.miaoDesktop : undefined;
  const isDesktopShell = Boolean(desktopApi);
  const spriteFrameCount = getDesktopPetFrameCount(spritePet);
  const spriteColumns = spritePet?.columns || 8;
  const spriteRows = spritePet?.rows || 9;
  const spriteFrameWidth = spritePet?.frameWidth || 192;
  const spriteFrameHeight = spritePet?.frameHeight || 208;
  const spriteScale = spritePet?.scale || 1;
  const currentSpriteAnimation = useMemo(() => getDesktopPetAnimation(spritePet, action), [action, spritePet]);
  const currentSpriteFrames = currentSpriteAnimation?.frames || [];
  const activeSpriteFrame = spritePet && currentSpriteFrames.length
    ? currentSpriteFrames[frameIndex % currentSpriteFrames.length]
    : 0;
  const spriteFrameX = spriteFrameCount ? activeSpriteFrame % spriteColumns : 0;
  const spriteFrameY = spriteFrameCount ? Math.floor(activeSpriteFrame / spriteColumns) % spriteRows : 0;
  const spriteSheetUrl = spritePet
    ? `/desktop-pet-assets/pets/${spritePet.id}/${spritePet.spritesheetPath}`
    : "";
  const currentFrameAnimation = useMemo(() => getFrameAnimation(cat, action), [action, cat]);
  const currentFrameUrl = currentFrameAnimation?.frames.length
    ? currentFrameAnimation.frames[frameIndex % currentFrameAnimation.frames.length]
    : "";
  const videoUrl = useMemo(() => getActionUrl(cat, action) || getActionUrl(cat, "idle"), [cat, action]);
  const poster = useMemo(() => getPoster(cat), [cat]);
  const availableActions = useMemo(() => {
    if (spritePet) {
      return ACTIONS.map((item) => ({ ...item, available: Boolean(getDesktopPetAnimation(spritePet, item.key)) }));
    }
    return ACTIONS.map((item) => ({
      ...item,
      available: item.key === "idle"
        ? Boolean(getFrameAnimation(cat, "idle") || getActionUrl(cat, "idle"))
        : Boolean(getFrameAnimation(cat, item.key) || getActionUrl(cat, item.key)),
    }));
  }, [cat, spritePet]);

  const showBubble = useCallback((text: string) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(text);
    bubbleTimer.current = setTimeout(() => setBubble(""), 2800);
  }, []);

  const revealControls = useCallback((keepVisible = false) => {
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    setControlsVisible(true);
    if (!keepVisible) {
      chromeTimer.current = setTimeout(() => setControlsVisible(false), 2600);
    }
  }, []);

  useEffect(() => {
    fetch("/api/desktop/pets", { cache: "no-store" })
      .then(response => response.ok ? response.json() : { pets: [] })
      .then((data: { pets?: DesktopPetSummary[] }) => {
        setSpritePets(Array.isArray(data.pets) ? data.pets : []);
      })
      .catch(() => setSpritePets([]));
  }, []);

  useEffect(() => {
    if (!spritePetId) {
      setSpritePet(null);
      return;
    }
    window.localStorage.setItem(SPRITE_PET_STORAGE_KEY, spritePetId);
    fetch(`/desktop-pet-assets/pets/${spritePetId}/pet.json`, { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error(`Sprite pet not found: ${spritePetId}`);
        return response.json();
      })
      .then((manifest: DesktopPetManifest) => {
        const nextManifest = normalizeDesktopPetManifest(manifest, spritePetId);
        setSpritePet(nextManifest);
        setAction("idle");
        setFrameIndex(0);
        setBubble(`${nextManifest.displayName || nextManifest.id} 已加载`);
      })
      .catch((error) => {
        setSpritePet(null);
        setBubble(error?.message || "精灵图素材加载失败");
      });
  }, [showBubble, spritePetId]);

  const getAppUrl = useCallback(async () => {
    return desktopApi?.getAppUrl ? await desktopApi.getAppUrl() : undefined;
  }, [desktopApi]);

  const getDesktopHeaders = useCallback(async () => {
    return desktopApi?.getRequestHeaders ? await desktopApi.getRequestHeaders() : {};
  }, [desktopApi]);

  const refreshCat = useCallback(async (catId?: string) => {
    setIsRefreshing(true);
    const appUrl = await getAppUrl();
    const activeCat = storage.getActiveCat();
    if (activeCat && (!catId || activeCat.id === catId)) {
      setCat(normalizeCatForDesktop(activeCat, appUrl));
      setVideoError(false);
      setIsRefreshing(false);
      return;
    }

    const username = storage.getUserInfo()?.username || storage.getLastUsername() || desktopUsername;
    try {
      const response = await fetch(getDesktopCatUrl(username, appUrl, catId), {
        headers: await getDesktopHeaders(),
      });
      if (!response.ok) throw new Error(`Desktop cat fetch failed: ${response.status}`);
      const data = await response.json();
      if (data?.cat) {
        setCat(normalizeCatForDesktop(data.cat, appUrl));
        setVideoError(false);
        setIsRefreshing(false);
        return;
      }
    } catch {
      // Keep the desktop pet usable without a running server; the empty state explains the next action.
    }

    setCat(null);
    setBubble("还没有可陪伴的猫咪");
    setIsRefreshing(false);
  }, [desktopUsername, getAppUrl, getDesktopHeaders]);

  const refreshCats = useCallback(async () => {
    const appUrl = await getAppUrl();
    const localCats = storage.getCatList();
    if (localCats.length > 0) {
      setCats(localCats.map((item) => normalizeCatForDesktop(item, appUrl)));
      return;
    }

    const username = storage.getUserInfo()?.username || storage.getLastUsername() || desktopUsername;
    try {
      const response = await fetch(getDesktopCatsUrl(username, appUrl), {
        headers: await getDesktopHeaders(),
      });
      if (!response.ok) throw new Error(`Desktop cats fetch failed: ${response.status}`);
      const data = await response.json();
      setCats(Array.isArray(data?.cats)
        ? data.cats.map((item: CatInfo) => normalizeCatForDesktop(item, appUrl))
        : []);
    } catch {
      setCats([]);
    }
  }, [desktopUsername, getAppUrl, getDesktopHeaders]);

  const loadDesktopSettings = useCallback(async () => {
    try {
      const settings = await desktopApi?.getSettings?.();
      if (!settings) return;
      setAlwaysOnTop(settings.alwaysOnTop);
      setClickThrough(settings.clickThrough);
      setLaunchAtLogin(settings.launchAtLogin);
      setDesktopUsername(settings.desktopUsername || "");
    } catch {
      // Browser preview has no desktop settings.
    }
  }, [desktopApi]);

  useEffect(() => {
    document.documentElement.classList.add("desktop-pet-mode");
    document.body.classList.add("desktop-pet-mode");
    if (!spritePetId) {
      refreshCat();
      refreshCats();
    }
    loadDesktopSettings();
    const interval = spritePetId
      ? undefined
      : setInterval(() => refreshCat(activeCatIdRef.current), 5000);
    const unsubscribeRefresh = desktopApi?.onRefresh?.(() => {
      refreshCat(activeCatIdRef.current);
      refreshCats();
      showBubble("已刷新猫咪");
    });
    return () => {
      document.documentElement.classList.remove("desktop-pet-mode");
      document.body.classList.remove("desktop-pet-mode");
      if (interval) clearInterval(interval);
      unsubscribeRefresh?.();
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (chromeTimer.current) clearTimeout(chromeTimer.current);
      if (actionTimer.current) clearTimeout(actionTimer.current);
      if (randomActionTimer.current) clearTimeout(randomActionTimer.current);
    };
  }, [desktopApi, loadDesktopSettings, refreshCat, refreshCats, showBubble, spritePetId]);

  useEffect(() => {
    revealControls();
  }, [revealControls]);

  useEffect(() => {
    desktopApi?.setClickThrough(clickThrough).catch(() => undefined);
  }, [clickThrough, desktopApi]);

  useEffect(() => {
    window.localStorage.setItem("miao_desktop_visual_mode", visualMode);
  }, [visualMode]);

  useEffect(() => {
    activeCatIdRef.current = cat?.id || storage.getActiveCatId() || undefined;
  }, [cat?.id]);

  useEffect(() => {
    if (spritePet) return;
    if (!videoRef.current || !videoUrl) return;
    if (currentFrameAnimation?.frames.length) return;
    const video = videoRef.current;
    video.currentTime = 0;
    video.play().catch(() => undefined);
  }, [currentFrameAnimation?.frames.length, spritePet, videoUrl]);

  useEffect(() => {
    setFrameIndex(0);
    if (spritePet) {
      if (!currentSpriteFrames.length) return;
      const delay = Math.round(1000 / Math.max(currentSpriteAnimation?.fps || spritePet.fps || 10, 1));
      const timer = window.setInterval(() => {
        setFrameIndex(index => (index + 1) % currentSpriteFrames.length);
      }, delay);
      return () => window.clearInterval(timer);
    }
    if (!currentFrameAnimation?.frames.length) return;
    const delay = Math.round(1000 / Math.max(currentFrameAnimation.fps || 10, 1));
    const timer = window.setInterval(() => {
      setFrameIndex(index => (index + 1) % currentFrameAnimation.frames.length);
    }, delay);
    return () => window.clearInterval(timer);
  }, [currentFrameAnimation, currentSpriteAnimation?.fps, currentSpriteFrames.length, spritePet]);

  useEffect(() => {
    if (!videoError || !videoUrl) return;
    const retryTimer = setTimeout(() => setVideoError(false), 5000);
    return () => clearTimeout(retryTimer);
  }, [videoError, videoUrl]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen]);

  const closePanelFromBackdrop = (event: React.MouseEvent<HTMLElement>) => {
    if (!panelOpen) return;
    const target = event.target as HTMLElement;
    if (target.closest(".desktop-pet-panel") || target.closest(".desktop-pet-toolbar")) return;
    event.stopPropagation();
    setPanelOpen(false);
  };

  const handlePanelDragStart = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a")) return;
    const panel = event.currentTarget.closest(".desktop-pet-panel") as HTMLElement | null;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panelDragState.current = {
      pointerId: event.pointerId,
      lastX: event.screenX,
      lastY: event.screenY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  };

  const handlePanelDragMove = (event: React.PointerEvent<HTMLElement>) => {
    const state = panelDragState.current;
    if (state.pointerId !== event.pointerId) return;
    if (desktopApi?.moveWindowBy) {
      const deltaX = event.screenX - state.lastX;
      const deltaY = event.screenY - state.lastY;
      state.lastX = event.screenX;
      state.lastY = event.screenY;
      desktopApi.moveWindowBy(deltaX, deltaY).catch(() => undefined);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const maxX = Math.max(window.innerWidth - state.width - 4, 4);
    const maxY = Math.max(window.innerHeight - state.height - 4, 4);
    setPanelPosition({
      x: Math.min(Math.max(event.clientX - state.offsetX, 4), maxX),
      y: Math.min(Math.max(event.clientY - state.offsetY, 4), maxY),
    });
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePanelDragEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (panelDragState.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panelDragState.current.pointerId = -1;
    event.stopPropagation();
  };

  useEffect(() => {
    if (!spritePet || action === "idle") return;
    if (actionTimer.current) clearTimeout(actionTimer.current);
    const animation = getDesktopPetAnimation(spritePet, action);
    const duration = getDesktopPetAnimationDuration(spritePet, action);
    const nextAction = animation?.next || "idle";
    actionTimer.current = setTimeout(() => {
      setAction(nextAction);
      setFrameIndex(0);
    }, Math.max(duration * 2, 1200));
    return () => {
      if (actionTimer.current) clearTimeout(actionTimer.current);
    };
  }, [action, spritePet]);

  useEffect(() => {
    if (!spritePet || action !== "idle") return;
    if (randomActionTimer.current) clearTimeout(randomActionTimer.current);
    const availableRandomActions = SPRITE_IDLE_RANDOM_ACTIONS
      .filter((item) => Boolean(getDesktopPetAnimation(spritePet, item)));
    if (!availableRandomActions.length) return;
    randomActionTimer.current = setTimeout(() => {
      const nextAction = availableRandomActions[Math.floor(Math.random() * availableRandomActions.length)];
      setAction(nextAction);
      setFrameIndex(0);
    }, 5200 + Math.random() * 4200);
    return () => {
      if (randomActionTimer.current) clearTimeout(randomActionTimer.current);
    };
  }, [action, spritePet]);

  const triggerAction = (nextAction: ActionKey) => {
    const config = ACTIONS.find((item) => item.key === nextAction);
    if (!config) return;
    if (actionTimer.current) clearTimeout(actionTimer.current);
    if (randomActionTimer.current) clearTimeout(randomActionTimer.current);
    if (spritePet) {
      if (!getDesktopPetAnimation(spritePet, nextAction)) {
        showBubble("这个动作还没适配");
        return;
      }
      setAction(nextAction);
      setFrameIndex(0);
      showBubble(config.text);
      return;
    }
    if (!getFrameAnimation(cat, nextAction) && !getActionUrl(cat, nextAction)) {
      showBubble("这个动作还没生成");
      return;
    }
    setAction(nextAction);
    setVideoError(false);
    showBubble(config.text);
  };

  const switchSpritePet = (nextSpritePetId: string) => {
    const url = new URL(window.location.href);
    if (!nextSpritePetId) {
      window.localStorage.removeItem(SPRITE_PET_STORAGE_KEY);
      url.searchParams.delete("spritePet");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setSpritePetId("");
      setSpritePet(null);
      setAction("idle");
      refreshCat(activeCatIdRef.current);
      refreshCats();
      showBubble("已切回业务猫咪");
      return;
    }
    url.searchParams.set("spritePet", nextSpritePetId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setSpritePetId(nextSpritePetId);
    setAction("idle");
    setFrameIndex(0);
  };

  const openMainApp = () => {
    desktopApi?.openMainApp();
  };

  const switchCat = useCallback((catId: string) => {
    const localCat = cats.find((item) => item.id === catId);
    if (localCat) {
      setCat(localCat);
      setAction("idle");
      setVideoError(false);
      storage.setActiveCatId(catId);
      showBubble(`切换到 ${localCat.name}`);
      return;
    }
    refreshCat(catId);
  }, [cats, refreshCat, showBubble]);

  const handleStageClick = () => {
    if (dragState.current.suppressClick) {
      dragState.current.suppressClick = false;
      return;
    }
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => triggerAction("idle"), 220);
  };

  const handleStageDoubleClick = () => {
    if (dragState.current.suppressClick) {
      dragState.current.suppressClick = false;
      return;
    }
    if (clickTimer.current) clearTimeout(clickTimer.current);
    triggerAction("tail");
  };

  const handleStagePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!desktopApi?.moveWindowBy || event.button !== 0) return;
    revealControls();
    dragState.current = {
      pointerId: event.pointerId,
      lastX: event.screenX,
      lastY: event.screenY,
      totalX: 0,
      totalY: 0,
      dragging: false,
      suppressClick: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleStagePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const state = dragState.current;
    if (state.pointerId !== event.pointerId || !desktopApi?.moveWindowBy) return;

    const deltaX = event.screenX - state.lastX;
    const deltaY = event.screenY - state.lastY;
    state.totalX += deltaX;
    state.totalY += deltaY;

    if (!state.dragging && Math.hypot(state.totalX, state.totalY) < 6) {
      state.lastX = event.screenX;
      state.lastY = event.screenY;
      return;
    }

    state.dragging = true;
    state.suppressClick = true;
    state.lastX = event.screenX;
    state.lastY = event.screenY;
    event.preventDefault();
    desktopApi.moveWindowBy(deltaX, deltaY).catch(() => undefined);
  };

  const handleStagePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const state = dragState.current;
    if (state.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    state.pointerId = -1;
    state.dragging = false;
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    triggerAction("rubbing");
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    triggerAction("blink");
  };

  const toggleAlwaysOnTop = async () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    await desktopApi?.setAlwaysOnTop(next).catch(() => undefined);
  };

  const toggleLaunchAtLogin = async () => {
    const next = !launchAtLogin;
    setLaunchAtLogin(next);
    await desktopApi?.setLaunchAtLogin(next).catch(() => undefined);
  };

  const enableTemporaryClickThrough = async () => {
    setClickThrough(true);
    showBubble("点击穿透已开启，10 秒后自动恢复");
    revealControls(true);
    await desktopApi?.setTemporaryClickThrough?.(10000).catch(() => undefined);
    window.setTimeout(() => setClickThrough(false), 10000);
  };

  const buildCurrentFrameAnimation = async () => {
    if (!cat || isBuildingFrames) return;
    const username = storage.getUserInfo()?.username || storage.getLastUsername() || desktopUsername;
    if (!username) {
      showBubble("缺少桌宠用户配置");
      return;
    }
    setIsBuildingFrames(true);
    revealControls(true);
    showBubble("正在生成帧动画");
    try {
      const appUrl = await getAppUrl();
      const base = appUrl ? appUrl.replace(/\/$/, "") : "";
      const desktopHeaders = await getDesktopHeaders();
      const response = await fetch(`${base}/api/desktop/frame-animation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...desktopHeaders },
        body: JSON.stringify({
          username,
          catId: cat.id,
          action,
          fps: 10,
          maxFrames: 90,
          width: 360,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
      if (data?.cat) {
        setCat(normalizeCatForDesktop(data.cat, appUrl));
      } else {
        await refreshCat(activeCatIdRef.current);
      }
      showBubble("帧动画已生成");
    } catch (error: any) {
      showBubble(error?.message || "生成帧动画失败");
    } finally {
      setIsBuildingFrames(false);
    }
  };

  useEffect(() => {
    desktopApi?.updateCatMenu?.(
      cats.map((item) => ({ id: item.id, name: item.name })),
      cat?.id
    ).catch(() => undefined);
  }, [cat?.id, cats, desktopApi]);

  useEffect(() => {
    const unsubscribeSwitchCat = desktopApi?.onSwitchCat?.((catId) => switchCat(catId));
    const unsubscribeOpenSettings = desktopApi?.onOpenSettings?.(() => {
      revealControls(true);
      setPanelOpen(true);
      showBubble("设置已打开");
    });
    const unsubscribeSettingsChanged = desktopApi?.onSettingsChanged?.((settings) => {
      setAlwaysOnTop(settings.alwaysOnTop);
      setClickThrough(settings.clickThrough);
      setLaunchAtLogin(settings.launchAtLogin);
      setDesktopUsername(settings.desktopUsername || "");
    });
    return () => {
      unsubscribeSwitchCat?.();
      unsubscribeOpenSettings?.();
      unsubscribeSettingsChanged?.();
    };
  }, [desktopApi, revealControls, showBubble, switchCat]);

  const rootClassName = [
    "desktop-pet-root",
    isDesktopShell ? "is-desktop-shell" : "is-browser-preview",
    visualMode === "soft" ? "is-soft-cutout" : "is-framed-media",
    controlsVisible || panelOpen ? "is-interacting" : "",
    panelOpen ? "is-panel-open" : "",
  ].filter(Boolean).join(" ");

  if (!cat && !spritePet) {
    return (
      <main className="desktop-pet-root is-interacting">
        <section className="desktop-pet-empty">
          <AlertCircle size={24} />
          <strong>没有可展示的小猫</strong>
          <span>先在主应用创建或同步一只猫咪。</span>
          {spritePets.length > 0 && (
            <label className="desktop-pet-select-label">
              预览素材
              <select value={spritePetId} onChange={(event) => switchSpritePet(event.target.value)}>
                <option value="">选择素材</option>
                {spritePets.map((item) => (
                  <option key={item.id} value={item.id}>{item.displayName || item.id}</option>
                ))}
              </select>
            </label>
          )}
          <button type="button" onClick={openMainApp}>打开主应用</button>
        </section>
      </main>
    );
  }

  return (
    <main
      className={rootClassName}
      onPointerMove={() => revealControls(panelOpen)}
      onPointerDown={() => revealControls(panelOpen)}
      onMouseEnter={() => revealControls(panelOpen)}
      onFocusCapture={() => revealControls(true)}
      onClickCapture={closePanelFromBackdrop}
    >
      <div className="desktop-pet-drag-handle" title="拖动窗口" />

      <section
        className="desktop-pet-stage"
        onClick={handleStageClick}
        onDoubleClick={handleStageDoubleClick}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        {spritePet ? (
          <div
            className="desktop-pet-sprite"
            role="img"
            aria-label={spritePet.displayName || spritePet.id}
            style={{
              width: `${spriteFrameWidth}px`,
              height: `${spriteFrameHeight}px`,
              backgroundImage: `url(${spriteSheetUrl})`,
              backgroundSize: `${spriteColumns * spriteFrameWidth}px ${spriteRows * spriteFrameHeight}px`,
              backgroundPosition: `-${spriteFrameX * spriteFrameWidth}px -${spriteFrameY * spriteFrameHeight}px`,
              "--desktop-pet-sprite-scale": spriteScale,
            } as React.CSSProperties}
          />
        ) : currentFrameUrl ? (
          <img className="desktop-pet-image desktop-pet-frame" src={currentFrameUrl} alt={cat.name} />
        ) : videoUrl && !videoError ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={poster}
            muted
            playsInline
            autoPlay
            loop
            className="desktop-pet-video"
            onError={() => setVideoError(true)}
          />
        ) : (
          <img className="desktop-pet-image" src={poster} alt={cat?.name || "Miao"} />
        )}

        {bubble && (
          <div className="desktop-pet-bubble">
            {bubble}
          </div>
        )}
      </section>

      <div className="desktop-pet-toolbar">
        {availableActions.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === action ? "active" : ""}
            disabled={!item.available}
            onClick={(event) => {
              event.stopPropagation();
              triggerAction(item.key);
            }}
            title={item.label}
          >
            {item.label}
          </button>
        ))}
      </div>

      {panelOpen && (
        <aside
          className="desktop-pet-panel"
          style={!isDesktopShell && panelPosition
            ? { left: `${panelPosition.x}px`, top: `${panelPosition.y}px`, right: "auto" }
            : undefined}
        >
          <div
            className="desktop-pet-panel-header"
            onPointerDown={handlePanelDragStart}
            onPointerMove={handlePanelDragMove}
            onPointerUp={handlePanelDragEnd}
            onPointerCancel={handlePanelDragEnd}
          >
            <div>
              <strong>{spritePet?.displayName || cat?.name}</strong>
              <span>{spritePet ? "Spritesheet 预览" : `${cat?.breed || "未知品种"} · ${cat?.color || "未知颜色"}`}</span>
            </div>
            <button
              type="button"
              className="desktop-pet-panel-close"
              onClick={() => setPanelOpen(false)}
              title="关闭设置"
              aria-label="关闭设置"
            >
              <X size={15} />
            </button>
          </div>
          {spritePets.length > 0 && (
            <label className="desktop-pet-select-label">
              桌宠素材
              <select value={spritePetId} onChange={(event) => switchSpritePet(event.target.value)}>
                <option value="">业务猫咪</option>
                {spritePets.map((item) => (
                  <option key={item.id} value={item.id}>{item.displayName || item.id}</option>
                ))}
              </select>
            </label>
          )}
          {!spritePet && cats.length > 1 && (
            <label className="desktop-pet-select-label">
              当前猫咪
              <select value={cat.id} onChange={(event) => switchCat(event.target.value)}>
                {cats.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="desktop-pet-toggle">
            <input
              type="checkbox"
              checked={alwaysOnTop}
              onChange={toggleAlwaysOnTop}
            />
            保持置顶
          </label>
          <label className="desktop-pet-toggle">
            <input
              type="checkbox"
              checked={launchAtLogin}
              onChange={toggleLaunchAtLogin}
            />
            开机启动
          </label>
          <label className="desktop-pet-toggle">
            <input
              type="checkbox"
              checked={visualMode === "soft"}
              onChange={() => setVisualMode((mode) => mode === "soft" ? "frame" : "soft")}
            />
            浮层模式
          </label>
          <button type="button" onClick={enableTemporaryClickThrough}>
            临时穿透 10 秒
          </button>
          {!spritePet && (
            <>
              <button
                type="button"
                onClick={buildCurrentFrameAnimation}
                disabled={isBuildingFrames}
              >
                {isBuildingFrames ? "生成中..." : "生成帧动画"}
              </button>
              <button type="button" onClick={() => {
                refreshCat(activeCatIdRef.current);
                refreshCats();
              }}>刷新猫咪</button>
            </>
          )}
          <button type="button" onClick={() => desktopApi?.resetWindowPosition?.()}>
            <RotateCcw size={13} />
            重置位置
          </button>
          <button type="button" onClick={openMainApp}>打开主应用</button>
        </aside>
      )}
    </main>
  );
}
