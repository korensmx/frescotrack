import { Equipment, TechnicianProfile, BusinessTenant } from '../types';
import { getRelativeISODate } from '../utils/dates';
import { DEFAULT_PRICING_MATRIX } from '../utils/pricing';

export const DEFAULT_TECHNICIAN: TechnicianProfile = {
  name: 'Téc. Carlos Mendoza',
  businessName: 'Climas del Golfo Tampico',
  phone: '8331567890',
  city: 'Tampico, Cd. Madero y Altamira',
  logoUrl: '',
  brandColor: '#0284c7',
  pricing: DEFAULT_PRICING_MATRIX,
  subdomain: 'climas-del-golfo',
  customDomain: 'frescotrack.versel.app',
};

export const INITIAL_BUSINESS_TENANTS: BusinessTenant[] = [
  {
    id: 'tenant-001',
    slug: 'climas-del-golfo',
    businessName: 'Climas del Golfo Tampico',
    technicianName: 'Téc. Carlos Mendoza',
    phone: '8331567890',
    city: 'Tampico, Cd. Madero y Altamira',
    logoUrl: '',
    brandColor: '#0284c7',
    pricing: DEFAULT_PRICING_MATRIX,
    customDomain: 'frescotrack.versel.app',
    createdAt: '2026-09-15',
    isActive: true,
  },
  {
    id: 'tenant-002',
    slug: 'refrimadero-express',
    businessName: 'RefriMadero Express',
    technicianName: 'Ing. José Luis Pecero',
    phone: '8332908877',
    city: 'Playa Miramar y Cd. Madero',
    logoUrl: '',
    brandColor: '#059669', // Emerald
    pricing: {
      ...DEFAULT_PRICING_MATRIX,
      baseMinisplit: 750,
      salitreExtra: 200,
    },
    customDomain: 'refrimadero.versel.app',
    createdAt: '2026-10-01',
    isActive: false,
  },
  {
    id: 'tenant-003',
    slug: 'doctor-clima-altamira',
    businessName: 'Doctor Clima Altamira',
    technicianName: 'Téc. Antonio Balderas',
    phone: '8333145522',
    city: 'Altamira Industrial y Puerto',
    logoUrl: '',
    brandColor: '#ea580c', // Orange
    pricing: {
      ...DEFAULT_PRICING_MATRIX,
      baseMinisplit: 800,
      commercialExtra: 350,
    },
    customDomain: 'doctorclima.versel.app',
    createdAt: '2026-10-10',
    isActive: false,
  }
];

export const INITIAL_EQUIPMENT_LIST: Equipment[] = [
  {
    id: 'eq-001',
    qrId: 'FT-0041',
    clientName: 'Ing. Roberto Garza',
    clientPhone: '8331892044',
    clientColonia: 'Col. Lomas de Rosales, Tampico',
    clientCity: 'Tampico',
    applianceType: 'Minisplit',
    voltage: '220V',
    systemType: 'Inverter',
    brand: 'Mirage',
    capacity: '1.5 Ton',
    inverter: true,
    location: 'Recámara Principal',
    installationDate: getRelativeISODate(-550),
    reminderIntervalMonths: 6,
    // Overdue by 4 days
    lastServiceDate: getRelativeISODate(-186),
    suggestedPrice: 850, // Minisplit (700) + 220V (50) + Inverter (100) + 1.5 Tn (50) - rounded = 850
    contactedStatus: 'pending',
    servicesHistory: [
      {
        id: 'srv-001',
        date: getRelativeISODate(-186),
        type: 'Mantenimiento Preventivo',
        technicianName: 'Téc. Carlos Mendoza',
        cost: 850,
        technicalNotes: 'Limpieza profunda de turbina con hidrolavadora, revisión de capacitor y desinfección antibacteriana de evaporador.',
        pressurePSI: '118 PSI',
        refrigerantType: 'R410A',
        warrantyDays: 30,
      }
    ],
    notes: 'Condensadora en 2do piso accesible por balcón.'
  },
  {
    id: 'eq-002',
    qrId: 'FT-0028',
    clientName: 'Dra. Patricia Gómez',
    clientPhone: '8332159081',
    clientColonia: 'Consultorio Médica Salve / Playa Miramar, Cd. Madero',
    clientCity: 'Cd. Madero',
    applianceType: 'Minisplit',
    voltage: '220V',
    systemType: 'Inverter',
    brand: 'Carrier',
    capacity: '2 Ton',
    inverter: true,
    location: 'Recepción y Espera',
    installationDate: getRelativeISODate(-300),
    reminderIntervalMonths: 4, // Salitre
    lastServiceDate: getRelativeISODate(-123),
    suggestedPrice: 1100, // Minisplit + 220V + Inverter + 2 Tn + Salitre
    contactedStatus: 'pending',
    servicesHistory: [
      {
        id: 'srv-002',
        date: getRelativeISODate(-123),
        type: 'Mantenimiento Preventivo',
        technicianName: 'Téc. Carlos Mendoza',
        cost: 1100,
        technicalNotes: 'Zona de alta corrosión por brisa marina de Miramar. Se aplicó protector dieléctrico anticorrosivo Blue Fin en serpentín.',
        pressurePSI: '115 PSI',
        refrigerantType: 'R410A',
        warrantyDays: 30,
      }
    ],
    notes: 'Importante: equipo muy expuesto al salitre.'
  },
  {
    id: 'eq-003',
    qrId: 'FT-0067',
    clientName: 'Restaurante "El Marisco Feliz"',
    clientPhone: '8333457812',
    clientColonia: 'Zona Centro, Tampico',
    clientCity: 'Tampico',
    applianceType: 'Minisplit',
    voltage: '220V',
    systemType: 'Convencional / Normal',
    brand: 'York',
    capacity: '3 Ton',
    inverter: false,
    location: 'Comedor Principal',
    installationDate: getRelativeISODate(-400),
    reminderIntervalMonths: 3, // Comercial
    lastServiceDate: getRelativeISODate(-87),
    suggestedPrice: 1450, // 3 Ton + Comercial
    contactedStatus: 'pending',
    servicesHistory: [
      {
        id: 'srv-003',
        date: getRelativeISODate(-87),
        type: 'Mantenimiento Preventivo',
        technicianName: 'Téc. Carlos Mendoza',
        cost: 1450,
        technicalNotes: 'Lavado con espuma desengrasante biodegradable grado alimenticio. Filtros limpios al 100%.',
        pressurePSI: '65 PSI',
        refrigerantType: 'R22',
        warrantyDays: 30,
      }
    ],
    notes: 'Servicios solo lunes de mañana antes de abrir.'
  },
  {
    id: 'eq-004',
    qrId: 'FT-0092',
    clientName: 'Lic. Mariana Torres',
    clientPhone: '8335012378',
    clientColonia: 'Fracc. Lagunas de Miralta, Altamira',
    clientCity: 'Altamira',
    applianceType: 'Minisplit',
    voltage: '110V',
    systemType: 'Inverter',
    brand: 'LG',
    capacity: '1 Ton',
    inverter: true,
    location: 'Estudio / Home Office',
    installationDate: getRelativeISODate(-20),
    reminderIntervalMonths: 6,
    lastServiceDate: getRelativeISODate(-20),
    suggestedPrice: 800, // Minisplit (700) + 110V (0) + Inverter (100) + 1 Ton (0)
    contactedStatus: 'scheduled',
    servicesHistory: [
      {
        id: 'srv-004',
        date: getRelativeISODate(-20),
        type: 'Instalación Nueva',
        technicianName: 'Téc. Carlos Mendoza',
        cost: 1950,
        technicalNotes: 'Instalación LG Dual Inverter 110V. Cable blindado y vacío a 320 micrones.',
        pressurePSI: '122 PSI',
        refrigerantType: 'R410A',
        warrantyDays: 90,
      }
    ],
    notes: 'Cliente muy puntual.'
  },
  {
    id: 'eq-005',
    qrId: 'FT-0019',
    clientName: 'Arq. Fernando Villarreal',
    clientPhone: '8332904511',
    clientColonia: 'Col. Petrolera, Tampico',
    clientCity: 'Tampico',
    applianceType: 'Minisplit',
    voltage: '220V',
    systemType: 'Inverter',
    brand: 'Trane',
    capacity: '2 Ton',
    inverter: true,
    location: 'Sala / Comedor',
    installationDate: getRelativeISODate(-600),
    reminderIntervalMonths: 6,
    lastServiceDate: getRelativeISODate(-194),
    suggestedPrice: 1000,
    contactedStatus: 'contacted',
    servicesHistory: [
      {
        id: 'srv-005',
        date: getRelativeISODate(-194),
        type: 'Mantenimiento Preventivo',
        technicianName: 'Téc. Carlos Mendoza',
        cost: 1000,
        technicalNotes: 'Se destapó manguera de desagüe. Presión en 115 PSI.',
        pressurePSI: '115 PSI',
        refrigerantType: 'R410A',
        warrantyDays: 30,
      }
    ],
    notes: 'Condensadora en azotea accesible por escalera marina.'
  },
  {
    id: 'eq-006',
    qrId: 'FT-0012',
    clientName: 'Don Aurelio Méndez',
    clientPhone: '8331776522',
    clientColonia: 'Col. Cascajal, Tampico',
    clientCity: 'Tampico',
    applianceType: 'Clima de Ventana',
    voltage: '110V',
    systemType: 'Convencional / Normal',
    brand: 'Midea',
    capacity: '0.75 Ton',
    inverter: false,
    location: 'Recámara Niños',
    installationDate: getRelativeISODate(-180),
    reminderIntervalMonths: 6,
    lastServiceDate: getRelativeISODate(-184),
    suggestedPrice: 500, // Ventana (550) + 110V (0) + Normal (0) - 50 (0.75 Ton) = 500 MXN
    contactedStatus: 'pending',
    servicesHistory: [
      {
        id: 'srv-006',
        date: getRelativeISODate(-184),
        type: 'Mantenimiento Preventivo',
        technicianName: 'Téc. Carlos Mendoza',
        cost: 500,
        technicalNotes: 'Se desmontó clima de ventana, lavado de charola, desincrustante en serpentines y lubricación de buje de motor.',
        pressurePSI: '62 PSI',
        refrigerantType: 'R22',
        warrantyDays: 30,
      }
    ],
    notes: 'Clima de ventana empotrado en muro.'
  }
];
