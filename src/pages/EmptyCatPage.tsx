import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import PawLogo from "../components/PawLogo";
import { motion } from "motion/react";
import { useAuthContext } from "../context/AuthContext";

export default function EmptyCatPage() {
  const navigate = useNavigate();
  const { logout } = useAuthContext();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="absolute left-6 w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-[#5D4037] active:scale-90 transition-transform z-50 shadow-sm"
        style={{ top: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
      >
        <ArrowLeft size={20} />
      </button>

      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
        {/* Illustration Container */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="relative w-64 h-64 mb-10"
        >
          {/* Soft Glow Background */}
          <div className="absolute inset-0 bg-white rounded-[64px] shadow-[0_20px_60px_rgba(0,0,0,0.05)]"></div>
          
          {/* Icon/Illustration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <PawLogo size={80} className="opacity-10 rotate-12" />
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, 0]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <PawLogo size={80} className="opacity-20 -rotate-12" />
              </motion.div>
            </div>
          </div>
          
          {/* Floating Sparkles */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-12 right-12 text-primary"
          >
            <Sparkles size={24} />
          </motion.div>
        </motion.div>

        <h1 className="text-2xl font-black text-on-surface mb-4 tracking-tight">还没有猫咪伙伴</h1>
        <p className="text-on-surface-variant text-sm leading-relaxed mb-12 opacity-60">
          每一个温暖的灵魂都在等待相遇。开启一段专属缘分，领养你的第一只数字猫咪吧。
        </p>

        <button 
          onClick={() => navigate("/welcome", { replace: true })}
          className="miao-btn-primary w-full py-5 text-lg font-black shadow-[0_15px_30px_rgba(232,159,113,0.3)] group relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            开启缘分
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </span>
          <motion.div 
            className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
          />
        </button>
      </div>

      <div className="absolute bottom-12 text-center">
        <p className="text-[10px] text-on-surface-variant/30 font-bold tracking-[0.3em] uppercase">
          Miao Sanctuary · Pure Companionship
        </p>
      </div>
    </div>
  );
}
