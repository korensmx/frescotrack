import React, { useState } from 'react';
import { QrCode, Search, Sparkles, Camera, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { Equipment } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipments: Equipment[];
  onSelectEquipment: (equipment: Equipment) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  equipments,
  onSelectEquipment,
}) => {
  if (!isOpen) return null;

  const [inputFolio, setInputFolio] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputFolio.trim().toUpperCase();
    if (!clean) return;

    const found = equipments.find((eq) => eq.qrId.toUpperCase() === clean);
    if (found) {
      onSelectEquipment(found);
      onClose();
    } else {
      setErrorMsg(`No se encontró ningún equipo con el folio "${clean}". Revisa el sticker.`);
    }
  };

  const handleQuickPick = (eq: Equipment) => {
    onSelectEquipment(eq);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500 text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">
                Escanear Sticker del Minisplit
              </h3>
              <p className="text-xs text-slate-300">
                Abre el carnet de salud y garantía del equipo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Scanner Simulation Frame */}
        <div className="p-5 space-y-4">
          <div className="relative bg-slate-900 rounded-2xl p-6 text-center text-white overflow-hidden border border-slate-800">
            {/* Viewfinder crosshairs */}
            <div className="w-40 h-40 mx-auto border-2 border-sky-400 rounded-2xl relative flex items-center justify-center bg-black/30">
              <span className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-sky-400 rounded-tl-lg"></span>
              <span className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-sky-400 rounded-tr-lg"></span>
              <span className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-sky-400 rounded-bl-lg"></span>
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-sky-400 rounded-br-lg"></span>
              
              {/* Scan laser animation */}
              <div className="w-full h-0.5 bg-sky-400 absolute animate-pulse shadow-md shadow-sky-400"></div>

              <div className="text-center space-y-1">
                <Camera className="w-8 h-8 text-sky-400 mx-auto animate-pulse" />
                <span className="text-[10px] text-sky-200 font-bold block">
                  Cámara Lista
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-3 font-medium">
              Apunta la cámara al código QR de la etiqueta pegada en el minisplit
            </p>
          </div>

          {/* Manual Folio Entry Form */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              O ingresa el Folio manualmente:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputFolio}
                onChange={(e) => {
                  setInputFolio(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                placeholder="Ej. FT-0041"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl flex items-center gap-1 shadow-md shadow-sky-600/20"
              >
                <span>Buscar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </form>

          {/* Quick Demo Folios */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Equipos de Demostración (Tampico):
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {equipments.map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => handleQuickPick(eq)}
                  className="w-full p-2 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left flex items-center justify-between text-xs transition-all group"
                >
                  <div className="truncate">
                    <span className="font-mono font-bold text-slate-900 group-hover:text-sky-700 mr-2">
                      {eq.qrId}
                    </span>
                    <span className="text-slate-600">{eq.clientName}</span>
                    <span className="text-slate-400 text-[10px] ml-1">({eq.brand} {eq.capacity})</span>
                  </div>
                  <span className="text-sky-600 font-bold text-[10px] group-hover:translate-x-0.5 transition-transform">
                    Abrir →
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
