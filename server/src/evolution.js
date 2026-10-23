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

    // Conecta el WhatsApp Business del técnico. Devuelve dos formas de hacerlo:
    // - qr: imagen para escanear desde otro aparato.
    // - pairingCode: código de 8 letras para escribir en WhatsApp desde el MISMO
    //   celular (WhatsApp → Dispositivos vinculados → Vincular con número de teléfono).
    //   Solo sale si mandamos el número del técnico (52 + 10 dígitos).
    async connect(userId, number) {
      const name = instanceName(userId);
      const query = number ? `?number=${encodeURIComponent(number)}` : '';
      let r = await call('GET', `/instance/connect/${name}${query}`);
      if (r.status === 404) {
        const created = await call('POST', '/instance/create', {
          instanceName: name,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          ...(number ? { number } : {}),
        });
        if (!created.ok) throw new Error(`No se pudo crear la instancia (${created.status})`);
        r = await call('GET', `/instance/connect/${name}${query}`);
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
