import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Download, Calendar, CheckCircle2, CreditCard, ChevronRight, Copy, HelpCircle, X, Upload, Search, Check, Loader2, MessageSquare, LogOut, Phone,
  ArrowLeft, Folder, File, Video, Image as ImageIcon, Sparkles, Home, PlayCircle
} from 'lucide-react';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

const WhatsAppIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.8 69.4 27.2 106.2 27.2h.1c122.3 0 222-99.6 222-222 0-59.3-23-115.1-65.1-157.1zM223.9 445.2c-33.1 0-65.6-8.9-93.9-25.7l-6.7-4-69.8 18.3L72 365.4l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-82.7 184.6-184.5 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18s-8.8-2.8-12.4 2.8-14.1 18-17.3 21.6-6.4 4.1-12 1.4c-5.5-2.8-23.4-8.6-44.5-27.5-16.4-14.6-27.5-32.7-30.7-38.2-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.6 5.5-6.4 8.3-9.6 2.8-3.2 3.7-5.5 5.5-9.1 1.8-3.7.9-6.9-.5-9.6-1.4-2.8-12.4-29.8-17-41.1-4.5-10.9-9.1-9.4-12.4-9.6-3.2-.1-6.9-.2-10.5-.2-3.7 0-9.6 1.4-14.7 6.9-5.1 5.5-19.3 18.8-19.3 45.9s19.7 53.3 22.5 57c2.8 3.7 38.8 59.3 94.1 83.2 13.2 5.7 23.4 9.1 31.4 11.7 13.2 4.2 25.2 3.6 34.8 2.1 10.6-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

// --- Helper Components ---
const AssetCard = ({ asset, onPreview, copyToClipboard }) => {
  const [imgError, setImgError] = useState(false);
  const Icon = asset.isVideo ? Video : ImageIcon;
  const bgColor = asset.isVideo ? 'bg-indigo-500' : 'bg-sky-500';
  
  // High-performance public Drive thumbnail trick
  const thumbUrl = `https://drive.google.com/thumbnail?id=${asset.id}&sz=w600`;

  return (
    <div onClick={() => onPreview(asset)} className="bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition-all group flex flex-col justify-between cursor-pointer">
      <div className="relative aspect-[4/3] bg-zinc-200 overflow-hidden">
        {!imgError ? (
          <img 
            src={thumbUrl} 
            alt={asset.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${bgColor} group-hover:scale-105 transition-transform duration-500`}>
            <Icon size={40} className="text-white opacity-50" />
          </div>
        )}
        
        {asset.isVideo && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <PlayCircle size={44} className="text-white drop-shadow-md opacity-90" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <Search size={32} className="text-white" />
        </div>
        <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{asset.type}</span>
        <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-semibold px-2 py-0.5 rounded">{asset.size}</span>
      </div>
      <div className="p-3">
        <div className="font-bold text-xs text-zinc-800 truncate mb-2" title={asset.name}>{asset.name}</div>
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); window.open(asset.downloadUrl, '_blank'); }} className="flex-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
            <Download size={11} /> Bajar
          </button>
          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.url, 'Link de archivo'); }} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 p-1.5 rounded-lg transition-colors" title="Copiar Link">
            <Copy size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

const FolderCard = ({ folder, onClick }) => (
  <div onClick={onClick} className="bg-zinc-50 hover:bg-blue-50 rounded-2xl p-4 border border-zinc-100 hover:border-blue-200 transition-all group flex items-center gap-4 cursor-pointer">
    <div className="bg-blue-100 p-2 rounded-xl text-blue-500 group-hover:text-blue-600 shrink-0">
      <Folder size={20} />
    </div>
    <span className="font-bold text-sm text-zinc-800 truncate">{folder.name}</span>
    <ChevronRight size={16} className="text-zinc-400 ml-auto shrink-0" />
  </div>
);

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
];

export default function ClientPortal() {
  const [loginStep, setLoginStep] = useState(0); // 0 = Checking Session, 1 = Phone, 2 = PIN
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // Drive Explorer State
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [fullscreenAsset, setFullscreenAsset] = useState(null);

  const [toasts, setToasts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Auto-Login Check on Mount
  useEffect(() => {
    const savedPhone = localStorage.getItem('re_client_phone');
    const savedToken = localStorage.getItem('re_client_token');

    if (savedPhone && savedToken) {
      setPhoneInput(savedPhone);
      fetchClientData(savedPhone, savedToken);
    } else {
      setLoginStep(1); // Go to phone input
    }
  }, []);

  const fetchClientData = async (phone, token) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_client_portal_data', payload: { phone, token } })
      });
      const res = await response.json();
      if (res.success) {
        setClient(res.data);
        setChatHistory([{ sender: 'bot', text: `¡Hola ${res.data.name.split(' ')[0]}! 🎬 Escribe tu consulta abajo y te responderemos por WhatsApp a la brevedad.` }]);
        setLoginStep(3);
      } else {
        // Token expiro o fue revocado
        handleLogout();
        setError("Sesión expirada. Por favor, ingresa tu número nuevamente.");
      }
    } catch (err) {
      setError("Error de conexión. Revisa tu internet.");
      setLoginStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPin = async (e) => {
    e.preventDefault();
    if (phoneInput.length < 8) { setError("Ingresa un número válido"); return; }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'request_client_pin', payload: { phone: phoneInput } })
      });
      const res = await response.json();
      if (res.success) {
        setMaskedEmail(res.maskedEmail);
        setLoginStep(2);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (pinInput.length !== 4) { setError("El PIN debe tener 4 dígitos."); return; }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'verify_client_pin', payload: { phone: phoneInput, pin: pinInput } })
      });
      const res = await response.json();
      if (res.success) {
        // Guardar Sesión Persistente!
        localStorage.setItem('re_client_phone', phoneInput);
        localStorage.setItem('re_client_token', res.token);
        
        // Ahora traemos los datos
        await fetchClientData(phoneInput, res.token);
      } else {
        setError(res.error);
        setLoading(false);
      }
    } catch (err) {
      setError("Error de conexión al verificar el PIN.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('re_client_phone');
    localStorage.removeItem('re_client_token');
    setClient(null);
    setPinInput('');
    setLoginStep(1);
  };

  // --- NATIVE BROWSER HISTORY SYNC (BACK BUTTON FIX) ---
  useEffect(() => {
    // Tag the initial root view so we know when to exit the explorer completely
    window.history.replaceState({ explorerLevel: 0 }, '', '');

    const handlePopState = (e) => {
      const state = e.state;
      if (state && state.explorerLevel > 0) {
        // Navigating back to a specific folder level
        setBreadcrumbs(prev => prev.slice(0, state.explorerLevel - 1));
        openFolder(state.folderId, state.folderName, true); // true = don't push state again
      } else {
        // Back to Netflix view
        setSelectedFolder(null);
        setBreadcrumbs([]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- DRIVE EXPLORER LOGIC ---
  const openFolder = async (folderId, folderName, isPopState = false) => {
    setIsExplorerLoading(true);
    
    // FIX: Calculamos la ruta de forma síncrona para que no sea undefined
    const newBreadcrumbs = [...breadcrumbs, { id: folderId, name: folderName }];
    setBreadcrumbs(newBreadcrumbs);

    // Only push to browser history if we clicked forward in the UI
    if (!isPopState) {
      window.history.pushState({ explorerLevel: newBreadcrumbs.length, folderId, folderName }, '', '');
    }

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_drive_folder_contents', payload: { folderId } })
      });
      const res = await response.json();
      if (res.success) {
        setSelectedFolder({
          id: folderId,
          loc: folderName,
          date: new Date().toLocaleDateString('es-AR'),
          assets: res.assets,
          folders: res.folders
        });
      } else {
        showToast("Error al abrir la carpeta: " + res.error, 'error');
        if (!isPopState) window.history.back();
      }
    } catch (err) {
      showToast("Error de red al abrir la carpeta.", 'error');
      if (!isPopState) window.history.back();
    } finally {
      setIsExplorerLoading(false);
    }
  };

  const handleBreadcrumbClick = (index) => {
    if (index < breadcrumbs.length - 1) {
      const delta = (breadcrumbs.length - 1) - index;
      window.history.go(-delta); // Triggers popstate natively
    }
  };

  const closeExplorer = () => {
    window.history.go(-breadcrumbs.length); // Pops all folder states, returning to Level 0
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const copyToClipboard = async (text, label) => {
    if (!text) {
      showToast('Enlace no disponible', 'error');
      return;
    }
    try {
      // Intento moderno (Requiere HTTPS o localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast(`${label} copiado con éxito`, 'success');
      } else {
        // Fallback clásico a prueba de balas (Para testing en IP local HTTP)
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        showToast(`${label} copiado con éxito`, 'success');
      }
    } catch (err) {
      showToast('Error al copiar el texto', 'error');
    }
  };

  const handleSendPayment = () => {
    if (!uploadedFile) { showToast('Por favor, adjunta tu comprobante.', 'error'); return; }
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setPaymentSubmitted(true);
      showToast('¡Comprobante enviado! Nuestro equipo lo verificará.', 'success');
      setTimeout(() => setShowPaymentModal(false), 2000);
    }, 2000);
  };

  const handleSendSupportMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Build the WhatsApp message with client context
    const clientFirstName = client?.name ? client.name.split(' ')[0] : 'un cliente';
    const text = `¡Hola! Soy ${clientFirstName}. ${chatMessage.trim()}`;
    
    // Exact same number used in Home.jsx
    const waUrl = `https://wa.me/5491168876507?text=${encodeURIComponent(text)}`;
    
    // Open WhatsApp in a new tab
    window.open(waUrl, '_blank');
    
    // Add to local history so they see it was sent, then clear input
    setChatHistory(prev => [...prev, { sender: 'user', text: chatMessage }]);
    setChatMessage('');
    
    // Optionally close the modal after 1.5 seconds so they return to a clean portal
    setTimeout(() => {
      setShowSupportModal(false);
    }, 1500);
  };

  // ==========================================
  // PANTALLA DE LOGIN Y ESTADOS DE CARGA
  // ==========================================
  if (loginStep === 0 || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#EB4511] mb-4" />
        <p className="text-white font-bold tracking-widest uppercase text-sm animate-pulse">
          {loginStep === 0 ? 'Verificando sesión...' : 'Sincronizando tus datos...'}
        </p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <img src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1500&q=80" className="w-full h-full object-cover blur-sm" alt="bg"/>
        </div>
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative z-10 transition-all">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-[#EB4511] tracking-tight uppercase mb-2">RE!</h1>
            <h2 className="text-lg font-bold text-zinc-800">Portal de Clientes</h2>
            {loginStep === 1 ? (
              <p className="text-zinc-500 text-sm mt-1 font-medium">Ingresa tu número de WhatsApp para acceder a tu material y estado de cuenta.</p>
            ) : (
              <p className="text-zinc-500 text-sm mt-1 font-medium">Hemos enviado un código de 4 dígitos a tu correo: <br/><b className="text-zinc-800">{maskedEmail}</b></p>
            )}
          </div>

          {loginStep === 1 ? (
            <form onSubmit={handleRequestPin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="tel" 
                  value={phoneInput} 
                  onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))} 
                  placeholder="Ej: 1144445555" 
                  className="w-full bg-zinc-50 border border-zinc-200 py-3.5 pl-12 pr-4 rounded-xl text-base font-bold outline-none focus:border-[#EB4511] transition-colors tracking-widest"
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
              <button 
                type="submit" 
                disabled={loading || phoneInput.length < 8}
                className="w-full bg-[#EB4511] hover:bg-[#c42e0d] text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Solicitar Acceso'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPin} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="relative">
                <input 
                  type="text" 
                  inputMode="numeric"
                  maxLength="4"
                  value={pinInput} 
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))} 
                  placeholder="0000" 
                  className="w-full bg-zinc-50 border border-zinc-200 py-4 px-4 rounded-xl text-3xl text-center font-black outline-none focus:border-[#EB4511] transition-colors tracking-[0.5em]"
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
              <button 
                type="submit" 
                disabled={loading || pinInput.length !== 4}
                className="w-full bg-zinc-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verificar e Ingresar'}
              </button>
              <button 
                type="button"
                onClick={() => { setLoginStep(1); setError(null); setPinInput(''); }}
                className="w-full text-zinc-500 hover:text-zinc-800 text-xs font-bold uppercase tracking-widest mt-2"
              >
                ← Volver
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }


  // ==========================================
  // PANTALLA DEL PORTAL
  // ==========================================
 return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-gray-800 relative select-none pt-[52px] md:pt-[64px]">
      
      {/* 🚀 GLOBAL NAV BAR */}
      <nav className="fixed top-0 left-0 w-full z-[100] text-white px-4 py-2 md:px-6 md:py-3 flex justify-between items-center font-bold tracking-wide shadow-sm border-b border-white/5 bg-[#1a1a1a]/95 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/">
            <img src="/Logos_RE!_naranja.png" alt="RE! Logo" className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
          </Link>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={() => setShowSupportModal(true)} className="hover:text-[#E53B12] text-gray-300 transition-colors uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-1.5">
            <HelpCircle size={14}/> Soporte
          </button>
          <button onClick={handleLogout} className="bg-white/10 border border-white/20 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-white/20 transition-all shadow-sm text-[10px] md:text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
            <LogOut size={14}/> Salir
          </button>
        </div>
      </nav>

      {/* TOASTS */}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold animate-in slide-in-from-bottom-5 transition-all
              ${t.type === 'success' ? 'bg-zinc-900 border-l-4 border-emerald-500' : 
                t.type === 'error' ? 'bg-rose-950 border-l-4 border-rose-500' : 'bg-blue-950 border-l-4 border-blue-500'}
            `}
          >
            {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {t.type === 'error' && <X size={16} className="text-rose-400 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-white/60 hover:text-white"><X size={14} /></button>
          </div>
        ))}
      </div>

      {/* HERO BANNER */}
      <div className="relative h-64 md:h-80 w-full bg-zinc-950 overflow-hidden">
        {/* Cleaner opacity, no white gradient at the bottom */}
        <img src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1500&q=80" alt="RE Header" className="w-full h-full object-cover opacity-40 object-center" />
        
        {/* Subtle dark gradient from top only for navbar readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/10 to-transparent pointer-events-none"></div>
        
        <div className="absolute bottom-20 md:bottom-28 left-0 right-0 max-w-4xl mx-auto px-6 hidden sm:block">
          <div className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
            <Sparkles size={12} className="text-[#EB4511]" />
            <span>Bienvenido/a a tu panel corporativo</span>
          </div>
          <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight mt-1 drop-shadow-lg">¡Qué bueno verte, {client.name.split(' ')[0]}!</h2>
        </div>
      </div>

      {/* 🚀 PROFILE OVERLAY & FINANCIALS */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative -mt-16 sm:-mt-24 z-20">
        
        <div className="bg-white rounded-3xl shadow-xl p-5 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start justify-between border border-zinc-100">
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left py-2">
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{client.name}</h2>
            <p className="text-zinc-500 font-medium flex items-center gap-2 mt-1">
              <span>{client.company}</span>
              <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Cliente VIP</span>
            </p>
          </div>

          <div className={`w-full md:w-auto min-w-[280px] md:min-w-[320px] p-5 rounded-2xl border transition-all duration-500 ${client.balance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${client.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Estado de Cuenta</span>
              {client.balance === 0 && <div className="bg-emerald-500 text-white rounded-full p-1"><Check size={12} strokeWidth={3} /></div>}
            </div>
            
            {client.balance > 0 ? (
              <>
                <div className="text-2xl md:text-3xl font-black text-rose-700 leading-none mb-3">
                  ${client.balance.toLocaleString('es-AR')}
                </div>
                <button onClick={() => setShowPaymentModal(true)} className="w-full bg-[#EB4511] hover:bg-[#c42e0d] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2">
                  <CreditCard size={14}/> Registrar / Cómo Pagar
                </button>
              </>
            ) : (
              <div className="mt-1">
                <div className="text-xl md:text-2xl font-black text-emerald-800 tracking-tight flex items-center gap-1.5">¡Al día!</div>
                <p className="text-xs text-emerald-600/90 font-medium mt-1">Muchas gracias por tu compromiso y puntualidad.</p>
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING SHOOTS */}
        {client.upcoming && client.upcoming.length > 0 && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 pl-2 flex items-center gap-2">
              <Calendar size={14} className="text-[#EB4511]" /> <span>Próximos Rodajes Confirmados</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.upcoming.map(job => (
                <div key={job.id} className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="bg-orange-50 text-[#EB4511] p-3 rounded-2xl shrink-0"><Calendar size={20} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-zinc-900 text-sm truncate">{job.loc}</div>
                    <div className="text-[10px] md:text-xs text-zinc-500 font-semibold mt-1 flex items-center gap-1.5">
                      <span className="text-[#EB4511]">{job.date}</span>
                      <span className="text-zinc-300">•</span>
                      <span className="truncate">{job.producer}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONDITIONAL RENDER: NETFLIX VIEW vs DRIVE EXPLORER */}
        {selectedFolder ? (
          <div className="mt-12 bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-zinc-100">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider flex-wrap">
                <button onClick={closeExplorer} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
                  <ArrowLeft size={16} /> Entregas
                </button>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight size={14} className="text-zinc-300" />
                    <button 
                      onClick={() => handleBreadcrumbClick(index)} 
                      className={index === breadcrumbs.length - 1 ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => copyToClipboard(`https://drive.google.com/drive/folders/${selectedFolder.id}`, 'Link de carpeta')} 
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Copy size={14} /> Link Directo
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-orange-100 text-[#EB4511] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Directorio de Archivos</span>
                <span className="text-zinc-400 text-xs">{selectedFolder.date}</span>
              </div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{selectedFolder.loc}</h2>
              <p className="text-zinc-500 text-sm mt-1">Haga clic en cualquier elemento para previsualizarlo o descargarlo.</p>
            </div>

            {isExplorerLoading ? (
              <div className="flex justify-center items-center h-64 w-full">
                <Loader2 className="animate-spin w-8 h-8 text-zinc-300" />
              </div>
            ) : (
              <>
                {selectedFolder.folders && selectedFolder.folders.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 mb-8">
                    {selectedFolder.folders.map(folder => (
                      <FolderCard key={folder.id} folder={folder} onClick={() => openFolder(folder.id, folder.name)} />
                    ))}
                  </div>
                )}
                {selectedFolder.assets && selectedFolder.assets.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                    {selectedFolder.assets.map(asset => (
                      <AssetCard key={asset.id} asset={asset} onPreview={setFullscreenAsset} copyToClipboard={copyToClipboard} />
                    ))}
                  </div>
                )}
                {(!selectedFolder.folders || selectedFolder.folders.length === 0) && (!selectedFolder.assets || selectedFolder.assets.length === 0) && (
                  <div className="text-center py-12 text-zinc-400 font-medium">Esta carpeta está vacía.</div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mt-12 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-5 pl-2 pr-1">
              <h3 className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span>Propiedades y Entregas</span>
              </h3>
              {client.folderUrl && (
                 <button onClick={() => window.open(client.folderUrl, '_blank')} className="bg-[#2B6CB0] hover:bg-[#2C5282] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5">
                   <Search size={12}/> Buscar en Drive
                 </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
              {client.history.map((job, idx) => {
                // Micro-component for stateful image loading
                const PropertyCard = () => {
                  const [imgError, setImgError] = useState(false);
                  // Request a wide thumbnail (w800) for crisp retina display
                  const thumbUrl = job.coverId ? `https://drive.google.com/thumbnail?id=${job.coverId}&sz=w800` : null;

                  return (
                    <div onClick={() => { if(job.id) openFolder(job.id, job.loc); else if(job.url) window.open(job.url, '_blank'); else showToast("Carpeta no disponible", "error"); }} className="group relative bg-zinc-900 rounded-[28px] md:rounded-[32px] overflow-hidden shadow-lg aspect-[4/3] sm:aspect-[1.5] cursor-pointer transform hover:-translate-y-1 transition-all duration-300 border border-zinc-800 flex flex-col justify-end">
                      
                      {/* Image or Fallback */}
                      {thumbUrl && !imgError ? (
                        <img 
                          src={thumbUrl} 
                          alt={job.loc} 
                          onError={() => setImgError(true)}
                          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 group-hover:scale-105 transform" 
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity duration-500 bg-zinc-950">
                          <ImageIcon size={64} className="text-zinc-500 mb-4" strokeWidth={1} />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none"></div>
                      
                      {/* Badge */}
                      {job.isNew && (
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-[#EB4511] to-red-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                          <Sparkles size={10} /> <span>Nuevo</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="relative z-10 w-full p-5 md:p-6 flex flex-col justify-end pointer-events-none">
                        <div className="text-zinc-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <Calendar size={12} className="text-orange-500" /> {job.date}
                        </div>
                        <h4 className="text-white text-lg md:text-xl font-black leading-tight mb-2 drop-shadow-md truncate">{job.loc}</h4>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {job.srv.map(s => <span key={s} className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-wider">{s}</span>)}
                        </div>
                        <button className="w-full bg-[#EB4511] group-hover:bg-white text-white group-hover:text-black py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-extrabold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 pointer-events-auto">
                          <Folder size={14} className="transition-transform group-hover:translate-y-0.5" /> Abrir Carpeta
                        </button>
                      </div>
                    </div>
                  );
                };

                return <PropertyCard key={job.id + idx} />;
              })}
            </div>
            {client.history.length === 0 && (
               <div className="text-center py-10 bg-white rounded-3xl border border-zinc-100">
                 <p className="text-zinc-500 text-sm font-medium">Aún no tienes propiedades en tu historial.</p>
               </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-900 bg-zinc-100 p-2 rounded-full"><X size={16} /></button>
            <div className="p-6 md:p-8">
              <h3 className="text-xl font-black text-zinc-900 mb-2">Método de Pago</h3>
              <p className="text-xs text-zinc-500 font-medium mb-6">Transfiere el saldo exacto mediante transferencia bancaria y adjunta el comprobante.</p>
              
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 mb-6 space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Monto a Transferir</div>
                  <div className="text-3xl font-black text-[#EB4511]">${client.balance.toLocaleString('es-AR')}</div>
                </div>
                <div className="pt-4 border-t border-zinc-200">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Banco Santander</div>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-zinc-100 mt-1">
                    <div className="font-mono text-xs font-bold text-zinc-800">0720519488000006612168</div>
                    <button onClick={() => copyToClipboard('0720519488000006612168', 'CBU')} className="text-[#EB4511] hover:bg-orange-50 p-1.5 rounded-lg"><Copy size={13}/></button>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Alias de la Cuenta</div>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-zinc-100 mt-1">
                    <div className="font-extrabold text-xs text-zinc-800 uppercase">SOMOS.RE.OK</div>
                    <button onClick={() => copyToClipboard('SOMOS.RE.OK', 'Alias')} className="text-[#EB4511] hover:bg-orange-50 p-1.5 rounded-lg"><Copy size={13}/></button>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Comprobante de Transferencia</div>
                {!uploadedFile ? (
                  <label className="border-2 border-dashed border-zinc-200 hover:border-[#EB4511] bg-zinc-50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer text-center">
                    <Upload size={20} className="text-zinc-400 mb-1" />
                    <span className="text-xs font-bold text-zinc-800">Seleccionar Comprobante</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => { if(e.target.files[0]) setUploadedFile(e.target.files[0]); }} />
                  </label>
                ) : (
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /><span className="text-xs font-bold truncate">{uploadedFile.name}</span></div>
                    <button onClick={() => setUploadedFile(null)} className="p-1 hover:bg-zinc-200 rounded-full"><X size={14}/></button>
                  </div>
                )}
              </div>

              <button onClick={handleSendPayment} disabled={isUploading || paymentSubmitted} className="w-full py-3.5 rounded-xl font-black text-white bg-[#EB4511] hover:bg-[#c42e0d] uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isUploading ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : paymentSubmitted ? <><Check size={14}/> Enviado</> : 'Notificar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-md h-[500px] overflow-hidden shadow-2xl flex flex-col justify-between animate-in zoom-in-95 duration-200 relative border border-zinc-100">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center bg-black/20 p-1.5 rounded-lg border border-white/10">
                  <img src="/Logos_RE!_naranja.png" alt="RE! Logo" className="h-6 w-auto object-contain" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Soporte Técnico</h3>
                  <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Asesoría por WhatsApp
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="text-zinc-400 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50">
              {chatHistory.map((chat, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                    chat.sender === 'user' 
                      ? 'bg-[#25D366] text-white rounded-tr-none shadow-sm' 
                      : 'bg-white text-zinc-800 rounded-tl-none border border-zinc-100 shadow-sm'
                  }`}>
                    {chat.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Message input */}
            <form onSubmit={handleSendSupportMessage} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Enviar un mensaje a WhatsApp..." 
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#25D366] font-medium"
              />
              <button 
                type="submit"
                disabled={!chatMessage.trim()}
                className="bg-[#25D366] hover:bg-[#1DA851] disabled:bg-zinc-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors flex items-center justify-center shadow-md"
                title="Enviar por WhatsApp"
              >
                <WhatsAppIcon size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 FULLSCREEN ASSET VIEWER */}
      {fullscreenAsset && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center w-full max-w-6xl mx-auto py-2">
            <div className="text-white">
              <span className="bg-[#EB4511] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {fullscreenAsset.type}
              </span>
              <h4 className="text-sm sm:text-base font-bold truncate max-w-xs sm:max-w-md mt-1">{fullscreenAsset.name}</h4>
            </div>
            <button onClick={() => setFullscreenAsset(null)} className="text-white hover:text-zinc-300 bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-5xl mx-auto w-full max-h-[70vh]">
            {fullscreenAsset.isVideo ? (
              <video src={fullscreenAsset.url} controls autoPlay className="max-h-full max-w-full rounded-2xl border border-zinc-800" />
            ) : (
              <img src={fullscreenAsset.url} alt={fullscreenAsset.name} className="max-h-full max-w-full object-contain rounded-2xl" />
            )}
          </div>

          <div className="w-full max-w-xl mx-auto bg-zinc-900/80 backdrop-blur-md p-4 rounded-3xl border border-zinc-800 flex items-center justify-between gap-4 mt-4">
            <span className="text-zinc-400 text-xs font-semibold">{fullscreenAsset.size} (Resolución Original)</span>
            <div className="flex gap-2">
              <button onClick={() => copyToClipboard(fullscreenAsset.url, 'Enlace de archivo')} className="bg-zinc-800 hover:bg-zinc-700 text-white p-2.5 rounded-xl transition-colors" title="Copiar Link Directo">
                <Copy size={16} />
              </button>
              <button onClick={() => window.open(fullscreenAsset.downloadUrl, '_blank')} className="bg-[#EB4511] hover:bg-[#c42e0d] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                <Download size={14} /> Descargar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}