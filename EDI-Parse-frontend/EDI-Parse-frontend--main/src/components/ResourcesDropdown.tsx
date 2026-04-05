import { ChevronDown } from "lucide-react";
import { NavLink } from "./NavLink";

const resources = [
  { label: "X12 EDI Tutorial", path: "/x12-tutorial" },
  { label: "Examples", path: "/examples" },
  { label: "Validator Rules", path: "/validator-rules" },
  { label: "Implementation Guides", path: "/implementation-guides" },
];

export function ResourcesDropdown() {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1 hover:text-foreground transition-colors py-2 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
        Resources
        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:-rotate-180" />
      </button>

      {/* The pt-4 creates an invisible bridge so hover doesn't flicker when moving mouse down */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 w-64 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
        
        {/* Pointer Triangle Arrow (Mac OS / Linear Style) */}
        <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white/10 border-t border-l border-white/20 rotate-45 backdrop-blur-md -z-10" />

        <div className="bg-black/60 backdrop-blur-2xl text-foreground rounded-xl border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden p-2 ring-1 ring-white/5">
          {resources.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
