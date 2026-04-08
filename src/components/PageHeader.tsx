import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  dark?: boolean;
}

export default function PageHeader({ title, subtitle, action, dark }: PageHeaderProps) {
  return (
    <header 
      className={`sticky top-0 z-30 backdrop-blur-xl px-6 flex justify-between items-center shrink-0 ${dark ? 'bg-black/40 text-white' : 'bg-background/80 text-on-surface'}`}
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        height: 'calc(env(safe-area-inset-top) + 5.5rem)' 
      }}
    >
      <div className="flex flex-col justify-center mt-2">
        <h1 className={`text-3xl font-black tracking-tight leading-none ${dark ? 'text-white' : 'text-on-surface'}`}>{title}</h1>
        <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 leading-none ${dark ? 'text-white/60' : 'text-on-surface-variant'}`}>{subtitle}</p>
      </div>
      {action && (
        <div className="mt-2 shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}
