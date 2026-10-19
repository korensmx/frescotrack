import { Equipment, TechnicianProfile, ServiceRecord, BusinessTenant, WhatsAppIntegrationSettings } from '../types';
import { INITIAL_EQUIPMENT_LIST, DEFAULT_TECHNICIAN, INITIAL_BUSINESS_TENANTS } from '../data/seedData';
import { getRelativeISODate } from './dates';

const STORAGE_EQUIPMENT_KEY = 'frescotrack_equipments_v2';
const STORAGE_TECHNICIAN_KEY = 'frescotrack_technician_v2';
const STORAGE_TENANTS_KEY = 'frescotrack_tenants_v2';
const STORAGE_WHATSAPP_KEY = 'frescotrack_whatsapp_v1';

export function loadStoredEquipments(): Equipment[] {
  try {
    const data = localStorage.getItem(STORAGE_EQUIPMENT_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let modified = false;
        const normalized = parsed.map((eq: Equipment) => {
          if (!eq.tenantId) {
            modified = true;
            return { ...eq, tenantId: 'tenant-001' };
          }
          return eq;
        });

        const hasTenant4 = normalized.some((eq: Equipment) => eq.tenantId === 'tenant-004');
        if (!hasTenant4) {
          const missing = INITIAL_EQUIPMENT_LIST.filter(eq => eq.tenantId === 'tenant-002' || eq.tenantId === 'tenant-003' || eq.tenantId === 'tenant-004');
          for (const m of missing) {
            if (!normalized.some(e => e.id === m.id)) {
              normalized.push(m);
              modified = true;
            }
          }
        }

        if (modified) {
          saveStoredEquipments(normalized);
        }
        return normalized;
      }
    }
  } catch (e) {
    console.error('Error loading equipment from localStorage', e);
  }
  return INITIAL_EQUIPMENT_LIST;
}

export function saveStoredEquipments(equipments: Equipment[]): void {
  try {
    localStorage.setItem(STORAGE_EQUIPMENT_KEY, JSON.stringify(equipments));
  } catch (e) {
    console.error('Error saving equipment to localStorage', e);
  }
}

export function loadStoredTechnician(): TechnicianProfile {
  try {
    const data = localStorage.getItem(STORAGE_TECHNICIAN_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.pricing) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading technician from localStorage', e);
  }
  return DEFAULT_TECHNICIAN;
}

export function saveStoredTechnician(technician: TechnicianProfile): void {
  try {
    localStorage.setItem(STORAGE_TECHNICIAN_KEY, JSON.stringify(technician));
  } catch (e) {
    console.error('Error saving technician to localStorage', e);
  }
}

export function loadStoredTenants(): BusinessTenant[] {
  try {
    const data = localStorage.getItem(STORAGE_TENANTS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let modified = false;
        for (const initial of INITIAL_BUSINESS_TENANTS) {
          const exists = parsed.some((t: BusinessTenant) => t.slug === initial.slug || t.id === initial.id);
          if (!exists) {
            parsed.push(initial);
            modified = true;
          }
        }
        if (modified) {
          saveStoredTenants(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading tenants from localStorage', e);
  }
  return INITIAL_BUSINESS_TENANTS;
}

export function saveStoredTenants(tenants: BusinessTenant[]): void {
  try {
    localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(tenants));
  } catch (e) {
    console.error('Error saving tenants to localStorage', e);
  }
}

export function resetToSeedData(): { 
  equipments: Equipment[]; 
  technician: TechnicianProfile;
  tenants: BusinessTenant[];
} {
  localStorage.removeItem(STORAGE_EQUIPMENT_KEY);
  localStorage.removeItem(STORAGE_TECHNICIAN_KEY);
  localStorage.removeItem(STORAGE_TENANTS_KEY);
  return {
    equipments: INITIAL_EQUIPMENT_LIST,
    technician: DEFAULT_TECHNICIAN,
    tenants: INITIAL_BUSINESS_TENANTS,
  };
}

export function renewEquipmentService(
  equipments: Equipment[],
  equipmentId: string,
  newService: Partial<ServiceRecord> & { cost: number; technicianName: string }
): Equipment[] {
  const today = getRelativeISODate(0);
  return equipments.map((eq) => {
    if (eq.id === equipmentId) {
      const completeRecord: ServiceRecord = {
        id: `srv-${Date.now()}`,
        date: today,
        type: newService.type || 'Mantenimiento Preventivo',
        technicianName: newService.technicianName,
        cost: newService.cost,
        technicalNotes: newService.technicalNotes || 'Servicio preventivo completado con éxito.',
        pressurePSI: newService.pressurePSI || '118 PSI',
        refrigerantType: newService.refrigerantType || 'R410A',
        warrantyDays: newService.warrantyDays || 30,
      };

      return {
        ...eq,
        lastServiceDate: today,
        contactedStatus: 'scheduled',
        contactedDate: today,
        servicesHistory: [completeRecord, ...eq.servicesHistory],
      };
    }
    return eq;
  });
}

const STORAGE_MASTER_ADMIN_KEY = 'frescotrack_master_admin_session';

export function loadStoredMasterAdmin(): boolean {
  try {
    return localStorage.getItem(STORAGE_MASTER_ADMIN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveStoredMasterAdmin(isAdmin: boolean): void {
  try {
    localStorage.setItem(STORAGE_MASTER_ADMIN_KEY, isAdmin ? 'true' : 'false');
  } catch {}
}

export function getTenantDefaultWhatsAppSettings(tenantSlug?: string): WhatsAppIntegrationSettings {
  const cleanSlug = tenantSlug ? tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() : 'climas-del-golfo';
  return {
    status: 'disconnected',
    autoSendOverdueReminders: true,
    autoSendHour: 9,
    notifyOnCustomerIssueReport: true,
    sendWelcomeOnNewEquipment: true,
    serverUrl: 'https://evolution.korensmx.com',
    instanceName: `frescotrack-${cleanSlug}`,
    apiKey: 'ku8U3L1sKkGOVBr+7xSiNp7Un3hvJOoAVGJAL9ZwGvWT0/Oc2cUGCRR1SOBRhmi+wb+H6oXI24EfJCcyzqr+gQ==',
  };
}

export const DEFAULT_WHATSAPP_SETTINGS = getTenantDefaultWhatsAppSettings('climas-del-golfo');

export function loadStoredWhatsAppSettings(tenantId?: string, tenantSlug?: string): WhatsAppIntegrationSettings {
  const defaults = getTenantDefaultWhatsAppSettings(tenantSlug);
  const key = tenantId ? `frescotrack_whatsapp_${tenantId}` : STORAGE_WHATSAPP_KEY;
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      // Auto-migrate legacy sslip.io or unencrypted http URLs to production evolution.korensmx.com
      if (!parsed.serverUrl || parsed.serverUrl.includes('sslip.io') || parsed.serverUrl.startsWith('http://')) {
        parsed.serverUrl = defaults.serverUrl;
      }
      if (!parsed.apiKey || parsed.apiKey === 'ft_live_korens_833_sec') {
        parsed.apiKey = defaults.apiKey;
      }
      if (!parsed.instanceName || parsed.instanceName === 'frescotrack-climas') {
        parsed.instanceName = defaults.instanceName;
      }
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error('Error loading WhatsApp settings from localStorage', e);
  }
  return defaults;
}

export function saveStoredWhatsAppSettings(settings: WhatsAppIntegrationSettings, tenantId?: string): void {
  const key = tenantId ? `frescotrack_whatsapp_${tenantId}` : STORAGE_WHATSAPP_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving WhatsApp settings to localStorage', e);
  }
}

