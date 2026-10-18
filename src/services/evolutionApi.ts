/**
 * Evolution API Service for FrescoTrack
 * Connects directly to the live Evolution API (Baileys) instance running on Dokploy
 */

export interface EvolutionQrResponse {
  code?: string;
  base64?: string;
  pairingCode?: string | null;
  count?: number;
  state?: 'open' | 'connecting' | 'close' | 'refused';
  error?: string;
}

export interface EvolutionInstanceItem {
  id: string;
  name: string;
  connectionStatus: 'open' | 'connecting' | 'close' | 'refused';
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string | null;
  integration?: string;
}

/**
 * Clean URL helper to remove trailing slashes
 */
function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Format phone number for WhatsApp message sending (e.g. 5218331234567 or 528331234567)
 */
export function formatPhoneForEvolution(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) {
    return digits;
  }
  if (digits.startsWith('52') && digits.length === 12) {
    // Standard Mexican mobile often accepts 521 or 52
    return digits;
  }
  if (digits.length === 10) {
    return `52${digits}`;
  }
  return digits;
}

/**
 * Check the connection state of a specific instance
 */
export async function getEvolutionConnectionState(
  serverUrl: string,
  instanceName: string,
  apiKey: string
): Promise<{ state: 'open' | 'connecting' | 'close' | 'refused' | 'not_found'; error?: string }> {
  const base = cleanUrl(serverUrl);
  try {
    const res = await fetch(`${base}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey.trim(),
      },
    });

    if (res.status === 404) {
      return { state: 'not_found' };
    }

    if (!res.ok) {
      const text = await res.text();
      return { state: 'close', error: `HTTP ${res.status}: ${text}` };
    }

    const data = await res.json();
    const state = data?.instance?.state || 'close';
    return { state };
  } catch (err: any) {
    return { state: 'close', error: err.message || 'Error de conexión' };
  }
}

/**
 * Create a new Baileys WhatsApp instance in Evolution API
 */
export async function createEvolutionInstance(
  serverUrl: string,
  instanceName: string,
  apiKey: string
): Promise<EvolutionQrResponse> {
  const base = cleanUrl(serverUrl);
  try {
    const res = await fetch(`${base}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: instanceName.trim(),
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data?.response?.message || data?.message || 'Error al crear la instancia' };
    }

    return {
      code: data?.qrcode?.code,
      base64: data?.qrcode?.base64,
      pairingCode: data?.qrcode?.pairingCode,
      state: data?.instance?.status === 'connecting' ? 'connecting' : 'close',
    };
  } catch (err: any) {
    return { error: err.message || 'Error de conexión con Evolution API' };
  }
}

/**
 * Fetch or refresh the real pairing QR code for an instance
 */
export async function getEvolutionQrCode(
  serverUrl: string,
  instanceName: string,
  apiKey: string
): Promise<EvolutionQrResponse> {
  const base = cleanUrl(serverUrl);
  const name = instanceName.trim();
  const key = apiKey.trim();

  // 1. First check if instance is already open/connected
  const stateCheck = await getEvolutionConnectionState(base, name, key);
  if (stateCheck.state === 'open') {
    return { state: 'open' };
  }

  // 2. If instance doesn't exist yet, create it directly
  if (stateCheck.state === 'not_found') {
    return await createEvolutionInstance(base, name, key);
  }

  // 3. If instance exists, request a fresh QR code
  try {
    const res = await fetch(`${base}/instance/connect/${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: {
        'apikey': key,
      },
    });

    if (res.status === 404) {
      return await createEvolutionInstance(base, name, key);
    }

    const data = await res.json();
    if (!res.ok) {
      return { error: data?.message || 'No se pudo obtener el código QR' };
    }

    return {
      code: data?.code,
      base64: data?.base64,
      pairingCode: data?.pairingCode,
      count: data?.count,
      state: 'connecting',
    };
  } catch (err: any) {
    return { error: err.message || 'Error al conectar con Evolution API' };
  }
}

/**
 * Fetch full instance info (phone number, profile name, profile picture)
 */
export async function getEvolutionInstanceDetails(
  serverUrl: string,
  instanceName: string,
  apiKey: string
): Promise<EvolutionInstanceItem | null> {
  const base = cleanUrl(serverUrl);
  try {
    const res = await fetch(`${base}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey.trim(),
      },
    });

    if (!res.ok) return null;
    const list: EvolutionInstanceItem[] = await res.json();
    const found = list.find((item) => item.name === instanceName.trim());
    return found || null;
  } catch (e) {
    console.error('Error fetching instance details', e);
    return null;
  }
}

/**
 * Send WhatsApp text message using Evolution API
 */
export async function sendEvolutionTextMessage(
  serverUrl: string,
  instanceName: string,
  apiKey: string,
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const base = cleanUrl(serverUrl);
  const formattedPhone = formatPhoneForEvolution(phone);

  try {
    const res = await fetch(`${base}/message/sendText/${encodeURIComponent(instanceName.trim())}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: text,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { 
        success: false, 
        error: data?.response?.message || data?.message || `Error HTTP ${res.status}` 
      };
    }

    return {
      success: true,
      messageId: data?.key?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error de red al enviar el mensaje',
    };
  }
}

/**
 * Log out and disconnect the WhatsApp instance from Evolution API
 */
export async function logoutEvolutionInstance(
  serverUrl: string,
  instanceName: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  const base = cleanUrl(serverUrl);
  try {
    const res = await fetch(`${base}/instance/logout/${encodeURIComponent(instanceName.trim())}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey.trim(),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: text };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
