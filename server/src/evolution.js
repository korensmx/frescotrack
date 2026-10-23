// Conexión con tu Evolution API (la que ya tienes en Dokploy).
// Cada técnico tiene su propia "instancia" (su propio WhatsApp conectado),
// llamada ft-<id del técnico>. La llave secreta (API key) solo vive aquí en el
// servidor, nunca viaja al celular.

export function createEvolutionClient({ url, apiKey, fetchImpl = fetch }) {
  const enabled = Boolean(url && apiKey);
  const base = (url || '').replace(/\/+$/, '');

  async function call(method, path, body) {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  }

  const instanceName = (userId) => `ft-${userId}`;

  return {
    enabled,
    instanceName,

    async state(userId) {
      const r = await call('GET', `/instance/connectionState/${instanceName(userId)}`);
      if (r.status === 404) return 'not_found';
      if (!r.ok) throw new Error(`Evolution API respondió ${r.status}`);
      return r.data?.instance?.state || r.data?.state || 'close';
    },

    // Devuelve la imagen del QR (base64) que el técnico escanea con su WhatsApp Business.
    async connect(userId) {
      const name = instanceName(userId);
      let r = await call('GET', `/instance/connect/${name}`);
      if (r.status === 404) {
        r = await call('POST', '/instance/create', {
          instanceName: name,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        });
        if (!r.ok) throw new Error(`No se pudo crear la instancia (${r.status})`);
        const qr = r.data?.qrcode?.base64;
        if (qr) return { qr };
        r = await call('GET', `/instance/connect/${name}`);
      }
      if (!r.ok) throw new Error(`Evolution API respondió ${r.status}`);
      if (r.data?.instance?.state === 'open') return { connected: true };
      return { qr: r.data?.base64 || null, pairingCode: r.data?.pairingCode || null };
    },

    async logout(userId) {
      await call('DELETE', `/instance/logout/${instanceName(userId)}`);
    },

    async sendText(userId, number, text) {
      const r = await call('POST', `/message/sendText/${instanceName(userId)}`, { number, text });
      if (!r.ok) throw new Error(`No se pudo enviar el mensaje (${r.status})`);
      return r.data;
    },
  };
}
