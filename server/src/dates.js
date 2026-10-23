// Ayudantes para fechas. Guardamos las fechas como texto "AAAA-MM-DD".

export function today() {
  return toISODate(new Date());
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Suma meses sin brincarse al mes siguiente (31 de agosto + 6 meses = 28/29 de febrero).
export function addMonths(iso, months) {
  const d = parse(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISODate(d);
}

export function addDays(iso, days) {
  const d = parse(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// Días que faltan de "hoy" a "fecha" (negativo = ya pasó).
export function daysBetween(fromIso, toIso) {
  return Math.round((parse(toIso) - parse(fromIso)) / 86400000);
}

export function isValidISODate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISODate(parse(s)) === s;
}
