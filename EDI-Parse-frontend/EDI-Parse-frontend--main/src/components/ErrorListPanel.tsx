import React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { EDIError } from "@/components/ErrorAccordion";
import { cn } from "@/lib/utils";

interface ErrorListPanelProps {
  errors: EDIError[];
  activeErrorId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  errorMap: Record<string, { segment: string, fixText: string, expected: string }>;
}

export function ErrorListPanel({ errors, activeErrorId, onSelect, onHover, errorMap }: ErrorListPanelProps) {
  if (errors.length === 0) {
    return (
      <div className="p-8 text-center bg-transparent rounded-xl border border-dashed border-white/10">
        <p className="text-sm text-slate-400 font-medium">All issues resolved.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
      {errors.map((err, idx) => {
        // Handle both object and string errors (fallback)
        const errorObj = typeof err === 'string' 
          ? { id: `e-${idx}`, message: err, segment: "GEN", severity: "error" as const }
          : err;

        const isActive = activeErrorId === errorObj.id;
        const colorClass = errorObj.severity === "error" || errorObj.severity === "critical" ? "text-red-500" : "text-amber-500";
        const borderColor = errorObj.severity === "error" || errorObj.severity === "critical" ? "border-red-500/20" : "border-amber-500/20";
        const bgColor = errorObj.severity === "error" || errorObj.severity === "critical" ? "bg-red-500/5" : "bg-amber-500/5";

        const errInfo = errorMap[errorObj.id];

        return (
          <div
            key={errorObj.id}
            className={cn(
              "flex flex-col rounded-lg overflow-hidden border transition-all w-full shadow-sm",
              borderColor,
              bgColor,
              isActive ? "ring-2 ring-primary/20 shadow-md" : "hover:shadow-md"
            )}
          >
            {/* Header / Main Row */}
            <div
              className="flex items-start gap-4 p-4 w-full cursor-pointer group"
              onClick={() => onSelect(isActive ? "" : errorObj.id)}
              onMouseEnter={() => onHover(errorObj.id)}
              onMouseLeave={() => onHover(null)}
            >
              <div className={cn("mt-1 shrink-0", colorClass)}>
                <AlertCircle className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 shadow-sm font-mono uppercase">
                      {errorObj.segment}
                    </span>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", colorClass)}>
                      {errorObj.severity}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                  </span>
                </div>
                
                <div className="text-[13px] text-foreground/90 font-medium leading-relaxed">
                  {errorObj.llmMessage || errorObj.message}
                </div>
              </div>
              
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 mt-1",
                isActive ? "rotate-180" : ""
              )} />
            </div>

            {/* Details Section */}
            {isActive && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200">
                <div className="h-px bg-border/20 mb-4" />
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-background/50 rounded-md border border-border/10 p-3">
                    <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Validation Context
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This segment violates HIPAA structural or business rules. Check the EDI source for missing mandatory elements or invalid qualifiers.
                    </p>
                  </div>

                  {errInfo && (
                    <div className="bg-primary/5 rounded-md border border-primary/10 p-3">
                      <h4 className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mb-2 text-primary">
                        Recommended Structure
                      </h4>
                      <code className="text-[11px] font-mono text-primary font-medium block overflow-x-auto whitespace-pre">
                        {errInfo.expected}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
