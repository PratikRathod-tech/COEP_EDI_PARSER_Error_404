import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class EDIChatbot:
    def __init__(self, model="gemini-2.5-flash"):
        self.model_name = model
        
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("\n[Error] GEMINI_API_KEY environment variable is missing.")
            print("Please set it in a .env file or directly in your environment.")
            sys.exit(1)
            
        genai.configure(api_key=api_key)
        
        self.system_prompt = (
            "You are an expert EDI (Electronic Data Interchange) and HIPAA healthcare integration consultant. "
            "You have deep knowledge of X12 standards, including 837 (Claims), 835 (Remittances), 834 (Enrollment), "
            "270/271 (Eligibility), and 824 (Application Advice). "
            "Answer the user's questions clearly and accurately. If they ask about specific segments or elements, "
            "explain their purpose and common usage in the industry."
        )
        
        # Initialize Gemini Model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=self.system_prompt
        )
        
        # Built-in chat session for history tracking
        self.chat = self.model.start_chat(history=[])

    def ask(self, user_input):
        try:
            response = self.chat.send_message(user_input, stream=True)
            assistant_response = ""
            for chunk in response:
                print(chunk.text, end="", flush=True)
                assistant_response += chunk.text
            return assistant_response
        except Exception as e:
            print(f"\n[Error] Could not connect to Gemini API: {e}")
            return None

def start_chat_session(model="gemini-2.5-flash"):
    try:
        bot = EDIChatbot(model=model)
    except SystemExit:
        return
        
    print(f"\n=== EDI Expert Chatbot (Model: {model}) ===")
    print("Type 'exit' or 'quit' to end the session.\n")
    
    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ['exit', 'quit']:
                print("Goodbye!")
                break
            
            print("AI: ", end="", flush=True)
            bot.ask(user_input)
            print("\n")
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"\n[Unexpected Error] {e}")
            break

if __name__ == "__main__":
    start_chat_session()
