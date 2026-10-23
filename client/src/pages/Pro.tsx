// Pantalla de venta de FrescoTrack Pro ($299/mes) con pago por Mercado Pago.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Crown, Loader2, ShieldCheck } from 'lucide-react';
import { api, money, type User } from '../api';
import { useAuth } from '../auth';
import { ErrorBox } from '../components/ui';

const FEATURES = [
  'Equipos y clientes ilimitados',
  'Recordatorios de WhatsApp automáticos desde tu número',
  'Stickers QR únicos para tus equipos',
  'Página de garantía para tus clientes al escanear',
  'Historial de cada minisplit en la nube',
];

export default function Pro() {
  const { user, config, setUser } = useAuth();
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState(5);
  const [ticket, setTicket] = useState(user?.defaultPrice ?? 750);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = config?.price ?? 299;
  const monthly = jobs * ticket;

  // Al volver de Mercado Pago, preguntamos si el pago ya quedó.
  useEffect(() => {
    if (params.get('pago')) {
      api<{ user: User }>('/billing/refresh', { method: 'POST' }).then((r) => setUser(r.user)).catch(() => {});
    }
  }, [params, setUser]);

  async function subscribe() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ url: string }>('/billing/subscribe', { method: 'POST', body: {} });
      window.location.href = r.url;
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  async function cancel() {
    if (!confirm('¿Seguro que quieres cancelar tu suscripción?')) return;
    try {
      const r = await api<{ user: User }>('/billing/cancel', { method: 'POST' });
      setUser(r.user);
    } catch (err) { setError((err as Error).message); }
  }

  if (user?.plan === 'pro') {
    return (
      <div className="card mt-6 text-center">
        <Crown className="mx-auto text-ice" size={40} />
        <h1 className="mt-3 font-display text-2xl font-bold">¡Eres FrescoTrack Pro!</h1>
        <p className="mt-2 text-muted">Tu suscripción de {money(price)}/mes está activa con Mercado Pago.</p>
        <ErrorBox message={error} />
        <button className="mt-6 text-sm text-muted underline" onClick={cancel}>Cancelar suscripción</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="inline-flex items-center gap-1 rounded-full border border-ice/40 bg-ice/10 px-3 py-1 text-xs font-semibold text-ice"><Crown size={14} /> FrescoTrack Pro</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Deja de perder clientes que ya eran tuyos</h1>
        {params.get('pago') && <p className="mt-2 text-sm text-warn">Estamos confirmando tu pago con Mercado Pago. Si ya pagaste, en unos minutos se activa solo.</p>}
      </div>

      <div className="card">
        <p className="font-semibold">Calcula cuánto recuperas</p>
        <label className="mt-3 block text-sm text-muted">Mantenimientos rescatados al mes: <b className="text-text">{jobs}</b></label>
        <input type="range" min={1} max={30} value={jobs} onChange={(e) => setJobs(Number(e.target.value))} className="w-full accent-[#00F2FE]" />
        <label className="mt-2 block text-sm text-muted">Precio de tu servicio: <b className="text-text">{money(ticket)}</b></label>
        <input type="range" min={300} max={2000} step={50} value={ticket} onChange={(e) => setTicket(Number(e.target.value))} className="w-full accent-[#00F2FE]" />
        <p className="mt-3 text-center text-sm text-muted">Ganas extra cada mes</p>
        <p className="text-center font-display text-4xl font-bold text-ice">{money(monthly)}</p>
        <p className="text-center text-xs text-muted">La app se paga sola con {Math.max(1, Math.ceil(price / ticket))} servicio.</p>
      </div>

      <div className="card border-ice/40">
        <p className="font-display text-4xl font-bold">{money(price)}<span className="text-base font-normal text-muted"> /mes</span></p>
        <ul className="mt-4 space-y-2">
          {FEATURES.map((f) => <li key={f} className="flex gap-2 text-sm"><Check size={18} className="shrink-0 text-ice" /> {f}</li>)}
        </ul>
        <ErrorBox message={error} />
        {config?.payments ? (
          <button className="btn-ice mt-5 w-full text-lg" onClick={subscribe} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={18} /> : null} Suscribirme con Mercado Pago
          </button>
        ) : (
          <p className="mt-5 rounded-xl bg-surface-2 p-3 text-center text-sm text-muted">Los pagos se activan muy pronto.</p>
        )}
        <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted"><ShieldCheck size={14} /> Pago seguro. Cancela cuando quieras.</p>
      </div>
    </div>
  );
}
