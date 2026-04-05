import json
import urllib.request
import urllib.error
import sys

class EDIChatbot:
    def __init__(self, model="llama3"):
        self.model = model
        self.url = "http://127.0.0.1:11434/api/generate"
        self.history = []
        self.system_prompt = (
            "You are an expert EDI (Electronic Data Interchange) and HIPAA healthcare integration consultant. "
            "You have deep knowledge of X12 standards, including 837 (Claims), 835 (Remittances), 834 (Enrollment), "
            "270/271 (Eligibility), and 824 (Application Advice). "
            "Answer the user's questions clearly and accurately. If they ask about specific segments or elements, "
            "explain their purpose and common usage in the industry."
        )

    def ask(self, user_input):
        # Construct the prompt with history
        full_prompt = f"System: {self.system_prompt}\n\n"
        for h in self.history:
            full_prompt += f"User: {h['user']}\nAssistant: {h['assistant']}\n"
        full_prompt += f"User: {user_input}\nAssistant:"

        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": True
        }

        req = urllib.request.Request(
            self.url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        assistant_response = ""
        try:
            with urllib.request.urlopen(req) as response:
                for line in response:
                    if line:
                        decoded_line = line.decode('utf-8')
                        json_data = json.loads(decoded_line)
                        if "response" in json_data:
                            word = json_data["response"]
                            print(word, end="", flush=True)
                            assistant_response += word
                        if json_data.get("done"):
                            break
            
            # Update history
            self.history.append({"user": user_input, "assistant": assistant_response})
            # Keep history short
            if len(self.history) > 10:
                self.history.pop(0)

        except urllib.error.URLError as e:
            print(f"\n[Error] Could not connect to Ollama: {e}")
            return None
        
        return assistant_response

def start_chat_session(model="llama3"):
    bot = EDIChatbot(model=model)
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
