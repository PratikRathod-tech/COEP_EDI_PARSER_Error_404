import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

import sys
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        if "flash" in m.name and "preview" not in m.name:
            print("FOUND_FLASH:", m.name)
        elif "pro" in m.name and "preview" not in m.name and "vision" not in m.name:
            print("FOUND_PRO:", m.name)
