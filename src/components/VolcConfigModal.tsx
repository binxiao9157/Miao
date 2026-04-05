import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function VolcConfigModal({ isOpen, onClose }: Props) {
  const [keys, setKeys] = useState({
    VOLC_API_KEY: localStorage.getItem('VOLC_API_KEY') || '',
    VOLC_ACCESS_KEY: localStorage.getItem('VOLC_ACCESS_KEY') || '',
    VOLC_SECRET_KEY: localStorage.getItem('VOLC_SECRET_KEY') || '',
    VOLC_MODEL_ID: localStorage.getItem('VOLC_MODEL_ID') || 'doubao-seedance-1-5-pro-251215',
  });

  const handleSave = () => {
    localStorage.setItem('VOLC_API_KEY', keys.VOLC_API_KEY);
    localStorage.setItem('VOLC_ACCESS_KEY', keys.VOLC_ACCESS_KEY);
    localStorage.setItem('VOLC_SECRET_KEY', keys.VOLC_SECRET_KEY);
    localStorage.setItem('VOLC_MODEL_ID', keys.VOLC_MODEL_ID);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-on-surface">火山引擎配置</h3>
              <button onClick={onClose}><X size={20} /></button>
            </div>
            <div className="space-y-4 mb-8">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">API Key</label>
                <input 
                  type="password"
                  placeholder="ARK_API_KEY"
                  value={keys.VOLC_API_KEY}
                  onChange={(e) => setKeys({...keys, VOLC_API_KEY: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Access Key</label>
                <input 
                  type="password"
                  placeholder="VOLC_ACCESS_KEY"
                  value={keys.VOLC_ACCESS_KEY}
                  onChange={(e) => setKeys({...keys, VOLC_ACCESS_KEY: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Secret Key</label>
                <input 
                  type="password"
                  placeholder="VOLC_SECRET_KEY"
                  value={keys.VOLC_SECRET_KEY}
                  onChange={(e) => setKeys({...keys, VOLC_SECRET_KEY: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Model ID / Endpoint ID</label>
                <input 
                  type="text"
                  placeholder="ep-..."
                  value={keys.VOLC_MODEL_ID}
                  onChange={(e) => setKeys({...keys, VOLC_MODEL_ID: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                <p className="text-[10px] text-gray-400">输入以 ep- 开头的推理接入点 ID</p>
              </div>
            </div>
            <button 
              onClick={handleSave}
              className="w-full py-3 bg-primary text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              保存配置
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
