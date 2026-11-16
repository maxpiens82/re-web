import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gasPost } from '../lib/gasApi';

export default function AiAssistant() {
  const { currentUser, userRole } = useAuth();
  
  // Try to grab the Google Profile First Name, fallback to System Name, then fallback to 'equipo'
  const firstName = currentUser?.displayName?.split(' ')[0] || currentUser?.reName || 'equipo';
  
  const [messages, setMessages] = useState([
    { role: 'ai', text: `¡Hola ${firstName}! Soy Igor. Leo los números de IGOR (trabajos, cobros, pagos al equipo, costos fijos, quién hizo qué) y el chat de Telegram; las cuentas las hace el sistema, no yo. ¿Qué querés saber?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      const response = await gasPost({
        action: 'ai_assistant',
        payload: {
          prompt: userMsg,
          history: messages,
          userName: currentUser?.reName || currentUser?.displayName,
          userRole: userRole
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: `❌ Error: ${data.error}` }]);
      }
    } catch {
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

  // The reply is Markdown from the model, built from data people typed (client names from the web): escaped first,
  // then bullets, headings, bold and line breaks only.
  const formatText = (text) => {
    let formatted = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    formatted = formatted.replace(/^\s*[-*]\s+/gm, '• ');
    formatted = formatted.replace(/^#{1,4}\s+(.*)$/gm, '<strong>$1</strong>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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
            <p className="text-xs font-medium text-blue-100 mt-1">Con los datos de IGOR</p>
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
                Buscando en los datos <Loader2 size={12} className="animate-spin opacity-50" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-gray-100 shrink-0">
        
        <div className="flex items-end gap-2 bg-[#F4F4F5] p-2 rounded-2xl border border-transparent focus-within:border-[#2B6CB0] focus-within:bg-white transition-all shadow-inner">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntale a Igor..."
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