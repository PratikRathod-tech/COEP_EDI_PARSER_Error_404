import argparse
import sys
import os

from src.validators.edi_validator import validate_hipaa_structure
from src.parsers.edi_parser import parse_generic_edi_to_json
from src.translators.business_translator import generate_business_json
from src.ai.llm_explainer import explain_validation_errors, generate_autofix_json
from src.ai.auto_fixer import apply_auto_fixes
from src.ai.chatbot import start_chat_session
from src.analytics.summarizer import generate_summary
from src.database.firebase_client import sync_file_to_firebase

def ensure_output_dir():
    out_dir = os.path.join("data", "outputs")
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)

def main():
    parser = argparse.ArgumentParser(description="Central CLI for EDI tools.")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Validator command
    parser_val = subparsers.add_parser("validate", help="Validate an EDI file for structure and syntax")
    parser_val.add_argument("input_file", help="Path to the input EDI file")
    
    # Parser command
    parser_parse = subparsers.add_parser("parse", help="Parse an EDI file into structural JSON")
    parser_parse.add_argument("input_file", help="Path to the input EDI file")
    
    # Translator command
    parser_trans = subparsers.add_parser("translate", help="Translate an EDI file into Business JSON via pyx12 maps")
    parser_trans.add_argument("input_file", help="Path to the input EDI file")

    # Explainer command
    parser_explain = subparsers.add_parser("explain", help="Explain validation JSON errors using Gemini")
    parser_explain.add_argument("json_file", help="Path to the validation JSON file")
    parser_explain.add_argument("--model", default="gemini-2.5-flash", help="Gemini model to use (default: gemini-2.5-flash)")

    # Autofix command
    parser_autofix = subparsers.add_parser("autofix", help="Auto-fix EDI structure errors using LLM")
    parser_autofix.add_argument("input_file", help="Path to the input EDI file to fix")
    parser_autofix.add_argument("--model", default="gemini-2.5-flash", help="Gemini model to use")

    # Summary command
    parser_sum = subparsers.add_parser("summary", help="Generate an analytics summary table from Business JSON")
    parser_sum.add_argument("json_file", help="Path to the Business JSON file")

    # Chat command
    parser_chat = subparsers.add_parser("chat", help="Start an interactive EDI expert chatbot session")
    parser_chat.add_argument("--model", default="gemini-2.5-flash", help="Gemini model to use")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    ensure_output_dir()
    
    input_arg = getattr(args, 'input_file', None) or getattr(args, 'json_file', None)
    if input_arg and not os.path.exists(input_arg):
        print(f"Error: Input file not found: {input_arg}")
        sys.exit(1)
        
    if input_arg:
        filename = os.path.basename(input_arg)

    if args.command == "validate":
        out_path = os.path.join("data", "outputs", f"validation_{filename}.json")
        payload = validate_hipaa_structure(input_arg, out_path)
        sync_file_to_firebase(filename, "validation_report", payload)
    
    elif args.command == "parse":
        out_path = os.path.join("data", "outputs", f"parsed_{filename}.json")
        payload = parse_generic_edi_to_json(input_arg, out_path)
        print(f"Parsed output saved to {out_path}")
        sync_file_to_firebase(filename, "parsed_json", payload)
        
    elif args.command == "translate":
        payload = generate_business_json(input_arg)
        sync_file_to_firebase(filename, "business_json", payload)
        
    elif args.command == "explain":
        # Pass callback to explain_validation_errors if we want to sync the final text
        # For now, we'll sync the stored markdown file after it's produced
        explain_validation_errors(input_arg, model=args.model)
        explanation_path = os.path.join("data", "outputs", f"explanation_{filename.replace('.json','')}.md")
        sync_file_to_firebase(filename, "llm_explanation", explanation_path)
        
    elif args.command == "autofix":
        out_path = os.path.join("data", "outputs", f"validation_{filename}.json")
        val_payload = validate_hipaa_structure(input_arg, out_path)
        
        if val_payload and not val_payload.get("is_valid"):
            print("\nErrors detected! Passing output to LLM to generate fix payloads...")
            suggestions_json_path = generate_autofix_json(out_path, model=args.model)
            if suggestions_json_path:
                apply_auto_fixes(input_arg, suggestions_json_path)
            else:
                print("[ERROR] LLM failed to output a parseable fix.")
        else:
            print("[INFO] Document is already valid! Nothing to fix.")

    elif args.command == "summary":
        summary_result = generate_summary(input_arg)
        print(f"\n--- {summary_result['type']} Analytics Summary ---")
        if not summary_result["data"]:
            print("No matching loops found to summarize.")
        else:
            # Print as simple flat table
            import pandas as pd
            df = pd.DataFrame(summary_result["data"])
            print(df.to_string(index=False))
            
            # Save CSV
            out_csv = os.path.join("data", "outputs", f"summary_{filename}.csv")
            df.to_csv(out_csv, index=False)
            print(f"\nSummary saved to {out_csv}")

    elif args.command == "chat":
        start_chat_session(model=args.model)

if __name__ == "__main__":
    main()
