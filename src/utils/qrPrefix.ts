import { Equipment } from '../types';

/**
 * Computes a distinctive, collision-free QR prefix for a tenant or technician
 * Examples:
 * - "Climas Korens" / "climas-korens" -> "CK"
 * - "RefriMadero Express" / "refrimadero-express" -> "RM"
 * - "Doctor Clima Altamira" / "doctor-clima-altamira" -> "DC"
 * - "Climas del Golfo Tampico" / "climas-del-golfo" -> "CG"
 */
export function getTenantQRPrefix(tenantOrTech?: {
  qrPrefix?: string;
  businessName?: string;
  slug?: string;
  subdomain?: string;
}): string {
  if (tenantOrTech?.qrPrefix && tenantOrTech.qrPrefix.trim()) {
    return tenantOrTech.qrPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  const slug = tenantOrTech?.slug || tenantOrTech?.subdomain;
  if (slug) {
    const parts = slug.toLowerCase().split('-').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return slug.slice(0, 3).toUpperCase();
  }

  if (tenantOrTech?.businessName) {
    const words = tenantOrTech.businessName.split(' ').filter((w) => w.length > 2);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return tenantOrTech.businessName.slice(0, 3).toUpperCase();
  }

  return 'FT';
}

/**
 * Computes the next unique sequential folio for a technician/tenant
 * e.g. "CK-0001", "CK-0002"
 */
export function generateNextFolio(existingEquipments: Equipment[], prefix: string): string {
  const cleanPrefix = prefix.replace(/-$/, '').toUpperCase();
  const regex = new RegExp(`^${cleanPrefix}-(\\d+)`, 'i');
  let maxNum = 0;

  for (const eq of existingEquipments) {
    const match = eq.qrId?.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  return `${cleanPrefix}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generates the full, unique URL encoded into the physical QR sticker
 * Always includes the business identifier so scanning with any phone camera
 * directs to that business's micro-app and loads the specific equipment carnet.
 */
export function buildEquipmentQRUrl(folio: string, businessSlug?: string): string {
  const base = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://frescotrack.korensmx.com';
  
  const cleanFolio = folio.trim().toUpperCase();
  const cleanSlug = businessSlug ? encodeURIComponent(businessSlug.trim().toLowerCase()) : '';

  if (cleanSlug) {
    return `${base}/?negocio=${cleanSlug}&folio=${cleanFolio}`;
  }
  return `${base}/?folio=${cleanFolio}`;
}
