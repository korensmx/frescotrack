/**
 * FrescoTrack Multi-Tier Performance Cache
 * Prevents redundant computations, date parsing, and price recalculations.
 */

import { Equipment, EquipmentStatus, PricingMatrix, ApplianceType, VoltageType, SystemType, CapacityType } from '../types';

/**
 * Generic LRU / TTL In-Memory Cache
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiresAt?: number }>();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest item (first item in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// 1. Service Status Cache (Key: id + lastServiceDate + reminderMonths + todayDateStr)
export const equipmentStatusCache = new MemoryCache<{
  status: EquipmentStatus;
  daysDiff: number;
  nextDueDate: Date;
  statusLabel: string;
  badgeClass: string;
}>(1000);

// 2. Pricing Matrix Calculation Cache
export const pricingCalculationCache = new MemoryCache<number>(200);

/**
 * Cache key generator for Pricing Calculations
 */
export function getPricingCacheKey(
  specs: {
    applianceType: ApplianceType;
    voltage: VoltageType;
    systemType: SystemType;
    capacity: CapacityType;
    isCommercial?: boolean;
  },
  matrix: PricingMatrix
): string {
  return [
    specs.applianceType,
    specs.voltage,
    specs.systemType,
    specs.capacity,
    specs.isCommercial ? '1' : '0',
    matrix.baseMinisplit,
    matrix.baseVentana,
    matrix.voltage220vExtra,
    matrix.inverterExtra,
    matrix.commercialExtra,
  ].join('|');
}

/**
 * Cache key generator for Equipment Status
 */
export function getEquipmentStatusCacheKey(eq: Equipment, todayDateStr: string): string {
  return `${eq.id}:${eq.lastServiceDate}:${eq.reminderIntervalMonths}:${todayDateStr}`;
}

/**
 * Clears calculation caches on demand (e.g. when changing tariff settings)
 */
export function invalidatePricingCache(): void {
  pricingCalculationCache.clear();
}

export function invalidateEquipmentStatusCache(): void {
  equipmentStatusCache.clear();
}
