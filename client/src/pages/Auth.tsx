// Pantallas para entrar y crear cuenta.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type User } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, Field, Logo, PoweredBy } from '../components/ui';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Logo size={48} />
      <h1 className="mt-6 font-display text-2xl font-semibold">{title}</h1>
      <p className="mb-6 text-muted">{subtitle}</p>
      {children}
      <PoweredBy className="mx-auto mt-10" />
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
      login(r.token, r.user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <Shell title="Entrar" subtitle="Tu radar de mantenimientos te espera.">
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        <Field label="Correo"><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn-ice mt-2 w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="mt-6 text-center text-muted">¿Primera vez? <Link to="/registro" className="font-semibold text-ice">Crea tu cuenta gratis</Link></p>
    </Shell>
  );
}

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', businessName: '', phone: '', city: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: form });
      login(r.token, r.user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <Shell title="Crea tu cuenta" subtitle="14 días gratis. Sin tarjeta.">
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        <Field label="Tu nombre"><input className="input" required value={form.name} onChange={set('name')} placeholder="Juan Pérez" /></Field>
        <Field label="Nombre de tu negocio"><input className="input" value={form.businessName} onChange={set('businessName')} placeholder="Climas del Golfo" /></Field>
        <Field label="Tu WhatsApp (10 dígitos)"><input className="input" type="tel" inputMode="numeric" required value={form.phone} onChange={set('phone')} placeholder="833 123 4567" /></Field>
        <Field label="Ciudad"><input className="input" value={form.city} onChange={set('city')} placeholder="Tampico" /></Field>
        <Field label="Correo"><input className="input" type="email" autoComplete="email" required value={form.email} onChange={set('email')} /></Field>
        <Field label="Contraseña (mínimo 8)"><input className="input" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={set('password')} /></Field>
        <button className="btn-ice mt-2 w-full" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="mt-6 text-center text-muted">¿Ya tienes cuenta? <Link to="/entrar" className="font-semibold text-ice">Entra aquí</Link></p>
    </Shell>
  );
}
