export interface ParsedEDI {
  claimSummary: {
    claimId?: string;
    chargeAmount?: string;
    placeOfService?: string;
    serviceDates?: string;
  };
  billingProvider: {
    name?: string;
    npi?: string;
  };
  subscriber: {
    name?: string;
    id?: string;
  };
  patient?: {
    name?: string;
  };
  payerName?: string;
  serviceLines: Array<{
    lineNumber: string;
    procedureCode?: string;
    chargeAmount?: string;
    units?: string;
  }>;
  loopSummary: Array<{
    id: string;
    label: string;
    present: boolean;
    count: number;
    details: string[];
  }>;
  rawSegments: string[];
}

export function parseEDI(rawText: string): ParsedEDI {
  const segments = rawText.split("~").map((s) => s.trim()).filter(Boolean);

  const result: ParsedEDI = {
    claimSummary: {},
    billingProvider: {},
    subscriber: {},
    patient: {},
    payerName: "",
    serviceLines: [],
    loopSummary: [],
    rawSegments: segments,
  };

  // Tracking context
  let currentLoop = "";
  let serviceLineCount = 0;
  
  // Loop summary tracking maps
  const loopCounts: Record<string, number> = {};
  const loopDetails: Record<string, string[]> = {};

  const registerLoop = (id: string, detail?: string) => {
    loopCounts[id] = (loopCounts[id] || 0) + 1;
    if (!loopDetails[id]) loopDetails[id] = [];
    if (detail) loopDetails[id].push(detail);
  };

  for (let i = 0; i < segments.length; i++) {
    const fields = segments[i].split("*");
    const segId = fields[0];

    // Basic structural mapping
    if (segId === "ISA") registerLoop("ISA/GS/ST Envelope", `Interchange Sender: ${fields[6]}`);
    if (segId === "GS") registerLoop("ISA/GS/ST Envelope", `Group Receiver: ${fields[3]}`);
    if (segId === "ST") registerLoop("ISA/GS/ST Envelope", `Transaction Set: ${fields[1]}`);

    // Logical loops context based loosely on X12 837 paths
    if (segId === "HL") {
      const hlLevelCode = fields[3]; // e.g. "20" (Information Source), "22" (Subscriber)
      if (hlLevelCode === "20") currentLoop = "2000A"; // Billing Provider
      if (hlLevelCode === "22") currentLoop = "2000B"; // Subscriber
    }

    if (segId === "NM1") {
      const entityId = fields[1]; // 85 = Billing Provider, IL = Subscriber
      if (entityId === "85") {
        result.billingProvider.name = `${fields[3] || ""} ${fields[4] || ""}`.trim();
        if (fields[8] === "XX") result.billingProvider.npi = fields[9];
        registerLoop("2010AA Billing Provider", `NPI: ${fields[9]}`);
      } else if (entityId === "IL") {
        result.subscriber.name = `${fields[3] || ""} ${fields[4] || ""}`.trim();
        result.subscriber.id = fields[9];
        registerLoop("2010BA Subscriber", `ID: ${fields[9]}`);
      }
    }

    // Claim loop 2300
    if (segId === "CLM") {
      currentLoop = "2300";
      result.claimSummary.claimId = fields[1];
      result.claimSummary.chargeAmount = fields[2];
      const posInfo = fields[5]?.split(":") || [];
      result.claimSummary.placeOfService = posInfo[0] || "--";
      registerLoop("2300 Claim", `Claim ID: ${fields[1]} ($${fields[2]})`);
    }

    if (segId === "DTP" && currentLoop === "2300" && fields[1] === "435") {
      result.claimSummary.serviceDates = fields[3]; 
    }
    // General service date fallback
    if (segId === "DTP" && fields[1] === "472") {
      result.claimSummary.serviceDates = fields[3]; 
    }

    // Service Lines 2400
    if (segId === "SV1") {
      currentLoop = "2400";
      serviceLineCount++;
      const procInfo = fields[1]?.split(":") || [];
      result.serviceLines.push({
        lineNumber: serviceLineCount.toString(),
        procedureCode: procInfo[1] || procInfo[0],
        chargeAmount: fields[2],
        units: fields[4],
      });
      registerLoop("2400 Service Lines", `Line ${serviceLineCount}: ${procInfo[1] || procInfo[0]} ($${fields[2]})`);
    }
  }

  // Populate structural summary map
  const expectedLoops = [
    { id: "ISA/GS/ST Envelope", label: "Interchange Envelope" },
    { id: "1000A/B", label: "Submitter / Receiver" },
    { id: "2010AA Billing Provider", label: "Billing Provider HL" },
    { id: "2010BA Subscriber", label: "Subscriber HL" },
    { id: "2300 Claim", label: "Claim Information" },
    { id: "2400 Service Lines", label: "Service Lines" },
  ];

  result.loopSummary = expectedLoops.map(loop => ({
    id: loop.id,
    label: loop.label,
    present: !!loopCounts[loop.id],
    count: loopCounts[loop.id] || 0,
    details: loopDetails[loop.id] || [],
  }));

  return result;
}
