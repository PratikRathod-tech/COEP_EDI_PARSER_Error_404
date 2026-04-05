import { useState, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

interface Message {
  role: "user" | "bot";
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  { role: "bot", text: "Hi! I can help explain EDI segments, errors, and compliance issues. Ask me anything." },
];

interface ChatbotProps {
  aiExplanation?: string;
}

const Chatbot = ({ aiExplanation }: ChatbotProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");

  // Effect to handle new explanations
  useEffect(() => {
    if (aiExplanation && aiExplanation !== "No issues found.") {
      setMessages(prev => [...prev, {
        role: "bot",
        text: `I've analyzed the validation errors: ${aiExplanation}`
      }]);
      setOpen(true); // Open chatbot to show explanation
    }
  }, [aiExplanation]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const { askChatbot } = await import("@/lib/api");
      const answer = await askChatbot(userMsg.text);
      setMessages((prev) => [...prev, { role: "bot", text: answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: "Connection to AI expert lost. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 max-h-[28rem] bg-card border border-border rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">EDI Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask about segments & errors</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm rounded-lg px-3 py-2 max-w-[90%] whitespace-pre-wrap ${msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted text-foreground"
                  }`}
              >
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="bg-muted text-foreground text-xs rounded-lg px-3 py-2 w-fit italic animate-pulse">
                AI is thinking...
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question…"
              className="flex-1 text-sm bg-background border border-input rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
