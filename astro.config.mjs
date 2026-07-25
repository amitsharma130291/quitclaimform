import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    tailwind(),
    sitemap(),
  ],
  site: 'https://whatisaquitclaimdeed.com',
});
