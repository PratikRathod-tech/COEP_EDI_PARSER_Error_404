import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileText, GitCompare, Database, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiffLineProps {
  content: string;
  count: number;
  status?: "added" | "removed" | "modified" | "none";
}

const DiffLine = ({ content, count, status = "none" }: DiffLineProps) => {
  const bgClass = {
    added: "bg-green-500/10 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-l-2 border-green-500/50",
    removed: "bg-red-500/10 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-l-2 border-red-500/50",
    modified: "bg-yellow-500/10 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-l-2 border-yellow-500/50",
    none: "text-muted-foreground/80"
  }[status];

  return (
    <div className={cn("flex group font-mono text-[13px] leading-6", bgClass)}>
      <span className="w-12 shrink-0 text-right pr-4 text-muted-foreground/30 select-none border-r border-border/10 mr-4">
        {count}
      </span>
      <span className="flex-1 whitespace-pre px-2 truncate" title={content}>{content}</span>
    </div>
  );
};

const Compare = () => {
  const [originalLines, setOriginalLines] = useState<DiffLineProps[]>([]);
  const [revisedLines, setRevisedLines] = useState<DiffLineProps[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const original = sessionStorage.getItem("originalEdi");
    const corrected = sessionStorage.getItem("correctedEdi");

    if (original && corrected) {
      // Detect Terminator
      const term = original.includes("~") ? "~" : original[105] || "~";
      
      const oldSegs = original.split(term).filter(s => s.trim());
      const newSegs = corrected.split(term).filter(s => s.trim());

      const oldRows: DiffLineProps[] = [];
      const newRows: DiffLineProps[] = [];

      // Simple Diff Logic (Segment by Segment)
      const maxLen = Math.max(oldSegs.length, newSegs.length);
      
      for (let i = 0; i < maxLen; i++) {
        const s1 = oldSegs[i] || "";
        const s2 = newSegs[i] || "";

        if (s1 === s2) {
          oldRows.push({ content: s1, count: i + 1, status: "none" });
          newRows.push({ content: s2, count: i + 1, status: "none" });
        } else if (s1 && !s2) {
          oldRows.push({ content: s1, count: i + 1, status: "removed" });
          newRows.push({ content: "", count: i + 1, status: "none" });
        } else if (!s1 && s2) {
          oldRows.push({ content: "", count: i + 1, status: "none" });
          newRows.push({ content: s2, count: i + 1, status: "added" });
        } else {
          // Modified - check if IDs match but content differs
          const id1 = s1.split('*')[0];
          const id2 = s2.split('*')[0];
          
          if (id1 === id2) {
             oldRows.push({ content: s1, count: i + 1, status: "modified" });
             newRows.push({ content: s2, count: i + 1, status: "modified" });
          } else {
             // Treat as a removal and addition for clarity
             oldRows.push({ content: s1, count: i + 1, status: "removed" });
             newRows.push({ content: s2, count: i + 1, status: "added" });
          }
        }
      }

      setOriginalLines(oldRows);
      setRevisedLines(newRows);
      setHasData(true);
    }
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background font-sans selection:bg-primary/30 text-foreground overflow-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col h-full bg-card relative z-10 min-w-0">
          <header className="h-14 flex shrink-0 items-center justify-between border-b border-border px-6 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-white" />
              <div className="flex items-center gap-2 font-heading font-bold text-lg tracking-tight truncate">
                 <GitCompare className="w-5 h-5 text-primary shrink-0" />
                 EDI Compare
              </div>
              <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
              <span className="text-sm font-medium text-muted-foreground truncate uppercase tracking-widest text-[11px]">Side-by-Side Review</span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
               <div className="flex items-center gap-3 px-3 py-1 bg-secondary/50 rounded-full border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Added</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Removed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Modified</span>
                  </div>
               </div>
               <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                    <h2 className="text-xl font-medium tracking-tight">Active Comparison</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Info className="w-3 h-3" />
                        Comparing original submission with current AI-optimized version.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
              {/* Original Panel */}
              <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Original File</span>
                  <Database className="w-3 h-3 text-muted-foreground opacity-50" />
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-slate-50/50 dark:bg-[#050508]">
                  {hasData ? (
                    <div className="py-4">
                      {originalLines.map((line, i) => (
                        <DiffLine key={i} {...line} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                      No active comparison session.
                    </div>
                  )}
                </div>
              </div>

              {/* Revised Panel */}
              <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Revised (Corrected)</span>
                  <Database className="w-3 h-3 text-primary" />
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-slate-50/50 dark:bg-[#050508]">
                  {hasData ? (
                    <div className="py-4">
                      {revisedLines.map((line, i) => (
                        <DiffLine key={i} {...line} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                      Apply fixes in dashboard first.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Compare;
