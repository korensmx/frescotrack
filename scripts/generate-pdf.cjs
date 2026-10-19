const puppeteer = require('/Users/gdas/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePdf() {
  const htmlPath = path.join(__dirname, '../docs/manual_korens.html');
  const outputPdf = path.join(__dirname, '../Manual_Operacion_FrescoTrack_KORENS.pdf');
  const artifactPdf = '/Users/gdas/.gemini/antigravity/brain/7455d87c-3cde-4b6b-9626-964152a7e23c/Manual_Operacion_FrescoTrack_KORENS.pdf';

  console.log('Launching headless Chrome to render PDF...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set screen emulation so fonts and CSS render at desktop scale
  await page.emulateMediaType('screen');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Give a moment for fonts and images to load completely
  await new Promise(r => setTimeout(r, 1200));

  console.log('Exporting PDF with printBackground: true...');
  await page.pdf({
    path: outputPdf,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm'
    }
  });

  await browser.close();

  // Copy to artifacts dir
  fs.copyFileSync(outputPdf, artifactPdf);

  const stats = fs.statSync(outputPdf);
  console.log(`✅ PDF generated successfully: ${outputPdf} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`✅ PDF copied to artifact folder: ${artifactPdf}`);
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
