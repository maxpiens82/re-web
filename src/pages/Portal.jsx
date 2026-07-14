import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, CalendarDays, Inbox, MapPin, Clock, Loader2, Plus, User, Bot, LayoutDashboard, ClipboardList, Banknote, Search, Building, Phone, X } from 'lucide-react';
import UnifiedForm from '../components/UnifiedForm';
import LoadingLogo from '../components/LoadingLogo';
import AiAssistant from '../components/AiAssistant';
import StaffDashboard from '../components/StaffDashboard';
import Asignaciones from '../components/Asignaciones';
import Cobranzas from '../components/Cobranzas';

// Make sure this is your actual GAS URL!
const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

const normalizeText = (text) => text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "") : "";

// 🚀 Helper to parse dates back to comparable timestamps
const parseDateToMs = (dateStr, timeStr) => {
  try {
    const p = String(dateStr).split('/');
    const t = String(timeStr).split(':');
    // Format: dd/mm/yyyy -> new Date(year, monthIndex, day, hours, minutes)
    if (p.length === 3) {
      return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]), parseInt(t[0] || 12), parseInt(t[1] || 0)).getTime();
    }
  } catch(e) {}
  return 0;
};

export default function Portal() {
  const { currentUser, userRole, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [confirmedJobs, setConfirmedJobs] = useState([]);
  
  // CRM Admin State
  const [clientDb, setClientDb] = useState([]);
  const [showCrmModal, setShowCrmModal] = useState(false);
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [crmSuggestions, setCrmSuggestions] = useState([]);
  const [selectedCrmClient, setSelectedCrmClient] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const crmWrapperRef = useRef(null);
  
  // Leemos el hash inicial (si el usuario recarga la página estando adentro de un trabajo)
  const initialHash = window.location.hash ? window.location.hash.substring(1) : null;
  const [selectedJobId, setSelectedJobId] = useState(initialHash);

  // Extract fetch logic so we can call it on demand
  const fetchPortalData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Dashboard Data
      const reqPortal = fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'get_portal_data_v2',
          payload: { email: currentUser?.email }
        })
      }).then(r => r.json());

      // 2. 🚀 FAST FETCH CRM FOR THE MODAL (Only if we haven't already loaded it)
      const reqInit = clientDb.length === 0 
        ? fetch(GAS_API_URL + "?api=init_v2").then(r => r.json()) 
        : Promise.resolve(null);

      const [data, initData] = await Promise.all([reqPortal, reqInit]);

      if (data.success) {
        setPendingJobs(data.pending || []);
        setConfirmedJobs(data.confirmed || []);
        
        // The V2 Dashboard route now sends the CRM client list natively!
        if (data.clients && data.clients.length > 0) {
          setClientDb(data.clients);
        }
      } else {
        alert("Error cargando datos: " + data.error);
      }
    } catch (error) {
      console.error("Error fetching portal data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the initial Master Lists on mount
  useEffect(() => {
    fetchPortalData();
  }, []);

  // 🚀 INTERCEPTOR DEL BOTÓN ATRÁS (Hash History Sync)
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash ? window.location.hash.substring(1) : null;
      setSelectedJobId(currentHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // NEW: Closes the form AND refreshes the sidebar
  const handleSuccess = () => {
    handleJobClick(null);
    fetchPortalData();
  };

  const handleJobClick = (eventId) => {
    if (eventId) {
      window.location.hash = eventId; // Agrega el ID al historial del navegador
    } else {
      window.history.pushState('', document.title, window.location.pathname + window.location.search); // Limpia el Hash sin recargar
    }
    setSelectedJobId(eventId);
  };

  // --- CRM ADMIN LOGIC ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (crmWrapperRef.current && !crmWrapperRef.current.contains(e.target)) {
        setCrmSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCrmSearch = (query) => {
    setCrmSearchQuery(query);
    const normalized = normalizeText(query);
    if (normalized.length < 2) { setCrmSuggestions([]); return; }
    
    const terms = normalized.split(/\s+/);
    const matches = clientDb.filter(c => {
      const raw = `${c.nombre || ''} ${c.apellido || ''} ${c.empresa || ''} ${c.telefono || ''} ${c.email || ''}`;
      return terms.every(t => normalizeText(raw).includes(t));
    });
    setCrmSuggestions(matches.slice(0, 8));
  };

  const executeImpersonation = async () => {
    if (!selectedCrmClient || !selectedCrmClient.telefono) {
      alert("⚠️ El cliente debe tener un teléfono registrado para acceder a su portal."); return;
    }
    setIsImpersonating(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'impersonate_client', 
          payload: { adminEmail: currentUser.email, targetPhone: selectedCrmClient.telefono } 
        })
      });
      const res = await response.json();
      if (res.success) {
        // Save the generated session token to the browser
        localStorage.setItem('re_client_phone', res.phone);
        localStorage.setItem('re_client_token', res.token);
        
        // Redirect directly to the Netflix view!
        window.location.href = '/clientes'; 
      } else {
        alert("Error: " + res.error);
        setIsImpersonating(false);
      }
    } catch (e) {
      alert("Error de red.");
      setIsImpersonating(false);
    }
  };

  // Helper component for rendering list items
  const JobCard = ({ job, isPending }) => {
    const isVoice = job.eventId.startsWith('VOZ-');
    
    let borderClass = 'border-l-emerald-500';
    let bgClass = 'bg-white';
    let opacityClass = 'opacity-100';
    let badge = null;

    if (isPending) {
      if (isVoice) {
        borderClass = 'border-l-blue-500';
        bgClass = 'bg-blue-50/40'; 
        badge = <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ml-2 shrink-0">Voz</span>;
      } else {
        borderClass = 'border-l-yellow-400';
        bgClass = 'bg-yellow-50/40'; 
        badge = <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ml-2 shrink-0">Web</span>;
      }
    } else {
      if (job.isMine) {
        bgClass = 'bg-[#F0FFF4]'; // Light Green para trabajos propios
        borderClass = 'border-l-emerald-500';
      } else {
        bgClass = 'bg-gray-50';
        borderClass = 'border-l-gray-300';
        opacityClass = 'opacity-50 hover:opacity-80 grayscale-[20%]'; // Greyed out
      }
    }

    return (
      <div 
        onClick={() => handleJobClick(job.eventId)}
        className={`p-3 rounded-lg cursor-pointer transition-all border-l-[4px] shadow-sm hover:shadow-md mb-2
          ${selectedJobId === job.eventId ? 'bg-[#EBF8FF] brightness-95 opacity-100 grayscale-0 border-l-[#2B6CB0]' : `border-transparent ${bgClass} ${opacityClass}`}
          ${borderClass}
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-gray-800 text-[13px] leading-tight truncate flex-1 pointer-events-none">
            {isVoice && <span className="mr-1">🎙️</span>}
            {job.address}
          </h4>
          {badge}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <span className="flex items-center gap-1 truncate max-w-[50%] pointer-events-none"><User size={11} className="shrink-0"/> {job.client}</span>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevents opening the job checkout
                const cleanAddress = job.address.replace(' - Multiunidad', '').trim();
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`, '_blank');
              }}
              className="flex items-center justify-center bg-gray-100 hover:bg-[#E53B12]/10 text-gray-500 hover:text-[#E53B12] p-1.5 rounded-md transition-colors"
              title="Abrir en Maps"
            >
              <MapPin size={12} />
            </button>
            <span className="flex items-center gap-1 pointer-events-none"><Clock size={11} /> {job.date}</span>
          </div>
        </div>
      </div>
    );
  };

 return (
    <div className="flex flex-col h-[100dvh] bg-[#F0F2F5] overflow-hidden font-sans pt-[48px] md:pt-[64px]">
      
      {/* 🚀 GLOBAL NAV BAR */}
      <nav className="fixed top-0 left-0 w-full z-[100] text-white px-4 py-2 md:px-6 md:py-3 flex justify-between items-center font-bold tracking-wide shadow-sm border-b border-white/5 bg-[#1a1a1a]/95 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/">
            <img src="/Logos_RE!_naranja.png" alt="RE! Logo" className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
          </Link>
          <span className="hidden sm:inline text-xs text-gray-400 font-bold uppercase tracking-widest border-l border-white/20 pl-4 ml-2">Panel Interno</span>
        </div>
        
        {/* CENTER BUTTON (Admins Only) */}
        {userRole === 'admin' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button 
              onClick={() => { setShowCrmModal(true); setCrmSearchQuery(''); setSelectedCrmClient(null); }}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-1.5 md:px-6 md:py-2 rounded-full transition-all shadow-sm text-[10px] md:text-xs uppercase tracking-widest font-bold flex items-center gap-1.5"
            >
              <Search size={14} /> CRM
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={async () => {
              await logout();
              window.location.href = '/';
            }} 
            className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-rose-500/20 transition-all shadow-sm text-[10px] md:text-xs uppercase tracking-wider font-bold flex items-center gap-1.5"
          >
            <LogOut size={14}/> Salir
          </button>
        </div>
      </nav>

      {/* 🚀 CRM IMPERSONATION MODAL */}
      {showCrmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl relative">
            <div className="bg-[#2D2D2D] p-5 text-white flex justify-between items-center rounded-t-[24px]">
              <div>
                <h3 className="font-extrabold text-sm md:text-base uppercase tracking-wide">Buscador CRM</h3>
                <p className="text-[10px] opacity-70 font-medium">Ingresar al portal como cliente</p>
              </div>
              <button onClick={() => setShowCrmModal(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-5 md:p-6 space-y-4">
              <div className="relative" ref={crmWrapperRef}>
                <label className="block text-[10px] font-bold text-[#EB4511] uppercase tracking-widest mb-1.5">Buscar Cliente</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={crmSearchQuery} 
                    onChange={e => handleCrmSearch(e.target.value)} 
                    placeholder="Nombre, empresa, teléfono..." 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-9 text-sm font-medium outline-none focus:border-[#EB4511] transition-colors" 
                    autoComplete="off" 
                  />
                </div>
                {crmSuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {crmSuggestions.map((c, i) => (
                      <div key={i} onClick={() => { setSelectedCrmClient(c); setCrmSearchQuery(`${c.nombre} ${c.apellido}`); setCrmSuggestions([]); }} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                        <div className="font-bold text-gray-800 text-sm">{c.nombre} {c.apellido}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <Building size={10}/> <span className="truncate">{c.empresa || 'Particular'}</span>
                          <span className="text-gray-300">|</span> 
                          <Phone size={10}/> <span>{c.telefono || 'Sin tel'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCrmClient && (
                <div className="bg-[#EBF8FF] border border-[#90CDF4] rounded-xl p-4 mt-2 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold text-[#2B6CB0] uppercase tracking-widest mb-1">Cliente Seleccionado</div>
                  <div className="font-black text-gray-800 text-lg leading-tight">{selectedCrmClient.nombre} {selectedCrmClient.apellido}</div>
                  <div className="text-xs text-gray-600 font-medium mt-1">🏢 {selectedCrmClient.empresa || 'Particular'}</div>
                  <div className="text-xs text-gray-600 font-medium mt-0.5">📱 {selectedCrmClient.telefono || 'Sin teléfono registrado'}</div>
                  
                  <button 
                    onClick={executeImpersonation}
                    disabled={isImpersonating}
                    className="w-full mt-4 bg-[#2B6CB0] hover:bg-[#2C5282] text-white font-extrabold uppercase tracking-widest text-[11px] py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isImpersonating ? <><Loader2 size={16} className="animate-spin" /> Conectando...</> : 'Acceder al Portal'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR: Master List (ALWAYS HIDDEN ON MOBILE NOW) */}
        <div className="hidden md:flex w-80 bg-white border-r border-gray-200 flex-col shadow-xl z-20 transition-all duration-300 flex-shrink-0">

          {/* Lists */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5 bg-gray-50/50 pt-5">
          {loading ? (
            <LoadingLogo message="Sincronizando..." />
          ) : (
            <>
              {/* Web Requests (Admin Only) */}
              {userRole === 'admin' && (
                <div>
                  <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-1">
                    <Inbox size={14} className="text-yellow-500"/> Solicitudes Web
                    <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full text-[9px] ml-auto">{pendingJobs.length}</span>
                  </h2>
                  {pendingJobs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic mb-4 px-1">No hay solicitudes pendientes.</p>
                  ) : (
                    <div className="mb-5">
                      {pendingJobs.map(job => <JobCard key={job.eventId} job={job} isPending={true} />)}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmed Bookings with Date Dividers */}
              <div>
                <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-1">
                  <CalendarDays size={14} className="text-green-500"/> Reservas
                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[9px] ml-auto">{confirmedJobs.length}</span>
                </h2>
                {confirmedJobs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-1">No hay reservas confirmadas.</p>
                ) : (
                  <div>
                    {
                      // 1. Sort by absolute timestamp
                      [...confirmedJobs].sort((a, b) => parseDateToMs(a.date, a.time) - parseDateToMs(b.date, b.time))
                      .map((job, index, array) => {
                        // 2. Check if the date string changed from the previous item
                        const prevJob = array[index - 1];
                        const showDivider = !prevJob || prevJob.date !== job.date;
                        
                        return (
                          <React.Fragment key={job.eventId}>
                            {showDivider && index > 0 && (
                              <div className="flex items-center my-3">
                                <div className="h-px bg-gray-200 flex-1"></div>
                              </div>
                            )}
                            <JobCard job={job} isPending={false} />
                          </React.Fragment>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 🚀 DESKTOP NAVIGATION MENU */}
        <div className="px-3 pb-3 bg-gray-50/50 hidden md:flex flex-col gap-2 border-t border-gray-200 pt-3">
          
          <button 
            onClick={() => handleJobClick(null)} 
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
              ${!selectedJobId ? 'bg-[#EB4511] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#EB4511]'}`}
          >
            <LayoutDashboard size={16} /> Mi Panel
          </button>

          {userRole === 'admin' && (
            <>
              <button 
                onClick={() => handleJobClick('ASIGNACIONES')} 
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
                  ${selectedJobId === 'ASIGNACIONES' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#EB4511]'}`}
              >
                <ClipboardList size={16} /> Asignaciones
              </button>
              <button 
                onClick={() => handleJobClick('COBRANZAS')} 
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
                  ${selectedJobId === 'COBRANZAS' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#EB4511]'}`}
              >
                <Banknote size={16} /> Cobranzas
              </button>
            </>
          )}

          {userRole === 'admin' && (
            <button 
              onClick={() => handleJobClick('AI')} 
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
                ${selectedJobId === 'AI' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#EB4511]'}`}
            >
              <Bot size={16} /> Igor
            </button>
          )}

          <button 
            onClick={() => handleJobClick('NEW')} 
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
              ${selectedJobId === 'NEW' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-[#EB4511] text-white hover:bg-[#c42e0d]'}`}
          >
            <Plus size={16} /> Nueva Reserva
          </button>
        </div>
      </div>

      {/* 🚀 MOBILE NAVIGATION MENU (Sticky Bottom) - Hidden when a job/tool is active */}
      {!selectedJobId && (
        <div className="fixed bottom-0 left-0 w-full z-50 p-3 bg-white border-t border-gray-100 md:hidden pb-safe flex gap-2">
          {userRole === 'admin' && (
            <>
              <button 
                onClick={() => handleJobClick('ASIGNACIONES')} 
                className={`p-3 rounded-xl transition-colors flex items-center justify-center shrink-0
                  ${selectedJobId === 'ASIGNACIONES' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:text-[#EB4511]'}`}
                title="Asignaciones"
              >
                <ClipboardList size={20} />
              </button>
              <button 
                onClick={() => handleJobClick('COBRANZAS')} 
                className={`p-3 rounded-xl transition-colors flex items-center justify-center shrink-0
                  ${selectedJobId === 'COBRANZAS' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:text-[#EB4511]'}`}
                title="Cobranzas"
              >
                <Banknote size={20} />
              </button>
              <button 
                onClick={() => handleJobClick('AI')} 
                className={`p-3 rounded-xl transition-colors flex items-center justify-center shrink-0
                  ${selectedJobId === 'AI' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:text-[#EB4511]'}`}
                title="Igor Asistente IA"
              >
                <Bot size={20} />
              </button>
            </>
          )}

          <button 
            onClick={() => handleJobClick('NEW')} 
            className="flex-1 bg-[#EB4511] text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#c42e0d] transition-colors shadow-md flex items-center justify-center gap-1.5 ml-2"
          >
            <Plus size={18} strokeWidth={3} /> Reserva
          </button>
        </div>
      )}

      {/* MAIN AREA: Unified Form or Staff Dashboard */}
      <div className="flex-1 bg-[#F0F2F5] relative overflow-y-auto w-full">
        <div className={`h-full w-full ${!selectedJobId ? 'pb-20 md:pb-0' : 'pb-0 md:p-6 flex items-center justify-center'}`}>
           {!selectedJobId ? (
             <StaffDashboard 
               onOpenJob={handleJobClick} 
               pendingJobs={pendingJobs} 
               confirmedJobs={confirmedJobs} 
             />
           ) : selectedJobId === 'ASIGNACIONES' && userRole === 'admin' ? (
             <Asignaciones />
           ) : selectedJobId === 'COBRANZAS' && userRole === 'admin' ? (
             <Cobranzas />
           ) : selectedJobId === 'AI' && userRole === 'admin' ? (
             <AiAssistant />
           ) : (
             <UnifiedForm 
               jobId={selectedJobId} 
               onCancel={() => setSelectedJobId(null)} 
               onSuccess={handleSuccess}
               globalClientDb={clientDb}
             />
           )}
        </div>
      </div>

      </div> {/* Cierra el contenedor interior flex-1 */}

    </div>
  );
}