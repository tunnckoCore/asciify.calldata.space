# Draft: Asciify.Art Work Plan

## Stream 1: Netlify Migration
- Replace `@astrojs/vercel` with `@astrojs/netlify`
- Update `astro.config.mjs` adapter config
- Update build scripts if needed
- Test build with Netlify adapter

## Stream 2: Proxy Endpoints (Cache 1 year)
Root-level endpoints (not `/api` prefixed):
- `GET /ethscriptions/<id>` - proxy metadata from mainnet.api.calldata.space
- `GET /ethscriptions/<id>/content` - proxy content from mainnet.api.calldata.space
- Both use Astro.cache with 1 year TTL
- Page `[id].astro` should use these endpoints instead of direct fetch

## Stream 3: API Routes for Embedding
- `GET /api/raw/<n>` - HTML fragment (no html/body), includes CSS + data
  - Query params: `fonts=1/true`, `base_url=<string>`
- `GET /api/html/<n>` - Full HTML skeleton with title, CSS, body
  - Same query params
- Both should use proxy endpoints (cache hit)
- Return 404 if `res.media_type !== 'image'`
- Cache 1 year (or forever)

## Stream 4: Caching Strategy
- Astro.cache for proxy endpoints (1 year TTL)
- HTTP cache headers for Netlify CDN (`Netlify-CDN-Cache-Control: durable`)
- Cache both upstream metadata and final rendered output
- Use tags for cache invalidation if needed

## Stream 5: GitHub Actions
- Auto-deploy to Netlify on push to `master`
- Use Netlify integration (not CLI token)
- Build step: `bun run build`

## Scope IN
- Replace `@astrojs/vercel` with `@astrojs/netlify`
- Create root-level proxy endpoints: `/ethscriptions/<id>` and `/ethscriptions/<id>/content`
- Create `/api/raw/<n>` and `/api/html/<n>` embedding endpoints
- Implement Astro.cache with both memory and HTTP cache headers
- Update `[id].astro` to use proxy endpoints
- GitHub Actions auto-deploy on push to `master`

## Scope OUT
- No Edge Functions (staying on standard Netlify Functions)
- No database migrations or schema changes
- No UI redesign or new frontend features beyond embedding API
- No auth/rate limiting (future streams)
- No content collections or markdown processing

## Technical Decisions
- Astro v6.3.3 (already upgraded)
- Netlify free tier
- Astro.cache with default memory provider + HTTP cache headers for Netlify CDN durable cache
- Root-level proxy endpoints (not `/api` prefixed)
- 404 on non-image for `/api/*` endpoints
- Cache TTL: 1 year (31536000 seconds) for proxy and API endpoints

## Test Strategy
- Agent-executed QA via `agent-browser` for browser smoke tests
- `curl` for API endpoint validation
- `bun run astro check` and `bun run build` as gate checks
- Each task includes specific QA scenarios with evidence capture
