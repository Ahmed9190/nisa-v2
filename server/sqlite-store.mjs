import crypto from 'node:crypto';
import { db, hashPassword, seedFromSnapshot, slugify } from './db.mjs';
import { formatCategory, formatProduct, signAdminToken, verifyAdminToken } from './seed-helpers.mjs';

export function createSqliteStore() {
  seedFromSnapshot(false);

  const getCategoryMap = () => {
    const rows = db
      .prepare('SELECT * FROM categories ORDER BY sort_order ASC, created_at DESC')
      .all();
    const map = new Map();
    for (const r of rows) map.set(r.id, r);
    return { rows, map };
  };

  return {
    getSetting(key, fallback = {}) {
      const row = db.prepare('SELECT json FROM store_settings WHERE key = ?').get(key);
      return row ? JSON.parse(row.json) : fallback;
    },

    setSetting(key, val) {
      db.prepare('INSERT OR REPLACE INTO store_settings (key, json, updated_at) VALUES (?, ?, ?)').run(
        key,
        JSON.stringify(val),
        new Date().toISOString()
      );
    },

    listCategories({ visibleOnly = false } = {}) {
      const { rows } = getCategoryMap();
      return (visibleOnly ? rows.filter((r) => r.status === 'visible') : rows).map(formatCategory);
    },

    createCategory(b) {
      const now = new Date().toISOString();
      const id = crypto.randomBytes(12).toString('hex');
      const slug = b.slug || slugify(b.name.en);
      db.prepare(
        `INSERT INTO categories (id, slug, name_en, name_ar, description_en, description_ar, status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        slug,
        b.name.en,
        b.name.ar || b.name.en,
        b.description?.en || '',
        b.description?.ar || '',
        b.status || 'visible',
        Number(b.sortOrder || 0),
        now,
        now
      );
      return formatCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
    },

    updateCategory(id, b) {
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
      if (!existing) return null;
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE categories SET slug = ?, name_en = ?, name_ar = ?, description_en = ?, description_ar = ?, status = ?, updated_at = ? WHERE id = ?`
      ).run(
        b.slug ?? existing.slug,
        b.name?.en ?? existing.name_en,
        b.name?.ar ?? existing.name_ar,
        b.description?.en ?? existing.description_en,
        b.description?.ar ?? existing.description_ar,
        b.status ?? existing.status,
        now,
        existing.id
      );
      return formatCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
    },

    deleteCategory(id) {
      return db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes > 0;
    },

    listProducts({ activeOnly = false } = {}) {
      const { map: catMap } = getCategoryMap();
      const sql = activeOnly
        ? "SELECT * FROM products WHERE status = 'ACTIVE'"
        : 'SELECT * FROM products ORDER BY updated_at DESC';
      return db
        .prepare(sql)
        .all()
        .map((r) => formatProduct(r, catMap));
    },

    getProductByIdOrSlug(idOrSlug) {
      const row = db
        .prepare('SELECT * FROM products WHERE id = ? OR slug_en = ? OR slug_ar = ?')
        .get(idOrSlug, idOrSlug, idOrSlug);
      if (!row) return null;
      const { map: catMap } = getCategoryMap();
      return formatProduct(row, catMap);
    },

    createProduct(b) {
      const now = new Date().toISOString();
      const id = crypto.randomBytes(12).toString('hex');
      const slugEn = b.slug?.en || `${slugify(b.name.en)}-${id.slice(-4)}`;
      const slugAr = b.slug?.ar || slugEn;
      const sizes = Array.isArray(b.sizes) ? b.sizes : ['One Size'];
      const colors = Array.isArray(b.colors) ? b.colors : [];
      const variants = Array.isArray(b.variants) ? b.variants : [];

      db.prepare(
        `INSERT INTO products (
          id, slug_en, slug_ar, name_en, name_ar, description_en, description_ar,
          details_en, details_ar, washing_en, washing_ar, category_id, price, discount_price,
          stock, status, is_new_arrival, default_image, hover_image,
          sizes_json, colors_json, variants_json, sold_qty, average_rating, rating_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, ?, ?)`
      ).run(
        id,
        slugEn,
        slugAr,
        b.name.en,
        b.name.ar || b.name.en,
        b.description?.en || '',
        b.description?.ar || '',
        b.details?.en || '',
        b.details?.ar || '',
        b.washingTips?.en || '',
        b.washingTips?.ar || '',
        b.categoryId || '',
        Number(b.price || 0),
        b.discountPrice != null && b.discountPrice !== '' ? Number(b.discountPrice) : null,
        Number(b.stock || 0),
        b.status || 'ACTIVE',
        b.isNewArrival ? 1 : 0,
        b.defaultImage || '',
        b.hoverImage || '',
        JSON.stringify(sizes),
        JSON.stringify(colors),
        JSON.stringify(variants),
        now,
        now
      );

      const { map: catMap } = getCategoryMap();
      return formatProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id), catMap);
    },

    updateProduct(id, b) {
      const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) return null;
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE products SET
          name_en = ?, name_ar = ?, description_en = ?, description_ar = ?,
          details_en = ?, details_ar = ?, washing_en = ?, washing_ar = ?,
          category_id = ?, price = ?, discount_price = ?, stock = ?, status = ?,
          is_new_arrival = ?, default_image = ?, hover_image = ?,
          sizes_json = ?, colors_json = ?, variants_json = ?, updated_at = ?
        WHERE id = ?`
      ).run(
        b.name?.en ?? existing.name_en,
        b.name?.ar ?? existing.name_ar,
        b.description?.en ?? existing.description_en,
        b.description?.ar ?? existing.description_ar,
        b.details?.en ?? existing.details_en,
        b.details?.ar ?? existing.details_ar,
        b.washingTips?.en ?? existing.washing_en,
        b.washingTips?.ar ?? existing.washing_ar,
        b.categoryId ?? existing.category_id,
        b.price !== undefined ? Number(b.price) : existing.price,
        b.discountPrice === null || b.discountPrice === ''
          ? null
          : b.discountPrice !== undefined
            ? Number(b.discountPrice)
            : existing.discount_price,
        b.stock !== undefined ? Number(b.stock) : existing.stock,
        b.status ?? existing.status,
        b.isNewArrival !== undefined ? (b.isNewArrival ? 1 : 0) : existing.is_new_arrival,
        b.defaultImage ?? existing.default_image,
        b.hoverImage ?? existing.hover_image,
        b.sizes !== undefined ? JSON.stringify(b.sizes) : existing.sizes_json,
        b.colors !== undefined ? JSON.stringify(b.colors) : existing.colors_json,
        b.variants !== undefined ? JSON.stringify(b.variants) : existing.variants_json,
        now,
        existing.id
      );

      const { map: catMap } = getCategoryMap();
      return formatProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id), catMap);
    },

    deleteProduct(id) {
      return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;
    },

    getPage(slug) {
      const row = db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
      if (!row) return null;
      return {
        slug: row.slug,
        title: { en: row.title_en, ar: row.title_ar },
        content: { en: row.content_en, ar: row.content_ar },
        updatedAt: row.updated_at,
      };
    },

    listPages() {
      return db.prepare('SELECT * FROM pages ORDER BY slug ASC').all();
    },

    savePage(slug, { title_en, title_ar, content_en, content_ar }) {
      db.prepare(
        `INSERT OR REPLACE INTO pages (slug, title_en, title_ar, content_en, content_ar, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        slug,
        title_en || slug,
        title_ar || slug,
        content_en || '',
        content_ar || '',
        new Date().toISOString()
      );
    },

    listFeedbacks() {
      return db.prepare('SELECT * FROM feedbacks ORDER BY id DESC').all();
    },

    createFeedback(b) {
      const info = db
        .prepare(
          `INSERT INTO feedbacks (product_name_en, product_name_ar, customer_name, message, rating, image, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          b.productName || 'Nisa Piece',
          b.productName || 'قطعة من نيسا',
          b.customerName || 'Anonymous',
          b.message || '',
          Number(b.rating || 5),
          b.image || '',
          new Date().toISOString()
        );
      return Number(info.lastInsertRowid);
    },

    deleteFeedback(id) {
      db.prepare('DELETE FROM feedbacks WHERE id = ?').run(Number(id));
    },

    createOrder({ customerName, customerPhone, customerEmail = '', city, address, notes = '', items }) {
      const now = new Date().toISOString();
      const orderId = crypto.randomUUID();
      const orderNumber = `NISA-${Date.now().toString().slice(-6)}`;

      db.exec('BEGIN');
      try {
        let subtotal = 0;
        const normalizedItems = [];

        for (const reqItem of items) {
          const qty = Math.max(1, Number(reqItem.quantity || 1));
          const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(reqItem.productId);
          if (!prod) throw new Error(`Product ${reqItem.productId} not found`);

          const unitPrice = prod.discount_price != null ? prod.discount_price : prod.price;
          subtotal += unitPrice * qty;

          const newStock = Math.max(0, prod.stock - qty);
          const variants = JSON.parse(prod.variants_json || '[]').map((v) => {
            if (v.color === reqItem.color && v.size === reqItem.size) {
              const next = Math.max(0, Number(v.stock || 0) - qty);
              return { ...v, stock: next, outOfStock: next <= 0 };
            }
            return v;
          });

          db.prepare(
            'UPDATE products SET stock = ?, sold_qty = sold_qty + ?, variants_json = ?, updated_at = ? WHERE id = ?'
          ).run(newStock, qty, JSON.stringify(variants), now, prod.id);

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

        db.prepare(
          `INSERT INTO orders (
            id, order_number, customer_name, customer_phone, customer_email,
            city, address, notes, items_json, subtotal, shipping_fee, total, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          orderId,
          orderNumber,
          String(customerName).trim(),
          String(customerPhone).trim(),
          String(customerEmail).trim(),
          String(city).trim(),
          String(address).trim(),
          String(notes).trim(),
          JSON.stringify(normalizedItems),
          subtotal,
          shippingFee,
          total,
          'pending',
          now,
          now
        );

        db.exec('COMMIT');
        return {
          id: orderId,
          orderNumber,
          subtotal,
          shippingFee,
          total,
          status: 'pending',
          createdAt: now,
        };
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    listOrders(limit = 0) {
      const sql =
        limit > 0
          ? `SELECT * FROM orders ORDER BY created_at DESC LIMIT ${Number(limit)}`
          : 'SELECT * FROM orders ORDER BY created_at DESC';
      return db
        .prepare(sql)
        .all()
        .map((o) => ({ ...o, items: JSON.parse(o.items_json) }));
    },

    updateOrderStatus(id, status) {
      const info = db
        .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, new Date().toISOString(), id);
      if (info.changes === 0) return null;
      const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      return { ...o, items: JSON.parse(o.items_json) };
    },

    addSubscriber(email) {
      db.prepare('INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)').run(
        email,
        new Date().toISOString()
      );
    },

    listSubscribers() {
      return db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();
    },

    authenticateAdmin(email, password) {
      const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);
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
        revenue: db
          .prepare("SELECT COALESCE(SUM(total), 0) AS rev FROM orders WHERE status != 'cancelled'")
          .get().rev,
        ordersCount: db.prepare('SELECT COUNT(*) AS cnt FROM orders').get().cnt,
        pendingOrders: db
          .prepare("SELECT COUNT(*) AS cnt FROM orders WHERE status = 'pending'")
          .get().cnt,
        productsCount: db.prepare('SELECT COUNT(*) AS cnt FROM products').get().cnt,
        activeProducts: db
          .prepare("SELECT COUNT(*) AS cnt FROM products WHERE status = 'ACTIVE'")
          .get().cnt,
        lowStockCount: db.prepare('SELECT COUNT(*) AS cnt FROM products WHERE stock <= 3').get().cnt,
        categoriesCount: db.prepare('SELECT COUNT(*) AS cnt FROM categories').get().cnt,
        subscribersCount: db.prepare('SELECT COUNT(*) AS cnt FROM subscribers').get().cnt,
      };
    },
  };
}
