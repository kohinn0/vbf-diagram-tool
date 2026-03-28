import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
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
          "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-vbf)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm": variant === "default",
            "bg-[var(--color-bg-input)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]/80 shadow-sm": variant === "secondary",
            "bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90 shadow-sm": variant === "danger",
            "border border-[var(--border-color)] bg-transparent hover:bg-[var(--color-bg-input)]": variant === "outline",
            "hover:bg-[var(--color-bg-input)] text-[var(--color-text-main)]": variant === "ghost",
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
