import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Lang, Product } from '../types';
import { getColorHex, UI_COPY } from '../i18n';

interface ProductCardProps {
  product: Product;
  lang: Lang;
  currencySymbol: string;
  isWishlisted: boolean;
  onSelect: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onQuickAdd: (product: Product, color: string, size: string) => void;
}

export function ProductCard({
  product,
  lang,
  currencySymbol,
  isWishlisted,
  onSelect,
  onToggleWishlist,
  onQuickAdd,
}: ProductCardProps) {
  const t = UI_COPY[lang];
  const firstAvailableColor =
    product.colors.find((c) => c.available && !c.outOfStock)?.color ||
    product.colors[0]?.color ||
    'Default';
  const [selectedColor, setSelectedColor] = useState(firstAvailableColor);

  const activeColorObj = product.colors.find((c) => c.color === selectedColor);
  const mainImage = activeColorObj?.imageUrl || product.defaultImage;
  const hoverImage = product.hoverImage;
  const hasHover = Boolean(hoverImage && hoverImage !== mainImage);

  const hasSale =
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;

  const firstSize = product.sizes[0] || 'One Size';
  const inStock = product.stock > 0;

  return (
    <article className="product-card">
      <div className="product-media" onClick={() => onSelect(product)}>
        {mainImage && (
          <img
            src={mainImage}
            alt={product.name[lang] || product.name.en}
            loading="lazy"
            className={`product-img-main ${hasHover ? 'has-hover' : ''}`}
          />
        )}
        {hasHover && (
          <img
            src={hoverImage}
            alt=""
            loading="lazy"
            className="product-img-hover has-hover"
          />
        )}

        {hasSale && <span className="product-badge-sale">{t.sale}</span>}

        <button
          type="button"
          className="product-wishlist-btn"
          aria-label={t.wishlist}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
        >
          <Heart
            size={16}
            fill={isWishlisted ? '#c4384a' : 'none'}
            color={isWishlisted ? '#c4384a' : 'currentColor'}
          />
        </button>

        <button
          type="button"
          className="product-quick-add"
          disabled={!inStock}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(product, selectedColor, firstSize);
          }}
        >
          {inStock ? `+ ${t.addToBag}` : t.outOfStock}
        </button>
      </div>

      <div className="product-info">
        <span className="product-category">
          {product.categoryName[lang] || product.categoryName.en}
        </span>
        <h3 className="product-name" onClick={() => onSelect(product)}>
          {product.name[lang] || product.name.en}
        </h3>
        <div className="product-price-row">
          {hasSale ? (
            <>
              <span className="price-sale">
                {product.discountPrice?.toLocaleString()} {currencySymbol}
              </span>
              <span className="price-original">
                {product.price.toLocaleString()} {currencySymbol}
              </span>
            </>
          ) : (
            <span className="price-current">
              {product.price.toLocaleString()} {currencySymbol}
            </span>
          )}
        </div>

        {product.colors.length > 0 && (
          <div className="swatch-row">
            {product.colors.map((c) => (
              <button
                key={c.color}
                type="button"
                title={c.color}
                aria-label={c.color}
                className={`swatch-dot ${selectedColor === c.color ? 'active' : ''}`}
                style={{
                  backgroundColor: getColorHex(c.color),
                  opacity: c.outOfStock ? 0.38 : 1,
                }}
                onClick={() => setSelectedColor(c.color)}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
