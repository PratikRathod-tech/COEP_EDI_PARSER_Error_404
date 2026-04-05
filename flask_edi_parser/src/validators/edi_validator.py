import sys
import argparse
import logging
from io import StringIO
import warnings

# Suppress pyx12 pkg_resources warnings
warnings.filterwarnings("ignore", category=UserWarning)

try:
    import pyx12.x12n_document
    import pyx12.params
except ImportError:
    print("Error: pyx12 is not installed or not available in this Python environment.")
    print("Please install it via: py -3.11 -m pip install pyx12")
    sys.exit(1)

import json
import builtins

# We temporarily monkey-patch 'open' to handle the 'U' mode bug in Python 3.11 for pyx12 
original_open = builtins.open
def custom_open(file, *args, **kwargs):
    if 'mode' in kwargs and isinstance(kwargs['mode'], str) and 'U' in kwargs['mode']:
        kwargs['mode'] = kwargs['mode'].replace('U', '')
        if not kwargs['mode']: kwargs['mode'] = 'r'
    elif args and len(args) > 0 and isinstance(args[0], str) and 'U' in args[0]:
        args = list(args)
        args[0] = args[0].replace('U', '')
        if not args[0]: args[0] = 'r'
        args = tuple(args)
    return original_open(file, *args, **kwargs)
builtins.open = custom_open

def validate_hipaa_structure(filepath, output_json="validation_errors.json"):
    print(f"--- Starting Validator Routing for {filepath} ---")
    
    # Detect transaction types to bypass PyX12 or add custom business rules
    transaction_type = "UNKNOWN"
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'X223' in content[:1000]: # 837I
                transaction_type = '837I'
            elif 'X224' in content[:1000]: # 837D
                transaction_type = '837D'
            elif 'X220' in content[:1000]: # 834
                transaction_type = '834'
            elif 'X221' in content[:1000]: # 835
                transaction_type = '835'
    except:
        pass
        
    if transaction_type == '837I':
        print("[ROUTER] Detected 837 Institutional. Bypassing PyX12 XML schemas and using rigorous Custom Python Validator.")
        from src.validators.custom_837I_validator import custom_validate_837I
        return custom_validate_837I(filepath, output_json)
    
    elif transaction_type == '834':
        print("[ROUTER] Detected 834 Enrollment. Routing to Custom Enrollment Integrity Validator.")
        from src.validators.custom_834_validator import custom_validate_834
        return custom_validate_834(filepath, output_json)
        
    elif transaction_type == '837D':
        print("[ROUTER] Detected 837 Dental. Dental validator not currently implemented as per user request.")
        validation_payload = {
            "is_valid": False,
            "total_errors": 1,
            "errors": ["837D files are currently ignored by the validator engine."]
        }
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(validation_payload, f, indent=4)
        return validation_payload
        
    print(f"--- Proceeding with PyX12 HIPAA Validation for {filepath} ---")
    
    # Configure logging to capture PyX12 errors into a string block
    log_stream = StringIO()
    # Reset any existing handlers
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
        
    logging.basicConfig(level=logging.ERROR, stream=log_stream, force=True, 
                        format='[HIPAA-ERROR] Line:%(lineno)s - %(message)s')
    
    param = pyx12.params.params()
    
    try:
        # We pass None to fd_997 because generating 999 acknowledgements is bugged in python 3.11 pyx12
        result = pyx12.x12n_document.x12n_document(
            param=param, 
            src_file=filepath, 
            fd_997=None, 
            fd_html=None, 
            fd_xmldoc=None
        )
    except Exception as e:
        # Catch unexpected pyx12 crashes
        logging.error(f"Validator crashed during execution: {e}")
        
    logging.shutdown()
    errors = log_stream.getvalue().strip()
    
    validation_payload = {
        "is_valid": False,
        "total_errors": 0,
        "errors": []
    }
    
    if "ERROR" not in errors and result:
        validation_payload["is_valid"] = True
        print("\n\u2714 No HIPAA Validation Errors Found! File is Fully Compliant.\n")
    else:
        # Filter raw logs to clean output
        error_lines = [line for line in errors.split('\n') if 'ERROR' in line]
        error_messages = []
        
        for i, line in enumerate(error_lines):
            msg = line.split('- ', 1)[-1] if '- ' in line else line
            # Extract segment ID if possible (e.g., [ISA], [GS], etc.)
            import re
            seg_match = re.search(r'\[([A-Z0-9]{2,3})\]', line)
            segment = seg_match.group(1) if seg_match else "GEN"
            
            error_messages.append({
                "id": f"e{i+1}",
                "message": msg,
                "segment": segment,
                "severity": "error"
            })
            
        if not error_messages:
            error_messages.append({
                "id": "e1",
                "message": "File contains catastrophic structural/syntax errors preventing validation parsing entirely.",
                "segment": "ERR",
                "severity": "critical"
            })
            print("\n[ERROR] Catastrophic structural errors found.")
            
        validation_payload["total_errors"] = len(error_messages)
        validation_payload["errors"] = error_messages
        
        if error_messages and not validation_payload["is_valid"]:
            print(f"\n[ERROR] {len(error_messages)} HIPAA Rule Violation(s) Found. Saved to JSON.")
    
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(validation_payload, f, indent=4)
        
    print(f"Validation payload saved to {output_json} for LLM Engine consumption.")
    return validation_payload

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate an EDI file and export JSON errors.")
    parser.add_argument("input_file", help="Path to the input EDI file to validate")
    parser.add_argument("--out", default="validation_errors.json", help="Path to save the JSON output")
    args = parser.parse_args()
    
    validate_hipaa_structure(args.input_file, args.out)
