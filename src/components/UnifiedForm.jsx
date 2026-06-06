import LoadingLogo from './LoadingLogo';
import MiniLogo from './MiniLogo';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Camera, Video, Clapperboard, Mic, Map as MapIcon, Compass, Plane, Crosshair,
  MapPin, Calendar, User, Building, Mail, Phone, CheckCircle2,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Search, Briefcase, Plus, X
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = "AIzaSyCfHCPO8Yb-rYqxMWToYq7GsV3VZ1iz0EE"; 
const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

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
  const [isSavingClient, setIsSavingClient] = useState(false); 
  const [isSendingQuote, setIsSendingQuote] = useState(false); 
  
  // Data State
  const [db, setDb] = useState(null);
  const [config, setConfig] = useState(null);
  const [pricingData, setPricingData] = useState(null); // 🚀 ENGINE: Date-Aware Pricing
  const [clientDb, setClientDb] = useState([]);
  const [uniqueCompanies, setUniqueCompanies] = useState([]);
  
  // 🚀 ENGINE: Dual-Track Properties (Units Array)
  const [units, setUnits] = useState([{
    id: Date.now(), indicaciones: '', metrosCuadrados: '100', selectedServices: [], extrasService: false, extrasDescripcion: '', costoExtras: '', pagoEditorExtras: ''
  }]);

  // 🚀 ENGINE: Team Builder
  const [teamMembers, setTeamMembers] = useState([{ name: '', services: [] }]);
  const [globalPostProd, setGlobalPostProd] = useState([]); // Global Post-Prod tracking

  const [dateOptions] = useState(generateDates);
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState('1 Hora');
  
  const [formData, setFormData] = useState({
    name: '', lastName: '', company: '', email: '', phone: '', address: '', 
    observaciones: '', modalidadPago: 'Individual', dniCuit: '', condicionIva: ''
  });

  // Validation State & CRM Memory Engine
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showProducerPayout, setShowProducerPayout] = useState(false);
  const [fieldStates, setFieldStates] = useState({ 
    name: 'new', lastName: 'new', company: 'new', email: 'new', phone: 'new',
    dniCuit: 'new', condicionIva: 'new', modalidadPago: 'new' 
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
  const isWebRequest = jobId.startsWith('REQ-') || jobId.startsWith('VOZ-');
  const modeTitle = isNewBooking ? "Nueva Reserva" : (isWebRequest ? "Aprobar Solicitud Web" : "Detalle de Reserva");

  // ==========================================
  // DIRTY STATE ENGINE (For Actualizar Button)
  // ==========================================
  const [isDirty, setIsDirty] = useState(false);
  const initialSnapshotRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      // 1. Convert the entire form state into a single string
      const currentSnapshot = JSON.stringify({
        formData, units, teamMembers, globalPostProd,
        date: selectedDateObj?.id, time: selectedTime, duration
      });
      
      // 2. If this is the first time we see the data, lock it in as the baseline
      if (!initialSnapshotRef.current) {
        initialSnapshotRef.current = currentSnapshot;
      } 
      // 3. Otherwise, compare the current string to the baseline
      else {
        setIsDirty(currentSnapshot !== initialSnapshotRef.current);
      }
    }
  }, [formData, units, teamMembers, globalPostProd, selectedDateObj, selectedTime, duration, loading]);

  // ==========================================
  // 1. FAST FETCH & HYDRATE DATA
  // ==========================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchPromises = [
          fetch(GAS_API_URL + "?api=init_v2").then(r => r.json()),
          fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_portal_data_v2' }) }).then(r => r.json())
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
          setPricingData(initData.pricingData || null); // Inject Engine
          setConfig(initData.config || {});
          
          const mappedServices = initData.prices.services.map(s => ({ id: s.id, label: s.id, price: s.price, isFixed: s.isFixed }));
          const mappedMultipliers = initData.prices.multipliers.map((m, idx) => {
            let label = `Hasta ${m.sheetValue}m²`;
            if (idx > 0) label = `${parseInt(initData.prices.multipliers[idx - 1].sheetValue) + 1} a ${m.sheetValue}m²`;
            if (idx === initData.prices.multipliers.length - 1) label = `Más de ${initData.prices.multipliers[idx - 1].sheetValue}m²`;
            return { id: `m${m.sheetValue}`, label, value: m.value, sheetValue: m.sheetValue };
          });
          setDb({ services: mappedServices, multipliers: mappedMultipliers, discountThreshold: 3, discountAmount: 5000 });
          
          const clients = portalData.clients || [];
          setClientDb(clients);
          const rawEmpresas = clients.map(c => c.empresa).filter(e => e && e.trim() !== '');
          rawEmpresas.push('Particular');
          setUniqueCompanies([...new Set(rawEmpresas)].sort());

          if (isNewBooking) {
            const today = new Date();
            const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            setSelectedDateObj(dateOptions.find(d => d.id === todayId) || dateOptions[15]);
          } else {
            hydrateForm(detailData.data, mappedMultipliers);
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

  const hydrateForm = (data, multipliers) => {
    // 🚀 Hydrate Units Array
    const loadedUnits = (data.units && data.units.length > 0) ? data.units.map((u, idx) => {
      const srvs = [];
      if(u.foto) srvs.push('FOTO'); if(u.video) srvs.push('VIDEO'); if(u.reel) srvs.push('REEL');
      if(u.th) srvs.push('TH'); if(u.plano) srvs.push('PLANO'); if(u.tour) srvs.push('TOUR');
      if(u.drone) srvs.push('DRONE'); if(u.fpv) srvs.push('FPV'); if(u.extrasService) srvs.push('EXTRAS');
      return {
        id: Date.now() + idx,
        indicaciones: u.indicaciones || '',
        metrosCuadrados: u.metrosCuadrados || '100',
        selectedServices: srvs,
        extrasService: u.extrasService || false,
        extrasDescripcion: u.extrasDescripcion || '',
        costoExtras: u.costoExtras || '',
        pagoEditorExtras: u.pagoEditorExtras || ''
      };
    }) : [{ id: Date.now(), indicaciones: data.indicaciones || '', metrosCuadrados: data.metrosCuadrados || '100', selectedServices: [], extrasService: false, extrasDescripcion: data.extrasDescripcion || '', costoExtras: data.costoExtras || '', pagoEditorExtras: data.pagoEditorExtras || '' }];
    
    setUnits(loadedUnits);

    // 🚀 Hydrate Team Builder
    let loadedTeam = [{ name: '', services: [] }];
    if (data.teamTag && data.teamTag.trim() !== '') {
      try {
        const parsed = JSON.parse(data.teamTag);
        loadedTeam = Object.keys(parsed).map(k => ({ name: k, services: parsed[k] }));
      } catch(e) {}
    } else if (data.realizacion) {
      const names = data.realizacion.split(',').map(n => n.trim()).filter(Boolean);
      if (names.length > 0) {
        loadedTeam = names.map((n, idx) => ({ name: n, services: idx === 0 ? loadedUnits[0].selectedServices : [] }));
      }
    }
    setTeamMembers(loadedTeam);

    const matchedDate = dateOptions.find(d => d.id === data.fecha);
    if (matchedDate) setSelectedDateObj(matchedDate);
    setSelectedTime(data.hora);

    setFormData({
      name: data.nombre || '', lastName: data.apellido || '', company: data.empresa || '',
      email: data.email || '', phone: data.telefono ? String(data.telefono).replace(/[^0-9+]/g, '') : '',
      address: data.locacionFormateada || data.locacion || '',
      observaciones: data.observaciones || '',
      modalidadPago: data.modalidadPago || 'Individual',
      dniCuit: data.dniCuit || '',
      condicionIva: data.condicionIva || ''
    });
  };

  // ==========================================
  // DYNAMIC COMPUTATIONS (SERVICES & PRICING)
  // ==========================================
  const allActiveServices = useMemo(() => {
    const set = new Set();
    units.forEach(u => u.selectedServices.forEach(s => set.add(s)));
    return Array.from(set);
  }, [units]);

 useEffect(() => {
    setTeamMembers(prev => {
      // ⚡ AUTO-ASSIGN: If there is only one producer, dynamically sync all active services to them
      if (prev.length === 1) {
        return [{ ...prev[0], services: [...allActiveServices] }];
      }
      // Otherwise (multi-producer), just purge services that are no longer globally checked
      return prev.map(m => ({ ...m, services: m.services.filter(s => allActiveServices.includes(s)) }));
    });
    
    setGlobalPostProd(prev => prev.filter(s => allActiveServices.includes(s)));
  }, [allActiveServices]);

  // 🚀 ENGINE: DATE-AWARE PRICING CALCULATOR
  const { total, producerPayout, discountApplied, baseCount } = useMemo(() => {
    if (!db || !pricingData) return { total: 0, producerPayout: 0, discountApplied: 0, baseCount: 0 };
    
    // 1. Determine active Pricing Era
    let isNewEra = false;
    if (pricingData.pricingConfig && pricingData.pricingConfig.threshold) {
      let targetMs = Date.now();
      if (pricingData.pricingConfig.rule === "FECHA" && selectedDateObj) {
        const p = selectedDateObj.id.split('-');
        targetMs = new Date(p[0], p[1]-1, p[2], 12, 0, 0).getTime();
      }
      isNewEra = targetMs >= pricingData.pricingConfig.threshold;
    }

    const activePrices = isNewEra ? (pricingData.newPrices || {}) : (pricingData.currentPrices || {});
    const activeProdPrices = isNewEra ? (pricingData.newProdPrices || {}) : (pricingData.currentProdPrices || {});
    const activePostPrices = isNewEra ? (pricingData.newPostPrices || {}) : (pricingData.currentPostPrices || {});
    const sizeMults = pricingData.multipliers || {};
    const constants = pricingData.constants || { viaticos: 0, comboVR: 0, ppMultiplier: 1 };

    let grandTotal = 0;
    let globalServiceCount = 0;
    let totalProdPayout = 0;
    let anyUnitHasServices = false;

    // 2. Calculate per unit
    units.forEach(unit => {
      let unitBaseMult = 0;
      let unitBaseFixed = 0;
      let hasStandardService = false;
      
      let prodFeeBase = 0;
      let prodFeeFixed = 0;
      
      unit.selectedServices.forEach(srv => {
        if (srv !== 'EXTRAS') {
          anyUnitHasServices = true;
          globalServiceCount++;
          
          // Client Price Math
          const price = activePrices[srv] || 0;
          if (srv === 'DRONE' || srv === 'FPV') {
            unitBaseFixed += price;
          } else {
            unitBaseMult += price;
            hasStandardService = true;
          }

          // Producer Payout Math
          const prodPrice = activeProdPrices[srv] || 0;
          if (srv === 'DRONE' || srv === 'FPV') prodFeeFixed += prodPrice;
          else prodFeeBase += prodPrice;
        }
      });

      if (hasStandardService) {
        unitBaseMult += 30000; // Tarifa base por unidad (Cliente)
      }

      const multValue = sizeMults[unit.metrosCuadrados] || 1;
      
      // --- Client Unit Total ---
      let unitSubtotal = (unitBaseMult * multValue) + unitBaseFixed;
      if (unit.selectedServices.includes('EXTRAS')) {
        unitSubtotal += (Number(unit.costoExtras) || 0);
      }
      grandTotal += unitSubtotal;

      // --- Producer Unit Total ---
      let unitProdPayout = (prodFeeBase * multValue) + prodFeeFixed;
      if (unit.selectedServices.includes('EXTRAS')) {
        unitProdPayout += (Number(unit.pagoEditorExtras) || 0); 
      }

      // --- Post-Prod Unit Total (for self-edited) ---
      let postFeeBase = 0;
      let postFeeFixed = 0;
      const ppServices = globalPostProd.filter(s => unit.selectedServices.includes(s));
      
      ppServices.forEach(srv => {
        if (srv !== 'EXTRAS') {
          let cost = activePostPrices[srv] || 0;
          if (srv === 'REEL' && ppServices.includes('VIDEO')) {
            const comboMult = (constants.comboVR > 0) ? constants.comboVR : 1;
            cost = cost * comboMult;
          }
          if (srv === 'DRONE' || srv === 'FPV') postFeeFixed += cost;
          else postFeeBase += cost;
        }
      });

      let unitPostPayout = ((postFeeBase * multValue) + postFeeFixed) * (constants.ppMultiplier || 1);
      
      totalProdPayout += (unitProdPayout + unitPostPayout);
    });

    // Viaticos apply once globally
    if (anyUnitHasServices) {
      totalProdPayout += (constants.viaticos || 0);
    }

    let discount = 0;
    if (globalServiceCount > db.discountThreshold) {
      discount = (globalServiceCount - db.discountThreshold) * db.discountAmount;
    }

    grandTotal -= discount;
    if (grandTotal < 0) grandTotal = 0;

    return { total: grandTotal, producerPayout: totalProdPayout, discountApplied: discount, baseCount: globalServiceCount };
  }, [units, selectedDateObj, db, pricingData, globalPostProd]);

  // ==========================================
  // CRM LOGIC
  // ==========================================
  useEffect(() => {
    if (clientDb.length === 0) return;
    const cleanPhone = formData.phone ? String(formData.phone).replace(/\D/g, '') : '';
    if (cleanPhone.length < 5) {
      setFieldStates({ name: 'new', lastName: 'new', company: 'new', email: 'new', phone: 'new' });
      setMatchedClient(null); return;
    }
    const dbMatch = clientDb.find(c => {
      const dbPhone = c.telefono ? String(c.telefono).replace(/\D/g, '') : '';
      return dbPhone === cleanPhone;
    });
    if (!dbMatch) {
      setFieldStates({ name: 'new', lastName: 'new', company: 'new', email: 'new', phone: 'new' });
      setMatchedClient(null); return;
    }

    setMatchedClient(dbMatch);
    const newStates = { phone: 'existing', name: 'new', lastName: 'new', company: 'new', email: 'new', dniCuit: 'new', condicionIva: 'new', modalidadPago: 'new' };
    const checkMatch = (currentVal, dbVal) => {
      const safeCurrent = String(currentVal || '').trim().toLowerCase();
      const safeDb = String(dbVal || '').trim().toLowerCase();
      if (safeCurrent === '') return 'new';
      if (safeCurrent === safeDb) return 'existing';
      return 'modified';
    };
    
    const checkMatchCuit = (currentVal, dbVal) => {
      const safeCurrent = String(currentVal || '').replace(/\D/g, '');
      const safeDb = String(dbVal || '').replace(/\D/g, '');
      if (safeCurrent === '') return 'new';
      if (safeCurrent === safeDb) return 'existing';
      return 'modified';
    };

    // 🚀 AUTO-FILL: If the user just typed the phone number and it matches, auto-fill the boring stuff!
    setFormData(prev => {
      const next = { ...prev };
      let changed = false;
      
      // Only auto-fill if the current input is empty, to prevent overwriting deliberate typing
      if (!next.dniCuit && dbMatch.dniCuit) { next.dniCuit = dbMatch.dniCuit; changed = true; }
      if (!next.condicionIva && dbMatch.condicionIva) { next.condicionIva = dbMatch.condicionIva; changed = true; }
      if (next.modalidadPago === 'Individual' && dbMatch.modalidadPago === 'Corporativo') { next.modalidadPago = 'Corporativo'; changed = true; }
      
      return changed ? next : prev;
    });

    newStates.name = checkMatch(formData.name, dbMatch.nombre);
    newStates.lastName = checkMatch(formData.lastName, dbMatch.apellido);
    newStates.company = checkMatch(formData.company, dbMatch.empresa);
    newStates.email = checkMatch(formData.email, dbMatch.email);
    newStates.condicionIva = checkMatch(formData.condicionIva, dbMatch.condicionIva);
    newStates.modalidadPago = checkMatch(formData.modalidadPago, dbMatch.modalidadPago);
    newStates.dniCuit = checkMatchCuit(formData.dniCuit, dbMatch.dniCuit);
    
    setFieldStates(newStates);
  }, [formData.phone, formData.name, formData.lastName, formData.company, formData.email, formData.dniCuit, formData.condicionIva, formData.modalidadPago, clientDb]);

  const handleUpdateClient = async () => {
    if (!formData.name || !formData.lastName || !formData.phone) {
      alert("⚠️ Se requiere Nombre, Apellido y Teléfono para guardar o actualizar el cliente."); return;
    }
    
    // 🚀 CRM WARNING SHIELD
    const actionText = matchedClient ? "actualizar los datos de" : "guardar al nuevo cliente";
    if (!window.confirm(`⚠️ Atención\n\n¿Estás seguro de que deseas ${actionText} ${formData.name} ${formData.lastName} en la base de datos central (CRM)?`)) {
      return;
    }

    setIsSavingClient(true);
    const payload = {
      originalKey: matchedClient ? (matchedClient.telefono || matchedClient.email || `${matchedClient.nombre} ${matchedClient.apellido}`) : '',
      nombre: formData.name, apellido: formData.lastName, empresa: formData.company,
      email: formData.email, telefono: formData.phone, modalidadPago: formData.modalidadPago,
      dniCuit: formData.dniCuit, condicionIva: formData.condicionIva
    };
    try {
      const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'update_client_profile', payload }) });
      const data = await response.json();
      if (data.success) {
        setFieldStates({ name: 'existing', lastName: 'existing', company: 'existing', email: 'existing', phone: 'existing', dniCuit: 'existing', condicionIva: 'existing', modalidadPago: 'existing' });
        const updatedClient = { nombre: formData.name, apellido: formData.lastName, empresa: formData.company, email: formData.email, telefono: formData.phone, modalidadPago: formData.modalidadPago, dniCuit: formData.dniCuit, condicionIva: formData.condicionIva };
        setClientDb(prev => {
          const newDb = [...prev];
          const idx = newDb.findIndex(c => (matchedClient && c.telefono === matchedClient.telefono) || (c.telefono && c.telefono === formData.phone));
          if (idx > -1) newDb[idx] = { ...newDb[idx], ...updatedClient };
          else newDb.push(updatedClient);
          return newDb;
        });
        setMatchedClient(updatedClient);
        alert("✅ " + (data.message || "Cliente guardado correctamente."));
      } else { alert("Error del servidor: " + data.error); }
    } catch (err) { alert("Fallo de red al actualizar el cliente."); } 
    finally { setIsSavingClient(false); }
  };

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
    if (state === 'modified') swapText = matchedClient[dbKey] || 'Vacío';
    else if (state === 'existing' && altValues[field] !== undefined) {
      const cleanAlt = String(altValues[field]).trim().toLowerCase();
      const cleanDb = String(matchedClient[dbKey]).trim().toLowerCase();
      if (cleanAlt !== cleanDb && cleanAlt !== '') swapText = altValues[field];
    }
    if (!swapText) return null;
    return (
      <button type="button" onClick={() => handleSwap(field, dbKey)} title={`Cambiar por: ${swapText}`} className="truncate text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 rounded bg-[#E2E8F0] hover:bg-[#CBD5E0] text-[#2D3748] shadow-sm border border-gray-300 transition-colors max-w-[85px] md:max-w-[120px]">
        ⇄ {swapText}
      </button>
    );
  };

  // ==========================================
  // DOM REF EFFECTS
  // ==========================================
  const hasCenteredDate = useRef(false);

  useEffect(() => {
    // Only center if we haven't done it yet
    if (!loading && selectedDateObj && dateScrollRef.current && !hasCenteredDate.current) {
      // 300ms gives the browser enough time to paint the UI before calculating widths
      setTimeout(() => {
        const container = dateScrollRef.current;
        const selectedEl = container.querySelector(`[data-date="${selectedDateObj.id}"]`);
        
        if (selectedEl) {
          // Calculate exact center
          const scrollPosition = selectedEl.offsetLeft - (container.offsetWidth / 2) + (selectedEl.offsetWidth / 2);
          container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
          
          hasCenteredDate.current = true; // Lock it so it doesn't jump when you click later!
        }
      }, 300);
    }
  }, [loading, selectedDateObj]);

  useEffect(() => {
    if (loading) return;
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=es`;
      script.async = true; script.defer = true; script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else { initAutocomplete(); }

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientWrapperRef.current && !clientWrapperRef.current.contains(e.target)) setClientSuggestions([]);
      if (companyWrapperRef.current && !companyWrapperRef.current.contains(e.target)) setCompanySuggestions([]);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'address') setIsAddressValid(false);
    
    // CUIT MASK (XX-XX.XXX.XXX-X)
    if (name === 'dniCuit') {
      let v = value.replace(/\D/g, '').substring(0, 11);
      let res = '';
      if (v.length > 0) res += v.substring(0, 2);
      if (v.length > 2) res += '-' + v.substring(2, 4);
      if (v.length > 4) res += '.' + v.substring(4, 7);
      if (v.length > 7) res += '.' + v.substring(7, 10);
      if (v.length > 10) res += '-' + v.substring(10, 11);
      value = res;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientSearch = (query) => {
    setClientSearchQuery(query);
    const normalized = normalizeText(query);
    if (normalized.length < 2) { setClientSuggestions([]); return; }
    const terms = normalized.split(/\s+/);
    const matches = clientDb.filter(c => {
      const raw = `${c.nombre} ${c.apellido} ${c.empresa} ${c.email} ${c.telefono} ${c.dniCuit}`;
      return terms.every(t => normalizeText(raw).includes(t));
    });
    setClientSuggestions(matches.slice(0, 10));
  };

  const selectClient = (c) => {
    setFormData(prev => ({ 
      ...prev, name: c.nombre, lastName: c.apellido, company: c.empresa, email: c.email, 
      phone: c.telefono, modalidadPago: c.modalidadPago || 'Individual',
      dniCuit: c.dniCuit || '', condicionIva: c.condicionIva || ''
    }));
    setClientSearchQuery(''); setClientSuggestions([]);
  };

  const handleCompanySearch = (query) => {
    setFormData(prev => ({ ...prev, company: query }));
    const val = query.toLowerCase().trim();
    if (val.length < 1) { setCompanySuggestions(uniqueCompanies.slice(0, 10)); return; }
    setCompanySuggestions(uniqueCompanies.filter(c => c.toLowerCase().includes(val)).slice(0, 10));
  };

  // 🚀 UNIT HANDLERS
  const addUnit = () => setUnits([...units, { id: Date.now(), indicaciones: '', metrosCuadrados: '100', selectedServices: [], extrasService: false, extrasDescripcion: '', costoExtras: '', pagoEditorExtras: '' }]);
  const removeUnit = (id) => setUnits(units.filter(u => u.id !== id));
  
  const updateUnit = (id, field, value) => {
    setUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const toggleUnitService = (unitId, serviceId) => {
    setUnits(units.map(u => {
      if (u.id === unitId) {
        const newSrvs = u.selectedServices.includes(serviceId) ? u.selectedServices.filter(s => s !== serviceId) : [...u.selectedServices, serviceId];
        return { ...u, selectedServices: newSrvs, extrasService: newSrvs.includes('EXTRAS') };
      }
      return u;
    }));
  };

  // 🚀 TEAM BUILDER HANDLERS
  const addTeamMember = () => setTeamMembers([...teamMembers, { name: '', services: [] }]);
  const removeTeamMember = (idx) => setTeamMembers(teamMembers.filter((_, i) => i !== idx));
  const updateTeamMemberName = (idx, name) => {
    const newTeam = [...teamMembers]; newTeam[idx].name = name; setTeamMembers(newTeam);
  };
  
  const toggleTeamMemberService = (idx, srv) => {
    const newTeam = [...teamMembers];
    if (newTeam[idx].services.includes(srv)) {
      newTeam[idx].services = newTeam[idx].services.filter(s => s !== srv);
    } else {
      // Remove from others to prevent duplication
      newTeam.forEach((m, i) => { if (i !== idx) m.services = m.services.filter(s => s !== srv); });
      newTeam[idx].services.push(srv);
    }
    setTeamMembers(newTeam);
  };

  const toggleGlobalPostProd = (srv) => {
    setGlobalPostProd(prev => prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]);
  };

  const autoAssignSingleProducer = () => {
    if (teamMembers.length === 1 && teamMembers[0].name !== '') {
      const newTeam = [...teamMembers];
      newTeam[0].services = [...allActiveServices];
      setTeamMembers(newTeam);
    }
  };

  // 🚀 SEND QUOTATION (PRESUPUESTO)
  const handleSendQuote = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("⚠️ Por favor, ingresa el Nombre y Correo Electrónico del cliente para enviarle el presupuesto."); 
      return;
    }
    if (total === 0) {
      alert("⚠️ El presupuesto actual es $0. Selecciona al menos un servicio."); 
      return;
    }

    setIsSendingQuote(true);
    const payload = {
      action: 'send_quotation',
      payload: {
        nombre: formData.name,
        email: formData.email,
        locacion: formData.address || 'A confirmar',
        units: units,
        total: total,
        discount: discountApplied
      }
    };

    try {
      const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) {
        alert("✅ Cotización enviada exitosamente a " + formData.email);
      } else {
        alert("Error del servidor: " + data.error);
      }
    } catch (err) {
      alert("Fallo de red al enviar el presupuesto.");
    } finally {
      setIsSendingQuote(false);
    }
  };

  // 🚀 CANCEL BOOKING
  const handleCancelBooking = async () => {
    setShowCancelModal(false);
    setIsSubmitting(true);
    try {
      const response = await fetch(GAS_API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'cancel_booking', payload: { eventId: jobId } }) 
      });
      const data = await response.json();
      if (data.success) {
        alert("✅ Reserva cancelada y archivada exitosamente.");
        if (onSuccess) onSuccess(); else onCancel();
      } else {
        alert("Error al cancelar: " + data.error);
      }
    } catch (err) {
      alert("Fallo de red al intentar cancelar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 FORM SUBMIT
  const handleFormSubmit = async (actionType) => {
    setIsSubmitting(true);

    if (actionType === 'checkout_booking') {
      if (Object.values(fieldStates).some(state => state === 'modified')) {
        alert("⚠️ Hay datos de cliente modificados (amarillo). Por favor, guárdalos antes del checkout."); setIsSubmitting(false); return;
      }
      if (fieldStates.name !== 'existing' || fieldStates.company !== 'existing' || fieldStates.phone !== 'existing') {
        alert("⚠️ Para Checkout, Nombre, Empresa y Teléfono deben estar registrados (verde)."); setIsSubmitting(false); return;
      }
    }

    if (units.length === 0) { alert("⚠️ Añade al menos una unidad."); setIsSubmitting(false); return; }
    if (units.some(u => u.selectedServices.length === 0)) { alert("⚠️ Todas las unidades deben tener al menos un servicio."); setIsSubmitting(false); return; }

    if (teamMembers.length > 0 && teamMembers.some(m => !m.name)) { alert("⚠️ Seleccione el nombre de todos los productores."); setIsSubmitting(false); return; }
    const unassignedSrvs = allActiveServices.filter(srv => !teamMembers.some(m => m.services.includes(srv)));
    if (teamMembers.length > 0 && unassignedSrvs.length > 0 && teamMembers[0].name !== '') {
      alert("⚠️ Faltan productores para: " + unassignedSrvs.join(', ')); setIsSubmitting(false); return;
    }

    let finalObservaciones = formData.observaciones;
    if (actionType === 'update_booking' && String(finalObservaciones).includes('SOLICITUD WEB - Pendiente')) {
      finalObservaciones = finalObservaciones.replace('SOLICITUD WEB - Pendiente', 'SOLICITUD WEB - Aprobada');
    }
    
    const teamObj = {};
    teamMembers.forEach(m => { if (m.name && m.services.length > 0) teamObj[m.name] = m.services; });
    if (Object.keys(teamObj).length > 0) {
      finalObservaciones += (finalObservaciones ? ' ' : '') + `[TEAM:${JSON.stringify(teamObj)}]`;
    }

    const payload = {
      eventId: jobId,
      nombre: formData.name, apellido: formData.lastName, empresa: formData.company,
      email: formData.email, telefono: formData.phone,
      locacion: formData.address,
      realizacion: teamMembers.map(m => m.name).filter(Boolean).join(', '),
      observaciones: finalObservaciones,
      fecha: selectedDateObj ? selectedDateObj.id : '',
      hora: selectedTime || '',
      duracion: duration,
      modalidadPago: formData.modalidadPago,
      dniCuit: formData.dniCuit,
      condicionIva: formData.condicionIva,
      skipValidation: true,
      units: units.map((u, idx) => ({ 
        ...u, 
        indicaciones: (isNewBooking && String(u.indicaciones || '').trim() === '' && units.length > 1) 
          ? `Unidad ${idx + 1}` 
          : String(u.indicaciones || '').trim(),
        postProdServices: globalPostProd 
      })) 
    };

    if (actionType === 'create_booking' || actionType === 'update_booking') {
      const safeDuration = String(duration).toLowerCase();
      let dMins = 60; 
      if (safeDuration.includes('1.5') || safeDuration.includes('90')) dMins = 90;
      else if (safeDuration.includes('2') || safeDuration.includes('120')) dMins = 120;
      else if (safeDuration.includes('2.5') || safeDuration.includes('150')) dMins = 150;
      else if (safeDuration.includes('3') || safeDuration.includes('180')) dMins = 180;
      else if (safeDuration.includes('4') || safeDuration.includes('240')) dMins = 240;
      else if (safeDuration.includes('5') || safeDuration.includes('300')) dMins = 300;
      else if (safeDuration.includes('jornada') || safeDuration.includes('completa') || safeDuration.includes('480')) dMins = 480;
      payload.duracion = dMins;
    }

    try {
      const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: actionType, payload }) });
      const data = await response.json();
      if (data.success) { if (onSuccess) onSuccess(); else onCancel(); } 
      else alert("Error del servidor: " + data.error);
    } catch (err) { alert("Fallo de red al enviar los datos."); } 
    finally { setIsSubmitting(false); }
  };

  const getFieldStyle = (fieldName) => {
    const state = fieldStates[fieldName];
    if (state === 'existing') return { backgroundColor: '#F0FFF4', border: '1px solid #C6F6D5', color: '#14532D' };
    if (state === 'modified') return { backgroundColor: '#FFFFF0', border: '1px solid #FEFCBF', color: '#744210' };
    return { backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#7F1D1D' };
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  const scrollLeft = () => dateScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
  const scrollRight = () => dateScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' });

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
        <div className="truncate pr-4 flex-1 flex flex-col md:flex-row md:items-center gap-2">
          <h2 className="text-base md:text-xl font-extrabold uppercase tracking-wide truncate" style={{ color: brandColor }}>
            {modeTitle}
          </h2>
          {!isNewBooking && !isWebRequest && (
            <div className="flex items-center gap-3">
              <p className="hidden md:block text-xs text-gray-400 font-bold tracking-wider truncate">ID: {jobId}</p>
              <button 
                onClick={() => setShowCancelModal(true)} 
                className="text-[10px] md:text-xs font-bold px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors shadow-sm"
              >
                🚫 Cancelar Reserva
              </button>
            </div>
          )}
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:bg-gray-100 font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-gray-200 transition-colors text-xs md:text-sm shrink-0 shadow-sm">
          ✕ Cerrar
        </button>
      </div>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-3 md:p-8 space-y-4 md:space-y-6 pb-32">
        
        {/* 1. CLIENTE & CRM */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6 flex justify-between items-center">
            <h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Cliente & Contacto</h2>
            <button type="button" disabled={isSavingClient} onClick={handleUpdateClient} className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-md transition-colors shadow-sm ${isSavingClient ? 'bg-green-100 text-green-700 cursor-wait' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'}`}>
              {isSavingClient ? '⏳...' : '💾 Guardar'}
            </button>
          </div>

          <div className="mb-4 md:mb-6 relative" ref={clientWrapperRef}>
            <label className="block text-[10px] md:text-xs font-bold text-[#2B6CB0] uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1">
              <Search size={12} className="md:w-3.5 md:h-3.5" /> Buscar Cliente Existente
            </label>
            <input type="text" value={clientSearchQuery} onChange={(e) => handleClientSearch(e.target.value)} onFocus={() => handleClientSearch(clientSearchQuery)} placeholder="Nombre, empresa, email o tel..." className="w-full bg-white border border-gray-200 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-all shadow-sm text-sm" autoComplete="off" />
            {clientSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 md:mt-2 left-0 right-0 bg-white border border-gray-100 rounded-lg md:rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
            
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest m-0">Nombre</label>
                {renderSwapButton('name', 'nombre')}
              </div>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm" style={getFieldStyle('name')} />
            </div>

            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest m-0">Apellido</label>
                {renderSwapButton('lastName', 'apellido')}
              </div>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm" style={getFieldStyle('lastName')} />
            </div>
            
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-12 gap-3 md:gap-5">
              <div className="sm:col-span-6 flex flex-col" ref={companyWrapperRef}>
                <div className="flex justify-between items-center mb-1 md:mb-2">
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest m-0">Empresa</label>
                  {renderSwapButton('company', 'empresa')}
                </div>
                <div className="relative">
                  <input type="text" name="company" value={formData.company} onChange={(e) => { handleInputChange(e); handleCompanySearch(e.target.value); }} onFocus={() => handleCompanySearch(formData.company)} placeholder="Escribir..." className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm" style={getFieldStyle('company')} autoComplete="off" />
                  {companySuggestions.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg md:rounded-xl shadow-lg z-40 max-h-40 overflow-y-auto">
                      {companySuggestions.map((c, i) => (
                        <div key={i} onClick={() => { setFormData(prev => ({...prev, company: c})); setCompanySuggestions([]); }} className="p-2.5 md:p-3 hover:bg-gray-50 cursor-pointer font-medium text-xs md:text-sm border-b border-gray-50">{c}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3 flex flex-col">
                <div className="flex justify-between items-center mb-1 md:mb-2 gap-2">
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest m-0 truncate">CUIT</label>
                  {renderSwapButton('dniCuit', 'dniCuit')}
                </div>
                <input type="text" name="dniCuit" inputMode="numeric" value={formData.dniCuit} onChange={handleInputChange} placeholder="XX-XX.XXX.XXX-X" className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm" style={getFieldStyle('dniCuit')} />
              </div>

              <div className="sm:col-span-3 flex flex-col">
                <div className="flex justify-between items-center mb-1 md:mb-2 gap-2">
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest m-0 truncate">IVA</label>
                  {renderSwapButton('condicionIva', 'condicionIva')}
                </div>
                <select name="condicionIva" value={formData.condicionIva} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm cursor-pointer" style={getFieldStyle('condicionIva')}>
                  <option value="">Seleccionar...</option>
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="Responsable Inscripto">Resp. Inscripto</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Exento">Exento</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest m-0">Teléfono (ID)</label>
                {/* Botón de Swap removido: El teléfono es la llave maestra */}
              </div>
              <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm" style={getFieldStyle('phone')} />
            </div>

            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest m-0">Email</label>
                {renderSwapButton('email', 'email')}
              </div>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none transition-all text-sm" style={getFieldStyle('email')} />
            </div>

            <div className="sm:col-span-2 mt-2 p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border transition-all" style={getFieldStyle('modalidadPago')}>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest m-0" style={{ color: getFieldStyle('modalidadPago').color }}>Modalidad de Pago (Cobranzas)</label>
                {renderSwapButton('modalidadPago', 'modalidadPago')}
              </div>
              <select name="modalidadPago" value={formData.modalidadPago} onChange={handleInputChange} className="w-full bg-transparent font-bold outline-none text-xs md:text-sm cursor-pointer" style={{ color: getFieldStyle('modalidadPago').color }}>
                <option value="Individual">Individual (Cobro Directo al Cliente)</option>
                <option value="Corporativo">Corporativo (Cobro Consolidado a la Empresa)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 2. LOCACIÓN BASE */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6"><h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Locación Base</h2></div>
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Dirección Edificio/Complejo {!isAddressValid && formData.address && <span className="text-red-500 ml-1 normal-case">(Sugerida Maps)</span>}</label>
            <div className="relative">
              <MapPin size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isAddressValid ? 'text-green-500' : 'text-gray-400'}`} />
              <input type="text" ref={addressInputRef} name="address" value={formData.address} onChange={handleInputChange} className={`w-full bg-[#F4F4F5] py-2.5 pl-8 pr-3 md:py-3.5 md:pl-10 md:pr-4 rounded-lg md:rounded-xl font-medium outline-none text-sm ${isAddressValid ? 'ring-1 ring-[#4bbf73]' : ''}`} />
            </div>
          </div>
        </section>

        {/* 3. UNITS ENGINE */}
        {units.map((unit, index) => (
          <section key={unit.id} className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border-t-4 border-[#EB4511] relative">
            {units.length > 1 && (
              <button onClick={() => removeUnit(unit.id)} className="absolute right-4 top-4 bg-red-50 text-red-500 hover:bg-red-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                <X size={16} strokeWidth={3}/>
              </button>
            )}
            <h2 className="text-base md:text-lg font-bold uppercase mb-4" style={{ color: brandColor }}>Unidad {units.length > 1 ? index + 1 : ''}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Indicaciones (Depto/Lote)</label>
                <input type="text" value={unit.indicaciones} onChange={(e) => updateUnit(unit.id, 'indicaciones', e.target.value)} placeholder="Ej: Depto 4A..." className="w-full bg-[#F4F4F5] border-none py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl outline-none font-medium text-sm" />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Metros Cuadrados</label>
                <select value={unit.metrosCuadrados} onChange={(e) => updateUnit(unit.id, 'metrosCuadrados', e.target.value)} className="w-full bg-[#F4F4F5] border-none py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl outline-none font-medium text-sm">
                  {db.multipliers.map(m => <option key={m.id} value={m.sheetValue}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Servicios</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-3">
              {db.services.map((srv) => {
                const isSelected = unit.selectedServices.includes(srv.id);
                return (
                  <button key={srv.id} onClick={() => toggleUnitService(unit.id, srv.id)} className={`w-full h-[36px] md:w-[100px] md:h-[40px] rounded-full font-bold text-[10px] md:text-sm tracking-wide transition-all select-none ${isSelected ? 'bg-[#EB4511] text-white shadow-md -translate-y-0.5' : 'bg-[#F4F4F5] text-gray-600'}`}>
                    {srv.label}
                  </button>
                );
              })}
              <button onClick={() => toggleUnitService(unit.id, 'EXTRAS')} className={`w-full h-[36px] md:w-[100px] md:h-[40px] rounded-full font-bold text-[10px] md:text-sm tracking-wide transition-all select-none ${unit.selectedServices.includes('EXTRAS') ? 'bg-[#EB4511] text-white shadow-md -translate-y-0.5' : 'bg-[#F4F4F5] text-gray-600'}`}>
                EXTRAS
              </button>
            </div>

            {unit.selectedServices.includes('EXTRAS') && (
              <div className="mt-4 md:mt-6 p-4 md:p-5 bg-orange-50/50 rounded-xl md:rounded-2xl border border-orange-100 animate-in fade-in duration-200">
                <label className="block text-[10px] md:text-xs font-bold text-orange-600 uppercase tracking-widest mb-3">Detalle de Extras</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descripción</label>
                    <input type="text" value={unit.extrasDescripcion} onChange={(e) => updateUnit(unit.id, 'extrasDescripcion', e.target.value)} placeholder="Ej: Fotos 360..." className="w-full bg-white border border-orange-100 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Cobro Cliente</label>
                      <input type="number" value={unit.costoExtras} onChange={(e) => updateUnit(unit.id, 'costoExtras', e.target.value)} placeholder="$0" className="w-full bg-white border border-orange-100 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-bold outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">Pago Editor</label>
                      <input type="number" value={unit.pagoEditorExtras} onChange={(e) => updateUnit(unit.id, 'pagoEditorExtras', e.target.value)} placeholder="$0" className="w-full bg-white border border-indigo-100 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-bold outline-none text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        ))}

        <button onClick={addUnit} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border-2 border-dashed border-blue-200 py-4 rounded-2xl font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
          <Plus size={18} /> Agregar Otra Unidad
        </button>

        {/* 4. TEAM BUILDER */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6"><h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Equipo de Producción</h2></div>
          
          <div className="space-y-4">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="bg-[#F9F9F9] border border-gray-200 p-4 rounded-xl relative">
                <div className="flex gap-3 items-center mb-3">
                  <select value={member.name} onChange={(e) => { updateTeamMemberName(idx, e.target.value); autoAssignSingleProducer(); }} className="flex-1 bg-white border border-gray-200 py-2.5 px-3 rounded-lg outline-none font-medium text-sm">
                    <option value="">Seleccionar Productor...</option>
                    {config?.realizadoresList?.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                  {teamMembers.length > 1 && (
                    <button onClick={() => removeTeamMember(idx)} className="bg-red-50 text-red-500 w-10 h-10 rounded-lg flex items-center justify-center font-bold">X</button>
                  )}
                </div>
                
                {teamMembers.length > 1 && allActiveServices.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allActiveServices.map(srv => {
                      const isAssignedToOther = teamMembers.some((m, i) => i !== idx && m.services.includes(srv));
                      const isChecked = member.services.includes(srv);
                      return (
                        <button key={srv} onClick={() => toggleTeamMemberService(idx, srv)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isChecked ? 'bg-indigo-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'} ${isAssignedToOther && !isChecked ? 'opacity-40' : ''}`}>
                          {srv}
                        </button>
                      );
                    })}
                  </div>
                )}
                {teamMembers.length > 1 && allActiveServices.length === 0 && <div className="text-xs text-gray-400">Selecciona servicios en las unidades primero.</div>}
              </div>
            ))}
            <button onClick={addTeamMember} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2">
              <Plus size={16} /> Sumar Productor
            </button>
          </div>

          <div className="mt-6">
            <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">Observaciones Internas</label>
            <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} rows="2" placeholder="Notas para edición, links..." className="w-full bg-[#F4F4F5] border-none py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl outline-none font-medium text-sm" />
          </div>
        </section>

        {/* 5. GLOBAL POST-PROD */}
        {!isNewBooking && !isWebRequest && allActiveServices.filter(s => s !== 'EXTRAS').length > 0 && (
          <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="mb-4 md:mb-6"><h2 className="text-base md:text-lg font-bold uppercase text-[#38a169]">¿El equipo editará material propio?</h2></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-3">
              {allActiveServices.filter(s => s !== 'EXTRAS').map((srv) => {
                const isSelfEdited = globalPostProd.includes(srv);
                return (
                  <button key={`gpp-${srv}`} onClick={() => toggleGlobalPostProd(srv)} className={`w-full h-[36px] md:w-[100px] md:h-[40px] rounded-full font-bold text-[10px] md:text-sm tracking-wide transition-all select-none ${isSelfEdited ? 'bg-[#38a169] text-white shadow-md -translate-y-0.5' : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'}`}>
                    {srv}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. FECHA Y HORA */}
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-4 md:mb-6"><h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>Fecha y Hora</h2></div>
          <div className="space-y-6 md:space-y-8">
            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Seleccionar Fecha</label>
              <div className="flex items-center gap-2 md:gap-4">
                <button onClick={scrollLeft} className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-[#EB4511] hover:bg-gray-50"><ChevronLeft size={20}/></button>
                
                {/* 🚀 FIX: Added 'relative' to make offsetLeft math work, removed CSS snap so JS can center smoothly */}
                <div ref={dateScrollRef} className="relative flex flex-1 gap-2 md:gap-3 overflow-x-auto scroll-smooth py-2 px-1 [&::-webkit-scrollbar]:hidden">
                  {dateOptions.map(d => {
                    const isSelected = selectedDateObj?.id === d.id;
                    return (
                      <button key={d.id} data-date={d.id} onClick={() => setSelectedDateObj(d)} className={`flex flex-col items-center justify-center w-[64px] h-[64px] md:w-[72px] md:h-[72px] shrink-0 rounded-2xl border-2 transition-all select-none ${isSelected ? 'border-[#EB4511] shadow-md bg-white -translate-y-0.5' : 'border-transparent bg-[#F4F4F5] hover:bg-gray-200'}`}>
                        <span className={`text-[10px] md:text-[11px] font-bold uppercase ${isSelected ? 'text-[#EB4511]' : 'text-gray-500'}`}>{d.dayName}</span>
                        <span className={`text-xl md:text-2xl font-black mt-0.5 ${isSelected ? 'text-[#2d2d2d]' : 'text-gray-500'}`}>{d.dayNumber}</span>
                      </button>
                    )
                  })}
                </div>
                
                <button onClick={scrollRight} className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-[#EB4511] hover:bg-gray-50"><ChevronRight size={20}/></button>
              </div>
              <div className="mt-5 text-center min-h-[20px]">{selectedDateObj && <span className="text-[13px] font-bold uppercase tracking-wide text-[#EB4511]">{selectedDateObj.fullFormat}</span>}</div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Seleccionar Hora</label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-3">
                {timeOptions.map(time => {
                  const isSelected = selectedTime === time;
                  return <button key={time} onClick={() => setSelectedTime(time)} className={`py-2 rounded-full font-bold text-xs md:text-sm transition-all select-none ${isSelected ? 'bg-[#EB4511] text-white shadow-md -translate-y-0.5' : 'bg-[#F4F4F5] text-gray-600'}`}>{time}</button>
                })}
              </div>
            </div>      
            
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-3">Duración Estimada</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-[#F4F4F5] border-none py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl font-medium outline-none text-sm">
                <option value="1 Hora">1 Hora</option>
                <option value="1.5 Horas">1.5 Horas</option>
                <option value="2 Horas">2 Horas</option>
                <option value="3 Horas">3 Horas</option>
                <option value="4 Horas">4 Horas</option>
                <option value="Jornada Completa">Jornada Completa</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="p-4 md:px-8 md:py-5 bg-white border-t border-gray-200 flex flex-col md:flex-row justify-between items-center z-10 shrink-0 gap-3 md:gap-0" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        
        {/* MOBILE: Toggle Layout */}
        <div 
          className="flex md:hidden flex-row justify-between items-center w-full shrink-0 cursor-pointer group select-none"
          onClick={() => setShowProducerPayout(!showProducerPayout)}
        >
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 transition-colors group-hover:text-gray-600">
             {showProducerPayout ? 'Pago Prod.' : 'Total Estimado'}
             <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
           </span>
           <div className="text-xl font-extrabold leading-none transition-colors" style={{ color: showProducerPayout ? '#38a169' : brandColor }}>
             {formatCurrency(showProducerPayout ? producerPayout : total)}
           </div>
        </div>

        {/* DESKTOP: Side-by-Side Layout */}
        <div className="hidden md:flex flex-row items-center gap-6 shrink-0">
          <div className="flex flex-col justify-between items-start w-auto">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Estimado</span>
             <div className="flex items-baseline gap-2">
               <span className="text-2xl font-extrabold leading-none" style={{ color: brandColor }}>
                 {formatCurrency(total)}
               </span>
               {discountApplied > 0 && (
                 <span className="text-sm font-semibold text-gray-400 line-through">
                   {formatCurrency(total + discountApplied)}
                 </span>
               )}
             </div>
          </div>
          
          <div className="flex flex-col justify-between items-start w-auto border-l border-gray-200 pl-6">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pago Prod.</span>
             <div className="text-2xl font-extrabold leading-none text-[#38a169]">
               {formatCurrency(producerPayout)}
             </div>
          </div>
        </div>
        
        <div className="flex flex-row gap-2 w-full md:w-auto justify-end">
          {isNewBooking ? (
            <>
              <button 
                onClick={handleSendQuote} 
                disabled={isSubmitting || isSendingQuote || total === 0} 
                className="flex-1 md:flex-none px-3 py-3 md:px-6 md:py-3.5 bg-white border-2 border-[#EB4511] text-[#EB4511] font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase tracking-wide shadow-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors disabled:opacity-50"
              >
                {isSendingQuote ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Mail size={16} /> Enviar Presupuesto</>}
              </button>
              <button onClick={() => handleFormSubmit('create_booking')} disabled={isSubmitting} className="flex-1 md:flex-none px-4 py-3 md:px-8 md:py-3.5 bg-[#EB4511] text-white font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase tracking-wide shadow-sm flex items-center justify-center disabled:opacity-50">
                {isSubmitting ? <><MiniLogo /> Procesando</> : 'Cargar Reserva'}
              </button>
            </>
          ) : isWebRequest ? (
            <>
              <button onClick={() => { if(confirm("¿Rechazar solicitud?")) handleFormSubmit('reject_booking'); }} disabled={isSubmitting} className="flex-1 md:flex-none px-4 py-3 md:px-8 md:py-3.5 bg-red-50 text-red-600 font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase disabled:opacity-50">Rechazar</button>
              <button onClick={() => handleFormSubmit('update_booking')} disabled={isSubmitting} className="flex-1 md:flex-none px-4 py-3 md:px-8 md:py-3.5 bg-yellow-500 text-white font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase flex items-center justify-center disabled:opacity-50">
                {isSubmitting ? <><MiniLogo /> Aprobando</> : 'Aprobar'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleFormSubmit('checkout_booking')} disabled={isSubmitting} className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-3.5 bg-white border-2 border-green-500 text-green-600 font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase flex items-center justify-center disabled:opacity-50 shadow-sm hover:shadow-md transition-all">
                Checkout
              </button>
              
              <button 
                onClick={() => handleFormSubmit('update_booking')} 
                disabled={isSubmitting || !isDirty} 
                className={`flex-1 md:flex-none px-2 py-3 md:px-8 md:py-3.5 font-bold rounded-xl md:rounded-full text-xs md:text-sm uppercase flex items-center justify-center transition-all duration-200
                  ${isSubmitting || !isDirty 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                    : 'bg-[#EB4511] text-white hover:bg-[#c42e0d] shadow-md hover:shadow-lg hover:-translate-y-0.5'
                  }`}
              >
                Actualizar
              </button>
            </>
          )}
        </div>
      </div>

      {/* 🚀 CANCEL WARNING MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] max-w-[380px] w-full px-6 py-8 text-center relative animate-in zoom-in-95 duration-200">
            <div className="text-[50px] mb-2 leading-none">⚠️</div>
            <h3 className="text-xl font-extrabold text-[#E53B12] mb-3">¿Cancelar Reserva?</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">
              Esta acción moverá la reserva al <b>Archivo</b>, establecerá todos los montos en <b>$0</b> y marcará el evento del calendario en <b>rojo</b>.<br/><br/>
              <i>Esta acción no se puede deshacer fácilmente.</i>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors uppercase text-xs"
              >
                Atrás
              </button>
              <button 
                onClick={handleCancelBooking}
                className="flex-1 bg-[#E53B12] hover:bg-[#c42e0d] text-white font-bold py-3 rounded-xl transition-colors shadow-md uppercase text-xs"
              >
                Sí, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 FULL-SCREEN PROCESSING OVERLAY */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[999] bg-gray-900/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          <LoadingLogo message="Procesando operación..." />
        </div>
      )}

    </div>
  );
}