import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import {
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';
import { Category, Product } from '../types';
import { RichTextEditor } from './RichTextEditor';
import '../styles/admin.css';

type AdminTab = 'overview' | 'products' | 'categories' | 'orders' | 'settings' | 'community';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface OverviewStats {
  revenue: number;
  ordersCount: number;
  pendingOrders: number;
  productsCount: number;
  activeProducts: number;
  lowStockCount: number;
  categoriesCount: number;
  subscribersCount: number;
}

interface OrderRecord {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  city: string;
  address: string;
  items: Array<{
    productId: string;
    name: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  created_at: string;
}

interface PageRecord {
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
}

interface SubscriberRecord {
  id: number;
  email: string;
  created_at: string;
}

interface FeedbackRecord {
  id: number;
  product_name_en: string;
  customer_name: string;
  message: string;
  rating: number;
  image: string;
}

interface AdminAppProps {
  onGoStorefront: () => void;
  onDataMutated: () => void;
}

const TOKEN_KEY = 'nisa_admin_token';

export function AdminApp({ onGoStorefront, onDataMutated }: AdminAppProps) {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState('admin@nisamodestwear.local');
  const [password, setPassword] = useState('nisa-admin-2026');
  const [authError, setAuthError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [announcementEn, setAnnouncementEn] = useState('');
  const [announcementAr, setAnnouncementAr] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [promoTitleEn, setPromoTitleEn] = useState('');
  const [promoSubEn, setPromoSubEn] = useState('');
  const [settingsBundle, setSettingsBundle] = useState<Record<string, unknown>>({});

  const [productFilter, setProductFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productRichTab, setProductRichTab] = useState<'description' | 'details' | 'washingTips'>('description');
  const [activePageSlug, setActivePageSlug] = useState('about');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [statusBanner, setStatusBanner] = useState('');

  const apiFetch = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const res = await fetch(url, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(opts.headers || {}),
        },
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
        return { success: false, message: 'Unauthorized' };
      }
      try {
        return await res.json();
      } catch {
        return { success: false, message: `HTTP ${res.status}` };
      }
    },
    [token]
  );

  const loadAllAdminData = useCallback(async () => {
    if (!token) return;
    const [ov, pr, ca, or, st, pg, sb, fb] = await Promise.all([
      apiFetch('/api/admin/overview'),
      apiFetch('/api/admin/products'),
      apiFetch('/api/admin/categories'),
      apiFetch('/api/admin/orders'),
      apiFetch('/api/admin/settings'),
      apiFetch('/api/admin/pages'),
      apiFetch('/api/admin/subscribers'),
      apiFetch('/api/admin/feedbacks'),
    ]);
    if (ov.success) {
      setStats(ov.data.stats);
      setRecentOrders(ov.data.recentOrders);
    }
    if (pr.success) setProducts(pr.data.products);
    if (ca.success) setCategories(ca.data.categories);
    if (or.success) setOrders(or.data.orders);
    if (st.success) {
      setSettingsBundle(st.data);
      setAnnouncementEn(st.data.settings?.announcementBar?.text?.en || '');
      setAnnouncementAr(st.data.settings?.announcementBar?.text?.ar || '');
      setAnnouncementEnabled(Boolean(st.data.settings?.announcementBar?.enabled ?? true));
      setPromoTitleEn(st.data.promoBanner?.title?.en || '');
      setPromoSubEn(st.data.promoBanner?.subtitle?.en || '');
    }
    if (pg.success) setPages(pg.data.pages);
    if (sb.success) setSubscribers(sb.data.subscribers);
    if (fb.success) setFeedbacks(fb.data.feedbacks);
  }, [apiFetch, token]);

  useEffect(() => {
    if (!token) {
      setLoadingAuth(false);
      return;
    }
    if (user) {
      setLoadingAuth(false);
      loadAllAdminData();
      return;
    }
    apiFetch('/api/admin/me').then((d) => {
      setLoadingAuth(false);
      if (d.success) {
        setUser(d.data.user);
      }
    });
  }, [token, user, apiFetch, loadAllAdminData]);

  useEffect(() => {
    if (!statusBanner) return;
    const t = window.setTimeout(() => setStatusBanner(''), 2600);
    return () => window.clearTimeout(t);
  }, [statusBanner]);

  const handleLogin = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await res.json();
    if (!d.success) {
      setAuthError(d.message || 'Login failed');
      return;
    }
    localStorage.setItem(TOKEN_KEY, d.data.token);
    setToken(d.data.token);
    setUser(d.data.user);
  };

  const handleLogout = async () => {
    await apiFetch('/api/admin/logout', { method: 'POST' });
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
  };

  const saveProduct = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    const isEdit = Boolean(editingProduct.id);
    const payload = {
      name: editingProduct.name,
      description: editingProduct.description,
      details: editingProduct.details,
      washingTips: editingProduct.washingTips,
      categoryId: editingProduct.categoryId,
      price: Number(editingProduct.price || 0),
      discountPrice:
        editingProduct.discountPrice === null || editingProduct.discountPrice === undefined
          ? null
          : Number(editingProduct.discountPrice),
      stock: Number(editingProduct.stock || 0),
      status: editingProduct.status || 'ACTIVE',
      isNewArrival: Boolean(editingProduct.isNewArrival),
      defaultImage: editingProduct.defaultImage || '',
      hoverImage: editingProduct.hoverImage || '',
      sizes: editingProduct.sizes?.length ? editingProduct.sizes : ['One Size'],
    };

    const res = await apiFetch(
      isEdit ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products',
      { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }
    );
    if (res.success) {
      setEditingProduct(null);
      setStatusBanner(isEdit ? 'Product updated.' : 'Product created.');
      await loadAllAdminData();
      onDataMutated();
    }
  };

  const deleteProduct = async (id: string) => {
    const res = await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.success) {
      setStatusBanner('Product deleted.');
      await loadAllAdminData();
      onDataMutated();
    }
  };

  const createCategory = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newCatNameEn.trim()) return;
    const res = await apiFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: { en: newCatNameEn.trim(), ar: newCatNameAr.trim() || newCatNameEn.trim() },
      }),
    });
    if (res.success) {
      setNewCatNameEn('');
      setNewCatNameAr('');
      setStatusBanner('Category added.');
      await loadAllAdminData();
      onDataMutated();
    }
  };

  const deleteCategory = async (id: string) => {
    const res = await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.success) {
      setStatusBanner('Category removed.');
      await loadAllAdminData();
      onDataMutated();
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const res = await apiFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (res.success) {
      setStatusBanner(`Order marked ${status}.`);
      await loadAllAdminData();
    }
  };

  const saveStorefrontSettings = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const curSettings = (settingsBundle.settings as Record<string, unknown>) || {};
    const curPromo = (settingsBundle.promoBanner as Record<string, unknown>) || {};
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        settings: {
          ...curSettings,
          announcementBar: {
            ...((curSettings.announcementBar as Record<string, unknown>) || {}),
            enabled: announcementEnabled,
            text: { en: announcementEn, ar: announcementAr },
          },
        },
        promoBanner: {
          ...curPromo,
          title: {
            ...((curPromo.title as Record<string, unknown>) || {}),
            en: promoTitleEn,
          },
          subtitle: {
            ...((curPromo.subtitle as Record<string, unknown>) || {}),
            en: promoSubEn,
          },
        },
      }),
    });
    if (res.success) {
      setStatusBanner('Storefront settings saved.');
      await loadAllAdminData();
      onDataMutated();
    }
  };

  const savePage = async (page: PageRecord) => {
    const res = await apiFetch(`/api/admin/pages/${page.slug}`, {
      method: 'PUT',
      body: JSON.stringify(page),
    });
    if (res.success) {
      setStatusBanner(`Saved page "${page.slug}".`);
      onDataMutated();
    }
  };

  if (loadingAuth) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-card">Loading Nisa Admin...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Nisa Admin</h1>
            <button type="button" className="admin-btn admin-btn-outline" onClick={onGoStorefront}>
              Storefront <ExternalLink size={14} />
            </button>
          </div>
          <p style={{ margin: '0 0 18px', fontSize: '0.88rem', color: '#5b6d80' }}>
            Out-of-the-box admin dashboard. Pre-filled with default local admin credentials.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Email</label>
              <input
                type="email"
                className="admin-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Password</label>
              <input
                type="password"
                className="admin-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {authError && (
              <div style={{ color: '#b42318', fontSize: '0.84rem' }}>{authError}</div>
            )}
            <button type="submit" className="admin-btn" style={{ justifyContent: 'center', marginTop: 4 }}>
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const q = productFilter.trim().toLowerCase();
    if (!q) return true;
    return `${p.name.en} ${p.name.ar} ${p.categoryName.en}`.toLowerCase().includes(q);
  });

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div>
            <strong style={{ letterSpacing: '0.08em', fontSize: '1rem' }}>NISA ADMIN</strong>
            <div style={{ fontSize: '0.74rem', opacity: 0.72 }}>{user.email}</div>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            type="button"
            className={`admin-nav-btn ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            <LayoutDashboard size={17} /> Overview
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            <Package size={17} /> Products ({products.length})
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${tab === 'categories' ? 'active' : ''}`}
            onClick={() => setTab('categories')}
          >
            <FolderTree size={17} /> Categories ({categories.length})
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            <ShoppingCart size={17} /> Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <Settings size={17} /> Storefront & Pages
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${tab === 'community' ? 'active' : ''}`}
            onClick={() => setTab('community')}
          >
            <Mail size={17} /> Subscribers & Reviews
          </button>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="admin-nav-btn" onClick={onGoStorefront}>
            <ExternalLink size={16} /> View Live Storefront
          </button>
          <button type="button" className="admin-nav-btn" onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <h1 style={{ margin: 0, fontSize: '1.45rem', textTransform: 'capitalize' }}>{tab}</h1>
          {statusBanner && <span className="admin-pill delivered">{statusBanner}</span>}
        </div>

        {tab === 'overview' && stats && (
          <>
            <div className="admin-kpi-grid">
              <div className="admin-card">
                <div className="admin-kpi-label">Revenue (EGP)</div>
                <div className="admin-kpi-val">{stats.revenue.toLocaleString()} LE</div>
              </div>
              <div className="admin-card">
                <div className="admin-kpi-label">Orders</div>
                <div className="admin-kpi-val">
                  {stats.ordersCount}{' '}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#5b6d80' }}>
                    ({stats.pendingOrders} pending)
                  </span>
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-kpi-label">Active Products</div>
                <div className="admin-kpi-val">
                  {stats.activeProducts} / {stats.productsCount}
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-kpi-label">Low Stock (&le; 3)</div>
                <div className="admin-kpi-val">{stats.lowStockCount}</div>
              </div>
              <div className="admin-card">
                <div className="admin-kpi-label">Subscribers</div>
                <div className="admin-kpi-val">{stats.subscribersCount}</div>
              </div>
            </div>

            <div className="admin-card">
              <h2 style={{ margin: '0 0 14px', fontSize: '1.05rem' }}>Recent Orders</h2>
              {recentOrders.length === 0 ? (
                <p style={{ margin: 0, color: '#5b6d80', fontSize: '0.88rem' }}>
                  No orders yet. Place a test order from the storefront cart drawer to see it here.
                </p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>City</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o.id}>
                          <td>{o.order_number}</td>
                          <td>{o.customer_name}</td>
                          <td>{o.city}</td>
                          <td>{o.total.toLocaleString()} LE</td>
                          <td>
                            <span className={`admin-pill ${o.status}`}>{o.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'products' && (
          <div className="admin-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 16 }}>
              <input
                type="search"
                className="admin-input"
                style={{ maxWidth: 320 }}
                placeholder="Search products..."
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              />
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  setProductRichTab('description');
                  setEditingProduct({
                    name: { en: '', ar: '' },
                    description: { en: '', ar: '' },
                    details: { en: '', ar: '' },
                    washingTips: { en: '', ar: '' },
                    categoryId: categories[0]?.id || '',
                    price: 1800,
                    discountPrice: null,
                    stock: 10,
                    status: 'ACTIVE',
                    isNewArrival: true,
                    defaultImage: '/uploads/products/product-1793920052682-c92stj8.webp',
                    hoverImage: '',
                    sizes: ['S/M', 'L/XL'],
                  });
                }}
              >
                <Plus size={16} /> Add Product
              </button>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.defaultImage && (
                            <img
                              src={p.defaultImage}
                              alt=""
                              style={{ width: 40, height: 52, objectFit: 'cover', borderRadius: 4 }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                              {p.name.en}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#5b6d80' }}>{p.name.ar}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.categoryName.en || '—'}</td>
                      <td>
                        {p.discountPrice ? (
                          <>
                            <strong style={{ color: '#c4384a' }}>{p.discountPrice} LE</strong>{' '}
                            <span style={{ textDecoration: 'line-through', color: '#8a99a8' }}>
                              {p.price}
                            </span>
                          </>
                        ) : (
                          <span>{p.price} LE</span>
                        )}
                      </td>
                      <td>{p.stock}</td>
                      <td>
                        <span className={`admin-pill ${p.status === 'ACTIVE' ? 'active' : ''}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-outline"
                            style={{ padding: '6px 10px' }}
                            onClick={() => {
                              setProductRichTab('description');
                              setEditingProduct(p);
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            style={{ padding: '6px 10px' }}
                            onClick={() => deleteProduct(p.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div style={{ display: 'grid', gap: 18 }}>
            <form onSubmit={createCategory} className="admin-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Category Name (EN)</label>
                <input
                  className="admin-input"
                  value={newCatNameEn}
                  onChange={(e) => setNewCatNameEn(e.target.value)}
                  placeholder="e.g., Ramadan Capsule '27"
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Category Name (AR)</label>
                <input
                  className="admin-input"
                  value={newCatNameAr}
                  onChange={(e) => setNewCatNameAr(e.target.value)}
                  placeholder="مجموعة رمضان"
                />
              </div>
              <button type="submit" className="admin-btn">
                <Plus size={16} /> Add Category
              </button>
            </form>

            <div className="admin-card admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name (EN)</th>
                    <th>Name (AR)</th>
                    <th>Slug</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name.en}</td>
                      <td>{c.name.ar}</td>
                      <td><code>{c.slug}</code></td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          style={{ padding: '6px 10px' }}
                          onClick={() => deleteCategory(c.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="admin-card admin-table-wrap">
            {orders.length === 0 ? (
              <p style={{ margin: 0, color: '#5b6d80' }}>No orders placed yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Delivery</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.order_number}</strong></td>
                      <td>
                        <div>{o.customer_name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#5b6d80' }}>{o.customer_phone}</div>
                      </td>
                      <td>
                        {o.items.map((it, idx) => (
                          <div key={idx} style={{ fontSize: '0.8rem' }}>
                            {it.quantity}× {it.name} ({it.color}, {it.size})
                          </div>
                        ))}
                      </td>
                      <td>
                        <div>{o.city}</div>
                        <div style={{ fontSize: '0.76rem', color: '#5b6d80' }}>{o.address}</div>
                      </td>
                      <td><strong>{o.total.toLocaleString()} LE</strong></td>
                      <td>
                        <select
                          className="admin-select"
                          style={{ width: 'auto' }}
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="shipped">shipped</option>
                          <option value="delivered">delivered</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ display: 'grid', gap: 18 }}>
            <form onSubmit={saveStorefrontSettings} className="admin-card" style={{ display: 'grid', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Announcement Bar & Promo Banner</h2>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                />
                Show Announcement Bar
              </label>
              <div className="admin-form-grid">
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Announcement (EN)</label>
                  <input
                    className="admin-input"
                    value={announcementEn}
                    onChange={(e) => setAnnouncementEn(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Announcement (AR)</label>
                  <input
                    className="admin-input"
                    value={announcementAr}
                    onChange={(e) => setAnnouncementAr(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Promo Title (EN)</label>
                  <input
                    className="admin-input"
                    value={promoTitleEn}
                    onChange={(e) => setPromoTitleEn(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Promo Subtitle (EN)</label>
                  <input
                    className="admin-input"
                    value={promoSubEn}
                    onChange={(e) => setPromoSubEn(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <button type="submit" className="admin-btn">Save Storefront Settings</button>
              </div>
            </form>

            <div className="admin-card" style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Content & Policy Pages</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {pages.map((pg) => (
                    <button
                      key={pg.slug}
                      type="button"
                      className={`admin-btn ${activePageSlug === pg.slug ? '' : 'admin-btn-outline'}`}
                      style={{ padding: '6px 12px' }}
                      onClick={() => setActivePageSlug(pg.slug)}
                    >
                      /{pg.slug}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const pg = pages.find((p) => p.slug === activePageSlug) || pages[0];
                if (!pg) return null;
                const updatePg = (patch: Partial<PageRecord>) =>
                  setPages((prev) =>
                    prev.map((x) => (x.slug === pg.slug ? { ...x, ...patch } : x))
                  );
                return (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div className="admin-form-grid">
                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Page Title (EN)</label>
                        <input
                          className="admin-input"
                          value={pg.title_en}
                          onChange={(e) => updatePg({ title_en: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Page Title (AR)</label>
                        <input
                          className="admin-input"
                          dir="rtl"
                          style={{ fontFamily: 'var(--font-arabic)' }}
                          value={pg.title_ar}
                          onChange={(e) => updatePg({ title_ar: e.target.value })}
                        />
                      </div>
                    </div>

                    <RichTextEditor
                      key={`${pg.slug}-en`}
                      label="English Content"
                      dir="ltr"
                      minHeight={160}
                      value={pg.content_en}
                      onChange={(html) => updatePg({ content_en: html })}
                    />

                    <RichTextEditor
                      key={`${pg.slug}-ar`}
                      label="Arabic Content (العربية)"
                      dir="rtl"
                      minHeight={160}
                      value={pg.content_ar}
                      onChange={(html) => updatePg({ content_ar: html })}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" className="admin-btn" onClick={() => savePage(pg)}>
                        Save /{pg.slug} Page
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {tab === 'community' && (
          <div className="admin-form-grid">
            <div className="admin-card">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>
                Newsletter Subscribers ({subscribers.length})
              </h2>
              {subscribers.length === 0 ? (
                <p style={{ margin: 0, color: '#5b6d80', fontSize: '0.88rem' }}>No subscribers yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: '0.88rem' }}>
                  {subscribers.map((s) => (
                    <li key={s.id} style={{ marginBottom: 6 }}>
                      {s.email}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="admin-card">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>
                Customer Feedbacks ({feedbacks.length})
              </h2>
              {feedbacks.map((f) => (
                <div key={f.id} style={{ paddingBottom: 10, borderBottom: '1px solid #e6ecf2', marginBottom: 10 }}>
                  <strong>{f.customer_name}</strong> · {f.rating}★ ({f.product_name_en})
                  <div style={{ fontSize: '0.86rem', color: '#5b6d80', marginTop: 4 }}>{f.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <form
            className="admin-card"
            style={{ width: 'min(640px, 100%)', maxHeight: '90dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveProduct}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>
                {editingProduct.id ? 'Edit Product' : 'New Product'}
              </h2>
              <button type="button" className="icon-btn" onClick={() => setEditingProduct(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-form-grid">
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Name (EN)</label>
                <input
                  className="admin-input"
                  required
                  value={editingProduct.name?.en || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: { en: e.target.value, ar: editingProduct.name?.ar || '' },
                    })
                  }
                />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Name (AR)</label>
                <input
                  className="admin-input"
                  value={editingProduct.name?.ar || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: { en: editingProduct.name?.en || '', ar: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Category</label>
                <select
                  className="admin-select"
                  value={editingProduct.categoryId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Status</label>
                <select
                  className="admin-select"
                  value={editingProduct.status || 'ACTIVE'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Price (LE)</label>
                <input
                  type="number"
                  className="admin-input"
                  required
                  value={editingProduct.price ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Discount Price (optional)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={editingProduct.discountPrice ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      discountPrice: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Stock</label>
                <input
                  type="number"
                  className="admin-input"
                  required
                  value={editingProduct.stock ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Default Image Path</label>
                <input
                  className="admin-input"
                  value={editingProduct.defaultImage || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, defaultImage: e.target.value })
                  }
                />
              </div>
            </div>

            <div style={{ marginTop: 16, borderTop: '1px solid #e6ecf2', paddingTop: 14, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(
                  [
                    ['description', 'Description'],
                    ['details', 'Fabric & Details'],
                    ['washingTips', 'Care & Washing'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`admin-btn ${productRichTab === key ? '' : 'admin-btn-outline'}`}
                    style={{ padding: '6px 12px' }}
                    onClick={() => setProductRichTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <RichTextEditor
                key={`${editingProduct.id || 'new'}-${productRichTab}-en`}
                label={`${productRichTab === 'description' ? 'Description' : productRichTab === 'details' ? 'Details' : 'Care & Washing'} (EN)`}
                dir="ltr"
                minHeight={110}
                value={editingProduct[productRichTab]?.en || ''}
                onChange={(html) =>
                  setEditingProduct({
                    ...editingProduct,
                    [productRichTab]: {
                      en: html,
                      ar: editingProduct[productRichTab]?.ar || '',
                    },
                  })
                }
              />

              <RichTextEditor
                key={`${editingProduct.id || 'new'}-${productRichTab}-ar`}
                label={`${productRichTab === 'description' ? 'Description' : productRichTab === 'details' ? 'Details' : 'Care & Washing'} (AR)`}
                dir="rtl"
                minHeight={110}
                value={editingProduct[productRichTab]?.ar || ''}
                onChange={(html) =>
                  setEditingProduct({
                    ...editingProduct,
                    [productRichTab]: {
                      en: editingProduct[productRichTab]?.en || '',
                      ar: html,
                    },
                  })
                }
              />
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setEditingProduct(null)}
              >
                Cancel
              </button>
              <button type="submit" className="admin-btn">
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
