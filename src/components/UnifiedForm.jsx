import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

export default function UnifiedForm({ jobId, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(GAS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ 
            action: 'get_booking_details',
            payload: { eventId: jobId } 
          })
        });

        const result = await response.json();

        if (result.success) {
          setFormData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Error de conexión al cargar la reserva.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="bg-white w-full h-full max-w-4xl mx-auto rounded-2xl shadow-xl flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="animate-spin mb-4 text-[#EB4511]" size={40} />
        <p className="font-bold uppercase tracking-wider text-sm">Descargando datos...</p>
        <p className="text-xs mt-2">ID: {jobId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white w-full h-full max-w-4xl mx-auto rounded-2xl shadow-xl flex flex-col items-center justify-center text-red-500 p-8 text-center">
        <AlertCircle size={40} className="mb-4" />
        <p className="font-bold">{error}</p>
        <button onClick={onCancel} className="mt-6 px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors">
          Cerrar Panel
        </button>
      </div>
    );
  }

  // Determine Form Mode based on the data
  const isWebRequest = jobId.startsWith('REQ-');
  let modeTitle = "Actualizar Reserva";
  let modeColor = "text-[#2B6CB0]"; // Blue

  if (isWebRequest) {
    modeTitle = "Aprobar Solicitud Web";
    modeColor = "text-yellow-600";
  }

  return (
    <div className="bg-white w-full max-w-4xl mx-auto rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
      
      {/* HEADER */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className={`text-xl font-extrabold uppercase tracking-wide ${modeColor}`}>
            {modeTitle}
          </h2>
          <p className="text-xs text-gray-500 mt-1">ID: {jobId}</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 font-bold px-3 py-1 bg-gray-200 hover:bg-gray-300 transition-colors rounded-md text-sm">
          ✕ Cerrar
        </button>
      </div>

      {/* BODY (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="bg-gray-800 rounded-xl p-4 shadow-inner overflow-hidden">
          <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="text-sm text-gray-500 font-bold uppercase">
          Total Estimado: <span className="text-[#EB4511]">$---</span>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          {isWebRequest ? (
            <>
              <button className="flex-1 sm:flex-none px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm uppercase hover:bg-red-100 transition-colors">Rechazar</button>
              <button className="flex-1 sm:flex-none px-6 py-3 bg-yellow-500 text-white font-bold rounded-xl text-sm uppercase shadow-md hover:bg-yellow-600 transition-colors">Aprobar y Agendar</button>
            </>
          ) : (
            <>
              <button className="flex-1 sm:flex-none px-6 py-3 bg-white border-2 border-[#EB4511] text-[#EB4511] font-bold rounded-xl text-sm uppercase hover:bg-[#EB4511]/5 transition-colors">Checkout (Finalizar)</button>
              <button className="flex-1 sm:flex-none px-6 py-3 bg-[#2B6CB0] text-white font-bold rounded-xl text-sm uppercase shadow-md hover:bg-[#2C5282] transition-colors">Actualizar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}