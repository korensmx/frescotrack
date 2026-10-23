// Cobro de la suscripción Pro ($299 MXN al mes) con Mercado Pago.
// Usamos "suscripciones sin plan" (preapproval): Mercado Pago cobra solito cada
// mes a la tarjeta del técnico y nos avisa (webhook) cuando algo cambia.
import crypto from 'node:crypto';

const API = 'https://api.mercadopago.com';

export function createMercadoPagoClient({ accessToken, webhookSecret, price = 299, fetchImpl = fetch }) {
  const enabled = Boolean(accessToken);

  async function call(method, path, body) {
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Mercado Pago respondió ${res.status}`);
    return data;
  }

  return {
    enabled,
    price,

    // Crea la suscripción y regresa la liga de pago de Mercado Pago.
    async createSubscription({ userId, email, backUrl }) {
      return call('POST', '/preapproval', {
        reason: 'FrescoTrack Pro',
        external_reference: String(userId),
        payer_email: email,
        back_url: backUrl,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: price,
          currency_id: 'MXN',
        },
      });
    },

    getSubscription(id) {
      return call('GET', `/preapproval/${encodeURIComponent(id)}`);
    },

    cancelSubscription(id) {
      return call('PUT', `/preapproval/${encodeURIComponent(id)}`, { status: 'cancelled' });
    },

    // Revisa la firma "x-signature" que manda Mercado Pago, para saber que el
    // aviso es de verdad suyo. Si no configuraste el secreto, se omite (de todas
    // formas siempre volvemos a preguntar el estado real a Mercado Pago).
    isValidSignature({ signature, requestId, dataId }) {
      if (!webhookSecret) return true;
      const parts = Object.fromEntries(String(signature || '').split(',').map((p) => p.trim().split('=')));
      if (!parts.ts || !parts.v1) return false;
      const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
      return expected.length === parts.v1.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
    },
  };
}
