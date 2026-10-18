import { Equipment, TechnicianProfile, ServiceRecord, BusinessTenant } from '../types';
import { INITIAL_EQUIPMENT_LIST, DEFAULT_TECHNICIAN, INITIAL_BUSINESS_TENANTS } from '../data/seedData';
import { getRelativeISODate } from './dates';

const STORAGE_EQUIPMENT_KEY = 'frescotrack_equipments_v2';
const STORAGE_TECHNICIAN_KEY = 'frescotrack_technician_v2';
const STORAGE_TENANTS_KEY = 'frescotrack_tenants_v2';

export function loadStoredEquipments(): Equipment[] {
  try {
    const data = localStorage.getItem(STORAGE_EQUIPMENT_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
