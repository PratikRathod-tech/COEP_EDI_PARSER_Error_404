import React, { useEffect, useState } from "react";

interface RiskSpeedometerProps {
  level: "empty" | "low" | "medium" | "high";
}

export function RiskSpeedometer({ level }: RiskSpeedometerProps) {
  const [offset, setOffset] = useState(180);

  const riskConfig = {
    empty: { label: "No Data", color: "rgba(255,255,255,0.08)", percent: 0 },
    low: { label: "Low Risk", color: "#10b981", percent: 0.15 },
    medium: { label: "Medium Risk", color: "#f59e0b", percent: 0.5 },
    high: { label: "High Risk", color: "#ef4444", percent: 0.85 },
  };

  const currentRisk = riskConfig[level];

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOffset(180 * (1 - currentRisk.percent));
    }, 100);
    return () => clearTimeout(timeout);
  }, [level, currentRisk]);

  return (
    <div className="flex flex-col items-center w-full mx-auto">
      <div className="relative w-[180px] h-[90px] overflow-hidden mb-1">
        {/* Background Track */}
        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible drop-shadow-sm">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Animated Indicator */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={currentRisk.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.6" /* 40 * Math.PI */
            strokeDashoffset={(125.6 * offset) / 180}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
      </div>
      <div className="text-center mt-1">
        <p className="text-[22px] font-heading font-medium tracking-tight text-foreground leading-none">
          {currentRisk.label}
        </p>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-semibold">
          Dashboard Status
        </p>
      </div>
    </div>
  );
}
