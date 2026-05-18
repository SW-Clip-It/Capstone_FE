"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface ToastData {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

const icons: Record<ToastData["type"], string> = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning",
};

const colors: Record<ToastData["type"], string> = {
  success: "text-success",
  error: "text-error",
  info: "text-info",
  warning: "text-warning",
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={cn(
        "glass-heavy rounded-xl px-4 py-3 flex items-center gap-3",
        "min-w-[280px] max-w-[400px] cursor-pointer"
      )}
      onClick={() => onDismiss(toast.id)}
    >
      <Icon name={icons[toast.type]} size={20} className={colors[toast.type]} fill />
      <span className="text-sm text-txt-primary flex-1">{toast.message}</span>
      <Icon name="close" size={16} className="text-txt-muted hover:text-txt-primary" />
    </motion.div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
