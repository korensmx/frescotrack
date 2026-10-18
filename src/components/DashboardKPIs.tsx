import React from 'react';
import { AlertTriangle, DollarSign, Snowflake, CheckCircle2, MessageSquare, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Equipment } from '../types';
import { getEquipmentMetaIndex } from '../utils/indexing';

interface DashboardKPIsProps {
  equipments: Equipment[];
  onFilterClick: (filter: 'overdue' | 'all') => void;
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  equipments,
  onFilterClick,
}) => {
  // O(1) Precomputed Metrics from Meta Index
  const index = getEquipmentMetaIndex(equipments);
  const {
    overdueCount,
    upcomingCount,
    potentialRevenue,
    contactedCount,
    servicesThisMonthCount,
    revenueThisMonth,
  } = index.metrics;

  const overdueOrUpcomingCount = overdueCount + upcomingCount;

  return (
    <section className="space-y-3">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Main Alert Card: Overdue & Upcoming Revenue to Collect */}
        <div 
          onClick={() => onFilterClick('overdue')}
          className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-rose-600/20 cursor-pointer group hover:scale-[1.01] transition-all border border-rose-400/40"
        >
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/25 text-rose-100 backdrop-blur-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              Cobranza Preventiva Hoy
            </span>
            <span className="flex items-center text-xs font-bold text-rose-100 group-hover:translate-x-1 transition-transform">
              Ver lista <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>

          <div className="mt-1">
            <div className="text-3xl sm:text-4xl font-black tracking-tight flex items-baseline gap-2">
              <span>{overdueOrUpcomingCount} equipos</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-amber-200 font-extrabold text-base sm:text-lg">
              <DollarSign className="w-5 h-5 -mr-1" />
              <span>${potentialRevenue.toLocaleString('es-MX')} MXN potenciales</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-xs text-rose-100 font-medium">
            <span>Vencidos o para esta semana</span>
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md">
              {contactedCount}/{overdueOrUpcomingCount} contactados
            </span>
          </div>
        </div>

        {/* Total Installed / Active Equipments */}
        <div 
          onClick={() => onFilterClick('all')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:border-sky-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Parque de Equipos
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Snowflake className="w-4 h-4" />
            </div>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {equipments.length} <span className="text-sm font-semibold text-slate-500">minisplits</span>
          </div>

          <p className="text-xs text-slate-600 mt-1 font-medium">
            Registrados con etiqueta QR activa
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tampico, Madero y Altamira</span>
            <span className="font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform">
              Ver todos →
            </span>
          </div>
        </div>

        {/* Services Realized This Month */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Servicios Este Mes
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {servicesThisMonthCount}
            </span>
            <span className="text-sm font-semibold text-slate-500">servicios cerrados</span>
          </div>

          <div className="text-emerald-700 font-extrabold text-sm sm:text-base mt-1 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>${revenueThisMonth.toLocaleString('es-MX')} MXN cobrados</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Mes actual ({new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})</span>
            <span className="font-medium text-emerald-600">Al corriente</span>
          </div>
        </div>
      </div>
    </section>
  );
};
