import { useState } from "react";
import { ChevronDown, ChevronUp, Download, User, Activity, FileText, Layers, Hash } from "lucide-react";
import { PremiumCard } from "./PremiumCard";
import { ParsedEDI } from "@/lib/edi-parser";

interface StructuredDetailsPanelProps {
  parsedData: ParsedEDI;
}

export function StructuredDetailsPanel({ parsedData }: StructuredDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState(
    parsedData.claimSummary.claimId ? "Claim Summary" : 
    parsedData.subscriber.name ? "Subscriber" : "Loop Summary"
  );
  const [isKeyInfoOpen, setIsKeyInfoOpen] = useState(true);

  const TABS = [
    parsedData.claimSummary.claimId && "Claim Summary",
    parsedData.serviceLines.length > 0 && `Service Lines (${parsedData.serviceLines.length})`,
    parsedData.billingProvider.name && "Billing Provider",
    parsedData.subscriber.name && "Subscriber",
    "Loop Summary",
    "EDI Mapping"
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col mt-4 gap-4 pb-10">
      <PremiumCard className="p-0 flex flex-col overflow-hidden">
        
        {/* SUMMARY HEADER */}
        <div className="bg-card px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
               <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                {parsedData.subscriber.name ? `${parsedData.subscriber.name}` : parsedData.claimSummary.claimId ? 'Document Details' : 'EDI Transaction'}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                {parsedData.claimSummary.claimId && <span>ID: <span className="text-foreground">{parsedData.claimSummary.claimId}</span></span>}
                {parsedData.claimSummary.claimId && parsedData.claimSummary.chargeAmount && <span className="w-1 h-1 rounded-full bg-slate-500" />}
                {parsedData.claimSummary.chargeAmount && <span>Amt: <span className="text-foreground">${parsedData.claimSummary.chargeAmount}</span></span>}
              </div>
            </div>
          </div>
        </div>

        {/* DRIVABLE TABS */}
        <div className="px-6 py-2 border-b border-border bg-secondary/30 flex items-center gap-6 shrink-0 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[11px] font-bold uppercase tracking-wider py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* DYNAMIC CONTENT BODY */}
        <div className="p-6 bg-card flex-1 min-h-[300px]">
          
          {/* 1. CLAIM SUMMARY */}
          {activeTab === "Claim Summary" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setIsKeyInfoOpen(!isKeyInfoOpen)}
                  className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors"
                >
                  {isKeyInfoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Key Claim Info
                </button>
              </div>

              {isKeyInfoOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
                  <InfoBlock label="Claim ID (Patient Ctrl Num)" value={parsedData.claimSummary.claimId} />
                  <InfoBlock label="Total Charge Amount" value={parsedData.claimSummary.chargeAmount ? `$${parsedData.claimSummary.chargeAmount}` : null} />
                  <InfoBlock label="Place Of Service" value={parsedData.claimSummary.placeOfService} />
                  <InfoBlock label="Service Dates (DTP)" value={parsedData.claimSummary.serviceDates} />
                </div>
              )}
            </div>
          )}

          {/* 2. SERVICE LINES */}
          {activeTab.startsWith("Service Lines") && (
            <div className="animate-in fade-in duration-300 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" /> 2400 Loop - Service Lines
              </h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/50 text-xs uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Line #</th>
                      <th className="px-4 py-3">Procedure Code</th>
                      <th className="px-4 py-3">Charge Amount</th>
                      <th className="px-4 py-3">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedData.serviceLines.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No service lines parsed.</td></tr>
                    ) : (
                      parsedData.serviceLines.map((line, i) => (
                        <tr key={i} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{line.lineNumber}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{line.procedureCode || '--'}</td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">${line.chargeAmount || '0.00'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{line.units || '--'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. BILLING PROVIDER */}
          {activeTab === "Billing Provider" && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileText className="w-4 h-4" /> 2010AA Loop
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
                <InfoBlock label="Provider Name" value={parsedData.billingProvider.name} fallback="Not Present" />
                <InfoBlock label="NPI" value={parsedData.billingProvider.npi} fallback="Not Present" />
              </div>
            </div>
          )}

          {/* 4. SUBSCRIBER */}
          {activeTab === "Subscriber" && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                <User className="w-4 h-4" /> 2010BA Loop
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
                <InfoBlock label="Subscriber Name" value={parsedData.subscriber.name} fallback="Not Present" />
                <InfoBlock label="Member ID" value={parsedData.subscriber.id} fallback="Not Present" />
              </div>
            </div>
          )}

          {/* 5. LOOP SUMMARY */}
          {activeTab === "Loop Summary" && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Structural Overview
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parsedData.loopSummary.map(loop => (
                  <div key={loop.id} className="p-4 border border-border rounded-xl bg-secondary/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{loop.id}</span>
                      {loop.present ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Found ({loop.count})</span>
                      ) : (
                        <span className="text-[10px] bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Missing</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{loop.label}</span>
                    {loop.details.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
                        {loop.details.slice(0, 3).map((det, idx) => (
                           <span key={idx} className="text-[11px] text-muted-foreground font-mono bg-secondary/40 px-1 py-0.5 rounded truncate">{det}</span>
                        ))}
                        {loop.details.length > 3 && <span className="text-[10px] text-muted-foreground italic">+{loop.details.length - 3} more</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 6. EDI MAPPING */}
          {activeTab === "EDI Mapping" && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                <Hash className="w-4 h-4" /> Origin Mapping Trace
              </h4>
              <div className="border border-border rounded-lg overflow-hidden bg-secondary/20">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Business Field</th>
                      <th className="px-4 py-3">Extracted Value</th>
                      <th className="px-4 py-3">X12 Segment Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <MappingRow field="Claim ID" val={parsedData.claimSummary.claimId} target="CLM01" />
                    <MappingRow field="Total Charge" val={parsedData.claimSummary.chargeAmount ? `$${parsedData.claimSummary.chargeAmount}` : undefined} target="CLM02" />
                    <MappingRow field="Billing Provider Name" val={parsedData.billingProvider.name} target="NM103/NM104 where NM101=85" />
                    <MappingRow field="Billing Provider NPI" val={parsedData.billingProvider.npi} target="NM109 where NM101=85" />
                    <MappingRow field="Subscriber Name" val={parsedData.subscriber.name} target="NM103/NM104 where NM101=IL" />
                    <MappingRow field="Subscriber ID" val={parsedData.subscriber.id} target="NM109 where NM101=IL" />
                    <MappingRow field="Patient Name" val={parsedData.patient?.name} target="NM103/NM104 where NM101=QC" />
                    <MappingRow field="Payer Name" val={parsedData.payerName} target="NM103 where NM101=PR" />
                    <MappingRow field="Service Line Procedures" val={parsedData.serviceLines.length > 0 ? `${parsedData.serviceLines.length} codes` : undefined} target="SV101" />

                    {(!parsedData.claimSummary.claimId && !parsedData.billingProvider.name && !parsedData.subscriber.name && !parsedData.payerName) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                          No business field mappings detected in this transaction set.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </PremiumCard>
    </div>
  );
}

// Reusable Info Block helper
function InfoBlock({ label, value, fallback = "--" }: { label: string, value: string | null | undefined, fallback?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-base font-semibold text-foreground tracking-tight">{value || fallback}</span>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

// Reusable Mapping Row helper
function MappingRow({ field, val, target }: { field: string, val: string | null | undefined, target: string }) {
  if (!val) return null;
  return (
    <tr>
      <td className="px-4 py-3 font-medium text-foreground">{field}</td>
      <td className="px-4 py-3 text-muted-foreground">{val}</td>
      <td className="px-4 py-3"><code className="bg-secondary/50 px-2 py-1 rounded font-mono text-[11px] text-primary">{target}</code></td>
    </tr>
  );
}
