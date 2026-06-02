import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function QuickBook() {
  const { currentUser } = useAuth();
  const [state, setState] = useState('idle'); 
  const stateRef = useRef('idle'); // 🚀 Prevents stale closure traps
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef(''); // 🚀 Prevents stale closure traps
  const recognitionRef = useRef(null);

  // Wrapper to keep refs and state in sync instantly
  const syncState = (s) => { stateRef.current = s; setState(s); };
  const syncTranscript = (t) => { transcriptRef.current = t; setTranscript(t); };

  if (!currentUser) return null;

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta dictado por voz. Usa Chrome o Safari actualizado.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR'; 
    recognition.interimResults = true; 
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const chunks = Array.from(event.results).map(r => r[0].transcript.trim());
      let cleanString = chunks[0] || '';
      
      for (let i = 1; i < chunks.length; i++) {
        if (chunks[i].toLowerCase().startsWith(cleanString.toLowerCase())) {
          cleanString = chunks[i]; 
        } else {
          cleanString += ' ' + chunks[i]; 
        }
      }
      syncTranscript(cleanString);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      syncState('error');
      setTimeout(() => syncState('idle'), 3000);
    };

    recognition.onend = () => {
      // 🚀 FIX: Automatically trigger processing when silence cuts off the mic natively!
      if (stateRef.current === 'listening') {
        processVoiceCommand();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    syncState('listening');
    syncTranscript('');
  };

  // Extracted processing logic to be called safely from onend
  const processVoiceCommand = async () => {
    syncState('processing');
    const finalTranscript = transcriptRef.current.trim();
    
    if (!finalTranscript) {
      syncState('idle');
      return;
    }
    
    const payload = {
      action: 'quick_voice_booking',
      payload: {
        transcript: finalTranscript,
        producerName: currentUser.reName || currentUser.displayName || 'Productor',
        currentDateStr: new Date().toLocaleString('es-AR')
      }
    };

    const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        syncState('success');
        setTimeout(() => { syncState('idle'); syncTranscript(''); }, 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error de la IA: " + error.message);
      syncState('error');
      setTimeout(() => syncState('idle'), 4000);
    }
  };

const stopListening = () => {
    if (recognitionRef.current && stateRef.current === 'listening') {
       recognitionRef.current.stop(); 
    }
  };

  const handlePressStart = (e) => {
    e.preventDefault(); 
    if (stateRef.current === 'idle') startListening();
  };

  const handlePressEnd = (e) => {
    e.preventDefault();
    if (stateRef.current === 'listening') stopListening();
  };

  // --- UI RENDER ---
  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] flex flex-col items-end gap-3">
      
      {/* Transcript Bubble (Shows while talking or processing) */}
      {(state === 'listening' || state === 'processing') && transcript && (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl max-w-[280px] border border-gray-200 text-sm text-gray-700 animate-in slide-in-from-bottom-2">
          {transcript}
          {state === 'listening' && <span className="animate-pulse">...</span>}
        </div>
      )}

      {/* Floating Action Button (Push to Talk) */}
      <button
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        disabled={state === 'processing' || state === 'success' || state === 'error'}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform select-none
          ${state === 'idle' ? 'bg-[#2B6CB0] text-white hover:bg-[#2C5282] hover:scale-105 active:scale-95' : ''}
          ${state === 'listening' ? 'bg-[#E53B12] text-white animate-pulse shadow-[0_0_20px_rgba(229,59,18,0.5)] scale-110' : ''}
          ${state === 'processing' ? 'bg-gray-800 text-white cursor-not-allowed' : ''}
          ${state === 'success' ? 'bg-[#38a169] text-white' : ''}
          ${state === 'error' ? 'bg-red-500 text-white' : ''}
        `}
      >
        {state === 'idle' && <Mic size={24} />}
        {state === 'listening' && <Mic size={24} fill="currentColor" />}
        {state === 'processing' && <Loader2 size={24} className="animate-spin" />}
        {state === 'success' && <Check size={28} strokeWidth={3} />}
        {state === 'error' && <AlertCircle size={24} />}
      </button>

    </div>
  );
}