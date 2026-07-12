import React, { useState, useEffect } from 'react';
import { Camera, Clapperboard, Plane, Upload, Download, CheckCircle2, FolderUp, Loader2, ClipboardEdit, User, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

export default function StaffDashboard({ onOpenJob, pendingJobs = [], confirmedJobs = [] }) {
  const { currentUser, userRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 🚀 NEW: Error state
  const [processingId, setProcessingId] = useState(null);

  const [activeCol, setActiveCol] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const carouselRef = React.useRef(null);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    
    // Continuous progress (e.g. 0.5 means halfway between col 0 and 1)
    const progress = scrollLeft / clientWidth;
    setScrollProgress(progress);
    
    const colIndex = Math.round(progress);
    if (colIndex !== activeCol) setActiveCol(colIndex);
  };

  // Calculates dynamic scale and opacity tied 1:1 with the swipe
  const getTabStyle = (index) => {
    const distance = Math.abs(scrollProgress - index);
    const intensity = Math.max(0, 1 - distance); // 1 when centered, 0 when fully swiped away
    return {
      transform: `scale(${1 + 0.15 * intensity})`, // Scales up to 1.15x
      opacity: 0.5 + 0.5 * intensity               // Fades from 50% to 100%
    };
  };

  const scrollToCol = (index) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: 'smooth' });
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'get_staff_dashboard',
          payload: { email: currentUser.email, role: userRole }
        })
      });
      const res = await response.json();
      if (res.success) {
        setData(res);
        setError(null);
      } else {
        setError(res.error || "Error desconocido del servidor");
      }
    } catch (e) {
      console.error("Error fetching dashboard:", e);
      setError(e.message || "Fallo de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Delta Cache Poller (Silent refresh every 30s)
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action, eventId, srv, unit) => {
    if (!window.confirm(`¿Confirmar esta acción en ${srv}?`)) return;
    setProcessingId(`${eventId}_${srv}`);
    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: action, 
          payload: { eventId, servicio: srv, unit } 
        })
      });
      
      const qs = `?action=${action}&eventId=${eventId}&servicio=${encodeURIComponent(srv)}&unit=${encodeURIComponent(unit || '')}`;
      await fetch(GAS_API_URL + qs, { method: 'GET', mode: 'no-cors' });

      await fetchDashboard();
    } catch (e) {
      alert("Error ejecutando acción.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[#2B6CB0]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  // 🚀 DISPLAY THE ERROR ONSCREEN IF IT FAILS
  if (error || !data) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[#E53B12] p-6 text-center bg-[#F0F2F5]">
        <div className="text-5xl mb-4 leading-none">⚠️</div>
        <h2 className="font-bold text-lg mb-2">Error cargando el Dashboard</h2>
        <code className="text-xs bg-red-50 p-4 rounded-xl border border-red-200 max-w-lg w-full overflow-auto whitespace-pre-wrap shadow-sm text-left">
          {error || "No se recibieron datos del servidor."}
        </code>
      </div>
    );
  }

  const { wallet, reservas, standbyEdits, readyEdits, liquidaciones } = data.data;
  const userName = data.userName;
  const isAdmin = userRole === 'admin'; 

  // 1. FILTRADO, AGRUPACIÓN Y VISTA PERSONAL (COLUMNA PENDIENTES)
  // - Mostrar solo 'past_pending' (vencidas sin checkout) o 'checked_out' (esperando crudos).
  // - Ocultar trabajos futuros ('future').
  // - Si es Productor (no admin), mostrar SOLO sus trabajos asignados.
  const rawFilteredReservas = reservas.filter(j => {
    const isMine = j.producer && j.producer.includes(userName);
    const hasPermission = isAdmin || isMine;
    const isCorrectState = j.status === 'past_pending' || j.status === 'checked_out';
    return hasPermission && isCorrectState;
  });

  // - Unificar propiedades multi-unidad en una sola tarjeta y agrupar sus servicios.
  const uniqueReservasMap = new Map();
  rawFilteredReservas.forEach(j => {
    const baseId = String(j.id).split('_')[0]; // Limpiamos sufijos como U-1234_FOTO
    const isMine = j.producer && j.producer.includes(userName);
    
    if (!uniqueReservasMap.has(baseId)) {
      // Limpiamos el texto para que la dirección principal quede impecable
      const cleanLoc = String(j.loc).replace(/ - Multiunidad/gi, '').split(' - Unidad')[0].trim();
      uniqueReservasMap.set(baseId, { ...j, id: baseId, loc: cleanLoc, isMine });
    } else {
      const existing = uniqueReservasMap.get(baseId);
      const combinedSrv = Array.from(new Set([...existing.srv, ...j.srv]));
      uniqueReservasMap.set(baseId, { ...existing, srv: combinedSrv });
    }
  });

  const allReservas = Array.from(uniqueReservasMap.values());
  allReservas.sort((a, b) => (b.isMine === a.isMine ? 0 : a.isMine ? -1 : 1));
  
  const myStandby = standbyEdits.filter(j => j.editor === userName);
  const myReady = readyEdits.filter(j => j.editor === userName);
  
  // 🛡️ SHIELD: Only hide the Agenda if the user's role is strictly 'editor' in the database.
  const isPureEditor = userRole === 'editor';

  // 2. EXTRAER BILLETERA PERSONAL
  let myOwed = wallet.owed || 0;
  let myLastPaid = wallet.lastPaid || '-';
  if (userRole === 'admin') {
    const myLiq = liquidaciones.find(l => l.name === userName);
    if (myLiq) {
      myOwed = myLiq.owed;
      myLastPaid = myLiq.lastPaid;
    }
  }

  const SrvIcon = ({ type }) => {
    if (type === 'FOTO') return <Camera size={10} className="text-blue-500" />;
    if (type === 'DRONE' || type === 'FPV') return <Plane size={10} className="text-orange-500" />;
    return <Clapperboard size={10} className="text-purple-500" />;
  };

  const getReservaColors = (status) => {
    if (status === 'future') return { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' };
    if (status === 'past_pending') return { border: 'border-l-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' };
    return { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' }; 
  };

  const getUrgencyColors = (deadline) => {
    if (deadline === 'Vencido' || deadline === 'Hoy') return { border: 'border-l-rose-500', text: 'text-rose-700', bgBadge: 'bg-rose-100', borderBadge: 'border-rose-200' };
    if (deadline === 'Mañana') return { border: 'border-l-amber-500', text: 'text-amber-700', bgBadge: 'bg-amber-100', borderBadge: 'border-amber-200' };
    return { border: 'border-l-emerald-500', text: 'text-emerald-700', bgBadge: 'bg-emerald-100', borderBadge: 'border-emerald-200' };
  };

  // --- COMPONENTES AISLADOS PARA REUTILIZAR LAYOUTS ---
  const renderReservaCard = (job, idx) => {
    const colors = getReservaColors(job.status);
    const borderColorName = colors.border.replace('border-l-', 'border-');
    
    const bgClass = job.isMine ? 'bg-white' : 'bg-gray-50 grayscale opacity-60';
    const hoverClass = job.isMine ? 'hover:shadow-md' : 'hover:opacity-100 hover:grayscale-0';

    return (
      <div key={job.id + idx} className={`${bgClass} rounded-xl p-3 shadow-sm border-l-4 ${colors.border} flex items-center justify-between ${hoverClass} transition-all gap-3`}>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="font-extrabold text-sm text-gray-800 truncate">{job.loc}</span>
            {/* Ocultamos el badge de fecha si dice CRUDOS */}
            {job.date !== 'CRUDOS' && (
              <span className={`text-[9px] font-bold ${colors.text} ${colors.bg} border ${borderColorName} px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0`}>
                {job.date}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 truncate mb-1.5 font-medium">
            <span className="font-bold text-gray-700">{job.client}</span> • {job.company}
            {isAdmin && <span className="font-bold text-[#EB4511] ml-1">[{job.producer}]</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 w-fit">
              <SrvIcon type={job.srv[0]}/> {job.srv.join(', ')}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          {job.status === 'checked_out' ? (
            <>
              <button 
                onClick={() => window.open(job.linkCrudos, '_blank')}
                className="w-10 h-10 flex items-center justify-center bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors border border-gray-200 shadow-sm shrink-0" 
                title="Abrir Carpeta Crudos"
              >
                <Upload size={18} strokeWidth={2.5}/>
              </button>
              <button 
                onClick={() => handleAction('markUploaded', job.id, job.srv.join(','), job.loc)}
                disabled={processingId === `${job.id}_${job.srv.join(',')}`}
                className="w-10 h-10 flex items-center justify-center bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors border border-emerald-200 shadow-sm shrink-0" 
                title="Confirmar Subida"
              >
                {processingId === `${job.id}_${job.srv.join(',')}` ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} strokeWidth={2.5}/>} 
              </button>
            </>
          ) : (
            <button 
              onClick={() => onOpenJob && onOpenJob(job.id)}
              className="h-10 px-3 flex items-center justify-center gap-1.5 bg-[#EBF8FF] text-[#2B6CB0] hover:bg-[#2B6CB0] hover:text-white rounded-xl transition-colors border border-[#90CDF4] shadow-sm text-[11px] font-bold uppercase tracking-wider shrink-0" 
              title="Hacer Checkout"
            >
              <ClipboardEdit size={16} strokeWidth={2.5} /> Checkout
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderStandbyCard = (job, idx) => (
    <div key={`${job.id}_${idx}`} className="bg-white rounded-xl p-3 shadow-sm border border-dashed border-gray-300 hover:border-gray-400 transition-all opacity-70 hover:opacity-100 flex items-center justify-between gap-3">
       <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-xs text-gray-600 truncate pr-2">{job.loc}</span>
          <span className="text-[10px] text-green-700 font-bold bg-green-50/80 border border-green-100 px-1.5 py-0.5 rounded shrink-0">${job.payout.toLocaleString()}</span>
        </div>
        <div className="text-[10px] text-gray-500 truncate mb-1.5 font-medium">
          <span className="font-bold text-gray-600">{job.client}</span> • {job.company}
        </div>
        <div className="flex items-center justify-between">
          <span className="bg-white border border-gray-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-gray-600 flex items-center gap-1 w-fit"><SrvIcon type={job.srv}/> {job.srv}</span>
          <span className="text-[9px] font-bold text-gray-400">🎥 {job.producer} {isAdmin && `• ✂️ ${job.editor}`}</span>
        </div>
      </div>
    </div>
  );

  const renderReadyCard = (job, idx) => {
    const urgency = getUrgencyColors(job.deadline);
    return (
      <div key={`${job.id}_${idx}`} className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${urgency.border} flex items-center justify-between hover:shadow-md transition-shadow gap-3`}>
         <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-sm text-gray-800 truncate pr-2">{job.loc}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${urgency.bgBadge} ${urgency.text} border ${urgency.borderBadge} shrink-0`}>Vence: {job.deadline}</span>
          </div>
          <div className="text-[10px] text-gray-500 truncate mb-1.5 font-medium">
            <span className="font-bold text-gray-700">{job.client}</span> • {job.company}
            {isAdmin && <span className="font-bold text-purple-600 ml-1">[{job.editor}]</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white border border-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1"><SrvIcon type={job.srv}/> {job.srv}</span>
          </div>
        </div>
      
        <div className="flex gap-1.5 shrink-0">
           <button onClick={() => window.open(job.linkCrudos, '_blank')} className="w-10 h-10 flex justify-center items-center bg-white text-gray-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors border border-gray-200 shadow-sm" title="Bajar Crudos"><Download size={18} strokeWidth={2.5}/></button>
           <button onClick={() => window.open(job.linkEntregas, '_blank')} className="w-10 h-10 flex justify-center items-center bg-white text-gray-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-gray-200 shadow-sm" title="Subir Entregables a Drive"><FolderUp size={18} strokeWidth={2.5}/></button>
           <button 
             onClick={() => handleAction('markDelivered', job.eventId, job.srv, job.loc)} 
             disabled={processingId === `${job.eventId}_${job.srv}`}
             className="w-10 h-10 flex justify-center items-center bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-200 shadow-sm" 
             title="Confirmar Entrega"
           >
             {processingId === `${job.eventId}_${job.srv}` ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} strokeWidth={2.5}/>}
           </button>
        </div>
      </div>
    );
  };

  const renderAgendaCard = (job, idx, isPending) => {
    const isVoice = job.eventId.startsWith('VOZ-');
    let borderClass = 'border-l-emerald-500';
    let bgClass = 'bg-white';
    let opacityClass = 'opacity-100';
    let badge = null;

    if (isPending) {
      if (isVoice) {
        borderClass = 'border-l-blue-500';
        bgClass = 'bg-blue-50/40'; 
        badge = <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0">Voz</span>;
      } else {
        borderClass = 'border-l-yellow-400';
        bgClass = 'bg-yellow-50/40'; 
        badge = <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0">Web</span>;
      }
    } else {
      if (job.isMine) {
        bgClass = 'bg-[#F0FFF4]'; 
        borderClass = 'border-l-emerald-500';
      } else {
        bgClass = 'bg-gray-50';
        borderClass = 'border-l-gray-300';
        opacityClass = 'opacity-50 hover:opacity-80 grayscale-[20%]'; 
      }
    }

    return (
      <div 
        key={job.eventId + idx}
        onClick={() => onOpenJob && onOpenJob(job.eventId)}
        className={`p-3 rounded-xl cursor-pointer transition-all border-l-[4px] shadow-sm hover:shadow-md mb-3 ${borderClass} ${bgClass} ${opacityClass}`}
      >
        <div className="flex items-start justify-between mb-2 gap-2">
          <h4 className="font-bold text-gray-800 text-[13px] leading-tight truncate flex-1 pointer-events-none pt-1">
            {isVoice && <span className="mr-1">🎙️</span>}
            {job.address}
          </h4>
          <div className="flex items-center gap-2 shrink-0">
            {badge}
            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                const cleanAddress = job.address.replace(' - Multiunidad', '').trim();
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`, '_blank');
              }}
              className="flex items-center justify-center w-8 h-8 bg-blue-50 text-[#2B6CB0] border border-blue-200 rounded-lg shadow-sm hover:bg-[#2B6CB0] hover:text-white transition-all active:scale-95 shrink-0 pointer-events-auto"
              title="Abrir en Maps"
            >
              <MapPin size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pointer-events-none">
          <span className="flex items-center gap-1 truncate max-w-[60%]"><User size={11} className="shrink-0"/> {job.client}</span>
          <span className="flex items-center gap-1 shrink-0"><Clock size={11} /> {job.date}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-[#F0F2F5] font-sans text-gray-800 overflow-y-auto w-full pb-20 flex flex-col">
      
      {/* Inyectamos estilos para ocultar la barra de scroll nativa del carrusel pero mantener funcionalidad */}
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER */}
      <div className="bg-white border-b shadow-sm px-3 md:px-8 py-2 md:py-4 flex flex-col sm:flex-row justify-between sm:items-center sticky top-0 z-10 gap-1.5 md:gap-3 shrink-0">
        <h1 className="text-base md:text-xl font-extrabold text-[#EB4511] tracking-widest uppercase leading-none pl-1 md:pl-0">
          RE! <span className="text-gray-400 font-medium text-[10px] md:text-xs">| {userName}</span>
        </h1>
        <div className="flex justify-between sm:justify-end gap-2 md:gap-4 items-center bg-gray-50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-gray-100">
          <div className="text-right flex items-center gap-1.5 md:gap-2">
            <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">
              <span className="hidden md:inline">Mi </span>Saldo<span className="hidden md:inline"> a Favor</span>:
            </span>
            <span className="text-base md:text-lg font-black text-green-600 leading-none">${myOwed.toLocaleString('es-AR')}</span>
          </div>
          <div className="text-[9px] md:text-[10px] text-gray-400 border-l border-gray-300 pl-2 md:pl-4 font-medium uppercase tracking-wider whitespace-nowrap">
            <span className="hidden md:inline">Último </span>Pago: <b className="text-gray-600">{myLastPaid}</b>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] w-full mx-auto p-4 md:p-6 flex flex-col flex-1">

        {/* DYNAMIC LAYOUT: Native CSS Swipe Carousel on Mobile -> Grid on Desktop */}
        {isPureEditor ? (
          <div className="flex flex-col gap-3 flex-1">
            <div className="font-bold text-xs text-purple-600 uppercase tracking-widest border-b border-purple-200 pb-2 flex justify-between items-center px-1">
              <span>Post-Producción</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px]">{myStandby.length + myReady.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myStandby.map(renderStandbyCard)}
              {myReady.map(renderReadyCard)}
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE CAROUSEL TABS */}
            <div className="lg:hidden shrink-0 flex justify-around items-center border-b border-gray-200 mb-2 px-1 sticky top-0 bg-[#F0F2F5] z-10 pt-2 pb-2 gap-2">
              <div onClick={() => scrollToCol(0)} style={getTabStyle(0)} className="cursor-pointer flex items-center justify-center gap-0.5 origin-bottom">
                <div className={`font-black uppercase tracking-widest transition-colors ${activeCol === 0 ? 'text-[12px] text-green-600' : 'text-[10px] text-gray-500'}`}>Agenda</div>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${activeCol === 0 ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-gray-200 text-gray-500'}`}>{confirmedJobs.length + pendingJobs.length}</span>
              </div>
              
              <div onClick={() => scrollToCol(1)} style={getTabStyle(1)} className="cursor-pointer flex items-center justify-center gap-0.5 origin-bottom">
                <div className={`font-black uppercase tracking-widest transition-colors ${activeCol === 1 ? 'text-[12px] text-gray-800' : 'text-[10px] text-gray-500'}`}>Pendientes</div>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${activeCol === 1 ? 'bg-gray-800 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>{allReservas.length}</span>
              </div>

              <div onClick={() => scrollToCol(2)} style={getTabStyle(2)} className="cursor-pointer flex items-center justify-center gap-0.5 origin-bottom">
                <div className={`font-black uppercase tracking-widest transition-colors ${activeCol === 2 ? 'text-[12px] text-purple-600' : 'text-[10px] text-gray-500'}`}>Edición</div>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${activeCol === 2 ? 'bg-purple-100 text-purple-700 shadow-sm' : 'bg-gray-200 text-gray-500'}`}>{myStandby.length + myReady.length}</span>
              </div>
            </div>

            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex-1 w-full flex flex-nowrap lg:grid lg:grid-cols-2 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 hide-scroll items-start"
            >
              
              {/* COL 1: AGENDA (Mobile Only) */}
              <div className="w-full h-full lg:hidden shrink-0 snap-start snap-always flex flex-col gap-3 pt-2">
                <div className="hidden lg:flex font-bold text-xs text-green-600 uppercase tracking-widest border-b border-green-200 pb-2 justify-between items-center px-1">
                  <span>Agenda Central</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px]">{confirmedJobs.length}</span>
                </div>
                <div className="flex flex-col">
                  {isAdmin && pendingJobs.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] font-bold text-yellow-600 uppercase mb-2 px-1">Solicitudes Web</div>
                      {pendingJobs.map((job, idx) => renderAgendaCard(job, idx, true))}
                    </div>
                  )}
                  <div>
                    {isAdmin && pendingJobs.length > 0 && <div className="text-[10px] font-bold text-green-600 uppercase mb-2 px-1">Reservas Confirmadas</div>}
                    {confirmedJobs.map((job, idx) => renderAgendaCard(job, idx, false))}
                    {confirmedJobs.length === 0 && <p className="text-xs text-gray-400 italic px-1">No hay reservas confirmadas.</p>}
                  </div>
                </div>
              </div>

              {/* COL 2: PENDIENTES */}
              <div className="w-full h-full lg:w-auto shrink-0 snap-start snap-always flex flex-col gap-3 pt-2">
                <div className="hidden lg:flex font-bold text-xs text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2 justify-between items-center px-1">
                  <span>Pendientes</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{allReservas.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {allReservas.map(renderReservaCard)}
                </div>
              </div>

              {/* COL 3: POST-PRODUCCION */}
              <div className="w-full h-full lg:w-auto shrink-0 snap-start snap-always flex flex-col gap-3 pt-2">
                <div className="hidden lg:flex font-bold text-xs text-purple-600 uppercase tracking-widest border-b border-purple-200 pb-2 justify-between items-center px-1">
                  <span>Post-Producción</span>
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px]">{myStandby.length + myReady.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {myStandby.map(renderStandbyCard)}
                  {myReady.map(renderReadyCard)}
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}