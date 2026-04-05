import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-secondary border border-border p-1 rounded-full shadow-sm">
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
          theme === "light" 
            ? "bg-white text-slate-800 shadow-sm" 
            : "text-slate-400 hover:text-slate-300"
        }`}
        aria-label="Light theme"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
          theme === "dark" 
            ? "bg-slate-800 text-white shadow-sm" 
            : "text-slate-400 hover:text-slate-600"
        }`}
        aria-label="Dark theme"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
