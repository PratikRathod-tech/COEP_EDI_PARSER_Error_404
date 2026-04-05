import os
import sys
import builtins
import json
import xml.etree.ElementTree as ET
from io import StringIO

# Patch open for pyx12
original_open = builtins.open
def custom_open(file, *args, **kwargs):
    if 'mode' in kwargs and isinstance(kwargs['mode'], str) and 'U' in kwargs['mode']:
        kwargs['mode'] = kwargs['mode'].replace('U', '')
        if not kwargs['mode']: kwargs['mode'] = 'r'
    return original_open(file, *args, **kwargs)
builtins.open = custom_open

import pyx12.params
import pyx12.x12n_document

def debug_pyx12_xml(input_file):
    param = pyx12.params.params()
    xml_out = StringIO()
    pyx12.x12n_document.x12n_document(param=param, src_file=input_file, fd_997=None, fd_html=None, fd_xmldoc=xml_out)
    xml_content = xml_out.getvalue()
    
    # Print the part of XML matching HI segments
    root = ET.fromstring(xml_content)
    hi_segments = root.findall(".//seg[@id='HI']")
    for hi in hi_segments:
        print(ET.tostring(hi, encoding='unicode'))

if __name__ == "__main__":
    debug_pyx12_xml('c:/Users/nsgud/OneDrive/Pictures/837_edi/data/samples/reconstructed_837I.txt')
