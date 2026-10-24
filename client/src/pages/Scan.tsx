// Escanear un sticker: si el equipo ya existe abre su historial,
// si es nuevo, lo registramos en 3 pasos.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Keyboard, PartyPopper } from 'lucide-react';
import { api, money, prettyDate, priceFor, todayISO, type Client, type Equipment } from '../api';
import { useAuth } from '../auth';
import QrScanner from '../components/QrScanner';
import { Chips, ErrorBox, Field, PageTitle } from '../components/ui';

const LOCATIONS = ['Recámara', 'Sala', 'Comedor', 'Oficina', 'Local', 'Cocina'];
const BRANDS = ['Mirage', 'Carrier', 'York', 'LG', 'Midea', 'Trane', 'Samsung', 'Hisense'];
const TONS = ['1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton', '3 Ton'];
const GAS = ['R410A', 'R32', 'R22'];

export default function Scan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState<string | null>(params.get('codigo'));
  const [typed, setTyped] = useState('');
  const [manual, setManual] = useState(false);
  const [noSticker, setNoSticker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [ready, setReady] = useState(false);

  const lookup = useCallback(async (text: string) => {
    setChecking(true); setError(null);
    try {
      const r = await api<{ code: string; equipment: Equipment | null }>(`/equipment/by-qr/${encodeURIComponent(text)}`);
      if (r.equipment) navigate(`/equipos/${r.equipment.id}`);
      else { setCode(r.code); setReady(true); }
    } catch (err) {
      setError((err as Error).message);
      setCode(null);
    } finally { setChecking(false); }
  }, [navigate]);

  useEffect(() => { if (params.get('codigo')) lookup(params.get('codigo')!); }, [params, lookup]);

  if (ready || noSticker) return <RegisterForm code={noSticker ? null : code} onBack={() => { setReady(false); setNoSticker(false); setCode(null); }} />;

  return (
    <div className="space-y-4">
      <PageTitle title="Escanear sticker" subtitle="Registra un equipo nuevo o abre su historial" />
      <ErrorBox message={error} />
      {checking ? <p className="py-10 text-center text-muted">Buscando el sticker…</p> : (
        <QrScanner key={error ?? 'scan'} onResult={lookup} />
      )}

      {manual ? (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) lookup(typed.trim()); }}>
          <input className="input uppercase" placeholder="FT-XXXXXXXX" value={typed} onChange={(e) => setTyped(e.target.value)} />
          <button className="btn-ice">Buscar</button>
        </form>
      ) : (
        <button className="btn-ghost w-full" onClick={() => setManual(true)}><Keyboard size={18} /> Escribir el código del sticker</button>
      )}
      <button className="w-full text-center text-sm text-muted underline" onClick={() => setNoSticker(true)}>
        Registrar sin sticker (se crea un código nuevo)
      </button>
      <Link to="/stickers" className="block text-center text-sm font-semibold text-ice">¿No tienes stickers? Imprime una hoja aquí</Link>
    </div>
  );
}

function RegisterForm({ code, onBack }: { code: string | null; onBack: () => void }) {
  const { user, config } = useAuth();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientMode, setClientMode] = useState<'new' | 'existing'>('new');
  const [f, setF] = useState({
    clientId: 0, clientName: '', clientPhone: '', clientAddress: '',
    location: 'Recámara', brand: 'Mirage', tons: '1.5 Ton', inverter: true, refrigerant: 'R410A',
    serviceType: 'Mantenimiento preventivo', serviceDate: todayISO(), cost: String(priceFor(user, '1.5 Ton', true)),
    intervalMonths: 6, notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Equipment | null>(null);
  // Si el técnico escribe el cobro a mano, ya no lo cambiamos solos.
  const [costTouched, setCostTouched] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const tablePrice = priceFor(user, f.tons, f.inverter);

  // Al cambiar el tonelaje o el tipo, el cobro se llena con el precio de la tabla.
  useEffect(() => {
    if (!costTouched) setF((prev) => ({ ...prev, cost: String(tablePrice) }));
  }, [tablePrice, costTouched]);

  useEffect(() => { api<{ clients: Client[] }>('/clients').then((r) => setClients(r.clients)).catch(() => {}); }, []);

  function next() {
    setError(null);
    if (step === 1) {
      if (clientMode === 'existing' && !f.clientId) return setError('Elige un cliente');
      if (clientMode === 'new' && (!f.clientName.trim() || f.clientPhone.replace(/\D/g, '').length < 10)) {
        return setError('Escribe el nombre y el WhatsApp (10 dígitos) del cliente');
      }
    }
    setStep(step + 1);
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      const body = {
        qrCode: code, ...(clientMode === 'existing' ? { clientId: f.clientId } : { clientName: f.clientName, clientPhone: f.clientPhone, clientAddress: f.clientAddress }),
        location: f.location, brand: f.brand, tons: f.tons, inverter: f.inverter, refrigerant: f.refrigerant,
        serviceType: f.serviceType, serviceDate: f.serviceDate, cost: Number(f.cost) || 0, price: tablePrice,
        intervalMonths: f.intervalMonths, notes: f.notes,
      };
      const r = await api<{ equipment: Equipment }>('/equipment', { method: 'POST', body });
      setSaved(r.equipment);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (saved) {
    return (
      <div className="card mt-6 text-center">
        <PartyPopper className="mx-auto text-ice" size={40} />
        <h1 className="mt-3 font-display text-2xl font-bold">¡Equipo registrado!</h1>
        <p className="mt-2 text-muted">Sticker <b className="text-text">{saved.qrCode}</b> de {saved.clientName}.</p>
        <p className="mt-1 text-muted">Te avisaremos para su próximo servicio el <b className="text-ice">{prettyDate(saved.nextServiceDate)}</b>.</p>
        <div className="mt-5 grid gap-2">
          <Link to={`/equipos/${saved.id}`} className="btn-ice">Ver ficha del equipo</Link>
          <button className="btn-ghost" onClick={onBack}>Registrar otro</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="mb-3 flex items-center gap-1 text-sm text-muted" onClick={step === 1 ? onBack : () => setStep(step - 1)}>
        <ArrowLeft size={16} /> Atrás
      </button>
      <PageTitle title="Nuevo equipo" subtitle={code ? `Sticker ${code}` : 'Se creará un código nuevo'} />
      <div className="mb-5 flex gap-2">
        {[1, 2, 3].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-ice' : 'bg-line'}`} />)}
      </div>
      <ErrorBox message={error} />

      {step === 1 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">1. ¿De quién es?</h2>
          {clients.length > 0 && (
            <div className="mb-4"><Chips value={clientMode} onChange={setClientMode} options={[{ label: 'Cliente nuevo', value: 'new' }, { label: 'Ya es mi cliente', value: 'existing' }]} /></div>
          )}
          {clientMode === 'existing' ? (
            <Field label="Cliente">
              <select className="input" value={f.clientId} onChange={(e) => set('clientId', Number(e.target.value))}>
                <option value={0}>Elige…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Nombre del cliente"><input className="input" value={f.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Roberto Garza" /></Field>
              <Field label="WhatsApp del cliente (10 dígitos)"><input className="input" type="tel" inputMode="numeric" value={f.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} placeholder="833 123 4567" /></Field>
              <Field label="Dirección o colonia (opcional)"><input className="input" value={f.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} placeholder="Col. Petrolera" /></Field>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">2. ¿Dónde está y qué equipo es?</h2>
          <Field label="Ubicación"><Chips value={f.location} onChange={(v) => set('location', v)} options={LOCATIONS.map((l) => ({ label: l, value: l }))} /></Field>
          <Field label="Marca"><Chips value={f.brand} onChange={(v) => set('brand', v)} options={BRANDS.map((b) => ({ label: b, value: b }))} /></Field>
          <Field label="Capacidad"><Chips value={f.tons} onChange={(v) => set('tons', v)} options={TONS.map((t) => ({ label: t, value: t }))} /></Field>
          <Field label="Tipo"><Chips value={f.inverter ? 'inv' : 'conv'} onChange={(v) => set('inverter', v === 'inv')} options={[{ label: 'Inverter', value: 'inv' }, { label: 'Convencional', value: 'conv' }]} /></Field>
          <Field label="Refrigerante"><Chips value={f.refrigerant} onChange={(v) => set('refrigerant', v)} options={GAS.map((g) => ({ label: g, value: g }))} /></Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-1">
          <h2 className="mb-3 font-display text-lg font-semibold">3. ¿Qué servicio hiciste?</h2>
          <Field label="Servicio"><Chips value={f.serviceType} onChange={(v) => set('serviceType', v)} options={(config?.serviceTypes ?? ['Mantenimiento preventivo']).map((s) => ({ label: s, value: s }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha"><input className="input" type="date" value={f.serviceDate} onChange={(e) => set('serviceDate', e.target.value)} /></Field>
            <Field label="Cobro (MXN)"><input className="input" type="number" inputMode="numeric" value={f.cost} onChange={(e) => { setCostTouched(true); set('cost', e.target.value); }} /></Field>
          </div>
          <Field label="Recordarme en">
            <Chips value={f.intervalMonths} onChange={(v) => set('intervalMonths', v)} options={[
              { label: '6 meses (casa)', value: 6 }, { label: '4 meses (playa)', value: 4 }, { label: '3 meses (negocio)', value: 3 },
            ]} />
          </Field>
          <Field label="Notas (opcional)"><textarea className="input min-h-20 py-3" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Presión, piezas cambiadas…" /></Field>
          <p className="pb-2 text-sm text-muted">
            Precio de tu tabla para {f.inverter ? 'Inverter' : 'Normal'} de {f.tons}: <b className="text-text">{money(tablePrice)}</b>. Los cambias en Ajustes → Precios.
          </p>
        </div>
      )}

      <div className="mt-4">
        {step < 3 ? (
          <button className="btn-ice w-full" onClick={next}>Siguiente <ArrowRight size={18} /></button>
        ) : (
          <button className="btn-ice w-full" onClick={save} disabled={busy}><Check size={18} /> {busy ? 'Guardando…' : 'Guardar equipo'}</button>
        )}
      </div>
    </div>
  );
}
