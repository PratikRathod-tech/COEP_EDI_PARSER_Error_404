import sys
import json
import argparse
import xml.etree.ElementTree as ET
import builtins
from io import StringIO
import warnings

def extract_transaction_type(segments_raw, element_separator):
    gs_segment = None
    st_segment = None
    
    # Scan raw segments just for GS and ST headers
    for segment in segments_raw:
        clean_seg = segment.strip().replace('\n', '').replace('\r', '')
        if not clean_seg:
            continue
            
        elements = clean_seg.split(element_separator)
        seg_id = elements[0]
        
        if seg_id == 'GS':
            gs_segment = elements
        elif seg_id == 'ST':
            st_segment = elements
            break # Found the ST segment, we can stop scanning
            
    if not st_segment:
        return "Unknown"
        
    transaction_code = st_segment[1] if len(st_segment) > 1 else ""
    
    # Grab the implementation convention reference from ST[3] or GS[8]
    implementation_convention = ""
    if len(st_segment) > 3:
        implementation_convention = st_segment[3]
    elif gs_segment and len(gs_segment) > 8:
        implementation_convention = gs_segment[8]
        
    if transaction_code == '834':
        return "834"
    elif transaction_code == '835':
        return "835"
    elif transaction_code == '824':
        return "824"
    elif transaction_code == '837':
        # Check professional vs institutional vs dental
        if 'X222' in implementation_convention:
            return "837P"
        elif 'X223' in implementation_convention:
            return "837I"
        elif 'X224' in implementation_convention:
            return "837D"
            
    return "Unknown"

def parse_generic_edi_to_json(input_filepath, output_filepath):
    try:
        with open(input_filepath, 'r', encoding='utf-8') as f:
            content = f.read().strip()
    except FileNotFoundError:
        print(f"Error: Could not find input file '{input_filepath}'")
        return False
        
    if len(content) < 106 or not content.startswith("ISA"):
        print("Error: Not a valid EDI file. Must start with ISA and be at least 106 characters long.")
        return False
        
    element_separator = content[3]
    component_separator = content[104]
    segment_terminator = content[105]
    
    segments_raw = content.split(segment_terminator)
    
    transaction_type = extract_transaction_type(segments_raw, element_separator)
    
    metadata = {
        "transaction_type": transaction_type,
        "element_separator": element_separator,
        "component_separator": component_separator,
        "segment_terminator": segment_terminator
    }
    
    if transaction_type == "Unknown":
        print("Error: Unknown file type. This parser only supports 824, 834, 835, 837D, 837I, and 837P transactions.")
        return False

    if transaction_type in ['824', '834', '835', '837P', '837I']:
        pyx12_result = parse_with_pyx12_to_json(input_filepath, output_filepath, transaction_type)
        if pyx12_result:
            if isinstance(pyx12_result, dict):
                combined = {
                    "metadata": metadata,
                    "rawSegments": [s.strip() for s in segments_raw if s.strip()]
                }
                combined.update(pyx12_result)
                if output_filepath:
                    try:
                        with open(output_filepath, 'w', encoding='utf-8') as f:
                            json.dump(combined, f, indent=4)
                    except Exception:
                        pass
                return combined
            return pyx12_result
        print("[WARN] pyx12 parser failed. Falling back to simple segment parsing.")
        
    if output_filepath is None:
        output_filepath = f"output_{transaction_type}.json"
        
    print(f"Detected File Type: {transaction_type}")
    print(f"Detected Element Separator: '{element_separator}'")
    print(f"Detected Component Separator: '{component_separator}'")
    print(f"Detected Segment Terminator: '{segment_terminator}'")
    
    parsed_json = {
        "metadata": metadata,
        "segments": []
    }
    
    for segment in segments_raw:
        segment = segment.strip().replace('\n', '').replace('\r', '')
        if not segment:
            continue
            
        elements = segment.split(element_separator)
        segment_id = elements[0]
        
        parsed_elements = []
        for el in elements[1:]:
            if component_separator in el:
                parsed_elements.append(el.split(component_separator))
            else:
                parsed_elements.append(el)
                
        parsed_json["segments"].append({
            "segment_id": segment_id,
            "elements": parsed_elements
        })
        
    parsed_json["rawSegments"] = [s.strip() for s in segments_raw if s.strip()]
    
    try:
        if output_filepath:
            with open(output_filepath, 'w', encoding='utf-8') as f:
                json.dump(parsed_json, f, indent=4)
            print(f"Successfully wrote JSON output to {output_filepath}")
        return parsed_json
    except Exception as e:
        print(f"Error writing to output file: {e}")
        return False

def parse_with_pyx12_to_json(input_filepath, output_filepath, transaction_type):
    from src.translators.business_translator import generate_business_json
    try:
        final_payload = generate_business_json(input_filepath, out_json=output_filepath)
        return final_payload
    except Exception as e:
        print(f"Error executing pyx12 human-readable parser: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert an 834/835/837 EDI file to JSON.")
    parser.add_argument("input_file", help="Path to the input EDI file")
    parser.add_argument("output_file", help="Path to save the JSON output", nargs='?', default=None)
    args = parser.parse_args()
    
    # Only return true code if completely successful
    if not parse_generic_edi_to_json(args.input_file, args.output_file):
        sys.exit(1)
