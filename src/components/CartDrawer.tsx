import { useState, type SubmitEvent } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { CartItem, Lang, Product } from '../types';
import { UI_COPY } from '../i18n';

interface CartDrawerProps {
  open: boolean;
  lang: Lang;
  currencySymbol: string;
  items: CartItem[];
  products: Product[];
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onOrderCreated: () => void;
  onKeepShopping: () => void;
}

export function CartDrawer({
  open,
  lang,
  currencySymbol,
  items,
  products,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
  onKeepShopping,
}: CartDrawerProps) {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'done'>('cart');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [city, setCity] = useState('Cairo');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const t = UI_COPY[lang];

  if (!open) return null;

  const productMap = new Map(products.map((p) => [p.id, p]));
  const enriched = items
    .map((item) => ({ item, product: productMap.get(item.productId) }))
    .filter((x): x is { item: CartItem; product: Product } => Boolean(x.product));

  const subtotal = enriched.reduce((sum, { item, product }) => {
    const unit = product.discountPrice ?? product.price;
    return sum + unit * item.quantity;
  }, 0);

  const handlePlaceOrder = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          city,
          address,
          items: enriched.map(({ item }) => ({
            productId: item.productId,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        setErrorMsg(d.message || 'Could not place order');
      } else {
        setOrderNumber(d.data.order.orderNumber);
        setCheckoutStep('done');
        onClearCart();
        onOrderCreated();
      }
    } catch {
      setErrorMsg('Network error placing order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <aside className="cart-drawer" aria-label={t.cartTitle}>
        <div className="cart-drawer-header">
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 400 }}>{t.cartTitle}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              if (checkoutStep === 'done') setCheckoutStep('cart');
              onClose();
            }}
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
          <div className="cart-drawer-cols">
            <span>{t.productCol}</span>
            <span>{t.totalCol}</span>
          </div>
        </div>

        <div className="cart-drawer-body">
          {checkoutStep === 'done' ? (
            <div style={{ textAlign: 'center', padding: '56px 12px' }}>
              <ShoppingBag size={36} strokeWidth={1.4} style={{ margin: '0 auto 14px' }} />
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Order #{orderNumber}</p>
              <p style={{ lineHeight: 1.6, marginBottom: 22 }}>{t.checkoutSuccess}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setCheckoutStep('cart');
                  onClose();
                  onKeepShopping();
                }}
              >
                {t.keepShopping}
              </button>
            </div>
          ) : enriched.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 12px' }}>
              <ShoppingBag
                size={40}
                strokeWidth={1.3}
                style={{ margin: '0 auto 16px', opacity: 0.55 }}
              />
              <p
                style={{
                  margin: '0 0 24px',
                  fontSize: '0.84rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                {t.emptyBag}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onKeepShopping();
                }}
              >
                {t.keepShopping}
              </button>
            </div>
          ) : checkoutStep === 'shipping' ? (
            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>
                {lang === 'en' ? 'Delivery Details' : 'بيانات التوصيل'}
              </h3>
              <input
                required
                placeholder={lang === 'en' ? 'Full Name' : 'الاسم بالكامل'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={fieldStyle}
              />
              <input
                required
                placeholder={lang === 'en' ? 'Phone Number' : 'رقم الهاتف'}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={fieldStyle}
              />
              <input
                required
                placeholder={lang === 'en' ? 'Governorate / City' : 'المحافظة / المدينة'}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={fieldStyle}
              />
              <textarea
                required
                rows={3}
                placeholder={lang === 'en' ? 'Street Address' : 'العنوان بالتفصيل'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={fieldStyle}
              />
              {errorMsg && <div style={{ color: 'var(--color-sale)', fontSize: '0.84rem' }}>{errorMsg}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, padding: '12px 14px' }}
                  onClick={() => setCheckoutStep('cart')}
                >
                  {lang === 'en' ? 'Back' : 'رجوع'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '12px 14px' }}
                  disabled={submitting}
                >
                  {submitting
                    ? '...'
                    : lang === 'en'
                      ? `Place Order (${subtotal.toLocaleString()} ${currencySymbol})`
                      : `تأكيد الطلب (${subtotal.toLocaleString()} ${currencySymbol})`}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {enriched.map(({ item, product }) => {
                const unit = product.discountPrice ?? product.price;
                const matchedColor = product.colors.find((c) => c.color === item.color);
                const img = matchedColor?.imageUrl || product.defaultImage;

                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '72px 1fr auto',
                      gap: 12,
                      paddingBottom: 16,
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <img
                      src={img}
                      alt={product.name[lang] || product.name.en}
                      style={{
                        width: 72,
                        height: 96,
                        objectFit: 'cover',
                        background: '#efeaea',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong style={{ fontSize: '0.88rem', textTransform: 'capitalize' }}>
                        {product.name[lang] || product.name.en}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-muted)' }}>
                        {item.color} · {item.size}
                      </span>
                      <span style={{ fontSize: '0.82rem' }}>
                        {unit.toLocaleString()} {currencySymbol}
                      </span>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.key, -1)}
                            style={qtyBtnStyle}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span style={{ padding: '0 10px', fontSize: '0.82rem' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.key, 1)}
                            style={qtyBtnStyle}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.key)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-neutral-muted)',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                      {(unit * item.quantity).toLocaleString()} {currencySymbol}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {enriched.length > 0 && checkoutStep === 'cart' && (
          <div className="cart-drawer-footer">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 14,
                fontSize: '0.96rem',
                fontWeight: 600,
              }}
            >
              <span>{t.subtotal}</span>
              <span>
                {subtotal.toLocaleString()} {currencySymbol}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setCheckoutStep('shipping')}
            >
              {t.checkout}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

const qtyBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '5px 8px',
  cursor: 'pointer',
  color: 'var(--color-text)',
  display: 'inline-flex',
  alignItems: 'center',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.88rem',
  fontFamily: 'inherit',
};
