import React from "react";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
}

export function FlipCard({ frontContent, backContent, className }: FlipCardProps) {
  return (
    <div className={cn("group w-full h-[400px] perspective-[1000px] cursor-pointer", className)}>
      <div className="relative w-full h-full transition-transform duration-700 transform-style-preserve-3d group-hover:-rotate-y-180">
        
        {/* Front */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-card dark:bg-gradient-to-b dark:from-[#1a1333]/80 dark:to-[#0f0f1a]/80 border border-border rounded-2xl p-6 shadow-lg overflow-hidden translate-z-0 flex flex-col">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {frontContent}
        </div>

        {/* Back */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-secondary dark:bg-gradient-to-br dark:from-[#2a1b4d]/90 dark:to-[#1a1333]/90 border border-primary/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(124,92,255,0.2)] overflow-hidden rotate-y-180 translate-z-0 flex flex-col">
           <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
           {backContent}
        </div>

      </div>
    </div>
  );
}
