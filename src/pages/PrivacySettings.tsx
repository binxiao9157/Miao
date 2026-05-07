import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, EyeOff, Shield } from "lucide-react";
import PageHeader from "../components/PageHeader";

const STORAGE_KEY = "miao_privacy_settings";

interface PrivacySettingsState {
  profileVisible: boolean;
  friendDiaryVisible: boolean;
  analyticsEnabled: boolean;
}

const DEFAULT_SETTINGS: PrivacySettingsState = {
  profileVisible: true,
  friendDiaryVisible: true,
  analyticsEnabled: false,
};

function readSettings(): PrivacySettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function PrivacySettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PrivacySettingsState>(() => readSettings());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const items = [
    { key: "profileVisible" as const, icon: Shield, title: "允许好友查看个人资料", desc: "包含昵称、头像和当前猫咪基础信息" },
    { key: "friendDiaryVisible" as const, icon: Bell, title: "允许好友查看公开日记", desc: "关闭后好友侧不展示你的共享日记" },
    { key: "analyticsEnabled" as const, icon: EyeOff, title: "允许体验数据诊断", desc: "仅用于排查生成、同步和页面异常" },
  ];

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <PageHeader title="隐私设置" subtitle="PRIVACY SETTINGS" onBack={() => navigate(-1)} />
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24 space-y-4">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
            className="w-full p-5 bg-white rounded-[28px] shadow-sm border border-outline-variant/40 flex items-center justify-between gap-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <item.icon size={21} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-on-surface">{item.title}</p>
                <p className="text-[11px] text-on-surface-variant/60 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
            <span className={`w-12 h-7 rounded-full shrink-0 p-1 transition-colors ${settings[item.key] ? "bg-primary" : "bg-outline-variant/60"}`}>
              <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings[item.key] ? "translate-x-5" : "translate-x-0"}`} />
            </span>
          </button>
        ))}
      </main>
    </div>
  );
}
