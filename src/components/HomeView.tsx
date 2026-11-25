import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Lang, Product, RouteState, StoreData } from '../types';
import { UI_COPY } from '../i18n';
import { ProductCard } from './ProductCard';

interface HomeViewProps {
  storeData: StoreData;
  lang: Lang;
  wishlistIds: string[];
  onNavigate: (route: RouteState) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onQuickAdd: (product: Product, color: string, size: string) => void;
}

export function HomeView({
  storeData,
  lang,
  wishlistIds,
  onNavigate,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
}: HomeViewProps) {
  const t = UI_COPY[lang];
  const slides = storeData.heroSlides;
  const [slideIdx, setSlideIdx] = useState(0);
  const arrivalsRef = useRef<HTMLDivElement | null>(null);
  const promoSliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const productMap = new Map(storeData.products.map((p) => [p.id, p]));
  const newArrivals = storeData.newArrivalIds
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p));
  const bestSellers = storeData.bestSellerIds
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p));
  const promoProducts = storeData.promoProductIds
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p));

  const activeSlide = slides[slideIdx] || slides[0];
  const heroTitleText = activeSlide?.title[lang] || activeSlide?.title.en || 'Not for every eye.';
  const words = heroTitleText.split(' ');
  const splitIdx = Math.max(1, words.length - 2);
  const titleLead = words.slice(0, splitIdx).join(' ');
  const titleTail = words.slice(splitIdx).join(' ');

  const scrollTrack = (ref: React.RefObject<HTMLDivElement | null>, dir: -1 | 1) => {
    if (!ref.current) return;
    const step = ref.current.clientWidth * 0.78;
    ref.current.scrollBy({ left: dir * step * (lang === 'ar' ? -1 : 1), behavior: 'smooth' });
  };

  return (
    <>
      {/* 1. Hero Carousel */}
      {activeSlide && (
        <section className="hero" aria-label="Hero showcase">
          {slides.map((s, idx) => (
            <img
              key={s.image}
              src={s.image}
              alt={s.subtitle[lang] || s.subtitle.en}
              className={`hero-slide-img ${idx === slideIdx ? 'active' : ''}`}
            />
          ))}
          <div className="hero-overlay" />

          {slides.length > 1 && (
            <>
              <button
                type="button"
                className="hero-nav hero-prev"
                onClick={() => setSlideIdx((prev) => (prev - 1 + slides.length) % slides.length)}
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="hero-nav hero-next"
                onClick={() => setSlideIdx((prev) => (prev + 1) % slides.length)}
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="hero-content">
            <h1 className="hero-title">
              {titleLead} <span className="hero-title-last">{titleTail}</span>
            </h1>
            <p className="hero-subtitle">{activeSlide.subtitle[lang] || activeSlide.subtitle.en}</p>
            <button
              type="button"
              className="btn hero-btn"
              onClick={() =>
                onNavigate({ view: 'catalog', category: activeSlide.ctaCategory || undefined })
              }
            >
              {activeSlide.ctaLabel[lang] || activeSlide.ctaLabel.en}
            </button>
          </div>

          {slides.length > 1 && (
            <div className="hero-dots">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`hero-dot ${idx === slideIdx ? 'active' : ''}`}
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setSlideIdx(idx)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. New Arrivals Slider */}
      {newArrivals.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">{t.newArrivals}</h2>
            <button
              type="button"
              className="section-link"
              onClick={() => onNavigate({ view: 'catalog' })}
            >
              {t.viewAll}
            </button>
          </div>
          <div className="slider-wrapper">
            <button
              type="button"
              className="slider-arrow slider-arrow-left"
              onClick={() => scrollTrack(arrivalsRef, -1)}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <div ref={arrivalsRef} className="slider-track">
              {newArrivals.map((product) => (
                <div key={product.id} className="slider-item">
                  <ProductCard
                    product={product}
                    lang={lang}
                    currencySymbol={storeData.store.currencySymbol}
                    isWishlisted={wishlistIds.includes(product.id)}
                    onSelect={onSelectProduct}
                    onToggleWishlist={onToggleWishlist}
                    onQuickAdd={onQuickAdd}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="slider-arrow slider-arrow-right"
              onClick={() => scrollTrack(arrivalsRef, 1)}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      )}

      {/* 3. Collections Showcase */}
      {storeData.collections.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">{t.ourCollections}</h2>
            <button
              type="button"
              className="section-link"
              onClick={() => onNavigate({ view: 'catalog' })}
            >
              {t.viewAll}
            </button>
          </div>
          <div className="collections-grid">
            {storeData.collections.map((col) => (
              <div
                key={col.title.en}
                className="collection-card"
                role="button"
                tabIndex={0}
                onClick={() =>
                  onNavigate({ view: 'catalog', category: col.ctaCategory || undefined })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNavigate({ view: 'catalog', category: col.ctaCategory || undefined });
                  }
                }}
              >
                <img
                  src={col.image}
                  alt={col.title[lang] || col.title.en}
                  loading="lazy"
                  className="collection-img-main"
                />
                {col.hoverImage && (
                  <img
                    src={col.hoverImage}
                    alt=""
                    loading="lazy"
                    className="collection-img-hover"
                  />
                )}
                <div className="collection-overlay" />
                <div className="collection-content">
                  <h3>{col.title[lang] || col.title.en}</h3>
                  <span className="collection-cta">{t.exploreCollection} →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Editorial Promo Banner */}
      {storeData.promoBanner?.enabled && (
        <section className="promo-banner" aria-label={storeData.promoBanner.title.en}>
          <img
            src={storeData.promoBanner.image}
            alt={storeData.promoBanner.title[lang] || storeData.promoBanner.title.en}
            loading="lazy"
          />
          <div className="promo-banner-overlay" />
          <div className="promo-banner-content">
            <h2 className="promo-banner-title">
              {storeData.promoBanner.title[lang] || storeData.promoBanner.title.en}
            </h2>
            <p className="promo-banner-subtitle">
              {storeData.promoBanner.subtitle[lang] || storeData.promoBanner.subtitle.en}
            </p>
            <button
              type="button"
              className="btn hero-btn"
              onClick={() => onNavigate({ view: 'catalog' })}
            >
              {storeData.promoBanner.ctaLabel[lang] || storeData.promoBanner.ctaLabel.en}
            </button>
          </div>
        </section>
      )}

      {/* 5. Featured Promo Products */}
      {promoProducts.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">{t.featuredPieces}</h2>
            <button
              type="button"
              className="section-link"
              onClick={() => onNavigate({ view: 'catalog' })}
            >
              {t.viewAll}
            </button>
          </div>
          <div className="slider-wrapper">
            <button
              type="button"
              className="slider-arrow slider-arrow-left"
              onClick={() => scrollTrack(promoSliderRef, -1)}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <div ref={promoSliderRef} className="slider-track">
              {promoProducts.map((product) => (
                <div key={product.id} className="slider-item">
                  <ProductCard
                    product={product}
                    lang={lang}
                    currencySymbol={storeData.store.currencySymbol}
                    isWishlisted={wishlistIds.includes(product.id)}
                    onSelect={onSelectProduct}
                    onToggleWishlist={onToggleWishlist}
                    onQuickAdd={onQuickAdd}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="slider-arrow slider-arrow-right"
              onClick={() => scrollTrack(promoSliderRef, 1)}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      )}

      {/* 6. Best Sellers */}
      {bestSellers.length > 0 && (
        <section className="section">
          <div className="best-sellers-header">
            <span className="kicker-pill">{t.bestSellersKicker}</span>
            <h2 className="section-title">{t.bestSellers}</h2>
            <p className="best-sellers-copy">{t.bestSellersSubtitle}</p>
          </div>
          <div className="best-sellers-grid">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                currencySymbol={storeData.store.currencySymbol}
                isWishlisted={wishlistIds.includes(product.id)}
                onSelect={onSelectProduct}
                onToggleWishlist={onToggleWishlist}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>
        </section>
      )}

      {/* 7. Customer Feedback */}
      {storeData.feedbacks.length > 0 && (
        <section className="section">
          <div className="best-sellers-header">
            <h2 className="section-title">{t.customerLove}</h2>
          </div>
          {storeData.feedbacks.map((fb, idx) => (
            <div key={idx} className="testimonial-card">
              {fb.image && (
                <img src={fb.image} alt={fb.product.name[lang] || fb.product.name.en} loading="lazy" />
              )}
              <div>
                <div className="stars" aria-label={`${fb.rating} stars`}>
                  {Array.from({ length: fb.rating }).map((_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '1.05rem', fontStyle: 'italic' }}>
                  “{fb.message}”
                </p>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-neutral-muted)' }}>
                  <strong>{fb.customerName}</strong> — {fb.product.name[lang] || fb.product.name.en}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
