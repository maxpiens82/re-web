import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, User, DatabaseBackup } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AiAssistant() {
  const { currentUser, userRole } = useAuth();
  
  // Try to grab the Google Profile First Name, fallback to System Name, then fallback to 'equipo'
  const firstName = currentUser?.displayName?.split(' ')[0] || currentUser?.reName || 'equipo';
  
  const [messages, setMessages] = useState([
    { role: 'ai', text: `¡Hola ${firstName}! Soy Igor. Tengo acceso en tiempo real a la base operativa activa. ¿En qué te ayudo?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepSearch, setIsDeepSearch] = useState(false); // Toggle state
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(import.meta.env.VITE_GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ai_assistant',
          payload: { 
            prompt: userMsg,
            history: messages,
            userName: currentUser?.reName || currentUser?.displayName,
            userRole: userRole,
            deepSearch: isDeepSearch // Pass the toggle state
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: `❌ Error: ${data.error}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: '❌ Error de conexión al comunicarse con Google.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatText = (text) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return { __html: formatted };
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-white md:rounded-3xl shadow-none md:shadow-2xl overflow-hidden md:h-[90vh]">
      {/* Header */}
      <div className="bg-[#2B6CB0] text-white p-4 md:px-6 md:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full shadow-inner">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-extrabold text-lg uppercase tracking-wider leading-none">Igor</h2>
            <p className="text-xs font-medium text-blue-100 mt-1">Conectado a la base operativa</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-5 bg-gray-50/50 pb-8">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[90%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              <div className={`shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-md ${msg.role === 'user' ? 'bg-white text-gray-400 border border-gray-200' : 'bg-[#2B6CB0] text-white'}`}>
                {msg.role === 'user' ? <User size={16} className="md:w-5 md:h-5" /> : <Bot size={18} className="md:w-5 md:h-5" />}
              </div>
              
              <div className={`p-3.5 md:p-5 rounded-2xl text-sm md:text-[15px] leading-relaxed shadow-sm border
                ${msg.role === 'user' 
                  ? 'bg-[#E53B12] text-white border-transparent rounded-tr-sm' 
                  : 'bg-white text-gray-700 border-gray-100 rounded-tl-sm'}`}
                dangerouslySetInnerHTML={formatText(msg.text)}
              />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[75%]">
              <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#2B6CB0] text-white flex items-center justify-center shadow-md">
                <Loader2 size={18} className="animate-spin" />
              </div>
              <div className="p-3.5 md:p-5 rounded-2xl bg-white border border-gray-100 rounded-tl-sm shadow-sm text-gray-400 text-sm flex items-center gap-2">
                Analizando base de datos <Loader2 size={12} className="animate-spin opacity-50" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-gray-100 shrink-0">
        
        {/* Deep Search Toggle */}
        <div className="flex items-center gap-2 mb-3 px-1 cursor-pointer w-fit select-none" onClick={() => setIsDeepSearch(!isDeepSearch)}>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${isDeepSearch ? 'bg-[#E53B12]' : 'bg-gray-300'}`}>
             <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${isDeepSearch ? 'left-5.5 right-0.5 translate-x-5' : 'left-0.5'}`}></div>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isDeepSearch ? 'text-[#E53B12]' : 'text-gray-400'}`}>
            <DatabaseBackup size={12}/> Búsqueda Profunda (Ledgers Históricos)
          </span>
        </div>

        <div className="flex items-end gap-2 bg-[#F4F4F5] p-2 rounded-2xl border border-transparent focus-within:border-[#2B6CB0] focus-within:bg-white transition-all shadow-inner">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDeepSearch ? "Buscando en TODO el historial..." : "Preguntale algo a la base operativa activa..."}
            className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] p-2 text-sm md:text-base text-gray-700 font-medium"
            rows="1"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-[#2B6CB0] text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-[#2C5282] transition-colors disabled:opacity-50 shadow-md"
          >
            <Send size={18} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}