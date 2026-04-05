import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PremiumCard } from "@/components/PremiumCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileText, Loader2, Upload, ChevronRight, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchReconciliation, reconcileFiles } from "@/lib/api";

const Reconciliation835_837 = () => {
    const [data, setData] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());
    
    // File upload states
    const [file837, setFile837] = useState<File | null>(null);
    const [file835, setFile835] = useState<File | null>(null);

    const handleReconcile = async () => {
        if (!file837 || !file835) return;
        setIsLoading(true);
        try {
            const response = await reconcileFiles(file837, file835);
            setData(response.results);
        } catch (err) {
            console.error("Reconciliation error:", err);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleClaim = (claimId: string) => {
        setExpandedClaims(prev => {
            const next = new Set(prev);
            if (next.has(claimId)) next.delete(claimId);
            else next.add(claimId);
            return next;
        });
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background font-sans selection:bg-primary/30 text-foreground overflow-hidden">
                <AppSidebar />
                <div className="flex-1 flex flex-col h-full bg-card border-r border-border relative z-10 min-w-0">
                    <header className="h-14 mt-1 flex shrink-0 items-center justify-between border-b border-border px-6 bg-card">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="text-muted-foreground hover:text-white" />
                            <div className="flex items-center gap-2 font-heading font-bold text-lg tracking-tight truncate">
                                <FileText className="w-5 h-5 text-primary shrink-0" />
                                <h2 className="text-xl font-medium tracking-tight">837 vs 835 Reconciliation</h2>
                            </div>
                            <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
                            <span className="text-sm font-medium text-muted-foreground truncate italic">Process Claims vs Payments at Service Line Level</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <ThemeToggle />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 flex flex-col w-full h-full gap-6">
                        {/* DUAL UPLOAD ZONE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PremiumCard className="p-4 bg-primary/5 border-primary/20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Upload className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold uppercase tracking-wider">Step 1: Upload 837 (Claim)</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">{file837?.name || "No file selected"}</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        id="file837" 
                                        className="hidden" 
                                        onChange={(e) => setFile837(e.target.files?.[0] || null)}
                                    />
                                    <button 
                                        onClick={() => document.getElementById("file837")?.click()}
                                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-bold hover:opacity-90 transition-opacity"
                                    >
                                        Choose 837
                                    </button>
                                </div>
                            </PremiumCard>

                            <PremiumCard className="p-4 bg-emerald-500/5 border-emerald-500/20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <Upload className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold uppercase tracking-wider">Step 2: Upload 835 (Remit)</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">{file835?.name || "No file selected"}</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        id="file835" 
                                        className="hidden" 
                                        onChange={(e) => setFile835(e.target.files?.[0] || null)}
                                    />
                                    <button 
                                        onClick={() => document.getElementById("file835")?.click()}
                                        className="px-4 py-1.5 bg-emerald-500 text-white rounded text-xs font-bold hover:opacity-90 transition-opacity"
                                    >
                                        Choose 835
                                    </button>
                                </div>
                            </PremiumCard>
                        </div>

                        <div className="flex justify-center -mt-2">
                           <button 
                                onClick={handleReconcile}
                                disabled={!file837 || !file835 || isLoading}
                                className="px-10 py-3 bg-foreground text-background dark:bg-white dark:text-black rounded-full text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                           >
                               {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "RUN RECONCILIATION"}
                           </button>
                        </div>

                        {/* RESULTS ZONE */}
                        <PremiumCard className="flex flex-col p-0 overflow-hidden min-h-[500px]">
                            <div className="px-6 py-4 border-b border-border bg-secondary/20 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
                                    Reconciliation Report
                                </h3>
                                {data && (
                                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tighter">
                                        <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> Matched: {data.filter(c => c.status === 'Matched').length}</span>
                                        <span className="flex items-center gap-1 text-amber-500"><AlertCircle className="w-3 h-3" /> Mismatched: {data.filter(c => c.status !== 'Matched').length}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 overflow-auto bg-card relative">
                                {isLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm z-50">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Running Service Line Cross-Check...</p>
                                    </div>
                                ) : (!data) ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                                            <FileText className="w-8 h-8 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium max-w-xs lowercase">Upload both the CLAIM (837) and REMITTANCE (835) files above to see the reconciliation data.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-muted-foreground uppercase bg-secondary/50 border-b border-border/20 sticky top-0 font-bold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4 w-10"></th>
                                                <th className="px-6 py-4">Patient Control #</th>
                                                <th className="px-6 py-4">Payer Claim # (ICN)</th>
                                                <th className="px-6 py-4">Billed (837)</th>
                                                <th className="px-6 py-4 text-emerald-500">Paid (835)</th>
                                                <th className="px-6 py-4">Variance</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {data.map((row, idx) => {
                                                const billed = Number(row.billedAmount) || 0;
                                                const paid = Number(row.paidAmount) || 0;
                                                const diff = billed - paid;
                                                const isExpanded = expandedClaims.has(row.claimId);
                                                const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
                                                
                                                return (
                                                    <>
                                                        <tr key={idx} className="hover:bg-primary/5 transition-colors group animate-in slide-in-from-top-1 duration-200 cursor-pointer" onClick={() => toggleClaim(row.claimId)}>
                                                            <td className="px-6 py-4">
                                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-[13px] font-bold text-foreground">{row.claimId || "Unknown"}</td>
                                                            <td className="px-6 py-4 font-mono text-[12px] text-muted-foreground">{row.icn || "--"}</td>
                                                            <td className="px-6 py-4 text-muted-foreground">{formatCurrency(billed)}</td>
                                                            <td className="px-6 py-4 font-semibold text-emerald-500">{formatCurrency(paid)}</td>
                                                            <td className="px-6 py-4 font-mono text-xs font-bold">
                                                                {diff === 0 ? <span className="text-emerald-500">0.00</span> : <span className="text-red-500">-{formatCurrency(diff)}</span>}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${
                                                                    row.status === 'Matched' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                                                }`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-secondary/20">
                                                                <td colSpan={6} className="px-10 py-6">
                                                                    <div className="rounded-lg border border-border/20 bg-card p-4 shadow-inner">
                                                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Service Line Breakdown (CPT Comparison)</h4>
                                                                        <table className="w-full text-xs text-left">
                                                                            <thead>
                                                                                <tr className="text-muted-foreground/60 border-b border-border/10">
                                                                                    <th className="py-2">Procedure</th>
                                                                                    <th className="py-2">Billed (837)</th>
                                                                                    <th className="py-2">Billed (835)</th>
                                                                                    <th className="py-2 text-emerald-500">Paid (835)</th>
                                                                                    <th className="py-2">Status</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-border/5">
                                                                                {row.serviceLines.map((sl: any, sidx: number) => (
                                                                                    <tr key={sidx} className="group">
                                                                                        <td className="py-2 font-mono font-bold text-primary">{sl.procedure}</td>
                                                                                        <td className="py-2">{formatCurrency(sl.billed837)}</td>
                                                                                        <td className="py-2 text-muted-foreground">{formatCurrency(sl.billed835)}</td>
                                                                                        <td className="py-2 font-bold text-emerald-500">{formatCurrency(sl.paid835)}</td>
                                                                                        <td className="py-2 font-medium capitalize italic text-muted-foreground">{sl.status}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </PremiumCard>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default Reconciliation835_837;
