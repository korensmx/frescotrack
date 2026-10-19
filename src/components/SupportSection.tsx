import React, { useState } from 'react';
import { 
  Headphones, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Video, 
  FileText, 
  Download, 
  HelpCircle, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare,
  Clock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import type { TechnicianProfile } from '../types';

interface SupportSectionProps {
  technician: TechnicianProfile;
}

export const SupportSection: React.FC<SupportSectionProps> = ({ technician }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const supportEmail = 'contacto@korensmx.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-sky-700/50">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-bold uppercase tracking-wider">
              <Headphones className="w-3.5 h-3.5 text-sky-400" />
              Soporte Oficial KORENS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Centro de Ayuda y Capacitación Técnica
            </h1>
            <p className="text-sky-200 text-sm max-w-xl">
              Estamos aquí para respaldar tu negocio de climatización. Consulta el video tutorial, descarga el manual oficial o contáctanos directamente.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <a
              href="/manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <ExternalLink className="w-4 h-4 text-sky-600" />
              <span>Abrir Visor Completo</span>
            </a>
            <a
              href="/Manual_Operacion_FrescoTrack_KORENS.pdf"
              download="Manual_Operacion_FrescoTrack_KORENS.pdf"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Official Support Contact Card (contacto@korensmx.com) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-sky-100 shadow-md hover:border-sky-300 transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Mail className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Canal Directo de Asistencia
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Respuesta prioritaria
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                ¿Tienes alguna duda técnica o necesitas soporte?
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Cualquier duda, solicitud de funciones o soporte técnico, puedes escribirnos directamente a:
              </p>
              
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a 
                  href={`mailto:${supportEmail}?subject=Soporte%20FrescoTrack%20-%20${encodeURIComponent(technician.businessName)}`}
                  className="inline-flex items-center gap-2 font-mono font-black text-base sm:text-lg text-sky-700 hover:text-sky-800 bg-sky-50 px-3.5 py-1.5 rounded-xl border border-sky-200 hover:bg-sky-100 transition-colors"
                >
                  <Mail className="w-4 h-4 text-sky-600" />
                  <span>{supportEmail}</span>
                </a>

                <button
                  onClick={handleCopyEmail}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Copiar correo al portapapeles"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <a
            href={`mailto:${supportEmail}?subject=Soporte%20FrescoTrack%20-%20${encodeURIComponent(technician.businessName)}`}
            className="w-full md:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all self-stretch md:self-center"
          >
            <span>Redactar Correo a Soporte</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 3. Embedded Video Tutorial Section */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">
                Manual en Video: ¿Cómo operar FrescoTrack?
              </h3>
              <p className="text-xs text-slate-400">
                Aprende en 2 minutos con locución clara y subtítulos guiados.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full">
            1080p Full HD
          </span>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video 
            controls 
            playsInline 
            className="w-full h-full max-h-[500px]"
            poster="/manual-pages/page_1_preview.png"
          >
            <source src="/Manual_Video_FrescoTrack_KORENS.mp4" type="video/mp4" />
            Tu navegador no soporta el video HTML5.
          </video>
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Creado y grabado exclusivamente por <strong>KORENS®</strong> para capacitación técnica.</span>
          </div>
          <a 
            href="/Manual_Video_FrescoTrack_KORENS.mp4" 
            download="Manual_Video_FrescoTrack_KORENS.mp4"
            className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar archivo de video (4.3 MB)</span>
          </a>
        </div>
      </div>

      {/* 4. Manual PDF Interactive Links & Chapters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Descargar y Abrir PDF */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Manual Escrito 10 Páginas
              </span>
              <h4 className="text-base font-black text-slate-900 mt-1">
                Manual Oficial de Operación FrescoTrack
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Incluye capturas de pantalla, explicaciones pedagógicas sencillas, el semáforo de clientes, registro en 45 segundos y tarifario de 10 niveles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <a
              href="/Manual_Operacion_FrescoTrack_KORENS.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver PDF en Navegador</span>
            </a>
            <a
              href="/Manual_Operacion_FrescoTrack_KORENS.pdf"
              download="Manual_Operacion_FrescoTrack_KORENS.pdf"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              title="Descargar archivo PDF"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Card 2: Visor Web Interactivo */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-200">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Visor Interactivo Web
              </span>
              <h4 className="text-base font-black text-slate-900 mt-1">
                Visor de Páginas y Reproductor
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Ideal para ver desde cualquier dispositivo móvil o computadora sin necesidad de instalar lectores de PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <a
              href="/manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Visor Interactivo</span>
            </a>
          </div>
        </div>

      </div>

      {/* 5. Quick Support FAQ */}
      <div className="bg-slate-100/80 rounded-3xl p-6 border border-slate-200 space-y-4">
        <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-600" />
          Preguntas Frecuentes Rápidas
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">¿Cómo vinculo mi WhatsApp para el cobro de 6 meses?</p>
            <p className="text-slate-600">
              Ve a la pestaña <strong>WhatsApp Web</strong>, escanea el código QR desde tu celular y listo. A las 9:00 AM el robot mandará los recordatorios automáticamente.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">¿Mis stickers QR se pueden duplicar con otro técnico?</p>
            <p className="text-slate-600">
              <strong>No.</strong> Gracias al motor multi-tenant de KORENS, cada técnico tiene su prefijo único irrepetible.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">¿Dónde configuro mis precios de climas Inverter?</p>
            <p className="text-slate-600">
              En la pestaña <strong>Ajustes & Tarifas</strong> tienes las 10 capacidades configurables de forma independiente.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">¿Dónde solicito una nueva función o soporte técnico?</p>
            <p className="text-slate-600">
              Escríbenos directamente a <strong>contacto@korensmx.com</strong> y nuestro equipo técnico te atenderá con gusto.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
