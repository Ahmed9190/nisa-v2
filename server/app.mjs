import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { slugify } from './seed-helpers.mjs';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

export function createApp({ store, serveStatic = true }) {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Normalize Netlify Function invocation prefix if passed through
  app.use((req, _res, next) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace(/^\/\.netlify\/functions\/api/, '') || '/';
    }
    next();
  });

  if (serveStatic) {
    app.use('/uploads', express.static(path.join(PUBLIC_DIR, 'uploads')));
  }

  function requireAdmin(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const session = store.getSession(token);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
    req.admin = session;
    next();
  }

  /* ==================== PUBLIC STOREFRONT API ==================== */

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/store/settings', (_req, res) => {
    res.json({ success: true, data: { settings: store.getSetting('settings', {}) } });
  });

  app.get('/api/store/promotion', (_req, res) => {
    res.json({ success: true, data: store.getSetting('promotion', { promotion: null }) });
  });

  app.get('/api/store/home', (_req, res) => {
    const settings = store.getSetting('settings', {});
    const hero = store.getSetting('hero', {});
    const homeCollections = store.getSetting('homeCollections', []);
    const promoBanner = store.getSetting('promoBanner', {});
    const newArrivalIds = store.getSetting('newArrivalIds', []);
    const bestSellerIds = store.getSetting('bestSellerIds', []);
    const promoProductIds = store.getSetting('promoProductIds', []);

    const activeProducts = store.listProducts({ activeOnly: true });
    const prodMap = new Map(activeProducts.map((p) => [p.id, p]));

    const pickByIds = (ids, fallbackFilter) => {
      const list = ids.map((id) => prodMap.get(id)).filter(Boolean);
      if (list.length > 0) return list;
      return activeProducts.filter(fallbackFilter).slice(0, 8);
    };

    const feedbacks = store.listFeedbacks().map((f) => ({
      id: f.id,
      product: { name: { en: f.product_name_en, ar: f.product_name_ar } },
      customerName: f.customer_name,
      message: f.message,
      rating: f.rating,
      image: f.image,
    }));

    res.json({
      success: true,
      data: {
        home: {
          store: settings,
          hero,
          homeCollections,
          promoBanner,
          newArrivals: pickByIds(newArrivalIds, (p) => p.isNewArrival),
          bestSellers: pickByIds(bestSellerIds, (p) => p.soldQty > 0),
          promoBannerProducts: pickByIds(promoProductIds, () => true),
          feedbacks,
        },
      },
    });
  });

  app.get('/api/store/page/:slug', (req, res) => {
    const page = store.getPage(req.params.slug);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: { page } });
  });

  app.get('/api/categories', (_req, res) => {
    res.json({ success: true, data: { categories: store.listCategories({ visibleOnly: true }) } });
  });

  app.get('/api/products', (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const category = String(req.query.category || '').trim().toLowerCase();
    const search = String(req.query.search || '').trim().toLowerCase();
    const sort = String(req.query.sort || 'CREATED_DESC');
    const availability = String(req.query.availability || 'all');

    const categories = store.listCategories();
    let items = store.listProducts({ activeOnly: true });

    if (category) {
      const matched = categories.filter(
        (c) =>
          c.id === category ||
          c.slug === category ||
          c.slug.includes(category.replace(/[^a-z0-9]/g, '')) ||
          slugify(c.name.en).includes(category)
      );
      const catIds = new Set(matched.map((c) => c.id));
      items = items.filter((p) => catIds.has(p.categoryId));
    }

    if (availability === 'in_stock') {
      items = items.filter((p) => p.stock > 0);
    }

    if (search) {
      items = items.filter((p) =>
        `${p.name.en} ${p.name.ar} ${p.categoryName.en} ${p.categoryName.ar}`
          .toLowerCase()
          .includes(search)
      );
    }

    if (sort === 'PRICE_ASC') {
      items.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    } else if (sort === 'PRICE_DESC') {
      items.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    } else if (sort === 'SALE') {
      items.sort((a, b) => {
        const sa = a.discountPrice && a.discountPrice < a.price ? 1 : 0;
        const sb = b.discountPrice && b.discountPrice < b.price ? 1 : 0;
        return sb - sa;
      });
    } else {
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = items.slice((page - 1) * limit, page * limit);

    res.json({ success: true, data: paged, pagination: { total, page, limit, totalPages } });
  });

  app.get('/api/products/:idOrSlug', (req, res) => {
    const product = store.getProductByIdOrSlug(req.params.idOrSlug);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: { product } });
  });

  app.post('/api/orders', (req, res) => {
    const { customerName, customerPhone, customerEmail = '', city, address, notes = '', items } =
      req.body || {};

    if (
      !customerName ||
      !customerPhone ||
      !city ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, city, address, and at least one item are required.',
      });
    }

    try {
      const order = store.createOrder({
        customerName,
        customerPhone,
        customerEmail,
        city,
        address,
        notes,
        items,
      });
      res.status(201).json({ success: true, data: { order } });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post('/api/newsletter', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }
    store.addSubscriber(email);
    res.json({ success: true, message: 'Subscribed successfully' });
  });

  /* ==================== ADMIN API ==================== */

  app.post('/api/admin/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const result = store.authenticateAdmin(email, password);
    if (!result) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    res.json({ success: true, data: result });
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    store.deleteSession(req.admin.token);
    res.json({ success: true });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json({
      success: true,
      data: {
        user: {
          id: req.admin.id,
          email: req.admin.email,
          name: req.admin.name,
          role: req.admin.role,
        },
      },
    });
  });

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    res.json({
      success: true,
      data: {
        stats: store.getOverviewStats(),
        recentOrders: store.listOrders(6),
      },
    });
  });

  app.get('/api/admin/products', requireAdmin, (_req, res) => {
    res.json({ success: true, data: { products: store.listProducts({ activeOnly: false }) } });
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const b = req.body || {};
    if (!b.name?.en) {
      return res.status(400).json({ success: false, message: 'Product English name is required' });
    }
    const product = store.createProduct(b);
    res.status(201).json({ success: true, data: { product } });
  });

  app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const product = store.updateProduct(req.params.id, req.body || {});
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: { product } });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    if (!store.deleteProduct(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true });
  });

  app.get('/api/admin/categories', requireAdmin, (_req, res) => {
    res.json({ success: true, data: { categories: store.listCategories({ visibleOnly: false }) } });
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const b = req.body || {};
    if (!b.name?.en) {
      return res.status(400).json({ success: false, message: 'Category English name is required' });
    }
    const category = store.createCategory(b);
    res.status(201).json({ success: true, data: { category } });
  });

  app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const category = store.updateCategory(req.params.id, req.body || {});
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: { category } });
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    if (!store.deleteCategory(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true });
  });

  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    res.json({ success: true, data: { orders: store.listOrders() } });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const status = String(req.body?.status || '').trim();
    const allowed = new Set(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
    if (!allowed.has(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }
    const order = store.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: { order } });
  });

  app.get('/api/admin/settings', requireAdmin, (_req, res) => {
    res.json({
      success: true,
      data: {
        settings: store.getSetting('settings', {}),
        hero: store.getSetting('hero', {}),
        promoBanner: store.getSetting('promoBanner', {}),
        homeCollections: store.getSetting('homeCollections', []),
      },
    });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const { settings, hero, promoBanner, homeCollections } = req.body || {};
    if (settings) store.setSetting('settings', settings);
    if (hero) store.setSetting('hero', hero);
    if (promoBanner) store.setSetting('promoBanner', promoBanner);
    if (homeCollections) store.setSetting('homeCollections', homeCollections);
    res.json({ success: true });
  });

  app.get('/api/admin/pages', requireAdmin, (_req, res) => {
    res.json({ success: true, data: { pages: store.listPages() } });
  });

  app.put('/api/admin/pages/:slug', requireAdmin, (req, res) => {
    store.savePage(req.params.slug, req.body || {});
    res.json({ success: true });
  });

  app.get('/api/admin/subscribers', requireAdmin, (_req, res) => {
    res.json({ success: true, data: { subscribers: store.listSubscribers() } });
  });

  app.get('/api/admin/feedbacks', requireAdmin, (_req, res) => {
    res.json({ success: true, data: { feedbacks: store.listFeedbacks() } });
  });

  app.post('/api/admin/feedbacks', requireAdmin, (req, res) => {
    const id = store.createFeedback(req.body || {});
    res.status(201).json({ success: true, data: { id } });
  });

  app.delete('/api/admin/feedbacks/:id', requireAdmin, (req, res) => {
    store.deleteFeedback(req.params.id);
    res.json({ success: true });
  });

  if (serveStatic && fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  return app;
}
