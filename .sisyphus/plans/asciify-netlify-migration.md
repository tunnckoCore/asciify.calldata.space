# Asciify.Art: Netlify Migration + Proxy + Embedding + CI/CD

## TL;DR

> Migrate Asciify.Art from Vercel to Netlify, add proxy endpoints with Astro.cache, create `/{id}/html` embedding endpoint, and set up GitHub Actions auto-deploy.
>
> **Deliverables**:
>
> - Netlify adapter configuration
> - Two root-level proxy endpoints (`/ethscriptions/<id>`, `/ethscriptions/<id>/content`) with 1-year caching
> - One embedding endpoint (`/{id}/html`) with CSS-inlined minimal HTML
> - Updated `[id].astro` page using proxy endpoints
> - GitHub Actions workflow for Netlify auto-deploy
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 → T4/T5 → T6 → T8 → F1-F4

---

## Context

### Original Request

1. Move from Vercel to Netlify (Durable Cache, higher request limits)
2. Add proxy endpoints for calldata.space API with caching
3. Add embedding endpoint (`/{id}/html`) for standalone minimal HTML output
4. Set up GitHub Actions auto-deploy to Netlify

### Key Decisions

- Netlify free tier, no Edge Functions
- Astro.cache with memory provider + HTTP cache headers for CDN durable cache
- Root-level proxy endpoints (not `/api` prefixed)
- Embedding endpoint returns minimal compliant HTML: `<html><head><title/><style/><link preload/></head><body>{asciiart}</body></html>`
- Query params: `font=highscript|lowscript`, `base_url=<string>`
- 404 on non-image (test with ID 498583)
- Cache TTL: 1 year for all proxy and embedding endpoints

---

## Work Objectives

### Core Objective

Migrate Asciify.Art from Vercel to Netlify, add proxy endpoints with 1-year caching, create `/{id}/html` embedding endpoint, and set up GitHub Actions CI/CD.

### Concrete Deliverables

- `astro.config.mjs` updated with `@astrojs/netlify`
- `src/pages/ethscriptions/[id].ts` - proxy metadata endpoint
- `src/pages/ethscriptions/[id]/content.ts` - proxy content endpoint
- `src/pages/[id]/html.ts` - embedding HTML endpoint
- Updated `src/pages/[id].astro` using proxy endpoints
- `.github/workflows/deploy.yml` - GitHub Actions workflow

### Must Have

- Netlify adapter configured and building
- Proxy endpoints caching upstream data for 1 year
- Embedding API returning valid standalone HTML
- Page updated to use proxy endpoints (no direct external fetches)
- GitHub Actions auto-deploy on push to `master`
- 404 on non-image for `/{id}/html` endpoint

### Must NOT Have

- No Edge Functions or Netlify-specific serverless code
- No database or KV store dependencies
- No auth, rate limiting, or user management

---

## Execution Strategy

### Waves

```
Wave 1 (Foundation - can start immediately):
├── T1: Install Netlify adapter + update astro.config.mjs
├── T2: Configure Astro.cache + caching utilities
├── T3: Create shared fetch/cache utilities for proxy
├── T7: Extract and inline CSS utilities for embedding
└── T9: GitHub Actions workflow for Netlify deploy

Wave 2 (After Wave 1 - proxy endpoints):
├── T4: Create proxy metadata endpoint (/ethscriptions/<id>)
└── T5: Create proxy content endpoint (/ethscriptions/<id>/content)

Wave 3 (After Wave 2 - embedding + page integration):
├── T6: Create /{id}/html embedding endpoint
└── T8: Update [id].astro to use proxy endpoints

Wave FINAL (After ALL tasks - 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + agent-browser)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

- **T1**: - → T4, T5
- **T2**: - → T4, T5, T6
- **T3**: - → T4, T5, T6
- **T4**: T1, T2, T3 → T6, T8
- **T5**: T1, T2, T3 → T6, T8
- **T6**: T4, T5, T7 → F1-F4
- **T7**: - → T6
- **T8**: T4, T5 → F1-F4
- **T9**: - → F1-F4

---

## TODOs

- [ ] T1. **Install Netlify adapter + update astro.config.mjs**

  **What to do**:
  - Remove `@astrojs/vercel` from dependencies
  - Install `@astrojs/netlify` (latest v6 compatible)
  - Update `astro.config.mjs`: replace `vercel()` with `netlify()` adapter
  - Ensure `output: "server"` is preserved
  - Run `bun run build` to verify

  **Acceptance Criteria**:
  - [ ] `@astrojs/netlify` installed in package.json
  - [ ] `astro.config.mjs` uses `netlify()` adapter
  - [ ] `bun run build` completes successfully

  **QA**:

  ```
  bun run build
  # Expected: Build completes, no Vercel references
  ```

  **Commit**: `chore(deps): replace @astrojs/vercel with @astrojs/netlify`

- [ ] T2. **Configure Astro.cache + caching utilities**

  **What to do**:
  - Create `src/lib/cache.ts` with cache helpers
  - Default TTL: 31536000 seconds (1 year)
  - Cache headers for Netlify CDN durable cache

  **Acceptance Criteria**:
  - [ ] `src/lib/cache.ts` exists with helper functions
  - [ ] HTTP headers include proper Cache-Control directives

  **QA**:

  ```
  curl -I http://localhost:4321/ethscriptions/498580
  # Expected: cache-control and netlify-cdn-cache-control headers present
  ```

  **Commit**: `feat(cache): add Astro.cache utilities with Netlify CDN headers`

- [ ] T3. **Create shared fetch/cache utilities for proxy**

  **What to do**:
  - Create `src/lib/fetch.ts` with `fetchEthscriptionMetadata(id)` and `fetchEthscriptionContent(id)`
  - Both use Astro.cache helpers from T2
  - Handle errors (404, 500)

  **Acceptance Criteria**:
  - [ ] `src/lib/fetch.ts` exists with both functions
  - [ ] Functions use cache helpers

  **Commit**: `feat(fetch): add shared upstream fetch utilities with caching`

- [ ] T4. **Create proxy metadata endpoint (/ethscriptions/<id>)**

  **What to do**:
  - Create `src/pages/ethscriptions/[id].ts`
  - Return JSON with `.result` wrapper preserved
  - Cache headers: 1 year
  - 404 if not found

  **Acceptance Criteria**:
  - [ ] Responds at `/ethscriptions/498580`
  - [ ] Returns valid JSON with `.result.ethscription_number`
  - [ ] Cache headers set to 1 year

  **QA**:

  ```
  curl -s http://localhost:4321/ethscriptions/498580 | jq '.result.ethscription_number'
  # Expected: "498580"
  ```

  **Commit**: `feat(proxy): add /ethscriptions/<id> metadata endpoint`

- [ ] T5. **Create proxy content endpoint (/ethscriptions/<id>/content)**

  **What to do**:
  - Create `src/pages/ethscriptions/[id]/content.ts`
  - Return raw image content with correct Content-Type
  - Cache headers: 1 year

  **Acceptance Criteria**:
  - [ ] Responds at `/ethscriptions/498580/content`
  - [ ] Returns raw image content
  - [ ] Cache headers set to 1 year

  **Commit**: `feat(proxy): add /ethscriptions/<id>/content endpoint`

- [ ] T6. **Create `/{id}/html` embedding endpoint**

  **What to do**:
  - Create `src/pages/[id]/html.ts`
  - Fetch metadata via proxy endpoint
  - Return 404 if `res.media_type !== 'image'` (test with 498583)
  - Generate minimal, minified HTML:
    ```
    <html><head><title>Asciify.Art - Ethscription #<n></title><style>{CSS}</style>{font preload if requested}</head><body>{asciiart div}</body></html>
    ```
  - Query params:
    - `font=highscript` or `font=lowscript` - include font preload link
    - No `font` param - no preload links
    - `base_url=<string>` - prefix for font URLs (use calldata API for testing)
  - Cache headers: 1 year

  **Acceptance Criteria**:
  - [ ] Responds at `/498580/html`
  - [ ] Returns minimal HTML
  - [ ] `font=highscript` includes preload link
  - [ ] No font param = no preload links
  - [ ] `base_url` prefixes URLs
  - [ ] 404 for non-image (498583)
  - [ ] Minified output

  **QA**:

  ```
  curl -s http://localhost:4321/498580/html | grep -c "<html"
  curl -s "http://localhost:4321/498580/html?font=highscript" | grep -c "preload"
  curl -s "http://localhost:4321/498580/html" | grep -c "<link"
  curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/498583/html
  # Expected: 404
  ```

  **Commit**: `feat(page): add /{id}/html embedding endpoint`

- [ ] T7. **Extract and inline CSS utilities for embedding**

  **What to do**:
  - Create `src/lib/styles.ts` with:
    - `getAsciiifyStyles()` - CSS string
    - `getFontLinks(baseUrl?, font?)` - font preload link
    - `buildAsciiartDiv(metadata)` - HTML div string
  - Extract from `src/pages/[id].astro`

  **Acceptance Criteria**:
  - [ ] `src/lib/styles.ts` exists with helper functions

  **Commit**: `feat(styles): extract reusable CSS utilities for embedding`

- [ ] T8. **Update `[id].astro` to use proxy endpoints**

  **What to do**:
  - Replace direct `fetch()` to calldata.space with proxy endpoints
  - Keep all existing page logic (POST, redirects, HTML structure)

  **Acceptance Criteria**:
  - [ ] Page loads without direct external fetches
  - [ ] POST form still works
  - [ ] ClientRouter still works

  **Commit**: `refactor(page): use proxy endpoints instead of direct fetches`

- [ ] T9. **GitHub Actions workflow for Netlify deploy**

  **What to do**:
  - Create `.github/workflows/deploy.yml`
  - Trigger on push to `master`
  - Use Netlify integration (no CLI token)

  **Acceptance Criteria**:
  - [ ] Workflow file exists and is valid
  - [ ] Triggers on push to master

  **Commit**: `ci: add GitHub Actions workflow for Netlify auto-deploy`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Verify all Must Have items exist, all Must NOT Have items absent.

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `astro check` + `build`. Check for anti-patterns.

- [ ] F3. **Real Manual QA** — `unspecified-high` + `agent-browser`
      Test all scenarios end-to-end.

- [ ] F4. **Scope Fidelity Check** — `deep`
      Verify 1:1 task-to-implementation mapping.

---

## Success Criteria

```bash
# Build must pass
bun run build

# Type checks must pass
bun run astro check

# Proxy endpoints
curl -s http://localhost:4321/ethscriptions/498580 | jq '.result.ethscription_number'

# Embedding endpoint
curl -s http://localhost:4321/498580/html | grep -c "<html"

# 404 on non-image
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/498583/html
# Expected: 404
```

### Final Checklist

- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] astro check passes (0 errors)
- [ ] build passes with Netlify adapter
- [ ] All proxy endpoints return correct data with cache headers
- [ ] `/{id}/html` endpoint supports query params (font, base_url)
- [ ] `/{id}/html` endpoint returns minimal compliant HTML
