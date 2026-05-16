import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
// import tunnel from "astro-tunnel";
import { defineConfig, memoryCache } from "astro/config";

const CACHE_TTL = 3600; // 1 hour

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: netlify({ cacheOnDemandPages: true }),
  integrations: [tailwind(), react()],
  experimental: {
    // cache: { provider: memoryCache() },
    // routeRules: {
    //   "/ethscriptions/*": { maxAge: CACHE_TTL, tags: ["ethscriptions"] },
    //   "/*": { maxAge: CACHE_TTL, tags: ["pages"] },
    // },
  },
});
