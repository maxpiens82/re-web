import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, Upload, CheckCircle2, User, Building, Send, Archive, Loader2 } from 'lucide-react';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

export default function Asignaciones() {
  const [data, setData] = useState({ editors: [], pendingJobs: [], queueErrors: [], readyDeliveries: [] });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assignments, setAssignments] = useState({}); 
  const [processingId, setProcessingId] = useState(null); 

  // CAROUSEL LOGIC
  const [activeCol, setActiveCol] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const carouselRef = useRef(null);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    const progress = scrollLeft / clientWidth;
    setScrollProgress(progress);
    const colIndex = Math.round(progress);
    if (colIndex !== activeCol) setActiveCol(colIndex);
  };

  const getTabStyle = (index) => {
    const distance = Math.abs(scrollProgress - index);
    const intensity = Math.max(0, 1 - distance);
    return {
      transform: `scale(${1 + 0.15 * intensity})`,
      opacity: 0.5 + 0.5 * intensity
    };
  };

  const scrollToCol = (index) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: 'smooth' });
  };

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
        setAssignments({}); 
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
    <div className="h-full bg-[#F0F2F5] font-sans text-gray-800 overflow-y-auto w-full pb-24 flex flex-col">
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER */}
      <div className="bg-white border-b shadow-sm px-4 md:px-8 py-3 md:py-4 flex justify-between items-center sticky top-0 z-20 shrink-0">
        <h1 className="text-base md:text-xl font-extrabold text-[#2B6CB0] tracking-widest uppercase leading-none truncate">
          Asignaciones
        </h1>
        <button 
          onClick={() => { window.location.hash = ''; }} 
          className="text-gray-500 hover:bg-gray-100 font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-gray-200 transition-colors text-xs md:text-sm shrink-0 shadow-sm"
        >
          ✕ Cerrar
        </button>
      </div>

      {/* MOBILE CAROUSEL TABS */}
      <div className="lg:hidden flex justify-around items-center border-b border-gray-200 mb-2 px-1 sticky top-0 bg-[#F0F2F5] z-10 pt-2 pb-2 gap-2 shrink-0">
        <div onClick={() => scrollToCol(0)} style={getTabStyle(0)} className="cursor-pointer transition-all duration-300 flex items-center justify-center gap-0.5 origin-bottom">
          <div className={`font-black uppercase tracking-widest transition-colors ${activeCol === 0 ? 'text-[12px] text-gray-800' : 'text-[10px] text-gray-500'}`}>Asignar</div>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${activeCol === 0 ? 'bg-gray-800 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>{data.pendingJobs.length}</span>
        </div>
        
        <div onClick={() => scrollToCol(1)} style={getTabStyle(1)} className="cursor-pointer transition-all duration-300 flex items-center justify-center gap-0.5 origin-bottom">
          <div className={`font-black uppercase tracking-widest transition-colors ${activeCol === 1 ? 'text-[12px] text-emerald-600' : 'text-[10px] text-gray-500'}`}>Listos</div>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${activeCol === 1 ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-gray-200 text-gray-500'}`}>{data.readyDeliveries.length}</span>
        </div>
      </div>

      <div className="max-w-[1400px] w-full mx-auto p-3 flex flex-col flex-1">
        
        {/* 1. QUEUE ERRORS (Shows spanning both columns if active) */}
        {data.queueErrors.length > 0 && (
          <div className="bg-[#FFF5F5] border border-[#FED7D7] rounded-lg p-3 shadow-sm animate-in fade-in shrink-0 mb-3">
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

        <div 
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex-1 h-full flex flex-nowrap lg:grid lg:grid-cols-2 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 hide-scroll items-start"
        >

          {/* COL 1: ASIGNAR PENDIENTES */}
          <div className="w-full h-full lg:w-auto shrink-0 snap-start snap-always flex flex-col gap-2">
            <div className="hidden lg:flex font-bold text-xs text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2 justify-between items-center px-1">
              <span>Ediciones Pendientes</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{data.pendingJobs.length}</span>
            </div>
            
            {data.pendingJobs.length === 0 ? (
              <p className="text-center text-sm text-gray-400 italic py-4">No hay ediciones pendientes.</p>
            ) : (
              data.pendingJobs.map((job, index) => {
                const isAssigned = job.edicion !== 'Pendiente' && job.edicion !== '';
                const urgency = getUrgencyStyles(job.daysUntilDeadline < 0 ? 'Vencido' : (job.daysUntilDeadline === 0 ? 'Hoy' : (job.daysUntilDeadline === 1 ? 'Mañana' : 'Futuro')));
                const deadlineText = job.daysUntilDeadline < 0 ? 'Vencido' : (job.daysUntilDeadline === 0 ? 'Hoy' : (job.daysUntilDeadline === 1 ? 'Mañana' : `${job.daysUntilDeadline}d`));

                return (
                  <div key={index} className={`bg-white rounded-lg p-2.5 shadow-sm border-l-[4px] transition-colors flex flex-col gap-1.5 ${urgency.card}`}>
                    
                    {/* Top Row: Address & Badges */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-[13px] text-gray-800 truncate flex-1 leading-tight">{job.direccion}</div>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest leading-none ${urgency.badge}`}>
                          {deadlineText}
                        </span>
                        <span className="bg-gray-100 border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest uppercase leading-none">
                          {job.servicio}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Rows: 2 Lines for clarity */}
                    <div className="flex flex-col gap-0.5 w-full">
                      <div className="flex justify-between items-center text-[10px] text-gray-500 w-full">
                        <div className="flex items-center gap-1 truncate font-bold text-gray-700">
                          <User size={10} className="shrink-0 text-gray-400"/> {job.cliente}
                        </div>
                        <span className="font-bold uppercase tracking-wider text-gray-400 shrink-0 ml-2 text-[9px]">{job.metros}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-gray-500 w-full">
                        <div className="flex items-center gap-1 truncate">
                          <Building size={10} className="shrink-0 text-gray-400"/> {job.empresa || 'Particular'}
                        </div>
                        <span className="font-bold text-gray-700 truncate shrink-0 ml-2 max-w-[40%] text-right">{job.realizador || '-'}</span>
                      </div>
                    </div>

                    {/* ACTION ROW - Ultra Compact */}
                    <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100">
                      {!isAssigned ? (
                        <select 
                          className="flex-1 bg-[#F4F4F5] border-none text-gray-700 text-[11px] font-bold py-1.5 px-2 rounded outline-none cursor-pointer focus:ring-1 focus:ring-[#2B6CB0]"
                          value={assignments[index]?.email || ""}
                          onChange={(e) => {
                            const selectedOption = e.target.options[e.target.selectedIndex];
                            handleAssign(index, e.target.value, selectedOption.text);
                          }}
                        >
                          <option value="">Asignar Editor...</option>
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
              })
            )}
          </div>

          {/* COL 2: LISTOS PARA ENTREGAR */}
          <div className="w-full h-full lg:w-auto shrink-0 snap-start snap-always flex flex-col gap-2">
            <div className="hidden lg:flex font-bold text-xs text-emerald-600 uppercase tracking-widest border-b border-emerald-200 pb-2 flex items-center gap-1.5 px-1 justify-between">
              <div className="flex items-center gap-1.5"><CheckCircle2 size={14}/> Listos para Entregar</div>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px]">{data.readyDeliveries.length}</span>
            </div>
            
            {data.readyDeliveries.length === 0 ? (
              <p className="text-center text-sm text-gray-400 italic py-4">No hay entregas pendientes.</p>
            ) : (
              data.readyDeliveries.map(job => (
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
              ))
            )}
          </div>
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