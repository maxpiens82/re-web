import React, { useState, useRef } from 'react';
import { 
  UploadCloud, Sparkles, Image as ImageIcon, ArrowRight, 
  CheckCircle2, Download, Trash2, X, Key, AlertTriangle 
} from 'lucide-react';

export default function Stager() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('minimalist');
  const [accessCode, setAccessCode] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  const fileInputRef = useRef(null);

  const styles = [
    { id: 'minimalist', label: 'Minimalista', desc: 'Limpio, líneas simples, tonos neutros.' },
    { id: 'modern', label: 'Moderno', desc: 'Contemporáneo, cálido, texturas ricas.' },
    { id: 'industrial', label: 'Industrial', desc: 'Madera oscura, metal, estilo loft.' },
    { id: 'classic', label: 'Clásico', desc: 'Elegante, tradicional, sofisticado.' }
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultImage(null);
      setErrorMsg(null);
    }
  };

  const clearWorkspace = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResultImage(null);
    setErrorMsg(null);
    setRemainingCredits(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 🛡️ THE BULLET DODGER: Client-Side Compression to beat Vercel's 4.5MB limit
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          // Maintain aspect ratio while scaling down
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to 80% quality JPEG (~200KB - 500KB payload)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleGenerate = async () => {
    if (!selectedImage || !accessCode.trim()) {
      setErrorMsg("Por favor, sube una imagen e ingresa tu código de acceso.");
      return;
    }
    
    setIsGenerating(true);
    setErrorMsg(null);
    
    try {
      // 1. Compress before network transit
      const base64Image = await compressImage(selectedImage);

      // 2. Hit our Decoupled Vercel Middleware
      const response = await fetch('/api/stager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          styleId: selectedStyle,
          accessCode: accessCode.trim().toUpperCase()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error en el servidor.');
      }

      // 3. Success! Set image and update ledger view
      setResultImage(data.image);
      setRemainingCredits(data.creditsRemaining);

    } catch (error) {
      console.error("Generation failed:", error);
      setErrorMsg(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to trigger download
  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `RE-Staged-${selectedStyle}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#2d2d2d] font-sans pb-20 pt-10 px-4">
      <div className="max-w-5xl mx-auto">
        
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EB4511]/10 text-[#EB4511] font-bold text-sm tracking-wide mb-4 uppercase">
            <Sparkles size={16} />
            <span>Inteligencia Artificial</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            RE! Virtual Staging
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Subí la foto de un ambiente vacío, elegí un estilo, y nuestra IA lo amoblará con fotorrealismo en segundos.
          </p>
        </header>

        {showDisclaimer && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl mb-8 flex items-start gap-3 shadow-sm relative pr-12 animate-in slide-in-from-top-4 fade-in duration-300">
            <Sparkles className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-amber-800 font-bold text-sm uppercase tracking-wide mb-1">Aviso Importante</h3>
              <p className="text-amber-700 text-sm leading-relaxed">
                Esta es una herramienta conceptual impulsada por Inteligencia Artificial. Los amoblamientos generados son representaciones artísticas para visualizar el potencial del espacio y pueden no reflejar medidas arquitectónicas exactas.
              </p>
            </div>
            <button onClick={() => setShowDisclaimer(false)} className="absolute top-4 right-4 text-amber-500 hover:text-amber-700 transition-colors p-1">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: UPLOAD & CONTROLS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 1: Upload */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-500">1</span>
                Sube tu foto
              </h2>
              
              {!previewUrl ? (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#EB4511] hover:bg-[#EB4511]/5 transition-colors group">
                  <UploadCloud size={40} className="mx-auto text-gray-400 group-hover:text-[#EB4511] mb-3 transition-colors" />
                  <p className="font-semibold text-gray-700 mb-1">Haz clic para subir una foto</p>
                  <p className="text-xs text-gray-500">JPG o PNG. Idealmente un ambiente vacío.</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={previewUrl} alt="Original" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={clearWorkspace} className="bg-white text-red-500 p-2 rounded-full hover:scale-110 transition-transform shadow-lg">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-md">
                    Original (Vacío)
                  </div>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/jpeg, image/png" className="hidden" />
            </div>

            {/* Controls (Fade if no image) */}
            <div className={`space-y-6 transition-opacity duration-300 ${!previewUrl ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              
              {/* Step 2: Style */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-500">2</span>
                  Elige el estilo
                </h2>
                <div className="space-y-3">
                  {styles.map(style => (
                    <label key={style.id} className={`flex items-start p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedStyle === style.id ? 'border-[#EB4511] bg-[#EB4511]/5' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input type="radio" name="style" className="mt-1 mr-3 text-[#EB4511] focus:ring-[#EB4511]" checked={selectedStyle === style.id} onChange={() => setSelectedStyle(style.id)} />
                      <div>
                        <div className={`font-bold ${selectedStyle === style.id ? 'text-[#EB4511]' : 'text-gray-700'}`}>{style.label}</div>
                        <div className="text-xs text-gray-500">{style.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 3: Access Code & Submit */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-500">3</span>
                  Código de Acceso
                </h2>
                <div className="relative mb-6">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Ej. RE-VIP-2026"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#EB4511] focus:ring-0 transition-colors uppercase font-mono"
                  />
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !previewUrl || !accessCode.trim()}
                  className="w-full bg-[#EB4511] text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-[#c42e0d] transition-colors shadow-lg shadow-[#EB4511]/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <><Sparkles className="animate-pulse" size={20} /> Generando magia...</>
                  ) : (
                    <>Generar Staging <ArrowRight size={20} /></>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: RESULT */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-full min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-500">4</span>
                  Resultado
                </h2>
                {remainingCredits !== null && (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    {remainingCredits} créditos restantes
                  </span>
                )}
              </div>

              <div className="flex-1 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden">
                {!previewUrl && !resultImage && (
                  <div className="text-center text-gray-400 p-6">
                    <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
                    <p>El resultado aparecerá aquí.</p>
                  </div>
                )}

                {previewUrl && !resultImage && isGenerating && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-[#EB4511] rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-gray-700 animate-pulse">Analizando arquitectura...</p>
                    <p className="text-xs text-gray-500 mt-2">Aplicando diseño {styles.find(s => s.id === selectedStyle)?.label}</p>
                  </div>
                )}

                {resultImage && (
                  <div className="absolute inset-0 animate-in fade-in zoom-in-95 duration-500">
                    <img src={resultImage} alt="Staged Result" className="w-full h-full object-contain bg-black/5" />
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1">
                      <CheckCircle2 size={14} /> Amoblado ({styles.find(s => s.id === selectedStyle)?.label})
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {resultImage && (
                <div className="mt-4 grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                  <button 
                    onClick={() => setResultImage(null)}
                    className="bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <Sparkles size={18} /> Modificar
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="bg-gray-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-lg"
                  >
                    <Download size={18} /> Descargar HD
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}