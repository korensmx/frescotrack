import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Power, 
  Send, 
  ShieldCheck, 
  Wifi, 
  Battery, 
  Clock, 
  Bell, 
  Sparkles, 
  Server, 
  Settings, 
  Check, 
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import type { 
  TechnicianProfile, 
  WhatsAppIntegrationSettings, 
  WhatsAppConnectionStatus, 
  WhatsAppDeviceInfo 
} from '../types';
import { formatDisplayPhone } from '../utils/whatsapp';

interface WhatsAppQRModuleProps {
  technician: TechnicianProfile;
  settings: WhatsAppIntegrationSettings;
  onUpdateSettings: (newSettings: WhatsAppIntegrationSettings) => void;
}

export const WhatsAppQRModule: React.FC<WhatsAppQRModuleProps> = ({
  technician,
  settings,
  onUpdateSettings,
}) => {
  // Session countdown timer for QR code validity (similar to WhatsApp Web 45s cycle)
  const [countdown, setCountdown] = useState<number>(45);
  const [qrToken, setQrToken] = useState<string>(() => `2@${Date.now()}_FT_${Math.random().toString(36).substring(2, 9)}`);
  const [isGeneratingQR, setIsGeneratingQR] = useState<boolean>(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<boolean>(false);
  
  // Test message sending state
  const [testPhone, setTestPhone] = useState<string>(technician.phone || '8331234567');
  const [testMessage, setTestMessage] = useState<string>(
    `❄️ ¡Hola! Esta es una prueba de vinculación exitosa desde FrescoTrack para ${technician.businessName}. Tu WhatsApp Business está conectado y listo para enviar alertas automáticas.`
  );
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testSentSuccess, setTestSentSuccess] = useState<boolean>(false);

  // Advanced Server Config state
  const [serverUrl, setServerUrl] = useState<string>(settings.serverUrl || 'https://evolution.korensmx.com');
  const [instanceName, setInstanceName] = useState<string>(settings.instanceName || `frescotrack-${technician.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
  const [apiKey, setApiKey] = useState<string>(settings.apiKey || 'ft_live_korens_833_sec');

  // Countdown timer when waiting for scan
  useEffect(() => {
    let interval: any = null;
    if (settings.status === 'qrcode') {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Auto refresh QR code token
            setQrToken(`2@${Date.now()}_FT_${Math.random().toString(36).substring(2, 9)}`);
            return 45;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings.status]);

  // Handler to start linking process
  const handleStartLinking = () => {
    setIsGeneratingQR(true);
    setCountdown(45);
    setQrToken(`2@${Date.now()}_FT_${Math.random().toString(36).substring(2, 9)}`);
    
    // Simulate initial session handshake with Evolution API / Baileys
    setTimeout(() => {
      setIsGeneratingQR(false);
      onUpdateSettings({
        ...settings,
        status: 'qrcode',
      });
    }, 800);
  };

  // Handler to simulate real successful pairing
  const handleSimulateSuccessfulPairing = () => {
    const mockDevice: WhatsAppDeviceInfo = {
      phone: technician.phone || '8331234567',
      deviceName: 'Samsung Galaxy S24 (WhatsApp Business)',
      platform: 'android',
      batteryPercentage: 91,
      isCharging: true,
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };

    onUpdateSettings({
      ...settings,
      status: 'connected',
      device: mockDevice,
      serverUrl,
      instanceName,
      apiKey,
    });

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#25D366', '#0284c7', '#ffffff'],
    });
  };

  // Disconnect handler
  const handleDisconnect = () => {
    if (confirm('¿Estás seguro de desvincular este WhatsApp Business? Dejarán de enviarse los recordatorios automáticos.')) {
      onUpdateSettings({
        ...settings,
        status: 'disconnected',
        device: undefined,
      });
      setTestSentSuccess(false);
    }
  };

  // Send Test Message
  const handleSendTestMessage = () => {
    if (!testPhone.trim()) {
      alert('Ingresa un número de teléfono de 10 dígitos.');
      return;
    }

    setIsSendingTest(true);
    setTestSentSuccess(false);

    // Simulate sending payload through Evolution API / Baileys WebSocket
    setTimeout(() => {
      setIsSendingTest(false);
      setTestSentSuccess(true);
      setTimeout(() => setTestSentSuccess(false), 5000);
    }, 1200);
  };

  // Toggle automation rule
  const handleToggleRule = (key: keyof Pick<WhatsAppIntegrationSettings, 'autoSendOverdueReminders' | 'notifyOnCustomerIssueReport' | 'sendWelcomeOnNewEquipment'>) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  // Save server config
  const handleSaveServerConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      serverUrl,
      instanceName,
      apiKey,
    });
    alert('Configuración de servidor Evolution API guardada correctamente.');
  };

  return (
    <div className="space-y-6">
      {/* Module Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-md shadow-emerald-500/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Vinculación de WhatsApp Business
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Opción 2 · Código QR
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Conecta tu WhatsApp Business mediante "Dispositivos Vinculados" para automatizar la cobranza preventiva sin intermediarios
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {settings.status === 'connected' ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>WhatsApp Conectado</span>
              </span>
            ) : settings.status === 'qrcode' ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Esperando Escaneo ({countdown}s)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Desconectado</span>
              </span>
            )}
          </div>
        </div>

        {/* Benefits bar */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sin cobros por mensaje ni trámites con Meta</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Conserva tus chats y notas de voz en tu celular</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Alojado de forma segura en tu Dokploy</span>
          </div>
        </div>
      </div>

      {/* STATE 1: DISCONNECTED (Invitation to link) */}
      {settings.status === 'disconnected' && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-lg text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-[#25D366]/20 border border-[#25D366]/40 rounded-3xl flex items-center justify-center mx-auto text-[#25D366] shadow-lg shadow-emerald-500/10">
            <QrCode className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Vincula tu WhatsApp Business en 30 segundos
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Escanea el código con tu celular exactamente igual que cuando abres WhatsApp Web en tu laptop.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleStartLinking}
              disabled={isGeneratingQR}
              className="py-3 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 mx-auto shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              {isGeneratingQR ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Generando sesión en servidor...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5" />
                  <span>Generar Código QR de Vinculación</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Compatible con WhatsApp Business en Android y iPhone
          </p>
        </div>
      )}

      {/* STATE 2: QR CODE SCANNER WAITING (The Pairing Screen) */}
      {settings.status === 'qrcode' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <span>Escanea este código con tu celular</span>
            </h3>
            <p className="text-xs text-slate-500">
              El código se actualizará automáticamente en <strong className="text-sky-600">{countdown} segundos</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* The QR Box */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 relative group">
                <QRCodeSVG
                  value={qrToken}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md p-1.5 flex items-center justify-center border border-slate-100">
                    <span className="text-lg">❄️</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => {
                    setCountdown(45);
                    setQrToken(`2@${Date.now()}_FT_${Math.random().toString(36).substring(2, 9)}`);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refrescar Código</span>
                </button>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block">
                      Abre WhatsApp Business
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      En el celular de tu negocio de climas.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block">
                      Toca Menú (⋮) o Configuración (⚙️)
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      En la esquina superior derecha (Android) o inferior (iPhone).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block">
                      Selecciona "Dispositivos vinculados"
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Y pulsa el botón verde <strong>"Vincular un dispositivo"</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block">
                      Apunta la cámara al código QR
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Tu celular vibrará y la vinculación quedará completada.
                    </span>
                  </div>
                </div>
              </div>

              {/* Instant Simulator Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSimulateSuccessfulPairing}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Simular Escaneo Exitoso con mi Celular</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Pulsa aquí para activar la vinculación y ver el panel funcionando en vivo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: CONNECTED (Dashboard & Automated Rules) */}
      {settings.status === 'connected' && (
        <div className="space-y-6">
          {/* Connected Device Info Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {settings.device?.deviceName || 'WhatsApp Business en Celular'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Activo
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-600">
                    Número vinculado: {formatDisplayPhone(settings.device?.phone || technician.phone)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDisconnect}
                  className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-rose-200"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Desvincular Dispositivo</span>
                </button>
              </div>
            </div>

            {/* Live Telemetry details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Batería del Celular</span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800">
                  <Battery className="w-4 h-4 text-emerald-600" />
                  <span>{settings.device?.batteryPercentage || 91}% {settings.device?.isCharging ? '⚡ (Cargando)' : ''}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Conexión de Red</span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800">
                  <Wifi className="w-4 h-4 text-sky-600" />
                  <span>Wi-Fi Estable</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Última Sincronización</span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <span>{settings.device?.lastSyncAt || 'En línea'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Servidor Backend</span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-indigo-700">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Evolution API (Dokploy)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Message Dispatcher */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-base text-slate-900">
                  Probar Envío en Vivo desde tu WhatsApp Business
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Verifica que los mensajes salgan con tu número
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enviar prueba al teléfono (10 dígitos):
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="8331234567"
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensaje de prueba:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={isSendingTest}
                    className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {testSentSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>¡Mensaje enviado con éxito desde tu WhatsApp Business! (Doble palomita azul ✓✓)</span>
                </div>
                <span className="text-[10px] text-emerald-600 uppercase">Entregado</span>
              </div>
            )}
          </div>

          {/* Automated Field Dispatch Rules */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-base text-slate-900">
                Reglas de Envío Automático (Sin tocar el celular)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Configura qué acciones debe ejecutar FrescoTrack automáticamente a través de tu sesión vinculada:
            </p>

            <div className="space-y-3 pt-1">
              {/* Rule 1: Overdue auto reminders */}
              <div 
                onClick={() => handleToggleRule('autoSendOverdueReminders')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  settings.autoSendOverdueReminders 
                    ? 'bg-sky-50/50 border-sky-300' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-slate-900">
                      Cobranza Preventiva Automática (9:00 AM)
                    </strong>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Envía el mensaje de recordatorio de mantenimiento de 6 meses a los clientes vencidos de Tampico y Madero de lunes a sábado a las 9:00 AM.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  settings.autoSendOverdueReminders ? 'bg-sky-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {settings.autoSendOverdueReminders && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Rule 2: Alert on customer report */}
              <div 
                onClick={() => handleToggleRule('notifyOnCustomerIssueReport')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  settings.notifyOnCustomerIssueReport 
                    ? 'bg-emerald-50/50 border-emerald-300' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="space-y-1">
                  <strong className="text-xs font-bold text-slate-900">
                    Notificación Inmediata cuando un Cliente Reporta Falla por QR
                  </strong>
                  <p className="text-xs text-slate-600">
                    Cuando un cliente escanea el sticker en su pared y presiona "¿Falla o gotea?", tu WhatsApp recibe una notificación prioritaria con los datos exactos del equipo.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  settings.notifyOnCustomerIssueReport ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {settings.notifyOnCustomerIssueReport && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Rule 3: Welcome on new equipment */}
              <div 
                onClick={() => handleToggleRule('sendWelcomeOnNewEquipment')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  settings.sendWelcomeOnNewEquipment 
                    ? 'bg-indigo-50/50 border-indigo-300' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="space-y-1">
                  <strong className="text-xs font-bold text-slate-900">
                    Enviar Comprobante y Carnet Digital al Registrar Clima Nuevo
                  </strong>
                  <p className="text-xs text-slate-600">
                    En cuanto guardas un nuevo minisplit en FrescoTrack, le envía al cliente su carnet digital de salud y enlace QR de garantía por WhatsApp.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  settings.sendWelcomeOnNewEquipment ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {settings.sendWelcomeOnNewEquipment && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED DOKPLOY / EVOLUTION API CONFIGURATION ACCORDION */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
          className="w-full p-5 sm:p-6 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="text-sm font-black text-slate-900">
                Configuración del Servidor Backend (Dokploy panel.korensmx.com)
              </h4>
              <p className="text-xs text-slate-500">
                Ajustes de conexión con tu contenedor de Evolution API o n8n
              </p>
            </div>
          </div>
          {showAdvancedConfig ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showAdvancedConfig && (
          <form onSubmit={handleSaveServerConfig} className="p-5 sm:p-6 pt-0 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  URL del Servidor Evolution API / Dokploy:
                </label>
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://evolution.korensmx.com"
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de Instancia (Tenant):
                </label>
                <input
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="frescotrack-app"
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                API Key Global / Token de Sesión:
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="429683C4C977415CAAFCCE10F7D57E11"
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <div className="space-y-1">
                <strong className="font-bold">Despliegue en Dokploy (panel.korensmx.com):</strong>
                <p className="text-indigo-800">
                  Evolution API corre como un contenedor Docker en tu mismo VPS de Dokploy bajo el puerto 8080 con SQLite o PostgreSQL. Maneja sesiones multi-instancia de WhatsApp Web de forma aislada para cada micro-app.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors"
              >
                Guardar Configuración de Servidor
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
