// Protecciones generales del servidor: "cascos" (cabeceras de seguridad) y
// "porteros" (límites de cuántas veces se puede tocar una puerta por minuto).

// Cabeceras que le dicen al navegador: no me metas en un iframe, no adivines
// tipos de archivo, solo usa HTTPS y solo carga código de mi propio dominio.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

// Portero sencillo en memoria: cuenta cuántas veces llega la misma "llave"
// (una IP o un técnico) dentro de una ventana de tiempo. Si se pasa, responde 429.
// Con un solo contenedor esto basta; si algún día hay varios, cambiar a Redis.
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Demasiados intentos. Espera unos minutos.' }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs);
  timer.unref();

  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count++;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message, code: 'rate_limited' });
    }
    next();
  };
}

// Candado por técnico: evita que dos envíos de WhatsApp para la misma persona
// corran al mismo tiempo (y le lleguen mensajes repetidos a sus clientes).
export function createUserLock() {
  const busy = new Set();
  return {
    tryAcquire(userId) {
      if (busy.has(userId)) return false;
      busy.add(userId);
      return true;
    },
    release(userId) { busy.delete(userId); },
  };
}
