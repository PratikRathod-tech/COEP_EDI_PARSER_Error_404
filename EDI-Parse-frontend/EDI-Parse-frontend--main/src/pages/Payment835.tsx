import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PremiumCard } from "@/components/PremiumCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
    Banknote, 
    Upload, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    XCircle, 
    Loader2, 
    ArrowUpRight,
    Download,
    TrendingUp
} from "lucide-react";
import { uploadAndProcessEDI, getPayment835 } from "@/lib/api";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/exportUtils";

const Payment835 = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<any[] | null>(null);
    const [summary, setSummary] = useState<any>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);
        try {
            const data = await uploadAndProcessEDI(selectedFile);
            setResults(data.payment_data || []);
            setSummary({
                count: (data.payment_data || []).length,
                totalPaid: (data.payment_data || []).reduce((acc: number, r: any) => acc + (parseFloat(r["Total Paid"]) || 0), 0),
                totalBilled: (data.payment_data || []).reduce((acc: number, r: any) => acc + (parseFloat(r["Total Billed"]) || 0), 0)
            });
            toast.success("835 Remittance parsed successfully!");
        } catch (err: any) {
            toast.error("Failed to parse 835: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusIcon = (status: string) => {
        if (!status) return <AlertCircle className="w-4 h-4 text-slate-400" />;
        const s = status.toLowerCase();
        if (s.includes("paid") || s === "1") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        if (s.includes("denied") || s === "4") return <XCircle className="w-4 h-4 text-rose-500" />;
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    };

    const getStatusStyle = (status: string) => {
        if (!status) return "bg-slate-500/10 text-slate-400 border-slate-500/20";
        const s = status.toLowerCase();
        if (s.includes("paid") || s === "1") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (s.includes("denied") || s === "4") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    };

    const handleExport = () => {
        if (!results) return;
        const headers = ["Claim ID", "Status", "Total Billed", "Total Paid", "Check/EFT Trace", "Payer Claim ID"];
        downloadCSV(results, headers, "835_Payment_Summary");
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
                                <Banknote className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-xl font-medium tracking-tight">835 Payment Summary</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                        {/* 1. Header & Stats */}
                        <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-2">Remittance Insights</h3>
                                <p className="text-muted-foreground text-sm max-w-xl">
                                    Visualize your 835 Healthcare Claim Payment Advice. Tracks claim status, billed vs. paid variances, and reassociation trace numbers for banking reconciliation.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        onChange={handleUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                    />
                                    <button className="px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all group-hover:opacity-90">
                                        <Upload className="w-4 h-4" />
                                        Upload 835
                                    </button>
                                </div>
                                {results && (
                                    <button 
                                        onClick={handleExport}
                                        className="px-4 py-2 bg-secondary text-foreground rounded-lg font-bold border border-border flex items-center gap-2 hover:bg-secondary/80 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export
                                    </button>
                                )}
                            </div>
                        </div>

                        {summary && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <PremiumCard className="p-4 bg-emerald-500/5 border-emerald-500/20">
                                    <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1">Total Paid</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-2xl font-heading font-bold">${summary.totalPaid.toLocaleString()}</p>
                                        <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
                                    </div>
                                </PremiumCard>
                                <PremiumCard className="p-4 bg-indigo-500/5 border-indigo-500/20">
                                    <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1">Total Billed</p>
                                    <p className="text-2xl font-heading font-bold">${summary.totalBilled.toLocaleString()}</p>
                                </PremiumCard>
                                <PremiumCard className="p-4 bg-primary/5 border-primary/20">
                                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Claim Count</p>
                                    <p className="text-2xl font-heading font-bold">{summary.count}</p>
                                </PremiumCard>
                                <PremiumCard className="p-4 bg-amber-500/5 border-amber-500/20">
                                    <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">Paid Ratio</p>
                                    <p className="text-2xl font-heading font-bold">{((summary.totalPaid / summary.totalBilled) * 100).toFixed(1)}%</p>
                                </PremiumCard>
                            </div>
                        )}

                        {/* 2. Detailed Table */}
                        <PremiumCard className="flex-1 flex flex-col min-h-[400px] overflow-hidden relative border-border/40">
                            {isProcessing ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 z-20 backdrop-blur-sm">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                    <p className="text-sm font-semibold text-muted-foreground animate-pulse">Analyzing Remittance Data...</p>
                                </div>
                            ) : !results ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                                        <FileText className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                    <h4 className="text-lg font-bold mb-2">No 835 File Loaded</h4>
                                    <p className="text-muted-foreground text-sm max-w-sm">Upload a Remittance Advice file to see a structured summary of payments and adjustments.</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                                        <thead className="sticky top-0 bg-card z-10 shadow-sm border-b border-border">
                                            <tr>
                                                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Claim Information</th>
                                                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">Billed</th>
                                                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">Paid</th>
                                                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Trace / Ref</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {results.map((r, i) => (
                                                <tr key={i} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground text-sm uppercase tracking-tight">{r["Claim ID"]}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">Payer: {r["Payer Claim ID"] || "N/A"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-mono text-xs text-muted-foreground line-through decoration-rose-500/30">${parseFloat(r["Total Billed"]).toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 font-bold text-emerald-500">
                                                            <ArrowUpRight className="w-3 h-3" />
                                                            <span>${parseFloat(r["Total Paid"]).toLocaleString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase inline-flex items-center gap-1.5 ${getStatusStyle(r["Status"])}`}>
                                                            {getStatusIcon(r["Status"])}
                                                            {r["Status"] || "Processed"}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-medium text-slate-400">TRACE: {r["Check/EFT Trace"]}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </PremiumCard>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default Payment835;
