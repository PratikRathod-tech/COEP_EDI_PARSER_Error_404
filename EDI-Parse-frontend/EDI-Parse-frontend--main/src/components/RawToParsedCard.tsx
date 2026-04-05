import { useState } from "react";

export default function RawToParsedCard() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="w-[320px] h-[220px] rounded-2xl border bg-white/60 dark:bg-slate-900/60 dark:border-white/10 backdrop-blur-md shadow-md p-4 transition-all duration-500 hover:shadow-xl cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="text-xs font-mono text-gray-700 dark:text-gray-300 transition-opacity duration-300">
        {!hovered ? (
          <pre className="whitespace-pre-wrap animate-in fade-in duration-300">
{`ISA*00*          *00*          *ZZ*ABC         *ZZ*XYZ         *
GS*HC*12345*54321*
ST*837*0001~
NM1*IL*1*DOE*JOHN`}
          </pre>
        ) : (
          <pre className="whitespace-pre-wrap text-green-700 dark:text-emerald-400 animate-in fade-in duration-300">
{`{
  "claim_id": "0001",
  "patient": "John Doe",
  "type": "837",
  "status": "Valid"
}`}
          </pre>
        )}
      </div>
    </div>
  );
}
