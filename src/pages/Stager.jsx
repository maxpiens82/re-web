import React, { useState, useRef } from 'react';
import { UploadCloud, Sparkles, Image as ImageIcon, ArrowRight, CheckCircle2, Download, Trash2 } from 'lucide-react';

export default function Stager() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('minimalist');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  
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
    }
  };

  const handleGenerate = () => {
    if (!selectedImage) return;
    
    setIsGenerating(true);
    
    // MOCKED API CALL (Simulating Vercel -> Google AI)
    setTimeout(() => {
      setResultImage("https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1000");
      setIsGenerating(false);
    }, 3500);
  };

  const clearWorkspace = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResultImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: UPLOAD & CONTROLS */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-500">1</span>
                Sube tu foto
              </h2>
              
              {!previewUrl ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#EB4511] hover:bg-[#EB4511]/5 transition-colors group"
                >
                  <UploadCloud size={40} className="mx-auto text-gray-400 group-hover:text-[#EB4511] mb-3 transition-colors" />
                  <p className="font-semibold text-gray-700 mb-1">Haz clic para subir una foto</p>
                  <p className="text-xs text-gray-500">JPG o PNG (Max 5MB). Idealmente un ambiente vacío.</p>
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
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/jpeg, image/png" 
                className="hidden" 
              />
            </div>

            <div className={`bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-opacity ${!previewUrl ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-500">2</span>
                Elige el estilo
              </h2>
              
              <div className="space-y-3">
                {styles.map(style => (
                  <label 
                    key={style.id} 
                    className={`flex items-start p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedStyle === style.id ? 'border-[#EB4511] bg-[#EB4511]/5' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <input 
                      type="radio" 
                      name="style" 
                      className="mt-1 mr-3 text-[#EB4511] focus:ring-[#EB4511]"
                      checked={selectedStyle === style.id}
                      onChange={() => setSelectedStyle(style.id)}
                    />
                    <div>
                      <div className={`font-bold ${selectedStyle === style.id ? 'text-[#EB4511]' : 'text-gray-700'}`}>{style.label}</div>
                      <div className="text-xs text-gray-500">{style.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !previewUrl}
                className="w-full mt-6 bg-[#EB4511] text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-[#c42e0d] transition-colors shadow-lg shadow-[#EB4511]/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <><Sparkles className="animate-pulse" size={20} /> Generando magia...</>
                ) : (
                  <>Generar Staging <ArrowRight size={20} /></>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: RESULT */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-full min-h-[400px] flex flex-col">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs text-gray-500">3</span>
                Resultado
              </h2>

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
                    <p className="font-bold text-gray-700 animate-pulse">Analizando geometría...</p>
                    <p className="text-xs text-gray-500 mt-2">Aplicando estilo {styles.find(s => s.id === selectedStyle)?.label}</p>
                  </div>
                )}

                {resultImage && (
                  <div className="absolute inset-0 animate-in fade-in zoom-in-95 duration-500">
                    <img src={resultImage} alt="Staged Result" className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1">
                      <CheckCircle2 size={14} /> Amoblado ({styles.find(s => s.id === selectedStyle)?.label})
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {resultImage && (
                <div className="mt-4 grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                  <button className="bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                    <Sparkles size={18} /> Re-generar
                  </button>
                  <button className="bg-gray-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-lg">
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