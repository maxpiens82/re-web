import QuickBook from '../components/QuickBook';
import MiniLogo from '../components/MiniLogo';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Camera, Video, Clapperboard, Mic, Map as MapIcon, Compass,
  Plane, Crosshair, MapPin, Calendar, User, Building, Mail,
  Phone, CheckCircle2, Check, Info, X, ChevronLeft, ChevronRight,
  Star, ArrowRight, PlayCircle, ArrowUpRight
} from 'lucide-react';

// Manual SVG Icons to avoid library version errors
const InstagramIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

const YoutubeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
);

const WhatsAppIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.8 69.4 27.2 106.2 27.2h.1c122.3 0 222-99.6 222-222 0-59.3-23-115.1-65.1-157.1zM223.9 445.2c-33.1 0-65.6-8.9-93.9-25.7l-6.7-4-69.8 18.3L72 365.4l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-82.7 184.6-184.5 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18s-8.8-2.8-12.4 2.8-14.1 18-17.3 21.6-6.4 4.1-12 1.4c-5.5-2.8-23.4-8.6-44.5-27.5-16.4-14.6-27.5-32.7-30.7-38.2-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.6 5.5-6.4 8.3-9.6 2.8-3.2 3.7-5.5 5.5-9.1 1.8-3.7.9-6.9-.5-9.6-1.4-2.8-12.4-29.8-17-41.1-4.5-10.9-9.1-9.4-12.4-9.6-3.2-.1-6.9-.2-10.5-.2-3.7 0-9.6 1.4-14.7 6.9-5.1 5.5-19.3 18.8-19.3 45.9s19.7 53.3 22.5 57c2.8 3.7 38.8 59.3 94.1 83.2 13.2 5.7 23.4 9.1 31.4 11.7 13.2 4.2 25.2 3.6 34.8 2.1 10.6-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

const GOOGLE_MAPS_API_KEY = "AIzaSyCfHCPO8Yb-rYqxMWToYq7GsV3VZ1iz0EE";

// 1. EXTRACT ICONS OUTSIDE SO MEMORY CAN USE THEM INSTANTLY
const ICON_MAP = {
  'FOTO': Camera, 'VIDEO': Video, 'REEL': Clapperboard, 'TH': Mic,
  'PLANO': MapIcon, 'TOUR': Compass, 'DRONE': Plane, 'FPV': Crosshair
};

// 🚀 THE FALLBACK DB: Guarantees instant 0-second load and prevents white screens
const FALLBACK_DB = {
  services: [
    { id: 'FOTO', price: 40000, isFixed: false, icon: ICON_MAP['FOTO'] },
    { id: 'VIDEO', price: 45000, isFixed: false, icon: ICON_MAP['VIDEO'] },
    { id: 'REEL', price: 40000, isFixed: false, icon: ICON_MAP['REEL'] },
    { id: 'TH', price: 15000, isFixed: false, icon: ICON_MAP['TH'] },
    { id: 'PLANO', price: 15000, isFixed: false, icon: ICON_MAP['PLANO'] },
    { id: 'TOUR', price: 25000, isFixed: false, icon: ICON_MAP['TOUR'] },
    { id: 'DRONE', price: 45000, isFixed: true, icon: ICON_MAP['DRONE'] },
    { id: 'FPV', price: 65000, isFixed: true, icon: ICON_MAP['FPV'] }
  ],
  multipliers: [
    { id: 'm100', label: 'Hasta 100m²', value: 1, sheetValue: 100 },
    { id: 'm200', label: '101 a 200m²', value: 1.25, sheetValue: 200 },
    { id: 'm300', label: '201 a 300m²', value: 1.5, sheetValue: 300 },
    { id: 'm400', label: 'Más de 300m²', value: 2, sheetValue: 400 }
  ],
  discountThreshold: 3,
  discountAmount: 5000
};

const generateDates = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).substring(0, 3).toUpperCase().replace('.', '');
    const dayNumber = d.getDate();
    const monthNumber = String(d.getMonth() + 1).padStart(2, '0');
    options.push({
      id: d.toISOString().split('T')[0],
      dateObj: d, dayName, dayNumber,
      fullFormat: `${dayName} ${dayNumber}/${monthNumber}`
    });
  }
  return options;
};

export default function Home() {
  const { currentUser } = useAuth();
  const [selectedServices, setSelectedServices] = useState([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [pricePulse, setPricePulse] = useState(false);

  // IntersectionObserver to detect when cards pass through the vertical center on mobile
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-35% 0px -35% 0px', // targets the vertical center 30% area of viewport
      threshold: 0.5 // triggers when at least half of the card is visible inside the active zone
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index'), 10);
          setActiveCard(index);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const cards = document.querySelectorAll('.portfolio-card');
    cards.forEach((card) => observer.observe(card));

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, []);

  // DETECTOR DE HARDWARE: Estrategia estricta para Android
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isAndroid = /android/i.test(navigator.userAgent);
      const ram = navigator.deviceMemory;

      if (isAndroid) {
        // En Android, asumimos por defecto que el blur le hará daño al rendimiento
        let lowEnd = true;
        // Solo encendemos el blur si el teléfono nos garantiza que tiene 8GB de RAM o más (Gama Alta)
        if (ram && ram >= 8) {
          lowEnd = false;
        }
        setIsLowEndDevice(lowEnd);
      }
    }
  }, []);

  // Estados para la galería de fotos (Zoom, Pan & Pinch)
  const [lightboxImg, setLightboxImg] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const [initialTouchDist, setInitialTouchDist] = useState(0);
  const imgRef = useRef(null);

  // Efecto "Snap Back": Limita el paneo para que la foto no quede fuera de la pantalla
  useEffect(() => {
    if (!isDragging && initialTouchDist === 0 && imgRef.current) {
      const imgW = imgRef.current.offsetWidth * scale;
      const imgH = imgRef.current.offsetHeight * scale;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      const maxX = Math.max(0, (imgW - winW) / 2);
      const maxY = Math.max(0, (imgH - winH) / 2);

      let newX = position.x;
      let newY = position.y;

      if (newX > maxX) newX = maxX;
      if (newX < -maxX) newX = -maxX;
      if (newY > maxY) newY = maxY;
      if (newY < -maxY) newY = -maxY;

      if (scale < 1) {
        setScale(1);
        newX = 0;
        newY = 0;
      }

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [isDragging, initialTouchDist, scale, position.x, position.y]);

  // Tecla ESC para cerrar la foto en pantalla completa
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxImg(null);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    if (lightboxImg) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImg]);

  // Mouse y 1 Dedo (Pan/Arrastrar)
  const handlePointerDown = (e) => {
    if (e.isPrimary) {
      setIsDragging(true);
      setDragDistance(0);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handlePointerMove = (e) => {
    if (isDragging && e.isPrimary) {
      setDragDistance(prev => prev + 1);
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      // Límites de colisión durante el arrastre
      if (imgRef.current) {
        const imgW = imgRef.current.offsetWidth * scale;
        const imgH = imgRef.current.offsetHeight * scale;
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const maxX = Math.max(0, (imgW - winW) / 2);
        const maxY = Math.max(0, (imgH - winH) / 2);

        newX = Math.min(Math.max(newX, -maxX), maxX);
        newY = Math.min(Math.max(newY, -maxY), maxY);
      }

      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = () => setIsDragging(false);

  // 2 Dedos (Pinch-to-Zoom en celulares)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setInitialTouchDist(dist);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = dist / initialTouchDist;
      // Permitimos que se aleje un poco más de 1 (hasta 0.5) para dar ese efecto "elástico" al pellizcar hacia adentro
      setScale(prev => Math.min(Math.max(0.5, prev * delta), 5));
      setInitialTouchDist(dist);
    }
  };

  const handleTouchEnd = () => setInitialTouchDist(0);

  // ==========================================
  // 2. SYNCHRONOUS MEMORY LOAD (ZERO FLICKER)
  // ==========================================
  const [db, setDb] = useState(() => {
    try {
      const cached = localStorage.getItem('re_prices_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.services = parsed.services.map(s => ({ ...s, icon: ICON_MAP[s.id] || Camera }));
        return parsed;
      }
    } catch (e) { console.error("Cache error, falling back.", e); }
    return FALLBACK_DB; // 🚀 NEVER RETURNS NULL. ZERO WHITE SCREENS.
  });

  const [isLoadingPrices, setIsLoadingPrices] = useState(false); // 🚀 ALWAYS FALSE. WE ALWAYS HAVE DATA.

  // 🚀 ENGINE: Date-Aware Pricing State
  const [pricingData, setPricingData] = useState(() => {
    try {
      const cached = localStorage.getItem('re_pricing_engine');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return null;
  });

  // Date & Time Picker State
  const [dateOptions] = useState(generateDates);
  const [selectedDateObj, setSelectedDateObj] = useState(dateOptions[0]);
  const [selectedTime, setSelectedTime] = useState(null);

  const dateScrollRef = useRef(null);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [formData, setFormData] = useState({
    address: '', instructions: '', name: '', company: '', email: '', phone: ''
  });

  const brandColor = "#E53B12"; // Exact brand manual hex

  const timeOptions = useMemo(() => [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
    '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ], []);

  // ==========================================
  // 3. SILENT BACKGROUND SYNC
  // ==========================================
  useEffect(() => {
    const fetchPrices = async () => {
      // 🚀 NOW HITTING THE V2 RAM CACHE IN GOOGLE APPS SCRIPT
      const GOOGLE_URL = `${import.meta.env.VITE_GAS_API_URL}?api=init_v2`;

      try {
        const response = await fetch(GOOGLE_URL);
        const data = await response.json();

        if (data.success) {
          const mappedServices = data.prices.services.map(s => ({
            id: s.id,
            price: s.price,
            isFixed: s.isFixed
          }));

          const mappedMultipliers = data.prices.multipliers.map(m => {
            let labelStr = String(m.sheetValue).includes('m') ? m.sheetValue : `${m.sheetValue}m²`;
            return { id: `m${m.sheetValue}`, label: `Hasta ${labelStr}`, value: m.value, sheetValue: m.sheetValue };
          });

          const freshDb = { 
            services: mappedServices, 
            multipliers: mappedMultipliers, 
            discountThreshold: data.prices.constants?.discountThreshold || 3, 
            discountPct: data.prices.constants?.discountPct || 0.035,
            discountAmount: 5000 // Legacy fallback
          };

          // Save pure JSON to memory for their next visit
          localStorage.setItem('re_prices_cache', JSON.stringify(freshDb));

          // Attach icons and update state silently
          freshDb.services = freshDb.services.map(s => ({ ...s, icon: ICON_MAP[s.id] || Camera }));
          setDb(freshDb);

          // 🚀 Inject the Pricing Engine
          if (data.pricingData) {
            setPricingData(data.pricingData);
            localStorage.setItem('re_pricing_engine', JSON.stringify(data.pricingData));
          }
        }
      } catch (error) {
        console.error("Background sync failed:", error);
      }
    };

    fetchPrices();
  }, []);

  // ==========================================
  // GOOGLE MAPS AUTOCOMPLETE INITIALIZATION
  // ==========================================
  useEffect(() => {
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
  }, []);

  // --- CALCULATION ENGINE ---
  const { total, discountApplied, baseCount } = useMemo(() => {
    if (!db) return { total: 0, discountApplied: 0, baseCount: 0 };

    // 1. Determine active Pricing Era based on selected Date
    let isNewEra = false;
    if (pricingData && pricingData.pricingConfig && pricingData.pricingConfig.threshold) {
      let targetMs = Date.now();
      if (pricingData.pricingConfig.rule === "FECHA" && selectedDateObj) {
        const p = selectedDateObj.id.split('-');
        targetMs = new Date(p[0], p[1] - 1, p[2], 12, 0, 0).getTime();
      }
      isNewEra = targetMs >= pricingData.pricingConfig.threshold;
    }

    const activePrices = isNewEra && pricingData ? (pricingData.newPrices || {}) : (pricingData ? pricingData.currentPrices || {} : {});

    let baseMult = 0;
    let baseFixed = 0;
    let serviceCount = 0;
    let hasStandardService = false;

    selectedServices.forEach(serviceId => {
      const service = db.services.find(s => s.id === serviceId);
      if (service) {
        // Fallback to legacy price array if engine isn't loaded yet
        const price = (pricingData && activePrices[serviceId] !== undefined) ? activePrices[serviceId] : service.price;

        if (service.isFixed) {
          baseFixed += price;
        } else {
          baseMult += price;
          serviceCount++;
          hasStandardService = true;
        }
      }
    });

    if (hasStandardService) {
      baseMult += 30000; // Tarifa base por unidad
    }

    let basePreExtras = (baseMult * multiplier) + baseFixed;
    let discount = 0;

    if (serviceCount > db.discountThreshold) {
      if (isNewEra) {
        discount = basePreExtras * ((serviceCount - db.discountThreshold) * (db.discountPct || 0.035));
      } else {
        // Old Era ALWAYS uses 3 and $5000 strictly for backward compatibility
        discount = (serviceCount - 3) * 5000 * multiplier;
      }
    }

    const calculatedTotal = basePreExtras - discount;

    return {
      total: calculatedTotal,
      discountApplied: discount,
      baseCount: serviceCount
    };
  }, [selectedServices, multiplier, db, pricingData, selectedDateObj]);

  // Trigger elegant pulse animation when total changes
  useEffect(() => {
    if (total > 0) {
      setPricePulse(true);
      const timer = setTimeout(() => setPricePulse(false), 300);
      return () => clearTimeout(timer);
    }
  }, [total]);

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
    // 1. Strict Validation: Contact Info
    if (!formData.name.trim()) { alert("⚠️ Por favor, ingresa tu Nombre y Apellido."); return; }
    if (!formData.company.trim()) { alert("⚠️ Por favor, ingresa tu Empresa o Inmobiliaria (o escribe 'Particular')."); return; }
    if (!formData.email.trim()) { alert("⚠️ Por favor, ingresa tu Correo Electrónico."); return; }
    if (!formData.phone.trim()) { alert("⚠️ Por favor, ingresa tu Teléfono (WhatsApp)."); return; }

    // 2. Strict Validation: Address
    if (!formData.address.trim()) { alert("⚠️ Por favor, ingresa la Dirección de la propiedad."); return; }
    if (!isAddressValid) {
      alert("📍 Por favor, selecciona la dirección desde las sugerencias de Google Maps para asegurar que sea válida.");
      if (addressInputRef.current) addressInputRef.current.focus();
      return;
    }

    // 3. Strict Validation: Date & Time
    if (!selectedDateObj) { alert("⚠️ Por favor, selecciona una Fecha."); return; }
    if (!selectedTime) { alert("⚠️ Por favor, selecciona una Hora."); return; }

    // 4. Strict Validation: Services (Must have at least one base service or EXTRAS)
    if (selectedServices.length === 0) {
      alert("⚠️ Por favor, selecciona al menos un Servicio.");
      return;
    }

    // If they selected EXTRAS, force them to explain what it is
    if (selectedServices.includes('EXTRAS') && (!formData.extrasDesc || formData.extrasDesc.trim() === '')) {
      alert("⚠️ Has seleccionado 'EXTRAS'. Por favor describe qué necesitas en el campo de texto.");
      return;
    }

    setIsSubmitting(true);

    const API_URL = import.meta.env.VITE_GAS_API_URL;

    // Reconstruct the strict ISO format that Google Apps Script requires: "YYYY-MM-DDTHH:mm"

    const validIsoDateTime = `${selectedDateObj.id}T${selectedTime}`;

    const payload = {
      action: 'web_booking_request',
      payload: {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        instructions: formData.instructions,
        datetime: validIsoDateTime,
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

  // Check the Vite Environment Variable
  const isPortalEnabled = import.meta.env.VITE_ENABLE_PORTAL === 'true';

  const whatsappMessage = encodeURIComponent("¡Hola Santiago! Vi tu web y me gustaría consultar por una sesión de fotos/video.");
  const whatsappUrl = `https://wa.me/5491168876507?text=${whatsappMessage}`;

 // 🚀 RENDER MAIN UI
  return (
    <div className="min-h-screen text-[#2d2d2d] font-sans bg-[#EAEAEA]">

       {/* 🚀 GLOBAL NAV BAR */}
      <nav className="fixed top-0 left-0 w-full z-[100] text-white px-4 py-2 md:px-6 md:py-3 flex justify-between items-center font-bold tracking-wide shadow-sm border-b border-white/5 bg-[#1a1a1a]/95 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/">
            <img src="/Logos_RE!_naranja.png" alt="RE! Logo" className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
          </Link>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="https://www.instagram.com/somos.re.ok/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#E53B12] transition-colors">
            <InstagramIcon size={18} />
          </a>
          <button onClick={() => document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' })} className="hidden md:block hover:text-[#E53B12] text-gray-300 transition-colors uppercase text-xs tracking-widest">Portfolio</button>
          <button onClick={() => document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth' })} className="hidden md:block hover:text-[#E53B12] text-gray-300 transition-colors uppercase text-xs tracking-widest">Servicios</button>
          
          <Link to="/clientes" className="hover:text-[#E53B12] text-white transition-colors uppercase text-xs tracking-widest font-bold hidden sm:block">
            Clientes
          </Link>

          {/* 🚀 MOBILE ONLY: CLIENTES BUTTON */}
          <Link to="/clientes" className="sm:hidden border border-[#E53B12] text-[#E53B12] px-4 py-1.5 rounded-full hover:bg-[#E53B12]/10 transition-all shadow-sm text-[10px] uppercase tracking-wider font-bold">
            Clientes
          </Link>

          {isPortalEnabled ? (
            <Link to="/portal" className="bg-white/10 border border-white/20 text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full hover:bg-white/20 transition-all shadow-sm text-[10px] md:text-xs uppercase tracking-wider font-bold">
              Staff
            </Link>
          ) : (
            <button onClick={() => document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth' })} className="bg-[#E53B12] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full hover:bg-[#c42e0d] transition-all shadow-md text-[10px] md:text-xs uppercase tracking-wider font-bold">
              Cotizar
            </button>
          )}
        </div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-24 pb-16 md:pt-48 md:pb-36 px-4 md:px-6 overflow-hidden bg-[#1a1a1a]">
        <div className="absolute inset-0 z-0 bg-[#1a1a1a]">

          <img
            src="https://re-portfolio-foto.b-cdn.net/Poster-banner_2984_1989_1492_995.jpg"
            alt="Background"
            className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-[1500ms] ease-in-out pointer-events-none ${isVideoPlaying ? 'opacity-0' : 'opacity-100'}`}
          />

          <video
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            preload="auto"
            onPlaying={() => setIsVideoPlaying(true)}
            className="absolute inset-0 w-full h-full object-cover transform-gpu pointer-events-none z-0"
          >
            {/* CELULARES: Carga el Video Vertical */}
            <source src="https://vz-8b1827c7-938.b-cdn.net/ad586fd4-4ebb-48b5-9831-5b36f0004203/play_720p.mp4" type="video/mp4" media="(max-width: 768px)" />
            {/* DESKTOP/TABLETS: Carga el Video Horizontal */}
            <source src="https://vz-8b1827c7-938.b-cdn.net/64c650ac-bb47-45a5-b2f6-0ae16a68639b/play_1080p.mp4" type="video/mp4" />
          </video>

          <div className="absolute inset-0 bg-black/10 z-20 pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none"></div>
        </div>

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-6 md:mt-0">

          <div className={`inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full border text-white/90 text-[9px] md:text-xs font-bold tracking-widest uppercase mb-6 md:mb-8 shadow-lg transition-colors
            ${isLowEndDevice ? 'bg-black/60 border-black/40' : 'bg-white/10 border-white/20 backdrop-blur-sm'}
          `}>
            <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#E53B12] ${!isLowEndDevice ? 'animate-pulse' : ''}`}></span>
            Disponibilidad Inmediata
          </div>

          {/* font-normal aplica la fuente LightExtended. font-black hace que "Propiedades" resalte */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight mb-4 md:mb-6 text-white leading-tight px-2" style={isLowEndDevice ? { textShadow: '0 2px 10px rgba(0,0,0,0.8)' } : { filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))' }}>
            Elevá el nivel visual de <br className="hidden md:block" /> tus <span className="text-[#E53B12] font-black" style={isLowEndDevice ? { textShadow: '0 2px 5px rgba(0,0,0,0.5)' } : { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>Propiedades</span>
          </h1>

          <p className="text-sm sm:text-base md:text-xl text-gray-100 max-w-2xl mb-8 md:mb-10 leading-relaxed font-medium px-4 md:px-0" style={isLowEndDevice ? { textShadow: '0 2px 8px rgba(0,0,0,0.9)' } : { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>
            Fotografía de interiores, video cinemático y tomas aéreas para el mercado inmobiliario más exigente. Cotizá y reservá online en menos de 1 minuto.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto px-4 sm:px-0">
            <button onClick={() => document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-[#E53B12] text-white text-sm md:text-base rounded-full font-bold uppercase tracking-wide hover:bg-[#c42e0d] transition-transform hover:-translate-y-1 shadow-[0_0_20px_rgba(235,69,17,0.3)] flex items-center justify-center gap-2">
              Cotizar Ahora <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
            <button onClick={() => document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' })} className={`w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 border-2 md:border-white/20 text-white text-sm md:text-base rounded-full font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2
              ${isLowEndDevice ? 'bg-black/60 border-white/10' : 'bg-white/10 md:bg-transparent border-white/30 hover:bg-white/20 backdrop-blur-sm'}
            `}>
              <PlayCircle size={16} className="md:w-[18px] md:h-[18px]" /> Ver Portfolio
            </button>
          </div>
        </div>
      </section>

      {/* 🚀 TRUSTED BY */}
      <section className="py-2.5 md:py-3 bg-[#EAEAEA] border-b border-gray-300">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center flex flex-col items-center justify-center">
          <p className="text-[10px] md:text-[20px] font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-2">Confían en nuestro equipo</p>
          
          <div className="flex flex-nowrap justify-center items-center gap-x-4 md:gap-20 transition-all duration-500">
            
            <img src="/remax web.png" alt="RE/MAX" 
                 className="h-[14px] md:h-[44px] w-auto object-contain mix-blend-multiply translate-y-[0.5px] md:translate-y-[2px]" />
                 
            <img src="/pasantes web.png" alt="Pasantes Propiedades" 
                 className="h-[24px] md:h-[120px] w-auto object-contain mix-blend-multiply md:translate-y-[8px]" />
                 
            <img src="/real aires web.png" alt="Real Aires Bienes Raices" 
                 className="h-[28px] md:h-[80px] w-auto object-contain mix-blend-multiply translate-y-[-1px] md:translate-y-[-10px]" />
                 
            <img src="/braulio web.png" alt="Braulio Inmuebles" 
                 className="h-[15px] md:h-[50px] w-auto object-contain mix-blend-multiply" />
                 
          </div>
        </div>
      </section>

      {/* 🚀 PORTFOLIO */}
      <section id="portfolio" className="pt-8 pb-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-3 md:gap-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-extrabold text-[#2d2d2d] mb-1.5 md:mb-2 tracking-tight flex items-center gap-1.5">
                <ArrowUpRight className="text-[#E53B12] w-6 h-6 md:w-9 md:h-9" strokeWidth={3} />
                Nuestro Trabajo
              </h2>
              <p className="text-gray-500 font-medium text-sm md:text-lg ml-0 md:ml-10">Imágenes que cierran ventas por sí solas.</p>
            </div>
            <button onClick={() => document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth' })} className="text-[#E53B12] font-bold uppercase tracking-widest text-xs md:text-sm hover:underline flex items-center gap-1 mt-1 md:mt-0">
              Agendar Sesión <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Video Cinemático',
                loc: 'Haras Santa Maria',
                iframe: 'https://player.mediadelivery.net/embed/677860/807ad57f-1b0b-481b-a3ad-eb7c072b9ac3?autoplay=false&loop=false&muted=false&preload=true&responsive=true'
              },
              {
                title: 'Fotografía HDR',
                loc: 'La Isla, Nordelta',
                img: 'https://re-portfolio-foto.b-cdn.net/Fotos_HDR_La_Isla_Nordelta_0009_2996_1995.jpg'
              },
              {
                title: 'Tour Virtual 360',
                loc: 'Carlos A. López 4700',
                // vr=0 desactiva el giroscopio automático en celulares
                iframe: 'https://kuula.co/share/collection/7MkBg?logo=1&info=0&fs=1&vr=0&initload=1&autoplay=1&thumbs=0&inst=es'
              },
              {
                title: 'Diseño de Interiores',
                loc: 'La Isla, Nordelta',
                img: 'https://re-portfolio-foto.b-cdn.net/Fotos_HDR_La_Isla_Nordelta_0021_2992_1992.jpg'
              },
              { 
                title: 'Planos Comerciales 2D', 
                loc: 'Av. La Plata 331', 
                img: 'https://re-portfolio-foto.b-cdn.net/PLANO_%20Av%20La%20Plata%20331.png',
                isPlan: true // Agregamos este tag para cambiar cómo se renderiza la imagen
              },
              {
                title: 'Tomas Aéreas & Sunset',
                loc: 'La Isla, Nordelta',
                img: 'https://re-portfolio-foto.b-cdn.net/Fotos_HDR_La_Isla_Nordelta_0059_2528_1684.jpg'
              }
            ].map((item, i) => (
              <div
                key={i}
                data-index={i}
                onClick={() => { if (!item.iframe) setLightboxImg(item.img); }}
                /* El fondo blanco (bg-white) hace que el PNG transparente del plano se vea perfecto */
                className={`group relative rounded-2xl overflow-hidden shadow-sm h-64 md:h-72 ${item.isPlan ? 'bg-white' : 'bg-black'} transition-all duration-500 ease-out
                  ${activeCard === i ? 'scale-[1.04] z-10 shadow-xl' : 'scale-100 z-0'}
                  md:scale-100 md:z-0 md:hover:scale-[1.05] md:hover:z-10 hover:shadow-2xl
                  ${!item.iframe ? 'cursor-pointer' : ''} portfolio-card`}
              >
                {item.iframe ? (
                  <div className="absolute inset-0 z-0 pointer-events-auto">
                    <iframe
                      src={item.iframe}
                      className="w-full h-full border-none relative z-10"
                      allow="autoplay; fullscreen; picture-in-picture"
                      loading="lazy"
                    ></iframe>
                  </div>
                ) : (
                  /* Usamos object-contain para planos y object-cover para fotos */
                  <img src={item.img} alt={item.title} className={`w-full h-full absolute inset-0 z-0 ${item.isPlan ? 'object-contain p-4' : 'object-cover'}`} />
                )}

                {/* En celular se oculta el degradado si la tarjeta pasa por el centro. En desktop se mantiene el efecto hover clásico */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/95 via-[#1a1a1a]/30 to-transparent flex flex-col justify-end p-6 pointer-events-none z-10 transition-opacity duration-300
                    ${activeCard === i ? 'opacity-0' : 'opacity-100'} 
                    md:opacity-100 md:group-hover:opacity-0`}
                >
                  <h3 className="text-white font-bold text-xl drop-shadow-md">{item.title}</h3>
                  <p className="text-white/80 text-sm font-medium drop-shadow-md flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {item.loc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 CALCULATOR SECTION */}
      <section id="calculadora" className="pt-8 pb-4 md:py-24 bg-[#EAEAEA] relative">

        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 mb-6 md:mb-12 text-center flex flex-col items-center">
          <h2 className="text-[21px] sm:text-2xl md:text-4xl font-extrabold text-[#2d2d2d] mb-2 md:mb-4 tracking-tight flex items-center justify-center gap-1 drop-shadow-sm">
            <ArrowUpRight className="text-[#E53B12] w-5 h-5 md:w-9 md:h-9" strokeWidth={3} />
            Cotizá al instante.
          </h2>
          <p className="text-gray-600 font-medium text-xs md:text-lg max-w-2xl mx-auto px-2 md:px-0 drop-shadow-sm">
            Seleccioná los servicios, elegí tu fecha ideal y solicitá tu reserva online. Sin intermediarios ni demoras.
          </p>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-3 md:px-4 space-y-4 md:space-y-6">

          {/* 1. SERVICIOS */}
          <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>
                Servicios
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 md:gap-3">
              {db.services.map((srv) => {
                const isSelected = selectedServices.includes(srv.id);
                const Icon = srv.icon;
                return (
                  <button
                    key={srv.id}
                    onClick={() => toggleService(srv.id)}
                    className={`relative w-full md:w-auto md:px-5 h-[40px] md:h-[44px] rounded-full font-bold text-[11px] md:text-sm tracking-wide transition-all duration-200 select-none flex items-center justify-center gap-2 shrink-0
                      ${isSelected
                        ? 'bg-[#E53B12] text-white shadow-[0_6px_16px_rgba(235,69,17,0.35)] -translate-y-0.5'
                        : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {Icon && <Icon size={16} strokeWidth={2.5} />}
                    {srv.id}
                  </button>
                );
              })}
            </div>

            {baseCount > 0 && (
              <div className={`mt-4 md:mt-6 p-3 md:p-4 rounded-xl flex items-start gap-2 md:gap-3 transition-colors ${baseCount >= 4 ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-500'}`}>
                <Info className={`mt-0.5 flex-shrink-0 w-4 h-4 md:w-5 md:h-5 ${baseCount >= 4 ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-xs md:text-sm font-medium">
                  <span className="block mb-0.5 md:mb-1 font-bold">* Descuento automático por volumen:</span>
                  Llevando 4 o más servicios base, se aplica una bonificación.
                  {baseCount >= 4 && <span className="block mt-1 text-green-700 font-bold">¡Descuento activado!</span>}
                </div>
              </div>
            )}
          </section>

          {/* 2. LOCACIÓN */}
          <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>
                Locación
              </h2>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">Metros Cuadrados</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-[#F4F4F5] border-none text-gray-800 py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53B12]/20 transition-colors cursor-pointer font-medium text-sm md:text-base"
                    value={multiplier}
                    onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                  >
                    {db.multipliers.map(m => (
                      <option key={m.id} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 md:px-4 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">
                  Dirección del Servicio {!isAddressValid && formData.address && <span className="text-red-500 ml-1 md:ml-2 normal-case">(Seleccioná de la lista)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="address"
                    ref={addressInputRef}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Buscar dirección..."
                    className={`w-full bg-[#F4F4F5] border py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl focus:outline-none transition-colors font-medium text-sm md:text-base
                      ${isAddressValid ? 'border-[#4bbf73] ring-1 ring-[#4bbf73]' : 'border-transparent focus:ring-2 focus:ring-[#E53B12]/20'}`}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">
                  Indicaciones (Piso, Depto, Torre)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    placeholder="Ej: 4to B, Tocar timbre recepción..."
                    className="w-full bg-[#F4F4F5] border border-transparent py-2.5 px-3 md:py-3.5 md:px-4 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53B12]/20 transition-colors font-medium text-sm md:text-base"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. FECHA Y HORA */}
          <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>
                Fecha y Hora
              </h2>
            </div>

            <div className="space-y-6 md:space-y-8">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-3">
                  Seleccionar Fecha
                </label>
                <div className="flex items-center gap-1.5 md:gap-4">
                  <button onClick={scrollLeft} type="button" className="w-7 h-7 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-[#E53B12] hover:bg-gray-50 transition-colors shadow-sm">
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                  </button>

                  <div ref={dateScrollRef} className="relative flex flex-1 gap-1.5 md:gap-3 overflow-x-auto scroll-smooth py-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {dateOptions.map(d => {
                      const isSelected = selectedDateObj?.id === d.id;
                      return (
                        <button key={d.id} data-date={d.id} onClick={() => setSelectedDateObj(d)} type="button" className={`flex flex-col items-center justify-center w-[54px] h-[54px] md:w-[72px] md:h-[72px] shrink-0 rounded-[14px] md:rounded-2xl border-2 transition-all select-none
                            ${isSelected ? 'border-[#E53B12] shadow-[0_4px_10px_rgba(235,69,17,0.2)] bg-white -translate-y-0.5' : 'border-transparent bg-[#F4F4F5] hover:bg-gray-200'}`}>
                          <span className={`text-[9px] md:text-[11px] font-bold tracking-wide uppercase ${isSelected ? 'text-[#E53B12]' : 'text-gray-500'}`}>{d.dayName}</span>
                          <span className={`text-lg md:text-2xl font-black mt-0.5 ${isSelected ? 'text-[#2d2d2d]' : 'text-gray-500'}`}>{d.dayNumber}</span>
                        </button>
                      )
                    })}
                  </div>

                  <button onClick={scrollRight} type="button" className="w-7 h-7 md:w-10 md:h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-[#E53B12] hover:bg-gray-50 transition-colors shadow-sm">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                  </button>
                </div>

                <div className="mt-3 md:mt-5 text-center min-h-[20px]">
                  {selectedDateObj && (
                    <span className="text-[11px] md:text-[13px] font-bold uppercase tracking-wide" style={{ color: brandColor }}>
                      {selectedDateObj.fullFormat}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-3">
                  Seleccionar Hora
                </label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5 md:gap-3">
                  {timeOptions.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button key={time} onClick={() => setSelectedTime(time)} className={`py-1.5 md:py-2 rounded-full font-bold text-[10px] md:text-sm transition-all select-none
                          ${isSelected ? 'bg-[#E53B12] text-white shadow-[0_4px_10px_rgba(235,69,17,0.35)] -translate-y-0.5' : 'bg-[#F4F4F5] text-gray-600 hover:bg-gray-200'}`}>
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 4. TUS DATOS */}
          <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold uppercase" style={{ color: brandColor }}>
                Tus Datos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </div>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre y Apellido" className="w-full bg-[#F4F4F5] border-none text-gray-800 py-2.5 pl-9 pr-3 md:py-3.5 md:pl-11 md:pr-4 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53B12]/20 transition-colors font-medium text-sm md:text-base" />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-3.5 flex items-center pointer-events-none">
                  <Building className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </div>
                <input type="text" name="company" value={formData.company} onChange={handleInputChange} placeholder="Empresa o Inmobiliaria" className="w-full bg-[#F4F4F5] border-none text-gray-800 py-2.5 pl-9 pr-3 md:py-3.5 md:pl-11 md:pr-4 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53B12]/20 transition-colors font-medium text-sm md:text-base" />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </div>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Correo Electrónico" className="w-full bg-[#F4F4F5] border-none text-gray-800 py-2.5 pl-9 pr-3 md:py-3.5 md:pl-11 md:pr-4 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53B12]/20 transition-all font-medium text-sm md:text-base" />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-3.5 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Teléfono (WhatsApp)" className="w-full bg-[#F4F4F5] border-none text-gray-800 py-2.5 pl-9 pr-3 md:py-3.5 md:pl-11 md:pr-4 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53B12]/20 transition-all font-medium text-sm md:text-base" />
              </div>
            </div>
          </section>

          {/* 5. BOTÓN DE CONFIRMACIÓN ESTÁTICO (Siempre visible al final del formulario) */}
          <div className="pt-2 pb-0 md:pt-6 md:pb-4 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full md:w-auto min-w-[300px] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-3
                ${isSubmitting
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-[#E53B12] text-white shadow-[0_4px_20px_rgba(235,69,17,0.35)] hover:bg-[#c42e0d] hover:shadow-[0_6px_25px_rgba(235,69,17,0.4)] hover:-translate-y-1'
                }`}
            >
              {isSubmitting ? (
                <><MiniLogo /> Procesando...</>
              ) : (
                <>Solicitar Reserva <ArrowRight size={20} /></>
              )}
            </button>
          </div>

        </div>
      </section>

      {/* 🚀 REVIEWS / SOCIAL PROOF */}
      <section className="py-10 md:py-24 bg-white text-[#2d2d2d] border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-6 md:mb-16 flex flex-col items-center">
            <h2 className="text-[21px] md:text-4xl font-extrabold tracking-tight text-center leading-tight mb-1">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-gray-400 uppercase tracking-widest text-[9px] md:text-xs font-bold mt-1">Reseñas Verificadas</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { name: 'Susana González', agency: 'Real Aires', text: 'Noté un antes y un después en la manera en que se perciben las propiedades que comercializo. El profesionalismo, la mirada estética y el compromiso del equipo hacen la diferencia en cada sesión.' },
              { name: 'Laura Casarubia', agency: 'RE/MAX Premium', text: 'Los elijo por confianza en su trabajo y por el respeto al visitar a los clientes en sus hogares. La fotografía es nuestra carta de presentación y con ellos sé que esa primera impresión siempre será excelente.' },
              { name: 'Agustín Vidal', agency: 'RE/MAX', text: 'Son sumamente profesionales y cumplen rigurosamente con los tiempos de entrega pactados. Su rápida respuesta nos permite, a su vez, brindar una atención mucho más ágil a nuestros propios clientes.' }
            ].map((rev, i) => (
              <div key={i} className="bg-[#EAEAEA] p-6 md:p-8 rounded-3xl border border-gray-200 relative hover:shadow-md transition-all flex flex-col">
                {/* Comillas gruesas sans-serif en lugar del font-serif roto */}
                <div className="text-[#E53B12] text-5xl font-black mb-1 leading-none">"</div>
                <p className="text-gray-600 mb-6 md:mb-8 italic leading-relaxed text-[15px] md:text-lg flex-1">{rev.text}</p>
                <div>
                  <div className="font-bold text-[#2d2d2d] tracking-wide text-sm md:text-base">{rev.name}</div>
                  <div className="text-gray-500 text-xs md:text-sm font-medium">{rev.agency}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 SITE FOOTER */}
      <footer className="relative bg-[#0f0f0f] text-gray-400 pt-10 pb-24 md:pt-16 md:pb-28 border-t border-white/10 overflow-hidden">

        {/* 🚀 BACKGROUND BRAND PATTERN */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-[0.03] md:opacity-5">
          <img
            src="/logo-outline.png"
            alt=""
            className="w-[200%] md:w-[120%] h-auto object-contain -rotate-6"
            onError={(e) => {
              e.target.src = "/Logos_RE!_naranja.png";
              e.target.classList.add('grayscale');
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6">

          {/* 🚀 TU PARTNER CREATIVO */}
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
            <h2 className="text-xl md:text-4xl font-black text-white mb-2 md:mb-4 tracking-tight uppercase">Tu Partner Creativo</h2>
            <p className="text-xs md:text-base leading-relaxed font-medium text-gray-300">
              RE! se posiciona como un socio creativo especializado para la industria inmobiliaria, cerrando la brecha entre la documentación arquitectónica de alta gama y las tendencias dinámicas de las redes sociales.
            </p>
          </div>

          {/* LINKS & INFO */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-6 md:gap-4 border-t border-white/10 pt-6 md:pt-10">
            
            <div className="md:col-span-5">
              <h3 className="text-xl md:text-2xl font-extrabold text-white mb-1.5 md:mb-3 tracking-widest">RE!</h3>
              <p className="max-w-xs text-xs md:text-sm font-medium leading-relaxed text-gray-400">
                Elevando el estándar visual del mercado inmobiliario. Fotografía, video y soluciones inmersivas.
              </p>
            </div>
            
            <div className="md:col-span-3">
              <h4 className="text-white font-bold mb-2 md:mb-4 uppercase tracking-wider text-xs">Servicios</h4>
              <ul className="space-y-1.5 text-xs md:text-sm font-medium">
                <li>Fotografía Interior</li>
                <li>Video Cinemático</li>
                <li>Tomas Aéreas (Drone)</li>
                <li>Tours Virtuales 3D</li>
              </ul>
            </div>
            
            <div className="md:col-span-3">
              <h4 className="text-white font-bold mb-2 md:mb-4 uppercase tracking-wider text-xs">Contacto</h4>
              <ul className="space-y-1.5 text-xs md:text-sm font-medium">
                <li><a href="mailto:hola@somosreok.com" className="hover:text-[#E53B12] transition-colors">hola@somosreok.com</a></li>
                <li>Buenos Aires, Argentina</li>
                <li><a href="https://wa.me/5491138903333" target="_blank" rel="noopener noreferrer" className="hover:text-[#E53B12] transition-colors">WhatsApp Directo</a></li>
              </ul>
            </div>
            
            <div className="md:col-span-1 hidden md:flex flex-col items-end">
               <div className="bg-white p-2 rounded-xl shadow-lg border border-white/10 hover:scale-105 transition-transform">
                 <img src="/qr-re.jpg" alt="QR RE! Contacto" className="w-20 h-20 object-cover rounded-lg" />
               </div>
               <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2 text-center w-24">
                 Escanéame
               </p>
            </div>

          </div>

          <div className="mt-6 pt-4 md:mt-10 md:pt-6 border-t border-white/10 text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-medium text-gray-500">© 2026 RE! Producciones. Todos los derechos reservados.</p>
            <div className="flex justify-center gap-6 items-center">
              <a href="https://www.instagram.com/somos.re.ok/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#E53B12] transition-colors font-bold tracking-widest text-[10px] uppercase text-white/60">
                <InstagramIcon size={14} /> Instagram
              </a>
              <a href="https://www.youtube.com/@somosreok" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#E53B12] transition-colors font-bold tracking-widest text-[10px] uppercase text-white/60">
                <YoutubeIcon size={14} /> YouTube
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 🚀 STICKY CALCULATOR BAR (Appears only when total > 0) */}
      <div
        className={`fixed bottom-0 left-0 w-full border-t border-gray-100 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] z-50 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isLowEndDevice ? 'bg-white' : 'bg-white/95 backdrop-blur-md'}
          ${total > 0 ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 md:py-5 flex items-center justify-between gap-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">
              Total Estimado
            </span>
            <div className="flex items-baseline gap-2">
              <span 
                className={`text-2xl md:text-3xl font-extrabold tracking-tight transition-all duration-300 ease-out inline-block origin-left
                  ${pricePulse ? 'scale-110 brightness-125 drop-shadow-[0_0_12px_rgba(229,59,18,0.6)]' : 'scale-100'}
                `} 
                style={{ color: brandColor }}
              >
                {formatCurrency(total)}
              </span>
              {discountApplied > 0 && (
                <span className="text-sm font-bold text-gray-400 line-through hidden sm:inline-block">
                  {formatCurrency(total + discountApplied)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-6 py-3.5 md:px-10 md:py-4 rounded-full font-bold uppercase tracking-widest text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2
              ${isSubmitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-[#E53B12] text-white shadow-[0_4px_20px_rgba(235,69,17,0.35)] hover:bg-[#c42e0d] hover:shadow-[0_6px_25px_rgba(235,69,17,0.4)] hover:-translate-y-1'
              }`}
          >
            {isSubmitting ? (
              <><MiniLogo /> Procesando...</>
            ) : (
              <>Reservar <ArrowRight size={18} className="hidden sm:inline-block" /></>
            )}
          </button>
        </div>
      </div>

      {/* 🚀 MODAL DE ÉXITO */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-w-[380px] w-full px-8 py-12 text-center relative animate-in zoom-in-95 duration-300">

            <div className="mb-6 mt-2 relative">
              <div className="absolute inset-0 bg-green-100 rounded-full scale-150 animate-pulse opacity-50"></div>
              <Check size={80} className="text-[#4bbf73] mx-auto relative z-10" strokeWidth={3} />
            </div>

            <h3 className="text-2xl font-extrabold text-[#1a1a1a] mb-4 tracking-tight">¡Solicitud Enviada!</h3>
            <p className="text-gray-500 text-[15px] leading-relaxed mb-10 font-medium">
              Hemos recibido tu solicitud de reserva con éxito.<br />Nuestro equipo te contactará a la brevedad para confirmar la disponibilidad.
            </p>

            <button
              onClick={() => {
                setShowModal(false);
                setFormData({ address: '', instructions: '', name: '', company: '', email: '', phone: '' });
                setSelectedServices([]);
                setMultiplier(1.0);
                setIsAddressValid(false);
                setSelectedDateObj(dateOptions[0]);
                setSelectedTime(null);
                if (dateScrollRef.current) dateScrollRef.current.scrollTo({ left: 0 });
              }}
              className="w-full text-white font-bold py-4 px-6 rounded-full transition-all hover:-translate-y-1 hover:shadow-lg uppercase text-sm tracking-widest"
              style={{ backgroundColor: '#4bbf73' }}
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* 🚀 LIGHTBOX MODAL PARA FOTOS */}
      {lightboxImg && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden animate-in fade-in duration-300 touch-none
            ${isLowEndDevice ? 'bg-[#1a1a1a]/98' : 'bg-[#1a1a1a]/90 backdrop-blur-2xl'}
          `}
          onClick={(e) => {
            if (e.target.tagName !== 'IMG') {
              setLightboxImg(null); setScale(1); setPosition({ x: 0, y: 0 });
            }
          }}
        >
          <button
            className="fixed top-4 right-4 md:top-8 md:right-8 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md z-[210] transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxImg(null); setScale(1); setPosition({ x: 0, y: 0 }); }}
          >
            <X size={24} />
          </button>

          <img
            ref={imgRef}
            src={lightboxImg}
            alt="Pantalla Completa"
            draggable="false"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => {
              e.stopPropagation();
              if (scale === 1) {
                setScale(2.5);
              } else if (dragDistance < 5) {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }
            }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            className={`w-full h-auto select-none transform-gpu origin-center ${(!isDragging && initialTouchDist === 0) ? 'transition-transform duration-300 ease-out' : ''}`}
          />
        </div>
      )}

      {/* 🚀 QUICK BOOK AI VOICE BUTTON */}
      <QuickBook />

      {/* 🚀 FLOATING WHATSAPP BUTTON (Only visible to regular clients) */}
      {!currentUser && (
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`fixed right-6 z-[60] flex items-center justify-center w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(37,211,102,0.4)] transition-all duration-500 hover:scale-110 active:scale-95 bg-[#25D366] text-white p-4
            ${total > 0 ? 'bottom-28 md:bottom-28' : 'bottom-8'}
          `}
        >
          {/* White Pulse Animation */}
          <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-20 pointer-events-none"></span>
          
          <WhatsAppIcon size={32} />
          
          {/* Online Status Dot */}
          <span className="absolute top-3 right-3 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-sm"></span>
          </span>
        </a>
      )}

    </div>
  );
}