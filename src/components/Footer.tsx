import { useState, type SubmitEvent } from 'react';
import { ArrowRight, ArrowUp } from 'lucide-react';
import { Lang, RouteState } from '../types';
import { UI_COPY } from '../i18n';

interface FooterProps {
  lang: Lang;
  socialLinks: { facebook?: string; instagram?: string; whatsapp?: string };
  onNavigate: (route: RouteState) => void;
  onOpenAdmin: () => void;
}

export function Footer({ lang, socialLinks, onNavigate, onOpenAdmin }: FooterProps) {
  const t = UI_COPY[lang];
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) {
      setStatus('err');
      return;
    }
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('ok');
        setEmail('');
      } else {
        setStatus('err');
      }
    } catch {
      setStatus('err');
    }
  };

  return (
    <>
      <section className="newsletter-section">
        <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 400 }}>
          {t.newsletterHeading}
        </h2>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
          {t.newsletterDesc}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="newsletter-input-wrap">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              placeholder={t.newsletterPlaceholder}
              aria-label={t.newsletterPlaceholder}
            />
            <button type="submit" className="newsletter-submit" aria-label="Subscribe">
              <ArrowRight size={17} />
            </button>
          </div>
          {status === 'ok' && (
            <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--color-success)' }}>
              {t.newsletterSuccess}
            </p>
          )}
          {status === 'err' && (
            <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--color-sale)' }}>
              {t.newsletterInvalid}
            </p>
          )}
        </form>
      </section>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <h3 className="footer-title">{t.policies}</h3>
            <div className="footer-links">
              <button type="button" onClick={() => onNavigate({ view: 'page', slug: 'privacy' })}>
                {lang === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية'}
              </button>
              <button type="button" onClick={() => onNavigate({ view: 'page', slug: 'return-policy' })}>
                {lang === 'en' ? 'Return Policy' : 'سياسة الإرجاع'}
              </button>
              <button type="button" onClick={() => onNavigate({ view: 'page', slug: 'shipping-policy' })}>
                {lang === 'en' ? 'Shipping & Delivery' : 'الشحن والتوصيل'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="footer-title">{t.aboutStore}</h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--color-text-muted)' }}>
              {t.aboutCopy}
            </p>
            <div className="footer-links">
              <button type="button" onClick={() => onNavigate({ view: 'page', slug: 'about' })}>
                {lang === 'en' ? 'About Us' : 'من نحن'}
              </button>
              <button type="button" onClick={() => onNavigate({ view: 'page', slug: 'contact' })}>
                {t.contactUs}
              </button>
            </div>
          </div>

          <div>
            <h3 className="footer-title">{t.contactUs}</h3>
            <div className="footer-links">
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
                  WhatsApp (+20 101 180 0886)
                </a>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1380,
            marginInline: 'auto',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 20,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: '0.8rem',
            color: 'var(--color-neutral-muted)',
          }}
        >
          <span>{t.rights}</span>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              onOpenAdmin();
            }}
            style={{ textDecoration: 'underline' }}
          >
            Admin Panel
          </a>
        </div>
      </footer>

      <button
        type="button"
        className="back-to-top"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUp size={18} />
      </button>
    </>
  );
}
