import json
import urllib.request
import urllib.error
import sys
import os

def explain_validation_errors(json_path, model="llama3"):
    """
    Reads the validation JSON and calls a local Ollama LLM to explain the errors.
    Returns the full response string.
    """
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        msg = f"[AI Engine] Error reading JSON file: {e}"
        print(msg)
        return msg

    if data.get("is_valid"):
        return "The document is valid! No errors to explain."
        
    errors = data.get("errors", [])
    if not errors:
        return "No specific errors found in the payload."

    # Construct the Prompt
    prompt = (
        "You are an expert EDI (Electronic Data Interchange) and HIPAA integration analyst. "
        "A user has validated an EDI file, and the parser produced the following "
        "technical errors.\n\n"
        "Please explain each error in extremely simple, non-technical English so that a "
        "healthcare business user can completely understand what is missing or incorrect. "
        "For EACH error, you MUST also provide a 'Risk Indicator' (Low, Medium, High, or Critical) "
        "explaining the business or compliance risk if this error is not fixed (e.g., claim rejection, "
        "processing delay, legal compliance, etc.).\n\n"
        "Do not attempt to auto-fix the raw EDI string right now. Just provide the diagnosis and risk.\n\n"
        "ERRORS:\n"
    )
    for err in errors:
        # err is now a dict {"id": "...", "message": "...", "segment": "...", "severity": "..."}
        if isinstance(err, dict):
            prompt += f"- [{err.get('id', '??')}] in segment {err.get('segment', '??')}: {err.get('message', '??')}\n"
        else:
            prompt += f"- {err}\n"
        
    prompt += "\nPlease format your response nicely with bullet points."

    print(f"\n--- Waking up AI Engine (Ollama: {model}) ---")
    print(f"Sending {len(errors)} errors for explanation...\n")

    # Call Ollama local API
    url = "http://127.0.0.1:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers={'Content-Type': 'application/json'}
    )
    
    # Path for storing the explanation
    base_name = os.path.basename(json_path).replace(".json", "")
    explanation_path = os.path.join("data", "outputs", f"explanation_{base_name}.md")
    os.makedirs(os.path.dirname(explanation_path), exist_ok=True)
    
    full_response = ""
    try:
        # 30s timeout for streaming response
        with urllib.request.urlopen(req, timeout=30) as response:
            for line in response:
                if line:
                    decoded_line = line.decode('utf-8')
                    json_data = json.loads(decoded_line)
                    # Print word by word
                    if "response" in json_data:
                        word = json_data["response"]
                        print(word, end="", flush=True)
                        full_response += word
                    if json_data.get("done"):
                        break
        
        # Save to file
        with open(explanation_path, "w", encoding="utf-8") as f:
            f.write(f"# AI Diagnosis: {base_name}\n\n")
            f.write(full_response)
            
        print(f"\n\n--- AI Explanation Complete ---")
        return full_response
    except urllib.error.URLError as e:
        msg = f"\n[AI Engine Error] Connection error: {e}"
        print(msg)
        return "The AI engine is currently unavailable or taking too long. Please review the technical errors below."
    except Exception as e:
        msg = f"\n[AI Engine Error] Unexpected error: {e}"
        print(msg)
        return "An unexpected error occurred in the AI explanation engine."

def generate_autofix_json(json_path, model="llama3"):
    """
    Reads the validation JSON and calls Ollama to strictly generate an Auto-Fix JSON payload.
    Returns the list of suggestions.
    """
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"[AI Engine] Error reading JSON file: {e}")
        return []

    if data.get("is_valid") or not data.get("errors"):
        return []

    errors = data.get("errors", [])
    
    prompt = (
        "You are an expert EDI system auto-fixer. A file failed validation with the following errors. "
        "You MUST map each fix back to the provided 'id'.\n\n"
        "ERRORS:\n"
    )
    for err in errors:
        if isinstance(err, dict):
            prompt += f"- ID: {err.get('id', '??')} | Message: {err.get('message', '??')}\n"
        else:
            prompt += f"- {err}\n"
    
    prompt += (
        "\nYou MUST output ONLY a valid JSON array of objects representing surgical fixes for these errors. "
        "Do not include any intro, markdown formatting blocks, or explanation text. Just the raw JSON format:\n"
        "[\n"
        "  {\n"
        "    \"error_id\": \"The original error ID (e.g. e1, e2)\",\n"
        "    \"error_summary\": \"A VERY short, simple description of what is wrong (e.g., 'Member Name is missing' or 'NPI is invalid')\",\n"
        "    \"target_segment_id\": \"The exact 3-letter segment ID (e.g. SV2, CLM, NM1)\",\n"
        "    \"element_index\": 3,\n"
        "    \"suggested_value\": \"The corrected string or number\",\n"
        "    \"severity\": \"error\" or \"warning\"\n"
        "  }\n"
        "]\n"
        "Note: error_summary should be written in plain English for a business user."
    )

    print(f"\n--- Generating Auto-Fix Payload via {model} ---")
    
    url = "http://127.0.0.1:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        # 30s timeout for non-streaming response
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            ai_text = result.get("response", "[]")
            
            # Clean up potential markdown formatting
            if ai_text.startswith("```json"):
                ai_text = ai_text.replace("```json", "").replace("```", "").strip()
            
            try:
                ai_suggestions = json.loads(ai_text)
                
                # Ensure it's a list
                if not isinstance(ai_suggestions, list):
                    ai_suggestions = [ai_suggestions]
                
                # Save it
                import os
                out_path = os.path.join("data", "outputs", "ai_suggestions.json")
                os.makedirs(os.path.dirname(out_path), exist_ok=True)
                with open(out_path, "w", encoding="utf-8") as out:
                    json.dump(ai_suggestions, out, indent=4)
                    
                print(f"[SUCCESS] AI Auto-Fix suggestions generated.")
                return ai_suggestions
            except json.JSONDecodeError:
                print("[ERROR] AI did not return valid JSON.")
                return []
                
    except urllib.error.URLError as e:
        print(f"[AI Engine Error] Local Ollama API failure or timeout: {e}")
        return []
    except Exception as e:
        print(f"[AI Engine Error] Unexpected failure: {e}")
        return []
