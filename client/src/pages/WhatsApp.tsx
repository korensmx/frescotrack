// Cola de recordatorios de WhatsApp + conexión del WhatsApp Business del técnico.
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, MessageCircle, Send, Smartphone, X, Zap } from 'lucide-react';
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
// Dos formas: un código de 8 letras (para hacerlo desde el mismo celular)
// o un QR (para escanearlo con el celular si la app está abierta en otra pantalla).
function ConnectCard({ onChange }: { onChange: (connected: boolean) => void }) {
  const { user } = useAuth();
  const [state, setState] = useState<string>('loading');
  const [mode, setMode] = useState<'idle' | 'code' | 'qr'>('idle');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const r = await api<{ state: string }>('/whatsapp/status').catch(() => ({ state: 'error' }));
    setState(r.state);
    onChange(r.state === 'open');
    if (r.state === 'open') { setQr(null); setCode(null); setMode('idle'); }
    return r.state;
  }, [onChange]);

  useEffect(() => { check(); }, [check]);

  // Mientras se muestra el código o el QR, revisamos cada 3 segundos si ya se conectó.
  useEffect(() => {
    if (!qr && !code) return;
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, [qr, code, check]);

  async function connect(withCode: boolean) {
    setError(null); setBusy(true); setCopied(false);
    try {
      const r = await api<{ qr?: string; pairingCode?: string; connected?: boolean }>('/whatsapp/connect', {
        method: 'POST', body: withCode ? { phone } : {},
      });
      if (r.connected) { check(); return; }
      if (withCode) {
        if (!r.pairingCode) throw new Error('No llegó el código. Intenta de nuevo en unos segundos.');
        setCode(r.pairingCode);
      } else {
        setQr(r.qr || null);
      }
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function copy() {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* sin permiso: lo escribe a mano */ }
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

      {mode === 'idle' && (
        <div className="mt-3 space-y-2">
          <button className="btn-ice w-full" onClick={() => setMode('code')}><KeyRound size={18} /> Conectar desde este celular</button>
          <button className="w-full text-center text-sm text-muted underline" onClick={() => { setMode('qr'); connect(false); }}>
            Prefiero escanear un QR (desde otra pantalla)
          </button>
        </div>
      )}

      {mode === 'code' && !code && (
        <div className="mt-3">
          <label className="label">Tu número de WhatsApp Business (10 dígitos)</label>
          <input className="input mb-3" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn-ice w-full" onClick={() => connect(true)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />} Pedir mi código
          </button>
          <button className="mt-2 w-full text-center text-sm text-muted underline" onClick={() => setMode('idle')}>Cancelar</button>
        </div>
      )}

      {mode === 'code' && code && (
        <div className="mt-3">
          <p className="text-center text-sm text-muted">Tu código para vincular:</p>
          <button onClick={copy} className="mx-auto mt-1 block rounded-xl border border-ice/40 bg-ice/10 px-4 py-3 font-mono text-3xl font-bold tracking-[0.25em] text-ice">
            {code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code}
          </button>
          <p className="mt-1 text-center text-xs text-muted">{copied ? '¡Copiado!' : 'Toca el código para copiarlo'}</p>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
            <li>Abre <b>WhatsApp Business</b> en este celular.</li>
            <li>Toca <b>⋮</b> (o <b>Configuración</b> en iPhone) → <b>Dispositivos vinculados</b> → <b>Vincular un dispositivo</b>.</li>
            <li>Abajo toca <b>“Vincular con el número de teléfono”</b>.</li>
            <li>Escribe el código de arriba. ¡Listo! Regresa aquí y se pondrá en verde solito.</li>
          </ol>
          <a href="whatsapp://" className="btn-wa mt-4 w-full"><MessageCircle size={18} /> Abrir WhatsApp</a>
          <button className="mt-2 w-full text-center text-sm text-muted underline" onClick={() => connect(true)} disabled={busy}>¿Expiró? Pedir otro código</button>
        </div>
      )}

      {mode === 'qr' && (
        qr ? (
          <div className="mt-3 text-center">
            <img src={qr} alt="Código QR para conectar WhatsApp" className="mx-auto w-60 rounded-xl bg-white p-2" />
            <p className="mt-2 text-sm text-muted">En tu celular: WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo, y escanea este código.</p>
            <button className="mt-2 text-sm text-muted underline" onClick={() => { setQr(null); setMode('code'); }}>Mejor usar código desde este celular</button>
          </div>
        ) : busy ? <Loading /> : (
          <button className="btn-ghost mt-3 w-full" onClick={() => connect(false)}>Volver a intentar</button>
        )
      )}
    </div>
  );
}
