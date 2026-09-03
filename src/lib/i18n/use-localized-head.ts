import { useEffect } from 'react';
import { useI18n } from './context';
import { LANDING_SEO, type HeadSeo } from './landing-seo';

const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const apply = (seo: HeadSeo) => {
  document.title = seo.title;
  setMeta('meta[name="description"]', 'name', 'description', seo.description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);
  setMeta('meta[property="og:locale"]', 'property', 'og:locale', seo.ogLocale);
};

/**
 * Ajusta <title> y las metas de descripción / Open Graph según el idioma
 * activo, en páginas públicas (landing). Al desmontar restaura lo que había
 * en index.html.
 *
 * SEO por idioma completo (URLs /en /fr /it + hreflang + prerender) es un
 * trabajo aparte; esto cubre el título/preview que ve el usuario y lo que
 * Google lee al renderizar el JS.
 */
export const useLocalizedHead = (map: Record<string, HeadSeo> = LANDING_SEO): void => {
  const { locale } = useI18n();

  useEffect(() => {
    const original: HeadSeo = {
      title: document.title,
      description:
        document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '',
      ogLocale:
        document.head.querySelector<HTMLMetaElement>('meta[property="og:locale"]')?.content ??
        'es_AR',
    };

    apply(map[locale] ?? map.es);

    return () => apply(original);
  }, [locale, map]);
};
