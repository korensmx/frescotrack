import React from 'react';
import { Snowflake, Plus, QrCode, Settings, Wrench, Printer, Flame, Layers, Globe } from 'lucide-react';
import type { TechnicianProfile } from '../types';

interface NavbarProps {
  technician: TechnicianProfile;
  currentTab: 'dashboard' | 'stickers' | 'scanner' | 'settings' | 'studio';
  setCurrentTab: (tab: 'dashboard' | 'stickers' | 'scanner' | 'settings' | 'studio') => void;
  onOpenRegister: () => void;
  onViewPublicWebsite: () => void;
  overdueCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  technician,
  currentTab,
  setCurrentTab,
  onOpenRegister,
  onViewPublicWebsite,
  overdueCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
      {/* Tampico Weather & Extreme Heat Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 text-white px-3 py-1.5 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
          </span>
          <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="font-semibold text-amber-200">Zona Golfo (Tampico / Madero):</span>
          <span>36°C · Sensación térmica 43°C · Temporada alta</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sky-100 text-[11px] shrink-0">
          <span>{technician.businessName}</span>
          <span className="text-sky-300">|</span>
          <span className="font-bold text-white">{technician.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div 
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          {technician.logoUrl ? (
            <img 
              src={technician.logoUrl} 
              alt={technician.businessName} 
              className="w-10 h-10 rounded-xl object-contain bg-slate-100 p-0.5 border border-slate-200 shadow-md group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Snowflake className="w-6 h-6 animate-pulse-subtle" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-slate-900 flex items-center truncate max-w-[170px] sm:max-w-xs">
                {technician.businessName.split(' ')[0]}<span className="text-sky-600">{technician.businessName.split(' ').slice(1).join(' ') ? ` ${technician.businessName.split(' ').slice(1).join(' ')}` : ''}</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {technician.name} · Bitácora QR & Cobranza
            </p>
          </div>
        </div>

        {/* Desktop / Tablet Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm font-semibold">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              currentTab === 'dashboard'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Mando Técnico</span>
            {overdueCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('stickers')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'stickers'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Stickers QR</span>
          </button>

          <button
            onClick={() => setCurrentTab('scanner')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'scanner'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Escanear QR</span>
          </button>

          <button
            onClick={() => setCurrentTab('studio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'studio'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Estudio Micro-Apps</span>
          </button>

          <button
            onClick={() => setCurrentTab('settings')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'settings'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes & Tarifas</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View Public Website Button (Desktop) */}
          <button
            onClick={onViewPublicWebsite}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs transition-colors shadow-2xs"
            title="Ver Sitio Web Público del Negocio (Vista del Cliente)"
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>Sitio Web Público</span>
          </button>

          {/* Quick Globe Icon on Mobile & Tablet */}
          <button
            onClick={onViewPublicWebsite}
            title="Ver Sitio Web Público del Negocio"
            className="lg:hidden p-2 rounded-xl text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
          >
            <Globe className="w-4 h-4 text-sky-600" />
          </button>

          {/* Quick Studio Icon on mobile */}
          <button
            onClick={() => setCurrentTab('studio')}
            title="Estudio de Micro-Apps"
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
          </button>

          {/* Quick Settings Icon on mobile */}
          <button
            onClick={() => setCurrentTab('settings')}
            title="Ajustes de Técnico y Tarifas"
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Big Add Equipment CTA Button */}
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-1.5 sm:gap-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md shadow-sky-600/25 transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Nuevo Clima</span>
            <span className="xs:hidden">Nuevo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
