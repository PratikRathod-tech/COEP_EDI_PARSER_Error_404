import os
import json

class Custom837Mapper:
    """
    A standalone deterministic mapper designed explicitly to bypass pyx12 for 
    837I (Institutional) and 837D (Dental) formats to prevent structural crashes 
    and preserve the 2400 Service Lines.
    """
    
    def __init__(self, content):
        self.content = content.replace('\n', '').replace('\r', '')
        # Basic EDI separators
        self.element_separator = self.content[3] if len(self.content) > 3 else '*'
        self.segment_terminator = self.content[105] if len(self.content) > 105 else '~'
        self.segments = [seg.strip() for seg in self.content.split(self.segment_terminator) if seg.strip()]
        
        # Output Structure
        self.output = {
            "Custom Mapper Output": "Activated for Institutional/Dental 837",
            "Header": [],
            "Provider_Loops_2000A": [],
            "Subscriber_Loops_2000B": [],
            "Patient_Loops_2000C": [],
            "Claims_2300": [],
            "Service_Lines_2400": [],
            "Unmapped_Trailers": []
        }
        
        # State tracking
        self.current_loop = "Header"
        
        # Semantic Dictionary mappings (0-indexed to match elements[1:])
        self.SEGMENT_DICTIONARY = {
            "SV2": {
                0: "Revenue Code (SV201)",
                1: "Procedure Code (SV202)",
                2: "Line Item Charge Amount (SV203)",
                3: "Unit or Basis for Measurement Code (SV204)",
                4: "Service Unit Count (SV205)",
                6: "Non-Covered Charge Amount (SV207)"
            },
            "SV1": {
                0: "Procedure Code (SV101)",
                1: "Line Item Charge Amount (SV102)",
                2: "Unit or Basis for Measurement Code (SV103)",
                3: "Service Unit Count (SV104)",
                4: "Place of Service (SV105)",
                6: "Diagnosis Code Pointer (SV107)"
            },
            "CLM": {
                0: "Claim Submitter's Identifier (CLM01)",
                1: "Total Claim Charge Amount (CLM02)",
                4: "Facility Type Code (CLM05)",
                5: "Provider Signature on File (CLM06)",
                6: "Provider Accept Assignment (CLM07)",
                7: "Benefits Assignment (CLM08)",
                8: "Release of Information (CLM09)"
            },
            "NM1": {
                0: "Entity Identifier Code (NM101)",
                1: "Entity Type Qualifier (NM102)",
                2: "Last or Organization Name (NM103)",
                3: "First Name (NM104)",
                7: "Identification Code Qualifier (NM108)",
                8: "Identification Code (NM109)"
            },
            "DTP": {
                0: "Date Time Qualifier (DTP01)",
                1: "Date Time Period Format Qualifier (DTP02)",
                2: "Date Time Period (DTP03)"
            },
            "AMT": {
                0: "Amount Qualifier Code (AMT01)",
                1: "Monetary Amount (AMT02)"
            },
            "CAS": {
                0: "Claim Adjustment Group Code (CAS01)",
                1: "Adjustment Reason Code (CAS02)",
                2: "Adjustment Amount (CAS03)",
                3: "Adjustment Quantity (CAS04)",
                4: "Adjustment Reason Code (CAS05)",
                5: "Adjustment Amount (CAS06)"
            },
            "REF": {
                0: "Reference Identification Qualifier (REF01)",
                1: "Reference Identification (REF02)"
            }
        }

    def map_segment_semantic(self, seg_id, elements):
        """Translates raw element arrays into readable JSON dictionary keys using the semantic map."""
        if seg_id not in self.SEGMENT_DICTIONARY:
            return {seg_id: elements[1:]}
        
        mapped_obj = {}
        mapping_rules = self.SEGMENT_DICTIONARY[seg_id]
        
        # elements[0] is seg_id, elements[1:] is the data
        data_elements = elements[1:]
        
        for idx, val in enumerate(data_elements):
            if val.strip(): # if there is a value
                # Check if we have a semantic name for it
                key_name = mapping_rules.get(idx, f"{seg_id}_{idx+1:02d}")
                mapped_obj[key_name] = val

        return {f"{seg_id} Segment Details": mapped_obj}

    def parse(self):
        print(f"[Custom 837 Mapper] Initiating manual parse of {len(self.segments)} segments...")
        
        current_claim = None
        current_service_line = None
        
        for segment in self.segments:
            elements = segment.split(self.element_separator)
            seg_id = elements[0]
            
            # --- LOOP STATE DETECTION ---
            if seg_id == 'HL':
                # HL*1**20*1 (20=Provider, 22=Subscriber, 23=Patient)
                if len(elements) > 3:
                    hl_code = elements[3]
                    if hl_code == '20':
                        self.current_loop = "Provider_Loops_2000A"
                    elif hl_code == '22':
                        self.current_loop = "Subscriber_Loops_2000B"
                    elif hl_code == '23':
                        self.current_loop = "Patient_Loops_2000C"
            
            elif seg_id == 'CLM':
                self.current_loop = "Claims_2300"
                current_claim = {"Claim_Data": elements[1:], "Details": []}
                self.output["Claims_2300"].append(current_claim)
                
            elif seg_id == 'LX':
                self.current_loop = "Service_Lines_2400"
                current_service_line = {"Line_Number": elements[1] if len(elements) > 1 else "", "Details": []}
                self.output["Service_Lines_2400"].append(current_service_line)
                
            elif seg_id in ['SE', 'GE', 'IEA']:
                self.current_loop = "Unmapped_Trailers"
            
            
            # --- DATA ROUTING ---
            detail_obj = self.map_segment_semantic(seg_id, elements)
            
            if self.current_loop == "Header":
                self.output["Header"].append(detail_obj)
                
            elif self.current_loop == "Provider_Loops_2000A":
                self.output["Provider_Loops_2000A"].append(detail_obj)
                
            elif self.current_loop == "Subscriber_Loops_2000B":
                self.output["Subscriber_Loops_2000B"].append(detail_obj)
                
            elif self.current_loop == "Patient_Loops_2000C":
                self.output["Patient_Loops_2000C"].append(detail_obj)
                
            elif self.current_loop == "Claims_2300" and current_claim is not None:
                if seg_id != 'CLM': # Prevent duplicate CLM nesting
                    current_claim["Details"].append(detail_obj)
                else:
                    # Update local claim dictionary with semantic mapping since we saved it raw before
                    current_claim["Claim_Data_Mapped"] = detail_obj
                    
            elif self.current_loop == "Service_Lines_2400" and current_service_line is not None:
                if seg_id != 'LX': # Prevent duplicate LX nesting
                    current_service_line["Details"].append(detail_obj)
                    
            elif self.current_loop == "Unmapped_Trailers":
                 self.output["Unmapped_Trailers"].append(detail_obj)

        return self.output

    def generate_json(self, output_filepath):
        parsed_data = self.parse()
        os.makedirs(os.path.dirname(output_filepath) or ".", exist_ok=True)
        with open(output_filepath, "w", encoding="utf-8") as f:
            json.dump(parsed_data, f, indent=4)
        print(f"[SUCCESS] Custom 837 Document translated via pure python: {output_filepath}")


def process_custom_837(input_file, out_json=None):
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        print(f"[ERROR] Custom Mapper couldn't read file {input_file}")
        return None
        
    mapper = Custom837Mapper(content)
    parsed_data = mapper.parse()
    
    if not out_json:
        out_json_filename = f"business_{os.path.splitext(os.path.basename(input_file))[0]}.json"
        out_json = os.path.join("data", "outputs", out_json_filename)
    
    mapper.generate_json(out_json)
    return parsed_data
