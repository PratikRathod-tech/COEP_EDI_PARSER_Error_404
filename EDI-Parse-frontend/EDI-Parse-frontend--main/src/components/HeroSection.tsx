import { ArrowDown } from "lucide-react";
import AnimatedTextCycle from "@/components/ui/animated-text-cycle";
import HeroEDILensBackground from "@/components/HeroEDILensBackground";
import { GlowButton } from "@/components/GlowButton";

interface HeroSectionProps {
  onStartAnalyzing: () => void;
}

const HeroSection = ({ onStartAnalyzing }: HeroSectionProps) => {
  return (
    <section className="relative border-b border-border py-32 md:py-40 flex items-center justify-center overflow-hidden min-h-[700px] bg-background dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:via-[#1a1333] dark:to-[#0d0d1f]">
      
      {/* PHASE 3: RADIAL GLOW BEHIND HERO */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-purple-500/20 blur-[120px] rounded-[100%] pointer-events-none z-10" />

      {/* INTERACTIVE BACKGROUND LENS */}
      <HeroEDILensBackground />

      {/* CENTER CONTENT */}
      {/* pointer-events-none added to the container so mouse tracking falls through to the background lens. 
          pointer-events-auto added to the button so it remains clickable. */}
      <div className="relative text-center max-w-3xl px-6 z-20 pointer-events-none">
        
        {/* Startup Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-border bg-secondary/50 text-xs font-medium text-muted-foreground backdrop-blur-sm pointer-events-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Introducing Insight Engine 2.0
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-foreground leading-[1.1] tracking-tight mb-6 drop-shadow-sm">
          Your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-300 to-indigo-400">
            <AnimatedTextCycle
              words={["data", "workflow", "files", "analytics"]}
              interval={2500}
            />
          </span>
          <br />
          deserve better tools
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mx-auto mb-10 leading-relaxed max-w-xl font-medium tracking-wide">
          Upload your HIPAA EDI files and instantly get structured breakdowns,
          error detection, and compliance insights — no manual parsing needed.
        </p>

        {/* Feature Tags (ROW 1 - Moved above CTA) */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-6 text-sm text-foreground/80 font-medium bg-secondary/20 px-6 py-3 rounded-2xl border border-border backdrop-blur-xl inline-flex pointer-events-auto shadow-panel">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            HIPAA Compliant
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            837 / 835 / 270 / 271
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Instant Parsing
          </div>
        </div>

        {/* CTA Button (ROW 2) */}
        <div>
          <GlowButton
            onClick={onStartAnalyzing}
            className="pointer-events-auto text-[15px]"
          >
            Start Analyzing Data
            <ArrowDown className="w-4 h-4 ml-1" />
          </GlowButton>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
