import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-baseline gap-2" aria-label="SpikeLab home">
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true" className="self-center">
        <path
          d="M1 12 H6 L8.5 3 L11.5 14 L14 8 H21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-display text-[23px] leading-none tracking-[-0.02em]">
        Spike<span className="italic">Lab</span>
      </span>
    </Link>
  );
}
