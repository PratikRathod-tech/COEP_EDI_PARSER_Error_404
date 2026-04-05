import { Search, ShieldCheck, Cpu, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Instant Parsing",
    description:
      "Upload any EDI file and get a structured, human-readable breakdown in seconds.",
  },
  {
    icon: ShieldCheck,
    title: "Error Detection",
    description:
      "Automatically flag missing segments, invalid codes, and compliance issues.",
  },
  {
    icon: Cpu,
    title: "AI Explanations",
    description:
      "Get plain-language explanations of complex EDI segments powered by AI.",
  },
  {
    icon: BarChart3,
    title: "Risk & Analytics",
    description:
      "Identify high-risk claims and track parsing trends across your submissions.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="border-t border-border bg-card">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Everything You Need for EDI Analysis
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built for healthcare teams who need fast, accurate EDI file processing without the complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 p-5 rounded-lg border border-border bg-background hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
