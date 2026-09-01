import { defineConfig } from 'astro/config';

// Blog estático de StatzPro. Se sirve en https://statzpro.com/blog
// El build sale a blog/dist y el script build:blog de la raíz lo copia a dist/blog.
export default defineConfig({
  site: 'https://statzpro.com',
  base: '/blog',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
