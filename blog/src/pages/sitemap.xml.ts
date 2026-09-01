import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const urls = [
    { loc: `${SITE.url}${SITE.base}`, lastmod: new Date() },
    ...posts.map((p) => ({
      loc: `${SITE.url}${SITE.base}/${p.slug}`,
      lastmod: p.data.updatedDate ?? p.data.pubDate,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod></url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
