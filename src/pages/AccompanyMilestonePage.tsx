import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PawLogo from "../components/PawLogo";
import { motion } from "motion/react";

const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_NAMES = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

export default function AccompanyMilestonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { catName, days } = location.state || { catName: "猫咪", days: 1 };

  // 计算月历数据
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // 已陪伴天数（从今天往前推）
  const accompaniedDays = new Set<number>();
  for (let i = 0; i < Math.min(days, daysInMonth); i++) {
    const d = now.getDate() - i;
    if (d > 0) accompaniedDays.add(d);
  }

  return (
    <div className="h-dvh bg-background p-6 overflow-y-auto">
      <header className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">陪伴里程碑</h1>
      </header>

      {/* 天数卡片 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="p-8 bg-gradient-to-br from-[#FF9D76] to-[#FF6B3D] rounded-[40px] text-center mb-6 shadow-lg shadow-[#FF6B3D]/30"
      >
        <p className="text-sm text-white/80 mb-2">与 {catName} 相遇的第</p>
        <h2 className="text-6xl font-extrabold text-white leading-tight">{days}</h2>
        <p className="text-sm text-white/80 mt-2">天</p>
      </motion.div>

      {/* 月历 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="miao-card p-6 bg-white mb-6"
      >
        <h3 className="font-bold text-on-surface text-center mb-4">
          {year}年 {MONTH_NAMES[month]}
        </h3>

        {/* 星期头部 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="text-center text-[11px] font-semibold text-on-surface-variant/40 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 日历格子 */}
        <div className="grid grid-cols-7">
          {/* 空白占位（月初第一天之前的空格） */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* 日期 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isAccompanied = accompaniedDays.has(day);
            const isToday = day === now.getDate();

            let cellClass =
              "aspect-square flex items-center justify-center rounded-xl text-xs font-semibold ";
            if (isToday) {
              cellClass += "bg-primary/10 border border-primary ";
            } else if (isAccompanied) {
              cellClass += "bg-primary/[0.06] ";
            }

            return (
              <div key={day} className={cellClass}>
                {isAccompanied ? (
                  <PawLogo size={16} />
                ) : (
                  <span className="text-on-surface-variant/60">{day}</span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 温馨寄语 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 text-center"
      >
        <p className="text-sm text-on-surface-variant/50 leading-relaxed">
          每一天的陪伴都是最珍贵的礼物，{"\n"}愿你和 {catName} 的故事继续温暖下去。
        </p>
      </motion.div>
    </div>
  );
}
