import React, { useState, useRef } from 'react';
import { Mic, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function QuickBook() {
  const { currentUser } = useAuth();
  const [state, setState] = useState('idle'); // idle, listening, processing, success, error
  const [displayTranscript, setDisplayTranscript] = useState('');
  
  const finalTranscriptRef = useRef(''); 
  const currentChunkRef = useRef(''); 
  const recognitionRef = useRef(null);
  const isPressedRef = useRef(false);

  if (!currentUser) return null;

  const startMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta dictado por voz. Usa Chrome o Safari actualizado.");
      isPressedRef.current = false;
      setState('idle');
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
        
      currentChunkRef.current = cleanString;
      setDisplayTranscript((finalTranscriptRef.current + ' ' + cleanString).trim());
    };

    recognition.onerror = (event) => {
      console.error("Mic error:", event.error);
      // Only abort on hard permission errors
      if (event.error === 'not-allowed') {
        isPressedRef.current = false;
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    };

    recognition.onend = () => {
      // Save chunk
      if (currentChunkRef.current) {
        finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + currentChunkRef.current).trim();
        currentChunkRef.current = '';
      }

      if (isPressedRef.current) {
        // THE MAGIC: User is still holding, but browser cut us off. Restart seamlessly!
        startMic();
      } else {
        // User released the button
        if (finalTranscriptRef.current) {
          processRecording(finalTranscriptRef.current);
        } else {
          setState('idle');
          setDisplayTranscript('');
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Start error:", e);
    }
  };

  const handlePointerDown = (e) => {
    // Ignore right clicks
    if (e.button && e.button !== 0) return;
    if (state === 'processing' || state === 'success') return;
    
    // Capture pointer ensures we track the finger even if they slide off the button
    try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
    
    // Prevent double firing
    if (isPressedRef.current) return;
    isPressedRef.current = true;
    
    finalTranscriptRef.current = '';
    currentChunkRef.current = '';
    setDisplayTranscript('');
    setState('listening');
    
    startMic();
  };

  const handlePointerUp = (e) => {
    try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
    
    if (!isPressedRef.current) return;
    isPressedRef.current = false;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // Triggers onend
    }
  };

  const processRecording = async (finalText) => {
    setState('processing');

    // Send the day of the week explicitly so the AI can calculate "Jueves" accurately
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

    const payload = {
      action: 'quick_voice_booking',
      payload: {
        transcript: finalText,
        producerName: currentUser.reName || currentUser.displayName || 'Productor',
        currentDateStr: new Date().toLocaleDateString('es-AR', dateOptions)
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
        setState('success');
        setTimeout(() => { setState('idle'); setDisplayTranscript(''); finalTranscriptRef.current = ''; }, 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error de la IA: " + error.message);
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] flex flex-col items-end gap-3">
      
      {(state === 'listening' || state === 'processing') && displayTranscript && (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl max-w-[280px] border border-gray-200 text-sm text-gray-700 animate-in slide-in-from-bottom-2">
          {displayTranscript}
          {state === 'listening' && <span className="animate-pulse text-[#E53B12] ml-1 font-bold">...</span>}
        </div>
      )}

      {/* 
        onPointerDown/Up replaces all touch and mouse events.
        touch-none and select-none prevent mobile browser zooming and text selection while holding.
      */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        disabled={state === 'processing' || state === 'success'}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform touch-none select-none outline-none
          ${state === 'idle' ? 'bg-[#2B6CB0] text-white hover:bg-[#2C5282] hover:scale-105 active:scale-95 cursor-pointer' : ''}
          ${state === 'listening' ? 'bg-[#E53B12] text-white shadow-[0_0_20px_rgba(229,59,18,0.5)] scale-110 cursor-pointer' : ''}
          ${state === 'processing' ? 'bg-gray-800 text-white cursor-wait scale-100' : ''}
          ${state === 'success' ? 'bg-[#38a169] text-white scale-100' : ''}
          ${state === 'error' ? 'bg-red-500 text-white scale-100' : ''}
        `}
      >
        {(state === 'idle' || state === 'listening') && <Mic size={24} className={state === 'listening' ? 'animate-pulse' : ''} />}
        {state === 'processing' && <Loader2 size={24} className="animate-spin" />}
        {state === 'success' && <Check size={28} strokeWidth={3} />}
        {state === 'error' && <AlertCircle size={24} />}
      </button>

    </div>
  );
}