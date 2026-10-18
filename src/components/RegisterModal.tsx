import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  QrCode, 
  User, 
  Phone, 
  MapPin, 
  DollarSign, 
  Check, 
  Zap,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Calculator,
  Wind
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Equipment, 
  ServiceType, 
  TechnicianProfile, 
  ApplianceType, 
  VoltageType, 
  SystemType, 
  CapacityType 
} from '../types';
import { getRelativeISODate } from '../utils/dates';
import { createWhatsAppUrl } from '../utils/whatsapp';
import { calculateEquipmentServicePrice } from '../utils/pricing';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEquipment: (equipment: Equipment) => void;
  technician: TechnicianProfile;
  onViewPublicQR: (equipment: Equipment) => void;
}

const COMMON_BRANDS = ['Mirage', 'Carrier', 'York', 'Trane', 'LG', 'Midea', 'Hisense', 'Prime', 'Lennox', 'Otro'];
const APPLIANCE_TYPES: ApplianceType[] = ['Minisplit', 'Clima de Ventana'];
const VOLTAGE_TYPES: VoltageType[] = ['110V', '220V'];
const SYSTEM_TYPES: SystemType[] = ['Inverter', 'Convencional / Normal'];
const CAPACITIES: CapacityType[] = ['0.5 Ton', '0.75 Ton', '1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton', '3 Ton'];
const LOCATIONS = ['Recámara Ppal', 'Recámara 2', 'Sala/Comedor', 'Oficina', 'Local / Comercio', 'Cocina'];
const COLONIA_PRESETS = [
  'Col. Petrolera, Tampico',
  'Col. Lomas de Rosales, Tampico',
  'Zona Centro, Tampico',
  'Col. Las Américas, Tampico',
  'Col. Unidad Nacional, Madero',
  'Playa Miramar, Madero',
  'Lagunas de Miralta, Altamira',
  'Col. Monte Alto, Altamira',
];

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onAddEquipment,
  technician,
  onViewPublicQR,
}) => {
  if (!isOpen) return null;

  // Form State
  const [qrId, setQrId] = useState(() => `FT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientColonia, setClientColonia] = useState('');
  const [clientCity] = useState('Tampico');
  
  // Appliance Specs
  const [applianceType, setApplianceType] = useState<ApplianceType>('Minisplit');
  const [voltage, setVoltage] = useState<VoltageType>('220V');
  const [systemType, setSystemType] = useState<SystemType>('Inverter');
  const [capacity, setCapacity] = useState<CapacityType>('1.5 Ton');
  const [brand, setBrand] = useState('Mirage');
  const [customBrand, setCustomBrand] = useState('');
  const [location, setLocation] = useState('Recámara Ppal');
  const [customLocation, setCustomLocation] = useState('');

  // Service Details
  const [serviceType, setServiceType] = useState<ServiceType>('Mantenimiento Preventivo');
  const [reminderMonths, setReminderMonths] = useState<number>(6);
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [pressurePSI, setPressurePSI] = useState('118 PSI');
  const [refrigerant, setRefrigerant] = useState('R410A');
  
  // Cost (with auto-calc engine)
  const [cost, setCost] = useState<number>(() => {
    return calculateEquipmentServicePrice({
      applianceType: 'Minisplit',
      voltage: '220V',
      systemType: 'Inverter',
      capacity: '1.5 Ton',
    }, technician.pricing);
  });
  const [manualCostOverride, setManualCostOverride] = useState(false);

  // Recalculate cost when specs change if user hasn't manually typed a custom number
  useEffect(() => {
    if (!manualCostOverride) {
      const calculated = calculateEquipmentServicePrice({
        applianceType,
        voltage,
        systemType,
        capacity,
        isCommercial: reminderMonths === 3,
      }, technician.pricing);
      setCost(calculated);
    }
  }, [applianceType, voltage, systemType, capacity, reminderMonths, technician.pricing, manualCostOverride]);

  // Adjust gas and pressure presets based on appliance type
  useEffect(() => {
    if (applianceType === 'Clima de Ventana') {
      setPressurePSI('65 PSI');
      setRefrigerant('R22');
      if (voltage === '220V' && capacity === '0.75 Ton') {
        setVoltage('110V');
      }
    } else {
      setPressurePSI('118 PSI');
      setRefrigerant('R410A');
    }
  }, [applianceType]);

  // Success state after saving
  const [savedEquipment, setSavedEquipment] = useState<Equipment | null>(null);

  const handleGenerateFolio = () => {
    const randomFolio = `FT-${Math.floor(1000 + Math.random() * 9000)}`;
    setQrId(randomFolio);
  };

  const handleCostChange = (newCost: number) => {
    setCost(newCost);
    setManualCostOverride(true);
  };

  const handleResetToAutoCost = () => {
    setManualCostOverride(false);
    const calculated = calculateEquipmentServicePrice({
      applianceType,
      voltage,
      systemType,
      capacity,
      isCommercial: reminderMonths === 3,
    }, technician.pricing);
    setCost(calculated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      alert('Por favor escribe el nombre del cliente');
      return;
    }

    if (!clientPhone.trim() || clientPhone.replace(/\D/g, '').length < 10) {
      alert('Por favor ingresa un número de teléfono de 10 dígitos válido');
      return;
    }

    const today = getRelativeISODate(0);
    const resolvedBrand = brand === 'Otro' && customBrand.trim() ? customBrand.trim() : brand;
    const resolvedLocation = customLocation.trim() ? customLocation.trim() : location;

    const newEquipment: Equipment = {
      id: `eq-${Date.now()}`,
      qrId: qrId.trim().toUpperCase() || `FT-${Date.now().toString().slice(-4)}`,
      clientName: clientName.trim(),
      clientPhone: clientPhone.replace(/\D/g, ''),
      clientColonia: clientColonia.trim() || 'Tampico, Tamps.',
      clientCity,
      applianceType,
      voltage,
      systemType,
      brand: resolvedBrand,
      capacity,
      inverter: systemType === 'Inverter',
      location: resolvedLocation,
      installationDate: today,
      reminderIntervalMonths: reminderMonths,
      lastServiceDate: today,
      suggestedPrice: Number(cost) || 750,
      contactedStatus: 'scheduled',
      servicesHistory: [
        {
          id: `srv-${Date.now()}`,
          date: today,
          type: serviceType,
          technicianName: technician.name,
          cost: Number(cost) || 750,
          technicalNotes: technicalNotes.trim() || `${applianceType} ${voltage} ${systemType} revisado en FrescoTrack.`,
          pressurePSI,
          refrigerantType: refrigerant,
          warrantyDays: 30,
        }
      ],
      notes: technicalNotes.trim(),
    };

    onAddEquipment(newEquipment);
    setSavedEquipment(newEquipment);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#0284c7', '#38bdf8', '#25D366', '#f59e0b'],
    });
  };

  const handleCloseAll = () => {
    setSavedEquipment(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* SUCCESS SCREEN */}
        {savedEquipment ? (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                ¡Equipo Registrado con Éxito!
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                Folio: {savedEquipment.qrId}
              </h3>
              <p className="text-sm text-slate-600 mt-1 font-semibold">
                {savedEquipment.clientName} · {savedEquipment.applianceType} {savedEquipment.brand} {savedEquipment.capacity} ({savedEquipment.voltage})
              </p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-sky-700 font-bold mt-1">
                <span>Tarifa Cobrada: ${savedEquipment.suggestedPrice} MXN</span>
              </div>
            </div>

            {/* Sticker Preview Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-sky-300 max-w-xs mx-auto text-center space-y-2">
              <div className="text-[10px] font-black uppercase text-sky-800 tracking-wider">
                Sticker Físico para el {savedEquipment.applianceType}
              </div>
              <div className="bg-white p-3 rounded-xl shadow-xs inline-block">
                <QRCodeSVG
                  value={`${window.location.origin}/equipo/${savedEquipment.qrId}`}
                  size={120}
                  level="M"
                />
              </div>
              <div className="font-mono font-black text-xs text-slate-800">
                FOLIO: {savedEquipment.qrId}
              </div>
              <p className="text-[10px] text-slate-500">
                Pega este sticker en la carcasa visible. El cliente lo escaneará para soporte y garantía.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <a
                href={createWhatsAppUrl(
                  savedEquipment.clientPhone,
                  `¡Hola ${savedEquipment.clientName}! 👋 Te saluda ${technician.name} de ${technician.businessName}. Acabo de dejar listo tu ${savedEquipment.applianceType} ${savedEquipment.brand} ${savedEquipment.capacity} (${savedEquipment.voltage}) en tu ${savedEquipment.location}. Le coloqué su etiqueta QR (Folio: ${savedEquipment.qrId}) con garantía y bitácora digital. En ${savedEquipment.reminderIntervalMonths} meses mi sistema te recordará su servicio preventivo para que siga enfriando con todo. ¡Cualquier duda o detalle quedo a tus órdenes!`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Mandar WhatsApp de Garantía al Cliente</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    handleCloseAll();
                    onViewPublicQR(savedEquipment);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-sky-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver Carnet del Cliente</span>
                </button>

                <button
                  onClick={handleCloseAll}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Listo, Volver al Panel</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM (<45 SECONDS) */
          <>
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-sky-700 to-sky-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  Registrar Equipo / Clima y Servicio
                </h3>
                <p className="text-xs text-sky-100">
                  Calculador multidimensional automático de tarifas por aparato, voltaje y tonelaje
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* 1. Folio QR ID */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Código / Folio del Sticker QR
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={qrId}
                      onChange={(e) => setQrId(e.target.value.toUpperCase())}
                      placeholder="FT-0042"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 uppercase focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateFolio}
                    className="px-3 py-2 bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold rounded-xl whitespace-nowrap transition-colors"
                  >
                    🎲 Autogenerar
                  </button>
                </div>
              </div>

              {/* 2. Customer Information */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Datos del Cliente
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nombre del Cliente (ej. Ing. Garza)"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Teléfono (10 dígitos)"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={clientColonia}
                    onChange={(e) => setClientColonia(e.target.value)}
                    placeholder="Colonia y Ciudad (ej. Col. Petrolera, Tampico)"
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {COLONIA_PRESETS.slice(0, 4).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setClientColonia(col)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                    >
                      + {col.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. MULTIDIMENSIONAL APPLIANCE SPECS (Tipo, Voltaje, Inverter, Tonelaje) */}
              <div className="space-y-3 pt-2 border-t border-slate-200 bg-sky-50/50 p-3.5 rounded-2xl border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-sky-600" />
                    3. Especificaciones del Aparato (Tarifador)
                  </label>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Autocálculo activo
                  </span>
                </div>

                {/* Appliance Type: Minisplit vs Clima de Ventana */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Tipo de Aparato:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {APPLIANCE_TYPES.map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setApplianceType(app)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          applianceType === app
                            ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>{app === 'Minisplit' ? '❄️ Minisplit (2 unidades)' : '🪟 Clima de Ventana'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voltage & System (Normal vs Inverter) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Voltage */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">Voltaje Eléctrico:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {VOLTAGE_TYPES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVoltage(v)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                            voltage === v
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          ⚡ {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* System (Inverter vs Normal) */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">Sistema:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SYSTEM_TYPES.map((sys) => (
                        <button
                          key={sys}
                          type="button"
                          onClick={() => setSystemType(sys)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                            systemType === sys
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {sys === 'Inverter' ? <Zap className="w-3 h-3" /> : null}
                          <span>{sys === 'Inverter' ? 'Inverter' : 'Normal / On-Off'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Capacity (Tonelaje: 0.5 a 3 Ton) */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Capacidad (Tonelaje):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                    {CAPACITIES.map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setCapacity(cap)}
                        className={`py-2 px-1 rounded-lg text-xs font-black transition-all text-center ${
                          capacity === cap
                            ? 'bg-sky-700 text-white shadow-xs scale-102'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand & Location */}
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-700">Marca del Clima:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {COMMON_BRANDS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBrand(b)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          brand === b
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-700">Ubicación en el Inmueble:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setLocation(loc);
                          setCustomLocation('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          location === loc && !customLocation
                            ? 'bg-slate-900 text-white'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Service Done & Tarifa Calculada */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Servicio y Tarifa Sugerida
                </label>

                {/* Service Type */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['Mantenimiento Preventivo', 'Instalación Nueva', 'Carga de Gas', 'Reparación de Falla'] as ServiceType[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setServiceType(st)}
                      className={`p-2 rounded-xl text-xs font-bold text-left transition-all ${
                        serviceType === st
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Cost with Dynamic Auto-Calculation Box */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-900 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                      Tarifa Cobrada (MXN):
                    </label>
                    {manualCostOverride ? (
                      <button
                        type="button"
                        onClick={handleResetToAutoCost}
                        className="text-[10px] font-bold text-emerald-700 underline hover:text-emerald-900"
                      >
                        Restaurar tarifa sugerida
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Sugerencia inteligente
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <DollarSign className="w-5 h-5 text-emerald-700 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      value={cost}
                      onChange={(e) => handleCostChange(Number(e.target.value))}
                      step="50"
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-emerald-300 text-lg font-black text-slate-900 shadow-inner"
                    />
                  </div>

                  <p className="text-[11px] text-emerald-800 font-medium">
                    {applianceType} · {voltage} · {systemType} · {capacity}
                  </p>
                </div>

                {/* Cycle Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Ciclo para Próximo Recordatorio:
                  </label>
                  <select
                    value={reminderMonths}
                    onChange={(e) => setReminderMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  >
                    <option value={6}>Cada 6 meses (Residencial Normal)</option>
                    <option value={4}>Cada 4 meses (Uso continuo / oficinas)</option>
                    <option value={3}>Cada 3 meses (Comercial / Restaurante)</option>
                    <option value={12}>Cada 12 meses (Uso esporádico)</option>
                  </select>
                </div>

                {/* Technical Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Notas Técnicas Rápidas:
                  </label>
                  <input
                    type="text"
                    value={technicalNotes}
                    onChange={(e) => setTechnicalNotes(e.target.value)}
                    placeholder="Ej. Lavado con hidrolavadora, presión 115 PSI, capacitor OK"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-black text-base shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Guardar Equipo y Generar Sticker QR</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
