export type ApplianceType = 'Minisplit' | 'Clima de Ventana' | 'Piso Techo' | 'Cassette';
export type VoltageType = '110V' | '220V';
export type SystemType = 'Inverter' | 'Convencional / Normal';
export type CapacityType = 
  | '0.5 Ton' 
  | '0.75 Ton' 
  | '1 Ton' 
  | '1.5 Ton' 
  | '2 Ton' 
  | '2.5 Ton' 
  | '3 Ton';

export type ServiceType = 
  | 'Mantenimiento Preventivo'
  | 'Instalación Nueva'
  | 'Carga de Gas'
  | 'Reparación de Falla'
  | 'Diagnóstico Técnico';

export type ContactStatus = 'pending' | 'contacted' | 'scheduled';
export type EquipmentStatus = 'overdue' | 'upcoming' | 'ok';

export interface ServiceRecord {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  type: ServiceType;
  technicianName: string;
  cost: number;
  technicalNotes: string;
  pressurePSI?: string;
  refrigerantType?: string;
  warrantyDays: number;
}

export interface Equipment {
  id: string;
  qrId: string; // e.g. FT-0042
  clientName: string;
  clientPhone: string; // 10 digits
  clientColonia: string; // e.g. Col. Lomas de Rosales, Tampico
  clientCity: string;
  applianceType: ApplianceType; // Minisplit o Clima de Ventana
  voltage: VoltageType; // 110V o 220V
  systemType: SystemType; // Inverter o Normal
  brand: string; // Mirage, Carrier, York, Trane, LG, Midea, etc.
  capacity: CapacityType; // 0.5, 0.75, 1, 1.5, 2, 2.5, 3 Ton
  inverter: boolean;
  location: string; // Recámara Principal, Sala/Comedor, etc.
  installationDate: string; // ISO date
  reminderIntervalMonths: number; // 6 (residencial), 4, 3 (comercial)
  lastServiceDate: string; // ISO date
  suggestedPrice: number;
  contactedStatus: ContactStatus;
  contactedDate?: string;
  servicesHistory: ServiceRecord[];
  notes?: string;
}

export interface PricingMatrix {
  // Base prices by appliance type
  baseMinisplit: number; // e.g. 700
  baseVentana: number;   // e.g. 550
  
  // Extra surcharge by voltage
  voltage110vExtra: number; // e.g. 0
  voltage220vExtra: number; // e.g. 50

  // Extra surcharge by system type
  inverterExtra: number; // e.g. 100 (cuidados de tarjeta electrónica)
  normalExtra: number;   // e.g. 0

  // Multiplier or delta by capacity (tonelaje)
  capacityDeltas: Record<CapacityType, number>;

  // Environmental extras
  commercialExtra: number; // e.g. 300
}

export interface TechnicianProfile {
  name: string;
  businessName: string;
  phone: string; // 10 digits
  city: string;
  logoUrl?: string; // Base64 or image URL
  brandColor?: string; // hex color e.g. #0284C7
  pricing: PricingMatrix;
  customMessageTemplate?: string;
  subdomain?: string; // e.g. climasdelgolfo
  customDomain?: string; // e.g. climasdelgolfo.com o climasdelgolfo.frescotrack.app
}

export interface BusinessTenant {
  id: string;
  slug: string; // e.g. "climas-del-golfo"
  businessName: string;
  technicianName: string;
  phone: string;
  city: string;
  logoUrl: string;
  brandColor: string;
  pricing: PricingMatrix;
  customDomain?: string;
  createdAt: string;
  isActive?: boolean;
}
