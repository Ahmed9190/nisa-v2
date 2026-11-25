import { Globe, Heart, Menu, Search, ShoppingBag } from 'lucide-react';
import { Lang, RouteState } from '../types';
import { UI_COPY } from '../i18n';

interface HeaderProps {
  lang: Lang;
  announcementText: string;
  logo: string;
  cartCount: number;
  wishlistCount: number;
  onOpenSidebar: () => void;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onToggleLang: () => void;
  onNavigate: (route: RouteState) => void;
}

export function Header({
  lang,
  announcementText,
  logo,
  cartCount,
  wishlistCount,
  onOpenSidebar,
  onOpenCart,
  onOpenSearch,
  onToggleLang,
  onNavigate,
}: HeaderProps) {
  const t = UI_COPY[lang];

  return (
    <>
      {announcementText && (
        <div className="announcement-bar" role="region" aria-label="Announcement">
          <div className="announcement-track">
            <span>{announcementText} •</span>
            <span>{announcementText} •</span>
            <span>{announcementText} •</span>
            <span>{announcementText} •</span>
          </div>
        </div>
      )}

      <header className="site-header">
        <div className="header-inner">
          <div className="header-left">
            <button
              type="button"
              className="icon-btn"
              onClick={onOpenSidebar}
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              className="lang-btn"
              onClick={onToggleLang}
              aria-label="Switch language"
            >
              <Globe size={17} strokeWidth={1.6} />
              <span>{t.switchLang}</span>
            </button>
          </div>

          <a
            href="#/"
            className="header-logo"
            onClick={(e) => {
              e.preventDefault();
              onNavigate({ view: 'home' });
            }}
            aria-label="Nisa Home"
          >
            <img src={logo} alt="Nisa" />
          </a>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={onOpenSearch}
              aria-label="Search"
            >
              <Search size={19} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onNavigate({ view: 'wishlist' })}
              aria-label={t.wishlist}
            >
              <Heart size={19} strokeWidth={1.6} />
              {wishlistCount > 0 && <span className="badge-count">{wishlistCount}</span>}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onOpenCart}
              aria-label={t.cartTitle}
            >
              <ShoppingBag size={19} strokeWidth={1.6} />
              {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
