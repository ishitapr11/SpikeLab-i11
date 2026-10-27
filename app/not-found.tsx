import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="eyebrow">SpikeLab</p>
      <h1 className="mt-3 font-display text-5xl">
        This page is not part of the <span className="italic">lab.</span>
      </h1>
      <Link href="/" className={buttonClass("solid", "mt-6 w-fit")}>
        Back to SpikeLab
      </Link>
    </main>
  );
}
