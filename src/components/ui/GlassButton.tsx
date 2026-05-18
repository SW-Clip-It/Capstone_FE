"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";
import { type ButtonHTMLAttributes } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconRight?: string;
  loading?: boolean;
}

export function GlassButton({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: GlassButtonProps) {
  const variants = {
    primary:
      "bg-accent-primary/90 hover:bg-accent-primary border-accent-primary/50 text-white shadow-lg shadow-accent-primary/20",
    secondary:
      "glass border-glass-border hover:border-glass-border-hover text-txt-primary",
    ghost:
      "bg-transparent hover:bg-white/5 border-transparent text-txt-secondary hover:text-txt-primary",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3 text-base gap-2.5",
  };

  const iconSizes = { sm: 16, md: 18, lg: 20 };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center justify-center rounded-xl border font-medium",
        "transition-all duration-200 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading ? (
        <Icon
          name="progress_activity"
          size={iconSizes[size]}
          className="animate-spin"
        />
      ) : icon ? (
        <Icon name={icon} size={iconSizes[size]} />
      ) : null}
      {children}
      {iconRight && !loading && (
        <Icon name={iconRight} size={iconSizes[size]} />
      )}
    </motion.button>
  );
}
