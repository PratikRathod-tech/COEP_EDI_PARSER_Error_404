import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle } from "lucide-react";

export interface EDIError {
  id: string;
  segment: string;
  message: string;
  llmMessage?: string; // Simplified message from LLM
  severity: "warning" | "error" | "critical";
}

interface ErrorAccordionProps {
  errors: EDIError[];
}

const ErrorAccordion = ({ errors }: ErrorAccordionProps) => {
  if (errors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No errors detected.</p>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {errors.map((err) => (
        <AccordionItem key={err.id} value={err.id}>
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-4 h-4 ${
                  err.severity === "error" ? "text-red-500" : "text-amber-500"
                }`}
              />
              <span className="font-mono text-xs text-primary">{err.segment}</span>
              <span className="text-foreground">{err.message}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">
              Segment <strong>{err.segment}</strong> has a {err.severity}-level
              issue. Review the segment value and ensure it conforms to the
              HIPAA X12 specification for this transaction type.
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default ErrorAccordion;
