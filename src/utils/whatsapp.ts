import { Equipment, TechnicianProfile } from '../types';
import { formatDate } from './dates';

/**
 * Clean Mexican phone number and format with country code 52
 * E.g. "833 123 4567" -> "528331234567"
 * E.g. "528331234567" -> "528331234567"
 * E.g. "+52 1 833 123 4567" -> "528331234567"
 */
export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) {
    return '52' + digits.substring(3);
  }
  if (digits.startsWith('52') && digits.length === 12) {
    return digits;
  }
  if (digits.length === 10) {
    return `52${digits}`;
  }
  return digits;
}

/**
 * Format a 10-digit Mexican phone number for display:
 * 8331234567 -> (833) 123-4567
 */
export function formatDisplayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  return phone;
}

/**
 * Generates the dynamic technician-to-client preventive maintenance WhatsApp message
 */
export function buildPreventiveWhatsAppMessage(
  equipment: Equipment,
  technician: TechnicianProfile
): string {
  const cycleText = equipment.reminderIntervalMonths === 6
    ? '6 meses'
    : equipment.reminderIntervalMonths === 4
    ? '4 meses'
    : equipment.reminderIntervalMonths === 3
    ? '3 meses (uso comercial)'
    : `${equipment.reminderIntervalMonths} meses`;

  const formattedDate = formatDate(equipment.lastServiceDate, true);

  if (technician.customMessageTemplate) {
    return technician.customMessageTemplate
      .replace(/{cliente}/g, equipment.clientName)
      .replace(/{tecnico}/g, technician.name)
      .replace(/{negocio}/g, technician.businessName)
      .replace(/{ubicacion}/g, equipment.location)
      .replace(/{equipo}/g, `${equipment.brand} ${equipment.capacity}`)
      .replace(/{ciclo}/g, cycleText)
      .replace(/{fecha}/g, formattedDate)
      .replace(/{precio}/g, `$${equipment.suggestedPrice} MXN`);
  }

  return `¡Hola ${equipment.clientName}! 👋 Soy ${technician.name} de ${technician.businessName}. Mi sistema me avisa que el minisplit de tu ${equipment.location} (${equipment.brand} ${equipment.capacity}) cumplió su ciclo de ${cycleText} desde el último servicio el ${formattedDate}. Para que siga enfriando al 100% y no gaste luz de más ahora con el calor de la zona, ¿te parece bien si agendamos su limpieza preventiva esta semana?`;
}

/**
 * Generates the dynamic client-to-technician WhatsApp message from the Public QR sticker
 */
export function buildClientHelpWhatsAppMessage(
  equipment: Equipment,
  technician: TechnicianProfile,
  reason: 'falla' | 'mantenimiento' | 'revision' = 'revision'
): string {
  const reasonText = reason === 'falla' 
    ? 'está presentando una falla / goteo de agua'
    : reason === 'mantenimiento'
    ? 'requiere su mantenimiento preventivo programado'
    : 'no está enfriando como antes y requiere revisión';

  return `¡Hola ${technician.name}! 👋 Escaneé la etiqueta QR de mi clima en mi pared (Folio: ${equipment.qrId}). 

❄️ Equipo: ${equipment.brand} ${equipment.capacity} (${equipment.location})
📍 Ubicación: ${equipment.clientColonia}
👤 Cliente: ${equipment.clientName}

El equipo ${reasonText}. ¿Cuándo tendrías espacio en tu agenda para pasar a revisarlo? ¡Muchas gracias!`;
}

/**
 * Builds the full wa.me URL
 */
export function createWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
