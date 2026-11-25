import { useMemo, useState } from 'react';
import { Category, Lang, Product } from '../types';
import { matchCategorySlug, UI_COPY } from '../i18n';
import { ProductCard } from './ProductCard';

interface CatalogViewProps {
  products: Product[];
  categories: Category[];
  lang: Lang;
  currencySymbol: string;
  initialCategory?: string;
  initialSearch?: string;
  wishlistIds: string[];
  onCategoryChange: (categorySlug?: string) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onQuickAdd: (product: Product, color: string, size: string) => void;
}

type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'sale';

export function CatalogView({
  products,
  categories,
  lang,
  currencySymbol,
  initialCategory,
  initialSearch,
  wishlistIds,
  onCategoryChange,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
}: CatalogViewProps) {
  const t = UI_COPY[lang];
  const [search, setSearch] = useState(initialSearch || '');
  const [sortBy, setSortBy] = useState<SortMode>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (initialCategory && !matchCategorySlug(p.categoryName.en, initialCategory)) {
        return false;
      }
      if (inStockOnly && p.stock <= 0) {
        return false;
      }
      if (q) {
        const hay = `${p.name.en} ${p.name.ar} ${p.categoryName.en} ${p.categoryName.ar}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    } else if (sortBy === 'sale') {
      sorted.sort((a, b) => {
        const aSale = a.discountPrice && a.discountPrice < a.price ? 1 : 0;
        const bSale = b.discountPrice && b.discountPrice < b.price ? 1 : 0;
        return bSale - aSale;
      });
    }
    return sorted;
  }, [products, initialCategory, inStockOnly, search, sortBy]);

  const activeCategoryObj = initialCategory
    ? categories.find((c) => matchCategorySlug(c.name.en, initialCategory))
    : undefined;

  return (
    <section className="section">
      <div className="section-header" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1 className="section-title">
            {activeCategoryObj
              ? activeCategoryObj.name[lang] || activeCategoryObj.name.en
              : t.allProducts}
          </h1>
          <span style={{ fontSize: '0.84rem', color: 'var(--color-neutral-muted)' }}>
            {filtered.length} {t.resultsCount}
          </span>
        </div>
      </div>

      <div className="catalog-controls">
        <div className="category-pills">
          <button
            type="button"
            className={`cat-pill ${!initialCategory ? 'active' : ''}`}
            onClick={() => onCategoryChange(undefined)}
          >
            {t.allProducts}
          </button>
          {categories.map((cat) => {
            const isActive = Boolean(
              initialCategory && matchCategorySlug(cat.name.en, initialCategory)
            );
            return (
              <button
                key={cat.id}
                type="button"
                className={`cat-pill ${isActive ? 'active' : ''}`}
                onClick={() => onCategoryChange(cat.slug)}
              >
                {cat.name[lang] || cat.name.en}
              </button>
            );
          })}
        </div>

        <div className="catalog-filters-right">
          <input
            type="search"
            className="catalog-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          />

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            {t.inStockOnly}
          </label>

          <select
            className="catalog-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            aria-label={t.sortLabel}
          >
            <option value="featured">{t.sortNewest}</option>
            <option value="price-asc">{t.sortPriceAsc}</option>
            <option value="price-desc">{t.sortPriceDesc}</option>
            <option value="sale">{t.sortSale}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 12px' }}>
          <p style={{ marginBottom: 18, color: 'var(--color-neutral-muted)' }}>{t.noResults}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSearch('');
              setInStockOnly(false);
              onCategoryChange(undefined);
            }}
          >
            {t.clearFilters}
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              currencySymbol={currencySymbol}
              isWishlisted={wishlistIds.includes(product.id)}
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
