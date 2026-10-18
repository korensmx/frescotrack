import React, { useState } from 'react';
import { 
  MessageSquare, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Check, 
  QrCode, 
  Wrench, 
  Copy, 
  ExternalLink,
  Zap,
  Wind
} from 'lucide-react';
import type { Equipment, TechnicianProfile, ContactStatus } from '../types';
import { formatDate, getEquipmentServiceStatus } from '../utils/dates';
import { buildPreventiveWhatsAppMessage, createWhatsAppUrl } from '../utils/whatsapp';

interface EquipmentCardProps {
  equipment: Equipment;
  technician: TechnicianProfile;
  onViewPublicQR: (equipment: Equipment) => void;
  onRenewService: (equipment: Equipment) => void;
  onUpdateContactStatus: (equipmentId: string, status: ContactStatus) => void;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  technician,
  onViewPublicQR,
  onRenewService,
  onUpdateContactStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const { status, statusLabel, badgeClass } = getEquipmentServiceStatus(equipment);

  const whatsappMessage = buildPreventiveWhatsAppMessage(equipment, technician);
  const whatsappUrl = createWhatsAppUrl(equipment.clientPhone, whatsappMessage);

  const handleCopyMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cycleText = equipment.reminderIntervalMonths === 6
    ? 'Ciclo 6 meses'
    : equipment.reminderIntervalMonths === 4
    ? 'Ciclo 4 meses (Salitre)'
    : equipment.reminderIntervalMonths === 3
    ? 'Ciclo 3 meses (Comercial)'
    : `Ciclo ${equipment.reminderIntervalMonths} meses`;

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
      status === 'overdue'
        ? 'border-rose-300 ring-1 ring-rose-100'
        : status === 'upcoming'
        ? 'border-amber-300'
        : 'border-slate-200'
    }`}>
      {/* Top Card Bar with Folio & Status Badge */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white flex items-center gap-1">
            <QrCode className="w-3 h-3 text-sky-400" />
            {equipment.qrId}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 hidden xs:inline">
            {cycleText}
          </span>
        </div>

        {/* Dynamic Status Traffic Light Badge */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badgeClass}`}>
            {status === 'overdue' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>}
            {status === 'upcoming' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
            {status === 'ok' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-4 sm:p-5">
        {/* Customer Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-lg text-slate-900 tracking-tight leading-snug">
              {equipment.clientName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium truncate max-w-[240px] sm:max-w-[320px]">
                {equipment.clientColonia}
              </span>
            </div>
          </div>

          {/* Quick Call Button */}
          <a
            href={`tel:${equipment.clientPhone}`}
            title={`Llamar a ${equipment.clientName}`}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
          >
            <Phone className="w-4 h-4 text-sky-600" />
          </a>
        </div>

        {/* Multidimensional Equipment Spec Box */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center gap-1.5">
          {/* Appliance Type Badge */}
          <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 font-extrabold text-[11px] flex items-center gap-1">
            <Wind className="w-3 h-3 text-sky-600" />
            {equipment.applianceType || 'Minisplit'}
          </span>

          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-[11px]">
            {equipment.brand}
          </span>

          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-[11px]">
            {equipment.capacity}
          </span>

          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
            ⚡ {equipment.voltage || '220V'}
          </span>

          {equipment.inverter ? (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 text-emerald-500" />
              Inverter
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[10px]">
              Normal
            </span>
          )}

          <span className="text-xs font-semibold text-slate-700 ml-auto flex items-center gap-1">
            📍 {equipment.location}
          </span>
        </div>

        {/* Service Details & Fee */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Último: <strong className="text-slate-800">{formatDate(equipment.lastServiceDate)}</strong></span>
          </div>
          <div className="flex items-center justify-end gap-1 font-bold text-slate-900 text-right">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 -mr-1" />
            <span>${equipment.suggestedPrice} MXN sugerido</span>
          </div>
        </div>

        {/* Contact Status Selector */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Estado de Cobranza:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => onUpdateContactStatus(equipment.id, 'pending')}
              className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                equipment.contactedStatus === 'pending'
                  ? 'bg-white text-slate-800 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pendiente
            </button>
            <button
              onClick={() => onUpdateContactStatus(equipment.id, 'contacted')}
              className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                equipment.contactedStatus === 'contacted'
                  ? 'bg-amber-100 text-amber-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Contactado
            </button>
            <button
              onClick={() => onUpdateContactStatus(equipment.id, 'scheduled')}
              className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                equipment.contactedStatus === 'scheduled'
                  ? 'bg-emerald-100 text-emerald-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Agendado
            </button>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="mt-4 space-y-2">
          {/* ⭐ STAR BUTTON: Giant WhatsApp Reminder Button */}
          <div className="flex items-stretch gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (equipment.contactedStatus === 'pending') {
                  onUpdateContactStatus(equipment.id, 'contacted');
                }
              }}
              className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-white font-extrabold py-3 px-4 rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <MessageSquare className="w-5 h-5 fill-white stroke-none" />
              <span>Enviar WhatsApp de Recordatorio</span>
            </a>

            {/* Quick Copy Message Text */}
            <button
              onClick={handleCopyMessage}
              title="Copiar texto del mensaje"
              className="px-3 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 transition-all flex items-center justify-center shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onRenewService(equipment)}
              className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-sky-200/60"
            >
              <Wrench className="w-3.5 h-3.5 text-sky-600" />
              <span>Hice servicio hoy</span>
            </button>

            <button
              onClick={() => onViewPublicQR(equipment)}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Ver Carnet QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
