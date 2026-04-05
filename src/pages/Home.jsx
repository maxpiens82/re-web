import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Camera, 
  Video, 
  Clapperboard, 
  Mic, 
  Map as MapIcon, 
  Compass,
  Plane, 
  Crosshair,
  MapPin,
  Calendar,
  User,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  Check,
  Info,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// ==========================================
// 1. ADD YOUR GOOGLE MAPS API KEY HERE
// ==========================================
const GOOGLE_MAPS_API_KEY = "AIzaSyCfHCPO8Yb-rYqxMWToYq7GsV3VZ1iz0EE"; 

// ==========================================
// GENERATE DATES OUTSIDE COMPONENT
// ==========================================
const generateDates = () => {
  const options = [];
  const now = new Date();
  // Expandimos a 90 días para abarcar meses adyacentes
  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).substring(0, 3).toUpperCase().replace('.', ''); 
    const dayNumber = d.getDate();
    const monthNumber = String(d.getMonth() + 1).padStart(2, '0');
    options.push({
      id: d.toISOString().split('T')[0], // ID más limpio (YYYY-MM-DD)
      dateObj: d,
      dayName,
      dayNumber,
      fullFormat: `${dayName} ${dayNumber}/${monthNumber}`
    });
  }
  return options;
};

export default function App() {
  const [selectedServices, setSelectedServices] = useState([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);

  // 🚀 THE NEW STATE: Dynamic Pricing Data
  const [db, setDb] = useState(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  // Date & Time Picker State
  const [dateOptions] = useState(generateDates); // Inicializamos las opciones
  const [selectedDateObj, setSelectedDateObj] = useState(dateOptions[0]); // Por defecto: HOY
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState('1 Hora');

  const dateScrollRef = useRef(null);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    address: '',
    instructions: '',
    name: '',
    company: '',
    email: '',
    phone: ''
  });

  const brandColor = "#EB4511";

  // ==========================================
  // GENERATE TIMES
  // ==========================================
  const timeOptions = useMemo(() => [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
    '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ], []);

  // ==========================================
  // 1. FETCH PRICES FROM GOOGLE SHEETS
  // ==========================================
  useEffect(() => {
    const fetchPrices = async () => {
      const API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec?api=prices";
      
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data.success) {
          const iconMap = {
            'FOTO': Camera, 'VIDEO': Video, 'REEL': Clapperboard, 'TH': Mic,
            'PLANO': MapIcon, 'TOUR': Compass, 'DRONE': Plane, 'FPV': Crosshair
          };

          const mappedServices = data.services.map(s => ({
            id: s.id,
            label: s.id === 'TH' ? 'Talking Head' : 
                   s.id === 'FOTO' ? 'Fotografía' : 
                   s.id === 'VIDEO' ? 'Video Recorrido' : 
                   s.id === 'REEL' ? 'Reel Vertical' : 
                   s.id === 'PLANO' ? 'Plano 2D' : 
                   s.id === 'TOUR' ? 'Video Tour' : 
                   s.id === 'DRONE' ? 'Drone Aéreo' : 
                   s.id === 'FPV' ? 'Drone FPV' : s.id,
            price: s.price,
            isFixed: s.isFixed,
            icon: iconMap[s.id] || Camera 
          }));

          const mappedMultipliers = data.multipliers.map((m, index) => {
            let label = `Hasta ${m.sheetValue}m²`;
            if (index > 0) {
              const prevValue = data.multipliers[index - 1].sheetValue;
              label = `${parseInt(prevValue) + 1} a ${m.sheetValue}m²`;
            }
            if (index === data.multipliers.length - 1) {
              label = `Más de ${data.multipliers[index - 1].sheetValue}m²`;
            }

            return {
              id: `m${m.sheetValue}`,
              label: label,
              value: m.value,
              sheetValue: m.sheetValue
            };
          });

          setDb({
            services: mappedServices,
            multipliers: mappedMultipliers,
            discountThreshold: 3, 
            discountAmount: 5000 
          });
          setIsLoadingPrices(false);
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
        setIsLoadingPrices(false); 
      }
    };

    fetchPrices();
  }, []);

  // ==========================================
  // GOOGLE MAPS AUTOCOMPLETE INITIALIZATION
  // ==========================================
  useEffect(() => {
    if (isLoadingPrices) return;

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=es`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      initAutocomplete();
    }

    function initAutocomplete() {
      if (window.google && addressInputRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'ar' }
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setFormData(prev => ({ ...prev, address: place.formatted_address }));
            setIsAddressValid(true); 
          } else {
            setIsAddressValid(false);
          }
        });
      }
    }
  }, [isLoadingPrices]); 

  // --- CALCULATION ENGINE ---
  const { total, discountApplied, baseCount } = useMemo(() => {
    if (!db) return { total: 0, discountApplied: 0, baseCount: 0 };

    let baseMult = 0;
    let baseFixed = 0;
    let serviceCount = 0;

    selectedServices.forEach(serviceId => {
      const service = db.services.find(s => s.id === serviceId);
      if (service) {
        if (service.isFixed) {
          baseFixed += service.price;
        } else {
          baseMult += service.price;
          serviceCount++;
        }
      }
    });

    let discount = 0;
    if (serviceCount > db.discountThreshold) {
      discount = (serviceCount - db.discountThreshold) * db.discountAmount;
    }

    const calculatedTotal = ((baseMult - discount) * multiplier) + baseFixed;

    return {
      total: calculatedTotal,
      discountApplied: discount > 0 ? discount * multiplier : 0, 
      baseCount: serviceCount
    };
  }, [selectedServices, multiplier, db]);

  // --- HANDLERS ---
  const toggleService = (id) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'address') setIsAddressValid(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !selectedDateObj || !selectedTime) {
      alert("⚠️ Por favor, ingresa tu nombre y selecciona una fecha y hora preferida.");
      return;
    }

    if (!isAddressValid) {
      alert("📍 Por favor, selecciona una dirección válida de las sugerencias de Google Maps.");
      if(addressInputRef.current) addressInputRef.current.focus();
      return;
    }

    setIsSubmitting(true);
    
    const API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

    // Combine date, time and duration into the datetime string expected by backend
    const formattedDateTime = `${selectedDateObj.fullFormat} a las ${selectedTime} (${duration})`;

    const payload = {
      action: 'web_booking_request',
      payload: {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        instructions: formData.instructions,
        datetime: formattedDateTime,
        services: selectedServices,
        multiplierLabel: db.multipliers.find(m => m.value === multiplier)?.sheetValue || '100',
        total: total
      }
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload)
      });

      setIsSubmitting(false);
      setShowModal(true);

    } catch (error) {
      console.error("Error connecting to API:", error);
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Carousel Helpers
  const scrollLeft = () => {
    if (dateScrollRef.current) {
      dateScrollRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (dateScrollRef.current) {
      dateScrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  // 🚀 SHOW LOADING STATE UNTIL DB FETCHES
  if (isLoadingPrices || !db) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center">
         <div className="w-12 h-12 border-4 border-gray-200 border-t-[#EB4511] rounded-full animate-spin mb-4"></div>
         <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Sincronizando Precios...</p>
      </div>
    );
  }

  // 🚀 RENDER MAIN UI
  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#2d2d2d] font-sans pb-32">
      
      {/* Hero / Header */}
      <header 
        className="text-white pt-12 pb-24 px-6 text-center relative"
        style={{ backgroundColor: brandColor }}
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <img 
            src="https://lh3.googleusercontent.com/d/1oHw3lpx4-EAI59BDMccfjPl_I529xqWU" 
            alt="RE! Contenido Audiovisual" 
            className="w-full max-w-[320px] h-auto object-contain mb-8"
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = "https://placehold.co/600x200/EB4511/FFFFFF/png?text=RE!+Contenido+Audiovisual";
            }}
          />
          
          <h1 className="text-xl md:text-2xl font-semibold tracking-wide opacity-90 uppercase">
            Simulador de Presupuestos
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 -mt-12 relative z-10 space-y-6">
        
        {/* Step 1: Services */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h2 className="text-[17px] font-bold uppercase" style={{ color: brandColor }}>
              Servicios
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {db.services.map((srv) => {
              const isSelected = selectedServices.includes(srv.id);
              return (
                <button
                  key={srv.id}
                  onClick={() => toggleService(srv.id)}
                  className={`relative px-6 py-2.5 rounded-full font-bold text-xs md:text-sm tracking-wide transition-all duration-200 select-none
                    ${isSelected 
                      ? 'bg-[#EB4511] text-white shadow-[0_6px_16px_rgba(235,69,17,0.35)] -translate-y-0.5' 
                      : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {srv.id}
                </button>
              );
            })}
          </div>

          {/* Discount Indicator */}
          {baseCount > 0 && (
            <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 transition-colors ${baseCount >= 4 ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-500'}`}>
              <Info size={20} className={`mt-0.5 flex-shrink-0 ${baseCount >= 4 ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="text-sm font-medium">
                <span className="block mb-1">* Descuento automático por volumen:</span>
                Llevando 4 o más servicios base, se aplica una bonificación. 
                {baseCount >= 4 && <span className="block mt-1 text-green-700 font-bold">¡Descuento activado!</span>}
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Locación */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h2 className="text-[17px] font-bold uppercase" style={{ color: brandColor }}>
              Locación
            </h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Metros Cuadrados</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-[#F4F4F5] border-none text-gray-800 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-colors cursor-pointer font-medium"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                >
                  {db.multipliers.map(m => (
                    <option key={m.id} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Dirección del Servicio {!isAddressValid && formData.address && <span className="text-red-500 ml-2">(Seleccioná de la lista)</span>}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  name="address"
                  ref={addressInputRef}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Buscar dirección..."
                  className={`w-full bg-[#F4F4F5] border py-3.5 px-4 rounded-xl focus:outline-none transition-colors font-medium
                    ${isAddressValid ? 'border-[#4bbf73] ring-1 ring-[#4bbf73]' : 'border-transparent focus:ring-2 focus:ring-[#EB4511]/20'}`}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Indicaciones (Piso, Depto, Torre)
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  placeholder="Ej: 4to B, Tocar timbre recepción..."
                  className="w-full bg-[#F4F4F5] border border-transparent py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-colors font-medium"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: CUSTOM DATE & TIME PICKER */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h2 className="text-[17px] font-bold uppercase" style={{ color: brandColor }}>
              Fecha y Hora
            </h2>
          </div>

          <div className="space-y-8">
            {/* DATE SELECTOR */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                Seleccionar Fecha
              </label>
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={scrollLeft} 
                  type="button"
                  className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-[#EB4511] hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <ChevronLeft size={20} strokeWidth={2.5}/>
                </button>

                <div 
                  ref={dateScrollRef}
                  className="flex flex-1 gap-2 md:gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {dateOptions.map(d => {
                    const isSelected = selectedDateObj?.id === d.id;
                    return (
                      <button 
                        key={d.id} 
                        onClick={() => setSelectedDateObj(d)} 
                        type="button"
                        className={`flex flex-col items-center justify-center w-[64px] h-[64px] md:w-[72px] md:h-[72px] shrink-0 rounded-2xl border-2 transition-all select-none snap-start
                          ${isSelected 
                            ? 'border-[#EB4511] shadow-[0_4px_14px_rgba(235,69,17,0.2)] bg-white -translate-y-0.5' 
                            : 'border-transparent bg-[#F4F4F5] hover:bg-gray-200'}`}
                      >
                        <span className={`text-[10px] md:text-[11px] font-bold tracking-wide uppercase ${isSelected ? 'text-[#EB4511]' : 'text-gray-500'}`}>{d.dayName}</span>
                        <span className={`text-xl md:text-2xl font-black mt-0.5 ${isSelected ? 'text-[#2d2d2d]' : 'text-gray-500'}`}>{d.dayNumber}</span>
                      </button>
                    )
                  })}
                </div>

                <button 
                  onClick={scrollRight} 
                  type="button"
                  className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-[#EB4511] hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <ChevronRight size={20} strokeWidth={2.5}/>
                </button>
              </div>

              {/* Selected Date Subtitle */}
              <div className="mt-5 text-center min-h-[20px]">
                {selectedDateObj && (
                  <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: brandColor }}>
                    {selectedDateObj.fullFormat}
                  </span>
                )}
              </div>
            </div>

            {/* TIME SELECTOR */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                Seleccionar Hora
              </label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-3">
                {timeOptions.map(time => {
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 rounded-full font-bold text-xs md:text-sm transition-all select-none
                        ${isSelected
                          ? 'bg-[#EB4511] text-white shadow-[0_4px_14px_rgba(235,69,17,0.35)] -translate-y-0.5'
                          : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'}`}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ESTIMATED DURATION */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                Duración Estimada
              </label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-[#F4F4F5] border-none text-gray-800 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-colors cursor-pointer font-medium text-sm"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="1 Hora">1 Hora</option>
                  <option value="1.5 Horas">1.5 Horas</option>
                  <option value="2 Horas">2 Horas</option>
                  <option value="3 Horas">3 Horas</option>
                  <option value="Jornada Completa">Jornada Completa</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Step 4: User Details */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
           <div className="mb-6">
            <h2 className="text-[17px] font-bold uppercase" style={{ color: brandColor }}>
              Tus Datos
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nombre y Apellido"
                className="w-full bg-[#F4F4F5] border-none text-gray-800 py-3.5 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-colors font-medium"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Building size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Empresa o Inmobiliaria"
                className="w-full bg-[#F4F4F5] border-none text-gray-800 py-3.5 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-colors font-medium"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Correo Electrónico"
                className="w-full bg-[#F4F4F5] border-none text-gray-800 py-3.5 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-all font-medium"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Phone size={18} className="text-gray-400" />
              </div>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Teléfono (WhatsApp)"
                className="w-full bg-[#F4F4F5] border-none text-gray-800 py-3.5 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 transition-all font-medium"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          
          <div className="flex flex-col">
             <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">
               Precio Estimado
             </span>
             <div className="flex items-baseline gap-2">
               <span className="text-2xl md:text-3xl font-extrabold" style={{ color: brandColor }}>
                 {formatCurrency(total)}
               </span>
               {discountApplied > 0 && (
                 <span className="text-sm font-semibold text-gray-400 line-through">
                   {formatCurrency(total + discountApplied)}
                 </span>
               )}
             </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={total === 0 || isSubmitting}
            className={`px-8 py-3.5 md:px-10 md:py-4 rounded-full font-bold uppercase tracking-wider text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2
              ${total === 0 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'text-white shadow-md hover:opacity-90 hover:shadow-[0_4px_14px_rgba(235,69,17,0.4)] hover:-translate-y-0.5'
              }`}
            style={{ backgroundColor: total === 0 ? undefined : brandColor }}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando
              </>
            ) : (
              'Confirmar Reserva'
            )}
          </button>
        </div>
      </footer>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] max-w-[340px] w-full px-8 py-10 text-center relative animate-in zoom-in-95 duration-200">
            
            <div className="mb-4 mt-2">
              <Check size={80} className="text-[#4bbf73] mx-auto" strokeWidth={3} />
            </div>
            
            <h3 className="text-[22px] font-extrabold text-[#1a1a1a] mb-4">¡Reserva Confirmada!</h3>
            <p className="text-[#6b7280] text-[15px] leading-relaxed mb-8 px-2 font-medium">
              La reserva se ha procesado<br/>correctamente.
            </p>
            
            <button 
              onClick={() => {
                setShowModal(false);
                setFormData({ address: '', instructions: '', name: '', company: '', email: '', phone: '' });
                setSelectedServices([]);
                setMultiplier(1.0);
                setIsAddressValid(false);
                setSelectedDateObj(dateOptions[0]); // Reset a HOY
                setSelectedTime(null);
                setDuration('1 Hora');
                if(dateScrollRef.current) dateScrollRef.current.scrollTo({ left: 0 });
              }}
              className="w-full text-white font-bold py-3.5 px-6 rounded-full transition-transform hover:-translate-y-0.5 active:translate-y-0 uppercase text-sm tracking-wide"
              style={{ backgroundColor: '#4bbf73' }}
            >
              NUEVA RESERVA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}