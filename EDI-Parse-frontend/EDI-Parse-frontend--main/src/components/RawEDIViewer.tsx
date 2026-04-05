import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { GlowButton } from "@/components/GlowButton";

interface RawEDIViewerProps {
  rawText: string;
  activeErrorId: string | null;
  hoveredErrorId: string | null;
  onFix: (errorId: string, correctedLine: string) => void;
  // Passing the mock map just for demo resolving context
  errorMap: Record<string, { segment: string, fixText: string, expected: string }>;
}

export function RawEDIViewer({ rawText, activeErrorId, hoveredErrorId, onFix, errorMap }: RawEDIViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Split raw text loosely by ~ delimiter for line-by-line view
  const lines = rawText.split('~').map(line => line.trim()).filter(Boolean);

  useEffect(() => {
    if (activeErrorId && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeErrorId]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 h-full overflow-y-auto w-full bg-secondary/30 rounded-xl border border-border p-5 font-mono text-[15px] leading-7 custom-scrollbar shadow-inner relative"
    >
      {lines.map((line, index) => {
        const segMatch = line.split('*')[0];

        // Find if this line has a matching error
        const matchedErrorEntry = Object.entries(errorMap).find(([_, info]) => info.segment === segMatch);
        const errId = matchedErrorEntry ? matchedErrorEntry[0] : null;
        const errInfo = matchedErrorEntry ? matchedErrorEntry[1] : null;

        const isActive = activeErrorId === errId;
        const isHoveredLocal = hoveredErrorId === errId;
        const needsHighlight = errId && (isActive || isHoveredLocal);

        let highlightClass = "text-muted-foreground hover:bg-secondary/50 border-l-4 border-transparent";
        if (needsHighlight) {
          const isErr = errInfo?.expected.includes("VALID_NPI") || errId === "e2"; // specific mapping for error vs warning
          if (isActive) {
            highlightClass = isErr
              ? "bg-red-500/10 border-l-4 border-red-500 text-red-600 dark:text-red-300 shadow-md"
              : "bg-amber-500/10 border-l-4 border-amber-500 text-amber-600 dark:text-amber-300 shadow-md";
          } else {
            highlightClass = "bg-secondary/50 border-l-4 border-border text-foreground";
          }
        }

        return (
          <div
            key={index}
            ref={isActive ? activeLineRef : null}
            className={cn(
              "relative px-3 py-1.5 transition-all duration-200 list-none",
              highlightClass,
              isActive && "z-10 shadow-sm"
            )}
          >
            <span className={cn("font-bold mr-2", needsHighlight ? "opacity-100" : "text-purple-400")}>{segMatch}</span>
            <span className={cn(
              needsHighlight && "underline decoration-2 underline-offset-4",
              needsHighlight && (errInfo?.expected.includes("VALID_NPI") || errId === "e2" ? "decoration-red-500/80 stroke-red-500" : "decoration-amber-500/80 stroke-amber-500"),
              // isActive && "animate-pulse"
            )}>
              {line.substring(segMatch.length)}
            </span>
            <span className="text-muted-foreground/30">~</span>

            {/* In-Line Hover Data / Fix Button when Active */}
            {isActive && errId && errInfo && (
              <div className="absolute left-0 bottom-full mb-2 w-max max-w-[300px] z-50 bg-card border border-border shadow-xl p-3 rounded-lg animate-in slide-in-from-bottom-2 fade-in">
                <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-card border-b border-r border-border rotate-45" />
                <p className="text-xs text-foreground mb-2 font-sans tracking-wide">
                  <span className="opacity-60 text-[11px] uppercase">Expected format: </span>
                  <br />
                  <code className="text-emerald-500 dark:text-emerald-400 text-[11px] font-mono mt-1 block">{errInfo.expected}</code>
                </p>
                <button
                  onClick={() => onFix(errId, errInfo.fixText)}
                  className="w-full text-center bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-medium py-1.5 rounded transition-colors font-sans"
                >
                  Apply Corrected Block
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
