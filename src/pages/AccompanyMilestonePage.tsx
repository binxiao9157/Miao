import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PawLogo from "../components/PawLogo";
import { motion } from "motion/react";

export default function AccompanyMilestonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { catName, days } = location.state || { catName: "猫咪", days: 1 };

  // 简单的月历视图模拟
  const renderCalendar = () => {
    const daysInMonth = 30;
    return Array.from({ length: daysInMonth }).map((_, i) => (
      <div key={i} className="w-8 h-8 flex items-center justify-center bg-surface-container rounded-lg text-[10px] font-bold text-on-surface-variant">
        {i < days ? <PawLogo size={12} /> : i + 1}
      </div>
    ));
  };

  return (
    <div className="min-h-dvh bg-background p-6 overflow-y-auto">
      <header className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">陪伴里程碑</h1>
      </header>

      <div className="miao-card p-8 bg-white text-center mb-6">
        <p className="text-sm font-bold text-on-surface-variant opacity-60 mb-2">与 {catName} 相遇的第</p>
        <h2 className="text-6xl font-black text-primary mb-2">{days}</h2>
        <p className="text-sm font-bold text-on-surface-variant opacity-60">天</p>
      </div>

      <div className="miao-card p-6 bg-white mb-6">
        <h3 className="font-bold text-on-surface mb-4">陪伴日历</h3>
        <div className="grid grid-cols-7 gap-2">
          {renderCalendar()}
        </div>
      </div>

      <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 text-center">
        <p className="text-sm font-bold text-primary leading-relaxed">
          这是你和 {catName} 相遇的第 {days} 天，未来的日子也要一直在一起哦～
        </p>
      </div>
    </div>
  );
}
