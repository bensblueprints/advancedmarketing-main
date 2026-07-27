# Content Plan — advancedmarketing.co

How the site earns organic traffic for agency service terms, and how the new `/blog/` section funnels link equity to onetimesuite.com.

## Goals

1. **Rank the agency for ads-management and marketing-ops terms.** The service pages (`/services/facebook-ads/`, `/services/google-ads/`, `/services/cro/`, …) target high-intent commercial keywords, but commercial pages alone rarely rank without supporting content. The blog supplies the informational layer that links into them.
2. **Funnel DA30 link equity to onetimesuite.com.** advancedmarketing.co has existing domain authority; onetimesuite.com is new. Every one of the 525 blog articles carries a contextual dofollow link to `https://onetimesuite.com/<slug>/` with descriptive anchor text ("get {Brand} on OneTimeSuite"), plus a link to the local `/software/<slug>/` page (whose canonical already defers to onetimesuite.com). That is 525 relevant, indexed pages passing equity to the exact product URLs we want ranked.
3. **Capture long-tail competitor-alternative demand.** "X alternative", "X vs Y", "how to do Z without X" queries have clear intent, weak competition for niche tools, and convert directly into OneTimeSuite sales.

## Keyword map

### Service keywords → money pages (existing)

| Keyword cluster | Page |
|---|---|
| facebook ads agency / management | `/services/facebook-ads/` |
| google adwords agency / PPC management | `/services/google-ads/` |
| PR / press release distribution | `/services/pr-press/` |
| ecommerce website development | `/services/ecommerce-website/` |
| AI software development | `/services/ai-software/` |
| conversion rate optimization | `/services/cro/` |

### Article intents → the 5 formulas (`build-blog.js`, 105 apps × 5 = 525 articles)

| Intent | Formula | URL pattern | Example query |
|---|---|---|---|
| Competitor-alternative | `{Comp} Alternative for Marketing Teams: {Brand}` | `/blog/<slug>-<comp>-alternative-for-agencies/` | "otter.ai alternative" |
| Use case (agency angle) | `How Agencies Use {Brand} to {use case}` | `/blog/how-agencies-use-<slug>/` | "how agencies transcribe client calls" |
| Vs / comparison | `{Brand} vs {Comp}: Honest Comparison` | `/blog/<slug>-vs-<comp>-honest-comparison/` | "mailchimp vs self-hosted" |
| DIY / budget | `How to {job} Without a {Comp} Subscription` | `/blog/<job>-without-<comp>/` | "send email campaigns without mailchimp" |
| Review | `{Brand} Review: the Pay-Once {cat} Tool` | `/blog/<slug>-review-pay-once-<cat>/` | "postbird review" |

Per-app angles (use case, job-to-be-done, category, service cross-link) are curated in the `META` (original 56 apps) and `NEW_META` (49 apps merged from the OTS catalog) tables at the top of `build-blog.js` — edit there, not in the generated HTML. `NEW_META` entries were first auto-derived (`deriveMeta()`: short competitor name from `competitor`, use case/job from oneliner/features/steps, category from tagline, service link by keyword heuristics) and then hand-tuned; the build's verifier prints which apps failed raw auto-derivation.

Catalog coverage: the merged catalog is **105 apps** — 56 from local `software-src/products.js` (which win slug conflicts and have local `/software/<slug>/` pages) plus 49 from the sibling `onetimesuite-com` repo (`products.js` + `products-51-100.js` + `extra-products.js`; web-app one-time prices come from `tier-checkouts.json` lifetime tiers). 4 of the merged apps (bloomrecorder, wispertalk, clip-pipeline, viral-invoice) have no Whop listing yet and are treated as "in release prep".

## Internal-linking rules

1. Every article links **out to** `https://onetimesuite.com/<slug>/` once in body copy and once in the CTA block (the equity pass). Exception: release-prep apps carry no buy link at all.
2. Articles for the original 56 apps link to `/software/<slug>/` ("software shelf"). The 49 OTS-catalog apps have no local landing page, so their articles link to the `/software/` shelf index instead — never to a `/software/<slug>/` URL that would 404. (If those landing pages are ever generated, re-running `node build-blog.js` upgrades the links automatically — it checks the filesystem per slug.)
3. Every article links to **one** relevant `/services/` page, chosen by tool fit (creative/video → facebook-ads; analytics/SEO/rank tracking → google-ads; lead capture, feedback, e-sign → cro; content/PR-adjacent → pr-press; infra/dev tools → ai-software; storefront-adjacent → ecommerce-website). One link, natural sentence, in the CTA block ("Rather hand this to a team that does it daily?").
4. Every article cross-links its **4 sibling articles** for the same app ("More on {Brand}"), so each app forms a tight 5-page cluster — any one ranking page lifts the other four.
5. `/blog/` groups all 525 by intent with crawlable anchors (`#alternatives`, `#use-cases`, `#comparisons`, `#without`, `#reviews`); articles' "Filed under" lines point back to these.
6. Service pages should eventually link back to 2–3 topically-close articles each (requires edits to `services/**` — outside the blog build; do it in a follow-up pass).

## Staged publishing (recommended)

Launching 526 new URLs in one deploy can look like scaled content spam to Google, especially from a domain with no prior blog velocity. Publish in **5 weekly batches of ~105**, one formula per week — each batch is a coherent intent group, which also makes GSC analysis cleaner:

- **Week 1:** formula 1 (alternatives) — highest commercial intent first.
- **Week 2:** formula 3 (vs comparisons).
- **Week 3:** formula 5 (reviews).
- **Week 4:** formula 2 (use cases).
- **Week 5:** formula 4 (without-the-subscription).

Mechanism: in `build-blog.js`, set `ACTIVE_FORMULAS` to the week's formulas (e.g. `const ACTIVE_FORMULAS = [1];`), run `node build-blog.js`, deploy. The script is idempotent — it regenerates the whole `/blog/` tree and rewrites only the `/blog/` entries in `sitemap.xml` (the original 144 URLs are never touched). Note the sitemap only advertises what you have generated, so run the script fresh for each batch rather than deploying the full tree at once. If you prefer ~200/week, batch two formulas per run (e.g. `[1, 3]`, `[5, 2]`, `[4]`) over 3 weeks.

Coming-soon apps (currently the 4 newest OTS-catalog apps — no Whop listing yet) keep their articles but are labeled "in release prep" and link only to the software shelf, never the buy link.

## Measurement

Watch in Google Search Console (weekly, per batch):

- **Queries:** "{competitor} alternative", "{brand} vs {competitor}", "{brand} review", "how to {job} without {competitor}", "pay once {category}" — one cluster per formula.
- **Pages:** impressions/CTR for `/blog/` batch URLs at weeks 2, 4, 6 after each batch; index coverage (crawled-not-indexed is the spam-signal to watch — if it spikes, slow the cadence).
- **Links:** the "Links" report should show onetimesuite.com gaining referring pages from advancedmarketing.co; corroborate with Ahrefs/Moz DR movement on onetimesuite.com over 60–90 days.
- **Cannibalization check:** `/software/comparison/<slug>-alternative/` (existing) vs `/blog/<slug>-<comp>-alternative-for-agencies/` — the old ones canonical to onetimesuite.com, so they do not compete with the new blog URLs; watch that blog URLs win the "alternative" queries on this domain.
- **Assisted conversions:** OneTimeSuite referral traffic from advancedmarketing.co in whichever analytics OTS runs.

## Next content ideas

1. **Case-study articles** — "How we run {client vertical} campaigns with pay-once tools": pair each existing case study (`/case-study/herban-bud`, `/case-study/burger`) with the 3–4 tools that fit that client's stack. Hand-written, one per month; these are the pages that earn natural backlinks.
2. **Client-facing tool roundups** — "The 2026 pay-once marketing stack: 10 tools that replaced $4,000/yr of SaaS" and per-role roundups (media buyer's stack, content lead's stack). Roundups capture list-query demand and link to ~10 article clusters each.
3. **Alternatives listicles per competitor** — "7 Otter.ai alternatives for agencies" aggregating whisperdesk + adjacent tools; targets the plural "alternatives" SERP feature the single-tool pages can't win.
4. **Cost-of-SaaS audit series** — annual "what a 10-person agency spends on SaaS" teardown using the real `compYr` data already in `software-src/products.js`.

## Maintenance

- Product data for the original 56 apps lives in `software-src/products.js`, and for the other 49 in the sibling `onetimesuite-com/src` repo (merged at build time; tier lifetime prices override sticker prices for web apps); per-article angles live in `META`/`NEW_META` in `build-blog.js`. After any product update, re-run `node build-blog.js` — the built-in verifier re-asserts title uniqueness/length, backlinks, JSON-LD validity, word counts, and sitemap completeness on every run.
- Keep `COMING_SOON` in `build-blog.js` in sync with `build-software.js`.
- Date stamps: articles are dated 2026-07-27; when materially refreshing a formula, bump `PUBLISHED` and the sitemap `lastmod` together.
