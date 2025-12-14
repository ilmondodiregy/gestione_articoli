import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, StockMovement } from '../types';
import { queryWarehouse } from '../services/geminiService';
import { Send, Bot, User, Sparkles, Loader2, MessageSquare } from 'lucide-react';

interface AiAssistantProps {
  items: InventoryItem[];
  movements: StockMovement[];
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ items, movements }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
      { role: 'ai', text: 'Ciao! Sono il tuo assistente di magazzino. Chiedimi qualsiasi cosa sui prodotti, giacenze o movimenti.', timestamp: Date.now() }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', text: query, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsTyping(true);

    // Call API
    const answer = await queryWarehouse(items, movements, userMsg.text);
    
    const aiMsg: Message = { role: 'ai', text: answer, timestamp: Date.now() };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const suggestions = [
      "Qual è il prodotto più costoso?",
      "Valore totale elettronica?",
      "Cosa ho scaricato questa settimana?",
      "Articoli sotto scorta?"
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col h-[500px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
          </div>
          <div>
              <h3 className="font-bold text-slate-800">Warehouse AI Assistant</h3>
              <p className="text-xs text-slate-500">Chiedi informazioni sui tuoi dati</p>
          </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {msg.role === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                    msg.role === 'ai' 
                    ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none' 
                    : 'bg-indigo-600 text-white rounded-tr-none'
                }`}>
                    {msg.text}
                </div>
            </div>
        ))}
        {isTyping && (
            <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span className="text-xs text-slate-400">Analizzo i dati...</span>
                </div>
            </div>
        )}
      </div>

      {/* Suggestions (only if few messages) */}
      {messages.length < 3 && !isTyping && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
              {suggestions.map(s => (
                  <button 
                    key={s} 
                    onClick={() => { setQuery(s); handleSend(); }}
                    className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                      {s}
                  </button>
              ))}
          </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white">
          <div className="relative flex items-center gap-2">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Fai una domanda..." 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button 
                type="submit" 
                disabled={!query.trim() || isTyping}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-indigo-200"
              >
                  <Send className="w-4 h-4" />
              </button>
          </div>
      </form>
    </div>
  );
};