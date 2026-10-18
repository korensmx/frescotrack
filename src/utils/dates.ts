import { Equipment, EquipmentStatus } from '../types';
import { equipmentStatusCache, getEquipmentStatusCacheKey } from './cache';

/**
 * Format a date string YYYY-MM-DD to Mexican Spanish locale
 * Example: 2026-04-13 -> "13 abr 2026" or "13 de abril de 2026"
 */
export function formatDate(dateString: string, longFormat: boolean = false): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: longFormat ? 'long' : 'short',
        year: 'numeric'
      });
    }
    const d = new Date(dateString);
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: longFormat ? 'long' : 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate the next service due date given a last service date and interval in months.
 */
export function getNextDueDate(lastServiceDate: string, intervalMonths: number): Date {
  const parts = lastServiceDate.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  date.setMonth(date.getMonth() + intervalMonths);
  return date;
}

/**
 * Get difference in whole calendar days between today and the due date
 * Positive = days overdue
 * Negative = days left until due date
 */
export function getDaysDiffFromToday(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - target.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Computes status and humanized overdue/due label for an equipment.
 * Cached in memory to avoid parsing ISO dates multiple times per render.
 */
export function getEquipmentServiceStatus(equipment: Equipment): {
  status: EquipmentStatus;
  daysDiff: number; // positive = overdue, negative = days remaining
  nextDueDate: Date;
  statusLabel: string;
  badgeClass: string;
} {
  const todayStr = new Date().toISOString().slice(0, 10);
  const cacheKey = getEquipmentStatusCacheKey(equipment, todayStr);
  const cached = equipmentStatusCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const nextDueDate = getNextDueDate(equipment.lastServiceDate, equipment.reminderIntervalMonths);
  const daysDiff = getDaysDiffFromToday(nextDueDate);

  let result: {
    status: EquipmentStatus;
    daysDiff: number;
    nextDueDate: Date;
    statusLabel: string;
    badgeClass: string;
  };

  if (daysDiff > 0) {
    let statusLabel = `Vencido hace ${daysDiff} día${daysDiff === 1 ? '' : 's'}`;
    if (daysDiff >= 30) {
      const months = Math.floor(daysDiff / 30);
      const remainingDays = daysDiff % 30;
      statusLabel = remainingDays > 0 
        ? `Vencido hace ${months} mes${months > 1 ? 'es' : ''} y ${remainingDays} d.`
        : `Vencido hace ${months} mes${months > 1 ? 'es' : ''}`;
    }
    result = {
      status: 'overdue',
      daysDiff,
      nextDueDate,
      statusLabel,
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-300'
    };
  } else if (daysDiff >= -7) {
    const daysLeft = Math.abs(daysDiff);
    result = {
      status: 'upcoming',
      daysDiff,
      nextDueDate,
      statusLabel: daysLeft === 0 ? '¡Vence hoy!' : `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  } else {
    const daysLeft = Math.abs(daysDiff);
    result = {
      status: 'ok',
      daysDiff,
      nextDueDate,
      statusLabel: `Al día (${daysLeft} días vigentes)`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  }

  equipmentStatusCache.set(cacheKey, result);
  return result;
}

/**
 * Helper to get ISO string for N days in the past or future
 */
export function getRelativeISODate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
