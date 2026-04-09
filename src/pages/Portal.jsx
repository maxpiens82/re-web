import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, CalendarDays, Inbox, MapPin, Clock, Loader2, Plus } from 'lucide-react';
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
        body: JSON.stringify({ action: 'get_portal_data' })
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
      className={`p-4 rounded-xl cursor-pointer transition-all border-l-4 shadow-sm hover:shadow-md
        ${selectedJobId === job.eventId ? 'bg-white border-[#EB4511] ring-1 ring-[#EB4511]/20' : 'bg-gray-50 border-transparent hover:bg-white'}
        ${isPending ? 'border-l-yellow-400' : 'border-l-green-500'}
      `}
    >
      <h4 className="font-bold text-gray-800 text-sm mb-1 truncate">{job.address}</h4>
      <div className="flex flex-col gap-1 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Clock size={12} /> {job.date} - {job.time}</span>
        <span className="flex items-center gap-1 truncate"><MapPin size={12} /> {job.client} ({job.company})</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden font-sans">
      
      {/* SIDEBAR: Master List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl z-10">
        {/* Header */}
        <div className="p-5 bg-[#EB4511] text-white flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-widest">RE!</h1>
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{userRole} PORTAL</p>
          </div>
          <button onClick={logout} className="p-2 hover:bg-black/20 rounded-full transition-colors" title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-sm font-bold uppercase tracking-wider">Sincronizando...</span>
            </div>
          ) : (
            <>
              {/* Web Requests */}
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Inbox size={14} className="text-yellow-500"/> Solicitudes Web
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] ml-auto">{pendingJobs.length}</span>
                </h2>
                {pendingJobs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic mb-4">No hay solicitudes pendientes.</p>
                ) : (
                  <div className="space-y-3 mb-6">
                    {pendingJobs.map(job => <JobCard key={job.eventId} job={job} isPending={true} />)}
                  </div>
                )}
              </div>

              {/* Confirmed Bookings */}
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CalendarDays size={14} className="text-green-500"/> Reservas
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] ml-auto">{confirmedJobs.length}</span>
                </h2>
                {confirmedJobs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No hay reservas confirmadas.</p>
                ) : (
                  <div className="space-y-3">
                    {confirmedJobs.map(job => <JobCard key={job.eventId} job={job} isPending={false} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN AREA: Unified Form */}
      <div className="flex-1 bg-[#F0F2F5] relative overflow-y-auto">
        <div className="p-6 h-full flex items-center justify-center">
           {!selectedJobId ? (
             <div className="text-center text-gray-400">
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