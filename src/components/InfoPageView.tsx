import { useEffect, useState } from 'react';
import { INFO_PAGES, sanitizeRichHtml, UI_COPY } from '../i18n';
import { Lang, RouteState } from '../types';

interface InfoPageViewProps {
  slug: string;
  lang: Lang;
  onNavigate: (route: RouteState) => void;
}

export function InfoPageView({ slug, lang, onNavigate }: InfoPageViewProps) {
  const fallback = INFO_PAGES[slug] || INFO_PAGES.about;
  const [title, setTitle] = useState(fallback.title[lang]);
  const [richHtml, setRichHtml] = useState<string>(
    fallback.body[lang].map((p) => `<p>${p}</p>`).join('')
  );
  const t = UI_COPY[lang];

  useEffect(() => {
    let active = true;
    const fb = INFO_PAGES[slug] || INFO_PAGES.about;
    setTitle(fb.title[lang]);
    setRichHtml(fb.body[lang].map((p) => `<p>${p}</p>`).join(''));

    fetch(`/api/store/page/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d?.success || !d.data?.page) return;
        const p = d.data.page;
        setTitle(p.title?.[lang] || p.title?.en || fb.title[lang]);
        const safe = sanitizeRichHtml(p.content?.[lang] || p.content?.en || '');
        if (safe) setRichHtml(safe);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [slug, lang]);

  return (
    <section className="section" style={{ maxWidth: 780 }}>
      <h1 className="section-title" style={{ marginBottom: 22 }}>
        {title}
      </h1>
      <div
        className="rich-content"
        dangerouslySetInnerHTML={{ __html: richHtml }}
      />
      <div style={{ marginTop: 28 }}>
        <button
          type="button"
          className="btn"
          onClick={() => onNavigate({ view: 'catalog' })}
        >
          {t.keepShopping}
        </button>
      </div>
    </section>
  );
}
