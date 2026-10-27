import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "text";
type Size = "regular" | "small";

const variants: Record<Variant, string> = {
  solid: "ink-btn ink-btn-solid",
  outline: "ink-btn ink-btn-outline",
  text: "ink-link inline-flex items-center gap-1.5 text-ink",
};

export function buttonClass(variant: Variant = "solid", className?: string, size: Size = "regular"): string {
  return cn(variants[variant], size === "small" && variant !== "text" && "ink-btn-small", className);
}

export function Button({
  variant = "solid",
  size = "regular",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, className, size)} {...props} />;
}
