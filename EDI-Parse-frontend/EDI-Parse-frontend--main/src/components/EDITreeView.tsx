import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Maximize2, Minimize2, Lightbulb, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TreeNode {
  id: string; // Unique path-based ID for tree state
  segId?: string; // Original segment ID (e.g., ISA)
  label: string;
  value?: string;
  children?: TreeNode[];
  type?: 'loop' | 'segment' | 'element';
  loopId?: string;
  parentLoopId?: string;
  rawContent?: string;
}

interface TreeItemProps {
  node: TreeNode;
  depth?: number;
  expandedSet: Set<string>;
  onToggle: (id: string, isOpen: boolean) => void;
}

const TreeItem = ({ node, depth = 0, expandedSet, onToggle }: TreeItemProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isOpen = expandedSet.has(node.id);
  const isLoop = node.type === 'loop';

  if (isLoop) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => hasChildren && onToggle(node.id, !isOpen)}
          className={cn(
            "w-full flex items-center gap-3 py-1.5 px-3 transition-colors bg-secondary/30 hover:bg-secondary/50 border-y border-border/20 group",
            hasChildren ? "cursor-pointer" : "cursor-default"
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform" />
            )
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
              {node.label}
            </span>
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tight opacity-70">
              Loop: {node.loopId}
            </span>
            {node.parentLoopId && node.parentLoopId !== "0000" && (
              <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-tight hidden lg:inline">
                Parent: {node.parentLoopId}
              </span>
            )}
          </div>
        </button>

        {isOpen && hasChildren && (
          <div className="mt-0.5">
            {node.children!.map((child) => (
              <TreeItem key={child.id} node={child} depth={depth + 1} expandedSet={expandedSet} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Segment Rendering
  if (node.type === 'segment') {
    return (
      <div className="group relative">
        <button
          onClick={() => hasChildren && onToggle(node.id, !isOpen)}
          className={cn(
            "w-full flex items-center gap-4 py-2 px-4 transition-colors hover:bg-primary/5 border-b border-border/10",
            hasChildren ? "cursor-pointer" : "cursor-default"
          )}
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hasChildren && (
               isOpen ? <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0 transition-transform" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform" />
            )}
            {!hasChildren && <span className="w-3.5 shrink-0" />}
            
            {/* Blue Segment ID Box */}
            <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold font-mono h-5 flex items-center justify-center shrink-0 shadow-sm">
              {node.segId}
            </div>

            {/* Segment Elements Content Overview */}
            <div className="font-mono text-[13px] text-black dark:text-white truncate tracking-wide whitespace-nowrap overflow-hidden text-left">
              {node.rawContent ? (
                node.rawContent.split('*').map((part, i) => (
                  <span key={i} className={cn(i === 0 ? "hidden" : "")}>
                    {i > 1 && <span className="text-muted-foreground/40 mx-1.5 px-0.5">*</span>}
                    <span className="hover:text-primary transition-colors cursor-help px-0.5" title={`${node.segId} Element ${i - 1}`}>
                      {part.replace('~', '').trim()}
                    </span>
                    {part.includes('~') && <span className="text-muted-foreground/40 mx-1">~</span>}
                  </span>
                ))
              ) : (
                node.value || node.label
              )}
            </div>
          </div>
        </button>

        {isOpen && hasChildren && (
          <div className="bg-primary/5 py-1.5 border-b border-border/10 shadow-inner">
            {node.children!.map((child) => (
              <TreeItem key={child.id} node={child} depth={depth + 2} expandedSet={expandedSet} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Element Rendering (The deep Business JSON key/values)
  return (
    <div 
      className="w-full flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-1.5 px-4 transition-colors hover:bg-white/50 dark:hover:bg-black/20"
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      <div className="flex md:w-1/2 min-w-0 pr-4">
        <span className="text-[12px] font-medium text-muted-foreground truncate" title={node.label}>
          {node.label}
        </span>
      </div>
      <div className="flex md:w-1/2 min-w-0">
        <span className="text-[13px] font-mono font-semibold text-foreground truncate" title={node.value}>
          {node.value}
        </span>
      </div>
    </div>
  );
};

interface EDITreeViewProps {
  tree: TreeNode[];
}

export default function EDITreeView({ tree }: EDITreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Auto-expand top levels on first load
  useEffect(() => {
    if (tree.length > 0 && expandedNodes.size === 0) {
      setExpandedNodes(new Set([tree[0].id]));
    }
  }, [tree]);

  const getAllNodeIds = (nodes: TreeNode[]): string[] => {
    let ids: string[] = [];
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        ids = ids.concat(getAllNodeIds(node.children));
      }
    }
    return ids;
  };

  const allIds = getAllNodeIds(tree);
  const isFullyExpanded = expandedNodes.size === allIds.length && allIds.length > 0;

  const handleToggleNode = (id: string, isOpen: boolean) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleGlobal = () => {
    if (isFullyExpanded) {
      setExpandedNodes(new Set());
    } else {
      setExpandedNodes(new Set(allIds));
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* High-Fidelity Toolbar to match image */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleGlobal}
            title={isFullyExpanded ? "Collapse All" : "Expand All"}
            className={cn(
              "p-1.5 rounded-md border border-border bg-card transition-all shadow-sm",
              "hover:bg-primary/10 hover:text-primary hover:border-primary/30 active:scale-95"
            )}
          >
            {isFullyExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <div className="h-4 w-px bg-border mx-1" />
        </div>


      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {tree.map((node) => (
          <TreeItem key={node.id} node={node} expandedSet={expandedNodes} onToggle={handleToggleNode} />
        ))}
      </div>
    </div>
  );
}
