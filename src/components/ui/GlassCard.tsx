"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef, type MouseEvent } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "light" | "heavy";
  glow?: boolean;
  hover?: boolean;
  tilt?: boolean;
}

export function GlassCard({
  variant = "default",
  glow = false,
  hover = true,
  tilt = false,
  className,
  children,
  ...props
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const glassClass = {
    default: "glass",
    light: "glass-light",
    heavy: "glass-heavy",
  }[variant];

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  }

  function handleMouseLeave() {
    if (!tilt || !ref.current) return;
    ref.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
  }

  return (
    <motion.div
      ref={ref}
      className={cn(
        glassClass,
        "rounded-2xl overflow-hidden transition-all duration-300",
        glow && "glass-glow",
        className
      )}
      whileHover={hover ? { scale: 1.02 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </motion.div>
  );
}
