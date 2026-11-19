
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ArrowRight,
  Droplets,
  Lightbulb,
  Hammer,
  ShieldCheck,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AI_LABOUR_SUGGESTIONS = [
  { icon: <Droplets size={20} />, text: "How to fix a leaky tap?" },
  { icon: <Lightbulb size={20} />, text: "Changing a light bulb safely" },
  { icon: <Hammer size={20} />, text: "Fixing a squeaky door hinge" },
  { icon: <ShieldCheck size={20} />, text: "Basic electrical safety tips" }
];

const AILabour: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hello! I'm your AI Household Assistant. I can guide you through simple home repairs and tasks like fixing taps, changing bulbs, or basic maintenance. What can I help you with today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `You are an expert Household Repair Assistant. 
          Your goal is to provide clear, step-by-step instructions for simple home maintenance tasks (plumbing, electrical, furniture assembly, etc.).
          Always start with a safety warning if the task involves electricity, heavy lifting, or tools.
          Keep instructions bite-sized and easy to follow. 
          Use markdown for bolding important parts and lists.
          If a task seems too dangerous for a non-professional, recommend booking a professional through the ChowkDirect app.
          Maintain a helpful, encouraging, and safety-conscious tone.`,
        },
      });

      const aiResponse = response.text || "I'm sorry, I couldn't process that request at the moment.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="px-6 py-8 bg-white border-b border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FF6A00] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Bot size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">AI Labour Expert</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Smart Guidance for Home Tasks</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-orange-50 text-[#FF6A00]'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`px-5 py-3 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-none' 
                    : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                }`}>
                  <div className="prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="flex gap-1 bg-white border border-slate-100 px-4 py-3 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100 space-y-4">
        {messages.length === 1 && !isLoading && (
          <div className="grid grid-cols-2 gap-2">
            {AI_LABOUR_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s.text)}
                className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-[#FF6A00] text-xs font-bold rounded-xl transition-all border border-slate-100 hover:border-orange-200 text-left"
              >
                {s.icon}
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        )}
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for guidance (e.g. how to fix tap)..."
              disabled={isLoading}
              className="w-full pl-6 pr-12 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/20 transition-all disabled:opacity-50"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
              <Sparkles size={18} />
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Send size={24} />
          </motion.button>
        </form>
        
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Info size={12} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Experimental AI Guidance • ChowkDirect Helper</span>
        </div>
      </div>
    </div>
  );
};

export default AILabour;
