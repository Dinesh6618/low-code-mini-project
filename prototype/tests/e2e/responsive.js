const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const SHOTS = process.env.SHOTS_DIR || path.join(os.tmpdir(), 'boutiqueflow-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL = require('url').pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STORE = ['#/', '#/shop', '#/shop?cat=dresses&size=M', '#/product/mahika-kanchipuram-silk-saree', '#/product/gold-plated-jhumka-earrings', '#/bag', '#/checkout', '#/review', '#/track', '#/login', '#/register', '#/page/returns'];
const CUSTOMER = ['#/account', '#/account/profile', '#/account/addresses'];
const ADMIN = ['#/admin', '#/admin/orders', '#/admin/products', '#/admin/products/new', '#/admin/inventory', '#/admin/customers', '#/admin/staff', '#/admin/reports', '#/admin/notifications', '#/admin/settings'];

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND|fonts\.g/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  const problems = [];
  const widths = [[390, 844, 'm'], [820, 1100, 't'], [1440, 900, 'd']];
  for (const [w, h, tag] of widths) {
    await page.setViewport({ width: w, height: h });
    await page.goto(URL); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.reload(); await sleep(900);
    const visit = async (r, shotName) => {
      await page.evaluate((x) => { location.hash = x; }, r); await sleep(450);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, culprit: (() => { const out = []; document.querySelectorAll('body *').forEach((e) => { const b = e.getBoundingClientRect(); if (b.right > document.documentElement.clientWidth + 1 && b.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('.table-wrap,.matrix-wrap,.drawer,.chip-row,.tabs,.side-nav,.bars,svg,[hidden]')) out.push(e.tagName + '.' + (e.className && e.className.baseVal === undefined ? e.className : '') + ' ' + Math.round(b.right)); }); return out.slice(0, 3); })() }));
      if (m.sw > m.cw + 1) problems.push(`${tag} ${r}: scrollWidth ${m.sw} > ${m.cw}  ${m.culprit.join(' | ')}`);
      if (shotName && tag === 'm') await page.screenshot({ path: `${SHOTS}/m-${shotName}.png`, fullPage: true });
    };
    // storefront needs a bag for checkout / review
    await page.evaluate(() => { const v = BF.api.product('linen-boxy-shirt').variants.find((x) => x.stock > 2); BF.api.cartAdd(v.id, 1); });
    for (const r of STORE) await visit(r, r.replace(/[^a-z0-9]+/gi, '_').slice(0, 30));
    await page.evaluate(() => { BF.api.login('customer@boutiqueflow.demo', 'demo1234'); });
    for (const r of CUSTOMER) await visit(r, r.replace(/[^a-z0-9]+/gi, '_').slice(0, 30));
    await page.evaluate(() => { BF.api.logout(); BF.api.login('admin@boutiqueflow.demo', 'demo1234'); });
    for (const r of ADMIN) await visit(r, r.replace(/[^a-z0-9]+/gi, '_').slice(0, 30));
  }
  console.log(problems.length ? 'OVERFLOW PROBLEMS:\n' + problems.join('\n') : 'No horizontal overflow at 390 / 820 / 1440');
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No console/page errors');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(2); });

