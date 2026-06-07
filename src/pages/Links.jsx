import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, PlayCircle, Globe, MapPin } from 'lucide-react';

// Iconos personalizados (para que no falle la librería)
const WhatsAppIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.8 69.4 27.2 106.2 27.2h.1c122.3 0 222-99.6 222-222 0-59.3-23-115.1-65.1-157.1zM223.9 445.2c-33.1 0-65.6-8.9-93.9-25.7l-6.7-4-69.8 18.3L72 365.4l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-82.7 184.6-184.5 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18s-8.8-2.8-12.4 2.8-14.1 18-17.3 21.6-6.4 4.1-12 1.4c-5.5-2.8-23.4-8.6-44.5-27.5-16.4-14.6-27.5-32.7-30.7-38.2-3.2-5.5-.3-8.5 2.5-11.2 2.5-2.6 5.5-6.4 8.3-9.6 2.8-3.2 3.7-5.5 5.5-9.1 1.8-3.7.9-6.9-.5-9.6-1.4-2.8-12.4-29.8-17-41.1-4.5-10.9-9.1-9.4-12.4-9.6-3.2-.1-6.9-.2-10.5-.2-3.7 0-9.6 1.4-14.7 6.9-5.1 5.5-19.3 18.8-19.3 45.9s19.7 53.3 22.5 57c2.8 3.7 38.8 59.3 94.1 83.2 13.2 5.7 23.4 9.1 31.4 11.7 13.2 4.2 25.2 3.6 34.8 2.1 10.6-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
);
const InstagramIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const YoutubeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
);

export default function Links() {
  const whatsappMessage = encodeURIComponent("¡Hola! Vengo desde Instagram y quiero hacer una consulta.");
  const whatsappUrl = `https://wa.me/5491138903333?text=${whatsappMessage}`;

  return (
    <div className="min-h-[100dvh] bg-[#111] text-white flex flex-col items-center py-12 px-6 relative overflow-hidden font-sans">
      
      {/* Fondo sutil (opcional, el mismo patrón que tienes en el footer) */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
        <img src="/logo-outline.png" alt="" className="w-[150%] h-auto object-contain -rotate-6" />
      </div>

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        
        {/* Avatar / Logo */}
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(229,59,18,0.2)] mb-4 overflow-hidden border-4 border-[#1a1a1a]">
          <img src="/Logos_RE!_naranja.png" alt="RE!" className="w-16 h-auto object-contain" />
        </div>

        {/* Info */}
        <h1 className="text-2xl font-black tracking-tight mb-1">RE! Producciones</h1>
        <p className="text-gray-400 font-medium text-sm flex items-center gap-1.5 mb-8">
          <MapPin size={14} /> Buenos Aires, AR
        </p>

        {/* Links principales */}
        <div className="w-full space-y-4">
          
          <Link to="/" className="w-full flex items-center justify-center gap-3 bg-[#E53B12] text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-[#c42e0d] hover:scale-[1.02] transition-all shadow-[0_10px_20px_rgba(229,59,18,0.25)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <Camera size={20} className="relative z-10" />
            <span className="relative z-10">Cotizar Online</span>
          </Link>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-white/20 hover:scale-[1.02] transition-all">
            <WhatsAppIcon size={20} />
            Escribir por WhatsApp
          </a>

          <Link to="/" onClick={() => setTimeout(() => document.getElementById('portfolio')?.scrollIntoView({behavior: 'smooth'}), 100)} className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-white/20 hover:scale-[1.02] transition-all">
            <PlayCircle size={20} />
            Ver Portfolio
          </Link>

          <Link to="/" className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-white/20 hover:scale-[1.02] transition-all">
            <Globe size={20} />
            Ir a la Web Oficial
          </Link>
        </div>

        {/* Redes Sociales Pequeñas */}
        <div className="flex gap-6 mt-12 text-white/50">
          <a href="https://www.instagram.com/somos.re.ok/" target="_blank" rel="noopener noreferrer" className="hover:text-[#E53B12] transition-colors p-2">
            <InstagramIcon size={24} />
          </a>
          <a href="https://www.youtube.com/@somosreok" target="_blank" rel="noopener noreferrer" className="hover:text-[#E53B12] transition-colors p-2">
            <YoutubeIcon size={24} />
          </a>
        </div>

      </div>
    </div>
  );
}