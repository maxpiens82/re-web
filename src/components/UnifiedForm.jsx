import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Camera, Video, Clapperboard, Mic, Map as MapIcon, Compass, Plane, Crosshair,
  MapPin, Calendar, User, Building, Mail, Phone, CheckCircle2,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Search, Briefcase
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = "AIzaSyCfHCPO8Yb-rYqxMWToYq7GsV3VZ1iz0EE"; 
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

// Generate dates from 15 days ago to 90 days ahead
const generateDates = () => {
  const options = [];
  const now = new Date();
  now.setDate(now.getDate() - 15); 
  for (let i = 0; i < 105; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).substring(0, 3).toUpperCase().replace('.', ''); 
    const dayNumber = d.getDate();
    const monthNumber = String(d.getMonth() + 1).padStart(2, '0');
    options.push({
      id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dateObj: d, dayName, dayNumber,
      fullFormat: `${dayName} ${dayNumber}/${monthNumber}`
    });
  }
  return options;
};

const timeOptions = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const normalizeText = (text) => text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "") : "";

export default function UnifiedForm({ jobId, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data State
  const [db, setDb] = useState(null);
  const [config, setConfig] = useState(null);
  const [clientDb, setClientDb] = useState([]);
  const [uniqueCompanies, setUniqueCompanies] = useState([]);
  
  // Form State
  const [selectedServices, setSelectedServices] = useState([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [dateOptions] = useState(generateDates);
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState('1 Hora');
  
  const [formData, setFormData] = useState({
    name: '', lastName: '', company: '', email: '', phone: '', address: '', instructions: '',
    realizador: '', observaciones: '', extrasDesc: '', costoExtras: '', pagoEditor: ''
  });

  // Validation State
  const [clientState, setClientState] = useState('new'); 
  const [companyState, setCompanyState] = useState('new'); 
  const [isAddressValid, setIsAddressValid] = useState(true);
  
  // Autocomplete UI State
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  
  // Refs
  const dateScrollRef = useRef(null);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const clientWrapperRef = useRef(null);
  const companyWrapperRef = useRef(null);

  const brandColor = "#EB4511"; 

  const isNewBooking = jobId === 'NEW';
  const isWebRequest = jobId.startsWith('REQ-');
  const modeTitle = isNewBooking ? "Nueva Reserva" : (isWebRequest ? "Aprobar Solicitud Web" : "Detalle de Reserva");

  // ==========================================
  // 1. FAST FETCH & HYDRATE DATA
  // ==========================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchPromises = [
          fetch(GAS_API_URL + "?api=prices").then(r => r.json()),
          fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_portal_data' }) }).then(r => r.json())
        ];

        if (!isNewBooking) {
          fetchPromises.push(
            fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_booking_details', payload: { eventId: jobId } }) }).then(r => r.json())
          );
        }

        const results = await Promise.all(fetchPromises);
        const priceData = results[0];
        const portalData = results[1];
        const detailData = isNewBooking ? { success: true, data: {} } : results[2];

        if (priceData.success && detailData.success && portalData.success) {
          const mappedServices = priceData.services.map(s => ({ id: s.id, label: s.id, price: s.price, isFixed: s.isFixed }));
          const mappedMultipliers = priceData.multipliers.map((m, idx) => {
            let label = `Hasta ${m.sheetValue}m²`;
            if (idx > 0) label = `${parseInt(priceData.multipliers[idx - 1].sheetValue) + 1} a ${m.sheetValue}m²`;
            if (idx === priceData.multipliers.length - 1) label = `Más de ${priceData.multipliers[idx - 1].sheetValue}m²`;
            return { id: `m${m.sheetValue}`, label, value: m.value, sheetValue: m.sheetValue };
          });
          
          setDb({ services: mappedServices, multipliers: mappedMultipliers, discountThreshold: 3, discountAmount: 5000 });
          setConfig(portalData.config || {});
          
          const clients = portalData.clients || [];
          setClientDb(clients);
          
          const rawEmpresas = clients.map(c => c.empresa).filter(e => e && e.trim() !== '');
          rawEmpresas.push('Particular');
          const uniqueComps = [...new Set(rawEmpresas)].sort();
          setUniqueCompanies(uniqueComps);

          if (isNewBooking) {
            const today = new Date();
            const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            setSelectedDateObj(dateOptions.find(d => d.id === todayId) || dateOptions[15]);
            setClientState('new');
            setCompanyState('new');
          } else {
            hydrateForm(detailData.data, mappedMultipliers, clients, uniqueComps);
          }
        } else {
          setError("Error cargando datos desde el servidor.");
        }
      } catch (err) {
        console.error(err);
        setError("Error de conexión.");
      } finally {
        setLoading(false);
      }
    };
    if (jobId) loadData();
  }, [jobId]);

  const hydrateForm = (data, multipliers, clients, uniqueComps) => {
    const srvs = [];
    ['FOTO','VIDEO','REEL','TH','PLANO','TOUR','DRONE','FPV','EXTRAS'].forEach(k => {
      if (data[k.toLowerCase()] || data[k === 'EXTRAS' ? 'extrasService' : '']) srvs.push(k);
    });
    setSelectedServices(srvs);

    const matchedDate = dateOptions.find(d => d.id === data.fecha);
    if (matchedDate) setSelectedDateObj(matchedDate);
    setSelectedTime(data.hora);

    const multObj = multipliers.find(m => m.sheetValue == data.metrosCuadrados);
    if (multObj) setMultiplier(multObj.value);

    setFormData({
      name: data.nombre || '', lastName: data.apellido || '', company: data.empresa || '',
      email: data.email || '', phone: data.telefono ? String(data.telefono).replace(/[^0-9+]/g, '') : '',
      address: data.locacionFormateada || data.locacion || '', instructions: data.indicaciones || '',
      realizador: data.realizacion || '', observaciones: data.observaciones || '',
      extrasDesc: data.extrasDescripcion || '', costoExtras: data.costoExtras || '', pagoEditor: data.pagoEditorExtras || ''
    });

    const existsInDb = clients.some(c => (c.email && c.email === data.email) || (c.nombre === data.nombre && c.apellido === data.apellido));
    setClientState(existsInDb ? 'existing' : 'new');
    
    const safeCompany = (data.empresa || '').toLowerCase().trim();
    if (safeCompany && uniqueComps.map(c=>c.toLowerCase()).includes(safeCompany)) setCompanyState('existing');
    else setCompanyState('new');
  };

  // ==========================================
  // 2. AUTO-SCROLL TO SELECTED DATE
  // ==========================================
  useEffect(() => {
    if (!loading && selectedDateObj && dateScrollRef.current) {
      setTimeout(() => {
        const selectedEl = dateScrollRef.current.querySelector(`[data-date="${selectedDateObj.id}"]`);
        if (selectedEl) {
          selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
  }, [loading, selectedDateObj]);

  // ==========================================
  // 3. GOOGLE MAPS AUTOCOMPLETE
  // ==========================================
  useEffect(() => {
    if (loading) return;
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=es`;
      script.async = true; script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      initAutocomplete();
    }

    function initAutocomplete() {
      if (window.google && addressInputRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, { types: ['address'], componentRestrictions: { country: 'ar' } });
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setFormData(prev => ({ ...prev, address: place.formatted_address }));
            setIsAddressValid(true);
          } else { setIsAddressValid(false); }
        });
      }
    }
  }, [loading]);

  // ==========================================
  // 4. CLOSING DROPDOWNS ON CLICK OUTSIDE
  // ==========================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientWrapperRef.current && !clientWrapperRef.current.contains(event.target)) {
        setClientSuggestions([]);
      }
      if (companyWrapperRef.current && !companyWrapperRef.current.contains(event.target)) {
        setCompanySuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // 5. CRM LOGIC & HANDLERS
  // ==========================================
  const handleClientSearch = (query) => {
    setClientSearchQuery(query);
    const normalized = normalizeText(query);
    if (normalized.length < 2) { setClientSuggestions([]); return; }
    
    const terms = normalized.split(/\s+/);
    const matches = clientDb.filter(c => {
      const raw = `${c.nombre} ${c.apellido} ${c.empresa} ${c.email} ${c.telefono}`;
      return terms.every(t => normalizeText(raw).includes(t));
    });
    setClientSuggestions(matches.slice(0, 10));
  };

  const selectClient = (c) => {
    setFormData(prev => ({ ...prev, name: c.nombre, lastName: c.apellido, company: c.empresa, email: c.email, phone: c.telefono }));
    setClientState('existing');
    setCompanyState('existing');
    setClientSearchQuery('');
    setClientSuggestions([]);
  };

  const handleCompanySearch = (query) => {
    setFormData(prev => ({ ...prev, company: query }));
    const val = query.toLowerCase().trim();
    if (val === '' || !uniqueCompanies.map(c=>c.toLowerCase()).includes(val)) setCompanyState('new');
    else setCompanyState('existing');

    if (val.length < 1) { setCompanySuggestions(uniqueCompanies.slice(0, 10)); return; }
    setCompanySuggestions(uniqueCompanies.filter(c => c.toLowerCase().includes(val)).slice(0, 10));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (['name', 'lastName', 'email', 'phone'].includes(name)) {
      if (clientState === 'existing') setClientState('modified');
      else if (clientState !== 'modified') setClientState('new');
    }
    
    if (name === 'address') setIsAddressValid(false);
  };

  const { total, discountApplied, baseCount } = useMemo(() => {
    if (!db) return { total: 0, discountApplied: 0, baseCount: 0 };
    let baseMult = 0; let baseFixed = 0; let serviceCount = 0;
    selectedServices.forEach(id => {
      const srv = db.services.find(s => s.id === id);
      if (srv) { if (srv.isFixed) baseFixed += srv.price; else { baseMult += srv.price; serviceCount++; } }
    });
    let discount = serviceCount > db.discountThreshold ? (serviceCount - db.discountThreshold) * db.discountAmount : 0;
    return { total: ((baseMult - discount) * multiplier) + baseFixed + (Number(formData.costoExtras) || 0), discountApplied: discount * multiplier, baseCount: serviceCount };
  }, [selectedServices, multiplier, db, formData.costoExtras]);

  const toggleService = (id) => setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  const scrollLeft = () => dateScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
  const scrollRight = () => dateScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' });

  // EXACT LEGACY CSS STYLES FOR VALIDATION INPUTS (Bulletproof Hex Colors)
  const styleNew = { backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#7F1D1D' };
  const styleExisting = { backgroundColor: '#F0FFF4', border: '1px solid #C6F6D5', color: '#14532D' };
  const styleModified = { backgroundColor: '#FFFFF0', border: '1px solid #FEFCBF', color: '#744210' };

  const getClientStyle = () => clientState === 'new' ? styleNew : clientState === 'existing' ? styleExisting : styleModified;
  const getCompanyStyle = () => companyState === 'new' ? styleNew : companyState === 'existing' ? styleExisting : styleModified;

  if (loading || !db) return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white rounded-3xl shadow-xl">
      <Loader2 className="animate-spin mb-4" style={{ color: brandColor }} size={40} />
      <p className="font-bold uppercase text-gray-500 tracking-wider">Cargando Formulario...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white rounded-3xl shadow-xl text-red-500 p-8 text-center">
      <AlertCircle size={40} className="mb-4" />
      <p className="font-bold">{error}</p>
      <button onClick={onCancel} className="mt-6 px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold uppercase transition-colors">Volver</button>
    </div>
  );

  return (
    <div className="bg-[#F0F2F5] w-full max-w-4xl mx-auto rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
      
      {/* HEADER */}
      <div className="px-8 py-5 border-b border-gray-200 flex justify-between items-center bg-white z-10 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-wide" style={{ color: brandColor }}>
            {modeTitle}
          </h2>
          {!isNewBooking && <p className="text-xs text-gray-400 mt-1 font-bold tracking-wider">ID: {jobId}</p>}
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:bg-gray-100 font-bold px-4 py-2 rounded-xl border border-gray-200 transition-colors">
          ✕ Cerrar
        </button>
      </div>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        
        {/* STAFF PANEL */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
          <div className="mb-5 flex items-center gap-2">
            <Briefcase size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold uppercase text-indigo-800">Panel Interno (Staff)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Productor Asignado</label>
              <select name="realizador" value={formData.realizador} onChange={handleInputChange} className="w-full bg-[#F4F4F5] border-none text-gray-800 py-3.5 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-medium outline-none">
                <option value="">Seleccionar Productor...</option>
                {config?.realizadoresList?.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Observaciones Internas</label>
              <input type="text" name="observaciones" value={formData.observaciones} onChange={handleInputChange} placeholder="Notas para el equipo..." className="w-full bg-[#F4F4F5] border-none text-gray-800 py-3.5 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-medium outline-none" />
            </div>
          </div>

          {selectedServices.includes('EXTRAS') && (
            <div className="mt-5 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Detalle de Extras</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" name="extrasDesc" value={formData.extrasDesc} onChange={handleInputChange} placeholder="Descripción..." className="w-full bg-white border border-indigo-100 py-3 px-4 rounded-xl font-medium outline-none md:col-span-2" />
                <input type="number" name="costoExtras" value={formData.costoExtras} onChange={handleInputChange} placeholder="$ Cobro Cliente" className="w-full bg-white border border-indigo-100 py-3 px-4 rounded-xl font-medium outline-none" />
              </div>
            </div>
          )}
        </section>

        {/* 1. CLIENTE & CRM (EXACT LEGACY REPLICA WITH SEPARATE SEARCH) */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-bold uppercase" style={{ color: brandColor }}>Cliente & Contacto</h2>
            <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1 rounded-md transition-colors" onClick={() => setClientState('existing')}>💾 Forzar Guardado</button>
          </div>

          {/* DEDICATED SEARCH BAR */}
          <div className="mb-6 relative" ref={clientWrapperRef}>
            <label className="block text-xs font-bold text-[#2B6CB0] uppercase tracking-widest mb-2 flex items-center gap-1">
              <Search size={14} /> Buscar Cliente Existente
            </label>
            <input 
              type="text" 
              value={clientSearchQuery}
              onChange={(e) => handleClientSearch(e.target.value)}
              onFocus={() => handleClientSearch(clientSearchQuery)}
              placeholder="Escribir nombre, empresa, email o teléfono..." 
              className="w-full bg-white border border-gray-200 py-3.5 px-4 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-all shadow-sm"
              autoComplete="off"
            />
            {clientSuggestions.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                {clientSuggestions.map((c, i) => (
                  <div key={i} onClick={() => selectClient(c)} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                    <div className="font-bold text-gray-800">{c.nombre} {c.apellido}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                       <Building size={12}/> {c.empresa || 'Particular'} <span className="text-gray-300">|</span> <Phone size={12}/> {c.telefono || 'Sin teléfono'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RED/YELLOW/GREEN INPUTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full py-3.5 px-4 rounded-xl font-medium outline-none transition-all" style={getClientStyle()} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Apellido</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full py-3.5 px-4 rounded-xl font-medium outline-none transition-all" style={getClientStyle()} />
            </div>
            
            {/* EMPRESA WITH EMBEDDED AUTOCOMPLETE */}
            <div className="relative" ref={companyWrapperRef}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Empresa</label>
              <input type="text" name="company" value={formData.company} onChange={(e) => { handleInputChange(e); handleCompanySearch(e.target.value); }} onFocus={() => handleCompanySearch(formData.company)} placeholder="Seleccionar o escribir..." className="w-full py-3.5 px-4 rounded-xl font-medium outline-none transition-all" style={getCompanyStyle()} autoComplete="off" />
              {companySuggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-40 max-h-48 overflow-y-auto">
                  {companySuggestions.map((c, i) => (
                    <div key={i} onClick={() => { setFormData(prev => ({...prev, company: c})); setCompanySuggestions([]); setCompanyState('existing'); }} className="p-3 hover:bg-gray-50 cursor-pointer font-medium text-sm border-b border-gray-50">{c}</div>
                  ))}
                </div>
              )}
            </div>
            
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Teléfono</label><input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full py-3.5 px-4 rounded-xl font-medium outline-none transition-all" style={getClientStyle()} /></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full py-3.5 px-4 rounded-xl font-medium outline-none transition-all" style={getClientStyle()} /></div>
          </div>
        </section>

        {/* 2. LOCACIÓN */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6"><h2 className="text-lg font-bold uppercase" style={{ color: brandColor }}>Locación</h2></div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Metros Cuadrados</label>
              <select value={multiplier} onChange={(e) => setMultiplier(parseFloat(e.target.value))} className="w-full bg-[#F4F4F5] border-none text-gray-800 py-3.5 px-4 rounded-xl outline-none font-medium">
                {db.multipliers.map(m => <option key={m.id} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Dirección del Servicio {!isAddressValid && formData.address && <span className="text-red-500 normal-case ml-2">(Sugerencia de Maps no seleccionada)</span>}</label>
              <div className="relative">
                <MapPin size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isAddressValid ? 'text-green-500' : 'text-gray-400'}`} />
                <input type="text" ref={addressInputRef} name="address" value={formData.address} onChange={handleInputChange} className={`w-full bg-[#F4F4F5] py-3.5 pl-11 pr-4 rounded-xl font-medium outline-none transition-all ${isAddressValid ? 'ring-1 ring-[#4bbf73]' : ''}`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Indicaciones (Piso, Depto)</label>
              <input type="text" name="instructions" value={formData.instructions} onChange={handleInputChange} className="w-full bg-[#F4F4F5] border-none py-3.5 px-4 rounded-xl outline-none font-medium" />
            </div>
          </div>
        </section>

        {/* 3. SERVICIOS */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6"><h2 className="text-lg font-bold uppercase" style={{ color: brandColor }}>Servicios Contratados</h2></div>
          <div className="flex flex-wrap gap-3">
            {db.services.map((srv) => {
              const isSelected = selectedServices.includes(srv.id);
              return (
                <button
                  key={srv.id} onClick={() => toggleService(srv.id)}
                  className={`w-[85px] md:w-[100px] h-[40px] rounded-full font-bold text-[11px] md:text-sm tracking-wide transition-all select-none
                    ${isSelected ? `text-white shadow-[0_4px_14px_rgba(235,69,17,0.35)] -translate-y-0.5` : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'}`}
                  style={isSelected ? { backgroundColor: brandColor } : {}}
                >
                  {srv.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. FECHA Y HORA */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6"><h2 className="text-lg font-bold uppercase" style={{ color: brandColor }}>Fecha y Hora</h2></div>
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 md:gap-4">
                <button onClick={scrollLeft} className="w-10 h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronLeft size={20}/></button>
                <div ref={dateScrollRef} className="flex flex-1 gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth py-2 px-1 [&::-webkit-scrollbar]:hidden">
                  {dateOptions.map(d => {
                    const isSelected = selectedDateObj?.id === d.id;
                    return (
                      <button data-date={d.id} key={d.id} onClick={() => setSelectedDateObj(d)} className={`flex flex-col items-center justify-center w-[72px] h-[72px] shrink-0 rounded-2xl border-2 transition-all select-none snap-start ${isSelected ? `shadow-md bg-white -translate-y-0.5` : 'border-transparent bg-[#F4F4F5]'}`} style={isSelected ? { borderColor: brandColor } : {}}>
                        <span className={`text-[11px] font-bold uppercase ${isSelected ? '' : 'text-gray-500'}`} style={isSelected ? { color: brandColor } : {}}>{d.dayName}</span>
                        <span className={`text-2xl font-black mt-0.5 ${isSelected ? 'text-[#2d2d2d]' : 'text-gray-500'}`}>{d.dayNumber}</span>
                      </button>
                    )
                  })}
                </div>
                <button onClick={scrollRight} className="w-10 h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronRight size={20}/></button>
              </div>
              
              <div className="mt-5 text-center min-h-[20px]">
                {selectedDateObj && (
                  <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: brandColor }}>
                    {selectedDateObj.fullFormat}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-3">
              {timeOptions.map(time => {
                const isSelected = selectedTime === time;
                return (
                  <button key={time} onClick={() => setSelectedTime(time)} className={`py-2 rounded-full font-bold text-sm transition-all select-none ${isSelected ? `text-white shadow-md` : 'bg-[#F4F4F5] text-gray-600'}`} style={isSelected ? { backgroundColor: brandColor } : {}}>{time}</button>
                )
              })}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Duración Estimada</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-[#F4F4F5] border-none py-3.5 px-4 rounded-xl font-medium outline-none">
                <option value="1 Hora">1 Hora</option>
                <option value="1.5 Horas">1.5 Horas</option>
                <option value="2 Horas">2 Horas</option>
                <option value="3 Horas">3 Horas</option>
                <option value="Jornada Completa">Jornada Completa</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="px-8 py-5 bg-white border-t border-gray-200 flex flex-col md:flex-row justify-between items-center z-10 shrink-0">
        <div className="flex flex-col mb-4 md:mb-0">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Estimado</span>
           <div className="text-2xl font-extrabold" style={{ color: brandColor }}>{formatCurrency(total)}</div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {isNewBooking ? (
            <button className="px-8 py-3.5 text-white font-bold rounded-full text-sm uppercase tracking-wide shadow-md transition-all hover:-translate-y-0.5" style={{ backgroundColor: brandColor }}>Cargar Nueva Reserva</button>
          ) : isWebRequest ? (
            <>
              <button className="px-8 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-full text-sm uppercase tracking-wide transition-colors">Rechazar</button>
              <button className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-full text-sm uppercase tracking-wide shadow-md transition-all">Aprobar y Agendar</button>
            </>
          ) : (
            <>
              <button className="px-8 py-3.5 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 font-bold rounded-full text-sm uppercase tracking-wide transition-colors">Checkout (Finalizar)</button>
              <button className="px-8 py-3.5 text-white font-bold rounded-full text-sm uppercase tracking-wide shadow-md transition-all hover:-translate-y-0.5" style={{ backgroundColor: brandColor }}>Actualizar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}