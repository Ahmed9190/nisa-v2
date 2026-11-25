import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'nisa.db');
const SNAPSHOT_PATH = path.join(DATA_DIR, 'collected-snapshot.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[İı]/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function initSchema() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      description_en TEXT DEFAULT '',
      description_ar TEXT DEFAULT '',
      status TEXT DEFAULT 'visible',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug_en TEXT NOT NULL,
      slug_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      description_en TEXT DEFAULT '',
      description_ar TEXT DEFAULT '',
      details_en TEXT DEFAULT '',
      details_ar TEXT DEFAULT '',
      washing_en TEXT DEFAULT '',
      washing_ar TEXT DEFAULT '',
      category_id TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      discount_price REAL,
      stock INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      is_new_arrival INTEGER NOT NULL DEFAULT 0,
      default_image TEXT DEFAULT '',
      hover_image TEXT DEFAULT '',
      sizes_json TEXT NOT NULL DEFAULT '[]',
      colors_json TEXT NOT NULL DEFAULT '[]',
      variants_json TEXT NOT NULL DEFAULT '[]',
      sold_qty INTEGER NOT NULL DEFAULT 0,
      average_rating REAL,
      rating_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      slug TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      content_en TEXT NOT NULL,
      content_ar TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name_en TEXT NOT NULL,
      product_name_ar TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      message TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      image TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      notes TEXT DEFAULT '',
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping_fee REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super_admin',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);
}

export function seedFromSnapshot(force = false) {
  initSchema();
  const now = new Date().toISOString();

  // Always ensure default out-of-the-box admin user exists
  const existingAdmin = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
  if (!existingAdmin) {
    db.prepare(
      'INSERT INTO admin_users (email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('admin@nisamodestwear.local', 'Nisa Admin', 'super_admin', hashPassword('nisa-admin-2026'), now);
  }

  const productCount = db.prepare('SELECT COUNT(*) AS cnt FROM products').get().cnt;
  if (productCount > 0 && !force) {
    return;
  }

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return;
  }

  const snap = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  const settings = snap.settings?.data?.settings || {};
  const home = snap.home?.data?.home || {};
  const promotion = snap.promotion?.data || {};
  const categories = snap.categories?.data?.categories || [];
  const rawProducts = [
    ...(snap.products_p1?.data || []),
    ...(snap.products_p2?.data || []),
  ];

  // Merge any home products not in paginated list
  const seen = new Set(rawProducts.map((p) => p._id));
  for (const listName of ['newArrivals', 'bestSellers', 'promoBannerProducts']) {
    for (const p of home[listName] || []) {
      if (!seen.has(p._id)) {
        seen.add(p._id);
        rawProducts.push(p);
      }
    }
  }

  const upsertSetting = db.prepare(
    'INSERT OR REPLACE INTO store_settings (key, json, updated_at) VALUES (?, ?, ?)'
  );
  upsertSetting.run('settings', JSON.stringify(settings), now);
  upsertSetting.run('hero', JSON.stringify(home.hero || {}), now);
  upsertSetting.run('homeCollections', JSON.stringify(home.homeCollections || []), now);
  upsertSetting.run('promoBanner', JSON.stringify(home.promoBanner || {}), now);
  upsertSetting.run('promotion', JSON.stringify(promotion), now);
  upsertSetting.run(
    'newArrivalIds',
    JSON.stringify((home.newArrivals || []).map((p) => p._id)),
    now
  );
  upsertSetting.run(
    'bestSellerIds',
    JSON.stringify((home.bestSellers || []).map((p) => p._id)),
    now
  );
  upsertSetting.run(
    'promoProductIds',
    JSON.stringify((home.promoBannerProducts || []).map((p) => p._id)),
    now
  );

  const upsertCat = db.prepare(`
    INSERT OR REPLACE INTO categories
      (id, slug, name_en, name_ar, description_en, description_ar, status, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  categories.forEach((c, idx) => {
    upsertCat.run(
      c._id,
      slugify(c.name?.en || c._id),
      c.name?.en || '',
      c.name?.ar || '',
      c.description?.en || '',
      c.description?.ar || '',
      c.status || 'visible',
      idx,
      c.createdAt || now,
      c.updatedAt || now
    );
  });

  const upsertProd = db.prepare(`
    INSERT OR REPLACE INTO products (
      id, slug_en, slug_ar, name_en, name_ar, description_en, description_ar,
      details_en, details_ar, washing_en, washing_ar, category_id, price, discount_price,
      stock, status, is_new_arrival, default_image, hover_image,
      sizes_json, colors_json, variants_json, sold_qty, average_rating, rating_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of rawProducts) {
    const colors = (p.availability?.colors || []).map((c) => ({
      color: c.color,
      available: Boolean(c.available ?? true),
      outOfStock: Boolean(c.outOfStock ?? false),
      imageUrl: c.imageUrl || '',
    }));

    let defaultImage = p.media?.default?.url || '';
    let hoverImage = p.media?.hover?.url || '';
    if (!defaultImage) {
      defaultImage = colors.find((c) => c.imageUrl)?.imageUrl || '';
    }
    if (!hoverImage) {
      hoverImage = colors.find((c) => c.imageUrl && c.imageUrl !== defaultImage)?.imageUrl || '';
    }

    const variants = p.availability?.variants || p.variants || [];
    upsertProd.run(
      p._id,
      p.slug?.en || slugify(p.name?.en || p._id),
      p.slug?.ar || p._id,
      p.name?.en || '',
      p.name?.ar || '',
      p.description?.en || '',
      p.description?.ar || '',
      p.details?.en || '',
      p.details?.ar || '',
      p.washingTips?.en || '',
      p.washingTips?.ar || '',
      p.category?._id || '',
      Number(p.price || 0),
      p.discountPrice != null ? Number(p.discountPrice) : null,
      Number(p.stock || 0),
      p.status || 'ACTIVE',
      p.isNewArrival ? 1 : 0,
      defaultImage,
      hoverImage,
      JSON.stringify(p.sizes || []),
      JSON.stringify(colors),
      JSON.stringify(variants),
      Number(p.soldQty || 0),
      p.averageRating != null ? Number(p.averageRating) : null,
      Number(p.ratingCount || 0),
      p.createdAt || now,
      p.updatedAt || now
    );
  }

  const upsertPage = db.prepare(`
    INSERT OR REPLACE INTO pages (slug, title_en, title_ar, content_en, content_ar, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const key of ['page_privacy', 'page_return_policy', 'page_shipping_policy', 'page_about']) {
    const page = snap[key]?.data?.page;
    if (page) {
      upsertPage.run(
        page.slug,
        page.title?.en || page.slug,
        page.title?.ar || page.slug,
        page.content?.en || '',
        page.content?.ar || '',
        now
      );
    }
  }
  upsertPage.run(
    'contact',
    'Contact Us',
    'تواصلي معنا',
    '<p>For sizing guidance, order inquiries, or styling assistance, reach us on WhatsApp (+20 101 180 0886) or Instagram (@nisa.modest.wear).</p>',
    '<p>للاستفسار عن المقاسات أو الطلبات، تواصلي معنا عبر واتساب (+20 101 180 0886) أو إنستغرام (@nisa.modest.wear).</p>',
    now
  );

  const fbCount = db.prepare('SELECT COUNT(*) AS cnt FROM feedbacks').get().cnt;
  if (fbCount === 0 || force) {
    if (force) db.exec('DELETE FROM feedbacks');
    const insFb = db.prepare(`
      INSERT INTO feedbacks (product_name_en, product_name_ar, customer_name, message, rating, image, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const fb of home.feedbacks || []) {
      insFb.run(
        fb.product?.name?.en || 'Nisa Piece',
        fb.product?.name?.ar || 'قطعة من نيسا',
        fb.customerName || 'Anonymous',
        fb.message || '',
        Number(fb.rating || 5),
        fb.image || '',
        now
      );
    }
  }
}
