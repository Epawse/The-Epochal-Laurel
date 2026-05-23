"use client";

interface ExamChoiceProps {
  letter: string;
  text: string;
  selected: boolean;
  onClick: () => void;
}

export function ExamChoice({ letter, text, selected, onClick }: ExamChoiceProps) {
  return (
    <button
      type="button"
      className={`relative bg-[rgba(15,12,8,0.36)] border p-2.5 px-3.5 pb-3 cursor-pointer text-left transition-all duration-200 ease-out flex flex-col gap-1.5 min-h-[86px] ${
        selected
          ? "border-gold-glow bg-[rgba(201,165,90,0.10)] shadow-[inset_0_0_0_1px_rgba(232,200,121,0.4),0_8px_24px_rgba(0,0,0,0.4)]"
          : "border-hairline hover:border-gold hover:bg-[rgba(44,34,24,0.55)] hover:-translate-y-0.5"
      }`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Option ${letter}: ${text}`}
    >
      {/* Selected corner triangle */}
      {selected && (
        <span
          className="absolute -top-px -right-px w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-gold-glow"
          aria-hidden="true"
        />
      )}

      {/* Letter */}
      <span className="font-latin-serif italic text-lg text-gold tracking-[0.06em]">
        {letter}
      </span>

      {/* Answer text */}
      <span className="font-serif text-[14.5px] text-bone leading-relaxed tracking-[0.04em]">
        {text}
      </span>
    </button>
  );
}
