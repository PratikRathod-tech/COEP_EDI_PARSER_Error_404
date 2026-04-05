import { useState } from "react";

export default function StructuredOutputCard() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="w-[320px] h-[220px] rounded-2xl border bg-white/60 backdrop-blur-md shadow-md p-4 transition-all duration-500 hover:shadow-xl cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="text-sm transition-all duration-500">
        {!hovered ? (
          <div className="space-y-2">
            <p className="font-semibold">Claim Summary</p>
            <p className="text-gray-600 text-xs">Patient: John Doe</p>
            <p className="text-gray-600 text-xs">Amount: $1200</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-green-600">✔ Valid Claim</p>
            <p className="text-xs text-gray-600">No critical errors</p>
            <p className="text-xs text-gray-600">Processed successfully</p>
          </div>
        )}
      </div>
    </div>
  );
}
