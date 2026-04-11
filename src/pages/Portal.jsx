import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, CalendarDays, Inbox, MapPin, Clock, Loader2, Plus, User } from 'lucide-react';
import UnifiedForm from '../components/UnifiedForm';

// Make sure this is your actual GAS URL!
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

export default function Portal() {
  const { currentUser, userRole, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const[pendingJobs, setPendingJobs] = useState([]);
  const [confirmedJobs, setConfirmedJobs] = useState([]);
  const[selectedJobId, setSelectedJobId] = useState(null);

  // Extract fetch logic so we can call it on demand
  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_portal_data_v2' }) // 🚀 NOW USING V2 (Blazing Fast)
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

  // NEW: Closes the form AND refreshes the sidebar
  const handleSuccess = () => {
    setSelectedJobId(null);
    fetchPortalData();
  };

  const handleJobClick = (eventId) => {
    setSelectedJobId(eventId);
    // In the next step, this will fetch the detailed data and open the Unified Form
  };

  // Helper component for rendering list items
  const JobCard = ({ job, isPending }) => (
    <div 
      onClick={() => handleJobClick(job.eventId)}
      className={`p-3 rounded-lg cursor-pointer transition-all border-l-[3px] shadow-sm hover:shadow-md mb-2
        ${selectedJobId === job.eventId ? 'bg-white border-[#EB4511] ring-1 ring-[#EB4511]/20' : 'bg-white border-transparent hover:bg-gray-50'}
        ${isPending ? 'border-l-yellow-400' : 'border-l-green-500'}
      `}
    >
      <h4 className="font-bold text-gray-800 text-[13px] leading-tight mb-1 truncate">{job.address}</h4>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1 truncate max-w-[60%]"><User size={10} className="shrink-0"/> {job.client}</span>
        <span className="flex items-center gap-1 shrink-0"><Clock size={10} /> {job.date}</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-[#F0F2F5] overflow-hidden font-sans">
      
      {/* SIDEBAR: Master List */}
      <div className={`bg-white border-r border-gray-200 flex-col shadow-xl z-20 transition-all duration-300
        w-full md:w-80 flex-shrink-0
        ${selectedJobId ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="p-4 md:p-5 bg-[#EB4511] text-white flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-extrabold tracking-widest">RE!</h1>
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{userRole} PORTAL</p>
          </div>
          <button onClick={logout} className="p-2 hover:bg-black/20 rounded-full transition-colors" title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-sm font-bold uppercase tracking-wider">Sincronizando...</span>
            </div>
          ) : (
            <>
              {/* Web Requests */}
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

        {/* 🚀 THE MOBILE "NUEVA RESERVA" STICKY BUTTON */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0 md:hidden pb-safe">
          <button 
            onClick={() => handleJobClick('NEW')} 
            className="w-full bg-[#EB4511] text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#c42e0d] transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Nueva Reserva
          </button>
        </div>

      </div>

      {/* MAIN AREA: Unified Form */}

      {/* MAIN AREA: Unified Form */}
      <div className={`flex-1 bg-[#F0F2F5] relative overflow-y-auto w-full
        ${!selectedJobId ? 'hidden md:block' : 'block'}
      `}>
        <div className="p-0 md:p-6 h-full flex items-center justify-center">
           {!selectedJobId ? (
             <div className="text-center text-gray-400 hidden md:block">
               <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CalendarDays size={32} className="text-gray-400" />
               </div>
               <h3 className="text-lg font-bold text-gray-600 mb-1">Selecciona una reserva</h3>
               <p className="text-sm">O presiona el botón para crear una nueva.</p>
               
               <button 
  onClick={() => setSelectedJobId('NEW')} 
  className="mt-6 bg-[#EB4511] text-white px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#c42e0d] transition-colors shadow-lg inline-flex items-center gap-2"
>
  <Plus size={18} /> Nueva Reserva
</button>
             </div>
           ) : (
             <UnifiedForm 
               jobId={selectedJobId} 
               onCancel={() => setSelectedJobId(null)} 
               onSuccess={handleSuccess}
             />
           )}
        </div>
      </div>

    </div>
  );
}