import React, { useState } from "react";

// Define a type for our messages
interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chatbot: React.FC = () => {
  // Use the Message type for our state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const newHistory = [...messages, userMessage];

    setMessages(newHistory); // Show user's message immediately
    setInput("");
    setIsLoading(true);

    try {
      // Send the *entire* history to the backend
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }), // Send the full array
      });

      const data = await response.json();

      if (data.reply) {
        const botMessage: Message = { role: "assistant", content: data.reply };
        // Add the bot's reply to the history
        setMessages((prev) => [...prev, botMessage]);
      } else {
        console.error("Error from chatbot:", data.error);
        const errorMessage: Message = {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again later.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error("Error communicating with the chatbot:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again later.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  return (
    <div className="chatbot">
      <div className="messages">
        {/* We add a welcome message that isn't part of the state */}
        <div className="bot-message">
          Hi! I'm AutoMate your dedicated financial advisor. Give me your finances and I'll help you find the right car.
        </div>
        
        {messages.map((msg, index) => (
          <div key={index} className={msg.role === "user" ? "user-message" : "bot-message"}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="bot-message typing-indicator">AutoMate is typing...</div>}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()} // Send on Enter
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} disabled={isLoading}>Send</button>
      </div>
    </div>
  );
};

export default Chatbot;