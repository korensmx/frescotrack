// Ajustes del perfil del técnico: datos, precio, mensaje de WhatsApp y contraseña.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, LogOut, Printer, Tags } from 'lucide-react';
import { api, money, prettyDate, setToken, type User } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, Field, PageTitle, PoweredBy } from '../components/ui';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: user!.name, businessName: user!.businessName, phone: user!.phone, city: user!.city,
    defaultPrice: String(user!.defaultPrice), messageTemplate: user!.messageTemplate,
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setError(null); setMsg(null);
    try {
      const r = await api<{ user: User }>('/me', { method: 'PUT', body: { ...form, defaultPrice: Number(form.defaultPrice) || 0 } });
      setUser(r.user); setMsg('¡Cambios guardados!');
    } catch (err) { setError((err as Error).message); }
  }

  async function changePassword() {
    setError(null); setMsg(null);
    try {
      // El servidor cierra las demás sesiones y nos da una llave nueva para seguir dentro.
      const r = await api<{ token: string }>('/me/password', { method: 'PUT', body: pw });
      setToken(r.token);
      setPw({ currentPassword: '', newPassword: '' }); setMsg('Contraseña actualizada');
    } catch (err) { setError((err as Error).message); }
  }

  const u = user!;
  return (
    <div className="space-y-4">
      <PageTitle title="Ajustes" subtitle={u.email} />
      <ErrorBox message={error} />
      {msg && <p className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm text-ok">{msg}</p>}

      <Link to="/pro" className="card flex items-center justify-between gap-3 border-ice/30">
        <div>
          <p className="flex items-center gap-2 font-semibold"><Crown size={18} className="text-ice" /> {u.plan === 'pro' ? 'FrescoTrack Pro activo' : 'Plan de prueba'}</p>
          <p className="text-sm text-muted">{u.plan === 'pro' ? 'Gracias por tu suscripción' : u.trialDaysLeft > 0 ? `Te quedan ${u.trialDaysLeft} días (hasta ${prettyDate(u.trialEndsAt)})` : 'Tu prueba terminó'}</p>
        </div>
        <span className="text-sm font-semibold text-ice">Ver</span>
      </Link>

      <Link to="/ajustes/precios" className="card flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold"><Tags size={18} className="text-ice" /> Precios del mantenimiento</p>
          <p className="text-sm text-muted">Normal o Inverter, de 1 a 3 toneladas</p>
        </div>
        <span className="text-sm font-semibold text-ice">Editar</span>
      </Link>

      <Link to="/stickers" className="btn-ghost w-full"><Printer size={18} /> Imprimir stickers QR</Link>

      <section className="card">
        <h2 className="mb-3 font-display text-lg font-semibold">Mi negocio</h2>
        <Field label="Tu nombre"><input className="input" value={form.name} onChange={set('name')} /></Field>
        <Field label="Nombre del negocio"><input className="input" value={form.businessName} onChange={set('businessName')} /></Field>
        <Field label="Tu WhatsApp"><input className="input" type="tel" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Ciudad"><input className="input" value={form.city} onChange={set('city')} /></Field>
        <Field label={`Precio base, para equipos fuera de la tabla (${money(Number(form.defaultPrice) || 0)})`}>
          <input className="input" type="number" inputMode="numeric" value={form.defaultPrice} onChange={set('defaultPrice')} />
        </Field>
        <Field label="Mensaje de recordatorio">
          <textarea className="input min-h-36 py-3 text-sm" value={form.messageTemplate} onChange={set('messageTemplate')} />
        </Field>
        <p className="mb-3 text-xs text-muted">
          Palabras mágicas que se cambian solas: {'{cliente}'} {'{tecnico}'} {'{negocio}'} {'{equipo}'} {'{ubicacion}'} {'{meses}'} {'{fecha}'} {'{precio}'}
        </p>
        <p className="mb-3 text-xs text-muted">
          {'{precio}'} se calcula solo con tu tabla de precios. Si el cliente tiene varios equipos vencidos, se suman en un solo mensaje.
        </p>
        <button className="btn-ice w-full" onClick={save}>Guardar cambios</button>
      </section>

      <section className="card">
        <h2 className="mb-3 font-display text-lg font-semibold">Cambiar contraseña</h2>
        <Field label="Contraseña actual"><input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
        <Field label="Contraseña nueva (mínimo 8)"><input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        <button className="btn-ghost w-full" onClick={changePassword}>Actualizar contraseña</button>
      </section>

      <button className="btn-ghost w-full text-heat" onClick={logout}><LogOut size={18} /> Cerrar sesión</button>
      <div className="pt-2 text-center"><PoweredBy /></div>
    </div>
  );
}
