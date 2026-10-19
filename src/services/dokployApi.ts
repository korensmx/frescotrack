/**
 * Dokploy API Service for FrescoTrack
 * Manages micro-app containers, domains, and automated lifecycle (create, deploy, delete)
 */

export const DOKPLOY_BASE_URL = 'https://panel.korensmx.com/api';
export const DOKPLOY_API_KEY = 'DWTnchJsGRDihFvdaRqJDiuYRRRIoPkBlddCFXSBmQMXFLLbvHEOlYRoyCerWRfR';
export const FRESCOTRACK_PROJECT_ID = 'xjk-M5cIcNHKjsrbyUpQg';
export const FRESCOTRACK_ENV_ID = 'raDxQ96tRK4riTyK_QrRz';
export const GITHUB_PROVIDER_ID = 'ZanQErpUs4LzoTdLfMy-D';

interface DokployAppSummary {
  applicationId: string;
  name: string;
  applicationStatus?: string;
}

interface ProjectSummary {
  projectId: string;
  name: string;
  environments: Array<{
    environmentId: string;
    name: string;
    applications: DokployAppSummary[];
  }>;
}

/**
 * Execute an authenticated request to Dokploy API
 */
async function dokployFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Prefer direct URL (now supported with Traefik dokploy-cors) or relative proxy
  const url = `${DOKPLOY_BASE_URL}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'x-api-key': DOKPLOY_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMessage = `Error Dokploy (${response.status} ${response.statusText})`;
    try {
      const errJson = await response.json();
      if (errJson.message) errMessage = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return response.json() as Promise<T>;
}

/**
 * Find the Dokploy application ID for a given micro-app slug
 */
export async function findDokployAppId(slug: string): Promise<string | null> {
  try {
    const cleanSlug = slug.toLowerCase().trim();
    const projects = await dokployFetch<ProjectSummary[]>('/project.all', { method: 'GET' });
    const project = projects.find(p => p.projectId === FRESCOTRACK_PROJECT_ID);
    if (!project) return null;

    const env = project.environments.find(e => e.environmentId === FRESCOTRACK_ENV_ID);
    if (!env || !env.applications) return null;

    const match = env.applications.find(a => a.name.toLowerCase() === cleanSlug);
    return match ? match.applicationId : null;
  } catch (err) {
    console.warn(`[Dokploy] No se pudo consultar la lista de apps para el slug "${slug}":`, err);
    return null;
  }
}

/**
 * Delete a micro-app from Dokploy
 * Destroys the Docker container, removes Traefik routers/domains, and frees system resources.
 */
export async function deleteDokployMicroApp(
  slug: string,
  knownAppId?: string
): Promise<{ success: boolean; message: string; deletedId?: string }> {
  try {
    console.log(`[Dokploy] Iniciando eliminación de micro-app "${slug}"...`);

    // 1. Resolve application ID
    let targetAppId = knownAppId;
    if (!targetAppId) {
      targetAppId = (await findDokployAppId(slug)) || undefined;
    }

    if (!targetAppId) {
      console.info(`[Dokploy] La app "${slug}" no está registrada en Dokploy o ya fue eliminada.`);
      return {
        success: true,
        message: `La micro-app no requería desinstalación en Dokploy (no se encontró contenedor activo).`,
      };
    }

    // 2. Call Dokploy API to delete the application
    console.log(`[Dokploy] Destruyendo aplicación ${targetAppId} (${slug}) en Dokploy...`);
    await dokployFetch('/application.delete', {
      method: 'POST',
      body: JSON.stringify({ applicationId: targetAppId }),
    });

    console.log(`[Dokploy] ✅ Aplicación ${targetAppId} (${slug}) eliminada exitosamente de Dokploy.`);
    return {
      success: true,
      deletedId: targetAppId,
      message: `Contenedor, dominios y configuración de "${slug}" eliminados exitosamente de Dokploy.`,
    };
  } catch (error: any) {
    console.error(`[Dokploy] Error al eliminar app "${slug}" de Dokploy:`, error);
    return {
      success: false,
      message: error?.message || 'Error desconocido al comunicar con Dokploy.',
    };
  }
}

/**
 * Automatically provision and deploy a new micro-app to Dokploy
 */
export async function provisionAndDeployDokployMicroApp(
  slug: string,
  businessName: string
): Promise<{ success: boolean; applicationId?: string; domain?: string; message: string }> {
  try {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
    if (!cleanSlug) throw new Error('Slug inválido');

    console.log(`[Dokploy] Creando aplicación "${cleanSlug}" en Dokploy...`);
    const app = await dokployFetch<{ applicationId: string }>('/application.create', {
      method: 'POST',
      body: JSON.stringify({
        name: cleanSlug,
        projectId: FRESCOTRACK_PROJECT_ID,
        environmentId: FRESCOTRACK_ENV_ID,
        description: `Micro-App para ${businessName}`,
      }),
    });

    const appId = app.applicationId;

    // Connect GitHub
    await dokployFetch('/application.saveGithubProvider', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: appId,
        githubId: GITHUB_PROVIDER_ID,
        owner: 'korensmx',
        repository: 'frescotrack',
        branch: 'main',
        buildPath: '/',
        triggerType: 'push',
        autoDeploy: true,
      }),
    });

    // Build type Nixpacks (SPA)
    await dokployFetch('/application.saveBuildType', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: appId,
        buildType: 'nixpacks',
        dockerfile: 'Dockerfile',
        dockerContextPath: null,
        dockerBuildStage: null,
        herokuVersion: '24',
        railpackVersion: '0.15.4',
      }),
    });

    // Env vars
    await dokployFetch('/application.saveEnvironment', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: appId,
        env: `VITE_TENANT_SLUG=${cleanSlug}\nVITE_APP_MODE=single-tenant`,
        buildArgs: null,
        buildSecrets: null,
        createEnvFile: true,
      }),
    });

    // Custom domain <slug>.korensmx.com on port 80 with Let's Encrypt
    const targetHost = `${cleanSlug}.korensmx.com`;
    await dokployFetch('/domain.create', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: appId,
        host: targetHost,
        port: 80,
        https: true,
        path: '/',
        domainType: 'application',
        certificateType: 'letsencrypt',
      }),
    });

    // Also generate sslip.io backup domain
    try {
      await dokployFetch('/domain.generateDomain', {
        method: 'POST',
        body: JSON.stringify({ applicationId: appId }),
      });
    } catch {
      // ignore sslip generation error
    }

    // Deploy
    await dokployFetch('/application.deploy', {
      method: 'POST',
      body: JSON.stringify({ applicationId: appId }),
    });

    return {
      success: true,
      applicationId: appId,
      domain: targetHost,
      message: `Micro-App "${cleanSlug}" creada y desplegada en Dokploy con dominio ${targetHost}`,
    };
  } catch (error: any) {
    console.error(`[Dokploy] Error al crear micro-app "${slug}":`, error);
    return {
      success: false,
      message: error?.message || 'Error al comunicar con Dokploy.',
    };
  }
}
