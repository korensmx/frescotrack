const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

const NARRATIONS = [
  {
    num: 1,
    text: "¡Hola colega técnico! Bienvenido a FrescoTrack, la plataforma inteligente creada y desarrollada exclusivamente por KORENS para que jamás pierdas un cliente y aumentes tus ingresos. Vamos a aprender a usarla paso a paso."
  },
  {
    num: 2,
    text: "Este es tu Mando Técnico. Arriba tienes un semáforo muy fácil: verde significa al corriente; amarillo, por vencer en 30 días; y rojo significa más de 6 meses, dinero listo para cobrar hoy mismo. Tienes botones para mandar WhatsApp en un clic y renovar el servicio."
  },
  {
    num: 3,
    text: "Cuando termines de lavar o instalar un clima, tocas el botón azul Nuevo Clima. Escribes el nombre del cliente, su teléfono de 10 dígitos, la capacidad del minisplit y la presión del gas. Al tocar Guardar, el sistema genera su folio único en menos de 45 segundos y programa su mantenimiento futuro."
  },
  {
    num: 4,
    text: "En la pestaña Stickers QR imprimes tus etiquetas de alta calidad. Cada código QR tiene un folio único que nunca se confunde con el de otro técnico. Lo pegas en la carcasa del minisplit y tu teléfono se queda en la pared del cliente por años, garantizando que siempre te llamen a ti."
  },
  {
    num: 5,
    text: "En la pestaña WhatsApp Web vinculas tu celular escaneando el código QR en pantalla. Cada mañana a las 9 de la mañana, el motor inteligente revisa qué clientes cumplieron 6 meses y les manda un mensaje amable para renovar su servicio. ¡Tú solo recibes la confirmación en tu chat!"
  },
  {
    num: 6,
    text: "En Ajustes y Tarifas tú tienes el control total. Puedes configurar tus precios para las 10 combinaciones de climas, desde 1 tonelada hasta 3 toneladas Inverter, y personalizar el texto exacto de WhatsApp que recibirán tus clientes con un previsualizador en vivo."
  },
  {
    num: 7,
    text: "Cuando tu cliente escanea el sticker con la cámara de su teléfono, se abre su Carnet Digital en segundos sin bajar ninguna aplicación. Ahí ve la salud de su equipo y un botón gigante para llamarte. Además, cuentas con tu propio sitio web con cotizador respaldado con el sello Powered by KORENS."
  },
  {
    num: 8,
    text: "En resumen, tu rutina es muy simple: llegas, haces tu trabajo, registras el equipo en 45 segundos y pegas tu sticker QR. FrescoTrack y KORENS se encargan del resto. ¡Mucho éxito en tus servicios y a crecer tu negocio!"
  }
];

async function buildVideo() {
  const buildDir = path.resolve('scripts/video_build');
  const outputFinal = path.resolve('Manual_Video_FrescoTrack_KORENS.mp4');
  const publicFinal = path.resolve('public/Manual_Video_FrescoTrack_KORENS.mp4');
  const artifactFinal = '/Users/gdas/.gemini/antigravity/brain/7455d87c-3cde-4b6b-9626-964152a7e23c/Manual_Video_FrescoTrack_KORENS.mp4';

  const concatListPath = path.join(buildDir, 'concat_list.txt');
  let concatContent = '';

  console.log(`Starting video rendering with ${NARRATIONS.length} scenes...`);

  for (const item of NARRATIONS) {
    const sceneNum = item.num;
    console.log(`\n--- Processing Scene ${sceneNum} ---`);

    const aiffPath = path.join(buildDir, `audio_${sceneNum}.aiff`);
    const m4aPath = path.join(buildDir, `audio_${sceneNum}.m4a`);
    const slidePath = path.join(buildDir, `slide_${sceneNum}.png`);
    const sceneMp4 = path.join(buildDir, `scene_${sceneNum}.mp4`);

    // 1. Synthesize audio with Paulina (Mexican Spanish)
    console.log(`Synthesizing voiceover for scene ${sceneNum}...`);
    execSync(`say -v Paulina -o "${aiffPath}" "${item.text.replace(/"/g, '\\"')}"`);

    // 2. Convert to AAC M4A
    execSync(`"${ffmpeg}" -i "${aiffPath}" -c:a aac -b:a 192k -y "${m4aPath}" 2>/dev/null`);

    // 3. Render MP4 segment with still image + audio (-shortest)
    console.log(`Encoding scene ${sceneNum} video at 1920x1080...`);
    execSync(`"${ffmpeg}" -loop 1 -i "${slidePath}" -i "${m4aPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -r 25 -shortest -y "${sceneMp4}" 2>/dev/null`);

    concatContent += `file '${sceneMp4}'\n`;
  }

  // 4. Concatenate all scenes into master video
  fs.writeFileSync(concatListPath, concatContent);
  console.log('\nMerging all scenes into master video...');
  execSync(`"${ffmpeg}" -f concat -safe 0 -i "${concatListPath}" -c copy -y "${outputFinal}" 2>/dev/null`);

  // Copy to public and artifacts
  fs.copyFileSync(outputFinal, publicFinal);
  fs.copyFileSync(outputFinal, artifactFinal);

  const stats = fs.statSync(outputFinal);
  console.log(`\n🎉 MASTER VIDEO CREATED SUCCESSFULLY!`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Path 1: ${outputFinal}`);
  console.log(`Path 2: ${publicFinal}`);
  console.log(`Path 3: ${artifactFinal}`);
}

buildVideo().catch(err => {
  console.error('Error building video:', err);
  process.exit(1);
});
