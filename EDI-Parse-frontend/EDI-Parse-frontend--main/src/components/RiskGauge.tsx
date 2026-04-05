interface RiskGaugeProps {
  level: "low" | "medium" | "high";
}

const config = {
  low: { label: "Low Risk", color: "bg-emerald-500", width: "w-1/4" },
  medium: { label: "Medium Risk", color: "bg-amber-500", width: "w-2/4" },
  high: { label: "High Risk", color: "bg-red-500", width: "w-3/4" },
};

const RiskGauge = ({ level }: RiskGaugeProps) => {
  const { label, color, width } = config[level];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Risk Level</span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} ${width} transition-all`} />
      </div>
    </div>
  );
};

export default RiskGauge;
