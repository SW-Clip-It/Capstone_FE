import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "avatar" | "video";
}

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  const variants = {
    text: "h-4 w-full rounded",
    card: "h-48 w-full rounded-2xl",
    avatar: "h-10 w-10 rounded-full",
    video: "aspect-video w-full rounded-2xl",
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-white/5 via-white/10 to-white/5",
        "bg-[length:200%_100%] animate-shimmer",
        variants[variant],
        className
      )}
    />
  );
}
