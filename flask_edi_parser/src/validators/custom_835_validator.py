import json
import os

class Custom835Validator:
    def __init__(self, business_json_data):
        self.data = business_json_data
        self.errors = []
        # Comprehensive Qualifiers
        self.VALID_NM1_QUALS = {"13", "24", "34", "46", "71", "82", "85", "87", "98", "FA", "FI", "MI", "NI", "PI", "PP", "PR", "SV", "XV", "XX"}
        self.VALID_REF_QUALS = {"01", "0B", "1A", "1B", "1C", "1D", "1G", "1H", "1J", "1K", "1L", "1W", "28", "45", "6P", "82", "8L", "9A", "9C", "D3", "EI", "FY", "G1", "G2", "LU", "N5", "SY", "TJ", "X4"}

    def validate(self):
        """
        Performs 835-specific financial balancing rules.
        """
        # Extract BPR02 (Total Payment Amount)
        header = self.data.get("Financial_Header_1000", {})
        bpr = header.get("Financial Information (BPR)", {})
        total_payment_bpr = float(bpr.get("Total Actual Provider Payment Amount (BPR02)", 0.0))
        
        # Extract CLP04 (Individual Claim Payment Amount)
        claims = self.data.get("Claims_2100", [])
        sum_clp_payments = 0.0
        
        for claim in claims:
            clp = claim.get("Claim Payment Information (CLP)", {})
            payment = float(clp.get("Claim Payment Amount (CLP04)", 0.0))
            sum_clp_payments += payment
            
        # Financial Balancing: BPR02 must match Sum(CLP04)
        if abs(total_payment_bpr - sum_clp_payments) > 0.01:
            self.errors.append({
                "id": f"e{len(self.errors)+1}",
                "message": f"Financial Imbalance: BPR02 Total Payment ({total_payment_bpr}) does not match "
                           f"Sum of Individual Claim Payments ({round(sum_clp_payments, 2)}). Differential: {round(total_payment_bpr - sum_clp_payments, 2)}.",
                "segment": "BPR",
                "severity": "error"
            })
            
        # Qualifier Depth Checks
        # 1. Header NM1
        for key in ["Payer Name (N102)", "Payee Name (N102)"]:
            # Financial Header 1000 in this mapper stores N102 directly, 
            # let's assume we can check other qualifiers if the mapper is expanded.
            # Simplified for this specific business JSON structure:
            pass

        return self.errors

def custom_validate_835(input_file, output_json):
    """
    Shim to run the 835 validator from the main entry point.
    """
    from src.translators.business_translator import generate_business_json
    
    # We need the Business JSON for high-level balancing
    temp_json = f"data/outputs/temp_835_{os.path.basename(input_file)}.json"
    generate_business_json(input_file, out_json=temp_json)
    
    with open(temp_json, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    validator = Custom835Validator(data)
    errors = validator.validate()
    
    is_valid = len(errors) == 0
    payload = {
        "filename": os.path.basename(input_file),
        "is_valid": is_valid,
        "total_errors": len(errors),
        "errors": errors
    }
    
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=4)
        
    if not is_valid:
        print(f"\n[ERROR] {len(errors)} 835 Financial Balancing Violation(s) Found.")
        for err in errors:
            print(f"- {err}")
            
    return payload
