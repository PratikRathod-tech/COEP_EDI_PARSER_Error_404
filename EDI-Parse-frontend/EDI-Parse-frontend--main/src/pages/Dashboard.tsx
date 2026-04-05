import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { RiskSpeedometer } from "@/components/RiskSpeedometer";
import { ErrorListPanel } from "@/components/ErrorListPanel";
import EDITreeView, { TreeNode } from "@/components/EDITreeView";
import { RawEDIViewer } from "@/components/RawEDIViewer";
import Chatbot from "@/components/Chatbot";
import { PremiumCard } from "@/components/PremiumCard";
import { StructuredDetailsPanel } from "@/components/StructuredDetailsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  downloadJSON, 
  downloadCSV, 
  generateErrorReportPDF, 
  downloadText 
} from "@/lib/exportUtils";
import { 
  applyFixes, 
  uploadAndProcessEDI, 
  parseEDI, 
  validateEDI, 
  summarizeEDI, 
  analyzeEDIWithAI 
} from "@/lib/api";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Filter, 
  LayoutDashboard, 
  Database, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  Loader2, 
  ArrowRight,
  Download,
  Wand2,
  Diff,
  FileText,
  ChevronDown
} from "lucide-react";
import { EDIError } from "@/components/ErrorAccordion";
import { ParsedEDI } from "@/lib/edi-parser";
import { mapToTreeView, mapToParsedEDI } from "@/lib/mappers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ERROR_FIX_MAP: Record<string, { segment: string, fixText: string, expected: string }> = {
  "e1": { segment: "CLM", fixText: "CLM*CLAIM001*100", expected: "CLM*CLAIM_ID*REASONABLE_AMOUNT" },
  "e2": { segment: "NM1", fixText: "NM1*85*2*ABC MEDICAL*1234567890", expected: "NM1*85*2*NAME*VALID_NPI" },
  "e3": { segment: "DTP", fixText: "DTP*472*D8*20230401", expected: "DTP*472*D8*YYYYMMDD (Past)" }
};

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileName = (location.state as { fileName?: string })?.fileName || "sample_837P.edi";

  // --- LIFTED DASHBOARD STATE ---
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
  const [hoveredErrorId, setHoveredErrorId] = useState<string | null>(null);
  const [errors, setErrors] = useState<EDIError[]>([]);
  const [rawText, setRawText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "errors" | "warnings">("all");
  const [hasParsed, setHasParsed] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEDI | null>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [rawJson, setRawJson] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'json'>('json');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState("");
  const [fixMap, setFixMap] = useState<Record<string, any>>(ERROR_FIX_MAP);
  const [hasRunAI, setHasRunAI] = useState(false);
  const [ediInput, setEdiInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- TOP UPLOAD STATE ---
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");

  useEffect(() => {
    const savedInput = sessionStorage.getItem("ediInput");
    const savedFileName = sessionStorage.getItem("fileName");

    if (savedInput) {
      setEdiInput(savedInput);
      setFilePreview(savedInput);
    }

    if (savedFileName) {
      setUploadedFile({ name: savedFileName } as File);
    }
  }, []);

  const displayFileName = uploadedFile ? uploadedFile.name : fileName;

  const handleDashboardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || "";
        setFilePreview(content);
        setEdiInput(content);

        // ✅ ADDED
        sessionStorage.setItem("ediInput", content);
        sessionStorage.setItem("fileName", file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleClearUpload = () => {
    setUploadedFile(null);
    setFilePreview("");
    setEdiInput("");
    setHasParsed(false);
    setErrors([]);
    setRawText("");
    setParsedData(null);
    setTreeData([]);
    setApiError(null);
    setAiExplanation("");
    setHasRunAI(false);

    sessionStorage.removeItem("ediInput");
    sessionStorage.removeItem("fileName");
    sessionStorage.removeItem("fileId");
    sessionStorage.removeItem("correctedEdi");
    sessionStorage.removeItem("originalEdi");
  };

  const handleApplyFixes = async () => {
    const currentFileId = sessionStorage.getItem("fileId");
    if (!currentFileId || !rawJson?.ai_suggestions) {
      toast.error("No AI suggestions available to apply.");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await applyFixes(currentFileId, rawJson.ai_suggestions);
      sessionStorage.setItem("correctedEdi", response.corrected_edi);
      sessionStorage.setItem("originalEdi", rawText);
      toast.success("AI Fixes applied surgically!");
    } catch (err: any) {
      toast.error("Failed to apply fixes: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleParseEDI = async () => {
    if (!ediInput && !uploadedFile) return;

    // Create a virtual file if we only have text input
    let fileToProcess = uploadedFile;
    if (!fileToProcess && ediInput) {
      fileToProcess = new File([ediInput], "manual_input.edi", { type: "text/plain" });
    }

    if (!fileToProcess) return;

    setIsLoading(true);
    setApiError(null);
    setHasRunAI(false);

    try {
      // Use the unified uploadAndProcessEDI (process-all backend logic)
      // This will parse, validate, summarize, AND generate business JSON all at once
      const { uploadAndProcessEDI } = await import('@/lib/api');
      const response = await uploadAndProcessEDI(fileToProcess);

      console.log("Aggregated API Response:", response);
      setRawJson(response);

      // Store fileId (fallback to filename if backend doesn't provide fileId explicitly yet)
      const fileId = response.fileId || fileToProcess.name;
      sessionStorage.setItem("fileId", fileId);

      setRawText(ediInput || filePreview || "");

      const validationErrors = response.validation?.errors || [];
      setErrors(validationErrors);

      // Map to structured formats
      const mappedTree = mapToTreeView(response.business_data || response.parsed_data);
      console.log("Mapped Tree:", mappedTree);

      if (mappedTree && mappedTree.length > 0) {
        setTreeData(mappedTree);
      } else {
        // Fallback if structure mapping fails but we have data
        setTreeData([{
          id: "root-fallback",
          label: "STRUCTURE NOT MAPPABLE",
          type: "loop",
          loopId: "????"
        }]);
      }

      setParsedData(mapToParsedEDI(response));
      setHasParsed(true);
      toast.success("EDI File parsed and validated");
    } catch (err: any) {
      console.error("Processing failed:", err);
      setApiError(err.message || "An unexpected error occurred during processing");
      toast.error("Failed to process EDI file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!hasParsed || errors.length === 0) return;

    setIsAiLoading(true);
    try {
      const response = await analyzeEDIWithAI({
        is_valid: errors.length === 0,
        errors: errors,
        filename: displayFileName
      });

      setAiExplanation(response.ai_explanation);

      // Update errors with AI summaries
      const newFixMap: Record<string, any> = {};
      const updatedErrors = [...errors];

      if (response.ai_suggestions && Array.isArray(response.ai_suggestions)) {
        response.ai_suggestions.forEach(s => {
          if (s && s.error_id) {
            newFixMap[s.error_id] = s;
            const errIndex = updatedErrors.findIndex(e => e.id === s.error_id);
            if (errIndex !== -1) {
              updatedErrors[errIndex].llmMessage = s.error_summary;
            }
          }
        });
      }

      setErrors(updatedErrors);
      setFixMap(newFixMap);
      setHasRunAI(true);
      toast.success("AI Analysis complete");
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      toast.error("AI Analysis failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Deriving risk level
  const riskLevel = !hasParsed ? "empty" : errors.length > 2 ? "high" : errors.length > 0 ? "medium" : "low";

  const errorCount = errors.filter(e => e.severity === "error" || e.severity === "critical").length;
  const warningCount = errors.filter(e => e.severity === "warning").length;
  const totalIssues = errorCount + warningCount;

  const filteredErrors = errors.filter(err => {
    if (activeTab === "errors") return err.severity === "error" || err.severity === "critical";
    if (activeTab === "warnings") return err.severity === "warning";
    return true;
  });

  // Contextual Fix Mutator
  const handleFix = (errorId: string, correctedLine: string) => {
    const errInfo = fixMap[errorId];
    if (!errInfo) return;

    const lines = rawText.split('~').filter(Boolean);
    const updatedLines = lines.map(line => {
      const segmentId = errInfo.target_segment_id || errInfo.segment;
      if (line.trim().startsWith(segmentId)) {
        return correctedLine;
      }
      return line;
    });

    setRawText(updatedLines.join('~') + '~');
    setErrors(prev => prev.filter(e => e.id !== errorId));
    setActiveErrorId(null);
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
                <h2 className="text-xl font-medium tracking-tight">EDI Review Console</h2>

              </div>
              <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
              <span className="text-sm font-medium text-muted-foreground truncate">{displayFileName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-2 text-xs font-semibold uppercase tracking-wider border border-border h-8">
                    <Download className="w-3.5 h-3.5" />
                    Export
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem onClick={() => toast.info("Exporting as EDI...")}>
                    Export as EDI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Exporting Summary...")}>
                    Export Summary
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-5 flex flex-col w-full h-full">

            {!hasParsed ? (
              <div className="flex-1 flex flex-col w-full h-full min-h-0">
                <div className="group border-2 border-dashed border-border rounded-2xl flex-1 flex flex-col p-6 transition-all hover:border-primary/50 bg-card overflow-hidden">

                  {/* Tier 1: Top Bar */}
                  <div className="flex items-center gap-4 mb-6 shrink-0">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleDashboardUpload}
                      className="hidden"
                      accept=".edi,.txt,.x12"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-primary text-white hover:bg-primary/90"
                    >
                      Upload EDI file...
                    </Button>
                    <span className="text-muted-foreground group-hover:text-black transition-colors font-medium">
                      Drag & drop an EDI file here
                    </span>
                  </div>

                  {/* Tier 2: Input Area */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <label className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase group-hover:text-black transition-colors">
                        X12 EDI Input
                      </label>
                      {uploadedFile && (
                        <span className="text-[10px] text-primary font-medium group-hover:text-black transition-colors">
                          {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <Textarea
                      placeholder="Paste your X12 EDI content here or upload a file..."
                      className="flex-1 min-h-0 resize-none font-mono text-[13px] leading-6 bg-secondary/30 border-border/50 focus-visible:ring-primary/20 text-slate-400"
                      value={ediInput}
                      onChange={(e) => {
                        setEdiInput(e.target.value);
                        sessionStorage.setItem("ediInput", e.target.value); // ✅ added
                      }}
                    />
                  </div>

                  {/* Tier 3: Bottom Actions */}
                  <div className="flex items-center gap-3 mt-6 shrink-0">
                    <Button
                      onClick={handleParseEDI}
                      disabled={isLoading || (!ediInput && !uploadedFile)}
                      className="bg-primary text-white px-8 py-2 font-bold shadow-lg h-10"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Parse EDI
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleClearUpload}
                      className="px-8 h-10 border border-border transition-colors"
                    >
                      Clear
                    </Button>
                  </div>

                  {apiError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-medium">
                      Error: {apiError}. Please ensure the backend is running.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2 pb-6 fade-in animate-in duration-500 min-h-max">
                <div className="flex-1 grid grid-cols-12 gap-4 h-[550px] shrink-0">

                  <PremiumCard className="col-span-12 xl:col-span-5 flex flex-col p-4 h-full">
                    <h3 className="text-xs font-bold text-muted-foreground mb-4 tracking-widest uppercase flex items-center justify-between shrink-0">
                      Structure View
                      <div className="flex items-center gap-1 bg-secondary/20 p-1 rounded-md border border-border/10">
                        <button
                          onClick={() => setViewMode('tree')}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                            viewMode === 'tree' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/40"
                          )}
                        >
                          TREE
                        </button>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => downloadJSON(rawJson.business_data || rawJson.parsed_data, fileName || "edi_business_data")}
                          className="p-1 hover:bg-secondary/40 rounded transition-colors text-muted-foreground"
                          title="Download Business JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 bg-transparent rounded-lg">
                      {viewMode === 'tree' ? (
                        <EDITreeView tree={treeData} />
                      ) : (
                        <div className="p-2 h-full">
                          <pre className="text-[11px] font-mono whitespace-pre bg-secondary/10 p-4 rounded-md border border-border/20 text-black dark:text-white h-full overflow-auto custom-scrollbar">
                            {JSON.stringify(rawJson || { message: "No API data available" }, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </PremiumCard>

                  <PremiumCard className="col-span-12 xl:col-span-7 flex flex-col p-4 h-full">
                    <h3 className="text-xs font-bold text-muted-foreground mb-3 tracking-widest uppercase shrink-0">
                      EDI Source View
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                      <RawEDIViewer
                        rawText={rawText}
                        activeErrorId={activeErrorId}
                        hoveredErrorId={hoveredErrorId}
                        onFix={handleFix}
                        errorMap={fixMap}
                      />
                    </div>
                  </PremiumCard>
                </div>

                {parsedData && <StructuredDetailsPanel parsedData={parsedData} />}
              </div>
            )}
          </main>
        </div>

        <aside className="w-[340px] shrink-0 h-full bg-card border-l border-border flex flex-col pt-6 z-0 relative">
          <div className="px-6 mb-6 border-b border-border pb-6 shrink-0 flex flex-col items-center">
            <h3 className="text-[10px] font-bold text-muted-foreground mb-4 tracking-widest uppercase text-center w-full">
              Validation Risk
            </h3>
            <RiskSpeedometer level={riskLevel} />
          </div>

          <div className="flex-1 flex flex-col min-h-0 pb-4 px-4 overflow-hidden">

            {/* Unified Stats Tile */}
            <div className="mx-2 mb-6 p-4 rounded-xl border border-border bg-secondary/20 shadow-sm">
              <h3 className="text-[10px] font-bold text-muted-foreground mb-3 tracking-widest uppercase truncate">
                Processing Summary
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded-lg bg-background border border-border/50">
                  <span className="text-base font-bold text-foreground leading-none">{totalIssues}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight mt-1">Issues</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <span className="text-base font-bold text-red-500 leading-none">{errorCount}</span>
                  <span className="text-[9px] font-bold text-red-500/70 uppercase tracking-tight mt-1">Errors</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <span className="text-base font-bold text-amber-500 leading-none">{warningCount}</span>
                  <span className="text-[9px] font-bold text-amber-500/70 uppercase tracking-tight mt-1">Warnings</span>
                </div>
              </div>
            </div>
            {hasParsed && errors.length > 0 && !hasRunAI && (
              <Button 
                onClick={handleAiAnalysis} 
                disabled={isAiLoading} 
                className="mx-2 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20"
              >
                {isAiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Analyze Issues with AI
              </Button>
            )}

            {hasRunAI && (
              <div className="flex flex-col gap-2 mx-2 mb-6">
                <Button 
                  variant="outline"
                  onClick={() => generateErrorReportPDF(errors, aiExplanation, fileName || "EDI_Report")}
                  className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF Report
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleApplyFixes}
                    disabled={isAiLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    Apply Fixes
                  </Button>
                  <Button 
                    variant="secondary"
                    disabled={!sessionStorage.getItem("correctedEdi")}
                    onClick={() => navigate("/compare")}
                    className="font-bold bg-slate-800 hover:bg-slate-700"
                  >
                    <Diff className="w-4 h-4 mr-2" />
                    View Diff
                  </Button>
                </div>

                {sessionStorage.getItem("correctedEdi") && (
                  <Button 
                    variant="link"
                    onClick={() => downloadText(sessionStorage.getItem("correctedEdi")!, `corrected_${fileName || "file.edi"}`)}
                    className="text-[10px] uppercase tracking-widest text-emerald-400 hover:text-emerald-300 font-black h-auto py-1"
                  >
                    Download Corrected EDI
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg mb-4 mx-2 shrink-0">
              {(["all", "errors", "warnings"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-md capitalize transition-colors ${activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-2 pb-2">
              <ErrorListPanel
                errors={filteredErrors}
                activeErrorId={activeErrorId}
                onSelect={setActiveErrorId}
                onHover={setHoveredErrorId}
                errorMap={fixMap}
              />
            </div>
          </div>
        </aside>

        <Chatbot aiExplanation={aiExplanation} />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
