/**
 * Dokploy Automation CLI & SDK for FrescoTrack Micro-Apps
 * 
 * Features:
 * - Automatically provisions dedicated Dokploy applications for any micro-app tenant
 * - Automatically configures the korensmx.com subdomain (e.g. <slug>.korensmx.com)
 * - Configures port 80, HTTPS with Let's Encrypt certificates, and Nixpacks SPA build
 * - Injects isolated VITE_TENANT_SLUG and VITE_APP_MODE environment variables
 * - Auto-syncs domain rules across all micro-apps
 */

import https from 'https';
import http from 'http';

const DOKPLOY_URL = (process.env.DOKPLOY_URL || 'https://panel.korensmx.com').replace(/\/+$/, '');
const DOKPLOY_API_KEY = process.env.DOKPLOY_API_KEY || 'DWTnchJsGRDihFvdaRqJDiuYRRRIoPkBlddCFXSBmQMXFLLbvHEOlYRoyCerWRfR';
const PROJECT_ID = 'xjk-M5cIcNHKjsrbyUpQg';
const ENVIRONMENT_ID = 'raDxQ96tRK4riTyK_QrRz';
const GITHUB_ID = 'ZanQErpUs4LzoTdLfMy-D';
const REPO_OWNER = 'korensmx';
const REPO_NAME = 'frescotrack';
const REPO_BRANCH = 'main';

// Helper for HTTP/HTTPS requests
function apiRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DOKPLOY_URL}/api${endpoint}`);
    const client = url.protocol === 'https:' ? https : http;

    const headers = {
      'x-api-key': DOKPLOY_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let postData = null;
    if (data && method === 'POST') {
      postData = JSON.stringify(data);
      headers['Content-Length'] = Buffer.byteLength(postData);
    } else if (data && method === 'GET') {
      Object.keys(data).forEach(key => url.searchParams.append(key, data[key]));
    }

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method,
      headers,
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// 1. Get Project Applications
async function getProjectApps() {
  const projects = await apiRequest('GET', '/project.all');
  const project = projects.find(p => p.projectId === PROJECT_ID);
  if (!project) throw new Error(`Project ${PROJECT_ID} not found`);
  const env = project.environments.find(e => e.environmentId === ENVIRONMENT_ID);
  if (!env) throw new Error(`Environment ${ENVIRONMENT_ID} not found`);
  return env.applications || [];
}

// 2. Get domains for application
async function getAppDomains(applicationId) {
  return await apiRequest('GET', `/domain.byApplicationId?applicationId=${applicationId}`);
}

// 3. Ensure korensmx.com domain is configured with port 80 and Let's Encrypt
async function ensureKorensDomain(applicationId, slug) {
  const targetHost = `${slug}.korensmx.com`;
  console.log(`🔍 Verificando dominio ${targetHost} para la app ${slug} (${applicationId})...`);

  const existingDomains = await getAppDomains(applicationId);
  const existingKorensDomain = existingDomains.find(d => d.host === targetHost);

  if (existingKorensDomain) {
    if (existingKorensDomain.port !== 80 || !existingKorensDomain.https || existingKorensDomain.certificateType !== 'letsencrypt') {
      console.log(`⚙️ Actualizando ${targetHost} a Puerto 80 con HTTPS y Let's Encrypt...`);
      await apiRequest('POST', '/domain.update', {
        domainId: existingKorensDomain.domainId,
        host: targetHost,
        port: 80,
        https: true,
        certificateType: 'letsencrypt',
        enabled: true,
      });
      console.log(`✅ Dominio ${targetHost} actualizado correctamente a Puerto 80.`);
    } else {
      console.log(`✅ Dominio ${targetHost} ya está configurado perfectamente (Puerto 80 + SSL Let's Encrypt).`);
    }
  } else {
    console.log(`🌐 Creando dominio automático: ${targetHost} (Puerto 80, HTTPS, Let's Encrypt)...`);
    const created = await apiRequest('POST', '/domain.create', {
      applicationId,
      host: targetHost,
      port: 80,
      https: true,
      path: '/',
      domainType: 'application',
      certificateType: 'letsencrypt',
    });
    console.log(`🎉 Dominio ${targetHost} creado en Dokploy exitosamente (ID: ${created.domainId}).`);
  }

  // Also check and fix any sslip.io domain port to 80
  const sslipDomain = existingDomains.find(d => d.host.includes('.sslip.io'));
  if (sslipDomain && sslipDomain.port !== 80) {
    console.log(`⚙️ Actualizando dominio de respaldo ${sslipDomain.host} a Puerto 80...`);
    await apiRequest('POST', '/domain.update', {
      domainId: sslipDomain.domainId,
      host: sslipDomain.host,
      port: 80,
      https: true,
      certificateType: 'letsencrypt',
      enabled: true,
    });
  }
}

// 4. Deploy or Provision a Micro-App
export async function deployMicroApp(slug) {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
  if (!cleanSlug) throw new Error('El slug de la micro-app no es válido');

  console.log(`\n🚀 INICIANDO DESPLIEGUE AUTOMATIZADO DE MICRO-APP: "${cleanSlug}"`);
  console.log('='.repeat(65));

  const apps = await getProjectApps();
  let app = apps.find(a => a.name === cleanSlug);

  if (!app) {
    console.log(`📦 Creando nueva aplicación en Dokploy: "${cleanSlug}"...`);
    const created = await apiRequest('POST', '/application.create', {
      name: cleanSlug,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      description: `Micro-App Independiente para ${cleanSlug}`,
    });
    app = created;
    console.log(`✅ Aplicación creada con ID: ${app.applicationId}`);

    console.log(`🔗 Conectando repositorio GitHub: ${REPO_OWNER}/${REPO_NAME} (${REPO_BRANCH})...`);
    await apiRequest('POST', '/application.saveGithubProvider', {
      applicationId: app.applicationId,
      githubId: GITHUB_ID,
      owner: REPO_OWNER,
      repository: REPO_NAME,
      branch: REPO_BRANCH,
      buildPath: '/',
      triggerType: 'push',
      autoDeploy: true,
    });

    console.log(`🏗️ Configurando tipo de build: Nixpacks (SPA)...`);
    await apiRequest('POST', '/application.saveBuildType', {
      applicationId: app.applicationId,
      buildType: 'nixpacks',
    });

    console.log(`🔐 Inyectando variables de entorno aisladas para el técnico...`);
    await apiRequest('POST', '/application.saveEnvironment', {
      applicationId: app.applicationId,
      env: `VITE_TENANT_SLUG=${cleanSlug}\nVITE_APP_MODE=single-tenant`,
    });

    console.log(`🌐 Creando dominio sslip.io temporal...`);
    try {
      await apiRequest('POST', '/domain.generateDomain', {
        applicationId: app.applicationId,
      });
    } catch (e) {
      console.log(`(Aviso generación sslip: ${e.message})`);
    }
  } else {
    console.log(`ℹ️ La aplicación "${cleanSlug}" ya existe en Dokploy (ID: ${app.applicationId}).`);
  }

  // AUTOMATICALLY CONFIGURE THE DOMAIN KORENSMX.COM
  await ensureKorensDomain(app.applicationId, cleanSlug);

  console.log(`🚀 Desplegando contenedor en Dokploy...`);
  await apiRequest('POST', '/application.deploy', {
    applicationId: app.applicationId,
  });

  console.log('\n' + '='.repeat(65));
  console.log(`🎉 ¡MICRO-APP "${cleanSlug}" CONFIGURADA Y EN COLA DE DESPLIEGUE!`);
  console.log(`🌐 Dominio Oficial:     https://${cleanSlug}.korensmx.com`);
  console.log(`📋 ID de Aplicación:    ${app.applicationId}`);
  console.log(`⚡ Puerto de Contenedor: 80`);
  console.log(`🔒 SSL:                 Let's Encrypt (Automático)`);
  console.log('='.repeat(65) + '\n');
}

// 5. Sync all existing Dokploy micro-apps to guarantee domain & port 80
export async function syncAllDomains() {
  console.log('\n🔄 SINCRONIZANDO DOMINIOS KORENSMX.COM EN TODAS LAS MICRO-APPS...');
  console.log('='.repeat(65));

  const apps = await getProjectApps();
  console.log(`Se encontraron ${apps.length} aplicaciones en el proyecto FrescoTrack.\n`);

  for (const app of apps) {
    if (app.name === 'frescotrack-app') {
      // Master app
      await ensureKorensDomain(app.applicationId, 'frescotrack');
    } else {
      // Micro-app
      await ensureKorensDomain(app.applicationId, app.name);
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log('✅ TODAS LAS MICRO-APPS TIENEN SU DOMINIO KORENSMX.COM CONFIGURADO AL 100%');
  console.log('='.repeat(65) + '\n');
}

// 6. List all apps and their live domains
export async function listApps() {
  const apps = await getProjectApps();
  console.log('\n📋 RESUMEN DE APLICACIONES EN DOKPLOY (PROYECTO FRESCOTRACK):');
  console.log('='.repeat(80));

  for (const app of apps) {
    const domains = await getAppDomains(app.applicationId);
    console.log(`🔹 [${app.name}] (Status: ${app.applicationStatus || 'unknown'})`);
    console.log(`   ID: ${app.applicationId}`);
    console.log(`   Dominios configurados:`);
    domains.forEach(d => {
      console.log(`    - https://${d.host} (Puerto: ${d.port}, SSL: ${d.certificateType})`);
    });
    console.log('');
  }
}

// CLI Execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  try {
    if (command === 'deploy') {
      const slug = args[1];
      if (!slug) {
        console.error('❌ Error: Especifica el slug de la micro-app. Ej: node scripts/dokploy-automation.js deploy climas-korens');
        process.exit(1);
      }
      await deployMicroApp(slug);
    } else if (command === 'sync-domains' || command === 'sync') {
      await syncAllDomains();
    } else if (command === 'list') {
      await listApps();
    } else {
      console.log(`Uso:
  node scripts/dokploy-automation.js list
  node scripts/dokploy-automation.js sync-domains
  node scripts/dokploy-automation.js deploy <slug>`);
    }
  } catch (err) {
    console.error('❌ Error en ejecución de automatización Dokploy:', err.message);
    process.exit(1);
  }
}

// If executed directly from CLI
if (process.argv[1]?.includes('dokploy-automation.js')) {
  main();
}
