import json

def summarize_837(data_dict):
    """
    Extracts a tabular summary for 837 Institutional claim files.
    """
    summary = []
    claims = data_dict.get("Claims_2300", [])
    
    for idx, claim in enumerate(claims):
        clm_data = claim.get("Claim_Data_Mapped", {}).get("CLM Segment Details", {})
        patient_loops = claim.get("Patient_Loops_2010CA", [])
        subscriber_loops = data_dict.get("Subscriber_Loops_2000B", [])
        
        # Determine Patient Name
        patient_name = "Unknown"
        if patient_loops:
            nm1 = patient_loops[0].get("NM1 Segment Details", {})
            patient_name = f"{nm1.get('First Name (NM104)', '')} {nm1.get('Last or Organization Name (NM103)', '')}".strip()
        elif subscriber_loops:
            # If no patient loop, subscriber is the patient
            sub = subscriber_loops[0].get("Subscriber_Name_2010BA", {})
            nm1 = sub.get("NM1 Segment Details", {})
            patient_name = f"{nm1.get('First Name (NM104)', '')} {nm1.get('Last or Organization Name (NM103)', '')}".strip()
            
        row = {
            "Claim ID": clm_data.get("Claim Submitter's Identifier (CLM01)", f"Claim #{idx+1}"),
            "Patient": patient_name,
            "Total Charge": clm_data.get("Total Claim Charge Amount (CLM02)", "0.00"),
            "Facility Type": clm_data.get("Facility Type Code (CLM05)", "")
        }
        summary.append(row)
        
    return summary
