import json
import os

def find_segments(data, segment_id):
    """
    Recursively find all occurrences of a segment/loop ID in the business JSON.
    """
    results = []
    if isinstance(data, dict):
        for key, value in data.items():
            if f"({segment_id})" in key or key == segment_id:
                results.append(value)
            else:
                results.extend(find_segments(value, segment_id))
    elif isinstance(data, list):
        for item in data:
            results.extend(find_segments(item, segment_id))
    return results

def get_el(data_dict, element_id):
    """
    Finds a value in a dictionary where the key ends with '(element_id)'.
    Example: get_el(dict, 'NM104') matches 'Member First Name (NM104)'.
    """
    if not isinstance(data_dict, dict): return None
    suffix = f"({element_id})"
    for k, v in data_dict.items():
        if k.endswith(suffix) or k == element_id:
            return v
    return None

def summarize_835(json_data):
    """
    Extracts a tabular summary for 835 Remittance Advice.
    """
    summary = []
    
    # 0. Find Check Trace (TRN02)
    trace_num = "Unknown"
    trns = find_segments(json_data, "TRN")
    if trns:
        trace_num = get_el(trns[0], "TRN02") or "Unknown"

    # 1. More aggressive search for CLP (Claim Payment Information)
    # We look for anything that looks like a CLP segment, even if mislabeled by the parser
    # We'll search for segments that contain CLP01, CLP02, etc.
    all_dicts = []
    def collect_dicts(d):
        if isinstance(d, dict):
            # Check if this dict looks like a CLP segment (even if it's mislabeled as N1 or something)
            # A CLP segment typically has CLP01 (Claim Submitter Identifier)
            if get_el(d, "CLP01") or get_el(d, "N101") == "CLAIM001" or "CLP" in str(d.keys()):
                all_dicts.append(d)
            for v in d.values():
                collect_dicts(v)
        elif isinstance(d, list):
            for item in d:
                collect_dicts(item)
                
    collect_dicts(json_data)
    
    for details in all_dicts:
        # Map values robustly. If misidentified as N1, N101 might be CLP01
        claim_id = get_el(details, "CLP01") or (get_el(details, "N101") if "CLAIM" in str(get_el(details, "N101")) else None)
        
        if claim_id:
            row = {
                "Claim ID": claim_id,
                "Status": get_el(details, "CLP02") or get_el(details, "N102"),
                "Total Billed": get_el(details, "CLP03") or get_el(details, "N103"),
                "Total Paid": get_el(details, "CLP04") or get_el(details, "N104"),
                "Check/EFT Trace": trace_num,
                "Payer Claim ID": get_el(details, "CLP07") or get_el(details, "N107")
            }
            if row["Claim ID"] and row["Claim ID"] not in [s.get("Claim ID") for s in summary]:
                summary.append(row)
                
    return summary

def summarize_834(json_data):
    """
    Extracts a tabular summary for 834 Enrollment, handling nested loops.
    """
    summary = []
    # Find all 2000 (Member Level Detail) loops
    member_loops = find_segments(json_data, "2000")
    
    for loop in member_loops:
        # loop is a list of segments/loops found inside (2000)
        member_row = {
            "Member Name": "Unknown",
            "Subscriber ID": "Unknown",
            "Relationship": "Unknown",
            "Maintenance Type": "Unknown",
            "Maintenance Reason": "Unknown"
        }
        
        # 1. INS Segment (Mandatory at top level of 2000)
        ins_segments = find_segments(loop, "INS")
        if ins_segments:
            ins = ins_segments[0]
            rel_codes = {"01": "Self", "18": "Self", "19": "Child", "20": "Employee", "21": "Unknown"}
            maint_codes = {"001": "Change", "021": "Addition", "024": "Termination", "025": "Reinstatement"}
            ins02 = get_el(ins, "INS02")
            ins03 = get_el(ins, "INS03")
            member_row["Relationship"] = rel_codes.get(ins02, ins02)
            member_row["Maintenance Type"] = maint_codes.get(ins03, ins03)
            member_row["Maintenance Reason"] = get_el(ins, "INS04") or ""
        
        # 2. Subscriber ID (REF*0F - Member Supplemental ID)
        ref_ids = find_segments(loop, "REF")
        for ref in ref_ids:
            if get_el(ref, "REF01") == "0F":
                 member_row["Subscriber ID"] = get_el(ref, "REF02")
        
        # 3. NM1 Segment (Member Name)
        nm1_segments = find_segments(loop, "NM1")
        for nm1 in nm1_segments:
            if get_el(nm1, "NM101") == "IL": # Insured or Subscriber
                member_row["Member Name"] = f"{get_el(nm1, 'NM104') or ''} {get_el(nm1, 'NM103') or ''}".strip()
                # If subscriber ID not found in REF, check NM109 (Industry standard fallback)
                if member_row["Subscriber ID"] == "Unknown":
                    member_row["Subscriber ID"] = get_el(nm1, "NM109") or "Unknown"
        
        if member_row["Member Name"] != "Unknown":
            summary.append(member_row)
            
    # --- Dependent Rollup Logic ---
    # Sort or group by Subscriber ID for better readability
    if summary:
        summary.sort(key=lambda x: str(x.get("Subscriber ID", "")))
        
    return summary

def detect_transaction_type(data):
    """
    Looks for the ST01 value in the business JSON hierarchy.
    """
    st_segments = find_segments(data, "ST")
    for st in st_segments:
        if isinstance(st, dict):
            val = get_el(st, "ST01")
            if val: return str(val)
    return "Unknown"

def generate_summary_from_dict(data):
    """
    Same as generate_summary but takes a dictionary directly.
    """
    summary = []
    summary_type = "Generic"
    
    # 1. Check for 837 Custom Mapper format
    if "Claims_2300" in data or "Service_Lines_2400" in data:
        from src.analytics.analytics_837 import summarize_837
        summary = summarize_837(data)
        return {"type": "837 Institutional", "data": summary}

    # 2. Check for PyX12 output types
    ttype = detect_transaction_type(data)
    
    if ttype == "835":
        summary = summarize_835(data)
        summary_type = "835 Remittance"
    elif ttype == "834":
        summary = summarize_834(data)
        summary_type = "834 Enrollment"
        
    return {"type": summary_type, "data": summary}

def generate_summary(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return generate_summary_from_dict(data)
