import json
import os

class Custom834Validator:
    def __init__(self, business_json_data):
        self.data = business_json_data
        self.errors = []
        # Comprehensive Qualifiers
        self.VALID_NM1_QUALS = {"13", "24", "34", "46", "71", "82", "85", "87", "98", "FA", "FI", "MI", "NI", "PI", "PP", "PR", "SV", "XV", "XX"}
        self.VALID_REF_QUALS = {"01", "0B", "1A", "1B", "1C", "1D", "1G", "1H", "1J", "1K", "1L", "1W", "28", "45", "6P", "82", "8L", "9A", "9C", "D3", "EI", "FY", "G1", "G2", "LU", "N5", "SY", "TJ", "X4"}

    def validate(self):
        """
        Performs 834-specific business rule validation.
        """
        detail_section = self.data.get("x12simple", [{}])[0].get("Table2 - Area2 (DETAIL)", [])
        
        # Rule: Every Member (2000 loop) must have at least one Health Coverage (2300 loop)
        for idx, item in enumerate(detail_section):
            member_loop = item.get("Member Level Detail (2000)", [])
            if not member_loop:
                continue
                
            has_coverage = False
            member_name = "Unknown Member"
            
            for part in member_loop:
                # Identify Member Name and Check Qualifiers for better error reporting
                if "Member Name (2100A)" in part:
                    nm1 = part["Member Name (2100A)"][0].get("Member Name (NM1)", {})
                    member_name = f"{nm1.get('Member First Name (NM104)', '')} {nm1.get('Member Last Name (NM103)', '')}".strip()
                    
                    # Qualifier Check (NM108)
                    qual = nm1.get("Identification Code Qualifier (NM108)")
                    if qual and qual not in self.VALID_NM1_QUALS:
                        self.errors.append({
                            "id": f"e{len(self.errors)+1}",
                            "message": f"Qualifier Error: Member '{member_name}' has unrecognized ID qualifier '{qual}' (NM108).",
                            "segment": "NM1",
                            "severity": "error"
                        })
                
                # Check for Member Supplemental Identifier (REF) Qualifiers
                if "Member Supplemental Identifier (REF)" in part:
                    ref = part["Member Supplemental Identifier (REF)"]
                    qual = ref.get("Reference Identification Qualifier (REF01)")
                    if qual and qual not in self.VALID_REF_QUALS:
                        self.errors.append({
                            "id": f"e{len(self.errors)+1}",
                            "message": f"Qualifier Error: Member '{member_name}' has unrecognized reference qualifier '{qual}' (REF01).",
                            "segment": "REF",
                            "severity": "error"
                        })

                # Check for Health Coverage loop
                if "Health Coverage (2300)" in part:
                    has_coverage = True
            
            if not has_coverage:
                self.errors.append({
                    "id": f"e{len(self.errors)+1}",
                    "message": f"Enrollment Error: Member '{member_name}' (Loop {idx+1}) is missing mandatory Health Coverage (2300 loop).",
                    "segment": "INS",
                    "severity": "error"
                })

        return self.errors

def custom_validate_834(input_file, output_json):
    """
    Shim to run the 834 validator from the main entry point.
    """
    from src.translators.business_translator import generate_business_json
    
    # We need the Business JSON to perform high-level loop checks
    # Create a temp business json if it doesn't exist
    temp_json = f"data/outputs/temp_834_{os.path.basename(input_file)}.json"
    generate_business_json(input_file, out_json=temp_json)
    
    with open(temp_json, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    validator = Custom834Validator(data)
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
        print(f"\n[ERROR] {len(errors)} 834 Business Rule Violation(s) Found.")
        for err in errors:
            print(f"- {err}")
    
    return payload
