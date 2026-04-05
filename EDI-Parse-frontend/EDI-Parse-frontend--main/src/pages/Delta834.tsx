import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PremiumCard } from "@/components/PremiumCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GitCompare, Upload, Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowRight, UserPlus, UserMinus, UserCog, Download } from "lucide-react";
import { fetch834Delta } from "@/lib/api";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/exportUtils";

const Delta834 = () => {
    const [fileBase, setFileBase] = useState<File | null>(null);
    const [fileNew, setFileNew] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any[] | null>(null);

    const handleRunDelta = async () => {
        if (!fileBase || !fileNew) {
            toast.error("Please upload both files first.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch834Delta(fileBase, fileNew);
            setResults(response.results);
            toast.success("Delta report generated successfully!");
        } catch (err: any) {
            toast.error("Process failed: " + (err.message || "Unknown error"));
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (type: string) => {
        switch (type) {
            case 'Addition': return <UserPlus className="w-4 h-4 text-emerald-400" />;
            case 'Termination': return <UserMinus className="w-4 h-4 text-rose-400" />;
            case 'Modified': return <UserCog className="w-4 h-4 text-sky-400" />;
            default: return <RefreshCw className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusStyles = (type: string) => {
        switch (type) {
            case 'Addition': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'Termination': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'Modified': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background font-sans text-foreground overflow-hidden">
                <AppSidebar />
                <div className="flex-1 flex flex-col h-full bg-card border-r border-border relative z-10 min-w-0">
                    <header className="h-14 flex shrink-0 items-center justify-between border-b border-border px-6">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="text-muted-foreground hover:text-white" />
                            <div className="flex items-center gap-2 font-heading font-bold text-lg tracking-tight">
                                <GitCompare className="w-5 h-5 text-primary shrink-0" />
                                <h2>834 Enrollment Delta</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                        {/* Summary Headers */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                            {/* STEP 1: BASE FILE */}
                            <PremiumCard className={`relative p-8 transition-all border-2 ${fileBase ? 'border-primary/40 bg-primary/5' : 'border-dashed border-white/10'}`}>
                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                       onChange={(e) => setFileBase(e.target.files?.[0] || null)} />
                                <div className="flex flex-col items-center justify-center text-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${fileBase ? 'bg-primary text-primary-foreground scale-110' : 'bg-secondary text-muted-foreground'}`}>
                                        {fileBase ? <CheckCircle2 className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">STEP 1: PREVIOUS MONTH (BASE)</h3>
                                        <p className="text-sm text-muted-foreground">{fileBase ? fileBase.name : "Select the baseline 834 file"}</p>
                                    </div>
                                </div>
                            </PremiumCard>

                            {/* STEP 2: NEW FILE */}
                            <PremiumCard className={`relative p-8 transition-all border-2 ${fileNew ? 'border-primary/40 bg-primary/5' : 'border-dashed border-white/10'}`}>
                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                       onChange={(e) => setFileNew(e.target.files?.[0] || null)} />
                                <div className="flex flex-col items-center justify-center text-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${fileNew ? 'bg-primary text-primary-foreground scale-110' : 'bg-secondary text-muted-foreground'}`}>
                                        {fileNew ? <CheckCircle2 className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">STEP 2: CURRENT MONTH (NEW)</h3>
                                        <p className="text-sm text-muted-foreground">{fileNew ? fileNew.name : "Select the target month 834 file"}</p>
                                    </div>
                                </div>
                            </PremiumCard>
                        </div>

                        {/* Action Bar */}
                        <div className="flex justify-center shrink-0">
                            <button 
                                onClick={handleRunDelta}
                                disabled={!fileBase || !fileNew || isLoading}
                                className={`
                                    px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm shadow-2xl transition-all flex items-center gap-3
                                    ${(!fileBase || !fileNew || isLoading) 
                                        ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50' 
                                        : 'bg-white text-black hover:scale-105 active:scale-95 shadow-primary/20'}
                                `}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitCompare className="w-5 h-5" />}
                                {isLoading ? "Analyzing..." : "Run Delta Report"}
                            </button>
                        </div>

                        {/* Result Section */}
                        <PremiumCard className="flex-1 flex flex-col p-6 min-h-[400px]">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-2">
                                    <span>Change Log (Net Differences)</span>
                                    {results && <span className="text-primary font-black ml-2">{results.length} Changes Detected</span>}
                                </h3>
                                {results && results.length > 0 && (
                                    <button 
                                        onClick={() => downloadCSV(results, ["subscriberId", "memberName", "changeType", "details"], "834_Delta_Report")}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download CSV
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-auto rounded-xl border border-border/10 bg-secondary/5 relative min-h-[300px]">
                                {isLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                        <span className="text-muted-foreground font-medium animate-pulse">Running Member-Level Diff Analysis...</span>
                                    </div>
                                ) : (!results) ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
                                        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                                            <GitCompare className="w-10 h-10 text-muted-foreground/30" />
                                        </div>
                                        <h4 className="text-lg font-bold mb-2">No Report Generated</h4>
                                        <p className="text-muted-foreground text-sm max-w-sm">Upload two consecutive monthly 834 files to see a delta of additions and terminations.</p>
                                    </div>
                                ) : results.length === 0 ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                                        <h4 className="text-lg font-bold text-emerald-400">Perfect Sync</h4>
                                        <p className="text-muted-foreground text-sm">No changes detected between these two enrollment periods.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/20 sticky top-0 z-20">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Subscriber ID</th>
                                                <th className="px-6 py-4 font-bold">Member Name</th>
                                                <th className="px-6 py-4 font-bold">Change Type</th>
                                                <th className="px-6 py-4 font-bold">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {results.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-primary/5 transition-colors group animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                                    <td className="px-6 py-4 font-mono text-primary font-medium">{row.subscriberId}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-200">{row.memberName}</td>
                                                    <td className="px-6 py-4">
                                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase border w-fit shadow-inner ${getStatusStyles(row.changeType)}`}>
                                                            {getStatusIcon(row.changeType)}
                                                            {row.changeType}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground text-[13px] italic leading-relaxed">
                                                        {row.details}
                                                    </td>
                                                </tr>
                                            ))}
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

export default Delta834;
