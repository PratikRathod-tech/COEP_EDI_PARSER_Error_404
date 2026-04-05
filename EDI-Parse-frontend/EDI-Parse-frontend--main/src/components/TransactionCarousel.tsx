import { FileCode, FileText, CheckCircle, Users } from "lucide-react";
import { FlipCard } from "./FlipCard";

export function TransactionCarousel() {
  const cards = [
    {
      type: "837P",
      subtitle: "Professional Claims",
      icon: <FileText className="w-8 h-8 text-primary" />,
      snippet: "CLM*CLAIM001*150.00***11:B:1*Y*A*Y*I~",
      backContent: (
        <div className="flex flex-col gap-3 text-sm text-foreground/90">
          <p><strong>Professional healthcare claim</strong></p>
          <p>Used by clinics, physicians, outpatient providers.</p>
          <p>Contains subscriber, provider, diagnosis, and service line data necessary for billing.</p>
        </div>
      )
    },
    {
      type: "837I",
      subtitle: "Institutional Claims",
      icon: <FileCode className="w-8 h-8 text-primary/80" />,
      snippet: "CLM*HOSP001*5000.00***21:A:1*Y*A*Y*I~",
      backContent: (
        <div className="flex flex-col gap-3 text-sm text-foreground/90">
          <p><strong>Institutional healthcare claim</strong></p>
          <p>Used by hospitals, skilled nursing, and facilities.</p>
          <p>Includes admission, discharge, revenue codes, and facility-specific billing details.</p>
        </div>
      )
    },
    {
      type: "835",
      subtitle: "Payment/Remittance",
      icon: <CheckCircle className="w-8 h-8 text-primary/70" />,
      snippet: "BPR*I*150.00*C*ACH*CTX*01*999...~",
      backContent: (
        <div className="flex flex-col gap-3 text-sm text-foreground/90">
          <p><strong>Electronic remittance advice</strong></p>
          <p>Explains paid, denied, adjusted claim outcomes.</p>
          <p>Includes payment details, adjustment codes (CAS), and claim balancing info.</p>
        </div>
      )
    },
    {
      type: "834",
      subtitle: "Enrollment/Benefits",
      icon: <Users className="w-8 h-8 text-primary/60" />,
      snippet: "INS*Y*18*030*28*A...~",
      backContent: (
        <div className="flex flex-col gap-3 text-sm text-foreground/90">
          <p><strong>Enrollment and benefit information</strong></p>
          <p>Used for member enrollment and coverage updates.</p>
          <p>Includes subscriber/dependent plan details and coverage changes.</p>
        </div>
      )
    }
  ];

  // Duplicate the list deeply to allow a seamless infinite loop scrolling effect
  const track = [...cards, ...cards];

  return (
    <div className="w-full overflow-hidden py-10 relative">
      {/* Edge Gradients for smooth fade masking */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Marquee Track */}
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] py-4">
        {track.map((item, i) => (
          <div key={i} className="w-[300px] md:w-[380px] mx-4 shrink-0 transition-transform hover:scale-[1.02] duration-300">
            <FlipCard
              frontContent={
                <div className="flex flex-col h-full items-center justify-center text-center px-2 py-4">
                  <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border shadow-sm">
                    {item.icon}
                  </div>
                  <h3 className="text-4xl font-heading font-extrabold text-foreground tracking-tight mb-2">
                    {item.type}
                  </h3>
                  <p className="text-muted-foreground font-semibold uppercase tracking-widest text-[11px] mb-8">
                    {item.subtitle}
                  </p>
                  
                  <div className="w-full bg-background border border-border rounded-lg p-4 text-left shadow-inner">
                    <pre className="text-[11px] leading-relaxed font-mono text-muted-foreground whitespace-pre-wrap break-all">
                      {item.snippet}
                    </pre>
                  </div>
                </div>
              }
              backContent={
                <div className="flex flex-col h-full justify-center">
                  <h4 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-3 flex items-center gap-3">
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">{item.type}</span> 
                    <span className="text-sm font-semibold text-muted-foreground">{item.subtitle}</span>
                  </h4>
                  {item.backContent}
                  <div className="mt-auto pt-4 flex gap-2 w-full">
                     <span className="text-[10px] uppercase font-mono bg-secondary px-2 py-1 rounded font-semibold text-muted-foreground">Standard</span>
                     <span className="text-[10px] uppercase font-mono bg-secondary px-2 py-1 rounded font-semibold text-muted-foreground">HIPAA Compliant</span>
                  </div>
                </div>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
