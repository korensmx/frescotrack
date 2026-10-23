// Todas las llamadas al servidor pasan por aquí.

export type Status = 'overdue' | 'due' | 'soon' | 'ok';

export interface User {
  id: number; email: string; name: string; businessName: string; phone: string; city: string;
  defaultPrice: number; messageTemplate: string; autoSend: boolean; autoSendHour: number; plan: 'trial' | 'pro'; planStatus: string | null;
  trialEndsAt: string; trialDaysLeft: number; active: boolean;
}

export interface Equipment {
  id: number; clientId: number; qrCode: string; brand: string; tons: string; refrigerant: string;
  inverter: boolean; location: string; intervalMonths: number; price: number;
  lastServiceDate: string; nextServiceDate: string; daysLeft: number; status: Status;
  clientName: string; clientPhone: string; lastReminderAt: string | null; message?: string;
}

export interface Client {
  id: number; name: string; phone: string; address: string; notes: string;
  equipmentCount?: number; nextServiceDate?: string | null;
}

export interface Service { id: number; date: string; type: string; notes: string; cost: number; rescued: boolean }

export interface AppConfig {
  whatsappApi: boolean; payments: boolean; price: number; supportPhone: string; serviceTypes: string[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

const TOKEN_KEY = 'ft_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sin internet. Revisa tu señal e intenta de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event('ft:logout'));
    }
    throw new ApiError(res.status, data.error || 'Algo salió mal', data.code);
  }
  return data as T;
}

// ---------- Formatos ----------
export const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

export function prettyDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysLabel(days: number) {
  if (days < 0) return `Vencido hace ${-days} día${days === -1 ? '' : 's'}`;
  if (days === 0) return 'Le toca hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

export const waLink = (phone: string, text = '') =>
  `https://wa.me/52${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
