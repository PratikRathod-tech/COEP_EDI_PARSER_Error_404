import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PremiumCard } from "@/components/PremiumCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileText, Loader2, Upload, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { fetch834Data, uploadAndProcessEDI } from "@/lib/api";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/exportUtils";

const Enrollment834 = () => {
    const [data, setData] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Persistent state
    const [fileName, setFileName] = useState(sessionStorage.getItem("fileName") || null);
    const [fileId, setFileId] = useState(sessionStorage.getItem("fileId") || null);

    const loadData = async (targetId: string) => {
        setIsLoading(true);
        try {
            const result = await fetch834Data(targetId);
            setData(result);
        } catch (err) {
            console.error("Failed to load enrollment:", err);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (fileId) {
            loadData(fileId);
        }
    }, [fileId]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const response = await uploadAndProcessEDI(file);
            const newFileId = response.fileId || file.name;
            
            // Persist for this page and others
            sessionStorage.setItem("fileId", newFileId);
            sessionStorage.setItem("fileName", file.name);
            
            setFileId(newFileId);
            setFileName(file.name);
            
            // The backend already cached the 834 extraction under this ID
            // but we can also set it directly from the response if available
            if (response.business_data && Array.isArray(response.business_data)) {
                setData(response.business_data); // backend returns enrollment list directly for 834
            } else {
                await loadData(newFileId);
            }
            
            toast.success("834 Enrollment processed successfully");
        } catch (err: any) {
            toast.error("Process failed: " + (err.message || "Unknown error"));
        } finally {
            setIsUploading(false);
        }
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
                                <h2 className="text-xl font-medium tracking-tight">834 Enrollment View</h2>
                            </div>
                            {fileName && (
                                <>
                                    <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
                                    <span className="text-sm font-medium text-muted-foreground truncate">{fileName}</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <ThemeToggle />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                        {/* 1. Upload Section - Premium Design */}
                        <div className="grid grid-cols-1 gap-6">
                            <PremiumCard className="p-6 border-primary/20 bg-primary/5">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                            <Upload className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Process 834 Enrollment</h3>
                                            <p className="text-sm text-muted-foreground">Upload an 834 file to generate a structured enrollment table.</p>
                                        </div>
                                    </div>
                                    
                                    <label className={`
                                        flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all cursor-pointer shadow-lg
                                        ${isUploading ? 'bg-secondary text-muted-foreground cursor-wait' : 'bg-primary text-primary-foreground hover:scale-105 active:scale-95'}
                                    `}>
                                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                        {isUploading ? 'Processing...' : 'Choose 834 File'}
                                        <input type="file" className="hidden" accept=".edi,.txt" onChange={handleFileUpload} disabled={isUploading} />
                                    </label>
                                </div>
                            </PremiumCard>
                        </div>

                        {/* 2. Content Section */}
                        <PremiumCard className="flex-1 flex flex-col p-6 min-h-[400px]">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-2">
                                    <span>Enrollment Breakdown</span>
                                    {data && data.length > 0 && <span className="text-primary">{data.length} Members Found</span>}
                                </h3>
                                {data && data.length > 0 && (
                                    <button 
                                        onClick={() => downloadCSV(data, ["subscriberId", "memberName", "relationship", "maintenanceType", "maintenanceReason"], "834_Enrollment_Roster")}
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
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                        <span className="text-muted-foreground text-sm font-medium">Analyzing enrollment structure...</span>
                                    </div>
                                ) : (!data || !Array.isArray(data) || data.length === 0) ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
                                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                                            <FileText className="w-8 h-8 text-muted-foreground/30" />
                                        </div>
                                        <h4 className="text-lg font-bold mb-2">No Enrollment Data</h4>
                                        <p className="text-muted-foreground text-sm font-medium max-w-xs text-center leading-relaxed">
                                            No active enrollment records found. Please upload a valid 834 file to begin analysis.
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/20 sticky top-0 z-20">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Member Name</th>
                                                <th className="px-6 py-4 font-bold">Subscriber ID</th>
                                                <th className="px-6 py-4 font-bold">Relationship</th>
                                                <th className="px-6 py-4 font-bold">Type</th>
                                                <th className="px-6 py-4 font-bold text-center">Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {Array.isArray(data) && data.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-primary/5 transition-colors group animate-in fade-in duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                                    <td className="px-6 py-4 font-medium text-slate-300 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:scale-125 transition-transform" />
                                                            {row.memberName || "Unknown"}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground font-mono text-[13px]">{row.subscriberId || "N/A"}</td>
                                                    <td className="px-6 py-4 text-muted-foreground/80">{row.relationship || "Other"}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border shadow-sm ${
                                                            row.maintenanceType?.includes('Addition') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                            row.maintenanceType?.includes('Termination') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                                            'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                                        }`}>
                                                            {row.maintenanceType || "Update"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="bg-secondary/40 px-2 py-1 rounded text-xs font-mono text-muted-foreground border border-border/10">
                                                            {row.maintenanceReason || "--"}
                                                        </span>
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

export default Enrollment834;
