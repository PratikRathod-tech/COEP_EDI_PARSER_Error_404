import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { FileText } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TransactionCarousel } from "@/components/TransactionCarousel";

const Index = () => {
  const navigate = useNavigate();

  const handleStartAnalyzing = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Nav - Elevated Glassmorphism */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-lg text-foreground tracking-tight">
            <FileText className="w-5 h-5 text-primary" />
            EDI Insight
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
            <a href="/about" className="hover:text-foreground hover:drop-shadow-[0_0_8px_rgba(124,92,255,0.5)] transition-all">About</a>
            <a href="#" className="hover:text-foreground hover:drop-shadow-[0_0_8px_rgba(124,92,255,0.5)] transition-all">Docs</a>
            <ResourcesDropdown />
            <ThemeToggle />
            <GlowButton className="ml-2 py-2 px-5 text-sm h-9">
              Sign In
            </GlowButton>
          </nav>
        </div>
      </header>

      <HeroSection onStartAnalyzing={handleStartAnalyzing} />

      {/* Visual Depth Separator */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-12" />

      {/* PHASE 4: TRANSACTION CAROUSEL DEMO */}
      <section className="w-full py-16 relative animate-in slide-in-from-bottom-10 fade-in duration-700 overflow-hidden bg-secondary/10 border-y border-border">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="text-center px-6">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-3 tracking-tight drop-shadow-sm">
            Active Transaction Intelligence
          </h2>
          <p className="text-muted-foreground font-medium tracking-wide max-w-xl mx-auto">
            Instantly decode standard healthcare electronic exchanges. Hover to reveal exact structural insights.
          </p>
        </div>

        <TransactionCarousel />
      </section>

      <FeaturesSection />

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground bg-background/50 backdrop-blur-sm">
        © 2026 EDI Insight · Healthcare EDI Analysis Platform
      </footer>
    </div>
  );
};

export default Index;
