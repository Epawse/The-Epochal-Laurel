import type { ReactNode } from "react";

export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[1440px] mx-auto px-8 pb-8 min-h-screen flex flex-col">
      {children}
    </div>
  );
}
