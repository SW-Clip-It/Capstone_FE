"use client";

import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  size?: number;
  fill?: boolean;
  weight?: number;
  className?: string;
}

export function Icon({
  name,
  size = 24,
  fill = false,
  weight = 400,
  className,
}: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  );
}
