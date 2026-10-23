// Hoja de stickers QR para imprimir en papel adherible tamaño carta.
import { useEffect, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Chips, ErrorBox, Loading, PageTitle } from '../components/ui';

interface Code { code: string; url: string; svg: string }

export default function Stickers() {
  const { user } = useAuth();
  const [count, setCount] = useState(12);
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = (n: number) => {
    setCodes(null); setError(null);
    api<{ codes: Code[] }>(`/qr/sheet?count=${n}`).then((r) => setCodes(r.codes)).catch((e) => setError(e.message));
  };
  useEffect(() => { load(count); }, [count]);

  return (
    <div>
      <div className="no-print">
        <PageTitle title="Stickers QR" subtitle="Cada código es único y queda a tu nombre" />
        <ErrorBox message={error} />
        <div className="mb-4 flex items-center justify-between gap-2">
          <Chips value={count} onChange={setCount} options={[{ label: '6', value: 6 }, { label: '12', value: 12 }, { label: '24', value: 24 }]} />
          <button className="btn-ghost min-h-10 px-3" onClick={() => load(count)} aria-label="Generar otros"><RefreshCw size={16} /></button>
        </div>
        <button className="btn-ice mb-5 w-full" onClick={() => window.print()} disabled={!codes}><Printer size={18} /> Imprimir hoja</button>
      </div>

      {!codes ? <Loading /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
          {codes.map((c) => (
            <div key={c.code} className="break-inside-avoid rounded-xl border-2 border-ice bg-white p-2 text-center text-[#0A0E14]">
              <p className="text-[10px] font-bold uppercase leading-tight">Escanea para garantía y servicio</p>
              <div className="mx-auto my-1 w-full max-w-[150px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
              <p className="font-mono text-xs font-bold">{c.code}</p>
              <p className="truncate text-[10px]">{user?.businessName || user?.name} · {user?.phone}</p>
              <p className="flex items-center justify-center gap-1 text-[8px] text-gray-500">
                <img src="/logo.svg" alt="" className="h-3 w-3" /> FrescoTrack · powered by KORENS
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
