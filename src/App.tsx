import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardKPIs } from './components/DashboardKPIs';
import { AlertsList } from './components/AlertsList';
import { RegisterModal } from './components/RegisterModal';
import { PublicEquipmentView } from './components/PublicEquipmentView';
import { QRStickerGenerator } from './components/QRStickerGenerator';
import { QuickServiceModal } from './components/QuickServiceModal';
import { SettingsModal } from './components/SettingsModal';
import { QRScannerModal } from './components/QRScannerModal';
import { MicroAppStudio } from './components/MicroAppStudio';
import { PublicBusinessWebsite } from './components/PublicBusinessWebsite';
import { WhatsAppQRModule } from './components/WhatsAppQRModule';
import type { 
  Equipment, 
  TechnicianProfile, 
  ContactStatus, 
  ServiceType,
  BusinessTenant,
  WhatsAppIntegrationSettings
} from './types';
import { 
  loadStoredEquipments, 
  saveStoredEquipments, 
  loadStoredTechnician, 
  saveStoredTechnician, 
  loadStoredTenants,
  saveStoredTenants,
  loadStoredWhatsAppSettings,
  saveStoredWhatsAppSettings,
  loadStoredMasterAdmin,
  saveStoredMasterAdmin,
  resetToSeedData,
  renewEquipmentService
} from './utils/storage';
import { INITIAL_BUSINESS_TENANTS } from './data/seedData';
import { getEquipmentMetaIndex, invalidateEquipmentIndex } from './utils/indexing';
import { Wrench, Printer, QrCode, Settings, Plus, Layers, Smartphone, Lock } from 'lucide-react';

export function App() {
  // Load tenants list
  const [tenants, setTenants] = useState<BusinessTenant[]>(() => loadStoredTenants());

  // Master Admin State (Evaluated synchronously from URL or localStorage)
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    const masterParam = params.get('master');
    const negocioParam = params.get('negocio') || params.get('b');

    // If client link specifically opened with ?negocio=... and without ?admin=true, force regular tenant mode!
    if (negocioParam && adminParam !== 'true' && adminParam !== 'korens' && masterParam !== 'true') {
      return false;
    }
    if (adminParam === 'true' || adminParam === 'korens' || masterParam === 'true') {
      saveStoredMasterAdmin(true);
      return true;
    }
    return loadStoredMasterAdmin();
  });

  // Active Tenant ID State
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const negocioParam = params.get('negocio') || params.get('b');
    const storedTenants = loadStoredTenants();
    if (negocioParam) {
      const match = storedTenants.find(t => t.slug.toLowerCase() === negocioParam.toLowerCase());
      if (match) return match.id;
    }
    const savedActiveId = localStorage.getItem('frescotrack_active_tenant_id');
    if (savedActiveId && storedTenants.some(t => t.id === savedActiveId)) {
      return savedActiveId;
    }
    return storedTenants[0]?.id || 'tenant-001';
  });

  const activeTenant = tenants.find((t) => t.id === activeTenantId) || tenants[0] || INITIAL_BUSINESS_TENANTS[0];

  // Technician profile synced to active tenant
  const [technician, setTechnician] = useState<TechnicianProfile>(() => ({
    name: activeTenant.technicianName,
    businessName: activeTenant.businessName,
    phone: activeTenant.phone,
    city: activeTenant.city,
    logoUrl: activeTenant.logoUrl,
    brandColor: activeTenant.brandColor,
    pricing: activeTenant.pricing,
    customDomain: activeTenant.customDomain,
    subdomain: activeTenant.slug,
    qrPrefix: activeTenant.qrPrefix,
    landingPage: activeTenant.landingPage,
  }));

  // Equipments across all tenants
  const [equipments, setEquipments] = useState<Equipment[]>(() => loadStoredEquipments());

  // WhatsApp settings loaded specifically for the active tenant
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppIntegrationSettings>(() => {
    return loadStoredWhatsAppSettings(activeTenant.id, activeTenant.slug);
  });
  
  const [viewMode, setViewMode] = useState<'admin' | 'public'>('admin');
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'stickers' | 'scanner' | 'whatsapp' | 'settings' | 'studio'>('dashboard');
  const [activeFilter, setActiveFilter] = useState<'overdue' | 'upcoming' | 'ok' | 'all'>('overdue');

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [publicViewEquipment, setPublicViewEquipment] = useState<Equipment | null>(null);
  const [renewEquipment, setRenewEquipment] = useState<Equipment | null>(null);

  // Sync to localStorage
  useEffect(() => {
    saveStoredEquipments(equipments);
  }, [equipments]);

  useEffect(() => {
    saveStoredTechnician(technician);
  }, [technician]);

  useEffect(() => {
    saveStoredTenants(tenants);
  }, [tenants]);

  // When activeTenantId changes or tenants update, sync technician and WhatsApp settings
  useEffect(() => {
    localStorage.setItem('frescotrack_active_tenant_id', activeTenantId);
    const curr = tenants.find((t) => t.id === activeTenantId) || tenants[0];
    if (curr) {
      setTechnician({
        name: curr.technicianName,
        businessName: curr.businessName,
        phone: curr.phone,
        city: curr.city,
        logoUrl: curr.logoUrl,
        brandColor: curr.brandColor,
        pricing: curr.pricing,
        customDomain: curr.customDomain,
        subdomain: curr.slug,
        qrPrefix: curr.qrPrefix,
        landingPage: curr.landingPage,
      });
      // Load this tenant's WhatsApp session
      const tWhatsApp = loadStoredWhatsAppSettings(curr.id, curr.slug);
      setWhatsAppSettings(tWhatsApp);
    }
  }, [activeTenantId, tenants]);

  // If a technician somehow enters the studio tab without master admin rights, redirect to dashboard
  useEffect(() => {
    if (!isMasterAdmin && currentTab === 'studio') {
      setCurrentTab('dashboard');
    }
  }, [isMasterAdmin, currentTab]);

  // Support direct QR URL routing: e.g. /equipo/FT-0041 or ?folio=FT-0041
  useEffect(() => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const folioFromQuery = urlParams.get('folio') || urlParams.get('qr');
    const negocioSlug = urlParams.get('negocio') || urlParams.get('b');
    
    // Check if a specific business tenant is requested via URL: ?negocio=refrimadero-express
    if (negocioSlug) {
      const matchTenant = tenants.find((t) => t.slug.toLowerCase() === negocioSlug.toLowerCase());
      if (matchTenant && matchTenant.id !== activeTenantId) {
        setActiveTenantId(matchTenant.id);
      }
    }

    const vistaParam = urlParams.get('vista') || urlParams.get('portal') || urlParams.get('cliente');
    if (vistaParam === 'public' || vistaParam === '1' || vistaParam === 'web') {
      setViewMode('public');
    }

    let targetFolio: string | null = null;
    if (folioFromQuery) {
      targetFolio = folioFromQuery.toUpperCase();
    } else if (path.includes('/equipo/')) {
      targetFolio = path.split('/equipo/')[1]?.replace('/', '').toUpperCase();
    }

    if (targetFolio) {
      const index = getEquipmentMetaIndex(equipments);
      const match = index.findByFolio(targetFolio);
      if (match) {
        setPublicViewEquipment(match);
      }
    }
  }, [equipments, tenants, activeTenantId]);

  // STRICT MULTI-TENANT ISOLATION:
  // Only display equipments belonging to the active tenant
  const currentTenantEquipments = equipments.filter(
    (eq) => (eq.tenantId || 'tenant-001') === activeTenant.id
  );

  // Overdue count calculated only for active tenant's equipments
  const overdueCount = getEquipmentMetaIndex(currentTenantEquipments).metrics.overdueCount;

  // Handlers
  const handleAddEquipment = (newEquipment: Equipment) => {
    invalidateEquipmentIndex();
    const isolatedEquipment: Equipment = {
      ...newEquipment,
      tenantId: activeTenant.id,
    };
    const updated = [isolatedEquipment, ...equipments];
    setEquipments(updated);
  };

  const handleUpdateContactStatus = (equipmentId: string, status: ContactStatus) => {
    invalidateEquipmentIndex();
    const updated = equipments.map((eq) => {
      if (eq.id === equipmentId) {
        return {
          ...eq,
          contactedStatus: status,
          contactedDate: new Date().toISOString(),
        };
      }
      return eq;
    });
    setEquipments(updated);
  };

  const handleConfirmRenewService = (
    equipmentId: string,
    serviceData: {
      cost: number;
      type: ServiceType;
      technicalNotes: string;
      pressurePSI: string;
      refrigerantType: string;
      technicianName: string;
    }
  ) => {
    invalidateEquipmentIndex();
    const updated = renewEquipmentService(equipments, equipmentId, serviceData);
    setEquipments(updated);
  };

  const handleResetSeedData = () => {
    invalidateEquipmentIndex();
    const reset = resetToSeedData();
    setEquipments(reset.equipments);
    setTechnician(reset.technician);
    setTenants(reset.tenants);
    setActiveTenantId('tenant-001');
    const firstWhatsApp = loadStoredWhatsAppSettings('tenant-001', 'climas-del-golfo');
    setWhatsAppSettings(firstWhatsApp);
  };

  const handleSaveTechnician = (updated: TechnicianProfile) => {
    setTechnician(updated);
    setTenants((prev) => 
      prev.map((t) => 
        t.id === activeTenant.id
          ? {
              ...t,
              businessName: updated.businessName,
              technicianName: updated.name,
              phone: updated.phone,
              city: updated.city,
              logoUrl: updated.logoUrl || '',
              pricing: updated.pricing,
              qrPrefix: updated.qrPrefix,
              landingPage: updated.landingPage,
            }
          : t
      )
    );
  };

  const handleSelectTenant = (tenant: BusinessTenant) => {
    setActiveTenantId(tenant.id);
    setCurrentTab('dashboard');
  };

  const handleSaveNewTenant = (newTenant: BusinessTenant) => {
    setTenants([newTenant, ...tenants]);
  };

  const handleDeleteTenant = (tenantId: string) => {
    setTenants(tenants.filter((t) => t.id !== tenantId));
  };

  const handleUpdateWhatsAppSettings = (newSettings: WhatsAppIntegrationSettings) => {
    setWhatsAppSettings(newSettings);
    saveStoredWhatsAppSettings(newSettings, activeTenant.id);
  };

  // If in Public Website view mode (Customer landing page and quote calculator)
  if (viewMode === 'public') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <PublicBusinessWebsite
          technician={technician}
          equipments={currentTenantEquipments}
          onOpenEquipmentQR={(eq) => setPublicViewEquipment(eq)}
          onSwitchToAdmin={() => setViewMode('admin')}
        />

        {/* Public Equipment Screen Mockup (What customer sees on QR scan) */}
        {publicViewEquipment && (
          <PublicEquipmentView
            equipment={publicViewEquipment}
            technician={technician}
            onClose={() => setPublicViewEquipment(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16 md:pb-0">
      {/* Top Navigation */}
      <Navbar
        technician={technician}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onViewPublicWebsite={() => setViewMode('public')}
        overdueCount={overdueCount}
        isWhatsAppConnected={whatsAppSettings.status === 'connected'}
        isMasterAdmin={isMasterAdmin}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-6 space-y-6">
        
        {/* DASHBOARD TAB (Centro de Mando) */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* KPIs Top Bar */}
            <DashboardKPIs
              equipments={currentTenantEquipments}
              onFilterClick={(filter) => {
                if (filter === 'overdue') setActiveFilter('overdue');
                else setActiveFilter('all');
              }}
              isWhatsAppConnected={whatsAppSettings.status === 'connected'}
              onOpenWhatsAppTab={() => setCurrentTab('whatsapp')}
            />

            {/* List of Today's Preventive Maintenance Alerts */}
            <AlertsList
              equipments={currentTenantEquipments}
              technician={technician}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onViewPublicQR={(eq) => setPublicViewEquipment(eq)}
              onRenewService={(eq) => setRenewEquipment(eq)}
              onUpdateContactStatus={handleUpdateContactStatus}
              onOpenRegister={() => setIsRegisterOpen(true)}
            />
          </div>
        )}

        {/* STICKERS GENERATOR TAB */}
        {currentTab === 'stickers' && (
          <div className="animate-in fade-in duration-150">
            <QRStickerGenerator
              technician={technician}
              equipments={currentTenantEquipments}
              onOpenPublicQR={(eq) => setPublicViewEquipment(eq)}
            />
          </div>
        )}

        {/* SCANNER TAB */}
        {currentTab === 'scanner' && (
          <div className="animate-in fade-in duration-150">
            <QRScannerModal
              isOpen={true}
              onClose={() => setCurrentTab('dashboard')}
              equipments={currentTenantEquipments}
              onSelectEquipment={(eq) => setPublicViewEquipment(eq)}
            />
          </div>
        )}

        {/* MICRO-APP STUDIO TAB (Master Admin Multi-Tenant Management) */}
        {currentTab === 'studio' && isMasterAdmin && (
          <div className="animate-in fade-in duration-150">
            <MicroAppStudio
              tenants={tenants}
              currentTechnician={technician}
              onSelectTenant={handleSelectTenant}
              onSaveTenant={handleSaveNewTenant}
              onDeleteTenant={handleDeleteTenant}
              isMasterAdmin={isMasterAdmin}
              onPreviewPublicWebsite={(tenant) => {
                handleSelectTenant(tenant);
                setViewMode('public');
              }}
            />
          </div>
        )}

        {/* WHATSAPP QR INTEGRATION TAB (Clean & isolated per micro-app) */}
        {currentTab === 'whatsapp' && (
          <div className="animate-in fade-in duration-150">
            <WhatsAppQRModule
              technician={technician}
              settings={whatsAppSettings}
              onUpdateSettings={handleUpdateWhatsAppSettings}
            />
          </div>
        )}

        {/* SETTINGS TAB */}
        {currentTab === 'settings' && (
          <div className="animate-in fade-in duration-150">
            <SettingsModal
              technician={technician}
              onSaveTechnician={handleSaveTechnician}
              onResetSeedData={handleResetSeedData}
              onViewPublicWebsite={() => setViewMode('public')}
            />
          </div>
        )}
      </main>

      {/* Fast 1-Screen Register Modal (<45s) */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onAddEquipment={handleAddEquipment}
        technician={technician}
        existingEquipments={currentTenantEquipments}
        onViewPublicQR={(eq) => setPublicViewEquipment(eq)}
      />

      {/* Public Equipment Screen Mockup (What customer sees on QR scan) */}
      {publicViewEquipment && (
        <PublicEquipmentView
          equipment={publicViewEquipment}
          technician={technician}
          onClose={() => setPublicViewEquipment(null)}
        />
      )}

      {/* Quick Service Renewal Modal */}
      {renewEquipment && (
        <QuickServiceModal
          equipment={renewEquipment}
          technician={technician}
          isOpen={true}
          onClose={() => setRenewEquipment(null)}
          onConfirmService={handleConfirmRenewService}
        />
      )}

      {/* Floating Action Button for Mobile Quick Add */}
      <div className="md:hidden fixed bottom-18 right-4 z-40 no-print">
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 active:scale-95 text-white shadow-xl shadow-sky-600/40 flex items-center justify-center font-black transition-all border-2 border-white"
          title="Registrar nuevo clima"
        >
          <Plus className="w-7 h-7 stroke-[3]" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar (Mobile-first extreme) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg no-print">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors ${
            currentTab === 'dashboard' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Wrench className="w-4 h-4" />
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black px-1 rounded-full">
                {overdueCount}
              </span>
            )}
          </div>
          <span>Mando</span>
        </button>

        <button
          onClick={() => setCurrentTab('whatsapp')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors ${
            currentTab === 'whatsapp' ? 'text-emerald-600' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Smartphone className="w-4 h-4" />
            {whatsAppSettings.status === 'connected' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <span>WhatsApp</span>
        </button>

        <button
          onClick={() => setCurrentTab('stickers')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors ${
            currentTab === 'stickers' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Stickers</span>
        </button>

        {isMasterAdmin && (
          <button
            onClick={() => setCurrentTab('studio')}
            className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors ${
              currentTab === 'studio' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Estudio</span>
          </button>
        )}

        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors ${
            currentTab === 'settings' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Ajustes</span>
        </button>
      </nav>

      {/* Footer (Hidden on print) */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span>{technician.businessName}</span>
            <span className="text-slate-400 font-normal">| Desarrollado con FrescoTrack ❄️</span>
          </div>

          <div className="flex items-center gap-3">
            {isMasterAdmin ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  👑 Master Admin Activo
                </span>
                <button
                  onClick={() => {
                    setIsMasterAdmin(false);
                    saveStoredMasterAdmin(false);
                    if (currentTab === 'studio') setCurrentTab('dashboard');
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 underline transition-colors"
                >
                  Cerrar Sesión Admin
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const pass = prompt('Ingresa la contraseña de Administrador Maestro de la Plataforma:');
                  if (pass === 'korens2025' || pass === 'admin' || pass === 'fresco2025') {
                    setIsMasterAdmin(true);
                    saveStoredMasterAdmin(true);
                    alert('✅ Acceso concedido: Modo Master Admin activado. Ahora tienes acceso al Estudio y creación de micro-apps.');
                  } else if (pass !== null) {
                    alert('❌ Contraseña incorrecta.');
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                title="Acceso exclusivo para el Administrador de la Plataforma"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Acceso Admin</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span>{technician.city}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">v2.6</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
