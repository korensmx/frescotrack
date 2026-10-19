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
  tenantId?: string; // Foreign key linking equipment to specific BusinessTenant
}

export interface PricingMatrix {
  // Las 10 Tarifas Oficiales de Minisplit
  minisplit_1tn: number;            // Minisplit 1 Ton Normal / Convencional
  minisplit_1tn_inverter: number;   // Minisplit 1 Ton Inverter
  minisplit_1_5tn: number;          // Minisplit 1.5 Ton Normal / Convencional
  minisplit_1_5tn_inverter: number; // Minisplit 1.5 Ton Inverter
  minisplit_2tn: number;            // Minisplit 2 Ton Normal / Convencional
  minisplit_2tn_inverter: number;   // Minisplit 2 Ton Inverter
  minisplit_2_5tn: number;          // Minisplit 2.5 Ton Normal / Convencional
  minisplit_2_5tn_inverter: number; // Minisplit 2.5 Ton Inverter
  minisplit_3tn: number;            // Minisplit 3 Ton Normal / Convencional
  minisplit_3tn_inverter: number;   // Minisplit 3 Ton Inverter

  // Otros equipos y recargos opcionales
  baseVentana?: number;
  commercialExtra?: number;

  // Campos legacy para retrocompatibilidad
  baseMinisplit?: number;
  voltage110vExtra?: number;
  voltage220vExtra?: number;
  inverterExtra?: number;
  normalExtra?: number;
  capacityDeltas?: Record<CapacityType, number>;
}

export interface LandingPageConfig {
  heroTitle?: string;
  heroSubtitle?: string;
  specialtyBadge?: string;
  warrantyText?: string;
  workingHours?: string;
  customWhatsAppText?: string;
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
  qrPrefix?: string; // e.g. CK, RM, CG
  landingPage?: LandingPageConfig;
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
  whatsAppSettings?: WhatsAppIntegrationSettings;
  qrPrefix?: string;
  landingPage?: LandingPageConfig;
}

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'qrcode' | 'connected';

export interface WhatsAppDeviceInfo {
  phone: string;
  deviceName: string;
  platform: 'android' | 'ios' | 'web';
  batteryPercentage: number;
  isCharging: boolean;
  connectedAt: string;
  lastSyncAt: string;
}

export interface WhatsAppIntegrationSettings {
  status: WhatsAppConnectionStatus;
  device?: WhatsAppDeviceInfo;
  autoSendOverdueReminders: boolean;
  autoSendHour: number;
  notifyOnCustomerIssueReport: boolean;
  sendWelcomeOnNewEquipment: boolean;
  serverUrl: string;
  instanceName: string;
  apiKey?: string;
  webhookUrl?: string;
}
