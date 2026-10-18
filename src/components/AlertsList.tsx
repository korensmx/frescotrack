import React, { useState, useMemo } from 'react';
import { Search, Filter, AlertTriangle, Clock, CheckCircle2, ListFilter, X, PlusCircle } from 'lucide-react';
import { Equipment, TechnicianProfile, ContactStatus } from '../types';
import { EquipmentCard } from './EquipmentCard';
import { getEquipmentMetaIndex } from '../utils/indexing';

interface AlertsListProps {
  equipments: Equipment[];
  technician: TechnicianProfile;
  activeFilter: 'overdue' | 'upcoming' | 'ok' | 'all';
  setActiveFilter: (filter: 'overdue' | 'upcoming' | 'ok' | 'all') => void;
  onViewPublicQR: (equipment: Equipment) => void;
  onRenewService: (equipment: Equipment) => void;
  onUpdateContactStatus: (equipmentId: string, status: ContactStatus) => void;
  onOpenRegister: () => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({
  equipments,
  technician,
  activeFilter,
  setActiveFilter,
  onViewPublicQR,
  onRenewService,
  onUpdateContactStatus,
  onOpenRegister,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // O(1) Cached Meta Index instance
  const index = useMemo(() => getEquipmentMetaIndex(equipments), [equipments]);

  // Counts for each filter tab directly from pre-computed metrics (O(1))
  const counts = {
    overdue: index.metrics.overdueCount,
    upcoming: index.metrics.upcomingCount,
    ok: index.metrics.okCount,
    all: index.metrics.totalCount,
  };

  // Ultra-fast sub-millisecond query using inverted token matching
  const filteredEquipments = useMemo(() => {
    return index.query(activeFilter, searchQuery);
  }, [index, activeFilter, searchQuery]);

  return (
    <section className="space-y-4">
      {/* Title & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Alertas de Hoy</span>
            <span className="text-sm font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
              Cobranza Preventiva
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Clientes que cumplieron su ciclo de mantenimiento preventivo. Contáctalos para asegurar tu ingreso.
          </p>
        </div>
      </div>

      {/* Search Input & Clear */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, colonia (ej. Lomas de Rosales), marca o folio FT..."
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm text-slate-900 font-medium placeholder-slate-400 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs Pills (Mobile Horizontal Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        <button
          onClick={() => setActiveFilter('overdue')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
            activeFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Vencidos y Urgentes</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeFilter === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
          }`}>
            {counts.overdue}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('upcoming')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
            activeFilter === 'upcoming'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Por Vencer (7 días)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeFilter === 'upcoming' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('ok')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
            activeFilter === 'ok'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Al Día</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeFilter === 'ok' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {counts.ok}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Todos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {counts.all}
          </span>
        </button>
      </div>

      {/* Equipments Cards Grid */}
      {filteredEquipments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEquipments.map((eq) => (
            <EquipmentCard
              key={eq.id}
              equipment={eq}
              technician={technician}
              onViewPublicQR={onViewPublicQR}
              onRenewService={onRenewService}
              onUpdateContactStatus={onUpdateContactStatus}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-800 text-base">
            No hay equipos en esta categoría
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No encontramos coincidencias para "${searchQuery}". Intenta con otro término o limpia la búsqueda.`
              : activeFilter === 'overdue'
              ? '¡Excelente trabajo! No tienes ningún mantenimiento vencido en este momento.'
              : 'Todos tus equipos registrados están organizados y bajo control.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Limpiar búsqueda
              </button>
            ) : (
              <button
                onClick={onOpenRegister}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Nuevo Minisplit</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
