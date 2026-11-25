import { Heart } from 'lucide-react';
import { Lang, Product, RouteState } from '../types';
import { UI_COPY } from '../i18n';
import { ProductCard } from './ProductCard';

interface WishlistViewProps {
  products: Product[];
  wishlistIds: string[];
  lang: Lang;
  currencySymbol: string;
  onNavigate: (route: RouteState) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onQuickAdd: (product: Product, color: string, size: string) => void;
}

export function WishlistView({
  products,
  wishlistIds,
  lang,
  currencySymbol,
  onNavigate,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
}: WishlistViewProps) {
  const t = UI_COPY[lang];
  const saved = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <section className="section">
      <div className="section-header">
        <h1 className="section-title">{t.wishlist}</h1>
      </div>

      {saved.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 12px' }}>
          <Heart size={36} strokeWidth={1.3} style={{ margin: '0 auto 14px', opacity: 0.45 }} />
          <p style={{ margin: '0 auto 22px', maxWidth: 420, color: 'var(--color-neutral-muted)' }}>
            {t.wishlistEmpty}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate({ view: 'catalog' })}
          >
            {t.shopNow}
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {saved.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              currencySymbol={currencySymbol}
              isWishlisted={true}
              onSelect={onSelectProduct}
              onToggleWishlist={onToggleWishlist}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
