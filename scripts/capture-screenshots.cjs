const puppeteer = require('/Users/gdas/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const imgDir = path.join(__dirname, '../docs/images');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,880']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 880, deviceScaleFactor: 2 });

  // 1. Dashboard / Mando Técnico
  console.log('1. Capturing Dashboard...');
  await page.goto('http://localhost:5173/?panel=1', { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(imgDir, '1_dashboard.png') });

  // 2. Open Register Modal ("Nuevo Clima")
  console.log('2. Capturing Register Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Nuevo Clima') || b.innerText.includes('Nuevo'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(imgDir, '2_register_modal.png') });

  // Close modal via Escape
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 3. Stickers Tab
  console.log('3. Capturing Stickers Tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Stickers QR'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(imgDir, '3_stickers.png') });

  // 4. WhatsApp Tab
  console.log('4. Capturing WhatsApp Tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('WhatsApp Web'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(imgDir, '4_whatsapp.png') });

  // 5. Settings Tab & Pricing
  console.log('5. Capturing Settings Tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Ajustes & Tarifas'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(imgDir, '5_settings.png') });

  // 6. Public Equipment QR Carnet
  console.log('6. Capturing Equipment QR Carnet (FT-1001)...');
  await page.goto('http://localhost:5173/?folio=FT-1001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: path.join(imgDir, '6_carnet_qr.png') });

  // 7. Public Website Landing Page
  console.log('7. Capturing Public Website...');
  await page.goto('http://localhost:5173/?vista=public', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: path.join(imgDir, '7_public_website.png') });

  await browser.close();
  console.log('✅ All screenshots captured successfully in docs/images!');
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
