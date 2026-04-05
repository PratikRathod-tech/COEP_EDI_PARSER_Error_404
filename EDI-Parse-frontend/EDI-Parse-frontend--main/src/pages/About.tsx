import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { FileText, Zap, ShieldCheck, Cpu, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  { icon: Zap, title: "Instant Parsing", desc: "Upload and parse EDI files in seconds with structured output." },
  { icon: ShieldCheck, title: "Error Detection", desc: "Automatically flag compliance issues and missing segments." },
  { icon: Cpu, title: "AI Explanations", desc: "Get plain-language explanations of complex EDI data." },
  { icon: BarChart3, title: "Risk Analytics", desc: "Identify high-risk claims and track trends." },
];

const About = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center">
              <SidebarTrigger className="mr-3" />
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <FileText className="w-5 h-5 text-primary" />
                EDI Insight
              </div>
            </div>
            <ThemeToggle />
          </header>

          <main className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">About EDI Insight</h1>
              <p className="text-muted-foreground leading-relaxed">
                EDI Insight is a professional SaaS platform designed to make healthcare EDI files
                understandable. It parses HIPAA-compliant X12 transactions, detects errors, assesses
                risk levels, and provides AI-powered explanations — all in a clean, intuitive interface.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">The Problem</h2>
              <p className="text-muted-foreground leading-relaxed">
                Healthcare organizations process thousands of EDI files daily — claims (837), remittances
                (835), eligibility checks (270/271), and more. These files are dense, cryptic, and
                error-prone. Manual review is slow and costly. EDI Insight automates the analysis.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((f) => (
                  <div key={f.title} className="flex gap-3 p-4 bg-card border border-border rounded-lg">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default About;
