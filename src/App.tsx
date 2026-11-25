import { lazy, Suspense, useCallback, useEffect, useState, type SubmitEvent } from 'react';
import { Search, X } from 'lucide-react';
import rawStore from './data/store.json';
import { CartItem, Category, Lang, Product, RouteState, StoreData } from './types';
import { UI_COPY } from './i18n';
import { Header } from './components/Header';
import { SidebarDrawer } from './components/SidebarDrawer';
import { CartDrawer } from './components/CartDrawer';
import { ProductModal } from './components/ProductModal';
import { HomeView } from './components/HomeView';
import { CatalogView } from './components/CatalogView';
import { WishlistView } from './components/WishlistView';
import { InfoPageView } from './components/InfoPageView';
import { Footer } from './components/Footer';

const AdminApp = lazy(() =>
  import('./admin/AdminApp').then((m) => ({ default: m.AdminApp }))
);

const fallbackStore = rawStore as StoreData;

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(() =>
    window.location.pathname.startsWith('/admin')
  );
  const [storeData, setStoreData] = useState<StoreData>(fallbackStore);
  const [lang, setLang] = useState<Lang>(() => loadStorage<Lang>('nisa_lang', 'en'));
  const [route, setRoute] = useState<RouteState>({ view: 'home' });
  const [cart, setCart] = useState<CartItem[]>(() => loadStorage<CartItem[]>('nisa_cart', []));
  const [wishlist, setWishlist] = useState<string[]>(() =>
    loadStorage<string[]>('nisa_wishlist', [])
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const t = UI_COPY[lang];

  const refreshStoreFromBackend = useCallback(async () => {
    try {
      const [homeRes, catRes, prodRes] = await Promise.all([
        fetch('/api/store/home'),
        fetch('/api/categories'),
        fetch('/api/products?limit=100'),
      ]);
      if (!homeRes.ok || !catRes.ok || !prodRes.ok) return;
      const [homeJson, catJson, prodJson] = await Promise.all([
        homeRes.json(),
        catRes.json(),
        prodRes.json(),
      ]);
      const home = homeJson.data?.home;
      const categories: Category[] = catJson.data?.categories || fallbackStore.categories;
      const products: Product[] = prodJson.data || fallbackStore.products;
      if (!home) return;

      setStoreData({
        store: {
          name: home.store?.storeName || fallbackStore.store.name,
          logo: home.store?.logo || fallbackStore.store.logo,
          favicon: home.store?.favicon || fallbackStore.store.favicon,
          currency: home.store?.currency || fallbackStore.store.currency,
          currencySymbol: home.store?.currencySymbol || fallbackStore.store.currencySymbol,
          announcementBar: home.store?.announcementBar || fallbackStore.store.announcementBar,
          socialLinks: home.store?.socialLinks || fallbackStore.store.socialLinks,
          quickLinks: home.store?.quickLinks || fallbackStore.store.quickLinks,
        },
        categories,
        heroSlides: (home.hero?.sections || fallbackStore.heroSlides).map(
          (s: {
            image: string;
            title: { en: string; ar: string };
            subtitle: { en: string; ar: string };
            ctaLabel: { en: string; ar: string };
            ctaUrl?: string;
            ctaCategory?: string;
          }) => ({
            image: s.image,
            title: s.title,
            subtitle: s.subtitle,
            ctaLabel: s.ctaLabel,
            ctaCategory:
              s.ctaCategory ??
              (s.ctaUrl && s.ctaUrl.includes('category=')
                ? s.ctaUrl.split('category=')[1].split('&')[0]
                : ''),
          })
        ),
        collections: (home.homeCollections || fallbackStore.collections).map(
          (c: {
            title: { en: string; ar: string };
            image: string;
            hoverImage?: string;
            url?: string;
            ctaCategory?: string;
          }) => ({
            title: c.title,
            image: c.image,
            hoverImage: c.hoverImage || '',
            ctaCategory:
              c.ctaCategory ??
              (c.url && c.url.includes('category=') ? c.url.split('category=')[1].split('&')[0] : ''),
          })
        ),
        promoBanner: home.promoBanner || fallbackStore.promoBanner,
        newArrivalIds: (home.newArrivals || []).map((p: Product) => p.id),
        bestSellerIds: (home.bestSellers || []).map((p: Product) => p.id),
        promoProductIds: (home.promoBannerProducts || []).map((p: Product) => p.id),
        feedbacks: home.feedbacks || fallbackStore.feedbacks,
        products,
      });
    } catch {
      // Fallback gracefully to bundled store.json if API offline
    }
  }, []);

  useEffect(() => {
    if (isAdminRoute) return;
    refreshStoreFromBackend();
  }, [isAdminRoute, refreshStoreFromBackend]);

  useEffect(() => {
    const onPop = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.documentElement.lang = isAdminRoute ? 'en' : lang;
    document.documentElement.dir = isAdminRoute ? 'ltr' : lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('nisa_lang', JSON.stringify(lang));
  }, [lang, isAdminRoute]);

  useEffect(() => {
    localStorage.setItem('nisa_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('nisa_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(''), 2200);
    return () => window.clearTimeout(id);
  }, [toastMsg]);

  const openAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    window.scrollTo({ top: 0 });
  };

  const openStorefront = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    window.scrollTo({ top: 0 });
  };

  if (isAdminRoute) {
    return (
      <Suspense fallback={<div style={{ padding: 24 }}>Loading Admin...</div>}>
        <AdminApp onGoStorefront={openStorefront} onDataMutated={() => {}} />
      </Suspense>
    );
  }

  const navigate = (next: RouteState) => {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product: Product, color: string, size: string) => {
    const key = `${product.id}__${color}__${size}`;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { key, productId: product.id, color, size, quantity: 1 }];
    });
    setToastMsg(t.addedToBag);
    setCartOpen(true);
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      setToastMsg(exists ? t.removedFromWishlist : t.addedToWishlist);
      return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
    });
  };

  const handleHeaderSearch = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchOpen(false);
    navigate({ view: 'catalog', search: searchDraft.trim() });
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const announcementText = storeData.store.announcementBar.enabled
    ? storeData.store.announcementBar.text[lang] || storeData.store.announcementBar.text.en
    : '';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Header
        lang={lang}
        announcementText={announcementText}
        logo={storeData.store.logo}
        cartCount={cartCount}
        wishlistCount={wishlist.length}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenCart={() => setCartOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onToggleLang={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
        onNavigate={navigate}
      />

      <main style={{ flex: 1 }}>
        {route.view === 'home' && (
          <HomeView
            storeData={storeData}
            lang={lang}
            wishlistIds={wishlist}
            onNavigate={navigate}
            onSelectProduct={setSelectedProduct}
            onToggleWishlist={toggleWishlist}
            onQuickAdd={addToCart}
          />
        )}

        {route.view === 'catalog' && (
          <CatalogView
            key={`${route.category || 'all'}-${route.search || ''}`}
            products={storeData.products}
            categories={storeData.categories}
            lang={lang}
            currencySymbol={storeData.store.currencySymbol}
            initialCategory={route.category}
            initialSearch={route.search}
            wishlistIds={wishlist}
            onCategoryChange={(category) => navigate({ view: 'catalog', category })}
            onSelectProduct={setSelectedProduct}
            onToggleWishlist={toggleWishlist}
            onQuickAdd={addToCart}
          />
        )}

        {route.view === 'wishlist' && (
          <WishlistView
            products={storeData.products}
            wishlistIds={wishlist}
            lang={lang}
            currencySymbol={storeData.store.currencySymbol}
            onNavigate={navigate}
            onSelectProduct={setSelectedProduct}
            onToggleWishlist={toggleWishlist}
            onQuickAdd={addToCart}
          />
        )}

        {route.view === 'page' && (
          <InfoPageView slug={route.slug} lang={lang} onNavigate={navigate} />
        )}
      </main>

      <Footer
        lang={lang}
        socialLinks={storeData.store.socialLinks}
        onNavigate={navigate}
        onOpenAdmin={openAdmin}
      />

      <SidebarDrawer
        open={sidebarOpen}
        lang={lang}
        categories={storeData.categories}
        socialLinks={storeData.store.socialLinks}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigate}
        onToggleLang={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
      />

      <CartDrawer
        open={cartOpen}
        lang={lang}
        currencySymbol={storeData.store.currencySymbol}
        items={cart}
        products={storeData.products}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateQty}
        onRemoveItem={removeCartItem}
        onClearCart={() => setCart([])}
        onOrderCreated={refreshStoreFromBackend}
        onKeepShopping={() => navigate({ view: 'catalog' })}
      />

      <ProductModal
        product={selectedProduct}
        lang={lang}
        currencySymbol={storeData.store.currencySymbol}
        isWishlisted={selectedProduct ? wishlist.includes(selectedProduct.id) : false}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        onToggleWishlist={toggleWishlist}
      />

      {searchOpen && (
        <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
          <form
            onSubmit={handleHeaderSearch}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(540px, 100%)',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Search size={18} />
            <input
              type="search"
              autoFocus
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text)',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px' }}>
              {lang === 'en' ? 'Go' : 'بحث'}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {toastMsg && (
        <div className="toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default App;
