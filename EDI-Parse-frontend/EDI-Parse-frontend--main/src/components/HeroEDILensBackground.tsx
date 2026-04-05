import { useState, useRef } from 'react';

// 1. MAKE RAW VS PARSED DIFFERENCE MUCH CLEARER
const RAW_EDI = Array(30).fill(`ISA*00*          *00*          *ZZ*SENDER123      *ZZ*RECEIVER456    *231015*1030*U*00401*000000001*0*T*:~GS*HC*SENDER123*RECEIVER456*20231015*1030*1*X*004010X098A1~ST*837*0001~BHT*0019*00*565743*20231015*1030*CH~NM1*41*2*PREMIER BILLING***46*123456789~PER*IC*JOHN DOE*TE*5555551212~NM1*40*2*HEALTHCARE PLUS***46*987654321~CLM*CLAIM001*150.00***11:B:1*Y*A*Y*I~DTP*472*D8*20231015~SV1*HC:99213*150.00*UN*1***1~SE*11*0001~`).join('\n\n');

// Parsed text is now extremely structured, clean JSON-like representation
// to ensure the contrast is instantaneous and semantic.
const PARSED_EDI = Array(30).fill(`{
  "CLAIM_001": {
    "Provider (NM1)": "PREMIER BILLING (123456789)",
    "Contact (PER)": "JOHN DOE (555-555-1212)",
    "Payer (NM1)": "HEALTHCARE PLUS (987654321)",
    "ServiceLine (SV1)": {
      "Code": "HC:99213",
      "Cost": "$150.00",
      "Date": "2023-10-15"
    },
    "Status": "Valid ✔"
  }
}`).join('\n\n');

export default function HeroEDILensBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const LENS_RADIUS = 120; // Focused precise inspection zone
  const ZOOM_LEVEL = 1.4; // 2. MAGNIFICATION FEELS REAL

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // 4. CURSOR / POINTER IMPROVEMENT
  // Premium inspection cursor to reinforce the action
  const cursorStyle = isHovered ? {
    cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='%239333ea' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E") 12 12, zoom-in`
  } : {};

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden bg-background"
      style={cursorStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 5. IMPROVE RAW BACKGROUND READABILITY */}
      {/* Opacity explicitly jumped up to 25% (from 10%) so it sits confidently but not disruptively */}
      <div className="absolute inset-0">
        <pre className="w-full h-full p-6 text-[10px] sm:text-xs leading-loose font-mono text-slate-500/25 dark:text-slate-400/25 select-none overflow-hidden whitespace-pre-wrap pointer-events-none">
          {RAW_EDI}
        </pre>
      </div>

      {/* MAGNIFIER LENS TRACKER (PARSED AREA) */}
      <div 
        className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
        style={{
          opacity: isHovered ? 1 : 0,
          clipPath: `circle(${LENS_RADIUS}px at ${position.x}px ${position.y}px)`,
          WebkitClipPath: `circle(${LENS_RADIUS}px at ${position.x}px ${position.y}px)`
        }}
      >
        <div 
          className="absolute inset-0 bg-background/95 dark:bg-background/95 backdrop-blur-md will-change-transform"
          style={{
            transform: `scale(${ZOOM_LEVEL})`,
            transformOrigin: `${position.x}px ${position.y}px`,
          }}
        >
          {/* Inner parsed text uses intense primary color mapped to the theme */}
          <pre className="w-full h-full p-6 text-[11px] sm:text-sm leading-relaxed font-mono text-primary dark:text-purple-300 select-none overflow-hidden whitespace-pre-wrap transition-opacity duration-200">
            {PARSED_EDI}
          </pre>
        </div>
      </div>

      {/* 3. IMPROVE LENS VISUAL STYLING (Realistic Glass Dome Effect) */}
      <div 
        className="absolute transition-opacity duration-200 pointer-events-none rounded-full"
        style={{
          opacity: isHovered ? 1 : 0,
          left: position.x - LENS_RADIUS,
          top: position.y - LENS_RADIUS,
          width: LENS_RADIUS * 2,
          height: LENS_RADIUS * 2,
          // PHASE 3: Upgrade to vibrant purple glow + real glass reflections
          border: '1px solid rgba(192, 132, 252, 0.4)', // purple-400 border
          boxShadow: `
            0 0 30px rgba(124, 92, 255, 0.4), /* Outer glow */
            inset 0 0 20px rgba(168, 85, 247, 0.15),
            inset 0 8px 12px -5px rgba(255, 255, 255, 0.6)
          `,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%, rgba(168, 85, 247, 0.05) 100%)',
        }}
      />

      {/* CENTER FADE GRADIENTS (Ensures hero text legibility) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,theme(colors.background)_0%,transparent_70%)] pointer-events-none opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background pointer-events-none opacity-40" />
    </div>
  );
}
