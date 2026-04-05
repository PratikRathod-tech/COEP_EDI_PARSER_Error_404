import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PremiumCard } from "@/components/PremiumCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
    ShieldCheck, 
    Upload, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    XCircle, 
    Loader2, 
    Search,
    Download,
    Users
} from "lucide-react";
import { checkEligibility } from "@/lib/api";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/exportUtils";

const Eligibility = () => {
    const [file834, setFile834] = useState<File | null>(null);
    const [file837, setFile837] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<any[] | null>(null);

    const handleRunCheck = async () => {
        if (!file834 || !file837) {
            toast.error("Please upload both an 834 Enrollment file and an 837 Claim file.");
            return;
        }

        setIsProcessing(true);
        try {
            const data = await checkEligibility(file834, file837);
            setResults(data);
            toast.success("Eligibility cross-check completed!");
        } catch (err: any) {
            toast.error("Check failed: " + (err.message || "Unknown error"));
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Eligible": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "Terminated": return <XCircle className="w-4 h-4 text-rose-500" />;
            case "Not Yet Effective": return <AlertCircle className="w-4 h-4 text-amber-500" />;
            default: return <Search className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Eligible": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            case "Terminated": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
            case "Not Yet Effective": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
        }
    };

    const stats = results ? {
        eligible: results.filter(r => r.status === "Eligible").length,
        terminated: results.filter(r => r.status === "Terminated").length,
        notEffective: results.filter(r => r.status === "Not Yet Effective").length,
        notFound: results.filter(r => r.status === "Member Not Found").length,
        totalAmount: results.reduce((acc, r) => acc + r.amount, 0)
    } : null;

    const handleExport = () => {
        if (!results) return;
        const headers = ["ClaimID", "SubscriberID", "MemberName", "ServiceDate", "Amount", "Status", "Details"];
        const exportData = results.map(r => ({
            claimid: r.claimId,
            subscriberid: r.subscriberId,
            membername: r.memberName,
            servicedate: r.serviceDate,
            amount: r.amount,
            status: r.status,
            details: r.details
        }));
        downloadCSV(exportData, headers, "Eligibility_Report");
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background font-sans selection:bg-primary/30 text-foreground overflow-hidden">
                <AppSidebar />
                <div className="flex-1 flex flex-col h-full bg-card border-r border-border relative z-10 min-w-0">
                    <header className="h-14 mt-1 flex shrink-0 items-center justify-between border-b border-border px-6 bg-card">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="text-muted-foreground hover:text-white" />
                            <div className="flex items-center gap-2 font-heading font-bold text-lg tracking-tight">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-medium tracking-tight">Eligibility Cross-check</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                        {/* 1. Dual Upload Control */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PremiumCard className="p-5 border-primary/20 bg-primary/5 hover:bg-primary/[0.08] transition-colors relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                    <Users className="w-12 h-12" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-4">Step 1: Enrollment Roster</h3>
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-muted-foreground leading-relaxed">Upload an 834 file to build the current member eligibility roster.</p>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            onChange={(e) => setFile834(e.target.files?.[0] || null)}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                        />
                                        <div className={`p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${file834 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-primary/20 bg-background/50'}`}>
                                            <Upload className={`w-6 h-6 ${file834 ? 'text-emerald-500' : 'text-primary'}`} />
                                            <span className="text-xs font-semibold">{file834 ? file834.name : "Choose 834 File"}</span>
                                        </div>
                                    </div>
                                </div>
                            </PremiumCard>

                            <PremiumCard className="p-5 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/[0.08] transition-colors relative overflow-hidden group text-right md:text-left">
                                <div className="absolute top-0 right-0 md:left-auto md:right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                    <FileText className="w-12 h-12" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4">Step 2: Claims Inbound</h3>
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-muted-foreground leading-relaxed">Upload an 837 file containing the claims you wish to validate.</p>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            onChange={(e) => setFile837(e.target.files?.[0] || null)}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                        />
                                        <div className={`p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${file837 ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-indigo-500/20 bg-background/50'}`}>
                                            <Upload className={`w-6 h-6 ${file837 ? 'text-indigo-400' : 'text-indigo-400'}`} />
                                            <span className="text-xs font-semibold">{file837 ? file837.name : "Choose 837 File"}</span>
                                        </div>
                                    </div>
                                </div>
                            </PremiumCard>
                        </div>

                        {/* 2. Actions */}
                        <div className="flex justify-center">
                            <button 
                                onClick={handleRunCheck}
                                disabled={!file834 || !file837 || isProcessing}
                                className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all active:scale-95"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                Run Eligibility Cross-check
                            </button>
                        </div>

                        {/* 3. Dashboard Stats */}
                        {stats && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1">Eligible</p>
                                    <p className="text-2xl font-heading font-bold">{stats.eligible}</p>
                                </div>
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                    <p className="text-[10px] uppercase tracking-widest text-rose-500 font-bold mb-1">Terminated</p>
                                    <p className="text-2xl font-heading font-bold">{stats.terminated}</p>
                                </div>
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">Not Effective</p>
                                    <p className="text-2xl font-heading font-bold">{stats.notEffective}</p>
                                </div>
                                <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-xl">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Not Found</p>
                                    <p className="text-2xl font-heading font-bold">{stats.notFound}</p>
                                </div>
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1">Risk Amount</p>
                                    <p className="text-2xl font-heading font-bold">${stats.totalAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        {/* 4. Results Table */}
                        <PremiumCard className="flex-1 flex flex-col min-h-[400px] overflow-hidden relative border-border/40">
                            {isProcessing ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 z-20 backdrop-blur-sm">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                    <p className="text-sm font-semibold text-muted-foreground animate-pulse">Running HIPAA Eligibility Logic...</p>
                                </div>
                            ) : !results ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                                        <ShieldCheck className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                    <h4 className="text-lg font-bold mb-2">Ready for Validation</h4>
                                    <p className="text-muted-foreground text-sm max-w-sm">Upload your enrollment and claims files above to identify potential eligibility compliance risks.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{results.length} Claims Checked</span>
                                        <button 
                                            onClick={handleExport}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
                                        >
                                            <Download className="w-3 h-3" />
                                            Export CSV
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-auto custom-scrollbar">
                                        <table className="w-full text-sm text-left border-separate border-spacing-0">
                                            <thead className="sticky top-0 bg-card z-10 shadow-sm">
                                                <tr className="border-b border-border">
                                                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Claim / Member</th>
                                                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Date / Amount</th>
                                                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Reasoning</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/10">
                                                {results.map((r, i) => (
                                                    <tr key={i} className="hover:bg-primary/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-mono text-xs font-bold text-primary">{r.claimId}</span>
                                                                <span className="text-sm font-medium text-slate-300">{r.memberName}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono">{r.subscriberId}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{r.serviceDate}</span>
                                                                <span className="text-xs text-muted-foreground font-mono font-bold">${r.amount.toFixed(2)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase inline-flex items-center gap-1.5 ${getStatusStyle(r.status)}`}>
                                                                {getStatusIcon(r.status)}
                                                                {r.status}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-xs">{r.details}</p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </PremiumCard>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default Eligibility;
