import os
import sys
import builtins
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

import json
import argparse
import xml.etree.ElementTree as ET
from io import StringIO
import warnings

# Suppress pyx12 warnings
warnings.filterwarnings("ignore", category=UserWarning)

try:
    import pyx12.params
    import pyx12.x12n_document
except ImportError:
    print("Error: pyx12 is not installed.")
    sys.exit(1)

PYX12_MAP_DIR = r"C:\Users\nsgud\AppData\Local\Programs\Python\Python311\Lib\site-packages\pyx12\map"

def get_mapping_path_tree(map_file_name):
    """Loads a pyx12 XML map into a dictionary of paths to names."""
    
    # Load Generic Data Elements from dataele.xml
    data_ele_path = os.path.join(PYX12_MAP_DIR, 'dataele.xml')
    gen_eles = {}
    if os.path.exists(data_ele_path):
        try:
            detree = ET.parse(data_ele_path)
            for de in detree.iter('data_ele'):
                num = de.attrib.get('ele_num')
                name = de.attrib.get('name')
                if num and name: gen_eles[num] = name
        except: pass

    map_path = os.path.join(PYX12_MAP_DIR, map_file_name)
    if not os.path.exists(map_path):
        return {}, {}

    try:
        tree = ET.parse(map_path)
        root = tree.getroot()
    except:
        return {}, {}

    path_names = {}
    global_names = {} # Fallback: ID -> Name

    def walk_map(node, current_path=""):
        xid = node.attrib.get('xid')
        name_node = node.find('name')
        name = name_node.text if name_node is not None else ""
        
        # If name is empty for an element, try ele_num
        if not name and node.tag == 'element':
            enum = node.attrib.get('ele_num')
            name = gen_eles.get(enum, "")

        if xid:
            # Add to global fallback
            if xid not in global_names or (not global_names[xid] and name):
                global_names[xid] = name
                
            new_path = f"{current_path}/{xid}" if current_path else xid
            path_names[new_path] = name
            
            for child in node:
                if child.tag in ['loop', 'segment', 'element']:
                    walk_map(child, new_path)
        else:
            for child in node:
                walk_map(child, current_path)

    # Start walking from within the transaction tag to avoid '837/' prefix issues
    # If the root is 'transaction', we treat its children as start points
    if root.tag == 'transaction':
        for child in root:
            if child.tag in ['loop', 'segment', 'element']:
                walk_map(child, "")
    else:
        walk_map(root, "")
        
    return path_names, global_names

def decorate_xml_to_dict(node, path_names, global_names, current_path=""):
    """Recursively converts x12simple XML to a descriptive Python dict."""
    tag = node.tag
    node_id = node.attrib.get('id', '')
    
    # Determine the path for this node
    new_path = f"{current_path}/{node_id}" if (current_path and node_id) else (node_id if node_id else current_path)
    
    # Name Resolution Priority:
    # 1. Full path match
    # 2. Global ID match (fallback for items moved or root-level items)
    # 3. Envelope hardcoded fallback
    
    node_name = path_names.get(new_path, "")
    if not node_name:
        node_name = global_names.get(node_id, "")
        
    if not node_name:
        envelopes = {
            "ISA": "Interchange Control Header",
            "GS": "Functional Group Header",
            "ST": "Transaction Set Header",
            "SE": "Transaction Set Trailer",
            "GE": "Functional Group Trailer",
            "IEA": "Interchange Control Trailer",
            "ISA_LOOP": "Interchange Control Header Loop",
            "GS_LOOP": "Functional Group Header Loop",
            "ST_LOOP": "Transaction Set Header Loop"
        }
        node_name = envelopes.get(node_id, "")

    # Final Key Formatting
    if node_id and node_name:
        display_key = f"{node_name} ({node_id})"
    elif node_id:
        display_key = node_id
    else:
        display_key = tag

    # Leaf Node Detection (Simple elements or sub-elements)
    if tag in ['ele', 'subele'] or len(node) == 0:
        return {display_key: node.text if node.text is not None else ""}

    children_data = []
    for child in node:
        # Recursively build children
        child_res = decorate_xml_to_dict(child, path_names, global_names, new_path)
        children_data.append(child_res)

    if tag == 'seg':
        seg_content = {}
        for c in children_data:
            if isinstance(c, dict):
                seg_content.update(c)
        return {display_key: seg_content}
    
    # Loops/Groups return an array of their contents
    return {display_key: children_data}

def generate_business_json(input_file, out_json=None):
    print(f"--- Generating Business JSON for {input_file} ---")
    
    # -------------------------------------------------------------
    # ROUTER STRATEGY: Detect 837I / 837D early before pyx12 crashes
    # -------------------------------------------------------------
    # try:
    #     with open(input_file, 'r', encoding='utf-8') as f:
    #         content = f.read().strip()
    #         if len(content) > 105:
    #             element_separator = content[3]
    #             segment_terminator = content[105]
    #             segments_raw = content.split(segment_terminator)
    #             
    #             # we need to add the parent path to sys.path so we can import smoothly if run directly
    #             import sys
    #             import os
    #             sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
    #             
    #             from src.parsers.edi_parser import extract_transaction_type
    #             ttype = extract_transaction_type(segments_raw, element_separator)
    #             
    #             if ttype in ['837I', '837D']:
    #                 print(f"[ROUTER] Detected {ttype}. Bypassing pyx12 and routing to Custom Mapper.")
    #                 from src.translators.custom_837_mapper import process_custom_837
    #                 return process_custom_837(input_file, out_json=out_json)
    # except Exception as e:
    #     print(f"[ROUTER DEBUG] Error checking transaction type early: {e}")
    #     pass
    # -------------------------------------------------------------

    param = pyx12.params.params()
    xml_out = StringIO()
    try:
        # Run pyx12 structural extraction
        pyx12.x12n_document.x12n_document(param=param, src_file=input_file, fd_997=None, fd_html=None, fd_xmldoc=xml_out)
    except Exception as e:
        print(f"[DEBUG] pyx12 error: {e}")
        
    xml_content = xml_out.getvalue()
    if not xml_content:
        print("[ERROR] Internal error: Could not generate structural map for file.")
        return None

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError:
        print("[ERROR] Internal error: Structural XML was malformed.")
        return None
    
    # Identify Transaction Type for mapping
    st01 = root.find(".//seg[@id='ST']/ele[@id='ST01']")
    st_type = st01.text if st01 is not None else "Unknown"
    
    st03 = root.find(".//seg[@id='ST']/ele[@id='ST03']")
    gs08 = root.find(".//seg[@id='GS']/ele[@id='GS08']")
    version = ""
    if st03 is not None and st03.text:
        version = st03.text
    elif gs08 is not None and gs08.text:
        version = gs08.text
    
    map_file = ""
    if st_type == '837':
        if 'X222' in version: map_file = "837.5010.X222.A1.xml" 
        elif 'X223' in version: map_file = "837Q3.I.5010.X223.A1.xml" 
        else: map_file = "837.5010.X222.A1.xml" 
    elif st_type == '834':
        map_file = "834.5010.X220.A1.xml"
    elif st_type == '835':
        map_file = "835.5010.X221.A1.xml"
    
    if not map_file:
        print(f"[WARNING] No specific HIPAA ruleset detected for {st_type}. Using generic fallback.")
    
    # Load Path and Global mappings
    path_names, global_names = get_mapping_path_tree(map_file)
    
    # Translation
    final_dict = decorate_xml_to_dict(root, path_names, global_names)
    
    # Save output
    os.makedirs(os.path.join("data", "outputs"), exist_ok=True)
    if not out_json:
        out_json_filename = f"business_{os.path.splitext(os.path.basename(input_file))[0]}.json"
        out_json = os.path.join("data", "outputs", out_json_filename)
        
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(final_dict, f, indent=4)
        
    print(f"\n[SUCCESS] Document fully translated with business meanings: {out_json}")
    return final_dict

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert EDI to descriptive Human-Readable Business JSON.")
    parser.add_argument("input_file", help="Path to the input EDI file")
    args = parser.parse_args()
    
    generate_business_json(args.input_file)
