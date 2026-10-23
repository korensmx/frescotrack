// Cola de recordatorios de WhatsApp + conexión del WhatsApp Business del técnico.
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Link2, Loader2, MessageCircle, Send, Smartphone, X, Zap } from 'lucide-react';
import { api, prettyDate, type Equipment } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorBox, Loading, PageTitle, StatusPill } from '../components/ui';

interface Preview { message: string; connected: boolean; waUrl: string }

// Ventanita para revisar el mensaje y mandarlo. Se usa en Radar y en WhatsApp.
export function useSendReminder(onSent: () => void) {
  const [target, setTarget] = useState<Equipment | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = useCallback((e: Equipment) => {
    setTarget(e); setPreview(null); setError(null);
    api<Preview>(`/whatsapp/preview/${e.id}`).then(setPreview).catch((err) => setError(err.message));
  }, []);

  const close = () => setTarget(null);

  async function sendAuto() {
    if (!target) return;
    setBusy(true); setError(null);
    try {
      await api(`/whatsapp/send/${target.id}`, { method: 'POST', body: {} });
      close(); onSent();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  // El técnico abre WhatsApp con el mensaje ya escrito; lo anotamos como enviado.
  function markLinkSent() {
    if (!target) return;
    api(`/whatsapp/send/${target.id}`, { method: 'POST', body: { mode: 'link' } }).then(onSent).catch(() => {});
    close();
  }

  const dialog = target && (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 pb-24 sm:items-center sm:pb-3" onClick={close}>
      <div className="card w-full max-w-md bg-surface" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Mensaje para {target.clientName.split(' ')[0]}</h2>
          <button onClick={close} className="text-muted" aria-label="Cerrar"><X /></button>
        </div>
        <ErrorBox message={error} />
        {!preview ? <Loading /> : (
          <>
            <div className="mb-4 rounded-2xl rounded-tl-sm bg-[#005C4B] p-3 text-sm leading-relaxed text-white">{preview.message}</div>
            <div className="space-y-2">
              {preview.connected && (
                <button className="btn-ice w-full" onClick={sendAuto} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} Enviar automático
                </button>
              )}
              <a className={preview.connected ? 'btn-ghost w-full' : 'btn-wa w-full'} href={preview.waUrl} target="_blank" rel="noreferrer" onClick={markLinkSent}>
                <MessageCircle size={18} /> Abrir en WhatsApp
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return { send, dialog };
}

interface QueueData {
  queue: Equipment[];
  sent: { id: number; equipmentId: number; clientName: string; brand: string; location: string; channel: string; status: string; sentAt: string }[];
}

const STATUS_LABEL: Record<string, string> = { sent: 'Enviado', confirmed: 'Confirmó', no_answer: 'No contestó' };

export default function WhatsApp() {
  const { config } = useAuth();
  const [data, setData] = useState<QueueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const load = useCallback(() => api<QueueData>('/whatsapp/queue').then(setData).catch((e) => setError(e.message)), []);
  const { send, dialog } = useSendReminder(load);

  useEffect(() => { load(); }, [load]);

  async function sendBatch() {
    setBatchBusy(true); setError(null); setBatchMsg(null);
    try {
      const r = await api<{ sent: number; errors: unknown[] }>('/whatsapp/send-batch', { method: 'POST' });
      setBatchMsg(`Listo: ${r.sent} mensaje${r.sent === 1 ? '' : 's'} enviado${r.sent === 1 ? '' : 's'}${r.errors.length ? `, ${r.errors.length} con error` : ''}.`);
      load();
    } catch (err) { setError((err as Error).message); } finally { setBatchBusy(false); }
  }

  async function mark(id: number, status: string) {
    await api(`/whatsapp/reminders/${id}`, { method: 'PUT', body: { status } }).catch(() => {});
    load();
  }

  return (
    <div className="space-y-5">
      {dialog}
      <PageTitle title="WhatsApp" subtitle="Recordatorios listos para enviar" />
      <ErrorBox message={error} />

      {config?.whatsappApi && <ConnectCard onChange={setConnected} />}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">En cola ({data?.queue.length ?? 0})</h2>
          {connected && (data?.queue.length ?? 0) > 0 && (
            <button className="btn-ice min-h-10 px-3 text-sm" onClick={sendBatch} disabled={batchBusy}>
              {batchBusy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Enviar todos
            </button>
          )}
        </div>
        {batchMsg && <p className="mb-2 text-sm text-ok">{batchMsg}</p>}
        {!data ? <Loading /> : data.queue.length === 0 ? <Empty>No hay mensajes pendientes. 🎉</Empty> : (
          <div className="space-y-3">
            {data.queue.map((e) => (
              <div key={e.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{e.clientName}</p>
                    <p className="truncate text-sm text-muted">{[e.brand, e.location].filter(Boolean).join(' · ')}</p>
                  </div>
                  <StatusPill status={e.status} days={e.daysLeft} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{e.message}</p>
                <button className="btn-wa mt-3 w-full" onClick={() => send(e)}><MessageCircle size={18} /> Revisar y enviar</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {data && data.sent.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">Enviados</h2>
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {data.sent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.clientName}</p>
                  <p className="text-xs text-muted">{prettyDate(r.sentAt)} · {r.channel === 'api' ? 'automático' : 'manual'}</p>
                </div>
                <select className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs" value={r.status} onChange={(ev) => mark(r.id, ev.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Tarjeta para conectar el WhatsApp Business del técnico (con Evolution API).
function ConnectCard({ onChange }: { onChange: (connected: boolean) => void }) {
  const [state, setState] = useState<string>('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const r = await api<{ state: string }>('/whatsapp/status').catch(() => ({ state: 'error' }));
    setState(r.state);
    onChange(r.state === 'open');
    if (r.state === 'open') setQr(null);
    return r.state;
  }, [onChange]);

  useEffect(() => { check(); }, [check]);

  // Mientras se muestra el QR, revisamos cada 3 segundos si ya lo escanearon.
  useEffect(() => {
    if (!qr) return;
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, [qr, check]);

  async function connect() {
    setError(null);
    try {
      const r = await api<{ qr?: string; connected?: boolean }>('/whatsapp/connect', { method: 'POST' });
      if (r.connected) check(); else setQr(r.qr || null);
    } catch (err) { setError((err as Error).message); }
  }

  async function disconnect() {
    await api('/whatsapp/disconnect', { method: 'POST' }).catch(() => {});
    check();
  }

  if (state === 'open') {
    return (
      <div className="card flex items-center justify-between gap-3 border-ok/40">
        <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="text-ok" size={20} /> Tu WhatsApp está conectado. Los mensajes salen solos.</p>
        <button className="text-xs text-muted underline" onClick={disconnect}>Desconectar</button>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="flex items-center gap-2 font-semibold"><Smartphone size={18} className="text-ice" /> Conecta tu WhatsApp Business</p>
      <p className="mt-1 text-sm text-muted">Así los recordatorios salen automáticamente desde tu número, sin que tengas que presionar enviar.</p>
      <ErrorBox message={error} />
      {qr ? (
        <div className="mt-3 text-center">
          <img src={qr} alt="Código QR para conectar WhatsApp" className="mx-auto w-60 rounded-xl bg-white p-2" />
          <p className="mt-2 text-sm text-muted">En tu celular: WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo, y escanea este código.</p>
        </div>
      ) : (
        <button className="btn-ice mt-3 w-full" onClick={connect}><Link2 size={18} /> Conectar mi WhatsApp</button>
      )}
    </div>
  );
}
