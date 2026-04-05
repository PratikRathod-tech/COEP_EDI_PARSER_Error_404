import React from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PremiumCard({ children, className, ...props }: PremiumCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-6 relative overflow-hidden",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:border-primary/20",
        className
      )}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}
