import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  en: string;
  children: ReactNode;
}

export function Panel({ title, en, children }: PanelProps) {
  return (
    <div className="relative bg-paper-1 border border-hairline p-5">
      {/* Corner brackets */}
      <i className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t border-l border-gold-dim opacity-70 pointer-events-none" />
      <i className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t border-r border-gold-dim opacity-70 pointer-events-none" />
      <i className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b border-l border-gold-dim opacity-70 pointer-events-none" />
      <i className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b border-r border-gold-dim opacity-70 pointer-events-none" />

      {/* Header */}
      <div className="flex items-baseline gap-3 mb-3.5 pb-2.5 border-b border-dashed border-hairline">
        <span className="inline-block w-1 h-4 bg-vermillion" />
        <span className="font-serif text-base text-gold tracking-[0.18em]">
          {title}
        </span>
        <span className="font-latin-serif italic text-xs text-bone-mute tracking-[0.04em] ml-auto">
          {en}
        </span>
      </div>

      {children}
    </div>
  );
}
