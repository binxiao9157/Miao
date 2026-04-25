import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { storage, PresetCat } from "../services/storage";
import { motion } from "motion/react";

interface AdminPresetConfigProps {
  onClose: () => void;
}

export default function AdminPresetConfig({ onClose }: AdminPresetConfigProps) {
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setPresets(storage.getPresetCats());
  }, []);

  const handleSave = () => {
    storage.savePresetCats(presets);
    alert("配置已保存！");
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
    <div className="backdrop-overlay flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-lg max-h-[80dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-black text-[#5D4037]">预设猫咪配置</h2>
            <p className="text-xs text-[#5D4037]/40 font-bold uppercase tracking-widest">管理员后台</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* 新增区域 */}
          <div className="bg-[#FF9D76]/5 p-5 rounded-3xl border-2 border-dashed border-[#FF9D76]/20 space-y-4">
            <p className="text-xs font-black text-[#FF9D76] uppercase tracking-widest">新增预设</p>
            <div className="flex gap-4">
              <div className="relative w-24 h-24 bg-white rounded-2xl border-2 border-white shadow-sm overflow-hidden flex items-center justify-center group cursor-pointer">
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
              <div className="flex-grow space-y-3">
                <input 
                  type="text" 
                  placeholder="品种名称 (如: 布偶猫)" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-3 bg-white rounded-xl border-none shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF9D76]/20"
                />
                <button 
                  onClick={handleAdd}
                  className="w-full py-3 bg-[#FF9D76] text-white rounded-xl font-black text-sm shadow-lg shadow-[#FF9D76]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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
              <div key={preset.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm bg-white">
                  <img src={preset.imageUrl} className="w-full h-full object-cover" alt={preset.name} referrerPolicy="no-referrer" />
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-[#5D4037] text-sm">{preset.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{preset.id}</p>
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

        <div className="p-6 bg-gray-50 border-t">
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-[#5D4037] text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} />
            保存所有配置
          </button>
        </div>
      </motion.div>
    </div>
  );
}
