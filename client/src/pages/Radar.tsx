// Pantalla principal: a quién le toca mantenimiento y cuánto dinero hay en juego.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ScanLine, Snowflake, TrendingUp } from 'lucide-react';
import { api, money, type Equipment } from '../api';
import { useAuth } from '../auth';
import { Empty, EquipmentCard, ErrorBox, Loading } from '../components/ui';
import { useSendReminder } from './WhatsApp';

interface RadarData {
  metrics: {
    equipmentCount: number; clientCount: number; overdueCount: number; dueCount: number;
    potentialIncome: number; monthIncome: number; monthRescued: number; monthServices: number;
  };
  today: Equipment[];
  soon: Equipment[];
}

export default function Radar() {
  const { user } = useAuth();
  const [data, setData] = useState<RadarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api<RadarData>('/radar').then(setData).catch((e) => setError(e.message)), []);
  const { send, dialog } = useSendReminder(load);

  useEffect(() => { load(); }, [load]);

  if (!data) return <><ErrorBox message={error} />{!error && <Loading />}</>;
  const m = data.metrics;

  return (
    <div className="space-y-5">
      {dialog}
      <div>
        <p className="text-muted">Hola, {user?.name.split(' ')[0]} 👋</p>
        <h1 className="font-display text-2xl font-bold">Tu radar de hoy</h1>
      </div>

      <div className="card relative overflow-hidden border-ice/30 bg-gradient-to-br from-ice/15 to-surface">
        <p className="flex items-center gap-2 text-sm text-ice"><TrendingUp size={16} /> Dinero rescatado este mes</p>
        <p className="mt-1 font-display text-4xl font-bold">{money(m.monthRescued)}</p>
        <p className="mt-1 text-sm text-muted">
          {m.monthServices} servicio{m.monthServices === 1 ? '' : 's'} este mes · {money(m.monthIncome)} cobrados en total
        </p>
      </div>

      {m.overdueCount + m.dueCount > 0 && (
        <div className="card flex items-center gap-3 border-heat/40 bg-heat/10">
          <Flame className="shrink-0 text-heat" />
          <p className="text-sm">
            <b>{m.overdueCount + m.dueCount} equipo{m.overdueCount + m.dueCount === 1 ? '' : 's'}</b> necesitan servicio:
            <b className="text-heat"> {money(m.potentialIncome)}</b> esperando a que les escribas.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Equipos" value={m.equipmentCount} />
        <Stat label="Clientes" value={m.clientCount} />
        <Stat label="Vencidos" value={m.overdueCount} hot={m.overdueCount > 0} />
      </div>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Contactar hoy</h2>
        {data.today.length === 0 ? (
          m.equipmentCount === 0 ? (
            <Empty>
              <Snowflake className="mx-auto mb-2 text-ice" />
              Todavía no tienes equipos. Pega un sticker QR en un minisplit y regístralo.
              <Link to="/escanear" className="btn-ice mt-4 w-full"><ScanLine size={18} /> Registrar mi primer equipo</Link>
            </Empty>
          ) : <Empty>Nadie pendiente hoy. ¡Todo fresco! 🧊</Empty>
        ) : (
          <div className="space-y-3">{data.today.map((e) => <EquipmentCard key={e.id} e={e} onWhatsApp={send} />)}</div>
        )}
      </section>

      {data.soon.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">Próximos 30 días</h2>
          <div className="space-y-3">{data.soon.map((e) => <EquipmentCard key={e.id} e={e} onWhatsApp={send} />)}</div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <div className="card p-3">
      <p className={`font-display text-2xl font-bold ${hot ? 'text-heat' : ''}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
