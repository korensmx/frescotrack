import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  User, 
  Building, 
  Phone, 
  DollarSign, 
  Check, 
  MessageSquare, 
  MapPin, 
  Image, 
  Upload, 
  Calculator, 
  Zap, 
  Wind,
  Layers,
  Globe,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Clock,
  QrCode
} from 'lucide-react';
import type { TechnicianProfile, PricingMatrix, ApplianceType, VoltageType, SystemType, CapacityType } from '../types';
import { calculateEquipmentServicePrice, DEFAULT_PRICING_MATRIX } from '../utils/pricing';
import { compressImageAsync } from '../utils/asyncTasks';
import { invalidatePricingCache } from '../utils/cache';
import { getTenantQRPrefix } from '../utils/qrPrefix';

interface SettingsModalProps {
  technician: TechnicianProfile;
  onSaveTechnician: (updated: TechnicianProfile) => void;
  onResetSeedData: () => void;
  onViewPublicWebsite?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  technician,
  onSaveTechnician,
  onResetSeedData,
  onViewPublicWebsite,
}) => {
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'landing'>('general');

  // General Profile State
  const [name, setName] = useState(technician.name);
  const [businessName, setBusinessName] = useState(technician.businessName);
  const [phone, setPhone] = useState(technician.phone);
  const [city, setCity] = useState(technician.city);
  const [logoUrl, setLogoUrl] = useState(technician.logoUrl || '');
  const [brandColor, setBrandColor] = useState(technician.brandColor || '#0284c7');
  
  // Pricing matrix state
  const [pricing, setPricing] = useState<PricingMatrix>(() => technician.pricing || DEFAULT_PRICING_MATRIX);

  // Landing Page & QR Prefix State
  const [qrPrefix, setQrPrefix] = useState(() => technician.qrPrefix || getTenantQRPrefix(technician));
  const [heroTitle, setHeroTitle] = useState(
    technician.landingPage?.heroTitle || 'Que tu clima enfríe al 100% y ahorre hasta 35% en luz CFE'
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    technician.landingPage?.heroSubtitle || 'Mantenimiento preventivo profesional con hidrolavadora a presión, desinfección profunda de turbinas, revisión de presión de gas y garantía digital con etiqueta QR en cada equipo.'
  );
  const [specialtyBadge, setSpecialtyBadge] = useState(
    technician.landingPage?.specialtyBadge || 'Especialistas en Minisplits y Climas de Ventana'
  );
  const [warrantyText, setWarrantyText] = useState(
    technician.landingPage?.warrantyText || 'Garantía de 30 a 90 días por escrito'
  );
  const [workingHours, setWorkingHours] = useState(
    technician.landingPage?.workingHours || 'Lunes a Sábado de 8:00 AM a 7:00 PM'
  );
  const [customWhatsAppText, setCustomWhatsAppText] = useState(
    technician.landingPage?.customWhatsAppText || ''
  );

  // Live Pricing Tester State
  const [testAppliance, setTestAppliance] = useState<ApplianceType>('Minisplit');
  const [testVoltage, setTestVoltage] = useState<VoltageType>('220V');
  const [testSystem, setTestSystem] = useState<SystemType>('Inverter');
  const [testCapacity, setTestCapacity] = useState<CapacityType>('1.5 Ton');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  // Handle Logo Upload (Asynchronously compressed to 400x400 WebP/JPEG)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessingLogo(true);
        const optimized = await compressImageAsync(file, 400, 400, 0.85);
        setLogoUrl(optimized);
      } catch (err) {
        console.error('Error optimizando logo', err);
        alert('No se pudo procesar la imagen seleccionada.');
      } finally {
        setIsProcessingLogo(false);
      }
    }
  };

  const handleCapacityDeltaChange = (cap: CapacityType, val: number) => {
    setPricing((prev) => ({
      ...prev,
      capacityDeltas: {
        ...prev.capacityDeltas,
        [cap]: val,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    invalidatePricingCache();
    onSaveTechnician({
      ...technician,
      name: name.trim(),
      businessName: businessName.trim(),
      phone: phone.replace(/\D/g, ''),
      city: city.trim(),
      logoUrl,
      brandColor,
      pricing,
      qrPrefix: qrPrefix.trim().toUpperCase() || getTenantQRPrefix(technician),
      landingPage: {
        heroTitle: heroTitle.trim(),
        heroSubtitle: heroSubtitle.trim(),
        specialtyBadge: specialtyBadge.trim(),
        warrantyText: warrantyText.trim(),
        workingHours: workingHours.trim(),
        customWhatsAppText: customWhatsAppText.trim(),
      },
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const calculatedTestPrice = calculateEquipmentServicePrice({
    applianceType: testAppliance,
    voltage: testVoltage,
    systemType: testSystem,
    capacity: testCapacity,
  }, pricing);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Panel de Configuración del Técnico
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Personaliza tu identidad, tarifas y el contenido de tu Landing Page pública
              </p>
            </div>
          </div>

          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              Guardado
            </span>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2 px-4 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'general'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Datos y Tarifario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('landing')}
            className={`py-2 px-4 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'landing'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Mi Landing Page & QR</span>
          </button>

          {onViewPublicWebsite && (
            <button
              type="button"
              onClick={onViewPublicWebsite}
              className="ml-auto py-2 px-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Previsualizar Landing Page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Landing en Vivo</span>
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* TAB 1: DATOS GENERALES Y TARIFAS */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* 1. BRANDING & LOGO */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-sky-600" />
                  1. Identidad del Negocio y Logotipo
                </h3>

                {/* Logo Uploader / Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Image className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <span className="text-[9px] font-bold block">Sin Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className="cursor-pointer py-2 px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isProcessingLogo ? 'Procesando...' : 'Subir Imagen de Logo'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          className="hidden" 
                          disabled={isProcessingLogo}
                        />
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Quitar Logo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Formatos PNG, JPG o SVG. Se mostrará en tus Stickers QR físicos, en la Navbar y en el Carnet del cliente.
                    </p>
                  </div>
                </div>

                {/* Business Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre Comercial del Negocio:
                    </label>
                    <input 
                      type="text" 
                      value={businessName} 
                      onChange={(e) => setBusinessName(e.target.value)} 
                      required 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del Técnico Responsable:
                    </label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teléfono WhatsApp de Contacto (10 dígitos):
                    </label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      required 
                      maxLength={14}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ciudad y Zona de Cobertura:
                    </label>
                    <input 
                      type="text" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                      required 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 2. PRICING MATRIX */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    2. Tarifario Base de Mantenimiento Preventivo
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Valores en Moneda Nacional (MXN)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Tarifa Base Minisplit (1 Ton / 110V Convencional):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">$</span>
                      <input 
                        type="number" 
                        value={pricing.baseMinisplit} 
                        onChange={(e) => setPricing({ ...pricing, baseMinisplit: Number(e.target.value) })} 
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Tarifa Base Clima de Ventana:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">$</span>
                      <input 
                        type="number" 
                        value={pricing.baseVentana} 
                        onChange={(e) => setPricing({ ...pricing, baseVentana: Number(e.target.value) })} 
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Deltas & Surcharges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Extra por Inverter (+):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                      <input 
                        type="number" 
                        value={pricing.inverterExtra} 
                        onChange={(e) => setPricing({ ...pricing, inverterExtra: Number(e.target.value) })} 
                        className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Extra por 220V (+):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                      <input 
                        type="number" 
                        value={pricing.voltage220vExtra} 
                        onChange={(e) => setPricing({ ...pricing, voltage220vExtra: Number(e.target.value) })} 
                        className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Extra Comercial (+):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                      <input 
                        type="number" 
                        value={pricing.commercialExtra} 
                        onChange={(e) => setPricing({ ...pricing, commercialExtra: Number(e.target.value) })} 
                        className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Capacity (Ton) Surcharges */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Ajuste por Tonelaje (Capacidad):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(['0.5 Ton', '0.75 Ton', '1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton', '3 Ton'] as CapacityType[]).map((cap) => (
                      <div key={cap} className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-600 text-[11px] truncate">{cap}:</span>
                        <div className="relative flex-1">
                          <span className="absolute left-1.5 top-1 text-slate-400 text-[10px]">$</span>
                          <input 
                            type="number" 
                            value={pricing.capacityDeltas[cap] || 0} 
                            onChange={(e) => handleCapacityDeltaChange(cap, Number(e.target.value))}
                            className="w-full pl-4 pr-1 py-0.5 text-right font-mono font-bold text-slate-900 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Pricing Simulator Box */}
                <div className="p-4 rounded-2xl bg-emerald-900 text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      <span className="font-black text-xs uppercase tracking-wider text-emerald-200">
                        Probador de Tarifas en Tiempo Real
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-300 block">Tarifa Resultante:</span>
                      <strong className="text-xl font-black text-white">${calculatedTestPrice} MXN</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-800">
                    <div>
                      <span className="text-[10px] text-emerald-200 font-bold block mb-1">Aparato:</span>
                      <select 
                        value={testAppliance}
                        onChange={(e) => setTestAppliance(e.target.value as ApplianceType)}
                        className="w-full py-1 px-2 rounded-lg bg-emerald-800 text-white font-bold border border-emerald-500 text-xs"
                      >
                        <option value="Minisplit">Minisplit</option>
                        <option value="Clima de Ventana">Ventana</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-200 font-bold block mb-1">Voltaje:</span>
                      <select 
                        value={testVoltage}
                        onChange={(e) => setTestVoltage(e.target.value as VoltageType)}
                        className="w-full py-1 px-2 rounded-lg bg-emerald-800 text-white font-bold border border-emerald-500 text-xs"
                      >
                        <option value="110V">110V</option>
                        <option value="220V">220V</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-200 font-bold block mb-1">Tecnología:</span>
                      <select 
                        value={testSystem}
                        onChange={(e) => setTestSystem(e.target.value as SystemType)}
                        className="w-full py-1 px-2 rounded-lg bg-emerald-800 text-white font-bold border border-emerald-500 text-xs"
                      >
                        <option value="Inverter">Inverter</option>
                        <option value="Convencional / Normal">Normal</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-200 font-bold block mb-1">Tonelaje:</span>
                      <select 
                        value={testCapacity}
                        onChange={(e) => setTestCapacity(e.target.value as CapacityType)}
                        className="w-full py-1 px-2 rounded-lg bg-emerald-800 text-white font-bold border border-emerald-500 text-xs"
                      >
                        <option value="0.5 Ton">0.5 Ton</option>
                        <option value="0.75 Ton">0.75 Ton</option>
                        <option value="1 Ton">1 Ton</option>
                        <option value="1.5 Ton">1.5 Ton</option>
                        <option value="2 Ton">2 Ton</option>
                        <option value="2.5 Ton">2.5 Ton</option>
                        <option value="3 Ton">3 Ton</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONALIZAR LANDING PAGE & PREFIJO QR */}
          {activeTab === 'landing' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* QR Prefix Box */}
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Prefijo Único para tus Stickers QR</span>
                </div>
                <p className="text-xs text-indigo-700">
                  Evita duplicidades con otros técnicos. Tus folios se generarán con este código inicial único.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input 
                    type="text" 
                    value={qrPrefix} 
                    onChange={(e) => setQrPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={5}
                    placeholder="ej. CK, RM, CG"
                    className="w-32 px-3 py-2 bg-white border border-indigo-300 rounded-xl font-mono font-black text-sm text-indigo-900 uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-xs font-semibold text-slate-500">
                    Ejemplo de folio resultante: <strong className="font-mono text-indigo-800">{qrPrefix || 'CK'}-0001</strong>
                  </span>
                </div>
              </div>

              {/* Landing Page Content */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-600" />
                  Textos y Promociones de tu Sitio Web Público
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Badge Superior de Especialidad:</span>
                  </label>
                  <input 
                    type="text" 
                    value={specialtyBadge} 
                    onChange={(e) => setSpecialtyBadge(e.target.value)} 
                    placeholder="ej. Especialistas en Minisplits y Climas de Ventana"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Titular Principal (Encabezado Hero):
                  </label>
                  <input 
                    type="text" 
                    value={heroTitle} 
                    onChange={(e) => setHeroTitle(e.target.value)} 
                    placeholder="ej. Que tu clima enfríe al 100% y ahorre hasta 35% en luz CFE"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción / Subtítulo del Servicio:
                  </label>
                  <textarea 
                    value={heroSubtitle} 
                    onChange={(e) => setHeroSubtitle(e.target.value)} 
                    rows={3}
                    placeholder="Describe los beneficios de tu servicio preventivo..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Garantía Ofrecida:</span>
                    </label>
                    <input 
                      type="text" 
                      value={warrantyText} 
                      onChange={(e) => setWarrantyText(e.target.value)} 
                      placeholder="ej. Garantía de 30 a 90 días por escrito"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>Horario de Atención:</span>
                    </label>
                    <input 
                      type="text" 
                      value={workingHours} 
                      onChange={(e) => setWorkingHours(e.target.value)} 
                      placeholder="ej. Lunes a Sábado de 8:00 AM a 7:00 PM"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mensaje Personalizado de WhatsApp al Pedir Servicio:</span>
                  </label>
                  <input 
                    type="text" 
                    value={customWhatsAppText} 
                    onChange={(e) => setCustomWhatsAppText(e.target.value)} 
                    placeholder="Opcional. Deja vacío para usar la cotización automática..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-slate-100">
            <button
              type="submit"
              className="flex-1 py-3.5 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>

            <button
              type="button"
              onClick={onResetSeedData}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Valores Demo</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
