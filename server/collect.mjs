import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedFromSnapshot } from './db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(__dirname, 'data', 'collected-snapshot.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BASE_URL = 'https://www.nisamodestwear.com';

const ENDPOINTS = {
  settings: '/api/store/settings',
  home: '/api/store/home',
  promotion: '/api/store/promotion',
  categories: '/api/categories',
  products_p1: '/api/products?page=1&limit=24',
  products_p2: '/api/products?page=2&limit=24',
  page_privacy: '/api/store/page/privacy',
  page_return_policy: '/api/store/page/return-policy',
  page_shipping_policy: '/api/store/page/shipping-policy',
  page_about: '/api/store/page/about',
};

function collectPaths(obj, out = new Set()) {
  if (typeof obj === 'string' && obj.startsWith('/uploads/')) {
    out.add(obj);
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectPaths(item, out);
  } else if (obj && typeof obj === 'object') {
    for (const val of Object.values(obj)) collectPaths(val, out);
  }
  return out;
}

async function downloadAsset(relPath) {
  const dest = path.join(PUBLIC_DIR, relPath.replace(/^\/+/, ''));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'cached';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const encoded = relPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  const res = await fetch(`${BASE_URL}${encoded}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`${res.status} ${relPath}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return 'downloaded';
}

async function main() {
  console.log('Collecting public storefront data from', BASE_URL);
  const snapshot = {};
  for (const [key, endpoint] of Object.entries(ENDPOINTS)) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error(`Failed ${endpoint}: ${res.status}`);
    snapshot[key] = await res.json();
    console.log(`  ✓ ${endpoint}`);
  }

  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  const assets = Array.from(collectPaths(snapshot));
  let downloaded = 0;
  let cached = 0;
  for (const rel of assets) {
    const status = await downloadAsset(rel);
    if (status === 'downloaded') downloaded++;
    else cached++;
  }
  console.log(`Assets verified: ${assets.length} total (${downloaded} new, ${cached} cached)`);

  seedFromSnapshot(true);
  console.log('Database seeded at server/data/nisa.db');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
