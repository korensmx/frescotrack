// Marco de la app: barra de arriba y menú de abajo (pensado para el pulgar).
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Radar, Users, ScanLine, MessageCircle, Settings, Crown } from 'lucide-react';
import { useAuth } from '../auth';
import { Logo } from './ui';

const TABS = [
  { to: '/', label: 'Radar', icon: Radar, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/escanear', label: 'Escanear', icon: ScanLine, big: true },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export default function Layout() {
  const { user } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <Link to="/" aria-label="Inicio"><Logo size={30} /></Link>
        {user && user.plan !== 'pro' && (
          <Link to="/pro" className="flex items-center gap-1 rounded-full border border-ice/40 bg-ice/10 px-3 py-1 text-xs font-semibold text-ice">
            <Crown size={14} /> {user.trialDaysLeft > 0 ? `Prueba: ${user.trialDaysLeft} días` : 'Activar Pro'}
          </Link>
        )}
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map(({ to, label, icon: Icon, end, big }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${isActive ? 'text-ice' : 'text-muted'}`}>
              {big ? (
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-ice text-bg shadow-[0_0_24px_rgba(0,242,254,0.45)]">
                  <Icon size={26} />
                </span>
              ) : (
                <Icon size={22} />
              )}
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
