// Piezas pequeñas que se repiten en varias pantallas.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone } from 'lucide-react';
import { daysLabel, money, waLink, type Equipment, type Status } from '../api';

const STATUS_STYLE: Record<Status, string> = {
  overdue: 'bg-heat/15 text-heat border-heat/40',
  due: 'bg-warn/15 text-warn border-warn/40',
  soon: 'bg-ice/10 text-ice border-ice/30',
  ok: 'bg-ok/10 text-ok border-ok/30',
};

export function StatusPill({ status, days }: { status: Status; days: number }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {daysLabel(days)}
    </span>
  );
}

export function EquipmentCard({ e, onWhatsApp }: { e: Equipment; onWhatsApp?: (e: Equipment) => void }) {
  return (
    <div className={`card ${e.status === 'overdue' ? 'border-heat/40' : ''}`}>
      <Link to={`/equipos/${e.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{e.clientName}</p>
            <p className="truncate text-sm text-muted">
              {[e.brand, e.tons, e.location].filter(Boolean).join(' · ') || 'Minisplit'}
            </p>
          </div>
          <StatusPill status={e.status} days={e.daysLeft} />
        </div>
        <p className="mt-2 text-sm text-muted">
          Servicio sugerido: <span className="font-semibold text-text">{money(e.price)}</span>
          {e.lastReminderAt && <span className="ml-2 text-ok">· Ya se le escribió</span>}
        </p>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {onWhatsApp ? (
          <button className="btn-wa" onClick={() => onWhatsApp(e)}><MessageCircle size={18} /> WhatsApp</button>
        ) : (
          <a className="btn-wa" href={waLink(e.clientPhone)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
        )}
        <a className="btn-ghost" href={`tel:+52${e.clientPhone}`}><Phone size={18} /> Llamar</a>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading() {
  return <div className="py-16 text-center text-muted">Cargando…</div>;
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="mb-3 rounded-xl border border-heat/40 bg-heat/10 p-3 text-sm text-heat">{message}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-muted">{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Chips<T extends string | number>({ options, value, onChange }: {
  options: { label: string; value: T }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button type="button" key={String(o.value)} className={value === o.value ? 'chip-on' : 'chip'} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Logo de FrescoTrack: el ícono + el nombre.
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/logo.svg" alt="" width={size} height={size} className="rounded-[22%]" />
      <span className="font-display font-bold tracking-tight" style={{ fontSize: size * 0.62 }}>
        Fresco<span className="text-ice">Track</span>
      </span>
    </span>
  );
}

// Sello "powered by KORENS".
export function PoweredBy({ className = '' }: { className?: string }) {
  return (
    <a href="https://korensmx.com" target="_blank" rel="noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs text-muted ${className}`}>
      <span>FrescoTrack is powered by</span>
      <img src="/korens-mark.png" alt="" className="h-4 w-auto" />
      <span className="font-display font-bold tracking-wider text-text">KORENS</span>
    </a>
  );
}
