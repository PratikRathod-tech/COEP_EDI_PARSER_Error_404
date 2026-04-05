import json
import os
from src.parsers.edi_parser import parse_generic_edi_to_json

def reconcile_837_835(file_837_path, file_835_path):
    """
    Reconciles an 837 Claim file against an 835 Remittance file at the service line level.
    """
    # 1. Parse both files to get their business/parsed structure
    data_837 = parse_generic_edi_to_json(file_837_path, None)
    data_835 = parse_generic_edi_to_json(file_835_path, None)

    if not data_837 or not data_835:
        # Return a meaningful error if files are unprocessable
        return [{
            "claimId": "ERROR",
            "status": f"Parsing failed for one of the files. (837: {'OK' if data_837 else 'FAIL'}, 835: {'OK' if data_835 else 'FAIL'})",
            "serviceLines": []
        }]

    # 2. Helper to find all claim data in a generic way
    def extract_claims_from_segments(data, claim_tag, line_tag, billed_idx, paid_idx, line_billed_idx, line_paid_idx, icn_tag=None, icn_idx=None):
        results = {}
        raw_segs = data.get('rawSegments', [])
        
        # Detect separators from ISA
        sep = '*'
        for s in raw_segs:
            if s.startswith('ISA'):
                # In standard ISA, the separator is at position 3
                if len(s) > 103:
                    sep = s[3]
                break

        current_id = None
        for seg in raw_segs:
            f = seg.split(sep)
            tag = f[0].strip()
            
            if tag == claim_tag:
                current_id = f[1].strip()
                results[current_id] = {
                    "pcn": current_id,
                    "icn": f[icn_idx].strip() if icn_idx is not None and len(f) > icn_idx else "",
                    "billed": float(f[billed_idx].strip()) if len(f) > billed_idx and f[billed_idx] else 0.0,
                    "paid": float(f[paid_idx].strip()) if paid_idx is not None and len(f) > paid_idx else 0.0,
                    "lines": []
                }
            elif icn_tag and tag == icn_tag: # Handles REF*F8
                if current_id and f[1] == 'F8':
                    results[current_id]["icn"] = f[2].strip()
            elif tag == line_tag: # SV1/SV2 or SVC
                if current_id:
                    proc_code = f[1].split(':')[0] if ':' in f[1] else f[1] # Split components if needed
                    results[current_id]["lines"].append({
                        "procedure": proc_code.strip(),
                        "billed": float(f[line_billed_idx].strip()) if len(f) > line_billed_idx and f[line_billed_idx] else 0.0,
                        "paid": float(f[line_paid_idx].strip()) if line_paid_idx is not None and len(f) > line_paid_idx else 0.0
                    })
        return results

    # 3. Perform Extraction
    # 837: CLM is tag, SV1/SV2 is line. 
    # CLM: f[2] is Billed. No Paid at claim level in 837.
    # SV1/SV2: f[2] is Billed.
    claims_837 = extract_claims_from_segments(data_837, 'CLM', 'SV1', 2, 2, 2, 2, icn_tag='REF', icn_idx=2)
    # Also handle SV2 for institutional
    claims_837_inst = extract_claims_from_segments(data_837, 'CLM', 'SV2', 2, 2, 2, 2, icn_tag='REF', icn_idx=2)
    claims_837.update(claims_837_inst)

    # 835: CLP is tag, SVC is line.
    # CLP: f[3] is Billed (Original), f[4] is Paid.
    # SVC: f[2] is Billed, f[3] is Paid.
    payments_835 = extract_claims_from_segments(data_835, 'CLP', 'SVC', 3, 4, 2, 3, icn_idx=7)


    # 4. Reconciliation Join
    reconciliation_results = []
    
    # Process all claims in 837
    for cid, cdata in claims_837.items():
        # Match by Patient Control Number or ICN/DCN
        pdata = payments_835.get(cid)
        if not pdata and cdata.get("icn"):
            # Try matching by ICN if PCN match failed
            for pi, pd in payments_835.items():
                if pd["icn"] == cdata["icn"]:
                    pdata = pd
                    break

        billed = cdata["billed"]
        paid = pdata["paid"] if pdata else 0.0
        
        # Calculate Status
        if not pdata:
            status = "Missing in 835"
        elif billed == paid:
            status = "Matched"
        elif paid == 0:
            status = "Rejected/Denied"
        elif paid < billed:
            status = "Partial Payment"
        else:
            status = "Overpaid"

        result = {
            "claimId": cid,
            "icn": pdata["icn"] if pdata else (cdata.get("icn") or "NOT ASSIGNED"),
            "billedAmount": billed,
            "paidAmount": paid,
            "status": status,
            "serviceLines": []
        }
        
        # Match service lines
        p_lines = pdata["lines"] if pdata else []
        p_lines_matched = [False] * len(p_lines)
        
        for cline in cdata["lines"]:
            # Logic: Match by procedure code and amount if possible
            match = None
            for idx, pline in enumerate(p_lines):
                if not p_lines_matched[idx] and pline["procedure"] == cline["procedure"]:
                    match = pline
                    p_lines_matched[idx] = True
                    break
            
            sl_billed = cline["billed"]
            sl_paid = match["paid"] if match else 0.0
            
            # SL Status
            if not match:
                sl_status = "Line Missing"
            elif sl_billed == sl_paid:
                sl_status = "Matched"
            elif sl_paid == 0:
                sl_status = "Denied"
            elif sl_paid < sl_billed:
                sl_status = "Partial"
            else:
                sl_status = "Overpaid"

            result["serviceLines"].append({
                "procedure": cline["procedure"],
                "billed837": sl_billed,
                "billed835": match["billed"] if match else 0.0,
                "paid835": sl_paid,
                "status": sl_status
            })
            
        reconciliation_results.append(result)

    # Also add claims found in 835 but NOT in 837
    for cid, pdata in payments_835.items():
        if cid not in claims_837:
            reconciliation_results.append({
                "claimId": cid,
                "billedAmount": 0.0,
                "paidAmount": pdata["paid"],
                "status": "Unmatched (Missing in 837)",
                "serviceLines": [
                    {
                        "procedure": sl["procedure"],
                        "billed837": 0.0,
                        "billed835": sl["billed"],
                        "paid835": sl["paid"],
                        "status": "Extra in 835"
                    } for sl in pdata["lines"]
                ]
            })

    return reconciliation_results
