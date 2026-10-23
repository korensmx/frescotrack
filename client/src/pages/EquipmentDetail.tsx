// Ficha de un equipo: datos, historial de servicios y botón "Hice el servicio".
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MessageCircle, Phone, Trash2, Wrench } from 'lucide-react';
import { api, money, prettyDate, todayISO, waLink, type Equipment, type Service } from '../api';
import { useAuth } from '../auth';
import { Chips, ErrorBox, Field, Loading, StatusPill } from '../components/ui';

interface Detail { equipment: Equipment; services: Service[]; reminders: { id: number; channel: string; status: string; sentAt: string }[] }

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { config } = useAuth();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [svc, setSvc] = useState({ type: 'Mantenimiento preventivo', date: todayISO(), cost: '', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<Detail>(`/equipment/${id}`).then((d) => {
    setData(d);
    setSvc((s) => ({ ...s, cost: s.cost || String(d.equipment.price) }));
  }).catch((e) => setError(e.message)), [id]);
  useEffect(() => { load(); }, [load]);

  async function saveService() {
    setBusy(true); setError(null);
    try {
      await api(`/equipment/${id}/services`, { method: 'POST', body: { ...svc, cost: Number(svc.cost) || 0 } });
      setShowForm(false);
      setSvc({ type: 'Mantenimiento preventivo', date: todayISO(), cost: '', notes: '' });
      load();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm('¿Borrar este equipo y todo su historial? No se puede deshacer.')) return;
    await api(`/equipment/${id}`, { method: 'DELETE' });
    navigate('/');
  }

  if (!data) return <><ErrorBox message={error} />{!error && <Loading />}</>;
  const e = data.equipment;

  return (
    <div className="space-y-4">
      <button className="flex items-center gap-1 text-sm text-muted" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Atrás</button>
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-ice">{e.qrCode}</p>
            <h1 className="font-display text-2xl font-bold">{[e.brand, e.tons].filter(Boolean).join(' ') || 'Minisplit'}</h1>
            <p className="text-muted">{e.location}{e.inverter ? ' · Inverter' : ''}{e.refrigerant ? ` · ${e.refrigerant}` : ''}</p>
          </div>
          <StatusPill status={e.status} days={e.daysLeft} />
        </div>
        <Link to={`/clientes/${e.clientId}`} className="mt-3 block rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-muted">Cliente</p>
          <p className="font-semibold">{e.clientName}</p>
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-muted">Último servicio</p><p className="font-semibold">{prettyDate(e.lastServiceDate)}</p></div>
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-muted">Próximo (cada {e.intervalMonths} meses)</p><p className="font-semibold text-ice">{prettyDate(e.nextServiceDate)}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a className="btn-wa" href={waLink(e.clientPhone)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
          <a className="btn-ghost" href={`tel:+52${e.clientPhone}`}><Phone size={18} /> Llamar</a>
        </div>
      </div>

      <ErrorBox message={error} />

      {showForm ? (
        <div className="card">
          <h2 className="mb-3 font-display text-lg font-semibold">Registrar servicio</h2>
          <Field label="Servicio"><Chips value={svc.type} onChange={(v) => setSvc({ ...svc, type: v })} options={(config?.serviceTypes ?? ['Mantenimiento preventivo']).map((s) => ({ label: s, value: s }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha"><input className="input" type="date" value={svc.date} onChange={(ev) => setSvc({ ...svc, date: ev.target.value })} /></Field>
            <Field label="Cobro (MXN)"><input className="input" type="number" inputMode="numeric" value={svc.cost} onChange={(ev) => setSvc({ ...svc, cost: ev.target.value })} /></Field>
          </div>
          <Field label="Notas"><textarea className="input min-h-20 py-3" value={svc.notes} onChange={(ev) => setSvc({ ...svc, notes: ev.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-ice" onClick={saveService} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      ) : (
        <button className="btn-ice w-full" onClick={() => setShowForm(true)}><CheckCircle2 size={18} /> Hice el servicio hoy</button>
      )}

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Historial</h2>
        <ol className="relative space-y-3 border-l border-line pl-5">
          {data.services.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ice"><Wrench size={10} className="text-bg" /></span>
              <div className="card p-3">
                <div className="flex justify-between gap-2">
                  <p className="font-semibold">{s.type}</p>
                  <p className="text-sm font-semibold">{money(s.cost)}</p>
                </div>
                <p className="text-xs text-muted">{prettyDate(s.date)}{s.rescued && <span className="ml-2 text-ok">· Rescatado por recordatorio</span>}</p>
                {s.notes && <p className="mt-1 text-sm text-muted">{s.notes}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {data.reminders.length > 0 && (
        <p className="text-sm text-muted">Último recordatorio: {prettyDate(data.reminders[0].sentAt)}</p>
      )}

      <div className="flex justify-between pt-4 text-sm">
        <a className="text-ice underline" href={`/e/${e.qrCode}`} target="_blank" rel="noreferrer">Ver lo que ve el cliente</a>
        <button className="flex items-center gap-1 text-heat" onClick={remove}><Trash2 size={14} /> Borrar equipo</button>
      </div>
    </div>
  );
}
