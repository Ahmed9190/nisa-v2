import { useState, useEffect } from 'react';
import { Heart, X } from 'lucide-react';
import { Lang, Product } from '../types';
import { getColorHex, sanitizeRichHtml, stripHtml, UI_COPY } from '../i18n';

interface ProductModalProps {
  product: Product | null;
  lang: Lang;
  currencySymbol: string;
  isWishlisted: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductModal({
  product,
  lang,
  currencySymbol,
  isWishlisted,
  onClose,
  onAddToCart,
  onToggleWishlist,
}: ProductModalProps) {
  const t = UI_COPY[lang];
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'washing'>('details');
  const [activeImg, setActiveImg] = useState('');

  useEffect(() => {
    if (!product) return;
    const defaultCol =
      product.colors.find((c) => c.available && !c.outOfStock)?.color ||
      product.colors[0]?.color ||
      'Default';
    setSelectedColor(defaultCol);
    setSelectedSize(product.sizes[0] || 'One Size');
    setActiveTab('details');
    const colImg = product.colors.find((c) => c.color === defaultCol)?.imageUrl;
    setActiveImg(colImg || product.defaultImage);
  }, [product]);

  if (!product) return null;

  const gallery = Array.from(
    new Set(
      [
        product.defaultImage,
        product.hoverImage,
        ...product.colors.map((c) => c.imageUrl),
      ].filter(Boolean)
    )
  );

  const hasSale =
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;

  const matchedVariant = product.variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize
  );
  const canAdd = matchedVariant ? !matchedVariant.outOfStock && matchedVariant.stock > 0 : product.stock > 0;

  const handleSelectColor = (color: string, imageUrl: string) => {
    setSelectedColor(color);
    if (imageUrl) setActiveImg(imageUrl);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-label={product.name[lang] || product.name.en}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div style={{ background: '#efeaea', display: 'flex', flexDirection: 'column' }}>
          <div style={{ aspectRatio: '3 / 4', overflow: 'hidden' }}>
            <img
              src={activeImg || product.defaultImage}
              alt={product.name[lang] || product.name.en}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          {gallery.length > 1 && (
            <div style={{ display: 'flex', gap: 8, padding: 10, overflowX: 'auto', background: 'var(--color-bg)' }}>
              {gallery.map((img) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActiveImg(img)}
                  style={{
                    width: 54,
                    height: 70,
                    padding: 0,
                    border:
                      activeImg === img
                        ? '2px solid var(--color-primary)'
                        : '1px solid var(--color-border)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="product-category" style={{ marginBottom: 6 }}>
              {product.categoryName[lang] || product.categoryName.en}
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: '1.5rem', fontWeight: 500, textTransform: 'capitalize' }}>
              {product.name[lang] || product.name.en}
            </h2>
            <div className="product-price-row" style={{ fontSize: '1.1rem' }}>
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
          </div>

          {stripHtml(product.description[lang] || product.description.en) && (
            <div
              className="rich-content"
              style={{ fontSize: '0.9rem' }}
              dangerouslySetInnerHTML={{
                __html: sanitizeRichHtml(product.description[lang] || product.description.en),
              }}
            />
          )}

          {product.colors.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 8 }}>
                {t.color}: <span style={{ fontWeight: 400 }}>{selectedColor}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {product.colors.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => handleSelectColor(c.color, c.imageUrl)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '6px 12px',
                      border:
                        selectedColor === c.color
                          ? '1.5px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      opacity: c.outOfStock ? 0.5 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: getColorHex(c.color),
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                    {c.color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sizes.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 8 }}>{t.size}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    style={{
                      padding: '8px 16px',
                      border:
                        selectedSize === size
                          ? '1.5px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                      background:
                        selectedSize === size ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: selectedSize === size ? '#fffaf0' : 'var(--color-text)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!canAdd}
              onClick={() => {
                onAddToCart(product, selectedColor, selectedSize);
                onClose();
              }}
            >
              {canAdd ? t.addToBag : t.outOfStock}
            </button>
            <button
              type="button"
              className="btn"
              style={{ paddingInline: 16 }}
              aria-label={t.wishlist}
              onClick={() => onToggleWishlist(product.id)}
            >
              <Heart
                size={18}
                fill={isWishlisted ? '#c4384a' : 'none'}
                color={isWishlisted ? '#c4384a' : 'currentColor'}
              />
            </button>
          </div>

          {(stripHtml(product.details[lang] || product.details.en) ||
            stripHtml(product.washingTips[lang] || product.washingTips.en)) && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    borderBottom:
                      activeTab === 'details' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    fontWeight: activeTab === 'details' ? 600 : 400,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                  }}
                >
                  {t.details}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('washing')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    borderBottom:
                      activeTab === 'washing' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    fontWeight: activeTab === 'washing' ? 600 : 400,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                  }}
                >
                  {t.washingTips}
                </button>
              </div>
              <div
                className="rich-content"
                style={{ fontSize: '0.84rem', color: 'var(--color-neutral-muted)' }}
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(
                    activeTab === 'details'
                      ? product.details[lang] || product.details.en || '<p>—</p>'
                      : product.washingTips[lang] || product.washingTips.en || '<p>—</p>'
                  ),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
