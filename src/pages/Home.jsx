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
  Info,
  X
} from 'lucide-react';

// ==========================================
// 1. ADD YOUR GOOGLE MAPS API KEY HERE
// ==========================================
const GOOGLE_MAPS_API_KEY = "AIzaSyCfHCPO8Yb-rYqxMWToYq7GsV3VZ1iz0EE"; 

export default function Home() {
  const [selectedServices, setSelectedServices] = useState([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);

  // 🚀 THE NEW STATE: Dynamic Pricing Data
  const [db, setDb] = useState(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    address: '',
    datetime: '',
    name: '',
    company: '',
    email: '',
    phone: ''
  });

  // ==========================================
  // 1. FETCH PRICES FROM GOOGLE SHEETS
  // ==========================================
  useEffect(() => {
    const fetchPrices = async () => {
      // The exact URL of your deployed Google Apps Script API + the ?api=prices flag
      const API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec?api=prices";
      
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data.success) {
          // Re-attach the Lucide icons dynamically to the fetched data
          const iconMap = {
            'FOTO': Camera, 'VIDEO': Video, 'REEL': Clapperboard, 'TH': Mic,
            'PLANO': MapIcon, 'TOUR': Compass, 'DRONE': Plane, 'FPV': Crosshair
          };

          const mappedServices = data.services.map(s => ({
            id: s.id,
            // Reconstruct the labels based on ID
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
            icon: iconMap[s.id] || Camera // Fallback icon
          }));

          const mappedMultipliers = data.multipliers.map((m, index) => {
            // Reconstruct the labels based on the sheet value (e.g. '150' -> '101 a 150m²')
            let label = `Hasta ${m.sheetValue}m²`;
            if (index > 0) {
              const prevValue = data.multipliers[index - 1].sheetValue;
              label = `${parseInt(prevValue) + 1} a ${m.sheetValue}m²`;
            }
            // Add a special label for the final tier
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

          // Inject the fetched data into the React state
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
        alert("Ocurrió un error al cargar la lista de precios. Intenta refrescar la página.");
        setIsLoadingPrices(false); // Prevent infinite loading if API fails
      }
    };

    fetchPrices();
  }, []);

  // ==========================================
  // GOOGLE MAPS AUTOCOMPLETE INITIALIZATION
  // ==========================================
  useEffect(() => {
    // Only initialize Maps if the prices have finished loading (so the DOM exists)
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
          componentRestrictions: { country: 'ar' } // Restrict to Argentina
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
  }, [isLoadingPrices]); // Re-run this effect when loading finishes

  // --- CALCULATION ENGINE ---
  const { total, discountApplied, baseCount } = useMemo(() => {
    // 🛡️ SHIELD: Protect against calculating before DB loads
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
    
    if (name === 'address') {
      setIsAddressValid(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.datetime) {
      alert("⚠️ Por favor, ingresa tu nombre y fecha preferida para solicitar la reserva.");
      return;
    }

    if (!isAddressValid) {
      alert("📍 Por favor, selecciona una dirección válida de las sugerencias de Google Maps.");
      addressInputRef.current.focus();
      return;
    }

    setIsSubmitting(true);
    
    const API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec";

    const payload = {
      action: 'web_booking_request',
      payload: {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        datetime: formData.datetime,
        services: selectedServices,
        multiplierLabel: db.multipliers.find(m => m.value === multiplier)?.sheetValue || '100',
        total: total
      }
    };

    try {
      const response = await fetch(API_URL, {
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
      alert("Ocurrió un error al enviar la solicitud. Por favor intenta de nuevo.");
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

  const brandColor = "#EB4511";

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
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border-t-4" style={{ borderColor: brandColor }}>
          <div className="flex items-baseline gap-2 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: brandColor }}>
              Seleccioná los Servicios
            </h2>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">(Paso 1)</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {db.services.map((srv) => {
              const isSelected = selectedServices.includes(srv.id);
              const Icon = srv.icon;
              return (
                <button
                  key={srv.id}
                  onClick={() => toggleService(srv.id)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ease-in-out select-none
                    ${isSelected 
                      ? 'border-[#EB4511] bg-[#EB4511]/5 text-[#EB4511]' 
                      : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                >
                  <Icon size={28} className={`mb-3 ${isSelected ? 'text-[#EB4511]' : 'text-gray-400'}`} strokeWidth={1.5} />
                  <span className="font-semibold text-sm text-center leading-tight">{srv.label}</span>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2 text-[#EB4511]">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
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

        {/* Step 2: Property Details */}
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-lg">
          <div className="flex items-baseline gap-2 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: brandColor }}>
              Detalles de la Propiedad
            </h2>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">(Paso 2)</span>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Metros Cuadrados</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 focus:border-[#EB4511] transition-colors cursor-pointer font-medium"
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
                Dirección / Locación {!isAddressValid && formData.address && <span className="text-red-500 ml-2">(Seleccioná de la lista)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={18} className={isAddressValid ? "text-green-500" : "text-gray-400"} />
                </div>
                <input 
                  type="text" 
                  name="address"
                  ref={addressInputRef}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Ej: Av. del Libertador 1234, CABA"
                  className={`w-full bg-gray-50 border py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 transition-colors ${isAddressValid ? 'border-green-300 ring-green-100' : 'border-gray-200 focus:ring-[#EB4511]/20 focus:border-[#EB4511]'}`}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fecha y Hora Preferida</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar size={18} className="text-gray-400" />
                </div>
                <input 
                  type="datetime-local" 
                  name="datetime"
                  value={formData.datetime}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 focus:border-[#EB4511] transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: User Details */}
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-lg mb-8">
           <div className="flex items-baseline gap-2 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: brandColor }}>
              Tus Datos
            </h2>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">(Paso 3)</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nombre y Apellido"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 focus:border-[#EB4511] transition-colors"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Empresa o Inmobiliaria"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 focus:border-[#EB4511] transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Correo Electrónico"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 focus:border-[#EB4511] transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={18} className="text-gray-400" />
              </div>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Teléfono (WhatsApp)"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EB4511]/20 focus:border-[#EB4511] transition-colors"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="w-full md:w-auto bg-[#F8F9FA] rounded p-3 border-l-4" style={{ borderColor: brandColor }}>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5 block">
               PRESUPUESTO ESTIMADO
             </span>
             <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold" style={{ color: brandColor }}>
                 {formatCurrency(total)}
               </span>
               {discountApplied > 0 && (
                 <span className="text-xs font-semibold text-gray-400 line-through">
                   {formatCurrency(total + discountApplied)}
                 </span>
               )}
             </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={total === 0 || isSubmitting}
            className={`w-full md:w-auto px-10 py-4 rounded-full font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2
              ${total === 0 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'text-white hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            style={{ backgroundColor: total === 0 ? undefined : brandColor }}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              'Solicitar Reserva'
            )}
          </button>
        </div>
      </footer>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-[400px] w-full px-8 py-10 text-center relative animate-in zoom-in-95 duration-200 border-t-8" style={{ borderColor: brandColor }}>
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2 uppercase tracking-wide">¡Solicitud Enviada!</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Hemos registrado tu simulación. El presupuesto de <strong style={{ color: brandColor }}>{formatCurrency(total)}</strong> ha sido enviado al equipo.
            </p>
            
            <button 
              onClick={() => {
                setShowModal(false);
                setFormData({ address: '', datetime: '', name: '', company: '', email: '', phone: '' });
                setSelectedServices([]);
                setMultiplier(1.0);
                setIsAddressValid(false);
              }}
              className="w-full text-white font-bold py-3 px-10 rounded-full transition-transform hover:scale-105 active:scale-95 uppercase text-sm tracking-wide shadow-md"
              style={{ backgroundColor: brandColor }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}