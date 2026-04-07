import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  onAddClick: () => void;
}

export default function PageHeader({ title, subtitle, onAddClick }: PageHeaderProps) {
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
      <button 
        onClick={onAddClick}
        className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all shrink-0 mt-2"
      >
        <Plus size={28} />
      </button>
    </header>
  );
}
