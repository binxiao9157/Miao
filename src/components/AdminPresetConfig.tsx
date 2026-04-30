import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Upload, Image as ImageIcon, Loader2, Cpu } from "lucide-react";
import { storage, PresetCat } from "../services/storage";
import { LayoutGroup, motion } from "motion/react";
import { aiConfig, DEFAULT_AI_PROFILES } from "../services/ai/aiConfig";
import { AIProfile, AIProvider } from "../services/ai/types";

interface AdminPresetConfigProps {
  onClose: () => void;
}

export default function AdminPresetConfig({ onClose }: AdminPresetConfigProps) {
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<AIProfile>(DEFAULT_AI_PROFILES.dashscope);
  const modelInputClass = "w-full min-w-0 px-3 py-2.5 bg-white rounded-[14px] text-[11px] sm:text-sm leading-tight font-extrabold text-[#5D4037] outline-none focus:ring-2 focus:ring-[#FF9D76]/20 font-mono tracking-normal";
  const compactInputClass = "w-full min-w-0 px-2.5 sm:px-3 py-2.5 bg-white rounded-[14px] text-sm font-extrabold text-[#5D4037] outline-none focus:ring-2 focus:ring-[#FF9D76]/20";

  useEffect(() => {
    setPresets(storage.getPresetCats());
    setProfile(aiConfig.getProfile());
  }, []);

  const handleSave = () => {
    storage.savePresetCats(presets);
    aiConfig.saveProfile(profile);
    alert("配置已保存！");
  };

  const handleProviderChange = (provider: AIProvider) => {
    const defaults = DEFAULT_AI_PROFILES[provider];
    setProfile(prev => ({
      ...defaults,
      mockMode: prev.mockMode,
      skipImageStage: prev.skipImageStage,
      resolution: prev.resolution || defaults.resolution,
      duration: prev.duration || defaults.duration,
      seed: prev.seed || defaults.seed,
      promptExtend: prev.promptExtend,
    }));
  };

  const handleAdd = () => {
    if (!newName || !newImageUrl) {
      alert("请输入品种名称和图片地址");
      return;
    }
    const newPreset: PresetCat = {
      id: `preset_${Date.now()}`,
      name: newName,
      imageUrl: newImageUrl
    };
    setPresets([...presets, newPreset]);
    setNewName("");
    setNewImageUrl("");
  };

  const handleDelete = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
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

      // 强制压缩图片，防止 localStorage 溢出
      const compressed = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSide = 800;
          let w = img.width, h = img.height;
          if (w > maxSide || h > maxSide) {
            const ratio = Math.min(maxSide / w, maxSide / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
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
      // 清空 input，允许重复上传同一张图
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center overflow-hidden"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))'
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-[430px] sm:max-w-lg h-full sm:h-auto max-h-full sm:max-h-[86dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="px-4 py-3 sm:p-6 border-b flex items-center justify-between bg-gray-50 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-xl font-black text-[#5D4037] truncate">预设猫咪配置</h2>
            <p className="text-[11px] text-[#5D4037]/40 font-bold uppercase tracking-widest">管理员后台</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white rounded-full shadow-sm text-gray-400 shrink-0 flex items-center justify-center">
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3.5 py-4 sm:p-6 space-y-4 sm:space-y-6 no-scrollbar overscroll-contain">
          {/* AI 模型配置 */}
          <div className="bg-[#FF9D76]/5 p-3.5 sm:p-5 rounded-[20px] sm:rounded-3xl border border-[#FF9D76]/15 space-y-3.5 sm:space-y-4 overflow-hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white text-[#FF9D76] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Cpu size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-black text-[#5D4037]">AI 模型配置</p>
                <p className="text-[9px] text-[#5D4037]/40 font-bold uppercase tracking-widest">Provider Profile</p>
              </div>
            </div>

            <div className="bg-[#FF9D76]/10 p-1.5 rounded-full grid grid-cols-2 relative overflow-hidden">
              <LayoutGroup id="admin-provider-tabs">
                {(['dashscope', 'volcengine'] as AIProvider[]).map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleProviderChange(provider)}
                    className={`py-2.5 rounded-full text-xs font-black transition-all relative z-10 ${
                      profile.provider === provider
                        ? "text-white"
                        : "text-[#5D4037]/60 hover:bg-black/5"
                    }`}
                  >
                    {provider === 'dashscope' ? '阿里百练' : '火山引擎'}
                    {profile.provider === provider && (
                      <motion.div
                        layoutId="admin-provider-bg"
                        className="absolute inset-0 bg-[#FF9D76] rounded-full -z-10 shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </LayoutGroup>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <span className="text-[9px] font-black text-[#5D4037]/50 uppercase">图片模型</span>
                <input
                  value={profile.imageModel}
                  onChange={(e) => setProfile(prev => ({ ...prev, imageModel: e.target.value }))}
                  className={modelInputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[9px] font-black text-[#5D4037]/50 uppercase">视频模型</span>
                <input
                  value={profile.videoModel}
                  onChange={(e) => setProfile(prev => ({ ...prev, videoModel: e.target.value }))}
                  className={modelInputClass}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[9px] font-black text-[#5D4037]/50 uppercase">清晰度</span>
                  <input
                    value={profile.resolution}
                    onChange={(e) => setProfile(prev => ({ ...prev, resolution: e.target.value }))}
                    className={compactInputClass}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black text-[#5D4037]/50 uppercase">时长</span>
                  <input
                    type="number"
                    min={1}
                    value={profile.duration}
                    onChange={(e) => setProfile(prev => ({ ...prev, duration: Number(e.target.value) || 5 }))}
                    className={compactInputClass}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black text-[#5D4037]/50 uppercase">Seed</span>
                  <input
                    type="number"
                    value={profile.seed}
                    onChange={(e) => setProfile(prev => ({ ...prev, seed: Number(e.target.value) || 12345 }))}
                    className={compactInputClass}
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex min-h-11 items-center justify-between gap-1.5 bg-white rounded-[14px] px-2.5 sm:px-3 py-2 text-[11px] leading-tight font-black text-[#5D4037]/70">
                  扩展
                  <input
                    type="checkbox"
                    checked={profile.promptExtend}
                    onChange={(e) => setProfile(prev => ({ ...prev, promptExtend: e.target.checked }))}
                    className="w-4 h-4 shrink-0 accent-[#FF9D76]"
                  />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-1.5 bg-white rounded-[14px] px-2.5 sm:px-3 py-2 text-[11px] leading-tight font-black text-[#5D4037]/70">
                  Mock
                  <input
                    type="checkbox"
                    checked={profile.mockMode}
                    onChange={(e) => setProfile(prev => ({ ...prev, mockMode: e.target.checked }))}
                    className="w-4 h-4 shrink-0 accent-[#FF9D76]"
                  />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-1.5 bg-white rounded-[14px] px-2.5 sm:px-3 py-2 text-[11px] leading-tight font-black text-[#5D4037]/70">
                  跳首帧
                  <input
                    type="checkbox"
                    checked={profile.skipImageStage}
                    onChange={(e) => setProfile(prev => ({ ...prev, skipImageStage: e.target.checked }))}
                    className="w-4 h-4 shrink-0 accent-[#FF9D76]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 新增区域 */}
          <div className="bg-[#FF9D76]/5 p-3.5 sm:p-5 rounded-[20px] sm:rounded-3xl border-2 border-dashed border-[#FF9D76]/20 space-y-3">
            <p className="text-[11px] font-black text-[#FF9D76] uppercase tracking-widest">新增预设</p>
            <div className="flex gap-3 sm:gap-4">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl border-2 border-white shadow-sm overflow-hidden flex items-center justify-center group cursor-pointer shrink-0">
                {isUploading ? (
                  <Loader2 className="animate-spin text-[#FF9D76]" size={24} />
                ) : newImageUrl ? (
                  <img src={newImageUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <ImageIcon className="text-gray-300" size={32} />
                )}
                
                {/* 交互层：确保 input 在最上层且覆盖整个区域 */}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                  disabled={isUploading}
                />
                
                {/* 视觉层：遮罩 */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 pointer-events-none">
                  <Upload className="text-white" size={20} />
                </div>
              </div>
              <div className="flex-grow space-y-2.5 min-w-0">
                <input 
                  type="text" 
                  placeholder="品种名称 (如: 布偶猫)" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white rounded-[14px] border-none shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF9D76]/20"
                />
                <button 
                  onClick={handleAdd}
                  className="w-full py-2.5 bg-[#FF9D76] text-white rounded-[14px] font-black text-sm shadow-lg shadow-[#FF9D76]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  添加预设
                </button>
              </div>
            </div>
          </div>

          {/* 列表区域 */}
          <div className="space-y-3">
            <p className="text-xs font-black text-[#5D4037]/40 uppercase tracking-widest ml-1">当前预设 ({presets.length})</p>
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                  <img src={preset.imageUrl} className="w-full h-full object-cover" alt={preset.name} referrerPolicy="no-referrer" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-[#5D4037] text-sm">{preset.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{preset.id}</p>
                </div>
                <button 
                  onClick={() => handleDelete(preset.id)}
                  className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 sm:p-6 bg-gray-50 border-t shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
          <button 
            onClick={handleSave}
            className="w-full py-3 sm:py-4 bg-[#5D4037] text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} />
            保存所有配置
          </button>
        </div>
      </motion.div>
    </div>
  );
}
