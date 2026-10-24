// Tabla de precios del mantenimiento: cuánto cobra el técnico según si el
// minisplit es Normal o Inverter y según sus toneladas (de 1 a 3).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, PRICE_TONS, type PriceKind, type User } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, PageTitle } from '../components/ui';

const KINDS: { key: PriceKind; label: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'inverter', label: 'Inverter' },
];

export default function Prices() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  // Guardamos los precios como texto mientras el técnico escribe.
  const [table, setTable] = useState(() => Object.fromEntries(KINDS.map(({ key }) =>
    [key, Object.fromEntries(PRICE_TONS.map((t) => [t, String(user!.priceTable[key][t])]))])) as Record<PriceKind, Record<string, string>>);
  const [applyToEquipment, setApplyToEquipment] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setPrice = (kind: PriceKind, tons: string, value: string) =>
    setTable((prev) => ({ ...prev, [kind]: { ...prev[kind], [tons]: value } }));

  async function save() {
    setBusy(true); setError(null); setMsg(null);
    try {
      const priceTable = Object.fromEntries(KINDS.map(({ key }) =>
        [key, Object.fromEntries(PRICE_TONS.map((t) => [t, Number(table[key][t]) || 0]))]));
      const r = await api<{ user: User; updatedEquipment: number }>('/me/prices', { method: 'PUT', body: { priceTable, applyToEquipment } });
      setUser(r.user);
      setMsg(applyToEquipment && r.updatedEquipment > 0
        ? `¡Precios guardados! También se actualizaron ${r.updatedEquipment} equipo${r.updatedEquipment === 1 ? '' : 's'}.`
        : '¡Precios guardados!');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <button className="flex items-center gap-1 text-sm text-muted" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Atrás</button>
      <PageTitle title="Precios" subtitle="Cuánto cobras por un mantenimiento" />
      <ErrorBox message={error} />
      {msg && <p className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm text-ok">{msg}</p>}

      <section className="card">
        <div className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2">
          <span className="text-xs font-semibold text-muted">Tamaño</span>
          {KINDS.map(({ key, label }) => <span key={key} className="text-center text-sm font-semibold text-ice">{label}</span>)}
          {PRICE_TONS.map((t) => (
            <Row key={t} tons={t}>
              {KINDS.map(({ key, label }) => (
                <input key={key} className="input text-center" type="number" inputMode="numeric" min={0}
                  aria-label={`${label} ${t} toneladas`}
                  value={table[key][t]} onChange={(e) => setPrice(key, t, e.target.value)} />
              ))}
            </Row>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Al registrar un equipo, el cobro se llena solo con el precio de su tipo y tamaño. Siempre lo puedes cambiar a mano.
        </p>
      </section>

      <label className="card flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-ice" checked={applyToEquipment} onChange={(e) => setApplyToEquipment(e.target.checked)} />
        <span>
          <span className="block font-semibold">Usar estos precios en mis equipos ya registrados</span>
          <span className="block text-sm text-muted">Así el recordatorio y el radar muestran el precio nuevo. Los servicios que ya cobraste no cambian.</span>
        </span>
      </label>

      <button className="btn-ice w-full" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar precios'}</button>
    </div>
  );
}

function Row({ tons, children }: { tons: string; children: React.ReactNode }) {
  return (
    <>
      <span className="font-display font-semibold">{tons} tn</span>
      {children}
    </>
  );
}
