import json
import sys
import os
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def get_gemini_model(model_name="gemini-2.5-flash", system_instruction=None):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing.")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system_instruction
    )

def explain_validation_errors(json_path, model="gemini-2.5-flash"):
    """
    Reads the validation JSON and calls Gemini API to explain the errors.
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

    prompt = (
        "You are an expert EDI (Electronic Data Interchange) and HIPAA integration analyst. "
        "A user has validated an EDI file, and the parser produced the following technical errors.\n\n"
        "You MUST explain each error and its business risk in EXACTLY ONE brief, punchy sentence. "
        "Do not write paragraphs or lengthy breakdowns. Format each explanation as a single, easily scannable bullet point.\n\n"
        "ERRORS:\n"
    )
    for err in errors:
        if isinstance(err, dict):
            prompt += f"- [{err.get('id', '??')}] in segment {err.get('segment', '??')}: {err.get('message', '??')}\n"
        else:
            prompt += f"- {err}\n"
        
    prompt += "\nPlease format your response nicely with bullet points."

    print(f"\n--- Waking up AI Engine (Gemini: {model}) ---")
    print(f"Sending {len(errors)} errors for explanation...\n")

    base_name = os.path.basename(json_path).replace(".json", "")
    explanation_path = os.path.join("data", "outputs", f"explanation_{base_name}.md")
    os.makedirs(os.path.dirname(explanation_path), exist_ok=True)
    
    try:
        model_instance = get_gemini_model(model_name=model)
        response = model_instance.generate_content(prompt)
        msg = response.text.strip()
        
        # Save to output file
        with open(explanation_path, "w", encoding="utf-8") as f:
            f.write(f"# EDI AI Diagnosis: {base_name}\n\n")
            f.write(msg)
            
        print(f"[SUCCESS] AI Diagnosis complete and saved to {explanation_path}")
        return msg
    except Exception as e:
        print(f"[ERROR] Gemini Engine Failure: {e}")
        return "I encountered an error trying to interpret these validation failures. Please review the technical error table."

async def query_edi_bot(question: str):
    """
    General EDI Expert query using Gemini.
    """
    try:
        model_instance = get_gemini_model(model_name="gemini-2.5-flash")
        prompt = (
            "You are an expert EDI (Electronic Data Interchange) and HIPAA integration analyst assistant. "
            "The user will ask you a question regarding EDI segments, transaction types (834, 835, 837, 824), "
            "X12 standards, or HIPAA compliance errors. "
            "Provide a clear, professional, and slightly developer-friendly answer.\n\n"
            f"QUESTION: {question}"
        )
        
        # Using asyncio.to_thread for safety if generate_content blocks
        response = await asyncio.to_thread(model_instance.generate_content, prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[ERROR] Chatbot Query Failed: {e}")
        return f"I'm sorry, I couldn't process your request: {str(e)}"


def generate_autofix_json(json_path, model="gemini-2.5-flash"):
    """
    Reads the validation JSON and calls Gemini to strictly generate an Auto-Fix JSON payload.
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
    
    system_instruction = (
        "You MUST output ONLY a valid JSON array of objects representing surgical fixes for these errors. "
        "Do not include any string, markdown formatting blocks like ```json, or explanation text. Just the raw JSON format:\n"
        "[\n"
        "  {\n"
        "    \"error_id\": \"The original error ID (e.g. e1, e2)\",\n"
        "    \"error_summary\": \"A VERY short, simple description of what is wrong\",\n"
        "    \"target_segment_id\": \"The exact 3-letter segment ID (e.g. SV2, CLM, NM1)\",\n"
        "    \"element_index\": 3,\n"
        "    \"suggested_value\": \"The corrected string or number\",\n"
        "    \"severity\": \"error\" or \"warning\"\n"
        "  }\n"
        "]"
    )

    print(f"\n--- Generating Auto-Fix Payload via Gemini ({model}) ---")
    
    try:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("API Key missing.")
            
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_instruction
        )
        
        # Enforce JSON output format directly through Gemini configuration
        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        ai_text = response.text.strip()
        
        try:
            ai_suggestions = json.loads(ai_text)
            
            if not isinstance(ai_suggestions, list):
                if "suggestions" in ai_suggestions:
                     ai_suggestions = ai_suggestions["suggestions"]
                else:
                     ai_suggestions = [ai_suggestions]
            
            # Save it
            out_path = os.path.join("data", "outputs", "ai_suggestions.json")
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as out:
                json.dump(ai_suggestions, out, indent=4)
                
            print(f"[SUCCESS] AI Auto-Fix suggestions generated.")
            return ai_suggestions
        except json.JSONDecodeError:
            print("[ERROR] AI did not return valid JSON. Output was:", ai_text)
            return []
            
    except Exception as e:
        print(f"[AI Engine Error] Unexpected failure with Gemini API: {e}")
        return []
