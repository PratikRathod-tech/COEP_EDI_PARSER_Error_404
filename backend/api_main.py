from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import shutil
import uuid
import asyncio

# Import core logic
from src.parsers.edi_parser import parse_generic_edi_to_json
from src.validators.edi_validator import validate_hipaa_structure
from src.analytics.summarizer import generate_summary_from_dict
from src.ai.llm_explainer import explain_validation_errors, generate_autofix_json
from src.translators.business_translator import generate_business_json
from src.analytics.reconciliation import reconcile_837_835
from src.analytics.enrollment import extract_834_enrollment
from src.analytics.delta import compare_834_files

app = FastAPI(title="EDI Processor API", description="API for parsing, validating, and explaining EDI files.")

# A simple in-memory cache to maintain translated business documents across specific page views
_SESSION_CACHE = {}

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "data/temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def save_temp_file(upload_file: UploadFile):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(upload_file.filename)[1] or ".txt"
    temp_path = os.path.join(TEMP_DIR, f"{file_id}{ext}")
    
    # Read binary content
    raw_content = upload_file.file.read()
    
    # Attempt to decode and normalize to UTF-8
    try:
        # Try UTF-8 with BOM support first
        decoded_content = raw_content.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            # Fallback to UTF-16
            decoded_content = raw_content.decode('utf-16')
        except UnicodeDecodeError:
            # Final fallback
            decoded_content = raw_content.decode('latin-1')
            
    # Aggressively strip and find the first occurrence of ISA
    sanitized_content = decoded_content.strip()
    isa_index = sanitized_content.find("ISA")
    if isa_index != -1:
        sanitized_content = sanitized_content[isa_index:]
    
    # Save explicitly as UTF-8 string
    with open(temp_path, "w", encoding="utf-8") as f:
        f.write(sanitized_content)
        
    return temp_path

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/enrollment/{file_id}")
async def get_enrollment(file_id: str):
    # Try multiple keys for robust lookup
    data = _SESSION_CACHE.get(f"enroll_{file_id}")
    if not data:
        data = _SESSION_CACHE.get(file_id)
        
    if not data:
        raise HTTPException(status_code=404, detail="Enrollment data not found. Please upload file again.")
    
    # Ensure it's a list for the frontend
    if not isinstance(data, list):
        # If we got the business dict instead of the enrollment list, try a last-resort recovery
        # (Though process_all should have handled this)
        return []
        
    return data

@app.get("/reconciliation/{file_id}")
async def get_reconciliation(file_id: str):
    data = _SESSION_CACHE.get(f"recon_{file_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Reconciliation data not found.")
    return data

@app.post("/reconcile")
async def reconcile_files(file_837: UploadFile = File(...), file_835: UploadFile = File(...)):
    try:
        # Save both files
        path_837 = save_temp_file(file_837)
        path_835 = save_temp_file(file_835)
        
        # Run reconciliation
        results = reconcile_837_835(path_837, path_835)
        
        # Cache results under a combined ID or just return
        file_id = str(uuid.uuid4())
        _SESSION_CACHE[f"recon_{file_id}"] = results
        
        return {
            "fileId": file_id,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/eligibility-check")
async def eligibility_check(file_834: UploadFile = File(...), file_837: UploadFile = File(...)):
    try:
        path_834 = save_temp_file(file_834)
        path_837 = save_temp_file(file_837)
        
        from src.analytics.eligibility import perform_eligibility_check
        results = await asyncio.to_thread(perform_eligibility_check, path_834, path_837)
        
        # Cleanup temp files
        if os.path.exists(path_834): os.remove(path_834)
        if os.path.exists(path_837): os.remove(path_837)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/enrollment-delta")
async def enrollment_delta(file_base: UploadFile = File(...), file_new: UploadFile = File(...)):
    try:
        path_base = save_temp_file(file_base)
        path_new = save_temp_file(file_new)
        
        results = compare_834_files(path_base, path_new)
        
        file_id = str(uuid.uuid4())
        _SESSION_CACHE[f"delta_{file_id}"] = results
        
        return {
            "fileId": file_id,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/apply-fixes")
async def apply_fixes(file_id: str, suggestions: list = Body(...)):
    """
    Applies AI suggestions to the raw EDI file in a surgical manner.
    """
    try:
        # 1. Look up file path in cache or from the session id
        # For now, let's assume the Dashboard passes the original filename
        data = _SESSION_CACHE.get(file_id)
        if not data:
            raise HTTPException(status_code=404, detail="Session data not found.")
            
        file_path = data.get("metadata", {}).get("file_path")
        if not file_path or not os.path.exists(file_path):
             # Fallback: check if it's the filename itself
             file_path = os.path.join("data", "temp", file_id)
             if not os.path.exists(file_path):
                 raise HTTPException(status_code=404, detail="Original EDI file not found.")

        with open(file_path, 'r', encoding='utf-8') as f:
            raw_content = f.read()

        # 2. Detect separators from ISA
        # ISA is always 106 chars: ISA*00*...*00*...*ZZ*...*ZZ*...*YYMMDD*HHMM*^*00501*000000001*0*T*:~
        # Element sep = f[3]
        # Component sep = f[104]
        # Segment term = f[105]
        if not raw_content.startswith("ISA"):
             # Simple stripping for BOM or whitespace
             raw_content = raw_content[raw_content.find("ISA"):]
        
        ele_sep = raw_content[3]
        seg_term = raw_content[105]
        
        segments = raw_content.split(seg_term)
        corrected_segments = list(segments)
        
        for fix in suggestions:
            target_seg_id = fix.get("target_segment_id")
            element_idx = fix.get("element_index") # 1-indexed usually
            new_val = fix.get("suggested_value")
            
            if not target_seg_id or element_idx is None:
                continue
                
            # Basic surgical replacement (First match for now, or match by context if possible)
            for i, seg in enumerate(corrected_segments):
                if seg.startswith(target_seg_id + ele_sep):
                    fields = seg.split(ele_sep)
                    if len(fields) > element_idx:
                        fields[element_idx] = str(new_val)
                        corrected_segments[i] = ele_sep.join(fields)
                        break 
        
        corrected_edi = seg_term.join(corrected_segments)
        
        # Store corrected version in cache for Compare page
        _SESSION_CACHE[f"corrected_{file_id}"] = corrected_edi
        
        return {
            "corrected_edi": corrected_edi,
            "message": "Fixes applied successfully."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse")
async def parse_edi(file: UploadFile = File(...)):
    temp_path = save_temp_file(file)
    try:
        out_json = temp_path + ".json"
        result = await asyncio.to_thread(parse_generic_edi_to_json, temp_path, out_json)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to parse EDI file.")
        return result
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

@app.post("/validate")
async def validate_edi(file: UploadFile = File(...)):
    temp_path = save_temp_file(file)
    try:
        out_json = temp_path + ".val.json"
        result = await asyncio.to_thread(validate_hipaa_structure, temp_path, out_json)
        return result
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

@app.post("/summarize")
async def summarize_json(data: dict):
    try:
        result = generate_summary_from_dict(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary failed: {str(e)}")

@app.post("/analyze-ai")
async def analyze_ai(data: dict):
    """
    Endpoint for heavy AI lifting. Only called when user requests it.
    """
    temp_json = os.path.join(TEMP_DIR, f"val_{uuid.uuid4()}.json")
    try:
        with open(temp_json, 'w', encoding='utf-8') as f:
            json.dump(data, f)
        
        # Run AI tasks
        explanation = await asyncio.to_thread(explain_validation_errors, temp_json)
        suggestions = await asyncio.to_thread(generate_autofix_json, temp_json)
        
        return {
            "ai_explanation": explanation,
            "ai_suggestions": suggestions
        }
    finally:
        if os.path.exists(temp_json): os.remove(temp_json)

@app.post("/chatbot-query")
async def chatbot_query(payload: dict = Body(...)):
    """
    General EDI Chatbot Query using Gemini.
    """
    question = payload.get("question", "")
    if not question:
        return {"answer": "I didn't receive a question. How can I help you with EDI today?"}
        
    from src.ai.llm_explainer import query_edi_bot
    answer = await query_edi_bot(question)
    return {"answer": answer}

@app.get("/payment-835/{file_id}")
async def get_payment_835(file_id: str):
    data = _SESSION_CACHE.get(f"pay835_{file_id}")
    if not data:
        data = _SESSION_CACHE.get(file_id)
        
    if not data:
        raise HTTPException(status_code=404, detail="Payment data not found.")
    return data

@app.post("/process-all")
async def process_all(file: UploadFile = File(...)):
    """
    Refactored to be 'Fast'. Returns Parse + Validation + Summary.
    Does NOT include AI analysis.
    """
    temp_path = save_temp_file(file)
    try:
        # 1. Parse (Run in thread to avoid blocking)
        parse_json_path = temp_path + ".json"
        parsed_data = await asyncio.to_thread(parse_generic_edi_to_json, temp_path, parse_json_path)
        
        # 2. Validate
        val_json_path = temp_path + ".val.json"
        validation_data = await asyncio.to_thread(validate_hipaa_structure, temp_path, val_json_path)
        
        # 3. Summarize
        summary_data = {}
        if parsed_data:
            summary_data = generate_summary_from_dict(parsed_data)
            
        # 4. Generate Business JSON
        bus_json_path = temp_path + ".bus.json"
        business_data = await asyncio.to_thread(generate_business_json, temp_path, bus_json_path)
        
        # Specialized cache for special views
        meta = parsed_data.get('metadata', {})
        t_type = str(meta.get('transaction_type', 'Unknown'))
        
        enrollment_data = []
        payment_data = []
        
        if '834' in t_type:
            enrollment_data = extract_834_enrollment(parsed_data)
            _SESSION_CACHE[f"enroll_{file.filename}"] = enrollment_data
            _SESSION_CACHE[file.filename] = enrollment_data
        elif '835' in t_type:
            payment_data = summary_data.get("data", [])
            _SESSION_CACHE[f"pay835_{file.filename}"] = payment_data
            _SESSION_CACHE[file.filename] = payment_data
        else:
            _SESSION_CACHE[file.filename] = business_data
            
        return {
            "filename": file.filename,
            "fileId": file.filename,
            "parsed_data": parsed_data,
            "business_data": business_data,
            "validation": validation_data,
            "summary": summary_data,
            "enrollment_data": enrollment_data,
            "payment_data": payment_data
        }
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)
        # Cleanup other temp files if they exist
        for ext in [".json", ".val.json", ".bus.json"]:
            p = temp_path + ext
            if os.path.exists(p): os.remove(p)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
