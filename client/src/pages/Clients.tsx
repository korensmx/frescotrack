// Lista de clientes y ficha de cada cliente.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, MessageCircle, Phone, Plus, ScanLine, Search, Trash2 } from 'lucide-react';
import { api, prettyDate, waLink, type Client, type Equipment } from '../api';
import { Empty, EquipmentCard, ErrorBox, Field, Loading, PageTitle } from '../components/ui';

export function Clients() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const load = useCallback(() => api<{ clients: Client[] }>('/clients').then((r) => setClients(r.clients)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (clients ?? []).filter((c) => !term || c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.address.toLowerCase().includes(term));
  }, [clients, q]);

  async function add() {
    setError(null);
    try {
      await api('/clients', { method: 'POST', body: form });
      setForm({ name: '', phone: '', address: '' }); setAdding(false); load();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div>
      <PageTitle title="Clientes" subtitle={clients ? `${clients.length} en total` : undefined}
        action={<button className="btn-ghost min-h-10 px-3 text-sm" onClick={() => setAdding(!adding)}><Plus size={16} /> Nuevo</button>} />
      <ErrorBox message={error} />
      {adding && (
        <div className="card mb-4">
          <Field label="Nombre"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="WhatsApp (10 dígitos)"><input className="input" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Dirección o colonia"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <button className="btn-ice w-full" onClick={add}>Guardar cliente</button>
        </div>
      )}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-11" placeholder="Buscar por nombre, teléfono o colonia" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!clients ? <Loading /> : shown.length === 0 ? (
        <Empty>{clients.length === 0 ? 'Aún no tienes clientes. Se agregan solos al registrar un equipo.' : 'No encontramos a nadie con esa búsqueda.'}</Empty>
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {shown.map((c) => (
            <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-sm text-muted">
                  {c.equipmentCount} equipo{c.equipmentCount === 1 ? '' : 's'}
                  {c.nextServiceDate ? ` · próximo ${prettyDate(c.nextServiceDate)}` : ''}
                </p>
              </div>
              <ChevronRight className="shrink-0 text-muted" size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ client: Client; equipment: Equipment[] } | null>(null);
  const [form, setForm] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ client: Client; equipment: Equipment[] }>(`/clients/${id}`).then((d) => { setData(d); setForm(d.client); }).catch((e) => setError(e.message));
  }, [id]);

  async function save() {
    if (!form) return;
    setError(null); setSaved(false);
    try {
      await api(`/clients/${id}`, { method: 'PUT', body: form });
      setSaved(true);
    } catch (err) { setError((err as Error).message); }
  }

  async function remove() {
    if (!confirm('¿Borrar este cliente y TODOS sus equipos? No se puede deshacer.')) return;
    await api(`/clients/${id}`, { method: 'DELETE' });
    navigate('/clientes');
  }

  if (!data || !form) return <><ErrorBox message={error} />{!error && <Loading />}</>;

  return (
    <div className="space-y-4">
      <button className="flex items-center gap-1 text-sm text-muted" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Atrás</button>
      <h1 className="font-display text-2xl font-bold">{data.client.name}</h1>
      <div className="grid grid-cols-2 gap-2">
        <a className="btn-wa" href={waLink(data.client.phone)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
        <a className="btn-ghost" href={`tel:+52${data.client.phone}`}><Phone size={18} /> Llamar</a>
      </div>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Equipos ({data.equipment.length})</h2>
        <div className="space-y-3">
          {data.equipment.map((e) => <EquipmentCard key={e.id} e={e} />)}
          <Link to="/escanear" className="btn-ghost w-full"><ScanLine size={18} /> Agregar otro equipo</Link>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-display text-lg font-semibold">Datos del cliente</h2>
        <ErrorBox message={error} />
        <Field label="Nombre"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="WhatsApp"><input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Dirección"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <Field label="Notas"><textarea className="input min-h-20 py-3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej. portón negro, tocar fuerte" /></Field>
        <button className="btn-ice w-full" onClick={save}>{saved ? '¡Guardado!' : 'Guardar cambios'}</button>
      </section>
      <button className="flex items-center gap-1 text-sm text-heat" onClick={remove}><Trash2 size={14} /> Borrar cliente</button>
    </div>
  );
}
