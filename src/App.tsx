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
  resetToSeedData,
  renewEquipmentService
} from './utils/storage';
import { getEquipmentMetaIndex, invalidateEquipmentIndex } from './utils/indexing';
import { Wrench, Printer, QrCode, Settings, Plus, Layers, Smartphone } from 'lucide-react';

export function App() {
  // State
  const [equipments, setEquipments] = useState<Equipment[]>(() => loadStoredEquipments());
  const [technician, setTechnician] = useState<TechnicianProfile>(() => loadStoredTechnician());
  const [tenants, setTenants] = useState<BusinessTenant[]>(() => loadStoredTenants());
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppIntegrationSettings>(() => loadStoredWhatsAppSettings());
  
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

  useEffect(() => {
    saveStoredWhatsAppSettings(whatsAppSettings);
  }, [whatsAppSettings]);

  // Support direct QR URL routing: e.g. /equipo/FT-0041 or ?folio=FT-0041
  useEffect(() => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const folioFromQuery = urlParams.get('folio') || urlParams.get('qr');
    const negocioSlug = urlParams.get('negocio') || urlParams.get('b');
    
    // Check if a specific business tenant is requested via URL: ?negocio=refrimadero-express
    if (negocioSlug) {
      const matchTenant = tenants.find((t) => t.slug.toLowerCase() === negocioSlug.toLowerCase());
      if (matchTenant) {
        setTechnician({
          name: matchTenant.technicianName,
          businessName: matchTenant.businessName,
          phone: matchTenant.phone,
          city: matchTenant.city,
          logoUrl: matchTenant.logoUrl,
          brandColor: matchTenant.brandColor,
          pricing: matchTenant.pricing,
          customDomain: matchTenant.customDomain,
          subdomain: matchTenant.slug,
        });
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
  }, [equipments, tenants]);

  // Overdue count for notifications in O(1) from meta index
  const overdueCount = getEquipmentMetaIndex(equipments).metrics.overdueCount;

  // Handlers
  const handleAddEquipment = (newEquipment: Equipment) => {
    invalidateEquipmentIndex();
    const updated = [newEquipment, ...equipments];
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
  };

  const handleSaveTechnician = (updated: TechnicianProfile) => {
    setTechnician(updated);
    // Also update current tenant if matches
    setTenants((prev) => 
      prev.map((t) => 
        t.businessName === updated.businessName 
          ? {
              ...t,
              businessName: updated.businessName,
              technicianName: updated.name,
              phone: updated.phone,
              city: updated.city,
              logoUrl: updated.logoUrl || '',
              pricing: updated.pricing,
            }
          : t
      )
    );
  };

  const handleSelectTenant = (tenant: BusinessTenant) => {
    setTechnician({
      name: tenant.technicianName,
      businessName: tenant.businessName,
      phone: tenant.phone,
      city: tenant.city,
      logoUrl: tenant.logoUrl,
      brandColor: tenant.brandColor,
      pricing: tenant.pricing,
      customDomain: tenant.customDomain,
      subdomain: tenant.slug,
    });
    setCurrentTab('dashboard');
  };

  const handleSaveNewTenant = (newTenant: BusinessTenant) => {
    setTenants([newTenant, ...tenants]);
  };

  const handleDeleteTenant = (tenantId: string) => {
    setTenants(tenants.filter((t) => t.id !== tenantId));
  };

  // If in Public Website view mode (Customer landing page and quote calculator)
  if (viewMode === 'public') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <PublicBusinessWebsite
          technician={technician}
          equipments={equipments}
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
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-6 space-y-6">
        
        {/* DASHBOARD TAB (Centro de Mando) */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* KPIs Top Bar */}
            <DashboardKPIs
              equipments={equipments}
              onFilterClick={(filter) => {
                if (filter === 'overdue') setActiveFilter('overdue');
                else setActiveFilter('all');
              }}
              isWhatsAppConnected={whatsAppSettings.status === 'connected'}
              onOpenWhatsAppTab={() => setCurrentTab('whatsapp')}
            />

            {/* List of Today's Preventive Maintenance Alerts */}
            <AlertsList
              equipments={equipments}
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
              equipments={equipments}
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
              equipments={equipments}
              onSelectEquipment={(eq) => setPublicViewEquipment(eq)}
            />
          </div>
        )}

        {/* MICRO-APP STUDIO TAB (Multi-Tenant Management) */}
        {currentTab === 'studio' && (
          <div className="animate-in fade-in duration-150">
            <MicroAppStudio
              tenants={tenants}
              currentTechnician={technician}
              onSelectTenant={handleSelectTenant}
              onSaveTenant={handleSaveNewTenant}
              onDeleteTenant={handleDeleteTenant}
              onPreviewPublicWebsite={(tenant) => {
                handleSelectTenant(tenant);
                setViewMode('public');
              }}
            />
          </div>
        )}

        {/* WHATSAPP QR INTEGRATION TAB */}
        {currentTab === 'whatsapp' && (
          <div className="animate-in fade-in duration-150">
            <WhatsAppQRModule
              technician={technician}
              settings={whatsAppSettings}
              onUpdateSettings={setWhatsAppSettings}
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

        <button
          onClick={() => setCurrentTab('studio')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors ${
            currentTab === 'studio' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Estudio</span>
        </button>

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
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span>{technician.businessName}</span>
            <span className="text-slate-400 font-normal">| Desarrollado con FrescoTrack ❄️</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>{technician.city} · Plataforma Multi-Tenant</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">v2.5</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
