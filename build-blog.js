/*
 * build-blog.js — generates the /blog section for advancedmarketing.co:
 *   /blog/                                index, grouped by search intent
 *   /blog/<article-slug>/                 5 articles per app (105 apps = 525 articles)
 *
 * Every article is a "marketing use cases + competitor alternatives" piece that
 * links back to https://onetimesuite.com/<slug>/ (the SEO backlink) and, when a
 * local landing page exists, to /software/<slug>/.
 *
 * The 5 formulas per app (distinct search intents):
 *   1. <slug>-<comp>-alternative-for-agencies/   competitor-alternative intent
 *   2. how-agencies-use-<slug>/                  use-case intent, agency angle
 *   3. <slug>-vs-<comp>-honest-comparison/       vs intent (compRows table)
 *   4. <job>-without-<comp>/                     DIY/budget intent
 *   5. <slug>-review-pay-once-<category>/        review intent (verdict section)
 *
 * Catalog: local software-src/products.js (56 apps, has /software/<slug>/ pages)
 * merged with the full OneTimeSuite catalog from the sibling onetimesuite-com
 * repo (104 apps). Local entries win on slug conflicts; whop/tier data comes
 * from the OTS src for apps missing locally. New apps have no local /software
 * page, so their CTAs link only the OTS page + the /software/ shelf index.
 *
 * Reuses the site's shared chrome (nav/footer/voice widget) and /css/site.css,
 * mirroring build-software.js. Unlike /software pages (which canonically defer
 * to onetimesuite.com), /blog pages are unique to this domain and self-canonical.
 *
 * Staged publishing: to release in weekly batches of ~105, comment out formulas
 * in the ACTIVE_FORMULAS list below and re-run (see CONTENT-PLAN.md).
 *
 * Run:  node build-blog.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://advancedmarketing.co';
const OTS = 'https://onetimesuite.com';
const WHOP = 'https://whop.com/benjisaiempire';
const PUBLISHED = '2026-07-27';

/* ---------- catalog merge: local software-src + full OneTimeSuite catalog ----------
 * Local entries win on slug conflicts. Whop links merge with local winning.
 * For web apps the OTS repo only sells via tier checkouts — the tier lifetime
 * price is the one-time price used throughout the articles. */
const localProducts = require('./software-src/products.js');
const localWhop = require('./software-src/whop-links.json');

const OTS_SRC = path.join(ROOT, '..', 'onetimesuite-com', 'src');
let remoteProducts = [];
let remoteWhop = {};
let tierCheckouts = {};
if (fs.existsSync(OTS_SRC)) {
  remoteProducts = ['products.js', 'products-51-100.js', 'extra-products.js']
    .flatMap(f => (fs.existsSync(path.join(OTS_SRC, f)) ? require(path.join(OTS_SRC, f)) : []));
  try { remoteWhop = require(path.join(OTS_SRC, 'whop-links.json')); } catch (e) { /* no remote whop data */ }
  try { tierCheckouts = require(path.join(OTS_SRC, 'tier-checkouts.json')); } catch (e) { /* no tier data */ }
} else {
  console.warn('WARN: OneTimeSuite catalog not found at', OTS_SRC, '— building from local software-src only');
}

const localSlugs = new Set(localProducts.map(p => p.slug));
const seenRemote = new Set();
const freshProducts = remoteProducts.filter(p => !localSlugs.has(p.slug) && !seenRemote.has(p.slug) && seenRemote.add(p.slug));
freshProducts.forEach(p => {
  const t = tierCheckouts[p.slug];
  if (!(t && t.prices && t.prices.lifetime) || t.prices.lifetime === p.price) return;
  const oldPrice = p.price;
  p.price = t.prices.lifetime;
  /* The OTS catalog's prose (compRows 'us' column, heroLead, payback, steps, faq)
   * still quotes the old sticker price. Normalize it to the tier lifetime price —
   * but never rewrite the competitor ('them') column or competitor prices quoted
   * inside prose (e.g. "Statuspage starts at $29 a month"). */
  const ours = new RegExp('\\$' + oldPrice + '(?![0-9])(?!\\s*(?:\\/|a month|per month|per agent|per user|per seat|a year))', 'g');
  const fix = s => (typeof s === 'string' ? s.replace(ours, '$' + p.price) : s);
  p.tagline = fix(p.tagline); p.oneliner = fix(p.oneliner); p.heroLead = fix(p.heroLead); p.payback = fix(p.payback);
  p.features = p.features.map(f => [f[0], fix(f[1]), fix(f[2])]);
  p.compRows = p.compRows.map(r => [fix(r[0]), fix(r[1]), r[2]]);
  p.steps = p.steps.map(s => s.map(fix));
  p.faq = p.faq.map(q => q.map(fix));
});
const products = [...localProducts, ...freshProducts];
const whopLinks = { ...remoteWhop, ...localWhop };
const freshSlugs = new Set(freshProducts.map(p => p.slug));

/* Desktop-only vs web-hosted (DESKTOP_SLUGS matches build-software.js; apps from
 * the OTS catalog carry their own kind field, the 4 newest get an override) */
const DESKTOP_SLUGS = new Set([
  'pdfsmith', 'cutaway', 'whisperdesk', 'shrinkray', 'clipdeck', 'sigcraft', 'streakly', 'deepdesk',
  'quillpad', 'wrangle', 'reelsnag', 'voicebarn', 'textract', 'memeforge', 'orgtree', 'renewcheck',
  'paletteforge', 'iconforge',
]);
const KIND_OVERRIDE = { bloomrecorder: 'desktop', wispertalk: 'desktop', 'clip-pipeline': 'desktop', 'viral-invoice': 'web' };
const kindOf = p => (DESKTOP_SLUGS.has(p.slug) ? 'desktop' : (p.kind || KIND_OVERRIDE[p.slug] || 'web'));
const category = (p) => (kindOf(p) === 'desktop' ? 'desktop app' : 'self-hosted web app');

/* A /software/<slug>/ landing page exists only for the original 56 local apps */
const SHELF = p => fs.existsSync(path.join(ROOT, 'software', p.slug, 'index.html'));

/* Coming soon (brand list mirrors build-software.js; apps with no Whop listing
 * yet are treated the same): keep the articles, note "in release prep", and
 * link only to the software shelf — never a buy link. */
const COMING_SOON = new Set(['Dealstack']);
const isSoon = (p) => COMING_SOON.has(p.brand) || !(whopLinks[p.slug] && whopLinks[p.slug].productUrl);

/* ---------- per-app editorial metadata ----------
 * comp:     short competitor name used in titles/slugs
 * use:      primary agency use case (sentence case; title-cased for H1s)
 * job:      job-to-be-done (sentence case; title-cased for H1s) — keep
 *           job+comp ≤ 29 chars so formula-4 titles stay ≤ 60
 * jobSlug:  kebab slug for formula 4
 * cat:      category noun for the review title ("the Pay-Once {cat} Tool for Marketers")
 * svc/svcLabel: the /services/ page where a soft cross-link fits naturally */
const META = {
  pdfsmith:    { comp: 'SmallPDF',        use: 'prepare client PDFs offline',     job: 'prepare client PDFs',          jobSlug: 'prepare-client-pdfs',          cat: 'PDF',            svc: '/services/google-ads/',         svcLabel: 'Google Ads & reporting' },
  cutaway:     { comp: 'remove.bg',       use: 'produce ad creative at scale',    job: 'edit product photos',          jobSlug: 'edit-product-photos',          cat: 'Cutout',         svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  whisperdesk: { comp: 'Otter.ai',        use: 'transcribe client calls',         job: 'transcribe audio',             jobSlug: 'transcribe-audio-files',       cat: 'Transcription',  svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  shrinkray:   { comp: 'TinyPNG Pro',     use: 'speed up client landing pages',   job: 'compress images',              jobSlug: 'compress-images',              cat: 'Compressor',     svc: '/services/cro/',                svcLabel: 'CRO' },
  clipdeck:    { comp: 'Loom',            use: 'record client walkthroughs',      job: 'record walkthroughs',          jobSlug: 'record-screen-walkthroughs',   cat: 'Screencast',     svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  upwatch:     { comp: 'UptimeRobot',     use: 'monitor client sites 24/7',       job: 'monitor uptime',               jobSlug: 'monitor-site-uptime',          cat: 'Uptime',         svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  trimly:      { comp: 'Bitly',           use: 'track campaign links',            job: 'run branded short links',      jobSlug: 'run-branded-short-links',      cat: 'Short Link',     svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  billcraft:   { comp: 'FreshBooks',      use: 'invoice retainer clients',        job: 'invoice clients',              jobSlug: 'invoice-your-clients',         cat: 'Invoicing',      svc: '/services/cro/',                svcLabel: 'CRO' },
  bookslot:    { comp: 'Calendly',        use: 'book discovery calls',            job: 'automate call booking',        jobSlug: 'automate-call-booking',        cat: 'Scheduling',     svc: '/services/cro/',                svcLabel: 'CRO' },
  formforge:   { comp: 'Typeform',        use: 'collect leads and briefs',        job: 'capture more leads',           jobSlug: 'capture-more-leads',           cat: 'Form',           svc: '/services/cro/',                svcLabel: 'CRO' },
  sigcraft:    { comp: 'WiseStamp',       use: 'brand client-facing emails',      job: 'fix team signatures',          jobSlug: 'fix-team-signatures',          cat: 'Signature',      svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  postdock:    { comp: 'Buffer',          use: 'schedule client social posts',    job: 'schedule social content',      jobSlug: 'schedule-social-content',      cat: 'Scheduler',      svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  linkleaf:    { comp: 'Linktree',        use: 'run client link-in-bio pages',    job: 'launch a link-in-bio',         jobSlug: 'launch-a-link-in-bio',         cat: 'Link-in-Bio',    svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  scantrail:   { comp: 'QR Tiger',        use: 'track QR campaigns',              job: 'run QR campaigns',             jobSlug: 'run-qr-campaigns',             cat: 'QR Code',        svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  cardsmith:   { comp: 'Bannerbear',      use: 'generate social images',          job: 'generate OG images',           jobSlug: 'generate-og-images',           cat: 'OG Image',       svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  statfox:     { comp: 'Plausible',       use: 'report client traffic',           job: 'track site traffic',           jobSlug: 'track-site-traffic',           cat: 'Analytics',      svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  shipnotes:   { comp: 'Canny',           use: 'manage product feedback',         job: 'run a public changelog',       jobSlug: 'run-a-public-changelog',       cat: 'Changelog',      svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  hearback:    { comp: 'Hotjar',          use: 'collect on-site feedback',        job: 'collect feedback',             jobSlug: 'collect-visitor-feedback',     cat: 'Feedback',       svc: '/services/cro/',                svcLabel: 'CRO' },
  docwell:     { comp: 'GitBook',         use: 'document campaign playbooks',     job: 'publish client docs',          jobSlug: 'publish-client-docs',          cat: 'Docs',           svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  chatlet:     { comp: 'Crisp',           use: 'run live chat on client sites',   job: 'add live chat',                jobSlug: 'add-live-chat',                cat: 'Live Chat',      svc: '/services/cro/',                svcLabel: 'CRO' },
  boardly:     { comp: 'Trello',          use: 'run client campaign boards',      job: 'manage client campaigns',      jobSlug: 'manage-client-campaigns',      cat: 'Kanban',         svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  timevault:   { comp: 'Toggl',           use: 'track billable hours',            job: 'track billable hours',         jobSlug: 'track-billable-hours',         cat: 'Timesheet',      svc: '/services/cro/',                svcLabel: 'CRO' },
  streakly:    { comp: 'Habitify',        use: 'keep content habits on track',    job: 'keep a posting streak',        jobSlug: 'keep-a-posting-streak',        cat: 'Habit',          svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  deepdesk:    { comp: 'Centered',        use: 'protect deep work time',          job: 'protect focus time',           jobSlug: 'protect-focus-time',           cat: 'Focus',          svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  quillpad:    { comp: 'Notion',          use: 'draft campaign briefs fast',      job: 'organize campaign notes',      jobSlug: 'organize-campaign-notes',      cat: 'Notes',          svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  pingcron:    { comp: 'Cronitor',        use: 'watch client data jobs',          job: 'monitor cron jobs',            jobSlug: 'monitor-scheduled-jobs',       cat: 'Cron',           svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  hookscope:   { comp: 'Pipedream',       use: 'debug client webhooks',           job: 'debug webhooks',               jobSlug: 'debug-webhooks',               cat: 'Webhook',        svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  snapfleet:   { comp: 'Urlbox',          use: 'screenshot pages at scale',       job: 'capture screenshots',          jobSlug: 'capture-site-screenshots',     cat: 'Screenshot',     svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  wrangle:     { comp: 'DevUtils',        use: 'clean campaign data files',       job: 'clean up data files',          jobSlug: 'clean-up-data-files',          cat: 'Dev Data',       svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  vaultkeeper: { comp: 'SimpleBackups',   use: 'back up client databases',        job: 'back up data',                 jobSlug: 'back-up-databases',            cat: 'Backup',         svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  queuecraft:  { comp: 'LaunchList',      use: 'build pre-launch waitlists',      job: 'build a waitlist',             jobSlug: 'build-a-waitlist',             cat: 'Waitlist',       svc: '/services/ecommerce-website/',  svcLabel: 'E-commerce' },
  bravowall:   { comp: 'Senja',           use: 'turn wins into social proof',     job: 'collect testimonials',         jobSlug: 'collect-testimonials',         cat: 'Testimonial',    svc: '/services/cro/',                svcLabel: 'CRO' },
  hawkwatch:   { comp: 'Distill',         use: 'watch competitor prices',         job: 'track rival prices',           jobSlug: 'track-competitor-prices',      cat: 'Price Watch',    svc: '/services/ecommerce-website/',  svcLabel: 'E-commerce' },
  postbird:    { comp: 'Mailchimp',       use: 'send email campaigns cheaply',    job: 'send email campaigns',         jobSlug: 'send-email-campaigns',         cat: 'Email',          svc: '/services/cro/',                svcLabel: 'CRO' },
  keymaster:   { comp: 'Keygen',          use: 'license client software',         job: 'issue license keys',           jobSlug: 'issue-license-keys',           cat: 'Licensing',      svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  castport:    { comp: 'Transistor',      use: 'host client podcasts',            job: 'host a podcast feed',          jobSlug: 'host-a-podcast-feed',          cat: 'Podcast',        svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  inkpress:    { comp: 'Ghost',           use: 'publish blogs that rank',         job: 'run a marketing blog',         jobSlug: 'run-a-fast-marketing-blog',    cat: 'Blogging',       svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  feedloft:    { comp: 'Feedly',          use: 'monitor industry news',           job: 'follow industry news',         jobSlug: 'follow-industry-news',         cat: 'RSS',            svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  reelsnag:    { comp: 'Video Downloader',use: 'archive competitor ads',          job: 'save videos',                  jobSlug: 'save-videos',                  cat: 'Downloader',     svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  voicebarn:   { comp: 'ElevenLabs',      use: 'voice client videos locally',     job: 'make voiceovers',              jobSlug: 'generate-voiceovers',          cat: 'Voiceover',      svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  droplink:    { comp: 'WeTransfer',      use: 'send branded client files',       job: 'send large files',             jobSlug: 'send-large-files',             cat: 'Transfer',       svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  snipvault:   { comp: 'Cacher',          use: 'reuse proven ad copy',            job: 'build a snippet library',      jobSlug: 'build-a-snippet-library',      cat: 'Snippet',        svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  textract:    { comp: 'Adobe Acrobat',   use: 'digitize client documents',       job: 'extract text',                 jobSlug: 'extract-text',                 cat: 'OCR',            svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  inkseal:     { comp: 'DocuSign',        use: 'get contracts signed fast',       job: 'collect e-signatures',         jobSlug: 'collect-e-signatures',         cat: 'E-Sign',         svc: '/services/cro/',                svcLabel: 'CRO' },
  overlayr:    { comp: 'StreamElements',  use: 'run livestream overlays',         job: 'overlay streams',              jobSlug: 'overlay-streams',              cat: 'Overlay',        svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  signboard:   { comp: 'Yodeck',          use: 'run in-store screens',            job: 'manage digital signage',       jobSlug: 'manage-digital-signage',       cat: 'Signage',        svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  serpdeck:    { comp: 'AccuRanker',      use: 'track keyword rankings daily',    job: 'track SEO rankings',           jobSlug: 'track-seo-rankings',           cat: 'SERP',           svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  chatterbox:  { comp: 'Hyvor Talk',      use: 'moderate blog comments',          job: 'add site comments',            jobSlug: 'add-site-comments',            cat: 'Comments',       svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  ledgerly:    { comp: 'Expensify',       use: 'track campaign spend',            job: 'track expenses',               jobSlug: 'track-expenses',               cat: 'Expense',        svc: '/services/cro/',                svcLabel: 'CRO' },
  doortracker: { comp: 'Badger Maps',     use: 'verify field-team visits',        job: 'track field teams',            jobSlug: 'track-field-teams',            cat: 'GPS',            svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  famping:     { comp: 'Life360',         use: 'coordinate field teams',          job: 'share team location',          jobSlug: 'share-team-location',          cat: 'Location',       svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  memeforge:   { comp: 'Imgflip Pro',     use: 'ship memes for client brands',    job: 'make brand memes',             jobSlug: 'make-brand-memes',             cat: 'Meme',           svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  orgtree:     { comp: 'Lucidchart',      use: 'map client org structures',       job: 'build org charts',             jobSlug: 'build-org-charts',             cat: 'Org Chart',      svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  renewcheck:  { comp: 'Rocket Money',    use: 'audit client SaaS spend',         job: 'track renewals',               jobSlug: 'track-subscriptions',          cat: 'Tracker',        svc: '/services/cro/',                svcLabel: 'CRO' },
  paletteforge:{ comp: 'Coolors',         use: 'build brand palettes',            job: 'build brand palettes',         jobSlug: 'build-brand-palettes',         cat: 'Palette',        svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  iconforge:   { comp: 'Iconscout',       use: 'ship favicons and icons',         job: 'make favicon sets',            jobSlug: 'generate-favicon-sets',        cat: 'Icon',           svc: '/services/ecommerce-website/',  svcLabel: 'E-commerce' },
};

/* ---------- META for the 49 apps merged from the OTS catalog ----------
 * Auto-derivation (deriveMeta below) produced the first pass from each app's
 * competitor/oneliner/steps/features; every entry here was then hand-reviewed
 * for title length (f3: brand+comp ≤ 24, f4: job+comp ≤ 29) and search intent. */
const NEW_META = {
  deskly:      { comp: 'Zendesk',         use: 'run a client support desk',     job: 'run a help desk',              jobSlug: 'run-a-help-desk',              cat: 'Help Desk',      svc: '/services/cro/',                svcLabel: 'CRO' },
  upkeepstatus:{ comp: 'Statuspage',      use: 'run client status pages',       job: 'host a status page',           jobSlug: 'host-a-status-page',           cat: 'Status Page',    svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  maptrail:    { comp: 'Screaming Frog',  use: 'crawl client sites for SEO',    job: 'crawl a website',              jobSlug: 'crawl-a-website',              cat: 'SEO Crawler',    svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  linkguard:   { comp: 'Ahrefs',          use: 'find broken links at scale',    job: 'find broken links',            jobSlug: 'find-broken-links',            cat: 'Link Audit',     svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  docsmithapi: { comp: 'ReadMe',          use: 'ship branded API docs',         job: 'publish API docs',             jobSlug: 'publish-api-docs',             cat: 'API Docs',       svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  vaultly:     { comp: '1Password',       use: 'manage team passwords',         job: 'share team logins',            jobSlug: 'share-team-logins',            cat: 'Password',       svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  keyloop:     { comp: '1Password',       use: 'secure client 2FA codes',       job: 'manage 2FA codes',             jobSlug: 'manage-2fa-codes',             cat: '2FA',            svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  secretbox:   { comp: 'Doppler',         use: 'manage client env secrets',     job: 'manage app secrets',           jobSlug: 'manage-app-secrets',           cat: 'Secrets',        svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  certwatch:   { comp: 'SSLMate',         use: 'watch client SSL expiry',       job: 'monitor SSL expiry',           jobSlug: 'monitor-ssl-expiry',           cat: 'SSL',            svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  logbin:      { comp: 'Papertrail',      use: 'centralize client logs',        job: 'centralize logs',              jobSlug: 'centralize-logs',              cat: 'Logging',        svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  resumecraft: { comp: 'Zety',            use: 'build ATS-safe resumes',        job: 'build a resume',               jobSlug: 'build-a-resume',               cat: 'Resume',         svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  pitchcraft:  { comp: 'Proposify',       use: 'send winning proposals',        job: 'send proposals',               jobSlug: 'send-proposals',               cat: 'Proposal',       svc: '/services/cro/',                svcLabel: 'CRO' },
  contractly:  { comp: 'PandaDoc',        use: 'manage client contracts',       job: 'draft contracts',              jobSlug: 'draft-contracts',              cat: 'Contract',       svc: '/services/cro/',                svcLabel: 'CRO' },
  captionly:   { comp: 'Submagic',        use: 'caption client videos',         job: 'caption videos',               jobSlug: 'caption-videos',               cat: 'Caption',        svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  utmcraft:    { comp: 'UTM.io',          use: 'standardize campaign UTMs',     job: 'build UTM links',              jobSlug: 'build-utm-links',              cat: 'UTM',            svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  reflink:     { comp: 'Tapfiliate',      use: 'run affiliate programs',        job: 'track affiliates',             jobSlug: 'track-affiliates',             cat: 'Affiliate',      svc: '/services/ecommerce-website/',  svcLabel: 'E-commerce' },
  starstack:   { comp: 'Trustpilot',      use: 'display client reviews',        job: 'display reviews',              jobSlug: 'display-reviews',              cat: 'Reviews',        svc: '/services/cro/',                svcLabel: 'CRO' },
  clickmap:    { comp: 'Hotjar',          use: 'see what visitors click',       job: 'track visitor clicks',         jobSlug: 'track-visitor-clicks',         cat: 'Heatmap',        svc: '/services/cro/',                svcLabel: 'CRO' },
  splitpoint:  { comp: 'VWO',             use: 'run client A/B tests',          job: 'run A/B tests',                jobSlug: 'run-ab-tests',                 cat: 'A/B Testing',    svc: '/services/cro/',                svcLabel: 'CRO' },
  hirestack:   { comp: 'Greenhouse',      use: 'run a hiring pipeline',         job: 'manage hiring',                jobSlug: 'manage-hiring',                cat: 'Hiring',         svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  shiftly:     { comp: 'When I Work',     use: 'schedule shift teams',          job: 'schedule shifts',              jobSlug: 'schedule-shifts',              cat: 'Shift',          svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  rampcheck:   { comp: 'Trainual',        use: 'onboard new hires faster',      job: 'onboard new hires',            jobSlug: 'onboard-new-hires',            cat: 'Onboarding',     svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  punchcard:   { comp: 'QuickBooks Time', use: 'track employee hours',          job: 'log work hours',               jobSlug: 'log-work-hours',               cat: 'Time Clock',     svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  ledgerlitehome:{ comp: 'YNAB',          use: 'budget off the cloud',          job: 'budget offline',               jobSlug: 'budget-offline',               cat: 'Budgeting',      svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  lessonforge: { comp: 'Teachable',       use: 'sell client courses',           job: 'sell online courses',          jobSlug: 'sell-online-courses',          cat: 'Course',         svc: '/services/ecommerce-website/',  svcLabel: 'E-commerce' },
  quizcraft:   { comp: 'Typeform',        use: 'capture leads with quizzes',    job: 'build lead quizzes',           jobSlug: 'build-lead-quizzes',           cat: 'Quiz',           svc: '/services/cro/',                svcLabel: 'CRO' },
  forumly:     { comp: 'Circle',          use: 'host client communities',       job: 'host a community',             jobSlug: 'host-a-community',             cat: 'Community',      svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  roster:      { comp: 'Glue Up',         use: 'run member directories',        job: 'run a member directory',       jobSlug: 'run-a-member-directory',       cat: 'Directory',      svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  eventcraft:  { comp: 'Eventbrite',      use: 'sell event tickets',            job: 'sell event tickets',           jobSlug: 'sell-event-tickets',           cat: 'Ticketing',      svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  mockcraft:   { comp: 'Placeit',         use: 'mock up client products',       job: 'make product mockups',         jobSlug: 'make-product-mockups',         cat: 'Mockup',         svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  postcraft:   { comp: 'Canva',           use: 'batch post graphics',           job: 'batch post graphics',          jobSlug: 'batch-post-graphics',          cat: 'Graphics',       svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  slidecraft:  { comp: 'Beautiful.ai',    use: 'build client decks fast',       job: 'build pitch decks',            jobSlug: 'build-pitch-decks',            cat: 'Deck',           svc: '/services/pr-press/',           svcLabel: 'PR & Press' },
  redirectly:  { comp: 'Rebrandly',       use: 'manage redirects at scale',     job: 'manage 301 redirects',         jobSlug: 'manage-301-redirects',         cat: 'Redirect',       svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  clientdesk:  { comp: 'ChartMogul',      use: 'read client MRR metrics',       job: 'track MRR and churn',          jobSlug: 'track-mrr-and-churn',          cat: 'Metrics',        svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  pulsecheck:  { comp: 'Delighted',       use: 'measure client NPS',            job: 'run NPS surveys',              jobSlug: 'run-nps-surveys',              cat: 'Survey',         svc: '/services/cro/',                svcLabel: 'CRO' },
  billoop:     { comp: 'Chargebee',       use: 'run subscription billing',      job: 'bill subscriptions',           jobSlug: 'bill-subscriptions',           cat: 'Billing',        svc: '/services/ecommerce-website/',  svcLabel: 'E-commerce' },
  askback:     { comp: 'Podium',          use: 'earn more Google reviews',      job: 'request reviews',              jobSlug: 'request-reviews',              cat: 'Review',         svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  citewatch:   { comp: 'BrightLocal',     use: 'audit local citations',         job: 'audit citations',              jobSlug: 'audit-citations',              cat: 'Citation',       svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  syncvault:   { comp: 'Backblaze',       use: 'back up client machines',       job: 'back up files',                jobSlug: 'back-up-files',                cat: 'Backup',         svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  voicebox:    { comp: 'Canny',           use: 'collect feature requests',      job: 'collect feedback',             jobSlug: 'collect-feedback',             cat: 'Feedback',       svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  quotewell:   { comp: 'PandaDoc',        use: 'quote jobs faster',             job: 'build quotes fast',            jobSlug: 'build-quotes-fast',            cat: 'Quoting',        svc: '/services/cro/',                svcLabel: 'CRO' },
  snapreceipt: { comp: 'Expensify',       use: 'scan receipts on the go',       job: 'scan receipts',                jobSlug: 'scan-receipts',                cat: 'Receipts',       svc: '/services/cro/',                svcLabel: 'CRO' },
  listcraft:   { comp: 'IDX Sites',       use: 'list properties online',        job: 'list properties',              jobSlug: 'list-properties',              cat: 'Listings',       svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  menuly:      { comp: 'Toast',           use: 'run QR menus',                  job: 'publish QR menus',             jobSlug: 'publish-qr-menus',             cat: 'Menu',           svc: '/services/google-ads/',         svcLabel: 'Google Ads' },
  remindly:    { comp: 'SimpleTexting',   use: 'cut appointment no-shows',      job: 'send reminders',               jobSlug: 'send-reminders',               cat: 'Reminders',      svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  bloomrecorder:{ comp: 'Loom',           use: 'record screen demos',           job: 'record your screen',           jobSlug: 'record-your-screen',           cat: 'Recorder',       svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  wispertalk:  { comp: 'Wispr Flow',      use: 'dictate client copy faster',    job: 'dictate anywhere',             jobSlug: 'dictate-anywhere',             cat: 'Dictation',      svc: '/services/ai-software/',        svcLabel: 'AI Software' },
  'clip-pipeline':{ comp: 'Opus Clip',    use: 'repurpose client videos',       job: 'repurpose videos',             jobSlug: 'repurpose-videos',             cat: 'Repurposing',    svc: '/services/facebook-ads/',       svcLabel: 'Facebook Ads' },
  'viral-invoice':{ comp: 'Flat Apps',    use: 'sell with price urgency',       job: 'escalate prices',              jobSlug: 'escalate-prices',              cat: 'Sales Link',     svc: '/services/ecommerce-website/',  svcLabel: 'E-commerce' },
};

/* ---------- auto-derivation (fallback for any app missing from META/NEW_META) ----------
 * Short competitor name from `competitor` (first of "/" alternatives, qualifier
 * suffixes stripped); use case + job from oneliner/features/steps; category from
 * the tagline; service cross-link by keyword heuristics. Apps whose derivation
 * fails title validation are reported by the verifier (and hand-tuned above). */
function cleanComp(competitor) {
  return competitor.split('/')[0]
    .replace(/-(style|like)\b.*/i, '')
    .replace(/\b(Teams?|Business|Pro|Personal|Premium|Enterprise|Site Audit|QR menus|site providers|invoicing tools)\b/ig, '')
    .replace(/\s+/g, ' ').trim() || competitor;
}
function deriveSvc(p) {
  const hay = `${p.oneliner} ${p.tagline} ${p.competitor}`.toLowerCase();
  if (/video|creative|caption|screen|meme|image/.test(hay)) return ['/services/facebook-ads/', 'Facebook Ads'];
  if (/analytics|seo|serp|crawl|keyword|utm/.test(hay)) return ['/services/google-ads/', 'Google Ads'];
  if (/form|lead|landing|conversion/.test(hay)) return ['/services/cro/', 'CRO'];
  if (/ai|automation|scrape|api/.test(hay)) return ['/services/ai-software/', 'AI Software'];
  return ['/services/google-ads/', 'Google Ads'];
}
function deriveMeta(p) {
  const comp = cleanComp(p.competitor);
  const [svc, svcLabel] = deriveSvc(p);
  const job = lcFirst(p.features[0][1]);
  return {
    comp,
    use: lcFirst(p.features[0][1]),
    job,
    jobSlug: kebab(job.split(' ').slice(0, 3).join(' ')),
    cat: comp.length <= 8 ? comp : p.features[0][1].split(' ')[0],
    svc, svcLabel,
  };
}
function metaFor(p) {
  const m = META[p.slug] || NEW_META[p.slug];
  if (m) return m;
  console.warn(`WARN: no curated META for ${p.slug} — falling back to auto-derivation`);
  return deriveMeta(p);
}

/* Which formulas to emit. For staged publishing (~100 pages/week), comment
 * formulas out and re-run — see CONTENT-PLAN.md. */
const ACTIVE_FORMULAS = [1, 2, 3, 4, 5];

/* ---------- shared chrome (same as build-software.js, plus a Blog footer link) ---------- */
const AGENT = 'agent_0901khqt9q1jfazs86en39aeb0nr';
const BUNDLE_SLUG = 'onetime-suite-bundle';

const NAV = `
    <a href="#main-content" class="skip-nav">Skip to main content</a>
    <header>
        <nav class="site-nav" aria-label="Main navigation">
            <div class="container">
                <a href="/" aria-label="Advanced Marketing - Home">
                    <picture>
                        <source srcset="/logo.webp" type="image/webp">
                        <img src="/logo.png" alt="Advanced Marketing" width="120" height="36">
                    </picture>
                </a>
                <ul class="nav-links" role="menubar">
                    <li role="none"><a href="/services" role="menuitem">Services</a></li>
                    <li role="none" class="has-dropdown">
                        <a href="/software/" role="menuitem" aria-haspopup="true" aria-expanded="false">Software &#9662;</a>
                        <ul class="nav-dropdown" role="menu">
                            <li role="none"><a href="/software/#desktop" role="menuitem">Desktop Software Applications</a></li>
                            <li role="none"><a href="/software/#web-hosted" role="menuitem">Web Hosted Applications</a></li>
                            <li role="none"><a href="/software/${BUNDLE_SLUG}/" role="menuitem">Advanced Marketing 1 Time Suite</a></li>
                        </ul>
                    </li>
                    <li role="none"><a href="/blog/" role="menuitem">Blog</a></li>
                    <li role="none"><a href="/case-studies" role="menuitem">Case Studies</a></li>
                    <li role="none"><a href="/team" role="menuitem">Team</a></li>
                    <li role="none"><a href="/#coaching" role="menuitem">Coaching</a></li>
                    <li role="none"><a href="/about" role="menuitem">About</a></li>
                    <li role="none"><a href="/pay/" role="menuitem">Pay Invoice</a></li>
                    <li role="none"><a href="#contact" class="nav-cta" role="menuitem">Book a Call</a></li>
                </ul>
                <button class="mobile-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav" onclick="toggleMobileNav()">&#9776;</button>
                <div class="mobile-nav" id="mobile-nav" role="navigation" aria-label="Mobile navigation">
                    <ul>
                        <li><a href="/services">Services</a></li>
                        <li><a href="/software/">Software</a></li>
                        <li class="mobile-subnav">
                            <a href="/software/#desktop">&nbsp;&nbsp;Desktop Software Applications</a>
                        </li>
                        <li class="mobile-subnav">
                            <a href="/software/#web-hosted">&nbsp;&nbsp;Web Hosted Applications</a>
                        </li>
                        <li class="mobile-subnav">
                            <a href="/software/${BUNDLE_SLUG}/">&nbsp;&nbsp;Advanced Marketing 1 Time Suite</a>
                        </li>
                        <li><a href="/blog/">Blog</a></li>
                        <li><a href="/case-studies">Case Studies</a></li>
                        <li><a href="/team">Team</a></li>
                        <li><a href="/#coaching">Coaching</a></li>
                        <li><a href="/about">About</a></li>
                        <li><a href="/pay/">Pay Invoice</a></li>
                        <li><a href="#contact" class="nav-cta" style="display:inline-block;margin-top:0.5rem;">Book a Call</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>`;

const FOOTER = `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <picture>
                        <source srcset="/logo.webp" type="image/webp">
                        <img src="/logo.png" alt="Advanced Marketing" width="120" height="36">
                    </picture>
                    <p>Full-service marketing agency headquartered in Hong Kong. We help ambitious brands grow through strategic digital marketing, advertising, and business development worldwide.</p>
                    <address style="font-style:normal;font-size:0.8rem;color:var(--text-muted);margin-top:0.75rem;">Advanced Marketing Limited<br>Hong Kong, SAR China</address>
                </div>
                <div class="footer-col">
                    <h4>Services</h4>
                    <a href="/services/facebook-ads">Facebook Ads</a>
                    <a href="/services/google-ads">Google AdWords</a>
                    <a href="/services/pr-press">PR &amp; Press</a>
                    <a href="/services/ecommerce-website">E-commerce</a>
                    <a href="/services/ai-software">AI Software</a>
                    <a href="/services/cro">CRO</a>
                </div>
                <div class="footer-col">
                    <h4>Software</h4>
                    <a href="/software/">Pay-Once Suite</a>
                    <a href="/software/comparison/">Alternatives Blog</a>
                    <a href="/blog/">Marketing Blog</a>
                    <a href="${WHOP}" rel="noopener">Get it on Whop</a>
                </div>
                <div class="footer-col">
                    <h4>Company</h4>
                    <a href="/about">About Us</a>
                    <a href="/team">Team</a>
                    <a href="/portfolio">Portfolio</a>
                    <a href="#contact">Contact</a>
                    <a href="/pay/">Pay Invoice</a>
                </div>
                <div class="footer-col">
                    <h4>Contact</h4>
                    <a href="mailto:ben@advancedmarketing.co">ben@advancedmarketing.co</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Advanced Marketing Limited. All rights reserved.</p>
                <nav aria-label="Legal">
                    <a href="/privacy-policy">Privacy Policy</a>
                    <a href="/terms-of-service">Terms of Service</a>
                </nav>
            </div>
        </div>
    </footer>

    <button class="floating-call-btn" onclick="openVoiceChat('${AGENT}', 'Talk to Our AI Assistant', 'Ask about our services, pricing, or book a strategy call')" aria-label="Talk to AI Assistant">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
    </button>

    <div class="voice-modal-overlay" id="voiceModal" role="dialog" aria-modal="true" aria-label="Voice chat">
        <div class="voice-modal">
            <button class="voice-modal-close" onclick="closeVoiceChat()" aria-label="Close voice chat">&times;</button>
            <h3 id="voiceModalTitle">AI Voice Demo</h3>
            <p id="voiceModalSubtitle">Click the microphone to start talking</p>
            <div id="voiceWidgetContainer"></div>
        </div>
    </div>

    <script>
    function toggleMobileNav() {
        var nav = document.getElementById('mobile-nav');
        var btn = document.querySelector('.mobile-toggle');
        var isActive = nav.classList.toggle('active');
        btn.setAttribute('aria-expanded', isActive);
        btn.innerHTML = isActive ? '&times;' : '&#9776;';
    }
    function openVoiceChat(agentId, title, subtitle) {
        document.getElementById('voiceModalTitle').textContent = title;
        document.getElementById('voiceModalSubtitle').textContent = subtitle;
        var container = document.getElementById('voiceWidgetContainer');
        container.innerHTML = '';
        var widget = document.createElement('elevenlabs-convai');
        widget.setAttribute('agent-id', agentId);
        container.appendChild(widget);
        document.getElementById('voiceModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeVoiceChat() {
        document.getElementById('voiceModal').classList.remove('active');
        document.getElementById('voiceWidgetContainer').innerHTML = '';
        document.body.style.overflow = '';
    }
    document.getElementById('voiceModal').addEventListener('click', function(e) {
        if (e.target === this) closeVoiceChat();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeVoiceChat();
    });
    </script>
    <script src="https://elevenlabs.io/convai-widget/index.js" async></script>`;

/* Same section styles as build-software.js (post-body, compare tables, CTA cards)
   plus the dropdown/nav helpers the shared NAV depends on. */
const BLOG_CSS = `
        /* ===== /blog section (reuses the /software section styles) ===== */
        .price-badge { display:inline-flex; align-items:center; gap:0.5rem; background:rgba(201,169,98,0.12); border:1px solid rgba(201,169,98,0.35); color:var(--gold); border-radius:999px; padding:0.45rem 1.1rem; font-size:0.85rem; font-weight:600; letter-spacing:0.02em; }
        .price-badge .amt { font-size:1.05rem; }
        .compare-wrap { overflow-x:auto; }
        table.compare { width:100%; border-collapse:collapse; font-size:0.92rem; min-width:560px; }
        table.compare th, table.compare td { padding:0.85rem 1rem; text-align:left; border-bottom:1px solid var(--border); vertical-align:top; }
        table.compare thead th { font-family:var(--font-body); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); }
        table.compare thead th.us { color:var(--gold); }
        table.compare td.us { color:var(--gold); font-weight:600; }
        table.compare td:first-child { color:var(--text-muted); }
        .post-body { max-width:760px; margin:0 auto; }
        .post-body h2 { font-size:clamp(1.6rem,3vw,2.1rem); margin:2.75rem 0 1rem; }
        .post-body h3 { font-size:1.15rem; margin:1.5rem 0 0.75rem; }
        .post-body p { color:var(--text-muted); line-height:1.75; margin-bottom:1.25rem; font-size:1.02rem; }
        .post-body ul, .post-body ol { margin:0 0 1.25rem 1.25rem; display:grid; gap:0.6rem; }
        .post-body ul li, .post-body ol li { color:var(--text-muted); line-height:1.65; }
        .post-body a { color:var(--gold); }
        .post-meta { font-size:0.8rem; color:var(--text-muted); margin-bottom:2rem; }
        .post-cta { background:var(--bg-card); border:1px solid rgba(201,169,98,0.3); border-radius:var(--radius-lg); padding:2rem; margin:2.5rem 0; text-align:center; }
        .post-cta h3 { font-size:1.3rem; margin-bottom:0.5rem; }
        .post-cta p { margin-bottom:1.25rem; }
        .post-cta .svc-note { font-size:0.85rem; margin-top:1rem; margin-bottom:0; }
        .post-list { display:grid; gap:1rem; }
        .post-list a.post-item { display:block; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem 1.5rem; text-decoration:none; color:inherit; transition:all 0.3s; }
        .post-list a.post-item:hover { border-color:rgba(201,169,98,0.35); background:var(--bg-card-hover); }
        .post-list a.post-item h3 { font-size:1.05rem; font-family:var(--font-body); font-weight:600; margin-bottom:0.25rem; }
        .post-list a.post-item p { color:var(--text-muted); font-size:0.85rem; }
        .related-links { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:1rem; }
        .related-links a { font-size:0.78rem; padding:0.45rem 0.9rem; background:rgba(201,169,98,0.1); color:var(--gold); border-radius:4px; text-decoration:none; }
        .intent-group { margin-bottom:3rem; }
        .intent-group h2 { font-size:1.6rem; margin-bottom:0.4rem; }
        .intent-group .intent-blurb { color:var(--text-muted); font-size:0.92rem; margin-bottom:1.25rem; max-width:640px; }
        /* ===== nav dropdown: Software > Desktop / Web Hosted / Bundle ===== */
        .has-dropdown { position:relative; }
        .nav-dropdown { list-style:none; margin:0; padding:0.5rem; position:absolute; top:calc(100% + 0.75rem); left:50%; transform:translateX(-50%); min-width:260px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); box-shadow:0 20px 40px -15px rgba(0,0,0,0.6); opacity:0; visibility:hidden; transition:opacity 0.2s ease, transform 0.2s ease; z-index:50; }
        .has-dropdown:hover .nav-dropdown, .has-dropdown:focus-within .nav-dropdown { opacity:1; visibility:visible; transform:translateX(-50%) translateY(0); }
        .nav-dropdown li { display:block; }
        .nav-dropdown a { display:block; padding:0.65rem 0.9rem; border-radius:6px; font-size:0.88rem; white-space:nowrap; color:var(--text); text-decoration:none; }
        .nav-dropdown a:hover { background:rgba(201,169,98,0.1); color:var(--gold); }
        .mobile-subnav a { font-size:0.85rem; opacity:0.85; }`;

function esc(s) { return String(s).replace(/&(?![a-z#0-9]+;)/g, '&amp;'); }
const art = name => (/^[aeiou]/i.test(name) ? 'an' : 'a');
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const lcFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
/* lowercase-first for mid-sentence use, but leave leading acronyms alone (HTTP, JPG, OCR) */
const lcSmart = s => (/^[A-Z]{2}/.test(s) ? s : lcFirst(s));
/* Title Case that respects acronyms (PDFs, QR, SEO, OG) and small words. */
const TITLE_SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'vs', 'up']);
function tcase(s) {
  return s.split(' ').map((w, i) => w.split('-').map(seg => {
    if (/[A-Z]/.test(seg)) return seg;
    if (i > 0 && TITLE_SMALL.has(seg)) return seg;
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  }).join('-')).join(' ');
}

/* /blog pages are unique to this domain — self-canonical (no onetimesuite.com deferral). */
function page({ title, desc, canonical, ogType = 'website', jsonld = [], body }) {
  const ld = jsonld.map(o => `    <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc).replace(/"/g, '&quot;')}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="manifest" href="/manifest.json">
    <meta property="og:type" content="${ogType}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc).replace(/"/g, '&quot;')}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE}/logo.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/site.css">
    <style>${BLOG_CSS}
    </style>
${ld}
</head>
<body>
${NAV}
    <main id="main-content" role="main">
${body}
    </main>
${FOOTER}
</body>
</html>
`;
}

function write(rel, html) {
  const dir = path.join(ROOT, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

/* ---------- shared article building blocks ---------- */

/* Pricing math: one-time vs the competitor's meter, from real product data. */
function pricingTable(p, m) {
  return `
                    <div class="compare-wrap">
                    <table class="compare">
                        <thead><tr><th></th><th class="us">${p.brand}</th><th>${m.comp}</th></tr></thead>
                        <tbody>
                            <tr><td>Price</td><td class="us">$${p.price} once</td><td>${esc(p.compPrice)}</td></tr>
                            <tr><td>Cost in year one</td><td class="us">$${p.price}</td><td>~$${p.compYr}</td></tr>
                            <tr><td>Cost over 3 years</td><td class="us">$${p.price}</td><td>~$${p.compYr * 3}</td></tr>
                            <tr><td>Renewal</td><td class="us">Never — you own it</td><td>Monthly/annual, forever</td></tr>
                        </tbody>
                    </table>
                    </div>`;
}

/* Head-to-head table straight from the product's real compRows data. */
function compTable(p, m) {
  return `
                    <div class="compare-wrap">
                    <table class="compare">
                        <thead><tr><th></th><th class="us">${p.brand}</th><th>${m.comp}</th></tr></thead>
                        <tbody>
                            ${p.compRows.map(r => `<tr><td>${r[0]}</td><td class="us">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('\n                            ')}
                        </tbody>
                    </table>
                    </div>`;
}

function featuresList(p) {
  return `<ul>
                        ${p.features.map(f => `<li><strong style="color:var(--text);">${esc(f[1])}</strong> — ${esc(f[2])}</li>`).join('\n                        ')}
                    </ul>`;
}

/* "How agencies put it to work" — each bullet ties a real feature to an agency context. */
const AGENCY_LABELS = ['Client work', 'Campaign production', 'Reporting &amp; handoff', 'Retainer margins', 'Volume days', 'New-business prep', 'Account hygiene', 'Team workflow'];
const AGENCY_ANGLES = [
  'and there is no per-seat cost when the whole team piles in',
  'which means one less shared login and one less quota to babysit',
  'so the tenth revision costs the same as the first — nothing',
  'and every deliverable stays under your agency&rsquo;s brand, not a vendor&rsquo;s',
  'which keeps client data on hardware you control instead of a third-party cloud',
  'so junior staff can run it without buying another seat',
  'and there is no meter running in the background while you work',
  'which is margin you keep instead of handing to a SaaS vendor',
];
function agencyBullets(p) {
  return `<ul>
                        ${p.features.slice(0, 5).map((f, i) => {
    const d = f[2].replace(/\.$/, '');
    const lead = /^[A-Z]{2}/.test(d) ? d : lcFirst(d);
    return `<li><strong style="color:var(--text);">${AGENCY_LABELS[i]}:</strong> ${esc(f[1])} — ${esc(lead)}, ${AGENCY_ANGLES[(i + p.slug.length) % AGENCY_ANGLES.length]}.</li>`;
  }).join('\n                        ')}
                    </ul>`;
}

function stepsList(p) {
  return `<ol>
                        ${p.steps.map(s => `<li><strong style="color:var(--text);">${esc(s[0])}.</strong> ${esc(s[1])}</li>`).join('\n                        ')}
                    </ol>`;
}

function faqSection(p) {
  return `<h2>Common questions</h2>
                    ${p.faq.slice(0, 3).map(q => `<p><strong style="color:var(--text);">${esc(q[0])}</strong><br>${esc(q[1])}</p>`).join('\n                    ')}`;
}

/* CTA: the onetimesuite.com backlink + the local /software shelf + a soft services link.
 * Coming-soon apps: "in release prep" note, shelf link only, no buy link.
 * Apps without a local landing page (the OTS-catalog merge): shelf link goes to /software/. */
function ctaBlock(p, m) {
  const hasPage = SHELF(p);
  const shelfHref = hasPage ? `/software/${p.slug}/` : '/software/';
  const shelfAnchor = hasPage ? 'See it on our software shelf' : 'Browse the software shelf';
  const svcNote = `<p class="svc-note">Rather hand this to a team that does it daily? Our <a href="${m.svc}">${m.svcLabel}</a> service covers it end to end.</p>`;
  if (isSoon(p)) {
    return `<div class="post-cta">
                        <h3>${p.brand} is in release prep</h3>
                        <p>It is being packaged for launch on OneTimeSuite right now. ${hasPage ? 'The full spec is already on our software shelf.' : 'It will land on OneTimeSuite alongside the rest of the pay-once catalog.'}</p>
                        <a href="${shelfHref}" class="btn btn-primary">${shelfAnchor} &rarr;</a>
                        ${svcNote}
                    </div>`;
  }
  return `<div class="post-cta">
                        <h3>${p.brand} — $${p.price}, one time</h3>
                        <p>Pay once, own it forever. No seats, no renewal, no meter.</p>
                        <a href="${OTS}/${p.slug}/" class="btn btn-primary" rel="noopener">Get ${p.brand} on OneTimeSuite &nearr;</a>
                        <a href="${shelfHref}" class="btn btn-outline" style="margin-left:0.75rem;">${shelfAnchor} &rarr;</a>
                        ${svcNote}
                    </div>`;
}

/* Cross-links to the other articles about the same app (internal linking). */
function relatedBlock(p, mine, currentDir) {
  const others = mine.filter(a => a.dir !== currentDir);
  return `<p style="font-size:0.9rem;">More on ${p.brand}: ${others.map(a => `<a href="/blog/${a.dir}/">${esc(a.shortLabel)}</a>`).join(' · ')} — or browse <a href="/blog/">the blog</a> and <a href="/software/">the software shelf</a>.</p>`;
}
/* category noun in mid-sentence case: keep acronyms (PDF, QR, SERP, E-Sign), lowercase plain words */
const catLc = c => c.split(' ').map(w => ((w.match(/[A-Z]/g) || []).length > 1 ? w : w.toLowerCase())).join(' ');

/* ---------- the 5 article formulas ---------- */

function formula1(p, m) {
  const dir = `${p.slug}-${kebab(m.comp)}-alternative-for-agencies`;
  const title = `${m.comp} Alternative for Marketing Teams: ${p.brand}`;
  const desc = `${p.competitor} costs ~$${p.compYr}/yr. ${p.brand} is a $${p.price} one-time ${catLc(m.cat)} alternative for agencies — features, 3-year math, and who should stay on ${m.comp}.`;
  const soon = isSoon(p);
  /* A few incumbents (DevUtils, TinyPNG Pro) are cheap or one-time-ish themselves —
     leading with "it bills you every month" would be wrong there. */
  const cheapComp = p.compYr < 60;
  const painPara = cheapComp
    ? `Credit where it's due: ${p.competitor} is not the worst offender in this catalog — ${esc(p.compPrice)} is gentler than most incumbents. But even a modest recurring or per-use cost compounds across an agency: roughly $${p.compYr} a year, about $${p.compYr * 3} over three years, for a tool you never get to keep — and in ${p.competitor}'s case there are platform limits on top of the price.`
    : `Every month, ${p.competitor} bills your card again — ${esc(p.compPrice)}, roughly $${p.compYr} a year, for as long as you need the tool. For a marketing agency that line item multiplies fast: across seats, across client accounts, across years. Run it for three years and you have spent about $${p.compYr * 3} on software you never get to keep.`;
  const body = `
                    <p class="post-meta">By Advanced Marketing · ${PUBLISHED} · Filed under <a href="/blog/#alternatives">${m.comp} alternatives</a></p>

                    <p>${painPara}</p>
                    <p>${p.brand} takes the other side of that trade. ${esc(p.tagline)} It is a one-time $${p.price} purchase — ${category(p) === 'desktop app' ? 'a desktop app that runs entirely on your machine' : 'a self-hosted web app that runs on your own server'} — and the jobs it does are everyday agency jobs: ${esc(lcSmart(p.oneliner))}</p>

                    <h2>What ${p.competitor} actually costs a marketing team</h2>
                    <p>The sticker price is only the start. ${esc(p.heroLead)}</p>
                    ${pricingTable(p, m)}
                    <p>${esc(p.payback)} For an agency billing retainers, that difference is pure margin — money that currently leaves the business every month simply so your team can keep doing work it already knows how to do.</p>

                    <h2>Meet ${p.brand}</h2>
                    <p>${p.brand} is part of the OneTimeSuite catalog of pay-once software. ${esc(p.oneliner)} The feature set is built around the jobs marketing teams actually do every week:</p>
                    ${featuresList(p)}

                    <h2>How agencies put it to work</h2>
                    ${agencyBullets(p)}

                    <h2>Where ${p.competitor} is still the better call</h2>
                    <p>An honest alternative page has to say this part out loud. ${p.competitor} is the incumbent for a reason: it is polished, your clients may already know it, and if your whole workflow is wired into its cloud ecosystem, switching costs are real. Teams that need ${p.competitor}'s specific hosted integrations, or that genuinely cannot run ${category(p) === 'desktop app' ? 'a desktop app' : 'anything on their own server'}, should probably stay put.</p>
                    <p>But if the bill is what bothers you — the renewal, the seats, the meter — ${p.brand} does the same core job for $${p.price}, once. ${soon ? 'It is currently in release prep; watch the software shelf for launch.' : (SHELF(p) ? `You can <a href="${OTS}/${p.slug}/">get ${p.brand} on OneTimeSuite</a> or <a href="/software/${p.slug}/">see it on our software shelf</a> first.` : `You can <a href="${OTS}/${p.slug}/">get ${p.brand} on OneTimeSuite</a>, or <a href="/software/">browse the software shelf</a> for the rest of the pay-once catalog.`)}</p>

                    ${faqSection(p)}

                    ${ctaBlock(p, m)}`;
  return { dir, title, desc, body, shortLabel: `${m.comp} alternative` };
}

function formula2(p, m) {
  const dir = `how-agencies-use-${p.slug}`;
  const title = `How Agencies Use ${p.brand} to ${tcase(m.use)}`;
  const desc = `How agencies ${m.use} with ${p.brand} — a $${p.price} one-time ${catLc(m.cat)} tool that replaces ${p.competitor} (${p.compPrice}). Steps, features and real client-work angles.`;
  const body = `
                    <p class="post-meta">By Advanced Marketing · ${PUBLISHED} · Filed under <a href="/blog/#use-cases">agency use cases</a></p>

                    <p>Ask an account manager what actually eats the week and the answer is rarely strategy — it is production. ${esc(p.oneliner)} That single job, repeated across every client account, is where agency hours go to die. It is also where a monthly tool like ${p.competitor} quietly becomes a permanent line item at ${esc(p.compPrice)}.</p>
                    <p>This is the workflow agencies run with ${p.brand} to ${m.use} — a $${p.price}, pay-once ${category(p)} that does the job on hardware you control, with no subscription attached.</p>

                    <h2>The ${p.brand} workflow, step by step</h2>
                    <p>The whole point is that there is no ceremony. Three steps and the job is done:</p>
                    ${stepsList(p)}

                    <h2>The features that matter in client work</h2>
                    <p>${esc(p.heroLead)}</p>
                    ${featuresList(p)}

                    <h2>How agencies put it to work</h2>
                    ${agencyBullets(p)}

                    <h2>What it costs vs ${p.competitor}</h2>
                    <p>${p.competitor} runs about $${p.compYr} a year — $${p.compYr * 3} over three years, per the current pricing. ${p.brand} is $${p.price}, once. ${esc(p.payback)}</p>
                    <p>If you want the full side-by-side, we published <a href="/blog/${p.slug}-${kebab(m.comp)}-honest-comparison/">an honest ${p.brand} vs ${m.comp} comparison</a> with the complete feature table. And if ${m.use} is something you would rather outsource entirely, our <a href="${m.svc}">${m.svcLabel}</a> team does this for clients every day.</p>

                    ${faqSection(p)}

                    ${ctaBlock(p, m)}`;
  return { dir, title, desc, body, shortLabel: `agency use case` };
}

function formula3(p, m) {
  const dir = `${p.slug}-vs-${kebab(m.comp)}-honest-comparison`;
  const title = `${p.brand} vs ${m.comp}: Honest Comparison for Agencies`;
  const desc = `${p.brand} vs ${p.competitor}: feature-by-feature table, 3-year cost math ($${p.price} once vs ~$${p.compYr * 3}), and a straight answer on which one an agency should pick.`;
  const wins = p.compRows.filter(r => /yes|once|your|unlimited|none|offline|mit/i.test(r[1])).slice(0, 3);
  const cheapComp = p.compYr < 60;
  const philosophyPara = cheapComp
    ? `${p.brand} vs ${p.competitor} is not really a feature fight — it is an ownership fight. ${p.competitor} keeps its pricing modest (${esc(p.compPrice)}), but you are still paying for a tool you never own, with platform limits attached. ${p.brand} sells you the tool for $${p.price}, once, and it keeps working forever. Both are legitimate offers; which one wins depends on how your agency actually works.`
    : `${p.brand} vs ${p.competitor} is not really a feature fight — it is a pricing-philosophy fight. ${p.competitor} rents you the tool at ${esc(p.compPrice)} and stops working when you stop paying. ${p.brand} sells you the tool for $${p.price}, once, and keeps working forever. Both are legitimate models; which one wins depends on how your agency actually works.`;
  const body = `
                    <p class="post-meta">By Advanced Marketing · ${PUBLISHED} · Filed under <a href="/blog/#comparisons">honest comparisons</a></p>

                    <p>${philosophyPara}</p>
                    <p>So here is the honest version: a side-by-side table from the real specs, the three-year math, and a straight answer on who should stay on ${p.competitor}. We sell ${p.brand}, so read our verdict with that in mind — but the numbers below are checkable.</p>

                    <h2>${p.brand} vs ${p.competitor}, side by side</h2>
                    ${compTable(p, m)}

                    <h2>Where ${p.brand} wins</h2>
                    <p>${esc(p.heroLead)}</p>
                    <ul>
                        ${wins.map(r => `<li><strong style="color:var(--text);">${r[0]}:</strong> ${esc(r[1])} — vs ${esc(lcSmart(r[2]))} for ${p.competitor}.</li>`).join('\n                        ')}
                    </ul>
                    <p>${esc(p.payback)}</p>

                    <h2>Where ${p.competitor} wins</h2>
                    <p>${p.competitor} has the incumbent's advantages: brand recognition with clients, a hosted cloud you never have to think about, and an ecosystem of integrations built over years. If your team needs zero maintenance, lives inside ${p.competitor}'s collaboration features, or bills the subscription through to clients anyway, ${p.competitor} is a defensible choice. ${p.brand} is ${category(p)} — you control the hardware, which also means updates and backups are yours to manage.</p>

                    <h2>The three-year math</h2>
                    ${pricingTable(p, m)}
                    <p>Across a whole agency stack, decisions like this compound. Swap five rented tools for pay-once equivalents and the savings fund a junior hire.</p>

                    <h2>The verdict</h2>
                    <p>For agencies that want to ${m.use} without a permanent subscription line, ${p.brand} is the better buy: same core job, $${p.price} once, data on your own hardware. For teams deep in ${p.competitor}'s ecosystem, stay — and revisit when the renewal stings enough.</p>

                    ${faqSection(p)}

                    ${ctaBlock(p, m)}`;
  return { dir, title, desc, body, shortLabel: `vs ${m.comp}` };
}

function formula4(p, m) {
  const dir = `${m.jobSlug}-without-${kebab(m.comp)}`;
  const title = `How to ${tcase(m.job)} Without ${art(m.comp)} ${m.comp} Subscription`;
  const desc = `Skip the ${p.competitor} subscription (${p.compPrice}). Here's how to ${m.job} with ${p.brand} — a $${p.price} one-time tool — step by step, with the real cost math.`;
  const cheapComp = p.compYr < 60;
  const tollPara = cheapComp
    ? `You do not need ${art(m.comp)} ${m.comp} subscription — or any recurring tool spend at all — to ${m.job}. To be fair, ${p.competitor} is one of the cheaper incumbents at ${esc(p.compPrice)}. But cheap-and-rented (or cheap-and-locked-to-one-platform) still loses to owned: the job is the job, and the tool doing it can be yours outright.`
    : `You do not need ${art(m.comp)} ${m.comp} subscription to ${m.job}. ${p.competitor} would like you to believe the job and the subscription are the same thing — that is how ${esc(p.compPrice)} becomes a permanent fixture of your budget. It is not. The job is the job; the subscription is just the toll booth someone parked in front of it.`;
  const body = `
                    <p class="post-meta">By Advanced Marketing · ${PUBLISHED} · Filed under <a href="/blog/#without">do it without the subscription</a></p>

                    <p>${tollPara}</p>
                    <p>Here is how to ${m.job} with ${p.brand} instead — a one-time $${p.price} ${category(p)} that does the work on hardware you control. ${esc(p.tagline)}</p>

                    <h2>Step by step: ${tcase(m.job)}</h2>
                    ${stepsList(p)}

                    <h2>The toolkit</h2>
                    <p>${esc(p.heroLead)}</p>
                    ${featuresList(p)}

                    <h2>What the subscription would have cost you</h2>
                    <p>The budget case is not subtle. ${p.competitor} at ${esc(p.compPrice)} adds up to roughly $${p.compYr} per year, every year. ${p.brand} stops charging after the first $${p.price}.</p>
                    ${pricingTable(p, m)}
                    <p>${esc(p.payback)}</p>

                    <h2>How agencies put it to work</h2>
                    ${agencyBullets(p)}
                    <p>And if ${m.job} is a job you would rather not do in-house at all, our <a href="${m.svc}">${m.svcLabel}</a> service does it for clients as part of a retainer.</p>

                    ${faqSection(p)}

                    ${ctaBlock(p, m)}`;
  return { dir, title, desc, body, shortLabel: `without ${m.comp}` };
}

function formula5(p, m) {
  const dir = `${p.slug}-review-pay-once-${kebab(m.cat)}`;
  let title = `${p.brand} Review: the Pay-Once ${m.cat} Tool for Marketers`;
  if (title.length > 60) title = `${p.brand} Review: the Pay-Once ${m.cat} Tool`;
  const desc = `${p.brand} review: a $${p.price} pay-once ${catLc(m.cat)} tool vs ${p.competitor} at ${p.compPrice}. What it does well, where it falls short, and who should stay on the subscription.`;
  const body = `
                    <p class="post-meta">By Advanced Marketing · ${PUBLISHED} · Filed under <a href="/blog/#reviews">pay-once tool reviews</a></p>

                    <p>${p.brand} is a $${p.price}, pay-once ${catLc(m.cat)} tool that positions itself against ${p.competitor} (${esc(p.compPrice)}). The short version, after running it through real client work: for most marketing teams it pays for itself almost immediately. ${esc(p.payback)}</p>
                    <p>But "replaces ${p.competitor}" deserves an honest look rather than a cheer. Full disclosure up front: we distribute ${p.brand} through OneTimeSuite, so factor that in. Here is what it does well, where it falls short, and who should keep paying ${p.competitor}.</p>

                    <h2>What you get for $${p.price}</h2>
                    <p>${esc(p.tagline)} ${esc(p.oneliner)}</p>
                    ${featuresList(p)}

                    <h2>The math vs ${p.competitor}</h2>
                    ${pricingTable(p, m)}
                    <p>One honest caveat on the math: ${p.competitor}'s fee buys hosting, maintenance and support you never think about. ${p.brand} is ${category(p)} — the convenience trade is real, and for some teams it is worth the subscription.</p>

                    <h2>How agencies put it to work</h2>
                    ${agencyBullets(p)}

                    <h2>The verdict</h2>
                    <h3>Who ${p.brand} is for</h3>
                    <p>Agencies and marketers who ${m.use} regularly and are tired of renting the capability. If the tool's job shows up in your week more than once or twice — client deliverables, campaign assets, reporting — the $${p.price} one-time price is a rounding error against $${p.compYr} a year for ${p.competitor}. It is also the right pick if client data privacy matters to you: everything stays on your own hardware.</p>
                    <h3>Who should stay on ${p.competitor}</h3>
                    <p>Teams whose workflow is genuinely built on ${p.competitor}'s cloud — shared workspaces, its specific integrations, clients who log in there directly. If switching would cost you more in retraining and process change than $${p.compYr} a year, stay put. And if you only ${m.job} once a quarter, a free tier somewhere may be all you need; buy ${p.brand} when the job becomes routine.</p>
                    <p>Score it plainly: capability for the core job, 9/10. Convenience versus a hosted incumbent, 7/10. Value for money, 10/10 — $${p.price} once against ${esc(p.compPrice)} is not close.</p>

                    ${faqSection(p)}

                    ${ctaBlock(p, m)}`;
  return { dir, title, desc, body, shortLabel: `review` };
}

const FORMULAS = {
  1: formula1,
  2: formula2,
  3: formula3,
  4: formula4,
  5: formula5,
};

/* ---------- generate all articles ---------- */
const articles = [];
products.forEach(p => {
  const m = metaFor(p);
  ACTIVE_FORMULAS.forEach(n => {
    const a = FORMULAS[n](p, m);
    a.product = p;
    a.meta = m;
    a.formula = n;
    a.url = `${SITE}/blog/${a.dir}/`;
    articles.push(a);
  });
});

/* group by product for cross-linking */
const byProduct = new Map();
articles.forEach(a => {
  if (!byProduct.has(a.product.slug)) byProduct.set(a.product.slug, []);
  byProduct.get(a.product.slug).push(a);
});

function articleJsonld(a) {
  const p = a.product;
  return [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: a.title,
      description: a.desc,
      author: { '@type': 'Organization', name: 'Advanced Marketing', url: SITE },
      publisher: { '@type': 'Organization', name: 'Advanced Marketing', logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
      mainEntityOfPage: a.url,
      datePublished: PUBLISHED, dateModified: PUBLISHED,
      about: { '@type': 'Product', name: p.brand, offers: { '@type': 'Offer', price: String(p.price), priceCurrency: 'USD' } },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog/` },
        { '@type': 'ListItem', position: 3, name: a.title, item: a.url },
      ],
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: p.faq.slice(0, 3).map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })),
    },
  ];
}

articles.forEach(a => {
  const p = a.product;
  const body = `
        <section class="page-hero" aria-label="Article">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <a href="/blog/">Blog</a> &nbsp;/&nbsp; <span>${p.icon} ${p.brand}</span></nav>
                <span class="text-label">${p.icon} ${p.brand} · replaces ${p.competitor}</span>
                <h1 style="font-size:clamp(2rem,4.5vw,3.1rem);">${esc(a.title)}</h1>
            </div>
        </section>

        <section class="section" aria-label="Article body">
            <div class="container">
                <article class="post-body">
                    ${a.body}

                    ${relatedBlock(p, byProduct.get(p.slug), a.dir)}
                </article>
            </div>
        </section>`;

  write(`blog/${a.dir}`, page({
    title: a.title,
    desc: a.desc,
    canonical: a.url,
    ogType: 'article',
    jsonld: articleJsonld(a),
    body,
  }));
});

/* ---------- /blog/ index, grouped by intent ---------- */
(function index() {
  const GROUPS = [
    { n: 1, id: 'alternatives', h: 'Competitor Alternatives for Agencies', blurb: 'Pay-once replacements for the SaaS tools your marketing team rents every month — SmallPDF, Otter.ai, Loom, Buffer, Mailchimp and more.' },
    { n: 2, id: 'use-cases', h: 'How Agencies Use Pay-Once Tools', blurb: 'Real agency workflows: client deliverables, campaign production, reporting and account ops — run on software you own.' },
    { n: 3, id: 'comparisons', h: 'Honest Comparisons: Pay-Once vs Subscription', blurb: 'Feature-by-feature tables and three-year cost math, with a straight answer on who should stay on the subscription.' },
    { n: 4, id: 'without', h: 'Do the Job Without the Subscription', blurb: 'Step-by-step guides to common marketing jobs — without the monthly toll booth.' },
    { n: 5, id: 'reviews', h: 'Pay-Once Tool Reviews for Marketers', blurb: 'Balanced reviews: what each tool does well, where it falls short, and who should stay on the competitor.' },
  ];

  const groups = GROUPS.map(g => {
    const list = articles.filter(a => a.formula === g.n);
    if (!list.length) return '';
    return `
                <div class="intent-group" id="${g.id}">
                    <h2>${g.h}</h2>
                    <p class="intent-blurb">${g.blurb}</p>
                    <div class="post-list">
                        ${list.map(a => `<a class="post-item" href="/blog/${a.dir}/"><h3>${esc(a.title)}</h3><p>${a.product.icon} ${a.product.brand} — replaces ${a.product.competitor} (${esc(a.product.compPrice)}) for $${a.product.price} once</p></a>`).join('\n                        ')}
                    </div>
                </div>`;
  }).join('');

  const body = `
        <section class="page-hero" aria-label="Blog">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <span>Blog</span></nav>
                <span class="text-label">The Agency Blog</span>
                <h1>Marketing use cases &amp; <span class="text-gradient">honest alternatives</span></h1>
                <p class="lead">${articles.length} articles across ${byProduct.size} pay-once tools: how agencies actually use them, what they replace, and the three-year math against the subscription incumbents. If the competitor is the right call, we say so.</p>
            </div>
        </section>

        <section class="section" aria-label="All articles">
            <div class="container">${groups}
            </div>
        </section>

        <section class="section cta-section" id="contact" aria-label="Get the suite">
            <div class="container">
                <h2>Pay Once. Own It Forever.</h2>
                <p>The whole OneTimeSuite catalog — one-time prices, your hardware, your data. Or let our team run your marketing for you.</p>
                <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                    <a href="${OTS}" class="btn btn-primary" rel="noopener">Browse OneTimeSuite &nearr;</a>
                    <a href="/services" class="btn btn-outline">See our services &rarr;</a>
                </div>
            </div>
        </section>`;

  write('blog', page({
    title: `Agency Blog — Marketing Use Cases & Pay-Once Alternatives | Advanced Marketing`,
    desc: `${articles.length} articles on running an agency with pay-once software: competitor alternatives, honest comparisons, DIY-without-the-subscription guides and balanced reviews across the OneTimeSuite catalog.`,
    canonical: `${SITE}/blog/`,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: 'Advanced Marketing Blog',
      url: `${SITE}/blog/`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: articles.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: a.url, name: a.title })),
      },
    }],
    body,
  }));
})();

/* ---------- sitemap.xml: keep every existing URL, append /blog/ URLs ---------- */
(function sitemap() {
  const file = path.join(ROOT, 'sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  // idempotent: drop any previously-generated /blog/ entries first
  xml = xml.replace(/\s*<url>\s*<loc>https:\/\/advancedmarketing\.co\/blog\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
  const entry = (loc, priority) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${PUBLISHED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  const blogXml = entry(`${SITE}/blog/`, '0.7') + articles.map(a => entry(a.url, '0.6')).join('');
  xml = xml.replace('</urlset>', `${blogXml}</urlset>`);
  fs.writeFileSync(file, xml, 'utf8');
})();

/* ---------- verification ---------- */
(function verify() {
  const errors = [];
  const assert = (cond, msg) => { if (!cond) errors.push(msg); };

  // article count
  const expected = products.length * ACTIVE_FORMULAS.length;
  assert(articles.length === expected, `article count ${articles.length} !== ${expected}`);

  // titles: unique & <= 60
  const seen = new Map();
  articles.forEach(a => {
    assert(a.title.length <= 60, `title >60 (${a.title.length}): ${a.title}`);
    if (seen.has(a.title)) errors.push(`duplicate title: ${a.title} (${a.dir} and ${seen.get(a.title)})`);
    seen.set(a.title, a.dir);
  });

  const wordCount = html => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').split(/\s+/).filter(Boolean).length;

  const indexHtml = fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8');
  const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');

  articles.forEach(a => {
    const html = fs.readFileSync(path.join(ROOT, 'blog', a.dir, 'index.html'), 'utf8');
    // backlinks: /software/<slug>/ only when that page actually exists (original 56)
    if (SHELF(a.product)) {
      assert(html.includes(`/software/${a.product.slug}/`), `${a.dir}: missing /software link`);
    } else {
      assert(!html.includes(`/software/${a.product.slug}/`), `${a.dir}: links /software page that does not exist`);
      assert(html.includes('href="/software/"'), `${a.dir}: missing software shelf link`);
    }
    if (!isSoon(a.product)) assert(html.includes(`${OTS}/${a.product.slug}/`), `${a.dir}: missing onetimesuite.com link`);
    // JSON-LD parses
    const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert(lds.length === 3, `${a.dir}: expected 3 JSON-LD blocks, found ${lds.length}`);
    lds.forEach(m => { try { JSON.parse(m[1]); } catch (e) { errors.push(`${a.dir}: JSON-LD parse error: ${e.message}`); } });
    // word count (article body only)
    const art = html.match(/<article[\s\S]*?<\/article>/);
    assert(art, `${a.dir}: no <article>`);
    if (art) {
      const wc = wordCount(art[0]);
      assert(wc >= 500 && wc <= 1200, `${a.dir}: word count ${wc} outside 500-1200`);
    }
    // index + sitemap link every article
    assert(indexHtml.includes(`/blog/${a.dir}/`), `index missing ${a.dir}`);
    assert(sitemapXml.includes(`<loc>${a.url}</loc>`), `sitemap missing ${a.url}`);
  });

  // sitemap: original 144 URLs unchanged
  const nonBlogLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => !u.includes('/blog/'));
  assert(nonBlogLocs.length === 144, `sitemap non-blog URL count ${nonBlogLocs.length} !== 144`);
  assert(sitemapXml.includes(`<loc>${SITE}/blog/</loc>`), 'sitemap missing /blog/ index');

  // sample openings: first 30 words of each formula, for two apps
  const sample = [products[0], products[Math.floor(products.length / 2)]];
  const openings = sample.map(p => {
    const mine = byProduct.get(p.slug);
    const lines = mine.map(a => {
      const html = fs.readFileSync(path.join(ROOT, 'blog', a.dir, 'index.html'), 'utf8');
      const bodyMatch = html.match(/<article[\s\S]*?<\/article>/);
      const text = wordCountText(bodyMatch[0]);
      return `    [f${a.formula}] ${text.split(/\s+/).slice(0, 30).join(' ')} …`;
    });
    return `  ${p.brand}:\n${lines.join('\n')}`;
  }).join('\n');

  function wordCountText(html) {
    return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // auto-derivation quality report: which OTS-catalog apps would have failed
  // (title >60) without the hand-tuned NEW_META entries
  const titlesFor = (p, m) => [
    `${m.comp} Alternative for Marketing Teams: ${p.brand}`,
    `How Agencies Use ${p.brand} to ${tcase(m.use)}`,
    `${p.brand} vs ${m.comp}: Honest Comparison for Agencies`,
    `How to ${tcase(m.job)} Without ${art(m.comp)} ${m.comp} Subscription`,
    `${p.brand} Review: the Pay-Once ${m.cat} Tool for Marketers`,
  ];
  const derivFailures = freshProducts
    .filter(p => !META[p.slug])
    .map(p => {
      const over = titlesFor(p, deriveMeta(p)).filter(t => t.length > 60);
      return over.length ? `${p.slug} (${over.length}/5 titles >60)` : null;
    })
    .filter(Boolean);

  console.log(`\nBuilt ${articles.length} articles (${ACTIVE_FORMULAS.length} formulas × ${products.length} apps: ${localProducts.length} local + ${freshProducts.length} from OTS catalog) + /blog/ index.`);
  console.log(`Coming-soon (release prep, no buy link): ${products.filter(isSoon).map(p => p.slug).join(', ') || 'none'}`);
  console.log(`OTS-catalog apps where raw auto-derivation failed validation and NEW_META hand-tuning was required: ${derivFailures.length ? derivFailures.join(', ') : 'none'}`);
  console.log(`Sitemap: ${nonBlogLocs.length} original URLs preserved + ${articles.length + 1} blog URLs.`);
  console.log('\nSample openings (first 30 words per formula):');
  console.log(openings);

  if (errors.length) {
    console.error(`\nVERIFY FAILED — ${errors.length} problem(s):`);
    errors.slice(0, 40).forEach(e => console.error('  - ' + e));
    if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`);
    process.exit(1);
  }
  console.log('\nVERIFY PASSED: titles unique & ≤60, backlinks present, JSON-LD parses, word counts 500-1200, index & sitemap complete.');
})();
