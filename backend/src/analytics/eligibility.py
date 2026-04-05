import json
import os
from dateutil import parser as date_parser

def extract_member_roster_834(file_path):
    """
    Scans an 834 file to build a lookup of Subscriber ID -> Coverage Dates.
    """
    roster = {}
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        
    if not content: return {}
    
    ele_sep = content[3]
    seg_term = content[105]
    segments = content.split(seg_term)
    
    current_subscriber = None
    current_nm1 = None
    
    for seg in segments:
        f = seg.strip().split(ele_sep)
        tag = f[0]
        
        if tag == 'INS':
            # Store previous if exists
            if current_subscriber and 'id' in current_subscriber:
                roster[current_subscriber['id']] = current_subscriber
            
            current_subscriber = {
                "id": None,
                "name": "Unknown",
                "effective": "19000101",
                "termination": "99991231"
            }
        
        elif tag == 'REF' and f[1] == '0F': # Subscriber ID
            if current_subscriber:
                current_subscriber['id'] = f[2].strip()
                
        elif tag == 'NM1' and f[1] == 'IL': # Member Name
            if current_subscriber:
                last = f[3].strip() if len(f) > 3 else ""
                first = f[4].strip() if len(f) > 4 else ""
                current_subscriber['name'] = f"{first} {last}".strip()
                
        elif tag == 'DTP':
            qual = f[1]
            date_val = f[3] if len(f) > 3 else ""
            if current_subscriber:
                if qual == '348': # Benefit Begin
                    current_subscriber['effective'] = date_val
                elif qual == '349': # Benefit End
                    current_subscriber['termination'] = date_val

    # Last one
    if current_subscriber and current_subscriber.get('id'):
        roster[current_subscriber['id']] = current_subscriber
        
    return roster

def extract_claims_837(file_path):
    """
    Scans an 837 file to extract Claim ID, Subscriber ID, and Service Date.
    """
    claims = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        
    if not content: return []
    
    ele_sep = content[3]
    seg_term = content[105]
    segments = content.split(seg_term)
    
    current_subscriber_id = None
    current_claim = None
    
    for seg in segments:
        f = seg.strip().split(ele_sep)
        tag = f[0]
        
        if tag == 'NM1' and f[1] == 'IL':
            current_subscriber_id = f[9] if len(f) > 9 else None
            
        elif tag == 'CLM':
            if current_claim:
                claims.append(current_claim)
            
            current_claim = {
                "claimId": f[1],
                "subscriberId": current_subscriber_id,
                "serviceDate": "19000101",
                "amount": float(f[2]) if len(f) > 2 and f[2] else 0.0
            }
            
        elif tag == 'DTP' and f[1] == '472': # Service Date
            if current_claim:
                current_claim['serviceDate'] = f[3]
                
    if current_claim:
        claims.append(current_claim)
        
    return claims

def perform_eligibility_check(path_834, path_837):
    """
    Compares 837 claims against 834 roster.
    """
    roster = extract_member_roster_834(path_834)
    claims = extract_claims_837(path_837)
    
    results = []
    
    for claim in claims:
        sub_id = claim['subscriberId']
        svc_date = claim['serviceDate']
        
        member = roster.get(sub_id)
        
        if not member:
            status = "Member Not Found"
            details = f"Subscriber ID {sub_id} is missing from the enrollment roster."
        else:
            eff = member['effective']
            term = member['termination']
            
            # Simple string comparison CCYYMMDD works perfectly for equality/range
            if svc_date < eff:
                status = "Not Yet Effective"
                details = f"Service date {svc_date} is before member effective date {eff}."
            elif svc_date > term:
                status = "Terminated"
                details = f"Service date {svc_date} is after member termination date {term}."
            else:
                status = "Eligible"
                details = f"Member {member['name']} was active on the date of service."
                
        results.append({
            "claimId": claim['claimId'],
            "subscriberId": sub_id,
            "memberName": member['name'] if member else "Unknown",
            "serviceDate": svc_date,
            "amount": claim['amount'],
            "status": status,
            "details": details
        })
        
    return results
