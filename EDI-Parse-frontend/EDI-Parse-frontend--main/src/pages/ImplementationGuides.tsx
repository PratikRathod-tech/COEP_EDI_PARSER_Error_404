import { FileText } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

const ImplementationGuides = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger className="mr-3" />
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              EDI Insight
            </div>
          </header>
          <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
            <h1 className="text-3xl font-bold text-foreground mb-4">Implementation Guides</h1>
            <p className="text-muted-foreground">Placeholder content for the Implementation Guides page.</p>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ImplementationGuides;
