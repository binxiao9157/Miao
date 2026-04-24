import React from "react";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  dark?: boolean;
  onBack?: () => void;
  onTitleClick?: () => void;
}

export default function PageHeader({ title, subtitle, action, dark, onBack, onTitleClick }: PageHeaderProps) {
  return (
    <header 
      className={`relative px-6 flex justify-between items-center shrink-0 !bg-transparent ${dark ? 'text-white' : 'text-on-surface'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-3 mt-4 mb-4">
        {onBack && (
          <button 
            onClick={onBack}
            aria-label="返回"
            className={`p-2 -ml-2 active:scale-90 transition-transform ${dark ? 'text-white/80' : 'text-on-surface-variant'}`}
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <div 
          className="flex flex-col justify-center cursor-pointer active:opacity-70 select-none"
          onClick={onTitleClick}
        >
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
