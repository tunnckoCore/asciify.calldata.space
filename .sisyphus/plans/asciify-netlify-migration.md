# Asciify.Art: Netlify Migration + Proxy API + Embedding + Caching + CI/CD

## TL;DR

> **Migrate Asciify.Art from Vercel to Netlify** while adding proxy endpoints with Astro.cache, standalone HTML embedding API (`/api/raw/{n}` and `/api/html/{n}`), and GitHub Actions auto-deploy.
>
> **Deliverables**:
> - Netlify adapter configuration
> - Two root-level proxy endpoints (`/ethscriptions/<id>`, `/ethscriptions/<id>/content`) with 1-year caching
> - Two embedding API endpoints (`/api/raw/<n>`, `/api/html/<n>`) with CSS-inlined standalone output
> - Updated `[id].astro` page using proxy endpoints
> - GitHub Actions workflow for Netlify auto-deploy
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 (Netlify adapter) → T4/T5 (Proxy endpoints) → T6/T7 (Embedding API) → T9 (Page integration) → F1-F4 (Final QA)

---

## Context

### Original Request
User wants to:
1. Move from Vercel to Netlify (Durable Cache, higher request limits)
2. Add proxy endpoints for calldata.space API with caching
3. Add embedding API (`/api/raw/{n}`, `/api/html/{n}`) for standalone HTML output
4. Set up GitHub Actions auto-deploy to Netlify

### Interview Summary
**Key Discussions**:
- Netlify free tier, no Edge Functions needed
- Astro.cache with memory provider + HTTP cache headers for CDN durable cache
- Root-level proxy endpoints (not `/api` prefixed)
- Embedding API returns CSS-inlined HTML, query params for fonts/base_url
- 404 on non-image for `/api/*` endpoints
- Cache TTL: 1 year for all proxy and API endpoints

**Research Findings**:
- Astro v6.3.3 with `@astrojs/netlify` adapter
- `@astrojs/netlify` v6+ compatible with Astro v6
- Netlify free tier supports `Netlify-CDN-Cache-Control: durable`
- Astro.cache API: `set()`, `get()`, `invalidate()` with TTL and tags

---

## Work Objectives

### Core Objective
Migrate the Asciify.Art Astro application from Vercel to Netlify, add proxy endpoints with 1-year caching, create standalone HTML embedding API endpoints, and set up GitHub Actions CI/CD for automatic deployment.

### Concrete Deliverables
- `astro.config.mjs` updated with `@astrojs/netlify`
- `src/pages/ethscriptions/[id].ts` - proxy metadata endpoint
- `src/pages/ethscriptions/[id]/content.ts` - proxy content endpoint
- `src/pages/api/raw/[n].ts` - embedding fragment endpoint
- `src/pages/api/html/[n].ts` - embedding full HTML endpoint
- Updated `src/pages/[id].astro` using proxy endpoints
- `.github/workflows/deploy.yml` - GitHub Actions workflow

### Definition of Done
- `bun run astro check` passes with 0 errors
- `bun run build` passes with Netlify adapter
- `curl` tests pass for all 4 new endpoints
- `agent-browser` smoke tests pass for page navigation
- GitHub Actions workflow successfully deploys to Netlify

### Must Have
- Netlify adapter configured and building
- Proxy endpoints caching upstream data for 1 year
- Embedding API returning valid standalone HTML
- Page updated to use proxy endpoints (no direct external fetches)
- GitHub Actions auto-deploy on push to `master`
- 404 on non-image for `/api/*` endpoints

### Must NOT Have (Guardrails)
- No Edge Functions or Netlify-specific serverless code
- No database or KV store dependencies
- No auth, rate limiting, or user management
- No changes to existing UI/UX beyond embedding support
- No breaking changes to existing `/[id]` route behavior

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (astro check, build)
- **Automated tests**: NO (tests-after not needed for this migration)
- **Framework**: bun test (if needed)
- **Agent-Executed QA**: ALWAYS - every task includes QA scenarios

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Frontend/UI**: Use agent-browser - Navigate, interact, assert DOM
- **Build/Deploy**: Use Bash - Run commands, check exit codes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - can start immediately):
├── T1: Install Netlify adapter + update astro.config.mjs
├── T2: Configure Astro.cache + caching utilities
├── T3: Create shared fetch/cache utilities for proxy
└── T4: Create proxy metadata endpoint (/ethscriptions/<id>)

Wave 2 (After Wave 1 - proxy content + embedding API):
├── T5: Create proxy content endpoint (/ethscriptions/<id>/content)
├── T6: Create /api/raw/<n> embedding endpoint
├── T7: Create /api/html/<n> embedding endpoint
└── T8: Extract and inline CSS utilities for embedding

Wave 3 (After Wave 2 - integration + page updates):
├── T9: Update [id].astro to use proxy endpoints
├── T10: Add query param handling (fonts, base_url)
└── T11: GitHub Actions workflow for Netlify deploy

Wave FINAL (After ALL tasks - 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + agent-browser)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

- **T1**: - - T4, T5, T9
- **T2**: - - T4, T5, T6, T7
- **T3**: - - T4, T5, T6, T7
- **T4**: T1, T2, T3 - T6, T7, T9
- **T5**: T1, T2, T3 - T6, T7, T9
- **T6**: T4, T5, T8 - F1-F4
- **T7**: T4, T5, T8 - F1-F4
- **T8**: - - T6, T7
- **T9**: T4, T5 - F1-F4
- **T10**: T6, T7 - F1-F4
- **T11**: - - F1-F4

---

## TODOs

- [ ] T1. **Install Netlify adapter + update astro.config.mjs**

  **What to do**:
  - Remove `@astrojs/vercel` from dependencies
  - Install `@astrojs/netlify` (latest v6 compatible)
  - Update `astro.config.mjs`: replace `vercel()` with `netlify()` adapter
  - Ensure `output: "server"` is preserved
  - Run `bun run build` to verify Netlify adapter works

  **Must NOT do**:
  - Do not change `output` mode
  - Do not add Netlify-specific config options beyond adapter

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T4, T5, T9

  **References**:
  - `astro.config.mjs:1-13` - Current config to modify
  - `@astrojs/netlify` docs - Adapter configuration

  **Acceptance Criteria**:
  - [ ] `@astrojs/netlify` installed in package.json
  - [ ] `astro.config.mjs` uses `netlify()` adapter
  - [ ] `bun run build` completes successfully
  - [ ] No Vercel references remain in config

  **QA Scenarios**:
  ```
  Scenario: Build with Netlify adapter
    Tool: Bash
    Preconditions: Clean working directory
    Steps:
      1. bun run build
    Expected Result: Build completes with "[@astrojs/netlify]" output
    Evidence: .sisyphus/evidence/task-t1-build.log
  ```

  **Commit**: YES
  - Message: `chore(deps): replace @astrojs/vercel with @astrojs/netlify`

- [ ] T2. **Configure Astro.cache + caching utilities**

  **What to do**:
  - Add cache configuration to `astro.config.mjs` (if needed for v6)
  - Create `src/lib/cache.ts` with helper functions:
    - `cacheResponse(key, data, ttl)` - stores in Astro.cache + sets HTTP headers
    - `getCachedResponse(key)` - retrieves from Astro.cache
    - `buildCacheHeaders(ttl)` - returns Cache-Control + Netlify-CDN-Cache-Control headers
  - TTL: 31536000 seconds (1 year) default
  - Handle cache misses gracefully (fetch upstream)

  **Must NOT do**:
  - Do not use external database or KV store
  - Do not implement cache invalidation logic (not needed for immutable data)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T4, T5, T6, T7

  **References**:
  - Astro cache docs - `Astro.cache` API
  - Netlify cache headers - `Netlify-CDN-Cache-Control: durable`

  **Acceptance Criteria**:
  - [ ] `src/lib/cache.ts` exists with helper functions
  - [ ] Functions handle cache set/get correctly
  - [ ] HTTP headers include proper Cache-Control directives

  **QA Scenarios**:
  ```
  Scenario: Cache headers present
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -I http://localhost:4321/ethscriptions/498580
    Expected Result: Response includes "cache-control" and "netlify-cdn-cache-control" headers
    Evidence: .sisyphus/evidence/task-t2-headers.txt
  ```

  **Commit**: YES
  - Message: `feat(cache): add Astro.cache utilities with Netlify CDN headers`

- [ ] T3. **Create shared fetch/cache utilities for proxy**

  **What to do**:
  - Create `src/lib/fetch.ts` with:
    - `fetchEthscriptionMetadata(id)` - fetches from mainnet.api.calldata.space
    - `fetchEthscriptionContent(id)` - fetches content from upstream
    - Both functions should use Astro.cache helpers from T2
    - Handle errors (404, 500, network errors)
    - Return typed responses
  - Create shared types in `src/types/` if needed

  **Must NOT do**:
  - Do not hardcode API URLs in multiple places
  - Do not swallow errors silently

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T4, T5, T6, T7

  **References**:
  - `src/pages/[id].astro:27-36` - Current fetch pattern to abstract

  **Acceptance Criteria**:
  - [ ] `src/lib/fetch.ts` exists with both fetch functions
  - [ ] Functions use cache helpers
  - [ ] Error handling for upstream failures

  **QA Scenarios**:
  ```
  Scenario: Fetch metadata for valid ID
    Tool: Bash (curl)
    Steps:
      1. Test via endpoint (T4)
    Expected Result: Returns valid JSON with media_type field
    Evidence: .sisyphus/evidence/task-t3-fetch.json
  ```

  **Commit**: YES
  - Message: `feat(fetch): add shared upstream fetch utilities with caching`

- [ ] T4. **Create proxy metadata endpoint (/ethscriptions/<id>)**

  **What to do**:
  - Create `src/pages/ethscriptions/[id].ts` (API route)
  - Accept `id` param (ethscription number or tx hash)
  - Call `fetchEthscriptionMetadata(id)` from T3
  - Return JSON response with cache headers (1 year TTL)
  - Handle errors: 404 if not found, 500 for upstream errors
  - This is a root-level route, NOT under `/api`

  **Must NOT do**:
  - Do not add auth or rate limiting
  - Do not transform the upstream response (pass through as-is)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T1, T2, T3)
  - **Parallel Group**: Wave 1/2 boundary
  - **Blocks**: T6, T7, T9
  - **Blocked By**: T1, T2, T3

  **Acceptance Criteria**:
  - [ ] Endpoint responds at `/ethscriptions/498580`
  - [ ] Returns valid JSON with ethscription metadata
  - [ ] Cache headers set to 1 year
  - [ ] 404 for non-existent IDs

  **QA Scenarios**:
  ```
  Scenario: Valid ethscription metadata
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -s http://localhost:4321/ethscriptions/498580 | jq '.ethscription_number'
    Expected Result: Returns "498580" with 200 status
    Evidence: .sisyphus/evidence/task-t4-metadata.json

  Scenario: Invalid ethscription (404)
    Tool: Bash (curl)
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/ethscriptions/invalid
    Expected Result: Returns 404
    Evidence: .sisyphus/evidence/task-t4-404.txt
  ```

  **Commit**: YES
  - Message: `feat(proxy): add /ethscriptions/<id> metadata endpoint`

- [ ] T5. **Create proxy content endpoint (/ethscriptions/<id>/content)**

  **What to do**:
  - Create `src/pages/ethscriptions/[id]/content.ts` (API route)
  - Accept `id` param (ethscription number or tx hash)
  - Call `fetchEthscriptionContent(id)` from T3
  - Return raw content with proper Content-Type header
  - Set cache headers (1 year TTL)
  - Handle 404 if content not found

  **Must NOT do**:
  - Do not transform or process the content
  - Do not add watermarking or modifications

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T1, T2, T3)
  - **Parallel Group**: Wave 2
  - **Blocks**: T6, T7, T9
  - **Blocked By**: T1, T2, T3

  **Acceptance Criteria**:
  - [ ] Endpoint responds at `/ethscriptions/498580/content`
  - [ ] Returns raw image content with correct Content-Type
  - [ ] Cache headers set to 1 year
  - [ ] 404 for non-existent content

  **QA Scenarios**:
  ```
  Scenario: Valid ethscription content
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -s -o /dev/null -w "%{content_type}" http://localhost:4321/ethscriptions/498580/content
    Expected Result: Returns "image/png" (or appropriate type)
    Evidence: .sisyphus/evidence/task-t5-content-type.txt

  Scenario: Cache headers present
    Tool: Bash (curl)
    Steps:
      1. curl -I http://localhost:4321/ethscriptions/498580/content
    Expected Result: Includes cache-control with max-age=31536000
    Evidence: .sisyphus/evidence/task-t5-headers.txt
  ```

  **Commit**: YES
  - Message: `feat(proxy): add /ethscriptions/<id>/content endpoint`

- [ ] T6. **Create /api/raw/<n> embedding endpoint**

  **What to do**:
  - Create `src/pages/api/raw/[n].ts`
  - Accept `n` param (ethscription number)
  - Fetch metadata via proxy endpoint (cache hit)
  - Return 404 if `res.media_type !== 'image'`
  - Generate standalone HTML fragment:
    - CSS inlined (extract from `[id].astro` styles)
    - Include the `asciiart` div with data attributes
    - Include the JSON data as text content
  - Query params:
    - `fonts=1` or `fonts=true` - include font preload links
    - `base_url=<string>` - prefix for font URLs
  - Default: no base_url, links are relative like `/ethscriptions/0x.../content`
  - Set cache headers (1 year)
  - Content-Type: `text/html; charset=utf-8`

  **Must NOT do**:
  - Do not include `<html>`, `<head>`, or `<body>` tags (this is a fragment)
  - Do not include JavaScript or interactive elements
  - Do not include nav, search form, or download button

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T4, T5)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: T4, T5, T8

  **References**:
  - `src/pages/[id].astro:133-191` - Styles to extract
  - `src/pages/[id].astro:275-285` - asciiart div structure

  **Acceptance Criteria**:
  - [ ] Endpoint responds at `/api/raw/498580`
  - [ ] Returns HTML fragment without html/body tags
  - [ ] CSS is inlined in `<style>` tag
  - [ ] Includes asciiart div with data-eid, data-enumber, style
  - [ ] Includes JSON data as text content
  - [ ] 404 for non-image ethscriptions
  - [ ] Respects `fonts` and `base_url` query params
  - [ ] Cache headers set to 1 year

  **QA Scenarios**:
  ```
  Scenario: Raw fragment for image
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -s http://localhost:4321/api/raw/498580 | grep -c "asciiart"
    Expected Result: Contains "asciiart" class, no <html> tag
    Evidence: .sisyphus/evidence/task-t6-raw.html

  Scenario: Raw fragment with fonts
    Tool: Bash (curl)
    Steps:
      1. curl -s "http://localhost:4321/api/raw/498580?fonts=1" | grep -c "<link"
    Expected Result: Contains font preload links
    Evidence: .sisyphus/evidence/task-t6-raw-fonts.html

  Scenario: Non-image returns 404
    Tool: Bash (curl)
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/api/raw/1
    Expected Result: Returns 404
    Evidence: .sisyphus/evidence/task-t6-404.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add /api/raw/<n> embedding endpoint`

- [ ] T7. **Create /api/html/<n> embedding endpoint**

  **What to do**:
  - Create `src/pages/api/html/[n].ts`
  - Accept `n` param (ethscription number)
  - Same logic as T6 but wraps in full HTML document:
    - `<!DOCTYPE html><html><head><title>...</title><style>...</style></head><body>...</body></html>`
    - Title: `Asciify.Art - Ethscription #<n>`
    - Include meta charset and viewport
    - Include CSS (same as raw)
    - Include the asciiart div
  - Same query params: `fonts`, `base_url`
  - Same 404 logic for non-image
  - Cache headers: 1 year
  - Content-Type: `text/html; charset=utf-8`

  **Must NOT do**:
  - Do not include nav, search, download button, or interactive elements
  - Do not include ClientRouter or JavaScript

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T4, T5)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: T4, T5, T8

  **Acceptance Criteria**:
  - [ ] Endpoint responds at `/api/html/498580`
  - [ ] Returns complete HTML document with html/head/body
  - [ ] Title includes ethscription number
  - [ ] CSS inlined in head
  - [ ] Includes asciiart div
  - [ ] 404 for non-image
  - [ ] Respects query params
  - [ ] Cache headers set to 1 year

  **QA Scenarios**:
  ```
  Scenario: Full HTML for image
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -s http://localhost:4321/api/html/498580 | grep -c "<html"
    Expected Result: Contains <html> tag, <head>, <body>
    Evidence: .sisyphus/evidence/task-t7-html.html

  Scenario: Full HTML with base_url
    Tool: Bash (curl)
    Steps:
      1. curl -s "http://localhost:4321/api/html/498580?base_url=https://example.com" | grep "href=\"https://example.com"
    Expected Result: Font links prefixed with base_url
    Evidence: .sisyphus/evidence/task-t7-html-baseurl.html
  ```

  **Commit**: YES
  - Message: `feat(api): add /api/html/<n> embedding endpoint`

- [ ] T8. **Extract and inline CSS utilities for embedding**

  **What to do**:
  - Create `src/lib/styles.ts` with:
    - `getAsciiifyStyles()` - returns the CSS string from `[id].astro`
    - `getFontLinks(baseUrl?, includeFonts?)` - returns font preload/link tags
    - `buildAsciiartDiv(metadata)` - returns the HTML div string
  - Extract styles from `src/pages/[id].astro:133-191`
  - Make styles reusable for both embedding endpoints
  - Keep font paths configurable (base_url prefix)

  **Must NOT do**:
  - Do not duplicate styles in multiple files
  - Do not hardcode font URLs

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (can start with T4/T5)
  - **Blocks**: T6, T7

  **Acceptance Criteria**:
  - [ ] `src/lib/styles.ts` exists with helper functions
  - [ ] Styles match those in `[id].astro`
  - [ ] Font links configurable via baseUrl

  **QA Scenarios**:
  ```
  Scenario: Styles include all required CSS
    Tool: Bash
    Steps:
      1. grep -c "asciiart" src/lib/styles.ts
    Expected Result: Contains asciiart styles
    Evidence: .sisyphus/evidence/task-t8-styles.txt
  ```

  **Commit**: YES
  - Message: `feat(styles): extract reusable CSS utilities for embedding`

- [ ] T9. **Update [id].astro to use proxy endpoints**

  **What to do**:
  - Update `src/pages/[id].astro`:
    - Replace direct `fetch()` to calldata.space with calls to proxy endpoints
    - Use `Astro.url.origin` + `/ethscriptions/${id}` for metadata
    - Use `Astro.url.origin` + `/ethscriptions/${id}/content` for content
    - Keep all existing page logic (POST handling, redirects, HTML structure)
  - Ensure the page still works with ClientRouter and view transitions
  - Update any hardcoded URLs to use proxy

  **Must NOT do**:
  - Do not change page layout or styling
  - Do not break existing POST form behavior
  - Do not break ClientRouter navigation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T4, T5)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: T4, T5

  **Acceptance Criteria**:
  - [ ] Page loads without direct external fetches
  - [ ] All metadata and content comes from proxy endpoints
  - [ ] POST form still works
  - [ ] ClientRouter navigation still works
  - [ ] No regression in page behavior

  **QA Scenarios**:
  ```
  Scenario: Page loads via proxy
    Tool: agent-browser
    Preconditions: Dev server running
    Steps:
      1. agent-browser open http://localhost:4321/498580
      2. agent-browser wait --load networkidle
      3. agent-browser snapshot -i
    Expected Result: Page shows "Asciify.Art" heading and asciiart div
    Evidence: .sisyphus/evidence/task-t9-page.png

  Scenario: POST form redirect
    Tool: agent-browser
    Steps:
      1. agent-browser fill @e8 "498581"
      2. agent-browser click @e9
      3. agent-browser wait --load networkidle
    Expected Result: URL changes to /498581
    Evidence: .sisyphus/evidence/task-t9-form.png
  ```

  **Commit**: YES
  - Message: `refactor(page): use proxy endpoints instead of direct fetches`

- [ ] T10. **Add query param handling (fonts, base_url)**

  **What to do**:
  - Update embedding endpoints (T6, T7) to handle query params:
    - `fonts=1` or `fonts=true` - include font preload links
    - `base_url=<string>` - prefix for relative URLs
  - Update proxy endpoints if needed
  - Ensure query params don't break caching (vary by query params)
  - Add validation for base_url (must be valid URL string)

  **Must NOT do**:
  - Do not cache different query param variants separately (use Vary header)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T6, T7)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: T6, T7

  **Acceptance Criteria**:
  - [ ] `fonts=1` includes font links
  - [ ] `fonts=0` excludes font links
  - [ ] `base_url` prefixes relative URLs
  - [ ] Invalid base_url handled gracefully

  **QA Scenarios**:
  ```
  Scenario: Query params respected
    Tool: Bash (curl)
    Steps:
      1. curl -s "http://localhost:4321/api/raw/498580?fonts=1&base_url=https://cdn.example.com"
    Expected Result: Contains font links with cdn.example.com prefix
    Evidence: .sisyphus/evidence/task-t10-params.html
  ```

  **Commit**: YES (can group with T6/T7)
  - Message: `feat(api): add query param support for fonts and base_url`

- [ ] T11. **GitHub Actions workflow for Netlify deploy**

  **What to do**:
  - Create `.github/workflows/deploy.yml`:
    - Trigger on push to `master`
    - Install Bun
    - Run `bun install`
    - Run `bun run build`
    - Deploy to Netlify (use Netlify integration, not CLI token)
  - Configure Netlify site settings:
    - Build command: `bun run build`
    - Publish directory: `dist/` (or Netlify adapter output)
  - Add `netlify.toml` if needed for redirects or headers

  **Must NOT do**:
  - Do not use Netlify CLI token in GitHub secrets (use integration)
  - Do not deploy on pull requests (only push to master)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4

  **Acceptance Criteria**:
  - [ ] `.github/workflows/deploy.yml` exists and is valid YAML
  - [ ] Workflow triggers on push to master
  - [ ] Build step runs `bun run build`
  - [ ] Deploy step configured for Netlify
  - [ ] No secrets/tokens in repo (use integration)

  **QA Scenarios**:
  ```
  Scenario: Workflow file is valid
    Tool: Bash
    Steps:
      1. cat .github/workflows/deploy.yml | head -20
    Expected Result: Valid YAML with on.push.branches=[master]
    Evidence: .sisyphus/evidence/task-t11-workflow.yml
  ```

  **Commit**: YES
  - Message: `ci: add GitHub Actions workflow for Netlify auto-deploy`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run astro check` + `bun run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports.
  Output: `Build [PASS/FAIL] | Check [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` + `agent-browser`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: invalid ID, non-image, missing query params. Save evidence.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- T1: `chore(deps): replace @astrojs/vercel with @astrojs/netlify`
- T2: `feat(cache): add Astro.cache utilities with Netlify CDN headers`
- T3: `feat(fetch): add shared upstream fetch utilities with caching`
- T4: `feat(proxy): add /ethscriptions/<id> metadata endpoint`
- T5: `feat(proxy): add /ethscriptions/<id>/content endpoint`
- T6: `feat(api): add /api/raw/<n> embedding endpoint`
- T7: `feat(api): add /api/html/<n> embedding endpoint`
- T8: `feat(styles): extract reusable CSS utilities for embedding`
- T9: `refactor(page): use proxy endpoints instead of direct fetches`
- T10: `feat(api): add query param support for fonts and base_url`
- T11: `ci: add GitHub Actions workflow for Netlify auto-deploy`

---

## Success Criteria

### Verification Commands
```bash
# Build must pass
bun run build

# Type checks must pass
bun run astro check

# Proxy endpoints
curl -s http://localhost:4321/ethscriptions/498580 | jq '.ethscription_number'

# Embedding endpoints
curl -s http://localhost:4321/api/raw/498580 | grep -c "asciiart"
curl -s http://localhost:4321/api/html/498580 | grep -c "<html"

# 404 on non-image
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/api/raw/1
# Expected: 404
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] astro check passes (0 errors)
- [ ] build passes with Netlify adapter
- [ ] All proxy endpoints return correct data with cache headers
- [ ] All embedding endpoints return valid HTML with query param support
- [ ] Page uses proxy endpoints (no direct external fetches)
- [ ] GitHub Actions workflow configured
- [ ] No Vercel references remain
