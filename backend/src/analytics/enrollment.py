import json

def extract_834_enrollment(data):
    """
    Extracts member enrollment details from an 834 file for table display.
    Expected Fields: Member Name, Subscriber ID, Relationship, Maintenance Type, Maintenance Reason
    """
    enrollments = []
    raw_segs = data.get('rawSegments', [])
    
    # Detect separator from ISA
    sep = '*'
    for s in raw_segs:
        if s.startswith('ISA'):
            if len(s) > 103:
                sep = s[3]
            break

    current_member = None
    
    # Mapping for common codes
    rel_map = {
        "01": "Spouse",
        "18": "Self",
        "19": "Child",
        "20": "Employee",
        "21": "Unknown",
        "34": "Other"
    }
    
    maintain_map = {
        "001": "Change",
        "021": "Addition",
        "024": "Termination",
        "025": "Reinstatement",
        "030": "Audit"
    }

    for seg in raw_segs:
        f = seg.split(sep)
        tag = f[0].strip()
        
        if tag == 'INS':
            # Start of a new member loop
            if current_member:
                enrollments.append(current_member)
            
            rel_code = f[2].strip() if len(f) > 2 else ""
            m_type_code = f[3].strip() if len(f) > 3 else ""
            m_reason_code = f[4].strip() if len(f) > 4 else ""
            
            current_member = {
                "memberName": "Loading...",
                "subscriberId": "N/A",
                "relationship": rel_map.get(rel_code, f"Other ({rel_code})"),
                "maintenanceType": maintain_map.get(m_type_code, f"Update ({m_type_code})"),
                "maintenanceReason": m_reason_code
            }
        
        elif tag == 'NM1' and f[1] == 'IL':
            if current_member:
                last = f[3].strip() if len(f) > 3 else ""
                first = f[4].strip() if len(f) > 4 else ""
                current_member["memberName"] = f"{first} {last}".strip()
                
        elif tag == 'REF' and f[1] == '0F': # Subscriber ID
            if current_member:
                current_member["subscriberId"] = f[2].strip() if len(f) > 2 else "N/A"

    # Don't forget the last one
    if current_member:
        enrollments.append(current_member)
        
    return enrollments
