import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function QuickBook() {
  const { currentUser } = useAuth();
  const [state, setState] = useState('idle'); // idle, listening, processing, success, error
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // If not logged in, don't render the button at all
  if (!currentUser) return null;

  const startListening = () => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta dictado por voz. Usa Chrome o Safari actualizado.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR'; // Optimize for Argentine Spanish
    recognition.interimResults = true; // Show text while talking
    recognition.continuous = true;

    // 🚀 THE FIX: Smart Reducer that handles both Android and Desktop perfectly
    recognition.onresult = (event) => {
      const chunks = Array.from(event.results).map(r => r[0].transcript.trim());
      
      let cleanString = chunks[0] || '';
      
      for (let i = 1; i < chunks.length; i++) {
        // If Android is duplicating the string (e.g., "Agrega" -> "Agrega una")
        if (chunks[i].toLowerCase().startsWith(cleanString.toLowerCase())) {
          cleanString = chunks[i]; // Replace it instead of adding to it
        } 
        // If Desktop is sending separate words (e.g., "Agrega" -> "una")
        else {
          cleanString += ' ' + chunks[i]; // Add the new word to the end
        }
      }
        
      setTranscript(cleanString);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    };

    recognition.onend = () => {
      // If user manually stopped it, state will be 'processing'. 
      // If it timed out naturally, force stop it.
      if (state === 'listening') stopListening(recognition);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('listening');
    setTranscript('');
  };

  const stopListening = async (rec = recognitionRef.current) => {
    if (rec) rec.stop();
    setState('processing');

    const finalTranscript = transcript.trim();
    if (!finalTranscript) {
      setState('idle');
      return;
    }

    // Prepare payload for GAS
    const payload = {
      action: 'quick_voice_booking',
      payload: {
        transcript: finalTranscript,
        producerName: currentUser.reName || currentUser.displayName || 'Productor',
        currentDateStr: new Date().toLocaleString('es-AR') // Gives AI current local time context
      }
    };

    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        setState('success');
        setTimeout(() => { setState('idle'); setTranscript(''); }, 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
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

      {/* Floating Action Button */}
      <button
        onClick={state === 'listening' ? () => stopListening() : startListening}
        disabled={state === 'processing' || state === 'success' || state === 'error'}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95
          ${state === 'idle' ? 'bg-[#2B6CB0] text-white hover:bg-[#2C5282]' : ''}
          ${state === 'listening' ? 'bg-[#E53B12] text-white animate-pulse shadow-[0_0_20px_rgba(229,59,18,0.5)] scale-110' : ''}
          ${state === 'processing' ? 'bg-gray-800 text-white cursor-not-allowed' : ''}
          ${state === 'success' ? 'bg-[#38a169] text-white' : ''}
          ${state === 'error' ? 'bg-red-500 text-white' : ''}
        `}
      >
        {state === 'idle' && <Mic size={24} />}
        {state === 'listening' && <Square size={20} fill="currentColor" />}
        {state === 'processing' && <Loader2 size={24} className="animate-spin" />}
        {state === 'success' && <Check size={28} strokeWidth={3} />}
        {state === 'error' && <AlertCircle size={24} />}
      </button>

    </div>
  );
}