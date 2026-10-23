// Lo que ve el cliente final cuando escanea el sticker con su cámara (sin cuenta).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle, ShieldCheck, Wrench, AlertTriangle } from 'lucide-react';
import { prettyDate, waLink } from '../api';
import { Loading, Logo, PoweredBy } from '../components/ui';

interface PublicData {
  qrCode: string; brand: string; tons: string; location: string; clientFirstName: string;
  lastServiceDate: string; nextServiceDate: string; status: 'overdue' | 'ok';
  technician: { name: string; businessName: string; phone: string; city: string };
  services: { date: string; type: string; notes: string }[];
}

export default function PublicEquipment() {
  const { code } = useParams();
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/equipment/${encodeURIComponent(code || '')}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message || 'No encontramos este sticker'));
  }, [code]);

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6">
      <div className="mb-5 flex justify-center"><Logo size={34} /></div>
      {error ? (
        <div className="card text-center">
          <AlertTriangle className="mx-auto text-warn" />
          <p className="mt-2 font-semibold">{error}</p>
          <p className="mt-1 text-sm text-muted">Si eres técnico, entra a FrescoTrack y escanéalo desde la app para registrarlo.</p>
        </div>
      ) : !data ? <Loading /> : (
        <div className="space-y-4">
          <div className={`card text-center ${data.status === 'ok' ? 'border-ok/40' : 'border-heat/50'}`}>
            {data.status === 'ok' ? <ShieldCheck className="mx-auto text-ok" size={40} /> : <AlertTriangle className="mx-auto text-heat" size={40} />}
            <h1 className="mt-2 font-display text-2xl font-bold">{data.status === 'ok' ? 'Tu clima está al día' : 'Tu clima necesita mantenimiento'}</h1>
            <p className="text-muted">Hola {data.clientFirstName}. {data.status === 'ok' ? `Próximo servicio: ${prettyDate(data.nextServiceDate)}` : `Le tocaba el ${prettyDate(data.nextServiceDate)}`}</p>
          </div>

          <a className="btn-wa w-full py-4 text-lg"
            href={waLink(data.technician.phone, `Hola ${data.technician.name.split(' ')[0]}, te escribo por mi minisplit ${[data.brand, data.tons].filter(Boolean).join(' ')} (${data.location}), sticker ${data.qrCode}. Necesito una revisión.`)}
            target="_blank" rel="noreferrer">
            <MessageCircle /> ¿Falla, gotea o no enfría? Pedir revisión
          </a>

          <div className="card">
            <p className="text-xs font-semibold tracking-widest text-ice">{data.qrCode}</p>
            <p className="font-display text-lg font-semibold">{[data.brand, data.tons].filter(Boolean).join(' ') || 'Minisplit'}</p>
            <p className="text-sm text-muted">{data.location} · Último servicio {prettyDate(data.lastServiceDate)}</p>
          </div>

          <div className="card">
            <p className="mb-2 font-semibold">Bitácora de servicios</p>
            <ul className="space-y-2">
              {data.services.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm"><Wrench size={16} className="mt-0.5 shrink-0 text-ice" />
                  <span><b>{s.type}</b> · {prettyDate(s.date)}{s.notes && <span className="block text-muted">{s.notes}</span>}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <p className="text-xs text-muted">Tu técnico</p>
            <p className="font-semibold">{data.technician.businessName || data.technician.name}</p>
            <p className="text-sm text-muted">{data.technician.name}{data.technician.city ? ` · ${data.technician.city}` : ''}</p>
          </div>
        </div>
      )}
      <div className="mt-8 text-center"><PoweredBy /></div>
    </div>
  );
}
