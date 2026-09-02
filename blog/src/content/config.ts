import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    /** Meta description — apuntá a ~150-155 caracteres, keyword al frente. */
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Equipo StatzPro'),
    tags: z.array(z.string()).default([]),
    /** Keyword primaria del artículo (para control interno / reporting). */
    keyword: z.string().optional(),
    /** Ruta de la portada, relativa a /blog (ej: /blog/covers/mi-post.png). */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
    lang: z.enum(['es', 'en', 'pt']).default('es'),
    /** Preguntas frecuentes → se renderizan al final + generan FAQPage JSON-LD. */
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
  }),
});

export const collections = { posts };
