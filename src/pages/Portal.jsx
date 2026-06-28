import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, CalendarDays, Inbox, MapPin, Clock, Loader2, Plus, User, Bot, Layers, LayoutDashboard, WalletCards } from 'lucide-react';
import UnifiedForm from '../components/UnifiedForm';
import LoadingLogo from '../components/LoadingLogo';
import AiAssistant from '../components/AiAssistant';
import StaffDashboard from '../components/StaffDashboard';
import Asignaciones from '../components/Asignaciones';
import Cobranzas from '../components/Cobranzas';

// Make sure this is your actual GAS URL!
const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

export default function Portal() {
  const { currentUser, userRole, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [confirmedJobs, setConfirmedJobs] = useState([]);
  
  // Leemos el hash inicial (si el usuario recarga la página estando adentro de un trabajo)
  const initialHash = window.location.hash ? window.location.hash.substring(1) : null;
  const [selectedJobId, setSelectedJobId] = useState(initialHash);

  // Extract fetch logic so we can call it on demand
  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'get_portal_data_v2',
          payload: { email: currentUser?.email }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setPendingJobs(data.pending || []);
        setConfirmedJobs(data.confirmed || []);
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
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={logout} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-rose-500/20 transition-all shadow-sm text-[10px] md:text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
            <LogOut size={14}/> Salir
          </button>
        </div>
      </nav>

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

              {/* Confirmed Bookings */}
              <div>
                <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-1">
                  <CalendarDays size={14} className="text-green-500"/> Reservas
                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[9px] ml-auto">{confirmedJobs.length}</span>
                </h2>
                {confirmedJobs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-1">No hay reservas confirmadas.</p>
                ) : (
                  <div>
                    {confirmedJobs.map(job => <JobCard key={job.eventId} job={job} isPending={false} />)}
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
              ${!selectedJobId ? 'bg-[#2B6CB0] text-white shadow-md' : 'bg-white border border-gray-200 text-[#2B6CB0] hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={16} /> Mi Panel
          </button>

          {userRole === 'admin' && (
            <>
              <button 
                onClick={() => handleJobClick('ASIGNACIONES')} 
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
                  ${selectedJobId === 'ASIGNACIONES' ? 'bg-[#2B6CB0] text-white shadow-md' : 'bg-white border border-gray-200 text-[#2B6CB0] hover:bg-gray-50'}`}
              >
                <Layers size={16} /> Asignaciones
              </button>
              <button 
                onClick={() => handleJobClick('COBRANZAS')} 
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
                  ${selectedJobId === 'COBRANZAS' ? 'bg-[#EB4511] text-white shadow-md' : 'bg-white border border-gray-200 text-[#EB4511] hover:bg-orange-50'}`}
              >
                <WalletCards size={16} /> Cobranzas
              </button>
            </>
          )}

          {userRole === 'admin' && (
            <button 
              onClick={() => handleJobClick('AI')} 
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-sm flex items-center justify-center gap-2
                ${selectedJobId === 'AI' ? 'bg-[#2B6CB0] text-white shadow-md' : 'bg-white border border-gray-200 text-[#2B6CB0] hover:bg-gray-50'}`}
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

      {/* 🚀 MOBILE NAVIGATION MENU (Sticky Bottom) - Removed the Inbox & Mi Panel Buttons */}
      <div className="fixed bottom-0 left-0 w-full z-50 p-3 bg-white border-t border-gray-100 md:hidden pb-safe flex gap-2">
        {userRole === 'admin' && (
          <>
            <button 
              onClick={() => handleJobClick('ASIGNACIONES')} 
              className={`p-3 rounded-xl transition-colors shadow-sm flex items-center justify-center shrink-0
                ${selectedJobId === 'ASIGNACIONES' ? 'bg-[#2B6CB0] text-white' : 'bg-gray-100 text-[#2B6CB0]'}`}
              title="Asignaciones"
            >
              <Layers size={20} />
            </button>
            <button 
              onClick={() => handleJobClick('COBRANZAS')} 
              className={`p-3 rounded-xl transition-colors shadow-sm flex items-center justify-center shrink-0
                ${selectedJobId === 'COBRANZAS' ? 'bg-[#EB4511] text-white' : 'bg-gray-100 text-[#EB4511]'}`}
              title="Cobranzas"
            >
              <WalletCards size={20} />
            </button>
          </>
        )}

        {userRole === 'admin' && (
          <button 
            onClick={() => handleJobClick('AI')} 
            className={`p-3 rounded-xl transition-colors shadow-sm flex items-center justify-center shrink-0
              ${selectedJobId === 'AI' ? 'bg-[#2B6CB0] text-white' : 'bg-gray-100 text-[#2B6CB0]'}`}
            title="Igor Asistente IA"
          >
            <Bot size={20} />
          </button>
        )}

        <button 
          onClick={() => handleJobClick('NEW')} 
          className="flex-1 bg-[#EB4511] text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#c42e0d] transition-colors shadow-sm flex items-center justify-center gap-1"
        >
          <Plus size={16} /> Reserva
        </button>
      </div>

      {/* MAIN AREA: Unified Form or Staff Dashboard */}
      <div className="flex-1 bg-[#F0F2F5] relative overflow-y-auto w-full">
        <div className={`h-full ${!selectedJobId || selectedJobId === 'AI' || selectedJobId === 'ASIGNACIONES' ? 'w-full pb-20 md:pb-0' : 'p-0 md:p-6 pb-20 md:pb-6 flex items-center justify-center'}`}>
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
             />
           )}
        </div>
      </div>

      </div> {/* Cierra el contenedor interior flex-1 */}

    </div>
  );
}