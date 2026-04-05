from src.parsers.edi_parser import parse_generic_edi_to_json
from src.analytics.enrollment import extract_834_enrollment

def compare_834_files(file_base_path, file_new_path):
    """
    Compares two 834 files and returns the delta.
    Logic:
    1. Parse both files.
    2. Extract enrollment data.
    3. Identify additions, terminations, and attribute changes.
    """
    # 1. Parse
    data_base = parse_generic_edi_to_json(file_base_path, None)
    data_new = parse_generic_edi_to_json(file_new_path, None)

    if not data_base or not data_new:
        return {"error": "Failed to parse one or both files."}

    # 2. Extract
    members_base = extract_834_enrollment(data_base)
    members_new = extract_834_enrollment(data_new)

    # Convert to maps keyed by Subscriber ID
    map_base = {m["subscriberId"]: m for m in members_base if m["subscriberId"] != "N/A"}
    map_new = {m["subscriberId"]: m for m in members_new if m["subscriberId"] != "N/A"}

    deltas = []

    # 3. Terminations (In Base but not in New)
    for sub_id, m_base in map_base.items():
        if sub_id not in map_new:
            deltas.append({
                "subscriberId": sub_id,
                "memberName": m_base["memberName"],
                "changeType": "Termination",
                "details": "Member removed in new file."
            })

    # 4. Additions & Changes (In New)
    for sub_id, m_new in map_new.items():
        if sub_id not in map_base:
            deltas.append({
                "subscriberId": sub_id,
                "memberName": m_new["memberName"],
                "changeType": "Addition",
                "details": "New member added."
            })
        else:
            # Check for attribute changes
            m_base = map_base[sub_id]
            changes = []
            
            if m_new["memberName"] != m_base["memberName"]:
                changes.append(f"Name: {m_base['memberName']} -> {m_new['memberName']}")
            
            if m_new["relationship"] != m_base["relationship"]:
                changes.append(f"Relationship: {m_base['relationship']} -> {m_new['relationship']}")
            
            if changes:
                deltas.append({
                    "subscriberId": sub_id,
                    "memberName": m_new["memberName"],
                    "changeType": "Modified",
                    "details": "; ".join(changes)
                })

    return deltas
