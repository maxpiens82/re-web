import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import LoadingLogo from './LoadingLogo';
import { 
  Download, Calendar, CheckCircle2, CreditCard, ChevronRight, Copy, HelpCircle, X, Upload, Search, Check, Loader2, MessageSquare, LogOut, Phone,
  ArrowLeft, Folder, File, Video, Image as ImageIcon, Sparkles, Home, PlayCircle, Compass, ExternalLink, Play
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
  
  const isTour = asset.type === 'TOUR';
  const isVideo = asset.type === 'VIDEO';
  const isPhoto = asset.type === 'FOTO' || asset.name.toUpperCase().includes('PLANO');
  const thumbUrl = `https://drive.google.com/thumbnail?id=${asset.id}&sz=w600`;

  const handlePrimaryAction = () => {
    if (isPhoto) onPreview(asset);
    else {
      // 🚀 THE DOCS BYPASS: docs.google.com/file/d/ID/preview is the most anonymous player
      const cleanUrl = isTour 
        ? asset.tourUrl 
        : `https://docs.google.com/file/d/${asset.id}/preview?authuser=0`;
      window.open(cleanUrl, '_blank');
    }
  };

  return (
    <div 
      onClick={handlePrimaryAction}
      className="bg-white rounded-3xl overflow-hidden shadow-md border border-zinc-200 hover:shadow-xl transition-all group flex flex-col cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        {isTour && asset.tourUrl ? (
          /* 🚀 LIVE KUULA ENGINE: Direct interaction on the card */
          <iframe 
            src={asset.tourUrl} 
            className="w-full h-full border-none bg-zinc-900" 
            allow="autoplay; fullscreen; xr-spatial-tracking"
            title={asset.name}
          ></iframe>
        ) : !imgError ? (
          <img 
            src={thumbUrl} 
            alt={asset.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-200">
            <Video size={40} className="text-zinc-400" />
          </div>
        )}
        
        {/* RE! Branded Overlay for Videos ONLY */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 group-hover:bg-black/30 transition-colors">
            <div className="bg-[#EB4511] text-white p-5 rounded-full shadow-[0_0_40px_rgba(235,69,17,0.5)] transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center pl-6">
              <Play size={32} fill="white" stroke="none" />
            </div>
          </div>
        )}

        {/* Labels */}
        <div className="absolute top-3 left-3 flex gap-1">
          <span className="bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm">{asset.type}</span>
          {!isTour && <span className="bg-black/60 backdrop-blur-md text-white/80 text-[8px] font-bold px-2 py-0.5 rounded shadow-sm">{asset.size}</span>}
        </div>
      </div>
      
      <div className="p-3 bg-white">
        <div className="font-bold text-[11px] text-zinc-800 truncate mb-3" title={asset.name}>{asset.name}</div>
        <div className="flex gap-2">
          {/* Link Button (Grey Style) */}
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              copyToClipboard(isTour ? asset.tourUrl : asset.url, 'Link'); 
            }} 
            className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
          >
            <Copy size={12} /> Link
          </button>

          {/* Download Button (Orange Style - Hidden for Tours) */}
          {!isTour && (
            <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              // 🚀 THE NATIVE ZIP FORCE: This specific endpoint tells Drive to ignore the UI and start the zip-and-export job immediately.
              const directDownloadUrl = `https://drive.google.com/u/0/download?id=${folder.id}&export=download`;
              window.open(directDownloadUrl, '_blank'); 
            }} 
            className="flex-[1.5] bg-[#EB4511] hover:bg-[#c42e0d] text-white py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20"
          >
            <Download size={12} /> Descargar
          </button>
          )}
        </div>
      </div>
    </div>
  );
};

const FolderCard = ({ folder, onClick }) => (
  <div onClick={onClick} className="bg-white hover:bg-blue-50 rounded-2xl p-4 shadow-md border border-zinc-200 hover:border-blue-300 transition-all group flex items-center gap-4 cursor-pointer">
    <div className="bg-blue-100 p-2 rounded-xl text-blue-500 group-hover:text-blue-600 shrink-0">
      <Folder size={20} />
    </div>
    <span className="font-bold text-sm text-zinc-800 truncate">{folder.name}</span>
    <ChevronRight size={16} className="text-zinc-400 ml-auto shrink-0" />
  </div>
);

// 🚀 NEW: Image-based Folder Card for the FOTOS directory
const PhotoFolderCard = ({ folder, onClick, coverId, copyToClipboard }) => {
  const [imgError, setImgError] = useState(false);
  const thumbUrl = coverId ? `https://drive.google.com/thumbnail?id=${coverId}&sz=w600` : null;
  const folderUrl = `https://drive.google.com/drive/folders/${folder.id}`;
  const displayName = folder.name.replace('FOTOS_', '').trim();

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-zinc-200 hover:shadow-xl transition-all group flex flex-col cursor-pointer">
      <div onClick={onClick} className="group relative bg-zinc-900 aspect-[4/3] sm:aspect-[1.5] overflow-hidden flex flex-col justify-end">
        {thumbUrl && !imgError ? (
          <img 
            src={thumbUrl} alt={folder.name} onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500 group-hover:scale-105 transform" 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 bg-zinc-950">
            <ImageIcon size={48} className="text-zinc-500 mb-2" strokeWidth={1} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none"></div>
        <div className="relative z-10 w-full p-4 flex flex-col justify-end pointer-events-none">
          <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">
            <Folder size={12} className="text-[#EB4511]" /> Galería de Imágenes
          </div>
          <h4 className="text-white text-base font-black leading-tight drop-shadow-md truncate">{displayName}</h4>
        </div>
      </div>
      
      {/* Action Footer for Folders */}
      <div className="p-3 bg-white">
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); copyToClipboard(`${folderUrl}?authuser=0`, 'Link de Galería'); }} 
            className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
          >
            <Copy size={12} /> Link
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              // 🚀 TRIGGER DRIVE ZIP ENGINE: Appending export=download forces the "Zipping" UI
              window.open(`https://drive.google.com/drive/folders/${folder.id}?export=download`, '_blank'); 
            }} 
            className="flex-[1.5] bg-[#EB4511] hover:bg-[#c42e0d] text-white py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20"
          >
            <Download size={12} /> Descargar
          </button>
        </div>
      </div>
    </div>
  );
};

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
    const cachedData = sessionStorage.getItem('re_portal_cache');

    if (savedPhone && savedToken) {
      setPhoneInput(savedPhone);
      // 🚀 SPEED BOOSTER: If we have data from this session, use it immediately
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setClient(parsed);
        setChatHistory([{ sender: 'bot', text: `¡Hola ${parsed.name.split(' ')[0]}! 🎬 Escribe tu consulta abajo y te responderemos por WhatsApp a la brevedad.` }]);
        setLoginStep(3);
      } else {
        fetchClientData(savedPhone, savedToken);
      }
    } else {
      setLoginStep(1); 
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
        // 🚀 SAVE TO CACHE: Instant loads for the rest of the browser session
        sessionStorage.setItem('re_portal_cache', JSON.stringify(res.data));
        setChatHistory([{ sender: 'bot', text: `¡Hola ${res.data.name.split(' ')[0]}! 🎬 Escribe tu consulta abajo y te responderemos por WhatsApp a la brevedad.` }]);
        setLoginStep(3);
      } else {
        handleLogout();
        setError("Sesión expirada.");
      }
    } catch (err) {
      setError("Error de conexión.");
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
    sessionStorage.removeItem('re_portal_cache');
    
    window.location.href = '/';
  };

  // --- NATIVE BROWSER HISTORY SYNC (BACK BUTTON FIX) ---
  useEffect(() => {
    // Tag the initial root view so we know when to exit the explorer completely
    window.history.replaceState({ explorerLevel: 0 }, '', '');

    const handlePopState = (e) => {
      const state = e.state;
      if (state && state.explorerLevel > 0) {
        // 🚀 Restore exact state from history object
        openFolder(state.folderId, state.folderName, true, state.fullPath);
      } else {
        // Back to Netflix view (Level 0)
        setSelectedFolder(null);
        setBreadcrumbs([]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- DRIVE EXPLORER LOGIC ---
  const openFolder = async (folderId, folderName, isPopState = false, forcedPath = null) => {
    setIsExplorerLoading(true);
    
    // 🚀 Deterministic Breadcrumbs: If a path is forced (via Back button), use it.
    const newBreadcrumbs = forcedPath || [...breadcrumbs, { id: folderId, name: folderName }];
    setBreadcrumbs(newBreadcrumbs);

    if (!isPopState) {
      // Store the full path in the history state to prevent logic loops
      window.history.pushState({ 
        explorerLevel: newBreadcrumbs.length, 
        folderId, 
        folderName,
        fullPath: newBreadcrumbs 
      }, '', '');
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
    // 🚀 Deterministic Back: Simply go back one step in history
    window.history.back(); 
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
    
    // 🚀 CUSTOMER SUPPORT NUMBER: Hardcoded specifically for the private Client Portal
    const waUrl = `https://wa.me/5491157531502?text=${encodeURIComponent(text)}`;
    
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
        <LoadingLogo message={loginStep === 0 ? "Verificando sesión..." : "Sincronizando tus datos..."} />
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
    <div className="min-h-screen bg-zinc-100 pb-20 font-sans text-gray-800 relative select-none">
      
      {/* 🚀 GLOBAL NAV BAR */}
      <nav className="fixed top-0 left-0 w-full z-[100] text-white px-4 py-2 md:px-6 md:py-3 flex justify-between items-center font-bold tracking-wide shadow-sm border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/">
            <img src="/Logos_RE!_naranja.png" alt="RE! Logo" className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
          </Link>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={() => setShowSupportModal(true)} className="hover:text-[#E53B12] text-gray-100 transition-colors uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-1.5 drop-shadow-md">
            <HelpCircle size={14}/> Soporte
          </button>
          <button onClick={handleLogout} className="bg-black/40 border border-white/30 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-black/60 transition-all shadow-sm text-[10px] md:text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 backdrop-blur-md">
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
      <div className="relative h-32 md:h-72 w-full bg-zinc-950 overflow-hidden pt-[50px] md:pt-[64px]">
        {/* Brightened image opacity, pinned slightly higher to show architecture instead of sky */}
        <img src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1500&q=80" alt="RE Header" className="absolute inset-0 w-full h-full object-cover object-[center_30%] opacity-60" />
        
        {/* Subtle dark gradient for navbar readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/40 pointer-events-none"></div>
        
        <div className="absolute bottom-20 left-0 right-0 max-w-4xl mx-auto px-6 hidden sm:block">
          <div className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
            <Sparkles size={12} className="text-[#EB4511]" />
            <span>Bienvenido/a a tu panel corporativo</span>
          </div>
          <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight mt-1 drop-shadow-lg">¡Qué bueno verte, {client.name.split(' ')[0]}!</h2>
        </div>
      </div>

      {/* 🚀 MAIN CONTENT AREA (DYNAMIC OVERLAY) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative -mt-12 sm:-mt-20 z-20">
        
        {!selectedFolder ? (
          <>
            {/* ========================================== */}
            {/* VIEW A: HOME / NETFLIX DASHBOARD */}
            {/* ========================================== */}
            
            {/* CLIENT CARD */}
            <div className="bg-white rounded-3xl shadow-xl p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center md:items-start justify-between border border-zinc-200">
              <div className="flex flex-col items-center md:items-start text-center md:text-left pt-1 md:py-2">
                <h2 className="text-lg md:text-xl font-extrabold text-zinc-900 tracking-tight leading-tight">{client.name}</h2>
                <p className="text-zinc-500 font-medium text-xs md:text-sm mt-0.5">
                  {client.company}
                </p>
              </div>

              <div className={`w-full md:w-auto min-w-[240px] md:min-w-[280px] p-3 md:p-4 rounded-2xl border transition-all duration-500 ${client.balance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${client.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Estado de Cuenta</span>
                  {client.balance === 0 && <div className="bg-emerald-500 text-white rounded-full p-0.5"><Check size={10} strokeWidth={4} /></div>}
                </div>
                
                {client.balance > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xl md:text-2xl font-black text-rose-700 leading-none">
                      ${client.balance.toLocaleString('es-AR')}
                    </div>
                    <button onClick={() => setShowPaymentModal(true)} className="bg-[#EB4511] hover:bg-[#c42e0d] text-white px-3 py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1.5 shrink-0">
                      <CreditCard size={12}/> Pagar
                    </button>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <div className="text-base md:text-lg font-black text-emerald-800 tracking-tight flex items-center gap-1.5">¡Al día!</div>
                    <p className="text-[10px] md:text-xs text-emerald-600/90 font-medium mt-0.5 leading-tight">Gracias por tu puntualidad.</p>
                  </div>
                )}
              </div>
            </div>

            {/* UPCOMING SHOOTS */}
            {client.upcoming && client.upcoming.length > 0 && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-2 flex items-center gap-2">
                  <Calendar size={14} className="text-[#EB4511]" /> <span>Próximos Rodajes Confirmados</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.upcoming.map(job => (
                    <div key={job.id} className="bg-white rounded-2xl p-4 shadow-md border border-zinc-200 flex items-center gap-4 hover:shadow-lg transition-shadow">
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

            {/* HISTORY GRID (NETFLIX VIEW) */}
            <div className="mt-10 md:mt-12 animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-4 md:mb-5 pl-2 pr-1">
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
                  const PropertyCard = () => {
                    const [imgError, setImgError] = useState(false);
                    const thumbUrl = job.coverId ? `https://drive.google.com/thumbnail?id=${job.coverId}&sz=w800` : null;

                    return (
                      <div onClick={() => { if(job.id) openFolder(job.id, job.loc); else if(job.url) window.open(job.url, '_blank'); else showToast("Carpeta no disponible", "error"); }} className="group relative bg-zinc-900 rounded-[28px] md:rounded-[32px] overflow-hidden shadow-lg aspect-[4/3] sm:aspect-[1.5] cursor-pointer transform hover:-translate-y-1 transition-all duration-300 border border-zinc-800 flex flex-col justify-end">
                        
                        {thumbUrl && !imgError ? (
                          <img 
                            src={thumbUrl} alt={job.loc} onError={() => setImgError(true)}
                            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500 group-hover:scale-105 transform" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity duration-500 bg-zinc-950">
                            <ImageIcon size={64} className="text-zinc-500 mb-4" strokeWidth={1} />
                          </div>
                        )}

                        {/* 🚀 COMPRESSED GRADIENT: Only covers the bottom 40% of the card */}
                        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none"></div>
                        
                        {job.isNew && (
                          <div className="absolute top-4 left-4 bg-gradient-to-r from-[#EB4511] to-red-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                            <Sparkles size={10} /> <span>Nuevo</span>
                          </div>
                        )}

                        <div className="relative z-10 w-full p-5 md:p-6 flex flex-col justify-end pointer-events-none">
                          <div className="text-zinc-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <Calendar size={12} className="text-orange-500" /> {job.date}
                          </div>
                          <h4 className="text-white text-lg md:text-xl font-black leading-tight mb-2.5 drop-shadow-md truncate">{job.loc}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {job.srv.filter(s => s !== 'ENTREGA DRIVE').map(s => (
                              <span key={s} className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  };
                  return <PropertyCard key={job.id + idx} />;
                })}
              </div>
              {client.history.length === 0 && (
                 <div className="text-center py-10 bg-white rounded-3xl border border-zinc-200">
                   <p className="text-zinc-500 text-sm font-medium">Aún no tienes propiedades en tu historial.</p>
                 </div>
              )}
            </div>
          </>

        ) : (

          <>
            {/* ========================================== */}
            {/* VIEW B: DRIVE EXPLORER (PROPERTY OPENED) */}
            {/* ========================================== */}

            {/* PROPERTY HEADER CARD (Replaces Client Card) */}
            <div className="bg-white rounded-3xl shadow-xl p-4 md:p-6 flex flex-col gap-3 md:gap-4 border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start gap-3 md:gap-4">
                <h2 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight leading-tight flex flex-wrap items-center flex-1">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id}>
                      {index > 0 && <span className="text-zinc-300 mx-1.5 md:mx-2 font-normal text-lg">/</span>}
                      <span 
                        onClick={() => handleBreadcrumbClick(index)} 
                        className={`transition-colors ${index === breadcrumbs.length - 1 ? 'text-[#EB4511]' : 'text-zinc-900 cursor-pointer hover:text-[#EB4511] hover:underline'}`}
                      >
                        {crumb.name}
                      </span>
                    </React.Fragment>
                  ))}
                </h2>
                <button 
                  onClick={() => copyToClipboard(`https://drive.google.com/drive/folders/${selectedFolder.id}`, 'Link de carpeta')} 
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shrink-0 mt-0.5"
                >
                  <Copy size={14} /> <span className="hidden sm:inline">Copiar Link</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-zinc-100 gap-4">
                <button onClick={closeExplorer} className="text-zinc-500 hover:text-zinc-900 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-1.5 transition-colors shrink-0">
                  <ArrowLeft size={14} /> Volver
                </button>
                <p className="text-zinc-400 text-[10px] md:text-xs font-medium text-right leading-tight">
                  Selecciona un archivo para previsualizarlo o descargarlo.
                </p>
              </div>
            </div>

            {/* DRIVE CONTENTS GRID */}
            <div className="mt-8 animate-in fade-in duration-300">
              {isExplorerLoading ? (
                <div className="flex justify-center items-center h-64 w-full">
                  <Loader2 className="animate-spin w-8 h-8 text-zinc-400" />
                </div>
              ) : (
                <>
                  {selectedFolder.folders && selectedFolder.folders.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      {selectedFolder.folders.map(folder => {
                        // 🚀 If it's a photo folder, grab the coverId from the root property history and render the image card!
                        if (folder.name.includes('FOTOS')) {
                          const rootJob = breadcrumbs.length > 0 ? client.history.find(j => j.id === breadcrumbs[0].id) : null;
                          return <PhotoFolderCard key={folder.id} folder={folder} coverId={rootJob?.coverId} copyToClipboard={copyToClipboard} onClick={() => openFolder(folder.id, folder.name)} />;
                        }
                        return <FolderCard key={folder.id} folder={folder} onClick={() => openFolder(folder.id, folder.name)} />;
                      })}
                    </div>
                  )}
                  {selectedFolder.assets && selectedFolder.assets.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedFolder.assets.map(asset => (
                        <AssetCard key={asset.id} asset={asset} onPreview={setFullscreenAsset} copyToClipboard={copyToClipboard} />
                      ))}
                    </div>
                  )}
                  {(!selectedFolder.folders || selectedFolder.folders.length === 0) && (!selectedFolder.assets || selectedFolder.assets.length === 0) && (
                    <div className="text-center py-12 bg-white rounded-3xl border border-zinc-100 shadow-sm">
                      <p className="text-zinc-500 text-sm font-medium">Esta carpeta está vacía.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
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

      {/* 🚀 FULLSCREEN ASSET VIEWER (Photos Only) */}
      {fullscreenAsset && (fullscreenAsset.type === 'FOTO' || fullscreenAsset.name.toUpperCase().includes('PLANO')) && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-200">
          
          {/* Header: Compact & Clear */}
          <div className="safe-top w-full bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#EB4511] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                  {fullscreenAsset.type}
                </span>
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest truncate">
                  {fullscreenAsset.size}
                </span>
              </div>
              <h4 className="text-white text-sm font-bold truncate pr-4 opacity-90">{fullscreenAsset.name}</h4>
            </div>
            <button 
              onClick={() => setFullscreenAsset(null)} 
              className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full backdrop-blur-md transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Media Stage: Optimized for Vertical/Horizontal Ratios */}
          <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <div className="relative w-full h-full max-w-5xl mx-auto flex items-center justify-center">
              {fullscreenAsset.tourUrl ? (
                <iframe 
                  src={fullscreenAsset.tourUrl} 
                  className="w-full h-full rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl" 
                  allow="autoplay; fullscreen; picture-in-picture"
                ></iframe>
              ) : fullscreenAsset.isVideo ? (
                <div 
                  onClick={() => window.open(fullscreenAsset.url, '_blank')}
                  className="group relative w-full h-full max-w-[450px] md:max-w-full aspect-[9/16] md:aspect-auto rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl cursor-pointer"
                >
                  {/* High-Res Poster Image */}
                  <img 
                    src={`https://drive.google.com/thumbnail?id=${fullscreenAsset.id}&sz=w1200`}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-500"
                    alt="Video Preview"
                  />
                  
                  {/* Branded Player UI Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <div className="bg-[#EB4511] text-white p-6 rounded-full shadow-[0_0_50px_rgba(235,69,17,0.5)] transform group-hover:scale-110 transition-transform duration-300">
                      <PlayCircle size={48} fill="currentColor" />
                    </div>
                    
                    <div className="mt-6 text-center px-6">
                      <p className="text-white font-black text-lg uppercase tracking-tighter drop-shadow-lg">Reproducir Reel</p>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Se abrirá en el reproductor de alta calidad</p>
                    </div>
                  </div>

                  {/* Aesthetic Progress Bar Mockup (Premium Feel) */}
                  <div className="absolute bottom-0 left-0 w-full h-1.5 bg-zinc-800">
                    <div className="h-full bg-[#EB4511] w-1/3 shadow-[0_0_15px_rgba(235,69,17,0.8)]"></div>
                  </div>
                </div>
              ) : (
                <img 
                  src={fullscreenAsset.url} 
                  alt={fullscreenAsset.name} 
                  className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" 
                />
              )}
            </div>
          </div>

          {/* Action Footer: Modern & Mobile-Friendly */}
          <div className="safe-bottom w-full bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex w-full sm:w-auto gap-2">
              <button 
                onClick={() => copyToClipboard(fullscreenAsset.url, 'Enlace de archivo')} 
                className="flex-1 sm:flex-none bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Copy size={16} /> Link
              </button>
              <button 
                onClick={() => window.open(fullscreenAsset.downloadUrl, '_blank')} 
                className="flex-[2] sm:flex-none bg-[#EB4511] hover:bg-[#c42e0d] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <Download size={18} /> Descargar Original
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 FULL-SCREEN LOADING OVERLAY */}
      {isExplorerLoading && (
        <div className="fixed inset-0 z-[999] bg-zinc-950/70 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          <LoadingLogo message="Abriendo carpeta..." />
        </div>
      )}

    </div>
  );
}