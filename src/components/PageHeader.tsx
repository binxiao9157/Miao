import React from "react";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  dark?: boolean;
  onBack?: () => void;
}

export default function PageHeader({ title, subtitle, action, dark, onBack }: PageHeaderProps) {
  return (
    <header 
      className={`sticky top-0 z-30 backdrop-blur-xl px-6 flex justify-between items-center shrink-0 ${dark ? 'bg-black/40 text-white' : 'bg-background/80 text-on-surface'}`}
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        height: 'calc(env(safe-area-inset-top) + 5.5rem)' 
      }}
    >
      <div className="flex items-center gap-3 mt-2">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-on-surface-variant active:scale-90 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <div className="flex flex-col justify-center">
          <h1 className={`text-3xl font-black tracking-tight leading-none ${dark ? 'text-white' : 'text-on-surface'}`}>{title}</h1>
          <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 leading-none ${dark ? 'text-white/60' : 'text-on-surface-variant'}`}>{subtitle}</p>
        </div>
      </div>
      {action && (
        <div className="mt-2 shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}
