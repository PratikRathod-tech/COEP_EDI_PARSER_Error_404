import { CheckCircle, AlertTriangle, Info, ChevronRight } from "lucide-react";

export interface ParsedSegment {
  id: string;
  name: string;
  value: string;
  status: "valid" | "warning" | "info";
}

export interface ParsedData {
  transactionType: string;
  sender: string;
  receiver: string;
  date: string;
  claimCount: number;
  segments: ParsedSegment[];
}

interface ParsedPreviewProps {
  data: ParsedData;
}

const statusIcon = {
  valid: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-primary" />,
};

const ParsedPreview = ({ data }: ParsedPreviewProps) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Transaction", value: data.transactionType },
          { label: "Sender", value: data.sender },
          { label: "Receiver", value: data.receiver },
          { label: "Claims", value: String(data.claimCount) },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-card border border-border rounded-lg p-4"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Segment Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Parsed Segments
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.segments.length} segments found · {data.date}
          </p>
        </div>
        <div className="divide-y divide-border">
          {data.segments.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors"
            >
              {statusIcon[seg.status]}
              <span className="text-xs font-mono text-primary font-medium w-12 shrink-0">
                {seg.id}
              </span>
              <span className="text-sm text-foreground font-medium flex-1">
                {seg.name}
              </span>
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {seg.value}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParsedPreview;
