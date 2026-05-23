interface SealStampProps {
  text: string;
  size?: "sm" | "md" | "lg";
  rotation?: number;
}

const sizeMap = {
  sm: "w-[22px] h-[22px] text-[13px]",
  md: "w-[32px] h-[32px] text-[15px]",
  lg: "w-[44px] h-[44px] text-[18px]",
} as const;

export function SealStamp({ text, size = "md", rotation = -4 }: SealStampProps) {
  return (
    <span
      className={`inline-grid place-items-center bg-vermillion text-bone font-serif font-semibold leading-none shadow-[0_0_0_2px_rgba(196,57,44,0.18)] ${sizeMap[size]}`}
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}
