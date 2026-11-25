import { useState, type SubmitEvent } from 'react';
import { ChevronDown, ChevronUp, Globe, Heart, Search, X } from 'lucide-react';
import { Category, Lang, RouteState } from '../types';
import { UI_COPY } from '../i18n';

interface SidebarDrawerProps {
  open: boolean;
  lang: Lang;
  categories: Category[];
  socialLinks: { facebook?: string; instagram?: string; whatsapp?: string };
  onClose: () => void;
  onNavigate: (route: RouteState) => void;
  onToggleLang: () => void;
}

export function SidebarDrawer({
  open,
  lang,
  categories,
  socialLinks,
  onClose,
  onNavigate,
  onToggleLang,
}: SidebarDrawerProps) {
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const t = UI_COPY[lang];

  if (!open) return null;

  const handleSearch = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    onNavigate({ view: 'catalog', search: searchQuery.trim() });
    onClose();
  };

  const go = (route: RouteState) => {
    onNavigate(route);
    onClose();
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <aside className="sidebar-drawer" aria-label="Store navigation">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <strong style={{ letterSpacing: '0.12em', fontSize: '0.82rem' }}>NISA</strong>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSearch}
          style={{
            display: 'flex',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            marginBottom: 22,
          }}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              flex: 1,
              border: 'none',
              padding: '10px 12px',
              background: 'transparent',
              color: 'var(--color-text)',
              outline: 'none',
              fontSize: '0.86rem',
            }}
          />
          <button type="submit" className="icon-btn" aria-label="Submit search">
            <Search size={17} />
          </button>
        </form>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          <div>
            <button
              type="button"
              onClick={() => setCollectionsOpen((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                background: 'none',
                padding: '6px 0',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              <span>{t.shopCollection}</span>
              {collectionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {collectionsOpen && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  paddingTop: 10,
                  paddingInlineStart: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => go({ view: 'catalog' })}
                  style={linkBtnStyle}
                >
                  {t.allProducts}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => go({ view: 'catalog', category: cat.slug })}
                    style={linkBtnStyle}
                  >
                    {cat.name[lang] || cat.name.en}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <button type="button" onClick={() => go({ view: 'page', slug: 'about' })} style={linkBtnStyle}>
              {lang === 'en' ? 'About Nisa' : 'عن نيسا'}
            </button>
            <button type="button" onClick={() => go({ view: 'page', slug: 'contact' })} style={linkBtnStyle}>
              {t.contactUs}
            </button>
            <button type="button" onClick={() => go({ view: 'page', slug: 'shipping-policy' })} style={linkBtnStyle}>
              {lang === 'en' ? 'Shipping & Delivery' : 'الشحن والتوصيل'}
            </button>
            <button type="button" onClick={() => go({ view: 'page', slug: 'return-policy' })} style={linkBtnStyle}>
              {lang === 'en' ? 'Return Policy' : 'سياسة الإرجاع'}
            </button>
            <button type="button" onClick={() => go({ view: 'page', slug: 'privacy' })} style={linkBtnStyle}>
              {lang === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية'}
            </button>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => go({ view: 'wishlist' })}
              style={{ ...linkBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Heart size={16} />
              <span>{t.wishlist}</span>
            </button>
            <button
              type="button"
              onClick={onToggleLang}
              style={{
                ...linkBtnStyle,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-arabic)',
              }}
            >
              <Globe size={16} strokeWidth={1.6} />
              <span>{t.switchLang}</span>
            </button>
          </div>
        </nav>

        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 14,
            display: 'flex',
            gap: 14,
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
          }}
        >
          {socialLinks.instagram && (
            <a href={socialLinks.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
          {socialLinks.facebook && (
            <a href={socialLinks.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
          )}
          {socialLinks.whatsapp && (
            <a href={`https://wa.me/${socialLinks.whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
        </div>
      </aside>
    </>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  textAlign: 'start',
  color: 'var(--color-text)',
  fontSize: '0.92rem',
  cursor: 'pointer',
};
