const puppeteer = require('/Users/gdas/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

const SCENES = [
  {
    num: "01",
    tag: "INTRODUCCIÓN",
    title: "Bienvenido a FrescoTrack",
    subtitle: "La herramienta creada por KORENS para que ganes más dinero y no pierdas clientes",
    bullets: [
      "🤖 Tu robot mayordomo que cuida a tus clientes.",
      "📒 Olvídate de libretas mojadas que se pierden.",
      "💰 Te recuerda automáticamente cobrar mantenimientos a los 6 meses."
    ],
    childTip: "Como una alcancía mágica: registra el clima y el sistema cobra por ti cuando le toque servicio.",
    image: path.resolve('public/manual-pages/page_1_preview.png'),
    narration: "¡Hola colega técnico! Bienvenido a FrescoTrack, la plataforma inteligente creada y desarrollada exclusivamente por KORENS para que jamás pierdas un cliente y aumentes tus ingresos. Vamos a aprender a usarla paso a paso."
  },
  {
    num: "02",
    tag: "CENTRO DE MANDO",
    title: "El Mando Técnico y el Semáforo",
    subtitle: "Control total de tus mantenimientos con 3 colores mágicos",
    bullets: [
      "🔴 ROJO: Vencido (+6 meses) ¡Urgente llamar para cobrar tu dinero!",
      "🟡 AMARILLO: Próximo (Faltan menos de 30 días para agendar).",
      "🟢 VERDE: Al corriente (Clima recién lavado y enfriando con todo)."
    ],
    childTip: "Si ves una tarjeta roja en tu pantalla, ¡es un cliente listo para pagarte hoy!",
    image: path.resolve('docs/images/1_dashboard.png'),
    narration: "Este es tu Mando Técnico. Arriba tienes un semáforo muy fácil: verde significa al corriente; amarillo, por vencer en 30 días; y rojo significa más de 6 meses, dinero listo para cobrar hoy mismo. Tienes botones para mandar WhatsApp en un clic y renovar el servicio."
  },
  {
    num: "03",
    tag: "REGISTRO RÁPIDO",
    title: "Registra un Clima en 45 Segundos",
    subtitle: "Formulario express de una sola pantalla directamente en casa del cliente",
    bullets: [
      "1️⃣ Toca el botón azul '+ Nuevo Clima'.",
      "2️⃣ Escribe Nombre y WhatsApp (10 dígitos).",
      "3️⃣ Elige Capacidad (1tn a 3tn) y anota la presión PSI.",
      "4️⃣ Toca Guardar: Folio QR generado al instante."
    ],
    childTip: "Toma menos de un minuto. El sistema programa el recordatorio para dentro de 6 meses.",
    image: path.resolve('docs/images/2_register_modal.png'),
    narration: "Cuando termines de lavar o instalar un clima, tocas el botón azul Nuevo Clima. Escribes el nombre del cliente, su teléfono de 10 dígitos, la capacidad del minisplit y la presión del gas. Al tocar Guardar, el sistema genera su folio único en menos de 45 segundos y programa su mantenimiento futuro."
  },
  {
    num: "04",
    tag: "STICKERS FÍSICOS",
    title: "Stickers QR: Tu Marca en la Pared",
    subtitle: "Una tarjeta de papel se tira a la basura; un sticker dura 5 años pegado",
    bullets: [
      "🏷️ Cada clima tiene su huella digital y Folio único (ej. FT-1042).",
      "🚫 Cero duplicidades: prefijos independientes por cada técnico.",
      "📲 El cliente o tú apuntan con el celular y se abre su historial."
    ],
    childTip: "Pégalo en la esquina del minisplit. ¡El cliente nunca perderá tu teléfono!",
    image: path.resolve('docs/images/3_stickers.png'),
    narration: "En la pestaña Stickers QR imprimes tus etiquetas de alta calidad. Cada código QR tiene un folio único que nunca se confunde con el de otro técnico. Lo pegas en la carcasa del minisplit y tu teléfono se queda en la pared del cliente por años, garantizando que siempre te llamen a ti."
  },
  {
    num: "05",
    tag: "WHATSAPP PILOTO",
    title: "WhatsApp Web y Cobranza Automática",
    subtitle: "Vincula tu sesión una sola vez y despierta con mantenimientos agendados",
    bullets: [
      "📱 Se conecta escaneando el código QR igual que WhatsApp Web.",
      "⏰ Disparo automático diario a las 9:00 AM para clientes de 6 meses.",
      "📋 Tabla de mensajes futuros con fecha programada y simulador de prueba."
    ],
    childTip: "El robot trabaja en la mañana por ti para que tú solo vayas a trabajar y cobrar.",
    image: path.resolve('docs/images/4_whatsapp.png'),
    narration: "En la pestaña WhatsApp Web vinculas tu celular escaneando el código QR en pantalla. Cada mañana a las 9 de la mañana, el motor inteligente revisa qué clientes cumplieron 6 meses y les manda un mensaje amable para renovar su servicio. ¡Tú solo recibes la confirmación en tu chat!"
  },
  {
    num: "06",
    tag: "TARIFAS & AJUSTES",
    title: "Tarifario de 10 Capacidades a tu Gusto",
    subtitle: "Ajusta precios para Convencional e Inverter y personaliza tu mensaje",
    bullets: [
      "⚙️ 10 Niveles oficiales: 1tn, 1.5tn, 2tn, 2.5tn y 3tn (Normal e Inverter).",
      "💬 Simulador de WhatsApp en tiempo real para editar tu texto.",
      "🏢 Configura el nombre comercial de tu negocio y tu ciudad."
    ],
    childTip: "Puedes cambiar tus precios cuando quieras y tu cotizador en línea se actualiza al instante.",
    image: path.resolve('docs/images/5_settings.png'),
    narration: "En Ajustes y Tarifas tú tienes el control total. Puedes configurar tus precios para las 10 combinaciones de climas, desde 1 tonelada hasta 3 toneladas Inverter, y personalizar el texto exacto de WhatsApp que recibirán tus clientes con un previsualizador en vivo."
  },
  {
    num: "07",
    tag: "CARNET & SITIO WEB",
    title: "Carnet Digital QR y Página Web Oficial",
    subtitle: "Tecnología sin descargar aplicaciones + Sello Powered by KORENS",
    bullets: [
      "📲 Al escanear el QR, el cliente ve su carnet con cuenta regresiva.",
      "🟢 Botón gigante verde para pedirte servicio por WhatsApp en 1 toque.",
      "🌐 Sitio web comercial con cotizador automático de presupuestos."
    ],
    childTip: "Tus clientes se asombrarán de ver su clima en internet con su garantía oficial.",
    image: path.resolve('docs/images/6_carnet_qr.png'),
    narration: "Cuando tu cliente escanea el sticker con la cámara de su teléfono, se abre su Carnet Digital en segundos sin bajar ninguna aplicación. Ahí ve la salud de su equipo y un botón gigante para llamarte. Además, cuentas con tu propio sitio web con cotizador respaldado con el sello Powered by KORENS."
  },
  {
    num: "08",
    tag: "RESUMEN DE ORO",
    title: "Tu Rutina de 3 Pasos en Cada Servicio",
    subtitle: "FrescoTrack Pro · Desarrollado y Respaldado por KORENS®",
    bullets: [
      "1️⃣ Llegas: Haces tu limpieza o reparación con calidad.",
      "2️⃣ Registras: Llenas FrescoTrack en 45 segundos y pegas el QR.",
      "3️⃣ Cobras y te vas tranquilo: El sistema te traerá de vuelta a los 6 meses."
    ],
    childTip: "¡Pide tu manual escrito en PDF para tener toda la chuleta de bolsillo a la mano!",
    image: path.resolve('public/manual-pages/page_10_preview.png'),
    narration: "En resumen, tu rutina es muy simple: llegas, haces tu trabajo, registras el equipo en 45 segundos y pegas tu sticker QR. FrescoTrack y KORENS se encargan del resto. ¡Mucho éxito en tus servicios y a crecer tu negocio!"
  }
];

function generateSlideHtml(scene, logoBase64, screenshotBase64) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1920px;
      height: 1080px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(circle at 15% 20%, #0f172a 0%, #090d16 60%, #020617 100%);
      color: #f8fafc;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Subtle background grid & glow */
    body::before {
      content: "";
      position: absolute;
      top: -200px;
      left: 10%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(2, 132, 199, 0.22) 0%, transparent 70%);
      pointer-events: none;
    }

    /* Top Bar */
    .header {
      height: 90px;
      padding: 0 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }

    .brand-text h1 {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #ffffff;
    }

    .brand-text p {
      font-size: 13px;
      color: #38bdf8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-header {
      background: rgba(2, 132, 199, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 13px;
      font-weight: 800;
      padding: 8px 18px;
      border-radius: 9999px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* Main Area (2 Columns) */
    .content {
      flex: 1;
      padding: 40px 60px;
      display: grid;
      grid-template-columns: 820px 1fr;
      gap: 40px;
      align-items: center;
      z-index: 10;
    }

    .left-col {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .scene-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #38bdf8;
      text-transform: uppercase;
    }

    .scene-tag span {
      background: #0284c7;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 900;
    }

    .scene-title {
      font-size: 44px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: #ffffff;
    }

    .scene-subtitle {
      font-size: 20px;
      color: #94a3b8;
      font-weight: 600;
      line-height: 1.4;
      margin-top: -6px;
    }

    .bullets {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }

    .bullet {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 4px solid #0284c7;
      padding: 12px 18px;
      border-radius: 12px;
      font-size: 17px;
      font-weight: 600;
      color: #f1f5f9;
      line-height: 1.35;
    }

    .child-box {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%);
      border: 1.5px dashed #22c55e;
      border-radius: 14px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 6px;
    }

    .child-box .icon {
      font-size: 28px;
    }

    .child-box p {
      font-size: 15px;
      color: #86efac;
      font-weight: 700;
      line-height: 1.35;
    }

    /* Right Column (Screenshot Mockup) */
    .right-col {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .mockup-window {
      width: 100%;
      height: 570px;
      background: #0f172a;
      border-radius: 20px;
      border: 2px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(2, 132, 199, 0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .mockup-bar {
      height: 34px;
      background: #1e293b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 8px;
    }

    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }

    .mockup-img {
      width: 100%;
      height: calc(100% - 34px);
      object-fit: contain;
      background: #0b1120;
    }

    /* Subtitle Bottom Bar */
    .subtitles-bar {
      height: 110px;
      background: rgba(10, 15, 29, 0.95);
      border-top: 1.5px solid rgba(255, 255, 255, 0.1);
      padding: 0 60px;
      display: flex;
      align-items: center;
      gap: 20px;
      z-index: 10;
    }

    .mic-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      box-shadow: 0 0 15px rgba(2, 132, 199, 0.5);
    }

    .narration-text {
      font-size: 18px;
      font-weight: 600;
      color: #f8fafc;
      line-height: 1.4;
    }

    .narration-text strong {
      color: #fbbf24;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="brand">
      <img src="data:image/png;base64,${logoBase64}" alt="KORENS Logo" />
      <div class="brand-text">
        <h1>FrescoTrack Pro</h1>
        <p>Desarrollado y Respaldado por KORENS®</p>
      </div>
    </div>
    <div class="badge-header">
      Manual en Video para Técnicos
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    <div class="left-col">
      <div class="scene-tag">
        <span>ESCENA ${scene.num}</span>
        ${scene.tag}
      </div>

      <h2 class="scene-title">${scene.title}</h2>
      <p class="scene-subtitle">${scene.subtitle}</p>

      <div class="bullets">
        ${scene.bullets.map(b => `<div class="bullet">${b}</div>`).join('')}
      </div>

      <div class="child-box">
        <div class="icon">💡</div>
        <p>${scene.childTip}</p>
      </div>
    </div>

    <div class="right-col">
      <div class="mockup-window">
        <div class="mockup-bar">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <img class="mockup-img" src="data:image/png;base64,${screenshotBase64}" alt="${scene.title}" />
      </div>
    </div>
  </div>

  <!-- Narration Subtitles -->
  <div class="subtitles-bar">
    <div class="mic-icon">🎙️</div>
    <div class="narration-text">
      <strong>Voz en Off:</strong> "${scene.narration}"
    </div>
  </div>
</body>
</html>`;
}

async function renderSlides() {
  const buildDir = path.resolve('scripts/video_build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const logoBase64 = fs.readFileSync('docs/images/korens-logo.png').toString('base64');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    console.log(`Generating Slide ${i + 1}/${SCENES.length}: ${scene.title}...`);
    const imgBase64 = fs.readFileSync(scene.image).toString('base64');
    const html = generateSlideHtml(scene, logoBase64, imgBase64);

    await page.setContent(html, { waitUntil: 'load' });
    const slidePath = path.join(buildDir, `slide_${i + 1}.png`);
    await page.screenshot({ path: slidePath });
  }

  await browser.close();
  console.log('✅ All 8 Full HD 1920x1080 video slides generated successfully!');
}

renderSlides().catch(err => {
  console.error('Error generating video slides:', err);
  process.exit(1);
});
