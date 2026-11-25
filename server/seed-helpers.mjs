import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
export const SNAPSHOT_PATH = path.join(DATA_DIR, 'collected-snapshot.json');

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const TOKEN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.createHash('sha256').update('nisa-modest-wear-session-secret-v1').digest('hex');

export function signAdminToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    if (!payload || !payload.exp || payload.exp <= Date.now()) return null;
    return {
      token,
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
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

export function parseSnapshotData(snapshotPath = SNAPSHOT_PATH) {
  const candidates = [
    snapshotPath,
    path.resolve(process.cwd(), 'server/data/collected-snapshot.json'),
    process.env.LAMBDA_TASK_ROOT
      ? path.join(process.env.LAMBDA_TASK_ROOT, 'server/data/collected-snapshot.json')
      : '',
  ].filter(Boolean);
  const resolved = candidates.find((p) => fs.existsSync(p));
  if (!resolved) return null;
  const snap = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  const now = new Date().toISOString();
  const settings = snap.settings?.data?.settings || {};
  const home = snap.home?.data?.home || {};
  const promotion = snap.promotion?.data || {};
  const categoriesRaw = snap.categories?.data?.categories || [];

  const rawProducts = [
    ...(snap.products_p1?.data || []),
    ...(snap.products_p2?.data || []),
  ];
  const seen = new Set(rawProducts.map((p) => p._id));
  for (const listName of ['newArrivals', 'bestSellers', 'promoBannerProducts']) {
    for (const p of home[listName] || []) {
      if (!seen.has(p._id)) {
        seen.add(p._id);
        rawProducts.push(p);
      }
    }
  }

  const categories = categoriesRaw.map((c, idx) => ({
    id: c._id,
    slug: slugify(c.name?.en || c._id),
    name_en: c.name?.en || '',
    name_ar: c.name?.ar || '',
    description_en: c.description?.en || '',
    description_ar: c.description?.ar || '',
    status: c.status || 'visible',
    sort_order: idx,
    created_at: c.createdAt || now,
    updated_at: c.updatedAt || now,
  }));

  const products = rawProducts.map((p) => {
    const colors = (p.availability?.colors || []).map((c) => ({
      color: c.color,
      available: Boolean(c.available ?? true),
      outOfStock: Boolean(c.outOfStock ?? false),
      imageUrl: c.imageUrl || '',
    }));
    let defaultImage = p.media?.default?.url || '';
    let hoverImage = p.media?.hover?.url || '';
    if (!defaultImage) defaultImage = colors.find((c) => c.imageUrl)?.imageUrl || '';
    if (!hoverImage) {
      hoverImage = colors.find((c) => c.imageUrl && c.imageUrl !== defaultImage)?.imageUrl || '';
    }
    return {
      id: p._id,
      slug_en: p.slug?.en || slugify(p.name?.en || p._id),
      slug_ar: p.slug?.ar || p._id,
      name_en: p.name?.en || '',
      name_ar: p.name?.ar || '',
      description_en: p.description?.en || '',
      description_ar: p.description?.ar || '',
      details_en: p.details?.en || '',
      details_ar: p.details?.ar || '',
      washing_en: p.washingTips?.en || '',
      washing_ar: p.washingTips?.ar || '',
      category_id: p.category?._id || '',
      price: Number(p.price || 0),
      discount_price: p.discountPrice != null ? Number(p.discountPrice) : null,
      stock: Number(p.stock || 0),
      status: p.status || 'ACTIVE',
      is_new_arrival: p.isNewArrival ? 1 : 0,
      default_image: defaultImage,
      hover_image: hoverImage,
      sizes: p.sizes || [],
      colors,
      variants: p.availability?.variants || p.variants || [],
      sold_qty: Number(p.soldQty || 0),
      average_rating: p.averageRating != null ? Number(p.averageRating) : null,
      rating_count: Number(p.ratingCount || 0),
      created_at: p.createdAt || now,
      updated_at: p.updatedAt || now,
    };
  });

  const pages = [];
  for (const key of ['page_privacy', 'page_return_policy', 'page_shipping_policy', 'page_about']) {
    const pg = snap[key]?.data?.page;
    if (pg) {
      pages.push({
        slug: pg.slug,
        title_en: pg.title?.en || pg.slug,
        title_ar: pg.title?.ar || pg.slug,
        content_en: pg.content?.en || '',
        content_ar: pg.content?.ar || '',
        updated_at: now,
      });
    }
  }
  pages.push({
    slug: 'contact',
    title_en: 'Contact Us',
    title_ar: 'تواصلي معنا',
    content_en:
      '<p>For sizing guidance, order inquiries, or styling assistance, reach us on WhatsApp (+20 101 180 0886) or Instagram (@nisa.modest.wear).</p>',
    content_ar:
      '<p>للاستفسار عن المقاسات أو الطلبات، تواصلي معنا عبر واتساب (+20 101 180 0886) أو إنستغرام (@nisa.modest.wear).</p>',
    updated_at: now,
  });

  const feedbacks = (home.feedbacks || []).map((fb, idx) => ({
    id: idx + 1,
    product_name_en: fb.product?.name?.en || 'Nisa Piece',
    product_name_ar: fb.product?.name?.ar || 'قطعة من نيسا',
    customer_name: fb.customerName || 'Anonymous',
    message: fb.message || '',
    rating: Number(fb.rating || 5),
    image: fb.image || '',
    created_at: now,
  }));

  return {
    settingsMap: {
      settings,
      hero: home.hero || {},
      homeCollections: home.homeCollections || [],
      promoBanner: home.promoBanner || {},
      promotion,
      newArrivalIds: (home.newArrivals || []).map((p) => p._id),
      bestSellerIds: (home.bestSellers || []).map((p) => p._id),
      promoProductIds: (home.promoBannerProducts || []).map((p) => p._id),
    },
    categories,
    products,
    pages,
    feedbacks,
  };
}

export function formatCategory(row) {
  return {
    _id: row.id,
    id: row.id,
    slug: row.slug,
    name: { en: row.name_en, ar: row.name_ar },
    description: { en: row.description_en, ar: row.description_ar },
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatProduct(row, catMap) {
  const colors = Array.isArray(row.colors) ? row.colors : JSON.parse(row.colors_json || '[]');
  const sizes = Array.isArray(row.sizes) ? row.sizes : JSON.parse(row.sizes_json || '[]');
  const variants = Array.isArray(row.variants)
    ? row.variants
    : JSON.parse(row.variants_json || '[]');
  const cat = catMap.get(row.category_id);

  return {
    _id: row.id,
    id: row.id,
    name: { en: row.name_en, ar: row.name_ar },
    slug: { en: row.slug_en, ar: row.slug_ar },
    description: { en: row.description_en, ar: row.description_ar },
    details: { en: row.details_en, ar: row.details_ar },
    washingTips: { en: row.washing_en, ar: row.washing_ar },
    categoryId: row.category_id,
    categoryName: cat ? { en: cat.name_en, ar: cat.name_ar } : { en: '', ar: '' },
    category: cat
      ? {
          _id: cat.id,
          slug: cat.slug,
          name: { en: cat.name_en, ar: cat.name_ar },
          status: cat.status,
        }
      : null,
    price: row.price,
    discountPrice: row.discount_price,
    stock: row.stock,
    inStock: row.stock > 0,
    status: row.status,
    isNewArrival: Boolean(row.is_new_arrival),
    defaultImage: row.default_image,
    hoverImage: row.hover_image,
    media: {
      default: { type: 'image', url: row.default_image },
      hover: { type: 'image', url: row.hover_image },
    },
    sizes,
    colors,
    variants,
    availability: {
      variantsSource: 'exact',
      totalQuantity: row.stock,
      colors,
      sizes: sizes.map((s) => ({ size: s, available: row.stock > 0, outOfStock: row.stock <= 0 })),
      variants,
    },
    soldQty: row.sold_qty,
    averageRating: row.average_rating,
    ratingCount: row.rating_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
