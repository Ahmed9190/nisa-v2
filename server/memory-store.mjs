import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  formatCategory,
  formatProduct,
  hashPassword,
  parseSnapshotData,
  signAdminToken,
  slugify,
  verifyAdminToken,
} from './seed-helpers.mjs';

const TMP_STATE_PATH = '/tmp/nisa-netlify-store.json';

function initState() {
  if (fs.existsSync(TMP_STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(TMP_STATE_PATH, 'utf-8'));
    } catch {
      // re-seed if corrupt
    }
  }

  const parsed = parseSnapshotData();
  const now = new Date().toISOString();
  const state = {
    settingsMap: parsed?.settingsMap || {},
    categories: parsed?.categories || [],
    products: parsed?.products || [],
    pages: parsed?.pages || [],
    feedbacks: parsed?.feedbacks || [],
    orders: [],
    subscribers: [],
    adminUsers: [
      {
        id: 1,
        email: 'admin@nisamodestwear.local',
        name: 'Nisa Admin',
        role: 'super_admin',
        password_hash: hashPassword('nisa-admin-2026'),
        created_at: now,
      },
    ],
    adminSessions: [],
  };
  persist(state);
  return state;
}

function persist(state) {
  try {
    fs.writeFileSync(TMP_STATE_PATH, JSON.stringify(state));
  } catch {
    // ignore if /tmp unavailable
  }
}

export function createMemoryStore() {
  const state = initState();

  const getCategoryMap = () => {
    const sorted = [...state.categories].sort((a, b) => a.sort_order - b.sort_order);
    const map = new Map();
    for (const c of sorted) map.set(c.id, c);
    return { rows: sorted, map };
  };

  return {
    getSetting(key, fallback = {}) {
      return state.settingsMap[key] ?? fallback;
    },

    setSetting(key, val) {
      state.settingsMap[key] = val;
      persist(state);
    },

    listCategories({ visibleOnly = false } = {}) {
      const { rows } = getCategoryMap();
      return (visibleOnly ? rows.filter((r) => r.status === 'visible') : rows).map(formatCategory);
    },

    createCategory(b) {
      const now = new Date().toISOString();
      const id = crypto.randomBytes(12).toString('hex');
      const row = {
        id,
        slug: b.slug || slugify(b.name.en),
        name_en: b.name.en,
        name_ar: b.name.ar || b.name.en,
        description_en: b.description?.en || '',
        description_ar: b.description?.ar || '',
        status: b.status || 'visible',
        sort_order: Number(b.sortOrder || state.categories.length),
        created_at: now,
        updated_at: now,
      };
      state.categories.push(row);
      persist(state);
      return formatCategory(row);
    },

    updateCategory(id, b) {
      const existing = state.categories.find((c) => c.id === id);
      if (!existing) return null;
      existing.slug = b.slug ?? existing.slug;
      existing.name_en = b.name?.en ?? existing.name_en;
      existing.name_ar = b.name?.ar ?? existing.name_ar;
      existing.description_en = b.description?.en ?? existing.description_en;
      existing.description_ar = b.description?.ar ?? existing.description_ar;
      existing.status = b.status ?? existing.status;
      existing.updated_at = new Date().toISOString();
      persist(state);
      return formatCategory(existing);
    },

    deleteCategory(id) {
      const prev = state.categories.length;
      state.categories = state.categories.filter((c) => c.id !== id);
      persist(state);
      return state.categories.length < prev;
    },

    listProducts({ activeOnly = false } = {}) {
      const { map: catMap } = getCategoryMap();
      const list = activeOnly
        ? state.products.filter((p) => p.status === 'ACTIVE')
        : [...state.products].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return list.map((r) => formatProduct(r, catMap));
    },

    getProductByIdOrSlug(idOrSlug) {
      const row = state.products.find(
        (p) => p.id === idOrSlug || p.slug_en === idOrSlug || p.slug_ar === idOrSlug
      );
      if (!row) return null;
      const { map: catMap } = getCategoryMap();
      return formatProduct(row, catMap);
    },

    createProduct(b) {
      const now = new Date().toISOString();
      const id = crypto.randomBytes(12).toString('hex');
      const slugEn = b.slug?.en || `${slugify(b.name.en)}-${id.slice(-4)}`;
      const row = {
        id,
        slug_en: slugEn,
        slug_ar: b.slug?.ar || slugEn,
        name_en: b.name.en,
        name_ar: b.name.ar || b.name.en,
        description_en: b.description?.en || '',
        description_ar: b.description?.ar || '',
        details_en: b.details?.en || '',
        details_ar: b.details?.ar || '',
        washing_en: b.washingTips?.en || '',
        washing_ar: b.washingTips?.ar || '',
        category_id: b.categoryId || '',
        price: Number(b.price || 0),
        discount_price: b.discountPrice != null && b.discountPrice !== '' ? Number(b.discountPrice) : null,
        stock: Number(b.stock || 0),
        status: b.status || 'ACTIVE',
        is_new_arrival: b.isNewArrival ? 1 : 0,
        default_image: b.defaultImage || '',
        hover_image: b.hoverImage || '',
        sizes: Array.isArray(b.sizes) ? b.sizes : ['One Size'],
        colors: Array.isArray(b.colors) ? b.colors : [],
        variants: Array.isArray(b.variants) ? b.variants : [],
        sold_qty: 0,
        average_rating: null,
        rating_count: 0,
        created_at: now,
        updated_at: now,
      };
      state.products.unshift(row);
      persist(state);
      const { map: catMap } = getCategoryMap();
      return formatProduct(row, catMap);
    },

    updateProduct(id, b) {
      const existing = state.products.find((p) => p.id === id);
      if (!existing) return null;
      existing.name_en = b.name?.en ?? existing.name_en;
      existing.name_ar = b.name?.ar ?? existing.name_ar;
      existing.description_en = b.description?.en ?? existing.description_en;
      existing.description_ar = b.description?.ar ?? existing.description_ar;
      existing.details_en = b.details?.en ?? existing.details_en;
      existing.details_ar = b.details?.ar ?? existing.details_ar;
      existing.washing_en = b.washingTips?.en ?? existing.washing_en;
      existing.washing_ar = b.washingTips?.ar ?? existing.washing_ar;
      existing.category_id = b.categoryId ?? existing.category_id;
      existing.price = b.price !== undefined ? Number(b.price) : existing.price;
      existing.discount_price =
        b.discountPrice === null || b.discountPrice === ''
          ? null
          : b.discountPrice !== undefined
            ? Number(b.discountPrice)
            : existing.discount_price;
      existing.stock = b.stock !== undefined ? Number(b.stock) : existing.stock;
      existing.status = b.status ?? existing.status;
      existing.is_new_arrival =
        b.isNewArrival !== undefined ? (b.isNewArrival ? 1 : 0) : existing.is_new_arrival;
      existing.default_image = b.defaultImage ?? existing.default_image;
      existing.hover_image = b.hoverImage ?? existing.hover_image;
      if (b.sizes !== undefined) existing.sizes = b.sizes;
      if (b.colors !== undefined) existing.colors = b.colors;
      if (b.variants !== undefined) existing.variants = b.variants;
      existing.updated_at = new Date().toISOString();
      persist(state);
      const { map: catMap } = getCategoryMap();
      return formatProduct(existing, catMap);
    },

    deleteProduct(id) {
      const prev = state.products.length;
      state.products = state.products.filter((p) => p.id !== id);
      persist(state);
      return state.products.length < prev;
    },

    getPage(slug) {
      const row = state.pages.find((p) => p.slug === slug);
      if (!row) return null;
      return {
        slug: row.slug,
        title: { en: row.title_en, ar: row.title_ar },
        content: { en: row.content_en, ar: row.content_ar },
        updatedAt: row.updated_at,
      };
    },

    listPages() {
      return [...state.pages].sort((a, b) => a.slug.localeCompare(b.slug));
    },

    savePage(slug, { title_en, title_ar, content_en, content_ar }) {
      const now = new Date().toISOString();
      const idx = state.pages.findIndex((p) => p.slug === slug);
      const record = {
        slug,
        title_en: title_en || slug,
        title_ar: title_ar || slug,
        content_en: content_en || '',
        content_ar: content_ar || '',
        updated_at: now,
      };
      if (idx >= 0) state.pages[idx] = record;
      else state.pages.push(record);
      persist(state);
    },

    listFeedbacks() {
      return [...state.feedbacks].sort((a, b) => b.id - a.id);
    },

    createFeedback(b) {
      const id = (state.feedbacks.reduce((m, f) => Math.max(m, f.id), 0) || 0) + 1;
      state.feedbacks.push({
        id,
        product_name_en: b.productName || 'Nisa Piece',
        product_name_ar: b.productName || 'قطعة من نيسا',
        customer_name: b.customerName || 'Anonymous',
        message: b.message || '',
        rating: Number(b.rating || 5),
        image: b.image || '',
        created_at: new Date().toISOString(),
      });
      persist(state);
      return id;
    },

    deleteFeedback(id) {
      state.feedbacks = state.feedbacks.filter((f) => f.id !== Number(id));
      persist(state);
    },

    createOrder({ customerName, customerPhone, customerEmail = '', city, address, notes = '', items }) {
      const now = new Date().toISOString();
      const orderId = crypto.randomUUID();
      const orderNumber = `NISA-${Date.now().toString().slice(-6)}`;
      let subtotal = 0;
      const normalizedItems = [];

      for (const reqItem of items) {
        const qty = Math.max(1, Number(reqItem.quantity || 1));
        const prod = state.products.find((p) => p.id === reqItem.productId);
        if (!prod) throw new Error(`Product ${reqItem.productId} not found`);
        const unitPrice = prod.discount_price != null ? prod.discount_price : prod.price;
        subtotal += unitPrice * qty;

        prod.stock = Math.max(0, prod.stock - qty);
        prod.sold_qty += qty;
        prod.variants = (prod.variants || []).map((v) => {
          if (v.color === reqItem.color && v.size === reqItem.size) {
            const next = Math.max(0, Number(v.stock || 0) - qty);
            return { ...v, stock: next, outOfStock: next <= 0 };
          }
          return v;
        });
        prod.updated_at = now;

        normalizedItems.push({
          productId: prod.id,
          name: prod.name_en,
          color: reqItem.color || 'Default',
          size: reqItem.size || 'One Size',
          quantity: qty,
          unitPrice,
          lineTotal: unitPrice * qty,
          image: prod.default_image,
        });
      }

      const shippingFee = subtotal >= 3000 ? 0 : 80;
      const total = subtotal + shippingFee;
      state.orders.unshift({
        id: orderId,
        order_number: orderNumber,
        customer_name: String(customerName).trim(),
        customer_phone: String(customerPhone).trim(),
        customer_email: String(customerEmail).trim(),
        city: String(city).trim(),
        address: String(address).trim(),
        notes: String(notes).trim(),
        items: normalizedItems,
        subtotal,
        shipping_fee: shippingFee,
        total,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
      persist(state);
      return {
        id: orderId,
        orderNumber,
        subtotal,
        shippingFee,
        total,
        status: 'pending',
        createdAt: now,
      };
    },

    listOrders(limit = 0) {
      return limit > 0 ? state.orders.slice(0, limit) : state.orders;
    },

    updateOrderStatus(id, status) {
      const o = state.orders.find((x) => x.id === id);
      if (!o) return null;
      o.status = status;
      o.updated_at = new Date().toISOString();
      persist(state);
      return o;
    },

    addSubscriber(email) {
      if (!state.subscribers.some((s) => s.email === email)) {
        state.subscribers.unshift({
          id: state.subscribers.length + 1,
          email,
          created_at: new Date().toISOString(),
        });
        persist(state);
      }
    },

    listSubscribers() {
      return state.subscribers;
    },

    authenticateAdmin(email, password) {
      const user = state.adminUsers.find((u) => u.email === email);
      if (!user || user.password_hash !== hashPassword(password)) return null;
      const publicUser = { id: user.id, email: user.email, name: user.name, role: user.role };
      const token = signAdminToken(publicUser);
      return { token, user: publicUser };
    },

    getSession(token) {
      return verifyAdminToken(token);
    },

    deleteSession(_token) {
      // Stateless HMAC token; client clears localStorage on logout
    },

    getOverviewStats() {
      return {
        revenue: state.orders
          .filter((o) => o.status !== 'cancelled')
          .reduce((sum, o) => sum + o.total, 0),
        ordersCount: state.orders.length,
        pendingOrders: state.orders.filter((o) => o.status === 'pending').length,
        productsCount: state.products.length,
        activeProducts: state.products.filter((p) => p.status === 'ACTIVE').length,
        lowStockCount: state.products.filter((p) => p.stock <= 3).length,
        categoriesCount: state.categories.length,
        subscribersCount: state.subscribers.length,
      };
    },
  };
}
