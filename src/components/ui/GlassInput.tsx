"use client";

import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, useState } from "react";
import { Icon } from "./Icon";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

export function GlassInput({
  label,
  error,
  icon,
  className,
  ...props
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-txt-secondary mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div
        className={cn(
          "glass flex items-center rounded-xl px-4 transition-all duration-300",
          focused && "glass-glow border-accent-primary/30",
          error && "border-error/50",
          className
        )}
      >
        {icon && (
          <Icon
            name={icon}
            size={20}
            className="text-txt-muted mr-3 shrink-0"
          />
        )}
        <input
          className={cn(
            "w-full bg-transparent py-3 text-txt-primary placeholder:text-txt-muted",
            "outline-none text-sm"
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </div>
      {error && (
        <p className="text-error text-xs mt-1.5 ml-1 flex items-center gap-1">
          <Icon name="error" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
