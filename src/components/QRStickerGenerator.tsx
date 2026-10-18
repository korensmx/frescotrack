import React, { useState, useEffect } from 'react';
import { Printer, QrCode, Sparkles, RefreshCw, Layers, Check, Download, ShieldCheck, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Equipment, TechnicianProfile } from '../types';
import { formatDisplayPhone } from '../utils/whatsapp';
import { processArrayAsync } from '../utils/asyncTasks';

interface StickerItem {
  folio: string;
  url: string;
  isRegistered: boolean;
  equipment?: Equipment;
}

interface QRStickerGeneratorProps {
  technician: TechnicianProfile;
  equipments: Equipment[];
  onOpenPublicQR: (equipment: Equipment) => void;
}

export const QRStickerGenerator: React.FC<QRStickerGeneratorProps> = ({
  technician,
  equipments,
  onOpenPublicQR,
}) => {
  const [batchMode, setBatchMode] = useState<'new_batch' | 'registered'>('new_batch');
  const [batchCount, setBatchCount] = useState<number>(12);
  const [startFolioNum, setStartFolioNum] = useState<number>(101);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate batch asynchronously to never block main thread / UI rendering
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    type RawStickerItem = { folio: string; isRegistered: boolean; equipment?: Equipment };

    const rawItems: RawStickerItem[] = batchMode === 'new_batch'
      ? Array.from({ length: batchCount }, (_, i) => ({
          folio: `FT-${String(startFolioNum + i).padStart(4, '0')}`,
          isRegistered: false,
          equipment: undefined,
        }))
      : equipments.slice(0, batchCount).map((eq) => ({
          folio: eq.qrId,
          isRegistered: true,
          equipment: eq,
        }));

    processArrayAsync<RawStickerItem, StickerItem>(
      rawItems,
      6,
      (item: RawStickerItem) => ({
        folio: item.folio,
        url: `${window.location.origin}/equipo/${item.folio}`,
        isRegistered: item.isRegistered,
        equipment: item.equipment,
      })
    ).then((results: StickerItem[]) => {
      if (isMounted) {
        setStickers(results);
        setIsGenerating(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [batchMode, batchCount, startFolioNum, equipments]);

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = () => {
    setStartFolioNum(Math.floor(100 + Math.random() * 8000));
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header (Hidden on print) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-100 text-sky-700 font-black">
                <Printer className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Generador de Plantilla de Stickers QR
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Imprime lotes de etiquetas físicas listas para pegar en el costado de los minisplits
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-600/25 transition-all"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Imprimir Plantilla ({batchCount} Stickers)</span>
            </button>
          </div>
        </div>

        {/* Batch Options */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Modo de Lote:
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 font-bold">
              <button
                type="button"
                onClick={() => setBatchMode('new_batch')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                  batchMode === 'new_batch'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Lote de Nuevos Folios
              </button>
              <button
                type="button"
                onClick={() => setBatchMode('registered')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                  batchMode === 'registered'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Equipos Registrados ({equipments.length})
              </button>
            </div>
          </div>

          {batchMode === 'new_batch' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Folio Inicial:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={startFolioNum}
                  onChange={(e) => setStartFolioNum(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs"
                />
                <button
                  type="button"
                  onClick={handleRegenerate}
                  title="Cambiar folios aleatorios"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Cantidad por Hoja:
            </label>
            <div className="flex items-center gap-1">
              {[6, 12, 18].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBatchCount(c)}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs transition-all ${
                    batchCount === c
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c} etiquetas
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tip alert */}
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <span className="text-base shrink-0">💡</span>
          <div>
            <strong className="font-bold">Consejo de Campo para Técnicos en Tampico:</strong>
            <p className="mt-0.5 text-amber-800">
              Imprime esta hoja en papel vinil adhesivo o papel adherible y lleva 1 planilla en tu maletín de herramientas. En cada instalación o mantenimiento preventivo, pega el sticker al costado visible del evaporador.
            </p>
          </div>
        </div>
      </div>

      {/* PRINTABLE SHEET AREA */}
      <div className="print-sheet bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-md">
        
        {/* Printable Header */}
        <div className="mb-6 text-center border-b border-slate-200 pb-3">
          <div className="flex items-center justify-center gap-2">
            <span className="font-black text-xl text-slate-900 tracking-tight">
              Fresco<span className="text-sky-600">Track</span> ❄️
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              | Plantilla de Etiquetas QR de Climas
            </span>
          </div>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            {technician.businessName} · {technician.name} · WhatsApp: {formatDisplayPhone(technician.phone)}
          </p>
        </div>

        {/* Sticker Grid (Formatted for standard Letter / Sticker adhesive sheet: 2 cols on mobile, 3 or 4 on desktop/print) */}
        {isGenerating && stickers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Generando lote de etiquetas en segundo plano...</p>
            <p className="text-xs text-slate-500">Optimizando folios y códigos QR sin bloquear el navegador</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-4">
            {stickers.map((item, idx) => {
              const folio = item.folio;
              const targetUrl = item.url;
              const eqData = item.equipment;

              return (
                <div
                  key={folio || idx}
                  className="relative bg-white border-2 border-dashed border-slate-300 rounded-2xl p-3.5 flex flex-col justify-between hover:border-sky-500 transition-colors shadow-2xs"
                  style={{ breakInside: 'avoid' }}
                >
                  {/* Sticker Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">❄️</span>
                      <span className="font-black text-xs text-slate-900 tracking-tight">
                        FRESCOTRACK
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                      {folio}
                    </span>
                  </div>

                  {/* Main QR Code & Message */}
                  <div className="my-2.5 flex items-center gap-3">
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                      <QRCodeSVG
                        value={targetUrl}
                        size={82}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-800 leading-tight">
                        Escanea para garantía y soporte de tu clima
                      </p>
                      <p className="text-[10px] text-slate-600 font-medium">
                        {technician.businessName}
                      </p>
                      <p className="text-[9px] text-sky-700 font-bold">
                        WhatsApp: {formatDisplayPhone(technician.phone)}
                      </p>
                    </div>
                  </div>

                  {/* Sticker Footer Notice */}
                  <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                    {eqData ? (
                      <span className="truncate max-w-[170px] text-slate-700">
                        {eqData.clientName} ({eqData.brand})
                      </span>
                    ) : (
                      <span>Pega en carcasa del clima</span>
                    )}
                    <span className="text-[8px] uppercase tracking-wider text-slate-400">
                      Tampico
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer print note */}
        <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 font-medium">
          Sistema FrescoTrack B2B · Código abierto para técnicos independientes · Tampico, Madero, Altamira
        </div>
      </div>
    </div>
  );
};
