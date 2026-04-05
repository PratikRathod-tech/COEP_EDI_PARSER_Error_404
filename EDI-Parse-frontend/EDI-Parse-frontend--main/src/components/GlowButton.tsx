import React from "react";
import { cn } from "@/lib/utils";

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function GlowButton({ children, className, ...props }: GlowButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white",
        "bg-primary hover:opacity-90",
        "hover:scale-105 hover:shadow-glow",
        "active:scale-95",
        "transition-all duration-300 ease-out",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
