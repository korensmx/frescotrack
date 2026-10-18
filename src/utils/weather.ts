/**
 * FrescoTrack Real-Time Weather Engine
 * Powered by Open-Meteo (No API key required) & Browser Geolocation API
 */

export interface WeatherInfo {
  cityName: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number; // Sensación térmica
  humidity: number;
  weatherCode: number;
  weatherDesc: string;
  weatherIcon: string;
  heatLevel: 'extreme' | 'high' | 'moderate' | 'mild';
  heatNotice: string;
  source: 'gps' | 'city' | 'cache' | 'default';
  updatedAt: string;
}

const STORAGE_KEY = 'frescotrack_weather_cache';

// Fallback coordinates (Tampico, Tamaulipas, México)
const DEFAULT_COORDS = {
  lat: 22.2852,
  lon: -97.8778,
  cityName: 'Tampico, Tamps.',
};

/**
 * Interpret WMO Weather code
 */
function interpretWmoCode(code: number): { desc: string; icon: string } {
  switch (code) {
    case 0:
      return { desc: 'Cielo despejado', icon: '☀️' };
    case 1:
      return { desc: 'Mayormente soleado', icon: '🌤️' };
    case 2:
      return { desc: 'Parcialmente nublado', icon: '⛅' };
    case 3:
      return { desc: 'Nublado', icon: '☁️' };
    case 45:
    case 48:
      return { desc: 'Niebla o bruma marina', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { desc: 'Llovizna ligera', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { desc: 'Lluvia constante', icon: '🌧️' };
    case 80:
    case 81:
    case 82:
      return { desc: 'Chubascos aislados', icon: '🌧️' };
    case 95:
    case 96:
    case 99:
      return { desc: 'Tormenta eléctrica', icon: '⛈️' };
    default:
      return { desc: 'Soleado con calor', icon: '☀️' };
  }
}

/**
 * Assess HVAC impact based on temperature and apparent temperature
 */
function assessHeatImpact(temp: number, apparentTemp: number): {
  heatLevel: 'extreme' | 'high' | 'moderate' | 'mild';
  heatNotice: string;
} {
  const maxMetric = Math.max(temp, apparentTemp);

  if (maxMetric >= 40) {
    return {
      heatLevel: 'extreme',
      heatNotice: 'Calor extremo · Alta demanda de compresores y capacitores',
    };
  } else if (maxMetric >= 34) {
    return {
      heatLevel: 'high',
      heatNotice: 'Temporada alta · Climas trabajando al 100% de capacidad',
    };
  } else if (maxMetric >= 27) {
    return {
      heatLevel: 'moderate',
      heatNotice: 'Clima cálido · Temporada de mantenimiento preventivo',
    };
  } else {
    return {
      heatLevel: 'mild',
      heatNotice: 'Clima templado · Momento ideal para servicio preventivo programado',
    };
  }
}

/**
 * Fetch Open-Meteo Current Weather
 */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  resolvedCityName: string,
  source: 'gps' | 'city' | 'default' = 'gps'
): Promise<WeatherInfo> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo error: ${response.statusText}`);
  }

  const data = await response.json();
  const current = data.current;

  const temp = Math.round(current.temperature_2m * 10) / 10;
  const apparentTemp = Math.round(current.apparent_temperature * 10) / 10;
  const humidity = Math.round(current.relative_humidity_2m);
  const code = current.weather_code ?? 0;

  const { desc, icon } = interpretWmoCode(code);
  const { heatLevel, heatNotice } = assessHeatImpact(temp, apparentTemp);

  const info: WeatherInfo = {
    cityName: resolvedCityName,
    latitude: lat,
    longitude: lon,
    temperature: temp,
    apparentTemperature: apparentTemp,
    humidity,
    weatherCode: code,
    weatherDesc: desc,
    weatherIcon: icon,
    heatLevel,
    heatNotice,
    source,
    updatedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  };

  // Cache in localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch (e) {
    console.warn('Could not cache weather info', e);
  }

  return info;
}

/**
 * Reverse Geocode via OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es-MX,es;q=0.9',
      },
    });
    if (!res.ok) return DEFAULT_COORDS.cityName;
    const data = await res.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Tu Ubicación';
    const state = addr.state ? `, ${addr.state.replace('Estado de ', '')}` : '';
    return `${city}${state}`;
  } catch (err) {
    console.warn('Reverse geocode fallback', err);
    return DEFAULT_COORDS.cityName;
  }
}

/**
 * Geocode a City Name via Open-Meteo Geocoding API
 */
export async function geocodeCity(cityName: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const clean = cityName.split(/[,·/-]/)[0].trim();
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=es&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const item = data.results[0];
      const state = item.admin1 ? `, ${item.admin1.replace('Estado de ', '')}` : '';
      return {
        lat: item.latitude,
        lon: item.longitude,
        name: `${item.name}${state}`,
      };
    }
    return null;
  } catch (e) {
    console.warn('Geocode city failed', e);
    return null;
  }
}

/**
 * Load cached weather if available
 */
export function getCachedWeather(): WeatherInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Auto-detect and fetch live weather:
 * 1. Tries GPS coordinates from browser navigator.geolocation
 * 2. If GPS not permitted, geocodes preferredCity (e.g. business city)
 * 3. Fallbacks gracefully to Tampico, Tamaulipas
 */
export async function getLiveWeather(preferredCity?: string): Promise<WeatherInfo> {
  // 1. Try GPS
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 6000,
          maximumAge: 600000, // 10 minutes cache
          enableHighAccuracy: false,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const detectedCity = await reverseGeocode(lat, lon);
      return await fetchWeatherByCoords(lat, lon, detectedCity, 'gps');
    } catch (gpsError) {
      // GPS denied, timed out, or unallowed
      // Proceed to city geocode
    }
  }

  // 2. Geocode preferred city
  if (preferredCity) {
    const geo = await geocodeCity(preferredCity);
    if (geo) {
      return await fetchWeatherByCoords(geo.lat, geo.lon, geo.name, 'city');
    }
  }

  // 3. Fallback to default Tampico
  return await fetchWeatherByCoords(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.cityName, 'default');
}
