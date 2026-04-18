import * as React from "react"
import { cn } from "../../lib/utils"

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "danger" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-vbf)] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-main)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-[var(--color-primary)] text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)] hover:bg-[var(--color-primary-hover)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.45)]": variant === "default",
            "bg-[var(--color-bg-input)] text-[var(--color-text-main)] shadow-[var(--shadow-premium-sm)] hover:bg-[var(--color-bg-input)]/90": variant === "secondary",
            "bg-[var(--color-danger)] text-white shadow-sm hover:bg-[var(--color-danger)]/90": variant === "danger",
            "border border-[var(--border-color)] bg-transparent hover:bg-[var(--color-bg-input)]": variant === "outline",
            "text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]": variant === "ghost",
            "h-9 px-4 py-2 text-sm": size === "default",
            "h-8 rounded-[var(--radius-vbf)] px-3 text-xs": size === "sm",
            "h-10 rounded-md px-8 text-base": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
