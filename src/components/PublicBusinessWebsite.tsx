import React, { useState } from 'react';
import { 
  Snowflake, 
  Wind, 
  Zap, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Calculator, 
  QrCode, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Flame,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  Check
} from 'lucide-react';
import type { 
  TechnicianProfile, 
  Equipment, 
  ApplianceType, 
  VoltageType, 
  SystemType, 
  CapacityType 
} from '../types';
import { calculateEquipmentServicePrice, normalizePricingMatrix, MINISPLIT_RATE_ROWS } from '../utils/pricing';
import { formatDisplayPhone, createWhatsAppUrl } from '../utils/whatsapp';
import { WeatherBanner } from './WeatherBanner';
import { getEquipmentMetaIndex } from '../utils/indexing';

interface PublicBusinessWebsiteProps {
  technician: TechnicianProfile;
  equipments: Equipment[];
  onOpenEquipmentQR: (equipment: Equipment) => void;
  onSwitchToAdmin: () => void;
}

const APPLIANCE_OPTIONS: ApplianceType[] = ['Minisplit', 'Clima de Ventana'];
const VOLTAGE_OPTIONS: VoltageType[] = ['110V', '220V'];
const SYSTEM_OPTIONS: SystemType[] = ['Inverter', 'Convencional / Normal'];
const CAPACITY_OPTIONS: CapacityType[] = ['1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton', '3 Ton'];

export const PublicBusinessWebsite: React.FC<PublicBusinessWebsiteProps> = ({
  technician,
  equipments,
  onOpenEquipmentQR,
  onSwitchToAdmin,
}) => {
  // Cotizador State
  const [appliance, setAppliance] = useState<ApplianceType>('Minisplit');
  const [voltage, setVoltage] = useState<VoltageType>('220V');
  const [system, setSystem] = useState<SystemType>('Inverter');
  const [capacity, setCapacity] = useState<CapacityType>('1.5 Ton');

  // Folio Search State
  const [searchFolio, setSearchFolio] = useState('');
  const [searchError, setSearchError] = useState('');

  const normPricing = normalizePricingMatrix(technician.pricing);

  // Calculate live quote
  const calculatedPrice = calculateEquipmentServicePrice({
    applianceType: appliance,
    voltage,
    systemType: system,
    capacity,
  }, normPricing);

  // WhatsApp Quote Request URL
  const quoteWhatsAppText = `¡Hola ${technician.name} de ${technician.businessName}! 👋 Estuve en su sitio web y me gustaría agendar un mantenimiento preventivo:

❄️ Equipo: ${appliance} ${capacity}
⚡ Voltaje: ${voltage} (${system})
💵 Cotización en web: $${calculatedPrice} MXN

¿Qué días y horarios tienes disponibles para visitarme? ¡Gracias!`;

  const quoteWhatsAppUrl = createWhatsAppUrl(technician.phone, quoteWhatsAppText);

  const handleSearchFolio = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchFolio.trim().toUpperCase();
    if (!clean) return;

    const index = getEquipmentMetaIndex(equipments);
    const found = index.findByFolio(clean);
    if (found) {
      setSearchError('');
      onOpenEquipmentQR(found);
    } else {
      setSearchError(`No encontramos ningún equipo registrado con el folio "${clean}". Revisa la etiqueta de tu clima.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Live Online Weather & Geolocation Banner */}
      <WeatherBanner
        preferredCity={technician.city}
        onSwitchView={onSwitchToAdmin}
        switchViewLabel="Panel del Técnico"
        switchViewIcon={<Lock className="w-3 h-3" />}
      />

      {/* Main Header / Navigation */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          
          {/* Logo & Business Name */}
          <div className="flex items-center gap-3">
            {technician.logoUrl ? (
              <img 
                src={technician.logoUrl} 
                alt={technician.businessName} 
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-contain bg-slate-100 p-1 border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-sky-500/20">
                ❄️
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg sm:text-2xl text-slate-900 tracking-tight leading-none">
                  {technician.businessName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verificado
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {technician.name} · Climatización, Mantenimiento y Garantías
              </p>
            </div>
          </div>

          {/* Quick Contact Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={`tel:${technician.phone}`}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4 text-sky-600" />
              <span>{formatDisplayPhone(technician.phone)}</span>
            </a>

            <a
              href={quoteWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
            >
              <MessageSquare className="w-4 h-4 fill-white stroke-none" />
              <span>Pedir Servicio por WhatsApp</span>
            </a>
          </div>

          {/* Call Icon on Mobile */}
          <a
            href={`tel:${technician.phone}`}
            className="md:hidden p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Llamar"
          >
            <Phone className="w-5 h-5 text-sky-600" />
          </a>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="bg-gradient-to-b from-sky-50/70 via-white to-slate-50 py-8 sm:py-14 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              {technician.landingPage?.specialtyBadge || 'Especialistas en Minisplits y Climas de Ventana'}
            </span>

            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {technician.landingPage?.heroTitle || (
                <>Que tu clima enfríe al 100% y <span className="text-sky-600">ahorre hasta 35%</span> en luz CFE</>
              )}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {technician.landingPage?.heroSubtitle || 'Mantenimiento preventivo profesional con hidrolavadora a presión, desinfección profunda de turbinas, revisión de presión de gas y garantía digital con etiqueta QR en cada equipo.'}
            </p>

            {/* Benefit Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-bold text-slate-700 text-left">
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{technician.landingPage?.warrantyText || 'Garantía de 30 a 90 días'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bitácora Digital con QR</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{technician.landingPage?.workingHours || 'Atención Lunes a Sábado'}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <a
                href={quoteWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all text-center"
              >
                <MessageSquare className="w-5 h-5 fill-white stroke-none" />
                <span>Agendar Mantenimiento por WhatsApp</span>
              </a>

              <a
                href="#cotizador"
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm border border-slate-300 flex items-center justify-center gap-2 transition-colors"
              >
                <Calculator className="w-4 h-4 text-sky-600" />
                <span>Cotizar en Línea</span>
              </a>
            </div>
          </div>

          {/* Right Column: QR Folio Quick Lookup Card */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-slate-900 text-white">
                <QrCode className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">
                  ¿Ya tienes etiqueta QR en tu clima?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Consulta el carnet de salud, fecha de último servicio y vigencia
                </p>
              </div>
            </div>

            <form onSubmit={handleSearchFolio} className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchFolio}
                  onChange={(e) => {
                    setSearchFolio(e.target.value.toUpperCase());
                    setSearchError('');
                  }}
                  placeholder="Ingresa Folio (ej. FT-0041)"
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              {searchError && (
                <p className="text-xs text-rose-600 font-bold">
                  {searchError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>Ver Carnet de Salud Digital</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Folios */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                O prueba con estos folios registrados:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {equipments.slice(0, 3).map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => onOpenEquipmentQR(eq)}
                    className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors"
                  >
                    {eq.qrId} ({eq.brand})
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* INTERACTIVE CLIENT QUOTE CALCULATOR SECTION (#cotizador) */}
      <section id="cotizador" className="py-10 sm:py-16 max-w-6xl mx-auto px-4 w-full space-y-8">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            Tarifas Transparentes
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Cotiza tu Mantenimiento Preventivo al Instante
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Selecciona las especificaciones de tu aparato y calcula el costo exacto antes de agendar
          </p>
        </div>

        {/* Dynamic Calculator Box */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Controls Column (7 Cols on desktop) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* 1. Tipo de Aparato */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                1. Tipo de Clima:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {APPLIANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAppliance(opt)}
                    className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                      appliance === opt
                        ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{opt === 'Minisplit' ? '❄️ Minisplit' : '🪟 Clima de Ventana'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Voltaje y Sistema */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  2. Voltaje Eléctrico:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VOLTAGE_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVoltage(v)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                        voltage === v
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      ⚡ {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  3. Tecnología:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SYSTEM_OPTIONS.map((sys) => (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => setSystem(sys)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                        system === sys
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {sys === 'Inverter' ? <Zap className="w-3.5 h-3.5" /> : null}
                      <span>{sys === 'Inverter' ? 'Inverter' : 'Normal'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Tonelaje */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                4. Capacidad (Tonelaje):
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {CAPACITY_OPTIONS.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setCapacity(cap)}
                    className={`py-2.5 px-1 rounded-xl text-xs font-black transition-all text-center ${
                      capacity === cap
                        ? 'bg-sky-600 text-white shadow-xs scale-102'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Quote Result Card (5 Cols on desktop) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl text-center">
            
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                Tarifa Oficial Estimada
              </span>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                ${calculatedPrice.toLocaleString('es-MX')} <span className="text-lg font-bold text-slate-400">MXN</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {appliance} {capacity} · {voltage} · {system}
              </p>
            </div>

            {/* Service Inclusions */}
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-left space-y-2 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span>Lavado profundo de serpentín y turbina</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span>Desinfección de charola de desagüe</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span>Revisión de capacitor, presiones de gas y amperaje</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span>Etiqueta QR y Carnet de Garantía</span>
              </div>
            </div>

            {/* Direct WhatsApp Call to Action */}
            <div className="space-y-2">
              <a
                href={quoteWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all text-center"
              >
                <MessageSquare className="w-5 h-5 fill-white stroke-none shrink-0" />
                <span>Agendar por WhatsApp con esta Tarifa</span>
              </a>
              <p className="text-[10px] text-slate-400">
                Atención directa con {technician.name} ({formatDisplayPhone(technician.phone)})
              </p>
            </div>

          </div>

        </div>

        {/* Transparent 10-Rates Table for Minisplits */}
        <div className="mt-10 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span> Tarifario Oficial de Mantenimiento Preventivo (Minisplits)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Tarifas fijas y transparentes según capacidad y tecnología. Sin costos sorpresa al finalizar el servicio.
              </p>
            </div>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 self-start">
              ✓ Garantía por Escrito
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-2.5 px-3 sm:px-4">Capacidad del Minisplit</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">❄️ Convencional / Normal</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">⚡ Inverter (Ahorro)</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MINISPLIT_RATE_ROWS.map((row, idx) => {
                  const normalPrice = normPricing[row.normalKey] as number || 0;
                  const inverterPrice = normPricing[row.inverterKey] as number || 0;
                  const isSelectedTonnage = capacity === row.tonnage && appliance === 'Minisplit';
                  return (
                    <tr 
                      key={row.tonnage} 
                      className={`${isSelectedTonnage ? 'bg-sky-50/70 font-bold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} transition-colors`}
                    >
                      <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800">
                        <span className="font-mono font-black text-slate-900">{row.label}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({row.btu})</span>
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center font-black text-slate-800">
                        ${normalPrice.toLocaleString('es-MX')} MXN
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center font-black text-emerald-700">
                        ${inverterPrice.toLocaleString('es-MX')} MXN
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setAppliance('Minisplit');
                            setCapacity(row.tonnage);
                            const cotizadorEl = document.getElementById('cotizador');
                            if (cotizadorEl) cotizadorEl.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                        >
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </section>

      {/* COVERAGE & TRUST SECTION */}
      <section className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cobertura en Toda la Zona Conurbada
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {technician.city}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-bold text-slate-700">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              📍 Tampico (Petrolera, Rosales, Centro)
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              📍 Cd. Madero (Miramar, Unidad Nal)
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              📍 Altamira (Miralta, Monte Alto)
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              📍 Pánuco y Zona Norte de Veracruz
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-8 pb-24 md:pb-8 border-t border-slate-800 text-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {technician.logoUrl ? (
              <img src={technician.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5" />
            ) : (
              <span className="text-xl">❄️</span>
            )}
            <div>
              <strong className="text-white block">{technician.businessName}</strong>
              <span className="text-[11px] text-slate-400">Atención profesional de climatización</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400 text-xs">
            <button
              onClick={onSwitchToAdmin}
              className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Acceso Panel de Técnico</span>
            </button>
            <span>·</span>
            <span>FrescoTrack B2B</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5 text-slate-300 font-bold bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700 shadow-inner">
              ⚡ Powered by <span className="text-white font-black tracking-wider">KORENS</span>
            </span>
          </div>
        </div>
      </footer>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div>
          <span className="text-[10px] text-slate-400 block font-bold">TARIFA ESTIMADA:</span>
          <span className="text-base font-black text-slate-900">${calculatedPrice} MXN</span>
        </div>

        <a
          href={quoteWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-4 rounded-xl bg-[#25D366] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
        >
          <MessageSquare className="w-4 h-4 fill-white stroke-none" />
          <span>Pedir WhatsApp</span>
        </a>
      </div>

    </div>
  );
};
