import json
import os
import sys

# Append root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from src.validators.edi_validator import validate_hipaa_structure

def apply_auto_fixes(raw_edi_file, suggestions_json):
    """
    Acts as the programmatic backend for the "Accept Fixes" UI button.
    Reads the AI proposed JSON strings and injects them into the raw EDI file.
    """
    print(f"\n--- Initiating Auto-Fix Patcher on {raw_edi_file} ---")
    
    if not os.path.exists(suggestions_json):
        print(f"[ERROR] Auto-fix file {suggestions_json} not found.")
        return None
        
    try:
        with open(suggestions_json, 'r', encoding='utf-8') as f:
            suggestions = json.load(f)
    except Exception as e:
        print(f"[ERROR] Could not parse AI suggestions: {e}")
        return None
        
    if isinstance(suggestions, dict):
        if "errors" in suggestions:
            suggestions = suggestions["errors"]
        elif "suggestions" in suggestions:
            suggestions = suggestions["suggestions"]
        else:
            suggestions = [suggestions]
            
    if not suggestions or not isinstance(suggestions, list):
        print("[WARNING] No suggestions found to apply.")
        return raw_edi_file
        
    # Read the raw EDI file
    try:
        with open(raw_edi_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"[ERROR] Failed to read raw EDI file: {e}")
        return None
        
    out_content = content
    # Some basic EDI heuristic
    element_separator = out_content[3] if len(out_content) > 3 else '*'
    segment_terminator = out_content[105] if len(out_content) > 105 else '~'
    
    segments = out_content.split(segment_terminator)
    
    # Iterate through AI suggestions
    for fix in suggestions:
        target_id = fix.get("target_segment_id", "")
        element_idx = fix.get("element_index")
        suggested_val = fix.get("suggested_value", "")
        
        if len(target_id) > 3 and target_id[3:].isdigit():
            element_idx = int(target_id[3:])
            
        # LLMs often accidentally output SV203 instead of SV2
        target_id = target_id[:3].strip() if target_id else ""
        
        if not target_id or element_idx is None or suggested_val == "":
            continue
            
        print(f"[PATCH] AI suggesting to fix element {element_idx} in `{target_id}` segment with '{suggested_val}'.")
        
        for i, seg in enumerate(segments):
            seg_trimmed = seg.strip()
            if seg_trimmed.startswith(f"{target_id}{element_separator}"):
                print(f"  > Found target {target_id}. Applying surgical patch...")
                
                # Explode the segment by its asterisk separator
                parts = seg.split(element_separator)
                
                # If the AI targets an index that doesn't exist yet, extend the bounds gracefully
                element_idx = int(element_idx)
                while len(parts) <= element_idx:
                    parts.append("")
                    
                # Overwrite precisely the target data element
                parts[element_idx] = str(suggested_val)
                
                # Reassemble the segment
                segments[i] = element_separator.join(parts)
                break
                
    # Reassemble file
    out_content = segment_terminator.join(segments)
    
    # Save Patched File
    filename, ext = os.path.splitext(os.path.basename(raw_edi_file))
    patched_filename = f"{filename}_fixed{ext}"
    patched_path = os.path.join(os.path.dirname(raw_edi_file), patched_filename)
    
    with open(patched_path, 'w', encoding='utf-8') as f:
        f.write(out_content)
        
    print(f"\n[SUCCESS] Patched file saved to {patched_path}")
    
    # Immediately Re-Validate for safety!
    print("--- Running Safety Re-Validation ---")
    val_payload = validate_hipaa_structure(patched_path)
    
    if val_payload and val_payload.get("is_valid"):
        print("\n[OK] Auto-Fix SUCCESS! The new patched document is perfectly compliant.")
    else:
        print("\n[WARNING] Auto-Fix applied but the document still contains errors.")
        
    return patched_path

