import React, { useState } from 'react';
import { 
  Plus, 
  Layers, 
  Globe, 
  ExternalLink, 
  Check, 
  Copy, 
  Upload, 
  Sparkles, 
  Building, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  Share2,
  Terminal,
  ShieldCheck,
  Server
} from 'lucide-react';
import type { BusinessTenant, TechnicianProfile, PricingMatrix } from '../types';
import { DEFAULT_PRICING_MATRIX } from '../utils/pricing';
import { formatDisplayPhone, DEFAULT_QUOTE_WHATSAPP_TEMPLATE } from '../utils/whatsapp';
import { compressImageAsync } from '../utils/asyncTasks';
import { getTenantQRPrefix } from '../utils/qrPrefix';
import confetti from 'canvas-confetti';

interface MicroAppStudioProps {
  tenants: BusinessTenant[];
  currentTechnician: TechnicianProfile;
  onSelectTenant: (tenant: BusinessTenant) => void;
  onSaveTenant: (tenant: BusinessTenant) => void;
  onDeleteTenant: (tenantId: string) => void;
  onPreviewPublicWebsite?: (tenant: BusinessTenant) => void;
  isMasterAdmin?: boolean;
}

export const MicroAppStudio: React.FC<MicroAppStudioProps> = ({
  tenants,
  currentTechnician,
  onSelectTenant,
  onSaveTenant,
  onDeleteTenant,
  onPreviewPublicWebsite,
  isMasterAdmin = false,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // New Tenant Form State
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Tampico, Cd. Madero y Altamira');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#0284c7');
  const [qrPrefix, setQrPrefix] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [baseMinisplit, setBaseMinisplit] = useState(700);
  const [baseVentana, setBaseVentana] = useState(550);
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);

  // Auto-slugify and auto-prefix when businessName changes
  const handleBusinessNameChange = (val: string) => {
    setBusinessName(val);
    const generated = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
    setCustomDomain(`frescotrack.korensmx.com/?negocio=${generated || 'app'}`);

    // Auto-compute prefix (e.g. Climas Korens -> CK)
    const words = val.trim().split(/\s+/).filter(w => w.length > 1);
    if (words.length >= 2) {
      setQrPrefix((words[0][0] + words[1][0]).toUpperCase());
    } else if (val.trim()) {
      setQrPrefix(val.trim().slice(0, 3).toUpperCase());
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingLogo(true);
      const compressedDataUrl = await compressImageAsync(file, 400, 400, 0.85);
      setLogoUrl(compressedDataUrl);
    } catch (err) {
      console.warn('Compresión asíncrona falló, recurriendo a FileReader:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingLogo(false);
    }
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim() || !slug.trim() || !phone.trim()) {
      alert('Por favor llena los campos obligatorios del negocio');
      return;
    }

    const cleanPrefix = qrPrefix.trim().toUpperCase() || 'FT';

    const newTenant: BusinessTenant = {
      id: `tenant-${Date.now()}`,
      slug: slug.trim(),
      businessName: businessName.trim(),
      technicianName: technicianName.trim() || 'Técnico Certificado',
      phone: phone.replace(/\D/g, ''),
      city: city.trim(),
      logoUrl,
      brandColor,
      qrPrefix: cleanPrefix,
      customDomain: customDomain.trim() || `frescotrack.korensmx.com/?negocio=${slug.trim()}`,
      landingPage: {
        heroTitle: `Tu Clima Enfriando al 100% con ${businessName.trim()}`,
        heroSubtitle: 'Mantenimiento preventivo profesional con hidrolavadora a presión, revisión de gas refrigerante y carnet digital QR.',
        specialtyBadge: 'Especialistas en Minisplits y Climas de Ventana',
        warrantyText: 'Garantía por escrito en cada servicio',
        workingHours: 'Lunes a Sábado de 8:00 AM a 7:00 PM',
        customWhatsAppText: DEFAULT_QUOTE_WHATSAPP_TEMPLATE,
      },
      pricing: {
        ...DEFAULT_PRICING_MATRIX,
        minisplit_1tn: baseMinisplit,
        minisplit_1tn_inverter: baseMinisplit + 100,
        minisplit_1_5tn: baseMinisplit + 100,
        minisplit_1_5tn_inverter: baseMinisplit + 200,
        minisplit_2tn: baseMinisplit + 250,
        minisplit_2tn_inverter: baseMinisplit + 350,
        minisplit_2_5tn: baseMinisplit + 450,
        minisplit_2_5tn_inverter: baseMinisplit + 550,
        minisplit_3tn: baseMinisplit + 650,
        minisplit_3tn_inverter: baseMinisplit + 800,
        baseVentana,
      },
      createdAt: new Date().toISOString().split('T')[0],
      isActive: false,
    };

    onSaveTenant(newTenant);
    setShowCreateModal(false);

    // Reset fields
    setBusinessName('');
    setSlug('');
    setQrPrefix('');
    setTechnicianName('');
    setPhone('');
    setLogoUrl('');

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#25D366', '#f59e0b'],
    });
  };

  const handleCopyUrl = (tenant: BusinessTenant) => {
    const url = `${window.location.origin}/?negocio=${tenant.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(tenant.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Estudio de Micro-Apps Personalizadas
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Multi-Tenant B2B
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Crea, personaliza y despliega micro-apps independientes para cada negocio o técnico de climatización
              </p>
            </div>
          </div>

          {isMasterAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="py-3 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Crear Nueva Micro-App</span>
            </button>
          )}
        </div>

        {/* Informative Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <strong className="block text-slate-800">Dominio Personalizado</strong>
              <span className="text-[11px] text-slate-500">Publicable en Vercel y Dokploy</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <strong className="block text-slate-800">Marca Blanca Total</strong>
              <span className="text-[11px] text-slate-500">Logo, colores y WhatsApp propio</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <Server className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <strong className="block text-slate-800">Multi-Negocio Activo</strong>
              <span className="text-[11px] text-slate-500">{tenants.length} negocios configurados</span>
            </div>
          </div>
        </div>
      </div>

      {/* TENANTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((t) => {
          const isCurrentlyActive = currentTechnician.businessName === t.businessName;
          const previewUrl = `${window.location.origin}/?negocio=${t.slug}`;

          return (
            <div
              key={t.id}
              className={`bg-white rounded-3xl p-5 border transition-all duration-200 space-y-4 shadow-sm hover:shadow-md ${
                isCurrentlyActive
                  ? 'border-sky-500 ring-2 ring-sky-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header with Logo & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt={t.businessName} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-xl">❄️</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-1">
                      {t.businessName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {t.technicianName}
                    </p>
                  </div>
                </div>

                {isCurrentlyActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Activa
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 bg-slate-100">
                    Guardada
                  </span>
                )}
              </div>

              {/* Specs Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">WhatsApp:</span>
                  <span className="font-bold text-slate-800">{formatDisplayPhone(t.phone)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Prefijo QR:</span>
                  <span className="font-mono font-black text-indigo-700 text-xs">
                    {t.qrPrefix || getTenantQRPrefix(t)}-XXXX
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">URL Directa:</span>
                  <span className="font-mono font-bold text-sky-700 text-[11px] truncate max-w-[170px]" title={`https://frescotrack.korensmx.com/?negocio=${t.slug}`}>
                    /?negocio={t.slug}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Minisplit 1 Ton:</span>
                  <span className="font-bold text-slate-900">${t.pricing.minisplit_1tn || 650} / ${t.pricing.minisplit_1tn_inverter || 750}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Minisplit 1.5 Ton:</span>
                  <span className="font-bold text-slate-900">${t.pricing.minisplit_1_5tn || 750} / ${t.pricing.minisplit_1_5tn_inverter || 850}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                {/* Switch to this tenant */}
                <button
                  onClick={() => onSelectTenant(t)}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    isCurrentlyActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  {isCurrentlyActive ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Micro-App en Uso Actualmente</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Activar y Gestionar esta Micro-App</span>
                    </>
                  )}
                </button>

                {/* Direct Link & Copy */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyUrl(t)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Copiar URL directa para entregar al cliente o técnico (100% aislada)"
                    >
                      {copiedSlug === t.slug ? (
                        <span className="text-emerald-700 font-bold">¡Enlace Aislado Copiado!</span>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar Enlace para Cliente</span>
                        </>
                      )}
                    </button>

                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-colors"
                      title="Abrir micro-app del cliente en pestaña nueva"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {onPreviewPublicWebsite && (
                      <button
                        onClick={() => onPreviewPublicWebsite(t)}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                        title="Ver Sitio Web Público de este Negocio (Vista de sus clientes)"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isMasterAdmin && tenants.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar la micro-app de ${t.businessName}?`)) {
                            onDeleteTenant(t.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Eliminar micro-app"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Acceso aislado: el cliente no verá otros negocios ni el Estudio</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DEPLOYMENT & VERCEL AUTOMATION GUIDE CARD */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <h3 className="font-black text-base">
              Publicación Automática en Vercel & Dokploy
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/30">
            Wildcard DNS Ready
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Cada micro-app que creas aquí está vinculada a su propio subdominio y slug URL. Puedes acceder a cualquier negocio mediante:
        </p>

        <div className="bg-black/50 p-3 rounded-2xl border border-slate-800 font-mono text-xs space-y-2 text-sky-300">
          <div>
            <span className="text-slate-500">1. Por Subdominio Dinámico en Vercel:</span>
            <div className="text-white font-bold select-all">https://[nombre-negocio].frescotrack.app</div>
          </div>
          <div>
            <span className="text-slate-500">2. Por Parámetro Directo Multi-Tenant:</span>
            <div className="text-white font-bold select-all">https://frescotrack.versel.app/?negocio=[slug]</div>
          </div>
          <div>
            <span className="text-slate-500">3. En Dokploy (panel.korensmx.com):</span>
            <div className="text-white font-bold select-all">https://frescotrack.korensmx.com</div>
          </div>
        </div>
      </div>

      {/* CREATE NEW TENANT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 bg-gradient-to-r from-sky-700 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  Nueva Micro-App para Negocio de Climas
                </h3>
                <p className="text-xs text-sky-100">
                  Configuración inicial del negocio y generación de dominio
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Comercial del Negocio:
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                  required
                  placeholder="Ej. Climas Express Miramar"
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              {/* Slug & Production URL Preview */}
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 space-y-2">
                <label className="block text-[11px] font-bold text-sky-900">
                  Enlace Oficial de la Micro-App:
                </label>
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-sky-700 truncate">
                  <span className="text-slate-500">frescotrack.korensmx.com/?negocio=</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setSlug(clean);
                      setCustomDomain(`frescotrack.korensmx.com/?negocio=${clean}`);
                    }}
                    className="px-2 py-1 bg-white border border-sky-300 rounded-lg text-slate-900 font-mono text-xs w-36"
                  />
                </div>
              </div>

              {/* QR Prefix Input */}
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 space-y-1">
                <label className="block text-[11px] font-bold text-indigo-900">
                  Prefijo Único para Stickers QR (Evita duplicidades):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={qrPrefix}
                    onChange={(e) => setQrPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="ej. CK, RM, DC"
                    maxLength={5}
                    className="w-28 px-3 py-1.5 bg-white border border-indigo-300 rounded-xl font-mono font-black text-xs text-indigo-900 uppercase"
                  />
                  <span className="text-[11px] text-slate-500">
                    Ejemplo: <strong className="font-mono text-indigo-700">{qrPrefix || 'CK'}-0001</strong>
                  </span>
                </div>
              </div>

              {/* Technician Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Técnico Titular:
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    required
                    placeholder="Téc. Miguel Ángel"
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp (10 dígitos):
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="8331234567"
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Logotipo del Negocio:
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {isCompressingLogo ? (
                      <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
                    ) : logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <span className="text-lg">❄️</span>
                    )}
                  </div>
                  <label className="cursor-pointer py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5">
                    {isCompressingLogo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        <span>Comprimiendo...</span>
                      </>
                    ) : (
                      <span>Seleccionar Imagen</span>
                    )}
                    <input type="file" accept="image/*" disabled={isCompressingLogo} onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Pricing Defaults */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tarifa Base Minisplit (MXN):
                  </label>
                  <input
                    type="number"
                    value={baseMinisplit}
                    onChange={(e) => setBaseMinisplit(Number(e.target.value))}
                    step="50"
                    className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tarifa Clima Ventana (MXN):
                  </label>
                  <input
                    type="number"
                    value={baseVentana}
                    onChange={(e) => setBaseVentana(Number(e.target.value))}
                    step="50"
                    className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Crear Micro-App y Generar Dominio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
