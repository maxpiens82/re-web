import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Building, Mail, DollarSign, Scale, X, Loader2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

export default function Cobranzas() {
  const { currentUser } = useAuth();
  const [data, setData] = useState({ debts: [], clients: [], staff: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals & Forms
  const [activeModal, setActiveModal] = useState(null); // 'payment', 'ajuste', 'globalAjuste'
  const [selectedClient, setSelectedClient] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  // Payment Form State
  const [payMonto, setPayMonto] = useState('');
  const [payMoneda, setPayMoneda] = useState('ARS');
  const [payMetodo, setPayMetodo] = useState('Transferencia');
  const [payRetenedor, setPayRetenedor] = useState('Administración');
  const [payFactura, setPayFactura] = useState('0');
  const [payObs, setPayObs] = useState('');
  const [dolarRate, setDolarRate] = useState(0);
  const [dolarLoading, setDolarLoading] = useState(false);

  // Ajuste Form State
  const [ajusteMonto, setAjusteMonto] = useState('');
  const [ajusteObs, setAjusteObs] = useState('');
  
  // Global Ajuste Autocomplete State
  const [globalSearch, setGlobalSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedGlobalClient, setSelectedGlobalClient] = useState(null);
  const searchWrapperRef = useRef(null);

  // Formateador en tiempo real para el dinero
  const formatInputMoney = (val) => {
    const raw = String(val).replace(/\D/g, '');
    if (!raw) return '';
    return '$' + new Intl.NumberFormat('es-AR').format(Number(raw));
  };

  const fetchCobranzas = async () => {
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_cobranzas' })
      });
      const res = await response.json();
      if (res.success) {
        setData(res);
      } else {
        console.error("Error del backend:", res.error);
        alert("Atención: El servidor reportó un error al calcular las deudas.\n" + res.error);
      }
    } catch (e) {
      console.error("Error fetching cobranzas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCobranzas();
    const interval = setInterval(fetchCobranzas, 30000); // Polling silent updates
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGIC ---
  const handleCurrencyChange = async (e) => {
    const moneda = e.target.value;
    setPayMoneda(moneda);
    if (moneda === 'USD') {
      setPayMonto('');
      setDolarLoading(true);
      try {
        const response = await fetch('https://dolarapi.com/v1/dolares/blue');
        const d = await response.json();
        setDolarRate((d.compra + d.venta) / 2);
      } catch (e) {
        alert("Error consultando Dólar Blue. Ingresa el equivalente ARS manualmente.");
      } finally {
        setDolarLoading(false);
      }
    } else {
      setPayMonto(formatInputMoney(selectedClient?.saldo || 0));
    }
  };

  const getArsEquivalent = () => {
    const amount = Number(String(payMonto).replace(/\D/g, '')) || 0;
    return payMoneda === 'USD' ? Math.floor(amount * dolarRate) : amount;
  };

  const handlePaymentSubmit = async () => {
    const finalArs = getArsEquivalent();
    if (!finalArs || finalArs <= 0) { alert("Monto inválido."); return; }
    
    const formattedAmount = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(finalArs);
    if (!window.confirm(`⚠️ Registrar pago de ${formattedAmount} ARS para ${selectedClient.cliente}?\n\nEsto procesará sus deudas y archivará los trabajos pagados permanentemente.`)) return;

    setProcessing(true);
    const payload = {
      cliente: selectedClient.cliente,
      empresa: selectedClient.empresa,
      telefono: selectedClient.telefono,
      montoARS: finalArs,
      montoUSD: payMoneda === 'USD' ? Number(String(payMonto).replace(/\D/g, '')) : 0,
      cotizacion: payMoneda === 'USD' ? dolarRate : 0,
      metodo: payMetodo,
      retenedor: payRetenedor,
      factura: payFactura,
      observaciones: payObs,
      saldoRestante: selectedClient.saldo - finalArs 
    };

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'process_payment', payload })
      });
      const res = await response.json();
      if (res.success) {
        let msg = '✅ Pago registrado.';
        if (res.afipWarning) msg += `\n\n⚠️ ADVERTENCIA AFIP:\n${res.afipWarning}`;
        alert(msg);
        setActiveModal(null);
        fetchCobranzas();
      } else { alert("Error: " + res.error); }
    } catch (e) { alert("Error de red."); } finally { setProcessing(false); }
  };

  const handleAjusteSubmit = async (isGlobal = false) => {
    const monto = Number(ajusteMonto);
    if (!monto) { alert("Ingresa un monto válido (puede ser negativo)."); return; }
    
    const targetClient = isGlobal ? selectedGlobalClient : selectedClient;
    if (!targetClient || !targetClient.telefono) { alert("Cliente inválido."); return; }

    setProcessing(true);
    const payload = {
      cliente: targetClient.cliente || `${targetClient.nombre} ${targetClient.apellido}`,
      empresa: targetClient.empresa,
      telefono: targetClient.telefono,
      monto: monto,
      observaciones: ajusteObs || 'Ajuste manual de saldo'
    };

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'process_ajuste', payload })
      });
      const res = await response.json();
      if (res.success) {
        setActiveModal(null);
        setAjusteMonto(''); setAjusteObs(''); setGlobalSearch(''); setSelectedGlobalClient(null);
        fetchCobranzas();
      } else { alert("Error: " + res.error); }
    } catch (e) { alert("Error de red."); } finally { setProcessing(false); }
  };

  const handleTestEmail = async (client) => {
    if (!window.confirm(`¿Enviar email de prueba de ${client.cliente} a tu correo (${currentUser.email})?`)) return;
    setProcessingAction(client.telefono);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'send_test_receipt', payload: { cliente: client.cliente, empresa: client.empresa, telefono: client.telefono, saldo: client.saldo, targetEmail: currentUser.email } })
      });
      const res = await response.json();
      if (res.success) alert("✅ Enviado correctamente.");
      else alert("Error: " + res.error);
    } catch (e) { alert("Error de red."); } finally { setProcessingAction(null); }
  };

  const handleGlobalSearch = (query) => {
    setGlobalSearch(query);
    const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "");
    if (normalized.length < 2) { setSuggestions([]); return; }
    
    const terms = normalized.split(/\s+/);
    const matches = data.clients.filter(c => {
      const raw = `${c.nombre} ${c.apellido} ${c.empresa} ${c.telefono}`;
      const norm = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "");
      return terms.every(t => norm.includes(t));
    });
    setSuggestions(matches.slice(0, 10));
  };

  const openModal = (type, client = null) => {
    setSelectedClient(client);
    setActiveModal(type);
    if (type === 'payment' && client) {
      setPayMoneda('ARS'); setPayMetodo('Transferencia'); setPayFactura('0'); setPayRetenedor('Administración'); setPayObs('');
      setPayMonto(formatInputMoney(client.saldo));
    } else if (type === 'ajuste' || type === 'globalAjuste') {
      setAjusteMonto(''); setAjusteObs(''); setGlobalSearch(''); setSelectedGlobalClient(null);
    }
  };

  // --- RENDER ---
  if (loading) return <div className="flex h-full items-center justify-center text-[#EB4511]"><Loader2 className="animate-spin w-8 h-8" /></div>;

  const filteredData = data.debts.filter(c => c.cliente.toLowerCase().includes(search.toLowerCase()) || c.empresa.toLowerCase().includes(search.toLowerCase()));
  const totalDebt = filteredData.reduce((acc, curr) => acc + curr.saldo, 0);

  return (
    <div className="h-full bg-[#F0F2F5] font-sans text-gray-800 overflow-y-auto w-full pb-24">
      
      {/* HEADER */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4">
          <h1 className="text-base md:text-xl font-extrabold text-[#EB4511] tracking-widest uppercase leading-none">
            Cuentas Corrientes
          </h1>
          <div className="flex justify-between items-center w-full md:w-auto">
            {/* Mobile Total Debt Badge (Hidden on Desktop) */}
            <span className="md:hidden bg-orange-50 text-[#EB4511] text-[11px] font-black px-2.5 py-1 rounded-full border border-orange-200 tracking-wider">
              TOTAL: ${totalDebt.toLocaleString('es-AR')}
            </span>
            
            {/* Ajuste Libre Button */}
            <button onClick={() => openModal('globalAjuste')} className="bg-white border border-[#EB4511] text-[#EB4511] hover:bg-orange-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-1.5 text-[11px] md:text-xs font-bold transition-colors shadow-sm shrink-0 ml-auto md:ml-0">
              <Scale size={14}/> Ajuste Libre
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* SEARCH BAR */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" placeholder="Buscar cliente o empresa..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 py-3.5 pl-10 pr-4 rounded-xl text-sm md:text-base font-medium outline-none focus:border-[#EB4511] focus:ring-1 focus:ring-[#EB4511] transition-all shadow-sm"
          />
        </div>

        {/* LIST */}
        {filteredData.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-[#38a169] font-bold text-lg">¡Cuentas al día!</h3>
            <p className="text-gray-500 text-sm">No hay saldos pendientes.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:gap-4">
            {filteredData.map(c => {
              const isCredit = c.saldo < 0;
              const isB2B = c.isCorp;
              
              return (
                <div key={c.telefono + c.cliente} className={`bg-white rounded-xl p-3 md:p-4 shadow-sm border-l-[4px] transition-all hover:shadow-md
                  ${isCredit ? 'border-l-blue-500' : (isB2B ? 'border-l-[#2B6CB0]' : 'border-l-[#EB4511]')}`}
                >
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <div className="flex-1 min-w-0 pr-2 md:pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-extrabold text-sm md:text-base truncate ${isB2B ? 'text-[#2B6CB0]' : 'text-gray-800'}`}>
                          {c.cliente}
                        </span>
                        {isB2B && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0">B2B</span>}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 truncate">
                        <Building size={12} className="shrink-0"/> <span className="font-semibold text-gray-600 truncate">{c.empresa || 'Particular'}</span>
                        <span className="text-gray-300 shrink-0">|</span> 
                        {c.telefono ? (
                          <button onClick={() => {
                            const amountFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(c.saldo);
                            
                            // 🚀 CALCULATE DEBT DATE: Based on the geometric decay / ledger age
                            const debtDate = new Date();
                            debtDate.setDate(debtDate.getDate() - (c.daysOld || 0));
                            const dateFmt = debtDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                            let msg = `¡Hola ${c.cliente.split(' ')[0]}! 👋 Te contactamos de la administración de RE! 🎬\n\nDe acuerdo a nuestro sistema, se registra un saldo pendiente de *${amountFmt}* con fecha del *${dateFmt}*.\n\nSi ya realizaste el pago en las últimas horas, por favor adjuntanos el comprobante por este medio para que podamos conciliarlo y desestimá este mensaje. ✅\n\nDe lo contrario, podés cancelarlo a estos datos:\n\n🏦 *Banco Santander*\n👤 Maximiliano Augusto Gaggini\n🔢 CBU: 0720519488000006612168\n🏷️ Alias: *SOMOS.RE.OK*\n\n¡Muchas gracias!`;
                            window.open(`https://api.whatsapp.com/send?phone=${c.telefono}&text=${encodeURIComponent(msg)}`, '_blank');
                          }} className="text-[#25D366] hover:bg-[#25D366]/10 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors font-bold shrink-0">
                            <Send size={10} /> WA
                          </button>
                        ) : (
                          <span className="text-gray-400">Sin Teléfono</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                        {c.daysOld > 0 && !isCredit && (
                          <span className={`${c.daysOld > 30 ? 'bg-rose-100 text-rose-700' : c.daysOld > 15 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'} px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold flex items-center gap-1`}><Clock size={10}/> {c.daysOld}d</span>
                        )}
                        <span className={`text-base md:text-xl font-black leading-none ${isCredit ? 'text-blue-600' : 'text-gray-800'}`}>
                          ${Math.abs(c.saldo).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest ${isCredit ? 'text-blue-500' : 'text-gray-400'}`}>
                        {isCredit ? 'A Favor' : (isB2B ? 'B2B' : 'Pendiente')}
                      </span>
                    </div>
                  </div>

                  {isB2B ? (
                    <div className="w-full mt-2 pt-2 border-t border-gray-100">
                      <div className="w-full bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-center text-[10px] md:text-xs font-bold py-1.5 md:py-2">
                        🏢 Cuenta Corporativa (Paga en B2B)
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 md:gap-2 pt-2 md:pt-3 border-t border-gray-100">
                      <button onClick={() => openModal('ajuste', c)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-1.5 md:py-2 rounded-lg text-[10px] md:text-[11px] font-bold transition-colors flex items-center justify-center gap-1 border border-gray-200">
                        <Scale size={12}/> <span className="hidden sm:inline">Ajuste</span>
                      </button>
                      <button onClick={() => handleTestEmail(c)} disabled={processingAction === c.telefono} className="flex-1 bg-blue-50 hover:bg-blue-100 text-[#2B6CB0] py-1.5 md:py-2 rounded-lg text-[10px] md:text-[11px] font-bold transition-colors flex items-center justify-center gap-1 border border-blue-100 disabled:opacity-50">
                        {processingAction === c.telefono ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12}/>} <span className="hidden sm:inline">Test</span>
                      </button>
                      <button onClick={() => openModal('payment', c)} className="flex-[2] md:flex-[3] bg-[#38a169] hover:bg-[#2f855a] text-white py-1.5 md:py-2 rounded-lg text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                        <DollarSign size={12}/> Pagar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STICKY FOOTER (TOTAL) */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 flex justify-between items-center pb-safe">
        <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Deuda Total Activa</span>
        <span className="text-2xl md:text-3xl font-black text-[#EB4511]">${totalDebt.toLocaleString('es-AR')}</span>
      </div>

      {/* MODALS */}
      {/* 1. PAYMENT MODAL */}
      {activeModal === 'payment' && selectedClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 relative">
            <div className="bg-[#38a169] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm md:text-base uppercase tracking-wide">Registrar Pago</h3>
                <p className="text-[10px] md:text-xs opacity-90 truncate font-medium">{selectedClient.cliente}</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Monto Recibido</label>
                <div className="flex gap-2">
                  <input type="text" value={payMonto} onChange={e => setPayMonto(formatInputMoney(e.target.value))} className="w-2/3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#38a169]" placeholder="$0" />
                  <select value={payMoneda} onChange={handleCurrencyChange} className="w-1/3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm font-bold outline-none cursor-pointer">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {payMoneda === 'USD' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-[#2B6CB0]">
                  {dolarLoading ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Consultando Dólar...</span> : 
                  <>Cotización Promedio: <b>${dolarRate.toLocaleString('es-AR')}</b><br/>Total a descontar: <b className="text-[#EB4511] text-sm">${getArsEquivalent().toLocaleString('es-AR')} ARS</b></>}
                </div>
              )}

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Método de Pago</label>
                <select value={payMetodo} onChange={e => setPayMetodo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none cursor-pointer">
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cripto (USDT)">Cripto (USDT)</option>
                </select>
              </div>

              {payMetodo === 'Efectivo' && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <label className="block text-[10px] font-bold text-[#EB4511] uppercase tracking-widest mb-1.5">¿Quién retiene el efectivo?</label>
                  <select value={payRetenedor} onChange={e => setPayRetenedor(e.target.value)} className="w-full bg-transparent text-[#EB4511] font-bold outline-none cursor-pointer text-sm">
                    <option value="Administración">Administración Central</option>
                    {data.staff.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Facturación AFIP</label>
                <select value={payFactura} onChange={e => setPayFactura(e.target.value)} className="w-full bg-orange-50 border border-orange-200 text-[#EB4511] rounded-xl p-3 text-sm font-bold outline-none cursor-pointer">
                  <option value="0">No Emitir Factura</option>
                  <option value="1">Facturar - Maxi</option>
                  <option value="2">Facturar - Socio</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Observaciones</label>
                <textarea rows="2" value={payObs} onChange={e => setPayObs(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none" placeholder="Opcional..."></textarea>
              </div>

              <button onClick={handlePaymentSubmit} disabled={processing} className="w-full bg-[#38a169] text-white font-extrabold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-[#2f855a] transition-all mt-4 shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                {processing ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. AJUSTE MODALS */}
      {(activeModal === 'ajuste' || activeModal === 'globalAjuste') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 relative">
            <div className="bg-[#2d2d2d] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm md:text-base uppercase tracking-wide">
                  {activeModal === 'globalAjuste' ? 'Ajuste Libre' : 'Ajuste Manual'}
                </h3>
                {selectedClient && <p className="text-[10px] md:text-xs opacity-90 truncate font-medium">{selectedClient.cliente}</p>}
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-5 md:p-6 space-y-4">
              {activeModal === 'globalAjuste' && (
                <div className="relative" ref={searchWrapperRef}>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Buscar Cliente</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={globalSearch} onChange={e => handleGlobalSearch(e.target.value)} placeholder="Nombre o empresa..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-9 text-sm font-medium outline-none focus:border-[#EB4511]" autoComplete="off" />
                  </div>
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {suggestions.map((c, i) => (
                        <div key={i} onClick={() => { setSelectedGlobalClient(c); setGlobalSearch(`${c.nombre} ${c.apellido}`); setSuggestions([]); }} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                          <div className="font-bold text-sm text-gray-800">{c.nombre} {c.apellido}</div>
                          <div className="text-[10px] text-gray-500 flex gap-1 items-center mt-1"><Building size={10}/> {c.empresa || 'Particular'} <span className="text-gray-300">|</span> {c.telefono}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Monto (Deuda)</label>
                <input type="number" value={ajusteMonto} onChange={e => setAjusteMonto(e.target.value)} placeholder="Ej: 50000 o -50000" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#EB4511]" />
                <p className="text-[9px] text-gray-400 mt-1 font-medium">Usa números negativos (-) para dar saldo a favor (crédito).</p>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Motivo / Observaciones</label>
                <input type="text" value={ajusteObs} onChange={e => setAjusteObs(e.target.value)} placeholder="Ej: Corrección de saldo..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#EB4511]" />
              </div>

              <button onClick={() => handleAjusteSubmit(activeModal === 'globalAjuste')} disabled={processing || (activeModal === 'globalAjuste' && !selectedGlobalClient)} className="w-full bg-[#EB4511] text-white font-extrabold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-[#c42e0d] transition-all mt-4 shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                {processing ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}