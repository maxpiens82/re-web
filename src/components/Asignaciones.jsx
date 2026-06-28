import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Upload, CheckCircle2, User, Building, Send, Archive, Check, Loader2 } from 'lucide-react';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

export default function Asignaciones() {
  const [data, setData] = useState({ editors: [], pendingJobs: [], queueErrors: [], readyDeliveries: [] });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assignments, setAssignments] = useState({}); // { [jobIndex]: { email, name } }
  const [processingId, setProcessingId] = useState(null); // Track specific button loading states

  const fetchAssignments = async () => {
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_admin_assignments' })
      });
      const res = await response.json();
      if (res.success) {
        setData(res.data);
        setAssignments({}); // Clear assignments on fresh load
      }
    } catch (e) {
      console.error("Error fetching assignments:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAssignments();
  };

  const handleAssign = (jobIndex, editorEmail, editorName) => {
    setAssignments(prev => {
      const next = { ...prev };
      if (!editorEmail) delete next[jobIndex];
      else next[jobIndex] = { email: editorEmail, name: editorName };
      return next;
    });
  };

  const executeAction = async (action, payload, confirmationText) => {
    if (confirmationText && !window.confirm(confirmationText)) return;
    
    // Set a generic processing ID if we don't have a specific one
    const localProcessId = payload.eventId ? `${payload.eventId}_${payload.servicio || payload.ticketId || 'arch'}` : 'generic';
    setProcessingId(localProcessId);

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
      const res = await response.json();
      if (res.success) {
        fetchAssignments();
      } else {
        alert("Error: " + res.error);
      }
    } catch (e) {
      alert("Error de red.");
    } finally {
      setProcessingId(null);
    }
  };

  const executeBatchAssignments = async () => {
    const keys = Object.keys(assignments);
    if (keys.length === 0) return;

    setProcessingId('batch_assign');
    const assignmentPayload = keys.map(index => {
      const job = data.pendingJobs[index];
      const editor = assignments[index];
      return {
        rowNum: job.rowNum,
        eventId: job.eventId,
        servicio: job.servicio,
        direccion: job.direccion,
        linkCrudos: job.linkCrudos,
        linkEntregas: job.linkEntregas,
        editorEmail: editor.email,
        editorName: editor.name
      };
    });

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'process_assignments', payload: assignmentPayload })
      });
      const res = await response.json();
      if (res.success) {
        alert(`¡Éxito! Se asignaron ${res.count} trabajos.`);
        fetchAssignments();
      } else {
        alert("Error: " + res.error);
      }
    } catch (e) {
      alert("Error de red.");
    } finally {
      setProcessingId(null);
    }
  };

  const getUrgencyStyles = (deadline) => {
    if (deadline === 'Hoy' || String(deadline).includes('-') || deadline === 'Vencido') {
      return { card: 'border-l-[#E53B12]', badge: 'bg-rose-100 text-rose-700 border-rose-200' };
    }
    if (deadline === 'Mañana') {
      return { card: 'border-l-[#ECC94B]', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { card: 'border-l-[#48bb78]', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const buildWhatsAppLink = (job) => {
    let message = `¡Hola ${job.cliente}! 👋\n\nNos comunicamos desde el equipo de postproducción de RE! para avisarte que el material de *${job.direccion}* ya está completo y online en tu carpeta de cliente:`;
    
    if (job.linkEntregas && job.linkEntregas !== '') {
      message += `\n\n📁 ${job.linkEntregas}`;
    } else {
      message += `\n\n📁 El material ya se encuentra en tu carpeta habitual.`;
    }
    
    if (job.saldo > 0) {
      const formattedPropPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(job.precioPropiedad || 0);
      const formattedSaldo = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(job.saldo);
      
      message += `\n\n💳 *Resumen de Cuenta*\nValor de este trabajo: *${formattedPropPrice}*\n`;
      if (job.saldo !== Math.round(job.precioPropiedad || 0)) {
        message += `Saldo total en cuenta: *${formattedSaldo}* _(incluye trabajos anteriores)_\n`;
      }
      message += `\nPodés cancelarlo mediante transferencia a los siguientes datos:\n\n🏦 Banco: Santander\n👤 Titular: Maximiliano Augusto Gaggini\n🔢 CBU/CVU: 0720519488000006612168\n🏷️ Alias: SOMOS.RE.OK\n\n_(Por favor envianos el comprobante por este medio una vez realizada)_`;
    } 
    message += `\n\nAnte cualquier eventualidad, no dudes en contactarnos. ¡Saludos! 🚀`;

    return `https://api.whatsapp.com/send?phone=${job.telefono}&text=${encodeURIComponent(message)}`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[#2B6CB0]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  const selectionCount = Object.keys(assignments).length;

  return (
    <div className="h-full bg-[#F0F2F5] font-sans text-gray-800 overflow-y-auto w-full pb-24">
      
      {/* HEADER */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-base font-extrabold text-[#2B6CB0] tracking-widest uppercase leading-none">
              Control de Tráfico
            </h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">Panel de Asignaciones</p>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing} className="bg-white border border-[#90CDF4] text-[#2B6CB0] hover:bg-blue-50 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''}/> Refrescar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 space-y-5 mt-2">

        {/* 1. QUEUE ERRORS */}
        {data.queueErrors.length > 0 && (
          <div className="bg-[#FFF5F5] border border-[#FED7D7] rounded-lg p-3 shadow-sm animate-in fade-in">
            <h3 className="text-[#E53B12] text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle size={14}/> Tareas de Background Fallidas
            </h3>
            <div className="flex flex-col gap-2">
              {data.queueErrors.map((err, i) => (
                <div key={i} className="bg-white p-2.5 rounded border border-red-100 flex items-center justify-between">
                  <span className="text-[10px] text-red-600 font-medium truncate pr-2">{err.errorLog}</span>
                  <button 
                    onClick={() => executeAction('retry_queue_ticket', { ticketId: err.ticketId })}
                    disabled={processingId === `${err.eventId}_${err.ticketId}`}
                    className="bg-[#E53B12] hover:bg-[#c42e0d] text-white text-[9px] font-bold px-2 py-1.5 rounded shadow-sm transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1"
                  >
                    {processingId === `${err.eventId}_${err.ticketId}` ? <Loader2 size={10} className="animate-spin" /> : null} Reintentar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. PENDING EDITS */}
        <div>
          <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
            Ediciones Pendientes ({data.pendingJobs.length})
          </h2>
          
          {data.pendingJobs.length === 0 ? (
            <p className="text-center text-sm text-gray-400 italic py-4">No hay ediciones pendientes.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.pendingJobs.map((job, index) => {
                const isAssigned = job.edicion !== 'Pendiente' && job.edicion !== '';
                const urgency = getUrgencyStyles(job.daysUntilDeadline < 0 ? 'Vencido' : (job.daysUntilDeadline === 0 ? 'Hoy' : (job.daysUntilDeadline === 1 ? 'Mañana' : 'Futuro')));
                const deadlineText = job.daysUntilDeadline < 0 ? 'Vencido' : (job.daysUntilDeadline === 0 ? 'Hoy' : (job.daysUntilDeadline === 1 ? 'Mañana' : `Faltan ${job.daysUntilDeadline}d`));

                return (
                  <div key={index} className={`bg-white rounded-lg p-3 shadow-sm border-l-[4px] transition-colors ${urgency.card}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm text-gray-800 truncate">{job.direccion}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest ${urgency.badge}`}>
                            {deadlineText}
                          </span>
                        </div>
                        <div className="text-[9px] text-gray-500 flex items-center gap-1.5 truncate mt-1">
                          <User size={10}/> <span className="font-bold">{job.cliente}</span> 
                          <Building size={10} className="ml-1"/> <span>{job.empresa}</span>
                          <span className="text-gray-300">|</span>
                          <span>Cam: <b className="text-gray-700">{job.realizador}</b></span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="bg-gray-100 border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">
                          {job.servicio}
                        </span>
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{job.metros}</span>
                      </div>
                    </div>

                    {/* ACTION ROW */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-1">
                      {!isAssigned ? (
                        <select 
                          className="flex-1 bg-[#F4F4F5] border-none text-gray-700 text-[11px] font-bold py-2 px-2 rounded outline-none cursor-pointer focus:ring-1 focus:ring-[#2B6CB0]"
                          value={assignments[index]?.email || ""}
                          onChange={(e) => {
                            const selectedOption = e.target.options[e.target.selectedIndex];
                            handleAssign(index, e.target.value, selectedOption.text);
                          }}
                        >
                          <option value="">Asignar Editor...</option>
                          {/* Combinar email y name como key para evitar colisiones si el usuario tiene múltiples roles en Valores */}
                          {data.editors.map((ed, i) => <option key={`${ed.email}_${ed.name}_${i}`} value={ed.email}>{ed.name}</option>)}
                        </select>
                      ) : (
                        <>
                          <div className="bg-blue-50 text-[#2B6CB0] border border-blue-100 px-2 py-1.5 rounded text-[10px] font-bold flex-1 text-center truncate">
                            👨‍💻 Asignado: {job.edicion}
                          </div>
                          {job.estadoCrudos === 'Pendiente' && (
                            <button 
                              onClick={() => executeAction('force_crudos', { eventId: job.eventId, servicio: job.servicio, direccion: job.direccion }, `¿Forzar crudos subidos para ${job.servicio} en ${job.direccion}?`)}
                              disabled={processingId === `${job.eventId}_${job.servicio}`}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200 px-2 py-1.5 rounded text-[10px] font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {processingId === `${job.eventId}_${job.servicio}` ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12}/>} Crudos
                            </button>
                          )}
                          <button 
                            onClick={() => executeAction('force_deliver', { eventId: job.eventId, servicio: job.servicio, direccion: job.direccion }, `¿Forzar entrega de ${job.servicio} en ${job.direccion}?`)}
                            disabled={processingId === `${job.eventId}_${job.servicio}`}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1.5 rounded text-[10px] font-bold transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            {processingId === `${job.eventId}_${job.servicio}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12}/>} Entrega
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. READY DELIVERIES */}
        <div className="mt-8">
          <h2 className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
            <CheckCircle2 size={14}/> Listos para Entregar ({data.readyDeliveries.length})
          </h2>
          
          {data.readyDeliveries.length === 0 ? (
            <p className="text-center text-sm text-gray-400 italic py-4">No hay entregas pendientes.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.readyDeliveries.map(job => (
                <div key={job.eventId} className="bg-white rounded-lg p-3 shadow-sm border border-emerald-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-sm text-gray-800 truncate mb-1">{job.direccion}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                        <User size={10}/> <span className="font-bold text-gray-700">{job.cliente}</span>
                        {job.telefono ? (
                          <><span className="text-gray-300">|</span> <span>{job.telefono}</span></>
                        ) : (
                          <><span className="text-gray-300">|</span> <span className="text-rose-500 font-bold">Sin Teléfono</span></>
                        )}
                      </div>
                    </div>
                    {job.saldo > 0 && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest text-right shrink-0">
                        Debe<br/>
                        <span className="text-[11px] font-black">${job.saldo.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100 mt-1">
                    {job.telefono ? (
                      <button 
                        onClick={() => window.open(buildWhatsAppLink(job), '_blank')}
                        className="flex-[2] bg-[#25D366] hover:bg-[#1DA851] text-white py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Send size={12}/> WhatsApp
                      </button>
                    ) : (
                      <div className="flex-[2] bg-gray-100 text-gray-400 py-2 rounded text-[10px] font-bold uppercase flex items-center justify-center border border-gray-200">
                        Falta Número
                      </div>
                    )}
                    <button 
                      onClick={() => executeAction('archive_ready_delivery', { eventId: job.eventId })}
                      disabled={processingId === `${job.eventId}_arch`}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border border-gray-200 disabled:opacity-50"
                    >
                      {processingId === `${job.eventId}_arch` ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12}/>} Archivar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* STICKY FOOTER (BATCH ASSIGN) */}
      <div className={`fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30 flex justify-between items-center pb-safe transition-transform duration-300 ${selectionCount > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none mb-1">Seleccionados</span>
          <span className="text-xl font-black text-[#2B6CB0] leading-none">{selectionCount}</span>
        </div>
        <button 
          onClick={executeBatchAssignments}
          disabled={processingId === 'batch_assign'}
          className="bg-[#2B6CB0] hover:bg-[#2C5282] text-white font-bold uppercase tracking-widest text-xs py-3 px-6 rounded-full transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          {processingId === 'batch_assign' ? 'Procesando...' : 'Asignar y Notificar'} <Send size={14}/>
        </button>
      </div>

    </div>
  );
}