import React, { useState, useEffect, useCallback } from 'react';
import { 
  Flame, 
  MapPin, 
  RefreshCw, 
  Droplets, 
  Navigation,
  Thermometer,
  ShieldAlert,
  Sun
} from 'lucide-react';
import { 
  getLiveWeather, 
  getCachedWeather, 
  type WeatherInfo 
} from '../utils/weather';

interface WeatherBannerProps {
  preferredCity?: string;
  technicianBusinessName?: string;
  technicianName?: string;
  onSwitchView?: () => void;
  switchViewLabel?: string;
  switchViewIcon?: React.ReactNode;
}

export const WeatherBanner: React.FC<WeatherBannerProps> = ({
  preferredCity = 'Tampico, Tamps.',
  technicianBusinessName,
  technicianName,
  onSwitchView,
  switchViewLabel,
  switchViewIcon,
}) => {
  const [weather, setWeather] = useState<WeatherInfo | null>(() => getCachedWeather());
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const updateWeather = useCallback(async (forceGps = false) => {
    setIsLoading(true);
    setLastError(null);
    try {
      const data = await getLiveWeather(forceGps ? undefined : preferredCity);
      setWeather(data);
    } catch (err: any) {
      console.error('Weather load error:', err);
      setLastError('No se pudo actualizar el clima');
    } finally {
      setIsLoading(false);
    }
  }, [preferredCity]);

  // Initial load & automatic refresh every 15 minutes
  useEffect(() => {
    updateWeather();

    const interval = setInterval(() => {
      updateWeather();
    }, 15 * 60 * 1000); // 15 mins

    return () => clearInterval(interval);
  }, [updateWeather]);

  // Fallback defaults if still loading first time
  const currentTemp = weather ? Math.round(weather.temperature) : 32;
  const currentApparent = weather ? Math.round(weather.apparentTemperature) : 38;
  const currentHumidity = weather ? weather.humidity : 68;
  const cityName = weather ? weather.cityName : preferredCity;
  const heatNotice = weather ? weather.heatNotice : 'Temporada de alta demanda en mantenimiento de minisplits';
  const weatherIcon = weather ? weather.weatherIcon : '☀️';

  return (
    <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-cyan-700 text-white px-3 sm:px-4 py-1.5 text-xs font-medium border-b border-sky-900/30">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        
        {/* Left Weather Info Group */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          
          {/* Live pulsing dot indicator */}
          <span className="flex h-2 w-2 relative shrink-0" title="Actualización climática en línea en tiempo real">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
          </span>

          {/* Location Badge */}
          <div className="flex items-center gap-1 font-bold text-amber-200 shrink-0">
            {weather?.source === 'gps' ? (
              <span title="Ubicación GPS detectada">
                <Navigation className="w-3 h-3 text-cyan-300 shrink-0" />
              </span>
            ) : (
              <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
            )}
            <span className="truncate max-w-[130px] sm:max-w-[200px]">{cityName}:</span>
          </div>

          {/* Live Weather Metrics */}
          <div className="flex items-center gap-2 text-slate-100 shrink-0 text-[11px] sm:text-xs">
            <span className="font-extrabold text-white flex items-center gap-1">
              <span>{weatherIcon}</span>
              <span>{currentTemp}°C</span>
            </span>

            <span className="text-sky-300">·</span>

            <span className="text-amber-200 font-semibold flex items-center gap-0.5">
              <Flame className="w-3 h-3 text-amber-300 shrink-0" />
              <span>Sensación {currentApparent}°C</span>
            </span>

            <span className="hidden md:inline text-sky-300">·</span>

            <span className="hidden md:inline-flex items-center gap-0.5 text-sky-200">
              <Droplets className="w-3 h-3 text-cyan-300 shrink-0" />
              <span>Humedad {currentHumidity}%</span>
            </span>

            <span className="hidden lg:inline text-sky-300">·</span>

            {/* HVAC heat notice */}
            <span className="hidden lg:inline font-medium text-sky-100 truncate max-w-xs">
              {heatNotice}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => updateWeather(true)}
            disabled={isLoading}
            className={`p-1 rounded hover:bg-white/10 text-sky-200 hover:text-white transition-colors shrink-0 ${
              isLoading ? 'animate-spin' : ''
            }`}
            title="Actualizar clima con GPS o red ahora"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Right Action / Technician Info or Switcher */}
        <div className="flex items-center gap-2 text-[11px] shrink-0">
          {onSwitchView && switchViewLabel && (
            <button
              onClick={onSwitchView}
              className="text-xs font-bold text-sky-100 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-lg transition-colors shrink-0"
            >
              {switchViewIcon}
              <span>{switchViewLabel}</span>
            </button>
          )}

          {technicianBusinessName && !onSwitchView && (
            <div className="hidden sm:flex items-center gap-1.5 text-sky-100">
              <span className="font-bold text-white">{technicianBusinessName}</span>
              {technicianName && (
                <>
                  <span className="text-sky-300">|</span>
                  <span>{technicianName}</span>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
