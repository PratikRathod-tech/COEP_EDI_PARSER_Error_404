import { TreeNode } from "@/components/EDITreeView";
import { ParsedEDI } from "@/lib/edi-parser";

/**
 * Recursively maps the backend's "Business JSON" into the TreeNode[] structure.
 */
export function mapToTreeView(data: any, path: string = "root", parentLoop: string = "0000"): TreeNode[] {
  if (!data || typeof data !== "object" || data === null) return [];

  // 1. Handle Wrapper (Some parsers wrap in x12simple)
  if (!Array.isArray(data) && data.x12simple) {
    return mapToTreeView(data.x12simple, path, parentLoop);
  }

  // 2. Handle Arrays (Recurse over each item)
  if (Array.isArray(data)) {
    return data.flatMap((item, idx) => mapToTreeView(item, `${path}-${idx}`, parentLoop));
  }

  // 3. Handle Fallback "segments" list
  if (data.segments && Array.isArray(data.segments)) {
    return data.segments.map((seg: any, idx: number) => ({
      id: `${path}-seg-${idx}`,
      segId: seg.segment_id,
      label: seg.segment_id,
      type: 'segment',
      loopId: parentLoop,
      parentLoopId: parentLoop,
      rawContent: `${seg.segment_id} * ${Array.isArray(seg.elements) ? seg.elements.flat().join(' * ') : ''} ~`
    }));
  }

  // 4. Handle Objects (Iterate over keys)
  return Object.entries(data).map(([key, value], idx) => {
    // Extract Segment ID from key (e.g. "Payer Name (N102)" -> N102)
    const idMatch = key.match(/\(([^)]+)\)/);
    let id = idMatch ? idMatch[1].replace('_LOOP', '') : key.substring(0, 5).trim().toUpperCase();
    const label = idMatch ? key.replace(` (${idMatch[1]})`, "").trim() : key;
    const uniqueId = `${path}-${id}-${idx}`;

    // Based on Business Translator: Arrays/keys with _LOOP are loops, dicts are segments
    const isLoop = key.toLowerCase().includes('_loop') || Array.isArray(value);
    
    const node: TreeNode = {
      id: uniqueId,
      segId: id,
      label: label.toUpperCase(),
      type: isLoop ? 'loop' : 'segment',
      loopId: isLoop ? id : parentLoop,
      parentLoopId: parentLoop
    };

    if (typeof value === "string") {
      node.value = value;
      node.rawContent = `${id} * ${value} ~`;
    } else if (Array.isArray(value)) {
      // Loop: Map contents (segments/sub-loops)
      node.children = value.flatMap((item, cIdx) => mapToTreeView(item, `${uniqueId}-${cIdx}`, isLoop ? id : parentLoop));
    } else if (typeof value === "object" && value !== null) {
      // Check if this is a segment dictionary (all values are strings/numbers)
      const childValues = Object.values(value);
      const isSegmentLeaf = childValues.every(v => typeof v === 'string' || typeof v === 'number');

      if (isSegmentLeaf) {
        // It's a segment: Concatenate elements for display
        node.rawContent = `${id} * ${childValues.join(' * ')} ~`;
        
        // Also add the highly-readable business translations as children!
        node.children = Object.entries(value).map(([elemKey, elemValue], eIdx) => ({
          id: `${uniqueId}-elem-${eIdx}`,
          label: elemKey,
          value: String(elemValue),
          type: 'element' as any, // Cast to any to avoid TS issues if interface not updated yet
          loopId: isLoop ? id : parentLoop,
          parentLoopId: parentLoop
        }));
      } else {
        // It's a nested object (fallback): Recurse
        node.children = mapToTreeView(value, uniqueId, isLoop ? id : parentLoop);
      }
    }

    return node;
  });
}

/**
 * Extracts key fields from the backend's summary and parsed data to satisfy the legacy ParsedEDI interface.
 */
/**
 * Recursively find all loops in the business JSON to build a comprehensive summary.
 */
function findAllLoops(data: any, loops: any[] = []): any[] {
  if (!data || typeof data !== 'object') return loops;

  if (Array.isArray(data)) {
    data.forEach(item => findAllLoops(item, loops));
    return loops;
  }

  Object.entries(data).forEach(([key, value]) => {
    const isLoopKey = key.includes('_LOOP') || (key.includes('(') && key.includes(')'));
    if (isLoopKey && Array.isArray(value)) {
      const idMatch = key.match(/\(([^)]+)\)/);
      const id = idMatch ? idMatch[1].replace('_LOOP', '') : key.substring(0, 5).trim();
      const label = idMatch ? key.replace(` (${idMatch[1]})`, "").trim() : key;
      
      // Add or update existing loop entry
      const existing = loops.find(l => l.id === id);
      if (existing) {
        existing.count++;
      } else {
        loops.push({
          id,
          label: label.toUpperCase(),
          present: true,
          count: 1,
          details: []
        });
      }
      
      // Recurse into loop children
      findAllLoops(value, loops);
    } else if (typeof value === 'object') {
      findAllLoops(value, loops);
    }
  });

  return loops;
}

/**
 * Extracts key fields from the backend's summary and parsed data to satisfy the legacy ParsedEDI interface.
 */
export function mapToParsedEDI(apiResponse: any): ParsedEDI {
  const { summary, parsed_data, business_data } = apiResponse;
  
  // 1. Initialize with empty structure
  const result: ParsedEDI = {
    claimSummary: {},
    billingProvider: {},
    subscriber: {},
    serviceLines: [],
    loopSummary: [],
    rawSegments: [],
  };

  // Use the best available source (business_data is best, fallback to parsed_data)
  const sourceData = business_data || (parsed_data?.x12simple?.[0]) || parsed_data;

  // 2. Map Key Fields from Summary (Legacy)
  if (summary && summary.data && Array.isArray(summary.data)) {
    const mainData = summary.data[0] || {};
    
    if (summary.type.includes("837")) {
        result.claimSummary = {
            claimId: mainData["Claim ID"] || mainData["Patient Control Number"],
            chargeAmount: mainData["Total Billed"] || mainData["Total Charge"],
            serviceDates: mainData["Service Date"] || mainData["DTP472"]
        };
        result.serviceLines = summary.data
            .filter((item: any) => item["Line #"] || item["Procedure"] || item["Procedure Code"])
            .map((line: any) => ({
                lineNumber: line["Line #"] || "1",
                procedureCode: line["Procedure"] || line["Procedure Code"],
                chargeAmount: line["Billed"] || line["Line Charge"],
                units: line["Units"]
            }));
    } 
    else if (summary.type.includes("834")) {
        result.subscriber = {
            name: mainData["Member Name"],
            id: mainData["Subscriber ID"]
        };
    }
  }

  // 3. Deep Extraction from Business JSON (New & Improved)
  if (sourceData) {
      // Find Billing Provider (2010AA)
      const findLoop = (data: any, loopId: string): any => {
          if (!data || typeof data !== 'object') return null;
          if (Array.isArray(data)) {
              for (const item of data) {
                  const found = findLoop(item, loopId);
                  if (found) return found;
              }
              return null;
          }
          for (const [key, value] of Object.entries(data)) {
              if (key.includes(`(${loopId})`)) return value;
              const found = findLoop(value, loopId);
              if (found) return found;
          }
          return null;
      };

      // Helper to find specific segment dict within a loop array
      const findSegment = (loopArr: any[], segId: string): any => {
          if (!Array.isArray(loopArr)) return null;
          for (const item of loopArr) {
              const [key, value] = Object.entries(item)[0] || [];
              if (key && key.includes(`(${segId})`)) return value;
          }
          return null;
      };

      const bpLoop = findLoop(sourceData, "2010AA");
      if (bpLoop && bpLoop[0]) {
          const nm1 = findSegment(bpLoop, "NM1");
          if (nm1) {
            result.billingProvider = {
                name: nm1["Billing Provider Last or Organizational Name"] || nm1["Billing Provider Name"],
                npi: nm1["Billing Provider Identifier"]
            };
          }
      }

      const subLoop = findLoop(sourceData, "2010BA");
      if (subLoop && subLoop[0]) {
          const nm1 = findSegment(subLoop, "NM1");
          if (nm1) {
              result.subscriber = {
                  name: `${nm1["Subscriber First Name"] || ''} ${nm1["Subscriber Last Name"] || nm1["Subscriber Name"] || ''}`.trim(),
                  id: nm1["Subscriber Primary Identifier"]
              };
          }
      }

      // Find Patient (2010CA)
      const patLoop = findLoop(sourceData, "2010CA");
      if (patLoop && patLoop[0]) {
          const nm1 = findSegment(patLoop, "NM1");
          if (nm1) {
              result.patient = {
                  name: `${nm1["Patient First Name"] || ''} ${nm1["Patient Last Name"] || nm1["Patient Name"] || ''}`.trim()
              };
          }
      }

      // Find Payer (2010BB)
      const payerLoop = findLoop(sourceData, "2010BB");
      if (payerLoop && payerLoop[0]) {
          const nm1 = findSegment(payerLoop, "NM1");
          if (nm1) {
              result.payerName = nm1["Payer Name"];
          }
      }

      // Find Claim Info (2300)
      const claimLoop = findLoop(sourceData, "2300");
      if (claimLoop && claimLoop[0]) {
          const clm = findSegment(claimLoop, "CLM");
          if (clm) {
              result.claimSummary = {
                  ...result.claimSummary,
                  claimId: result.claimSummary.claimId || clm["Patient Control Number (CLM01)"] || clm["Claim Submitter's Identifier (CLM01)"],
                  chargeAmount: result.claimSummary.chargeAmount || clm["Total Claim Charge Amount (CLM02)"] || clm["Monetary Amount (CLM02)"],
              };
          }
      }

      // 4. Map ALL Loops recursively for the Summary View
      result.loopSummary = findAllLoops(sourceData);
  }

  // 5. Universal Fallback: Scan Raw Segments (For minimal/non-standard files)
  const segments = apiResponse.parsed_data?.rawSegments || result.rawSegments;
  if (segments && segments.length > 0) {
      segments.forEach((segLine: string) => {
          const f = segLine.split('*');
          const id = f[0];

          // Billing Provider (85)
          if (id === 'NM1' && f[1] === '85' && !result.billingProvider.name) {
              result.billingProvider.name = f[3];
              if (f[8] === 'XX') result.billingProvider.npi = f[9];
          }
          // Subscriber (IL)
          if (id === 'NM1' && f[1] === 'IL' && !result.subscriber.name) {
              result.subscriber.name = `${f[4] || ''} ${f[3] || ''}`.trim();
              result.subscriber.id = f[9];
          }
          // Patient (QC) - Fallback for Subscriber if IL is missing
          if (id === 'NM1' && f[1] === 'QC' && !result.patient?.name) {
              const name = `${f[4] || ''} ${f[3] || ''}`.trim();
              result.patient = { name };
              if (!result.subscriber.name) result.subscriber.name = name;
          }
          // Payer (PR)
          if (id === 'NM1' && f[1] === 'PR' && !result.payerName) {
              result.payerName = f[3];
          }
          // Claim (CLM) - 837P/I
          if (id === 'CLM' && !result.claimSummary.claimId) {
              result.claimSummary.claimId = f[1];
              result.claimSummary.chargeAmount = f[2];
          }
          // Claim Payment (CLP) - 835
          if (id === 'CLP' && !result.claimSummary.claimId) {
              result.claimSummary.claimId = f[1];
              result.claimSummary.chargeAmount = f[3]; // CLP03 is Total Billed, CLP04 is Paid
          }
          // Enrollment Info (INS) - 834
          if (id === 'INS' && !result.subscriber.id) {
              // Usually the Member ID is in the subsequent REF*0F or similar, 
              // but we can flag subscriber presence here
          }
      });
  }

  return result;
}
