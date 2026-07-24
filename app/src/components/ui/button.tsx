import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "default" | "icon" | "sm";
  variant?: "default" | "ghost" | "outline";
};

const variants = {
  default: "bg-brand text-white hover:bg-brand-deep",
  ghost: "bg-transparent text-ink hover:bg-surface-soft",
  outline: "border border-line bg-surface text-ink hover:bg-surface-soft",
};

const sizes = {
  default: "h-10 px-3",
  icon: "h-9 w-9 p-0",
  sm: "h-9 px-3 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "default", type = "button", variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      type={type}
      {...props}
    />
  ),
);

Button.displayName = "Button";
