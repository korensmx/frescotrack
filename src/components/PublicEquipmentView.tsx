import React, { useState } from 'react';
import { 
  X, 
  Snowflake, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Calendar, 
  Wrench, 
  Check, 
  Share2, 
  Zap, 
  Wind,
  Phone
} from 'lucide-react';
import type { Equipment, TechnicianProfile } from '../types';
import { formatDate, getEquipmentServiceStatus } from '../utils/dates';
import { buildClientHelpWhatsAppMessage, createWhatsAppUrl, formatDisplayPhone } from '../utils/whatsapp';

interface PublicEquipmentViewProps {
  equipment: Equipment;
  technician: TechnicianProfile;
  onClose: () => void;
}

export const PublicEquipmentView: React.FC<PublicEquipmentViewProps> = ({
  equipment,
  technician,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const { status, daysDiff } = getEquipmentServiceStatus(equipment);

  const clientWhatsAppMsg = buildClientHelpWhatsAppMessage(
    equipment, 
    technician, 
    status === 'overdue' ? 'mantenimiento' : 'revision'
  );
  const clientWhatsAppUrl = createWhatsAppUrl(technician.phone, clientWhatsAppMsg);

  const publicUrl = `${window.location.origin}/equipo/${equipment.qrId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print">
      {/* Mobile Device Mockup Frame */}
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Public Header Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {technician.logoUrl ? (
              <img 
                src={technician.logoUrl} 
                alt="Logo" 
                className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-black">
                <Snowflake className="w-4 h-4 animate-pulse-subtle" />
              </div>
            )}
            <div>
              <span className="font-black text-sm tracking-tight text-white block">
                {technician.businessName}
              </span>
              <p className="text-[10px] text-sky-300 font-medium">
                Carnet Digital de Garantía y Servicio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copiar enlace de este carnet"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold hidden xs:inline">{copiedLink ? 'Copiado' : 'Compartir'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          
          {/* Folio Tag & Equipment Header */}
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-mono font-bold text-xs text-slate-800 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              FOLIO DE GARANTÍA: {equipment.qrId}
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {equipment.brand} {equipment.capacity}
            </h2>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <span>{equipment.applianceType || 'Minisplit'}</span>
              <span>·</span>
              <span>⚡ {equipment.voltage || '220V'}</span>
              <span>·</span>
              <span>{equipment.systemType || (equipment.inverter ? 'Inverter' : 'Normal')}</span>
            </div>
            <p className="text-xs text-slate-400">
              📍 {equipment.location} · {equipment.clientColonia}
            </p>
          </div>

          {/* Traffic Light State (Semáforo de Estado) */}
          {status === 'overdue' ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-300 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                <span>¡Requiere Mantenimiento Preventivo Pronto!</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Tu {equipment.applianceType || 'equipo'} cumplió su ciclo recomendado de <strong>{equipment.reminderIntervalMonths} meses</strong>. En la humedad y calor de la zona conurbada, filtros sucios y serpentines tapados aumentan tu <strong>recibo de CFE hasta un 35%</strong> y sobrecalientan el compresor.
              </p>
              <div className="text-[11px] font-bold text-rose-800 pt-1 flex items-center gap-1">
                <span>⚠️ Vencido hace {daysDiff} días</span>
              </div>
            </div>
          ) : status === 'upcoming' ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
                <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Próximo a Mantenimiento Programado</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Su ciclo preventivo está por vencer. Agenda tu servicio con anticipación para mantener tu garantía y eficiencia al máximo.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Equipo al 100% · Al Corriente</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Este equipo cuenta con servicio reciente. Está operando en condiciones óptimas de eficiencia energética, bajo consumo y aire purificado.
              </p>
            </div>
          )}

          {/* Ficha Técnica Multidimensional */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Ficha Técnica del Equipo
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold">APARATO</span>
                <span className="font-extrabold text-slate-900">{equipment.applianceType || 'Minisplit'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold">VOLTAJE</span>
                <span className="font-extrabold text-slate-900">⚡ {equipment.voltage || '220V'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold">CAPACIDAD</span>
                <span className="font-extrabold text-slate-900">{equipment.capacity}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold">TECNOLOGÍA</span>
                <span className="font-extrabold text-slate-900">
                  {equipment.systemType || (equipment.inverter ? 'Inverter' : 'Normal')}
                </span>
              </div>
            </div>
          </div>

          {/* Maintenance History */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Historial de Mantenimientos</span>
              <span className="text-slate-500 font-semibold">{equipment.servicesHistory.length} registros</span>
            </h4>

            <div className="space-y-2">
              {equipment.servicesHistory.map((service, index) => (
                <div 
                  key={service.id || index}
                  className="bg-white p-3 rounded-2xl border border-slate-200 text-xs shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-sky-600" />
                      {service.type}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {formatDate(service.date)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {service.technicalNotes}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                    <span>Técnico: <strong className="text-slate-700">{service.technicianName}</strong></span>
                    {service.warrantyDays && (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Garantía: {service.warrantyDays} días
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technician Business Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-3">
            <div className="flex items-center gap-3">
              {technician.logoUrl ? (
                <img 
                  src={technician.logoUrl} 
                  alt="Logo" 
                  className="w-12 h-12 rounded-2xl object-contain bg-white p-1 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                  ❄️
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-base text-white">
                    {technician.businessName}
                  </h4>
                  <span className="bg-sky-400/20 text-sky-300 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    Certificado
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {technician.name} · {technician.city}
                </p>
                <p className="text-xs text-sky-300 font-bold mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {formatDisplayPhone(technician.phone)}
                </p>
              </div>
            </div>

            {/* ⭐ GIANT GREEN WHATSAPP BUTTON FOR CLIENT */}
            <div>
              <a
                href={clientWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all text-center"
              >
                <MessageSquare className="w-5 h-5 fill-white stroke-none shrink-0" />
                <span>¿Falla, gotea o no enfría? Pedir Revisión por WhatsApp</span>
              </a>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Al hacer clic, el mensaje ya incluirá los datos de tu {equipment.applianceType || 'clima'} automáticamente.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
