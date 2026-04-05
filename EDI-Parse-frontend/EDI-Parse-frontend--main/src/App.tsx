import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Compare from "@/pages/Compare";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import X12Tutorial from "./pages/X12Tutorial";
import Examples from "./pages/Examples";
import ValidatorRules from "./pages/ValidatorRules";
import ImplementationGuides from "./pages/ImplementationGuides";
// import FileUpload from "./pages/FileUpload";
import Enrollment834 from "./pages/Enrollment834";
import Reconciliation835_837 from "./pages/Reconciliation835_837";
import Delta834 from "./pages/Delta834";
import Eligibility from "./pages/Eligibility";
import Payment835 from "./pages/Payment835";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="edi-insight-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/about" element={<About />} />
            <Route path="/x12-tutorial" element={<X12Tutorial />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/validator-rules" element={<ValidatorRules />} />
            <Route path="/implementation-guides" element={<ImplementationGuides />} />
            <Route path="*" element={<NotFound />} />

            {/* <Route path="/upload" element={<FileUpload />} /> */}
            <Route path="/834-enrollment" element={<Enrollment834 />} />
            <Route path="/834-delta" element={<Delta834 />} />
            <Route path="/eligibility" element={<Eligibility />} />
            <Route path="/835-payment" element={<Payment835 />} />
            <Route path="/reconciliation" element={<Reconciliation835_837 />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
