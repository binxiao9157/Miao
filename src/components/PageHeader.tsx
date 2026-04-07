import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header 
      className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-6 flex justify-between items-center shrink-0"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        height: 'calc(env(safe-area-inset-top) + 5.5rem)' 
      }}
    >
      <div className="flex flex-col justify-center mt-2">
        <h1 className="text-3xl font-black tracking-tight text-on-surface leading-none">{title}</h1>
        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-2 leading-none">{subtitle}</p>
      </div>
      {action && (
        <div className="mt-2 shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}
