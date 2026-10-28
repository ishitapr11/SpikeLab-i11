import Image from "next/image";
import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-baseline gap-2" aria-label="SpikeLab home">
      <Image
        src="/icon.png"
        alt=""
        width={30}
        height={30}
        className="self-center rounded-md"
      />
      <span className="font-display text-[23px] leading-none tracking-[-0.02em]">
        Spike<span className="italic">Lab</span>
      </span>
    </Link>
  );
}
