import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent select-none",
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:bg-accent hover:text-accent-fg",
        ghost: "text-fg hover:bg-elevated",
        outline: "border border-border bg-transparent text-fg hover:bg-elevated",
        muted: "bg-elevated text-fg hover:bg-border",
        alarm: "bg-alarm text-fg hover:opacity-90",
        warn: "border border-warn/40 bg-warn/10 text-fg hover:bg-warn/20",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-11 px-4 text-sm",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: Props) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
