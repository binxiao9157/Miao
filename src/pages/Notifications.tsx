import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Sun, Mail } from "lucide-react";
import { storage, AppSettings } from "../services/storage";
import PageHeader from "../components/PageHeader";

export default function Notifications() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());

  const toggleGreeting = () => {
    const newSettings = { ...settings, greetingsEnabled: !settings.greetingsEnabled };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const togglePush = () => {
    const newSettings = { ...settings, pushNotifications: !settings.pushNotifications };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const toggleLetterReminder = () => {
    const newSettings = { ...settings, timeLetterReminder: !settings.timeLetterReminder };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      <PageHeader 
        title="通知设置" 
        subtitle="Notifications" 
      />

      <div className="px-6 pb-24 space-y-6 shrink-0 overflow-visible">
        <section className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Bell size={20} />
              </div>
              <div>
                <p className="font-bold text-on-surface">推送通知</p>
                <p className="text-[10px] text-on-surface-variant opacity-60">接收猫咪的日常动态提醒</p>
              </div>
            </div>
            <button 
              onClick={togglePush}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.pushNotifications ? "bg-primary" : "bg-outline-variant"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.pushNotifications ? "left-7" : "left-1"}`}></div>
            </button>
          </div>

          <div className="h-px bg-outline-variant opacity-30 mb-6"></div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500">
                <Sun size={20} />
              </div>
              <div>
                <p className="font-bold text-on-surface">早晚问候气泡</p>
                <p className="text-[10px] text-on-surface-variant opacity-60">在首页显示温馨的问候语</p>
              </div>
            </div>
            <button 
              onClick={toggleGreeting}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.greetingsEnabled ? "bg-primary" : "bg-outline-variant"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.greetingsEnabled ? "left-7" : "left-1"}`}></div>
            </button>
          </div>

          <div className="h-px bg-outline-variant opacity-30 mb-6"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500">
                <Mail size={20} />
              </div>
              <div>
                <p className="font-bold text-on-surface">时光信件解锁提醒</p>
                <p className="text-[10px] text-on-surface-variant opacity-60">信件可解锁时第一时间通知您</p>
              </div>
            </div>
            <button 
              onClick={toggleLetterReminder}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.timeLetterReminder ? "bg-primary" : "bg-outline-variant"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.timeLetterReminder ? "left-7" : "left-1"}`}></div>
            </button>
          </div>
        </section>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-xs text-primary/70 leading-relaxed">
            开启问候气泡后，猫咪会在每天早上 (07:00-10:00) 和晚上 (22:00-00:00) 为您送上专属的贴心问候。
          </p>
        </div>
      </div>
    </div>
  );
}
