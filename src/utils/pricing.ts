import { ApplianceType, VoltageType, SystemType, CapacityType, PricingMatrix } from '../types';
import { pricingCalculationCache, getPricingCacheKey } from './cache';

/**
 * Default 10-rate pricing matrix for Minisplit maintenance in Mexico (Tampico & general HVAC market)
 * 5 capacities x 2 system types (Convencional vs Inverter)
 */
export const DEFAULT_PRICING_MATRIX: PricingMatrix = {
  // Las 10 tarifas oficiales de Minisplit
  minisplit_1tn: 650,
  minisplit_1tn_inverter: 750,
  minisplit_1_5tn: 750,
  minisplit_1_5tn_inverter: 850,
  minisplit_2tn: 900,
  minisplit_2tn_inverter: 1000,
  minisplit_2_5tn: 1100,
  minisplit_2_5tn_inverter: 1200,
  minisplit_3tn: 1300,
  minisplit_3tn_inverter: 1450,

  // Otros tipos
  baseVentana: 600,
  commercialExtra: 0,

  // Legacy fields
  baseMinisplit: 750,
  voltage110vExtra: 0,
  voltage220vExtra: 50,
  inverterExtra: 100,
  normalExtra: 0,
  capacityDeltas: {
    '0.5 Ton': -50,
    '0.75 Ton': -50,
    '1 Ton': 0,
    '1.5 Ton': 50,
    '2 Ton': 150,
    '2.5 Ton': 250,
    '3 Ton': 400,
  },
};

export interface MinisplitRateRow {
  tonnage: '1 Ton' | '1.5 Ton' | '2 Ton' | '2.5 Ton' | '3 Ton';
  label: string;
  btu: string;
  normalKey: keyof PricingMatrix;
  inverterKey: keyof PricingMatrix;
}

export const MINISPLIT_RATE_ROWS: MinisplitRateRow[] = [
  { tonnage: '1 Ton', label: 'Minisplit 1 Ton', btu: '12,000 BTU', normalKey: 'minisplit_1tn', inverterKey: 'minisplit_1tn_inverter' },
  { tonnage: '1.5 Ton', label: 'Minisplit 1.5 Ton', btu: '18,000 BTU', normalKey: 'minisplit_1_5tn', inverterKey: 'minisplit_1_5tn_inverter' },
  { tonnage: '2 Ton', label: 'Minisplit 2 Ton', btu: '24,000 BTU', normalKey: 'minisplit_2tn', inverterKey: 'minisplit_2tn_inverter' },
  { tonnage: '2.5 Ton', label: 'Minisplit 2.5 Ton', btu: '30,000 BTU', normalKey: 'minisplit_2_5tn', inverterKey: 'minisplit_2_5tn_inverter' },
  { tonnage: '3 Ton', label: 'Minisplit 3 Ton', btu: '36,000 BTU', normalKey: 'minisplit_3tn', inverterKey: 'minisplit_3tn_inverter' },
];

/**
 * Normalizes any pricing matrix (including legacy ones from localStorage)
 * ensuring all 10 rates exist as valid numbers.
 */
export function normalizePricingMatrix(raw?: Partial<PricingMatrix> | null): PricingMatrix {
  if (!raw) return { ...DEFAULT_PRICING_MATRIX };

  // If the 10 rates are already populated
  if (
    typeof raw.minisplit_1tn === 'number' &&
    typeof raw.minisplit_1tn_inverter === 'number' &&
    typeof raw.minisplit_1_5tn === 'number' &&
    typeof raw.minisplit_1_5tn_inverter === 'number'
  ) {
    return {
      ...DEFAULT_PRICING_MATRIX,
      ...raw,
      minisplit_1tn: Number(raw.minisplit_1tn) || 650,
      minisplit_1tn_inverter: Number(raw.minisplit_1tn_inverter) || 750,
      minisplit_1_5tn: Number(raw.minisplit_1_5tn) || 750,
      minisplit_1_5tn_inverter: Number(raw.minisplit_1_5tn_inverter) || 850,
      minisplit_2tn: Number(raw.minisplit_2tn) || 900,
      minisplit_2tn_inverter: Number(raw.minisplit_2tn_inverter) || 1000,
      minisplit_2_5tn: Number(raw.minisplit_2_5tn) || 1100,
      minisplit_2_5tn_inverter: Number(raw.minisplit_2_5tn_inverter) || 1200,
      minisplit_3tn: Number(raw.minisplit_3tn) || 1300,
      minisplit_3tn_inverter: Number(raw.minisplit_3tn_inverter) || 1450,
      baseVentana: Number(raw.baseVentana) || 600,
      commercialExtra: Number(raw.commercialExtra) || 0,
    };
  }

  // Legacy fallback: calculate the 10 rates from base + deltas
  const base = Number(raw.baseMinisplit) || 700;
  const inv = Number(raw.inverterExtra) || 100;
  const deltas = (raw.capacityDeltas || {}) as Record<string, number>;

  const d1 = Number(deltas['1 Ton'] ?? 0);
  const d15 = Number(deltas['1.5 Ton'] ?? 50);
  const d2 = Number(deltas['2 Ton'] ?? 150);
  const d25 = Number(deltas['2.5 Ton'] ?? 250);
  const d3 = Number(deltas['3 Ton'] ?? 400);

  return {
    ...DEFAULT_PRICING_MATRIX,
    ...raw,
    minisplit_1tn: base + d1,
    minisplit_1tn_inverter: base + d1 + inv,
    minisplit_1_5tn: base + d15,
    minisplit_1_5tn_inverter: base + d15 + inv,
    minisplit_2tn: base + d2,
    minisplit_2tn_inverter: base + d2 + inv,
    minisplit_2_5tn: base + d25,
    minisplit_2_5tn_inverter: base + d25 + inv,
    minisplit_3tn: base + d3,
    minisplit_3tn_inverter: base + d3 + inv,
    baseVentana: Number(raw.baseVentana) || 600,
    commercialExtra: Number(raw.commercialExtra) || 0,
    baseMinisplit: base,
  };
}

/**
 * Calculates dynamic service price based on the 10 explicit Minisplit rates
 * or window unit base price.
 */
export function calculateEquipmentServicePrice(
  specs: {
    applianceType: ApplianceType;
    voltage?: VoltageType;
    systemType: SystemType;
    capacity: CapacityType;
    isCommercial?: boolean;
  },
  matrix: PricingMatrix = DEFAULT_PRICING_MATRIX
): number {
  const norm = normalizePricingMatrix(matrix);
  const cacheKey = getPricingCacheKey(specs, norm);
  const cached = pricingCalculationCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let finalPrice = 0;

  if (specs.applianceType === 'Clima de Ventana') {
    finalPrice = norm.baseVentana || 600;
  } else {
    // Minisplit: exact lookup from the 10 rates
    const isInverter = specs.systemType === 'Inverter';

    switch (specs.capacity) {
      case '0.5 Ton':
      case '0.75 Ton':
      case '1 Ton':
        finalPrice = isInverter ? norm.minisplit_1tn_inverter : norm.minisplit_1tn;
        break;
      case '1.5 Ton':
        finalPrice = isInverter ? norm.minisplit_1_5tn_inverter : norm.minisplit_1_5tn;
        break;
      case '2 Ton':
        finalPrice = isInverter ? norm.minisplit_2tn_inverter : norm.minisplit_2tn;
        break;
      case '2.5 Ton':
        finalPrice = isInverter ? norm.minisplit_2_5tn_inverter : norm.minisplit_2_5tn;
        break;
      case '3 Ton':
        finalPrice = isInverter ? norm.minisplit_3tn_inverter : norm.minisplit_3tn;
        break;
      default:
        finalPrice = isInverter ? norm.minisplit_1_5tn_inverter : norm.minisplit_1_5tn;
    }
  }

  // Round to nearest 50 for clean Mexican technician billing
  const rounded = Math.round(finalPrice / 50) * 50;
  pricingCalculationCache.set(cacheKey, rounded);
  return rounded;
}
