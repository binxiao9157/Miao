import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Cpu, FastForward, Image as ImageIcon, Loader2, Plus, Save, Star, Trash2, Upload, RotateCcw } from "lucide-react";
import { LayoutGroup, motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";
import { aiConfig, DEFAULT_AI_PROFILES } from "../services/ai/aiConfig";
import { AIProfile, AIProvider } from "../services/ai/types";
import { PresetCat, storage } from "../services/storage";

export default function AdminSettings() {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<AIProfile>(DEFAULT_AI_PROFILES.dashscope);
  const [showResetToast, setShowResetToast] = useState(false);
  const [isPointsCheat, setIsPointsCheat] = useState(() => storage.getIsPointsCheat());
  const [isFastForward, setIsFastForward] = useState(() => storage.getIsFastForward());

  const fieldLabelClass = "text-[10px] font-black text-on-surface-variant/55 uppercase tracking-[0.16em] ml-1";
  const modelInputClass = "w-full min-w-0 h-12 px-4 bg-white rounded-[18px] text-[13px] sm:text-sm leading-none font-semibold text-[#5D4037] outline-none focus:ring-2 focus:ring-[#FF9D76]/20 font-mono tracking-normal shadow-sm";
  const compactInputClass = "w-full min-w-0 h-12 px-3 bg-white rounded-[18px] text-[13px] sm:text-sm font-semibold text-[#5D4037] outline-none focus:ring-2 focus:ring-[#FF9D76]/20 shadow-sm font-mono tabular-nums tracking-normal";
  const switchClass = "flex min-h-13 items-center justify-between gap-2 bg-white rounded-[18px] px-3 py-2 text-[12px] leading-tight font-extrabold text-[#5D4037]/70 shadow-sm";

  useEffect(() => {
    setPresets(storage.getPresetCats());
    setProfile(aiConfig.getProfile());
  }, []);

  const handleProviderChange = (provider: AIProvider) => {
    const defaults = DEFAULT_AI_PROFILES[provider];
    setProfile(prev => ({
      ...defaults,
      mockMode: prev.mockMode,
      resolution: prev.resolution || defaults.resolution,
      duration: prev.duration || defaults.duration,
      seed: prev.seed || defaults.seed,
      promptExtend: prev.promptExtend,
    }));
  };

  const handleSave = () => {
    storage.savePresetCats(presets);
    aiConfig.saveProfile(profile);
    alert("配置已保存！");
  };

  const handleReset = () => {
    aiConfig.reset();
    setProfile(aiConfig.getProfile());
    setShowResetToast(true);
    setTimeout(() => setShowResetToast(false), 2000);
  };

  const handleAdd = () => {
    if (!newName || !newImageUrl) {
      alert("请输入品种名称和图片地址");
      return;
    }

    setPresets(prev => [
      ...prev,
      {
        id: `preset_${Date.now()}`,
        name: newName,
        imageUrl: newImageUrl
      }
    ]);
    setNewName("");
    setNewImageUrl("");
  };

  const handleDelete = (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const compressed = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSide = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxSide || h > maxSide) {
            const ratio = Math.min(maxSide / w, maxSide / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
      });

      setNewImageUrl(compressed);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("图片处理失败，请重试");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <PageHeader
        title="后台配置"
        subtitle="ADMIN SETTINGS"
        onBack={() => navigate(-1)}
      />

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-28">
        <section className="miao-card p-5 rounded-[32px] mb-5 bg-[#FF9D76]/5 border-[#FF9D76]/15">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-white text-[#FF9D76] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <Cpu size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] font-black text-on-surface leading-none tracking-normal">AI 模型配置</h2>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-2">Provider Profile</p>
            </div>
          </div>

          <div className="bg-[#FF9D76]/10 p-1.5 rounded-full grid grid-cols-2 relative overflow-hidden mb-5">
            <LayoutGroup id="admin-page-provider-tabs">
              {(["dashscope", "volcengine"] as AIProvider[]).map(provider => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`py-3 rounded-full text-[13px] font-black transition-all relative z-10 ${
                    profile.provider === provider
                      ? "text-white"
                      : "text-[#5D4037]/60 hover:bg-black/5"
                  }`}
                >
                  {provider === "dashscope" ? "阿里百炼" : "火山引擎"}
                  {profile.provider === provider && (
                    <motion.div
                      layoutId="admin-page-provider-bg"
                      className="absolute inset-0 bg-[#FF9D76] rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </LayoutGroup>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className={fieldLabelClass}>图片模型</span>
              <input
                value={profile.imageModel}
                onChange={(e) => setProfile(prev => ({ ...prev, imageModel: e.target.value }))}
                className={`${modelInputClass} mt-2`}
              />
            </label>
            <label className="block">
              <span className={fieldLabelClass}>视频模型</span>
              <input
                value={profile.videoModel}
                onChange={(e) => setProfile(prev => ({ ...prev, videoModel: e.target.value }))}
                className={`${modelInputClass} mt-2`}
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="block min-w-0">
                <span className={fieldLabelClass}>清晰度</span>
                <input
                  value={profile.resolution}
                  onChange={(e) => setProfile(prev => ({ ...prev, resolution: e.target.value }))}
                  className={`${compactInputClass} mt-2`}
                />
              </label>
              <label className="block min-w-0">
                <span className={fieldLabelClass}>时长</span>
                <input
                  type="number"
                  min={1}
                  value={profile.duration}
                  onChange={(e) => setProfile(prev => ({ ...prev, duration: Number(e.target.value) || 5 }))}
                  className={`${compactInputClass} mt-2`}
                />
              </label>
              <label className="block min-w-0">
                <span className={fieldLabelClass}>SEED</span>
                <input
                  type="number"
                  value={profile.seed}
                  onChange={(e) => setProfile(prev => ({ ...prev, seed: Number(e.target.value) || 12345 }))}
                  className={`${compactInputClass} mt-2`}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className={switchClass}>
                扩展
                <input
                  type="checkbox"
                  checked={profile.promptExtend}
                  onChange={(e) => setProfile(prev => ({ ...prev, promptExtend: e.target.checked }))}
                  className="w-4 h-4 shrink-0 accent-[#FF9D76]"
                />
              </label>
              <label className={switchClass}>
                Mock
                <input
                  type="checkbox"
                  checked={profile.mockMode}
                  onChange={(e) => setProfile(prev => ({ ...prev, mockMode: e.target.checked }))}
                  className="w-4 h-4 shrink-0 accent-[#FF9D76]"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="miao-card p-5 rounded-[32px] mb-5 bg-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-[#FF9D76]/10 text-[#FF9D76] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <Bug size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] font-black text-on-surface leading-none tracking-normal">调试工具</h2>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-2">Debug Tools</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const next = !isPointsCheat;
                setIsPointsCheat(next);
                storage.setIsPointsCheat(next);
              }}
              className={`min-h-20 rounded-[22px] p-4 text-left active:scale-[0.98] transition-all border ${
                isPointsCheat ? "bg-[#FF9D76] text-white border-[#FF9D76]" : "bg-surface-container text-[#5D4037] border-outline-variant/40"
              }`}
            >
              <Star size={20} className="mb-2" />
              <p className="text-sm font-black">积分调试</p>
              <p className="text-[10px] font-bold opacity-70 mt-1">{isPointsCheat ? "已开启" : "已关闭"}</p>
            </button>
            <button
              onClick={() => {
                const next = !isFastForward;
                setIsFastForward(next);
                storage.setIsFastForward(next);
              }}
              className={`min-h-20 rounded-[22px] p-4 text-left active:scale-[0.98] transition-all border ${
                isFastForward ? "bg-[#FF9D76] text-white border-[#FF9D76]" : "bg-surface-container text-[#5D4037] border-outline-variant/40"
              }`}
            >
              <FastForward size={20} className="mb-2" />
              <p className="text-sm font-black">时光快进</p>
              <p className="text-[10px] font-bold opacity-70 mt-1">{isFastForward ? "已开启" : "已关闭"}</p>
            </button>
          </div>
        </section>

        <section className="miao-card p-5 rounded-[32px] mb-5">
          <h2 className="text-[17px] font-black text-on-surface mb-4 tracking-normal">新增预设</h2>
          <div className="flex gap-4">
            <div className="relative w-24 h-24 bg-surface-container rounded-[24px] border-2 border-white shadow-sm overflow-hidden flex items-center justify-center group cursor-pointer shrink-0">
              {isUploading ? (
                <Loader2 className="animate-spin text-[#FF9D76]" size={24} />
              ) : newImageUrl ? (
                <img src={newImageUrl} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <ImageIcon className="text-on-surface-variant/30" size={34} />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                disabled={isUploading}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 pointer-events-none">
                <Upload className="text-white" size={20} />
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <input
                type="text"
                placeholder="品种名称"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-12 px-4 bg-surface-container rounded-[20px] border-none shadow-sm text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-[#FF9D76]/20 placeholder:text-on-surface-variant/35"
              />
              <button
                onClick={handleAdd}
                className="w-full h-12 bg-primary text-white rounded-[20px] font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                添加预设
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black text-on-surface-variant opacity-50 uppercase tracking-[0.2em] ml-2">
            当前预设 <span className="tabular-nums">({presets.length})</span>
          </p>
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center gap-3 p-3 bg-white rounded-[24px] border border-outline-variant/50 shadow-sm">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm bg-surface-container shrink-0">
                <img src={preset.imageUrl} className="w-full h-full object-cover" alt={preset.name} referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-on-surface text-sm tracking-normal truncate">{preset.name}</p>
                <p className="text-[10px] text-on-surface-variant/50 font-mono truncate mt-1">{preset.id}</p>
              </div>
              <button
                onClick={() => handleDelete(preset.id)}
                className="w-10 h-10 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors flex items-center justify-center shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </section>
      </main>

      <div className="shrink-0 px-6 pt-3 bg-background/95 backdrop-blur-md border-t border-outline-variant/60" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-4 bg-white text-[#5D4037]/70 rounded-full font-black text-base shadow-sm border border-outline-variant/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            恢复默认
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-4 bg-[#FF9D76] text-white rounded-full font-black text-base shadow-xl shadow-[#FF9D76]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} />
            保存所有配置
          </button>
        </div>
      </div>

      {/* Reset Toast */}
      <AnimatePresence>
        {showResetToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200]">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2"
            >
              <RotateCcw size={16} />
              已恢复默认
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
