import React, { useState } from 'react';
import { X, Wrench, DollarSign, Check, Sparkles, Gauge } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Equipment, ServiceType, TechnicianProfile } from '../types';

interface QuickServiceModalProps {
  equipment: Equipment | null;
  technician: TechnicianProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirmService: (
    equipmentId: string, 
    serviceData: {
      cost: number;
      type: ServiceType;
      technicalNotes: string;
      pressurePSI: string;
      refrigerantType: string;
      technicianName: string;
    }
  ) => void;
}

export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
  equipment,
  technician,
  isOpen,
  onClose,
  onConfirmService,
}) => {
  if (!isOpen || !equipment) return null;

  const [cost, setCost] = useState<number>(equipment.suggestedPrice || technician.pricing?.baseMinisplit || 750);
  const [type, setType] = useState<ServiceType>('Mantenimiento Preventivo');
  const [pressurePSI, setPressurePSI] = useState('118 PSI');
  const [refrigerantType, setRefrigerantType] = useState('R410A');
  const [notes, setNotes] = useState('Lavado con hidrolavadora a presión, turbina desinfectada, presiones y amperaje verificados al 100%.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmService(equipment.id, {
      cost: Number(cost) || 750,
      type,
      technicalNotes: notes,
      pressurePSI,
      refrigerantType,
      technicianName: technician.name,
    });

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#25D366', '#f59e0b'],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base">
                Registrar Servicio Completado Hoy
              </h3>
              <p className="text-xs text-emerald-100">
                Renueva automáticamente el ciclo de 6 meses
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

        {/* Target Info */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-900 block">{equipment.clientName}</span>
            <span className="text-slate-500">{equipment.brand} {equipment.capacity} · {equipment.location}</span>
          </div>
          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
            {equipment.qrId}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Service Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tipo de Servicio Realizado:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Mantenimiento Preventivo', 'Carga de Gas', 'Reparación de Falla', 'Diagnóstico Técnico'] as ServiceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                    type === t
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Monto Cobrado (MXN):
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                step="50"
                required
                className="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-base font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div className="flex gap-1.5 mt-1">
              {[700, 750, 850, 900, 1200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCost(amt)}
                  className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Technical Data (Pressure & Gas) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Presión de Gas:
              </label>
              <input
                type="text"
                value={pressurePSI}
                onChange={(e) => setPressurePSI(e.target.value)}
                placeholder="115 - 120 PSI"
                className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tipo Refrigerante:
              </label>
              <select
                value={refrigerantType}
                onChange={(e) => setRefrigerantType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
              >
                <option value="R410A">R410A (Ecológico)</option>
                <option value="R22">R22 (Convencional)</option>
                <option value="R32">R32 (Nueva gen)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notas para la Bitácora Digital:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Guardar Servicio y Renovar Ciclo de 6 Meses</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
