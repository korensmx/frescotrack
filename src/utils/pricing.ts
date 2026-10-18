import { ApplianceType, VoltageType, SystemType, CapacityType, PricingMatrix } from '../types';

export const DEFAULT_PRICING_MATRIX: PricingMatrix = {
  baseMinisplit: 700,
  baseVentana: 550,
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
  commercialExtra: 300,
};

/**
 * Calculates dynamic service price based on multidimensional specs:
 * Appliance (Ventana vs Minisplit) + Voltage (110V vs 220V) + System (Inverter vs Normal) + Tonnage (0.5 to 3 Tn)
 */
export function calculateEquipmentServicePrice(
  specs: {
    applianceType: ApplianceType;
    voltage: VoltageType;
    systemType: SystemType;
    capacity: CapacityType;
    isCommercial?: boolean;
  },
  matrix: PricingMatrix = DEFAULT_PRICING_MATRIX
): number {
  // 1. Base by appliance type
  let price = specs.applianceType === 'Clima de Ventana' 
    ? matrix.baseVentana 
    : matrix.baseMinisplit;

  // 2. Voltage delta
  if (specs.voltage === '220V') {
    price += matrix.voltage220vExtra;
  } else {
    price += matrix.voltage110vExtra;
  }

  // 3. System type delta (Inverter vs Normal)
  if (specs.systemType === 'Inverter') {
    price += matrix.inverterExtra;
  } else {
    price += matrix.normalExtra;
  }

  // 4. Capacity delta (0.5 to 3 Ton)
  const capacityDelta = matrix.capacityDeltas[specs.capacity] ?? 0;
  price += capacityDelta;

  // 5. Environmental extras
  if (specs.isCommercial) {
    price += matrix.commercialExtra;
  }

  // Round to nearest 50 for clean Mexican technician billing
  return Math.round(price / 50) * 50;
}
