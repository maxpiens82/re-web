import LoadingLogo from './LoadingLogo';
import MiniLogo from './MiniLogo';
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

export default function UnifiedForm({ jobId, onCancel, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data State
  const [db, setDb] = useState(null);
  const [config, setConfig] = useState(null);
  const [clientDb, setClientDb] = useState([]);
  const [uniqueCompanies, setUniqueCompanies] = useState([]);
  
  // Form State
  const [selectedServices, setSelectedServices] = useState([]);
  const [postProdServices, setPostProdServices] = useState([]); // 🚀 NEW: Self-Editing Memory
  const [multiplier, setMultiplier] = useState(1.0);
  const [dateOptions] = useState(generateDates);
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState('1 Hora');
  
  const [formData, setFormData] = useState({
    name: '', lastName: '', company: '', email: '', phone: '', address: '', instructions: '',
    realizador: '', observaciones: '', extrasDesc: '', costoExtras: '', pagoEditor: '',
    modalidadPago: 'Individual'
  });

  // 🚀 NEW: Auto-cleanup self-editing if the parent service is deselected
  useEffect(() => {
    setPostProdServices(prev => prev.filter(id => selectedServices.includes(id)));
  }, [selectedServices]);

  const togglePostProd = (id) => {
    setPostProdServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  // Validation State & CRM Memory Engine
  const [fieldStates, setFieldStates] = useState({
    name: 'new', lastName: 'new', company: 'new', email: 'new', phone: 'new'
  });
  const [matchedClient, setMatchedClient] = useState(null);
  const [altValues, setAltValues] = useState({});
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
          fetch(GAS_API_URL + "?api=init_v2").then(r => r.json()), // 🚀 LIVE V2 ENDPOINT
          fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_portal_data_v2' }) }).then(r => r.json()) // 🚀 LIVE V2 ENDPOINT
        ];

        if (!isNewBooking) {
          fetchPromises.push(
            fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_booking_details', payload: { eventId: jobId } }) }).then(r => r.json())
          );
        }

        const results = await Promise.all(fetchPromises);
        const initData = results[0];
        const portalData = results[1];
        const detailData = isNewBooking ? { success: true, data: {} } : results[2];

        if (initData.success && detailData.success && portalData.success) {
          const mappedServices = initData.prices.services.map(s => ({ id: s.id, label: s.id, price: s.price, isFixed: s.isFixed }));
          const mappedMultipliers = initData.prices.multipliers.map((m, idx) => {
            let label = `Hasta ${m.sheetValue}m²`;
            if (idx > 0) label = `${parseInt(initData.prices.multipliers[idx - 1].sheetValue) + 1} a ${m.sheetValue}m²`;
            if (idx === initData.prices.multipliers.length - 1) label = `Más de ${initData.prices.multipliers[idx - 1].sheetValue}m²`;
            return { id: `m${m.sheetValue}`, label, value: m.value, sheetValue: m.sheetValue };
          });
          
          setDb({ services: mappedServices, multipliers: mappedMultipliers, discountThreshold: 3, discountAmount: 5000 });
          setConfig(initData.config || {}); // 🚀 EXTRACTED FROM INIT_V2
          
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
      extrasDesc: data.extrasDescripcion || '', costoExtras: data.costoExtras || '', pagoEditor: data.pagoEditorExtras || '',
      modalidadPago: data.modalidadPago || 'Individual'
    });
  };

  // ==========================================
  // SMART PHONE-CENTRIC CRM EVALUATOR
  // ==========================================
  useEffect(() => {
    if (clientDb.length === 0) return;

    const cleanPhone = formData.phone ? String(formData.phone).replace(/\D/g, '') : '';
    
    if (cleanPhone.length < 5) {
      setFieldStates({ name: 'new', lastName: 'new', company: 'new', email: 'new', phone: 'new' });
      setMatchedClient(null);
      return;
    }

    const dbMatch = clientDb.find(c => {
      const dbPhone = c.telefono ? String(c.telefono).replace(/\D/g, '') : '';
      return dbPhone === cleanPhone;
    });

    if (!dbMatch) {
      setFieldStates({ name: 'new', lastName: 'new', company: 'new', email: 'new', phone: 'new' });
      setMatchedClient(null);
      return;
    }

    setMatchedClient(dbMatch);

    const newStates = { phone: 'existing', name: 'new', lastName: 'new', company: 'new', email: 'new' };
    
    const checkMatch = (currentVal, dbVal) => {
      const safeCurrent = String(currentVal || '').trim().toLowerCase();
      const safeDb = String(dbVal || '').trim().toLowerCase();
      if (safeCurrent === '') return 'new';
      if (safeCurrent === safeDb) return 'existing';
      return 'modified';
    };

    newStates.name = checkMatch(formData.name, dbMatch.nombre);
    newStates.lastName = checkMatch(formData.lastName, dbMatch.apellido);
    newStates.company = checkMatch(formData.company, dbMatch.empresa);
    newStates.email = checkMatch(formData.email, dbMatch.email);

    setFieldStates(newStates);
  }, [formData.phone, formData.name, formData.lastName, formData.company, formData.email, clientDb]);

  // ==========================================
  // THE SWAP ENGINE
  // ==========================================
  const handleSwap = (field, dbKey) => {
    if (!matchedClient) return;
    const currentFormVal = formData[field];
    const dbVal = matchedClient[dbKey] || '';
    const altVal = altValues[field];

    if (String(currentFormVal).trim().toLowerCase() === String(dbVal).trim().toLowerCase() && altVal !== undefined) {
      setFormData(prev => ({ ...prev, [field]: altVal }));
      setAltValues(prev => ({ ...prev, [field]: currentFormVal }));
    } else {
      setAltValues(prev => ({ ...prev, [field]: currentFormVal }));
      setFormData(prev => ({ ...prev, [field]: dbVal }));
    }
  };

  const renderSwapButton = (field, dbKey) => {
    if (!matchedClient) return null;
    const state = fieldStates[field];
    let swapText = '';

    if (state === 'modified') {
      swapText = matchedClient[dbKey] || 'Vacío';
    } else if (state === 'existing' && altValues[field] !== undefined) {
      const cleanAlt = String(altValues[field]).trim().toLowerCase();
      const cleanDb = String(matchedClient[dbKey]).trim().toLowerCase();
      if (cleanAlt !== cleanDb && cleanAlt !== '') {
        swapText = altValues[field];
      }
    }

    if (!swapText) return null;

    return (
      <button
        type="button"
        onClick={() => handleSwap(field, dbKey)}
        className="absolute right-2 top-1/2 -translate-y-1/2 max-w-[45%] truncate text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-[#E2E8F0] hover:bg-[#CBD5E0] text-[#2D3748] cursor-pointer transition-colors shadow-sm border border-gray-300"
        title={`Cambiar por: ${swapText}`}
      >
        {swapText} ⇄
      </button>
    );
  };

  // ==========================================
  // 2. AUTO-SCROLL TO SELECTED DATE (SILENT HORIZONTAL ONLY)
  // ==========================================
  useEffect(() => {
    if (!loading && selectedDateObj && dateScrollRef.current) {
      setTimeout(() => {
        const container = dateScrollRef.current;
        const selectedEl = container.querySelector(`[data-date="${selectedDateObj.id}"]`);
        
        if (selectedEl) {
          const containerCenter = container.offsetWidth / 2;
          const itemCenter = selectedEl.offsetLeft + (selectedEl.offsetWidth / 2);
          const scrollPosition = itemCenter - containerCenter;
          container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
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
    setFormData(prev => ({ 
      ...prev, name: c.nombre, lastName: c.apellido, company: c.empresa, 
      email: c.email, phone: c.telefono, modalidadPago: c.modalidadPago || 'Individual' 
    }));
    setClientSearchQuery('');
    setClientSuggestions([]);
  };

  const handleCompanySearch = (query) => {
    setFormData(prev => ({ ...prev, company: query }));
    const val = query.toLowerCase().trim();
    if (val.length < 1) { setCompanySuggestions(uniqueCompanies.slice(0, 10)); return; }
    setCompanySuggestions(uniqueCompanies.filter(c => c.toLowerCase().includes(val)).slice(0, 10));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  // ==========================================
  // 6. MASTER SUBMISSION ENGINE
  // ==========================================
  const handleFormSubmit = async (actionType) => {
    setIsSubmitting(true);

    // 🚀 CRM CHECKOUT GATEKEEPER
    if (actionType === 'checkout_booking') {
      // 1. No fields can be Yellow (modified)
      const hasYellowFields = Object.values(fieldStates).some(state => state === 'modified');
      if (hasYellowFields) {
        alert("⚠️ Hay datos de cliente modificados (en amarillo). Por favor, revierte los cambios o haz clic en '💾 Forzar Guardado' para actualizar la base de datos antes de hacer el checkout.");
        setIsSubmitting(false);
        return;
      }

      // 2. Name, Company, and Phone MUST be Green (existing)
      if (fieldStates.name !== 'existing' || fieldStates.company !== 'existing' || fieldStates.phone !== 'existing') {
        alert("⚠️ Para hacer Checkout, el Nombre, Empresa y Teléfono deben estar registrados (en verde). Selecciona un cliente de la lista o haz clic en '💾 Forzar Guardado' para registrarlo.");
        setIsSubmitting(false);
        return;
      }
    }

    // Intercept and clean the "SOLICITUD WEB" status text
    let finalObservaciones = formData.observaciones;
    if (actionType === 'update_booking' && String(finalObservaciones).includes('SOLICITUD WEB - Pendiente')) {
      finalObservaciones = finalObservaciones.replace('SOLICITUD WEB - Pendiente', 'SOLICITUD WEB - Aprobada');
    }
    
    // Construct the payload mapping React State exactly to the Legacy GAS format
    const payload = {
      eventId: jobId,
      nombre: formData.name,
      apellido: formData.lastName,
      empresa: formData.company,
      email: formData.email,
      telefono: formData.phone,
      locacion: formData.address,
      indicaciones: formData.instructions, // <--- CLEAN FIX: Just the raw string
      realizacion: formData.realizador,
      observaciones: finalObservaciones,
      fecha: selectedDateObj ? selectedDateObj.id : '',
      hora: selectedTime || '',
      duracion: duration,
      metrosCuadrados: db.multipliers.find(m => m.value === multiplier)?.sheetValue || '100',
      selectedServices: selectedServices,
      postProdServices: postProdServices, // 🚀 NEW: Sends Self-Editing preferences to GAS Checkout
      extrasDescripcion: formData.extrasDesc,
      costoExtras: formData.costoExtras,
      pagoEditorExtras: formData.pagoEditor,
      modalidadPago: formData.modalidadPago,
      skipValidation: true,
      
      descripcionServicio: selectedServices.join(', '),
      precioCliente: total
    };

    if (actionType === 'create_booking' || actionType === 'update_booking') {
      const safeDuration = String(duration).toLowerCase();
      let durationMinutes = 60; 
      
      if (safeDuration.includes('1.5') || safeDuration.includes('90')) durationMinutes = 90;
      else if (safeDuration.includes('2') || safeDuration.includes('120')) durationMinutes = 120;
      else if (safeDuration.includes('2.5') || safeDuration.includes('150')) durationMinutes = 150;
      else if (safeDuration.includes('3') || safeDuration.includes('180')) durationMinutes = 180;
      else if (safeDuration.includes('4') || safeDuration.includes('240')) durationMinutes = 240;
      else if (safeDuration.includes('5') || safeDuration.includes('300')) durationMinutes = 300;
      else if (safeDuration.includes('jornada') || safeDuration.includes('completa') || safeDuration.includes('480')) durationMinutes = 480;
      
      payload.duracion = durationMinutes;
    }

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: actionType, payload })
      });
      const data = await response.json();
      
      if (data.success) {
        if (onSuccess) onSuccess();
        else onCancel(); 
      } else {
        alert("Error del servidor: " + data.error);
      }
    } catch (err) {
      alert("Fallo de red al enviar los datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldStyle = (fieldName) => {
    const state = fieldStates[fieldName];
    if (state === 'existing') return { backgroundColor: '#F0FFF4', border: '1px solid #C6F6D5', color: '#14532D' };
    if (state === 'modified') return { backgroundColor: '#FFFFF0', border: '1px solid #FEFCBF', color: '#744210' };
    return { backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#7F1D1D' };
  };

  if (loading || !db) return (
    <div className="h-full w-full bg-white rounded-3xl shadow-xl overflow-hidden flex items-center justify-center">
      <LoadingLogo message="Cargando Formulario..." />
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
    <div className="bg-[#F0F2F5] w-full max-w-4xl mx-auto rounded-none md:rounded-3xl shadow-none md:shadow-2xl overflow-hidden flex flex-col h-full md:h-[90vh]">
      
      {/* HEADER */}
      <div className="px-4 py-3 md:px-8 md:py-5 border-b border-gray-200 flex justify-between items-center bg-white z-10 shrink-0">
        <div className="truncate pr-4 flex-1">
          <h2 className="text-base md:text-xl font-extrabold uppercase tracking-wide truncate" style={{ color: brandColor }}>
            {modeTitle}
          </h2>
          {!isNewBooking && <p className="hidden md:block text-xs text-gray-400 mt-1 font-bold tracking-wider truncate">ID: {jobId}</p>}
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:bg-gray-100 font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-gray-200 transition-colors text-xs md:text-sm shrink-0 shadow-sm">
          ✕ Cerrar
        </button>
      </div>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-3 md:p-8 space-y-4 md:space-y-6">
        
        {/* STAFF PANEL */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border-2 border-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-indigo-500"></div>
          <div className="mb-3 md:mb-5 flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-600 md:w-5 md:h-5" />
            <h2 className="text-sm md:text-lg font-bold uppercase text-indigo-800">Panel Interno (Staff)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">Productor Asignado</label>
              <select name="realizador" value={formData.realizador} onChange={handleInputChange} className="w-full bg-[#F4F4F5] border-none text-gray-800 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-medium outline-none text-sm">
                <option value="">Seleccionar Productor...</option>
                {config?.realizadoresList?.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">Observaciones Internas</label>
              <input type="text" name="observaciones" value={formData.observaciones} onChange={handleInputChange} placeholder="Notas para el equipo..." className="w-full bg-[#F4F4F5] border-none text-gray-800 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-medium outline-none text-sm" />
            </div>
          </div>
        </section>

        {/* 1. CLIENTE & CRM */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6 flex justify-between items-center">
            <h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Cliente & Contacto</h2>
            <button className="text-[10px] md:text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2 py-1 md:px-3 md:py-1 rounded-md transition-colors" onClick={() => setFieldStates({ name: 'existing', lastName: 'existing', company: 'existing', email: 'existing', phone: 'existing' })}>💾 Modificar cliente</button>
          </div>

          {/* DEDICATED SEARCH BAR */}
          <div className="mb-4 md:mb-6 relative" ref={clientWrapperRef}>
            <label className="block text-[10px] md:text-xs font-bold text-[#2B6CB0] uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1">
              <Search size={12} className="md:w-3.5 md:h-3.5" /> Buscar Cliente Existente
            </label>
            <input 
              type="text" 
              value={clientSearchQuery}
              onChange={(e) => handleClientSearch(e.target.value)}
              onFocus={() => handleClientSearch(clientSearchQuery)}
              placeholder="Nombre, empresa, email o tel..." 
              className="w-full bg-white border border-gray-200 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-all shadow-sm text-sm"
              autoComplete="off"
            />
            {clientSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 md:mt-2 left-0 right-0 bg-white border border-gray-100 rounded-lg md:rounded-xl shadow-xl z-50 overflow-hidden max-h-48 md:max-h-60 overflow-y-auto">
                {clientSuggestions.map((c, i) => (
                  <div key={i} onClick={() => selectClient(c)} className="p-2.5 md:p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                    <div className="font-bold text-gray-800 text-sm">{c.nombre} {c.apellido}</div>
                    <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 flex items-center gap-1.5">
                       <Building size={10}/> <span className="truncate max-w-[100px]">{c.empresa || 'Particular'}</span> <span className="text-gray-300">|</span> <Phone size={10}/> <span className="truncate">{c.telefono || 'Sin teléfono'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RED/YELLOW/GREEN INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Nombre</label>
              <div className="relative">
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm pr-24 md:pr-28" style={getFieldStyle('name')} />
                {renderSwapButton('name', 'nombre')}
              </div>
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Apellido</label>
              <div className="relative">
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm pr-24 md:pr-28" style={getFieldStyle('lastName')} />
                {renderSwapButton('lastName', 'apellido')}
              </div>
            </div>
            
            {/* EMPRESA WITH EMBEDDED AUTOCOMPLETE */}
            <div className="relative" ref={companyWrapperRef}>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Empresa</label>
              <div className="relative">
                <input type="text" name="company" value={formData.company} onChange={(e) => { handleInputChange(e); handleCompanySearch(e.target.value); }} onFocus={() => handleCompanySearch(formData.company)} placeholder="Escribir..." className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm pr-24 md:pr-28" style={getFieldStyle('company')} autoComplete="off" />
                {renderSwapButton('company', 'empresa')}
              </div>
              {companySuggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg md:rounded-xl shadow-lg z-40 max-h-40 overflow-y-auto">
                  {companySuggestions.map((c, i) => (
                    <div key={i} onClick={() => { setFormData(prev => ({...prev, company: c})); setCompanySuggestions([]); }} className="p-2.5 md:p-3 hover:bg-gray-50 cursor-pointer font-medium text-xs md:text-sm border-b border-gray-50">{c}</div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Teléfono</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm" style={getFieldStyle('phone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Email</label>
              <div className="relative">
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm pr-24 md:pr-28" style={getFieldStyle('email')} />
                {renderSwapButton('email', 'email')}
              </div>
            </div>
            {/* 🚀 MODALIDAD DE PAGO (B2B) */}
            <div className="sm:col-span-2 mt-2 p-3 md:p-4 bg-[#FAF5FF] border border-[#D6BCFA] rounded-xl md:rounded-2xl shadow-sm">
              <label className="block text-[10px] md:text-xs font-bold text-[#6B46C1] uppercase tracking-widest mb-2">
                Modalidad de Pago (Cobranzas)
              </label>
              <select 
                name="modalidadPago" 
                value={formData.modalidadPago} 
                onChange={handleInputChange} 
                className="w-full bg-white border border-[#B794F4] text-[#44337A] py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl focus:ring-2 focus:ring-[#9F7AEA]/30 font-bold outline-none text-xs md:text-sm transition-all cursor-pointer"
              >
                <option value="Individual">Individual (Cobro Directo al Cliente)</option>
                <option value="Corporativo">Corporativo (Cobro Consolidado a la Empresa)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 2. LOCACIÓN */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6"><h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Locación</h2></div>
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Metros Cuadrados</label>
              <select value={multiplier} onChange={(e) => setMultiplier(parseFloat(e.target.value))} className="w-full bg-[#F4F4F5] border-none text-gray-800 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl outline-none font-medium text-sm">
                {db.multipliers.map(m => <option key={m.id} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Dirección {!isAddressValid && formData.address && <span className="text-red-500 normal-case ml-1">(Revisar Maps)</span>}</label>
              <div className="relative">
                <MapPin size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 md:w-[18px] md:h-[18px] md:left-3.5 ${isAddressValid ? 'text-green-500' : 'text-gray-400'}`} />
                <input type="text" ref={addressInputRef} name="address" value={formData.address} onChange={handleInputChange} className={`w-full bg-[#F4F4F5] py-2.5 pl-8 pr-3 md:py-3.5 md:pl-11 md:pr-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm ${isAddressValid ? 'ring-1 ring-[#4bbf73]' : ''}`} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Indicaciones (Piso, Depto, Torre)</label>
              <input type="text" name="instructions" value={formData.instructions} onChange={handleInputChange} className="w-full bg-[#F4F4F5] border-none py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl outline-none font-medium text-sm" />
            </div>
          </div>
        </section>

        {/* 3. SERVICIOS */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6"><h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Servicios Contratados</h2></div>
          
          {/* Changed flex to a 3-column Grid on mobile, reverts to flex row on desktop */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-3">
            {db.services.map((srv) => {
              const isSelected = selectedServices.includes(srv.id);
              return (
                <button
                  key={srv.id} onClick={() => toggleService(srv.id)}
                  className={`w-full h-[36px] md:w-[100px] md:h-[40px] rounded-full font-bold text-[10px] md:text-sm tracking-wide transition-all select-none
                    ${isSelected ? `text-white shadow-[0_4px_14px_rgba(235,69,17,0.35)] -translate-y-0.5` : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'}`}
                  style={isSelected ? { backgroundColor: brandColor } : {}}
                >
                  {srv.label}
                </button>
              );
            })}
            
            {/* MANUALLY APPEND EXTRAS IF NOT IN DB */}
            {!db.services.find(s => s.id === 'EXTRAS') && (
              <button
                type="button"
                onClick={() => toggleService('EXTRAS')}
                className={`w-full h-[36px] md:w-[100px] md:h-[40px] rounded-full font-bold text-[10px] md:text-sm tracking-wide transition-all select-none
                  ${selectedServices.includes('EXTRAS') ? `text-white shadow-[0_4px_14px_rgba(235,69,17,0.35)] -translate-y-0.5` : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'}`}
                style={selectedServices.includes('EXTRAS') ? { backgroundColor: brandColor } : {}}
              >
                EXTRAS
              </button>
            )}
          </div>          

          {/* 🚀 THE EXTRAS DETAILS REVEAL */}
          {selectedServices.includes('EXTRAS') && (
            <div className="mt-4 md:mt-6 p-4 md:p-5 bg-orange-50/50 rounded-xl md:rounded-2xl border border-orange-100 animate-in slide-in-from-top-2 fade-in duration-200">
              <label className="block text-[10px] md:text-xs font-bold text-orange-600 uppercase tracking-widest mb-3">Detalle de Extras</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descripción</label>
                  <input type="text" name="extrasDesc" value={formData.extrasDesc} onChange={handleInputChange} placeholder="Ej: Edición urgente, fotos 360..." className="w-full bg-white border border-orange-100 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Cobro Cliente</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold">$</span>
                      <input type="number" name="costoExtras" value={formData.costoExtras} onChange={handleInputChange} placeholder="0" className="w-full bg-white border border-orange-100 py-2.5 pl-7 pr-3 md:py-3.5 md:pl-8 md:pr-4 rounded-lg md:rounded-xl font-bold outline-none text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">Pago Editor</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 font-bold">$</span>
                      <input type="number" name="pagoEditor" value={formData.pagoEditor} onChange={handleInputChange} placeholder="0" className="w-full bg-white border border-indigo-100 py-2.5 pl-7 pr-3 md:py-3.5 md:pl-8 md:pr-4 rounded-lg md:rounded-xl font-bold outline-none text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 🚀 POST-PRODUCCIÓN PROPIA CARD */}
        {selectedServices.filter(s => s !== 'EXTRAS').length > 0 && (
          <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold uppercase text-[#38a169]">
                ¿Vas a post-producir alguno de estos servicios?
              </h2>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-3">
              {selectedServices.filter(s => s !== 'EXTRAS').map((srv) => {
                const isSelfEdited = postProdServices.includes(srv);
                return (
                  <button
                    key={`pp-${srv}`}
                    type="button"
                    onClick={() => togglePostProd(srv)}
                    className={`w-full h-[36px] md:w-[100px] md:h-[40px] rounded-full font-bold text-[10px] md:text-sm tracking-wide transition-all select-none
                      ${isSelfEdited 
                        ? 'text-white shadow-[0_4px_14px_rgba(56,161,105,0.35)] -translate-y-0.5' 
                        : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'}`}
                    style={isSelfEdited ? { backgroundColor: '#38a169' } : {}}
                  >
                    {srv}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. FECHA Y HORA */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6"><h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Fecha y Hora</h2></div>
          <div className="space-y-6 md:space-y-8">
            <div>
              <div className="flex items-center gap-1 md:gap-4">
                <button onClick={scrollLeft} className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronLeft size={16}/></button>
                <div ref={dateScrollRef} className="flex flex-1 gap-2 md:gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth py-2 px-1 [&::-webkit-scrollbar]:hidden">
                  {dateOptions.map(d => {
                    const isSelected = selectedDateObj?.id === d.id;
                    return (
                      <button data-date={d.id} key={d.id} onClick={() => setSelectedDateObj(d)} className={`flex flex-col items-center justify-center w-[56px] h-[56px] md:w-[72px] md:h-[72px] shrink-0 rounded-xl md:rounded-2xl border-2 transition-all select-none snap-start ${isSelected ? `shadow-md bg-white -translate-y-0.5` : 'border-transparent bg-[#F4F4F5]'}`} style={isSelected ? { borderColor: brandColor } : {}}>
                        <span className={`text-[9px] md:text-[11px] font-bold uppercase ${isSelected ? '' : 'text-gray-500'}`} style={isSelected ? { color: brandColor } : {}}>{d.dayName}</span>
                        <span className={`text-xl md:text-2xl font-black mt-0 md:mt-0.5 ${isSelected ? 'text-[#2d2d2d]' : 'text-gray-500'}`}>{d.dayNumber}</span>
                      </button>
                    )
                  })}
                </div>
                <button onClick={scrollRight} className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronRight size={16}/></button>
              </div>
              
              <div className="mt-3 md:mt-5 text-center min-h-[20px]">
                {selectedDateObj && (
                  <span className="text-[11px] md:text-[13px] font-bold uppercase tracking-wide" style={{ color: brandColor }}>
                    {selectedDateObj.fullFormat}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5 md:gap-3">
              {timeOptions.map(time => {
                const isSelected = selectedTime === time;
                return (
                  <button key={time} onClick={() => setSelectedTime(time)} className={`py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm transition-all select-none ${isSelected ? `text-white shadow-md` : 'bg-[#F4F4F5] text-gray-600'}`} style={isSelected ? { backgroundColor: brandColor } : {}}>{time}</button>
                )
              })}
            </div>
            
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-3">Duración Estimada</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-[#F4F4F5] border-none py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none text-sm">
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
      <div className="p-4 md:px-8 md:py-5 bg-white border-t border-gray-200 flex flex-col md:flex-row justify-between items-center z-10 shrink-0 gap-3 md:gap-0" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        
        {/* PRICE SECTION */}
        <div className="flex flex-row md:flex-col justify-between items-center md:items-start w-full md:w-auto shrink-0">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Estimado</span>
           <div className="text-xl md:text-2xl font-extrabold leading-none" style={{ color: brandColor }}>{formatCurrency(total)}</div>
        </div>
        
        {/* BUTTONS SECTION */}
        <div className="flex flex-row gap-2 w-full md:w-auto justify-end">
          {isNewBooking ? (
            <button 
              onClick={() => handleFormSubmit('create_booking')}
              disabled={isSubmitting}
              className="flex-1 md:flex-none px-4 py-3 md:px-8 md:py-3.5 text-white font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase tracking-wide shadow-sm transition-all disabled:opacity-50 text-center flex items-center justify-center" 
              style={{ backgroundColor: brandColor }}
            >
              {isSubmitting ? <><MiniLogo /> Procesando</> : 'Cargar Reserva'}
            </button>
          ) : isWebRequest ? (
            <>
              <button className="flex-1 md:flex-none px-4 py-3 md:px-8 md:py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase tracking-wide transition-colors text-center">Rechazar</button>
              <button 
                onClick={() => handleFormSubmit('update_booking')}
                disabled={isSubmitting}
                className="flex-1 md:flex-none px-4 py-3 md:px-8 md:py-3.5 bg-yellow-500 text-white font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase tracking-wide shadow-sm transition-all disabled:opacity-50 text-center flex items-center justify-center"
              >
                {isSubmitting ? <><MiniLogo /> Aprobando</> : 'Aprobar'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleFormSubmit('checkout_booking')}
                disabled={isSubmitting}
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-3.5 bg-white border-2 border-green-500 text-green-600 font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase tracking-wide transition-colors disabled:opacity-50 whitespace-nowrap text-center flex items-center justify-center"
              >
                {isSubmitting ? <><MiniLogo /> Procesando</> : 'Checkout'}
              </button>
              
              <button 
                onClick={() => handleFormSubmit('update_booking')}
                disabled={isSubmitting}
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-3.5 text-white font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase tracking-wide shadow-sm transition-all disabled:opacity-50 text-center flex items-center justify-center" 
                style={{ backgroundColor: brandColor }}
              >
                {isSubmitting ? <><MiniLogo /> Guardando</> : 'Actualizar'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}