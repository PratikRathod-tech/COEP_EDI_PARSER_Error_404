import json
import os
import sys

# Add src to the path if needed to find translators
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from src.translators.custom_837_mapper import Custom837Mapper

def is_float(element: any) -> bool:
    try:
        float(element)
        return True
    except ValueError:
        return False

class Custom837IValidator:
    """
    A custom python-based Validator for 837 Institutional (and Dental) transactions.
    It reads raw EDI data, extracts loops using the Custom837Mapper, and validates 
    SNIP Levels 1 and 2 purely via object structure checks.
    """
    def __init__(self, filepath):
        self.filepath = filepath
        self.errors = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            self.errors.append({
                "id": "e_fatal",
                "message": "Fatal Error: Could not read the 837I file.",
                "segment": "ERR",
                "severity": "critical"
            })
            content = ""
            
        self.mapper = Custom837Mapper(content)
        self.data_dict = self.mapper.parse()

    def validate(self):
        # Mandatory loop checks
        if not self.data_dict["Header"]:
            self.errors.append({
                "id": f"e{len(self.errors)+1}",
                "message": "Mandatory Header Loop is missing.",
                "segment": "ISA",
                "severity": "critical"
            })
            
        if not self.data_dict["Provider_Loops_2000A"]:
            self.errors.append({
                "id": f"e{len(self.errors)+1}",
                "message": "Loop 2000A (Billing Provider) is mandatory and is missing.",
                "segment": "NM1",
                "severity": "critical"
            })
            
        if not self.data_dict["Subscriber_Loops_2000B"]:
            self.errors.append({
                "id": f"e{len(self.errors)+1}",
                "message": "Loop 2000B (Subscriber) is mandatory and is missing.",
                "segment": "NM1",
                "severity": "critical"
            })
            
        claims = self.data_dict.get("Claims_2300", [])
        if not claims:
            self.errors.append({
                "id": f"e{len(self.errors)+1}",
                "message": "Loop 2300 (Claim Information) is mandatory and is missing.",
                "segment": "CLM",
                "severity": "critical"
            })
            
        service_lines = self.data_dict.get("Service_Lines_2400", [])
        if not service_lines:
            self.errors.append({
                "id": f"e{len(self.errors)+1}",
                "message": "Loop 2400 (Service Line) is mandatory and is missing.",
                "segment": "SV2",
                "severity": "critical"
            })

        # Broad Qualifier Dictionaries based on HIPAA 5010 TR3
        VALID_NM1_QUALS = {"13", "24", "34", "46", "71", "82", "85", "87", "98", "FA", "FI", "MI", "NI", "PI", "PP", "PR", "SV", "XV", "XX"}
        VALID_REF_QUALS = {"01", "0B", "1A", "1B", "1C", "1D", "1G", "1H", "1J", "1K", "1L", "1W", "28", "45", "6P", "82", "8L", "9A", "9C", "D3", "EI", "FY", "G1", "G2", "LU", "N5", "SY", "TJ", "X4"}

        # 1. Header Qualifier Check
        for loop in self.data_dict.get("Header", []):
            if "NM1 Segment Details" in loop:
                nm1 = loop["NM1 Segment Details"]
                qual = nm1.get("Identification Code Qualifier (NM108)")
                if qual and qual not in VALID_NM1_QUALS:
                    self.errors.append({
                        "id": f"e{len(self.errors)+1}",
                        "message": f"Qualifier Error: '{qual}' is not a recognized ID qualifier for NM108 (Header).",
                        "segment": "NM1",
                        "severity": "error"
                    })
            if "REF Segment Details" in loop:
                ref = loop["REF Segment Details"]
                qual = ref.get("Reference Identification Qualifier (REF01)")
                if qual and qual not in VALID_REF_QUALS:
                    self.errors.append({
                        "id": f"e{len(self.errors)+1}",
                        "message": f"Qualifier Error: '{qual}' is not a recognized reference qualifier for REF01 (Header).",
                        "segment": "REF",
                        "severity": "error"
                    })

        # Granular field checks inside Claims
        for idx, claim in enumerate(claims):
            c_data = claim.get("Claim_Data_Mapped", {}).get("CLM Segment Details", {})
            if "Total Claim Charge Amount (CLM02)" not in c_data:
                self.errors.append({
                    "id": f"e{len(self.errors)+1}",
                    "message": f"Claim #{idx + 1} is missing mandatory Total Charge Amount (CLM02).",
                    "segment": "CLM",
                    "severity": "error"
                })
            else:
                amt = c_data["Total Claim Charge Amount (CLM02)"]
                if not is_float(amt):
                    self.errors.append({
                        "id": f"e{len(self.errors)+1}",
                        "message": f"Claim #{idx + 1} has invalid numeric format in CLM02: '{amt}'.",
                        "segment": "CLM",
                        "severity": "error"
                    })

        # Granular field checks inside Service Lines
        for idx, sl in enumerate(service_lines):
            # Try to grab the mapped SV2 segment logic
            details = sl.get("Details", [])
            has_sv_segment = False
            for detail_item in details:
                if "SV2 Segment Details" in detail_item:
                    has_sv_segment = True
                    sv2_data = detail_item["SV2 Segment Details"]
                    
                    if "Line Item Charge Amount (SV203)" not in sv2_data:
                        self.errors.append({
                            "id": f"e{len(self.errors)+1}",
                            "message": f"Service Line #{idx + 1} is missing mandatory Line Item Charge Amount (SV203).",
                            "segment": "SV2",
                            "severity": "error"
                        })
                    else:
                        amt = sv2_data["Line Item Charge Amount (SV203)"]
                        if not is_float(amt):
                            self.errors.append({
                                "id": f"e{len(self.errors)+1}",
                                "message": f"Service Line #{idx + 1} has invalid numeric format in SV203: '{amt}'.",
                                "segment": "SV2",
                                "severity": "error"
                            })
                            
                    if "Revenue Code (SV201)" not in sv2_data:
                        self.errors.append({
                            "id": f"e{len(self.errors)+1}",
                            "message": f"Service Line #{idx + 1} is missing mandatory Revenue Code (SV201).",
                            "segment": "SV2",
                            "severity": "error"
                        })

                elif "SV1 Segment Details" in detail_item: # Dental/Prof fallback just in case
                    has_sv_segment = True
                    
            if not has_sv_segment:
                 self.errors.append({
                     "id": f"e{len(self.errors)+1}",
                     "message": f"Service Line #{idx + 1} is missing a required Service Segment (SV2/SV1/SV3).",
                     "segment": "SV2",
                     "severity": "error"
                 })

        return self.errors

def custom_validate_837I(filepath, output_json="validation_errors.json"):
    print(f"--- Starting Custom Pure-Python Validation for {filepath} ---")
    validator = Custom837IValidator(filepath)
    errors = validator.validate()
    
    validation_payload = {
        "is_valid": len(errors) == 0,
        "total_errors": len(errors),
        "errors": errors
    }
    
    if validation_payload["is_valid"]:
        print("\n[OK] No Custom Validation Errors Found! File is Structurally Sound.\n")
    else:
        print(f"\n[ERROR] {len(errors)} Custom Validation Rule Violation(s) Found. Saved to JSON.")
        for err in errors:
            print(f"- {err}")
            
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(validation_payload, f, indent=4)
        
    print(f"Validation payload saved to {output_json} for LLM Engine consumption.")
    return validation_payload
