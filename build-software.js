/*
 * build-software.js — generates the /software section for advancedmarketing.co:
 *   /software/                              hub page (product cards + coming soon)
 *   /software/<brand>/                      10 product landing pages
 *   /software/comparison/                   blog hub
 *   /software/comparison/<slug>-alternative/  25 comparison posts
 *
 * Reuses the site's shared chrome (nav/footer/voice widget) and /css/site.css,
 * with a small section-specific <style> block per page.
 *
 * Run:  node build-software.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://advancedmarketing.co';
const WHOP = 'https://whop.com/onetime-suite';
const GH = 'https://github.com/bensblueprints';

const products = require('./software-src/products.js');
const posts = [...require('./software-src/posts-1.js'), ...require('./software-src/posts-2.js'), ...require('./software-src/posts-3.js')];
const bySlug = Object.fromEntries(products.map(p => [p.slug, p]));

const COMING_SOON = [
  'Statfox — analytics', 'Shipnotes — changelog', 'Hearback — feedback', 'Docwell — knowledge base', 'Chatlet — live chat',
  'Boardly — kanban', 'Timevault — time tracking', 'Streakly — habits', 'Deepdesk — focus', 'Quillpad — notes',
];

/* "a" vs "an" for competitor names, by leading vowel sound */
const art = name => (/^[aeiou]/i.test(name) ? 'an' : 'a');

/* Competitor column data for the standard comparison table in each blog post */
const POST_TABLE = {
  'smallpdf-alternative':            { price: '$12–15/mo', yr3: '~$432–540', limits: 'Task/file limits on free tier', cloud: 'Uploaded to their servers', offline: 'No', src: 'Closed' },
  'ilovepdf-alternative':            { price: '~$4–7/mo', yr3: '~$144–252', limits: 'File-size & task limits on free tier', cloud: 'Uploaded to their servers', offline: 'Partial (desktop app)', src: 'Closed' },
  'adobe-acrobat-online-alternative':{ price: '$12.99–19.99/mo', yr3: '~$468–720', limits: 'One free task, then paywall', cloud: 'Adobe cloud', offline: 'Desktop app only (subscription)', src: 'Closed' },
  'remove-bg-alternative':           { price: '$9/mo (40 credits)', yr3: '~$324', limits: '40 credits/mo; free tier capped at 0.25 MP', cloud: 'Every image uploaded', offline: 'No', src: 'Closed' },
  'photoroom-alternative':           { price: '~$9.99/mo', yr3: '~$270+', limits: 'Watermarks / export caps on free tier', cloud: 'Processed on their servers', offline: 'No', src: 'Closed' },
  'otter-ai-alternative':            { price: '$16.99/mo', yr3: '~$300–612', limits: '1,200 min/mo, 90 min/file (Pro)', cloud: 'Audio uploaded to their cloud', offline: 'No', src: 'Closed' },
  'rev-alternative':                 { price: '$0.25/min AI (or subscription)', yr3: 'Depends on volume — $15/hr of audio', limits: 'Pay per minute, always', cloud: 'Audio uploaded & staff-handled', offline: 'No', src: 'Closed' },
  'descript-transcription-alternative': { price: '~$16–24/mo', yr3: '~$576–864', limits: 'Transcription hours metered monthly', cloud: 'Projects sync to their cloud', offline: 'Limited', src: 'Closed' },
  'tinypng-alternative':             { price: 'Yearly sub + $0.009/image API', yr3: 'Grows with volume', limits: '20 images/batch, 5 MB/file free; 75 MB cap', cloud: 'Every image uploaded', offline: 'No', src: 'Closed' },
  'kraken-io-alternative':           { price: '$5–79+/mo by MB quota', yr3: '~$180–2,800', limits: 'Metered by megabyte', cloud: 'Every image uploaded', offline: 'No', src: 'Closed' },
  'loom-alternative':                { price: '$15/mo (Business)', yr3: '~$540', limits: '5-min cap + watermark on free', cloud: 'Videos live on their servers', offline: 'No', src: 'Closed' },
  'camtasia-alternative':            { price: '~$179+/yr', yr3: '~$540+', limits: 'Subscription required for updates', cloud: 'Local (heavy desktop suite)', offline: 'Yes', src: 'Closed' },
  'screen-studio-alternative':       { price: '$100+ one-time + paid update renewals', yr3: 'License + renewals', limits: 'macOS only', cloud: 'Local', offline: 'Yes', src: 'Closed' },
  'uptimerobot-alternative':         { price: '$8/mo (Solo)', yr3: '~$288', limits: '50 monitors on paid tier', cloud: 'Their cloud', offline: 'n/a (hosted)', src: 'Closed' },
  'pingdom-alternative':             { price: '$10+/mo', yr3: '~$360+', limits: 'Metered by check volume', cloud: 'Their cloud', offline: 'n/a (hosted)', src: 'Closed' },
  'statuscake-alternative':          { price: '~$20+/mo (Superior)', yr3: '~$740+', limits: 'Monitors & intervals rationed by tier', cloud: 'Their cloud', offline: 'n/a (hosted)', src: 'Closed' },
  'bitly-alternative':               { price: '$29/mo for custom domain', yr3: '~$1,044', limits: 'Links & QR codes capped per plan', cloud: 'Their servers', offline: 'No', src: 'Closed' },
  'rebrandly-alternative':           { price: '$13–32+/mo', yr3: '~$468–1,150+', limits: 'Links, clicks & seats metered', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'short-io-alternative':            { price: '$19–99/mo', yr3: '~$684–3,564', limits: 'Links & analytics retention by tier', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'freshbooks-alternative':          { price: '$19/mo (Lite)', yr3: '~$684', limits: '5 billable clients on Lite', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'invoice-ninja-alternative':       { price: 'Free (4 clients) / ~$10–12/mo hosted', yr3: '$0–432', limits: '4 clients free; self-host = Laravel stack', cloud: 'Hosted, or your server', offline: 'Self-host: yes', src: 'Open source' },
  'calendly-alternative':            { price: '$10/user/mo (Standard)', yr3: '~$360/user', limits: '1 event type on free tier', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'cal-com-alternative':             { price: 'Free solo hosted / ~$15/user/mo teams', yr3: '$0–540/user', limits: 'Self-host = heavy Next.js + Postgres', cloud: 'Hosted, or your server', offline: 'Self-host: yes', src: 'Open source' },
  'typeform-alternative':            { price: '$29/mo (Basic)', yr3: '~$1,044', limits: '100 responses/mo on Basic', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'jotform-alternative':             { price: '~$34+/mo (Bronze)', yr3: '~$1,224+', limits: 'Submissions, storage & views capped', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'wisestamp-alternative':           { price: '$6/mo/user', yr3: '~$216/user', limits: 'Per-user pricing; ad injected on free tier', cloud: 'Their cloud account', offline: 'No', src: 'Closed' },
  'buffer-alternative':              { price: '$6/channel/mo', yr3: '~$1,080 (5 channels)', limits: 'Pay per channel; post caps on cheap tiers', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'hootsuite-alternative':           { price: '$99/mo (Professional)', yr3: '~$3,564', limits: 'Channels & seats capped by plan', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'linktree-alternative':            { price: '$5–9/mo', yr3: '~$180–324', limits: 'Branding + feature gates on free tier', cloud: 'Their servers', offline: 'No', src: 'Closed' },
  'beacons-alternative':             { price: '~$10/mo (Pro)', yr3: '~$360', limits: 'Transaction fees + upsells on free tier', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'qr-tiger-alternative':            { price: '$15+/mo', yr3: '~$540+', limits: 'Dynamic codes capped; codes die if you stop paying', cloud: 'Their cloud (qrco.de)', offline: 'No', src: 'Closed' },
  'flowcode-alternative':            { price: '~$12–30+/mo', yr3: '~$432–1,080+', limits: 'Code limits + feature gates by plan; codes need active plan', cloud: 'Their cloud', offline: 'No', src: 'Closed' },
  'bannerbear-alternative':          { price: '$49/mo (Starter)', yr3: '~$1,764', limits: '1,000 renders & 10 templates/mo on Starter', cloud: 'Every render through their servers', offline: 'No', src: 'Closed' },
  'placid-alternative':              { price: '$19+/mo', yr3: '~$684+', limits: 'Monthly render quota by plan', cloud: 'Templates & renders in their cloud', offline: 'No', src: 'Closed' },
};

/* ---------- shared chrome ---------- */
const AGENT = 'agent_0901khqt9q1jfazs86en39aeb0nr';

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
                    <li role="none"><a href="/software/" role="menuitem">Software</a></li>
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

const SW_CSS = `
        /* ===== /software section additions ===== */
        .price-badge { display:inline-flex; align-items:center; gap:0.5rem; background:rgba(201,169,98,0.12); border:1px solid rgba(201,169,98,0.35); color:var(--gold); border-radius:999px; padding:0.45rem 1.1rem; font-size:0.85rem; font-weight:600; letter-spacing:0.02em; }
        .price-badge .amt { font-size:1.05rem; }
        .sw-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:1.5rem; }
        .sw-card { display:flex; flex-direction:column; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:2rem; transition:all 0.4s; text-decoration:none; color:inherit; }
        .sw-card:hover { border-color:rgba(201,169,98,0.35); transform:translateY(-4px); background:var(--bg-card-hover); }
        .sw-card .sw-icon { font-size:1.9rem; margin-bottom:1rem; }
        .sw-card h3 { font-size:1.35rem; margin-bottom:0.4rem; }
        .sw-card .sw-tag { color:var(--text-muted); font-size:0.9rem; line-height:1.6; margin-bottom:1.25rem; flex:1; }
        .sw-card .sw-meta { display:flex; justify-content:space-between; align-items:center; gap:0.75rem; border-top:1px solid var(--border); padding-top:1rem; }
        .sw-card .sw-price { color:var(--gold); font-weight:700; font-size:1.05rem; white-space:nowrap; }
        .sw-card .sw-replaces { font-size:0.75rem; color:var(--text-muted); text-align:right; }
        .soon-strip { display:flex; flex-wrap:wrap; gap:0.6rem; }
        .soon-pill { font-size:0.78rem; padding:0.5rem 0.95rem; border:1px dashed var(--border); border-radius:999px; color:var(--text-muted); opacity:0.75; }
        .compare-wrap { overflow-x:auto; }
        table.compare { width:100%; border-collapse:collapse; font-size:0.92rem; min-width:560px; }
        table.compare th, table.compare td { padding:0.85rem 1rem; text-align:left; border-bottom:1px solid var(--border); vertical-align:top; }
        table.compare thead th { font-family:var(--font-body); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); }
        table.compare thead th.us { color:var(--gold); }
        table.compare td.us { color:var(--gold); font-weight:600; }
        table.compare td:first-child { color:var(--text-muted); }
        .post-body { max-width:760px; margin:0 auto; }
        .post-body h2 { font-size:clamp(1.6rem,3vw,2.1rem); margin:2.75rem 0 1rem; }
        .post-body p { color:var(--text-muted); line-height:1.75; margin-bottom:1.25rem; font-size:1.02rem; }
        .post-body ul { margin:0 0 1.25rem 1.25rem; display:grid; gap:0.6rem; }
        .post-body ul li { color:var(--text-muted); line-height:1.65; }
        .post-body a { color:var(--gold); }
        .post-meta { font-size:0.8rem; color:var(--text-muted); margin-bottom:2rem; }
        .post-cta { background:var(--bg-card); border:1px solid rgba(201,169,98,0.3); border-radius:var(--radius-lg); padding:2rem; margin:2.5rem 0; text-align:center; }
        .post-cta h3 { font-size:1.3rem; margin-bottom:0.5rem; }
        .post-cta p { margin-bottom:1.25rem; }
        .post-list { display:grid; gap:1rem; }
        .post-list a.post-item { display:block; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem 1.5rem; text-decoration:none; color:inherit; transition:all 0.3s; }
        .post-list a.post-item:hover { border-color:rgba(201,169,98,0.35); background:var(--bg-card-hover); }
        .post-list a.post-item h3 { font-size:1.05rem; font-family:var(--font-body); font-weight:600; margin-bottom:0.25rem; }
        .post-list a.post-item p { color:var(--text-muted); font-size:0.85rem; }
        .related-links { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:1rem; }
        .related-links a { font-size:0.78rem; padding:0.45rem 0.9rem; background:rgba(201,169,98,0.1); color:var(--gold); border-radius:4px; text-decoration:none; }
        .hero-ctas .btn { margin-right:0.75rem; margin-bottom:0.75rem; }`;

function esc(s) { return s.replace(/&(?![a-z#0-9]+;)/g, '&amp;'); }

function page({ title, desc, canonical, ogType = 'website', jsonld = [], body }) {
  const ld = jsonld.map(o => `    <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="manifest" href="/manifest.json">
    <meta property="og:type" content="${ogType}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE}/logo.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/site.css">
    <style>${SW_CSS}
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
  console.log('wrote', rel + '/index.html');
}

/* ---------- 1. /software/ hub ---------- */
(function hub() {
  const cards = products.map(p => `
                    <a class="sw-card" href="/software/${p.slug}/">
                        <div class="sw-icon" aria-hidden="true">${p.icon}</div>
                        <h3>${p.brand}</h3>
                        <p class="sw-tag">${esc(p.oneliner)}</p>
                        <div class="sw-meta">
                            <span class="sw-price">$${p.price} once</span>
                            <span class="sw-replaces">replaces ${p.competitor}<br>${esc(p.compPrice)}</span>
                        </div>
                    </a>`).join('');

  const body = `
        <section class="page-hero" aria-label="Software suite">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <span>Software</span></nav>
                <span class="text-label">The One-Time Suite</span>
                <h1>Pay once. <span class="text-gradient">Own it forever.</span></h1>
                <p class="lead">Desktop and self-hosted apps that replace your monthly SaaS bills. Every app is a one-time purchase, runs on hardware you control, keeps your data private — and the source is MIT-licensed on GitHub.</p>
                <div class="hero-ctas">
                    <a href="${WHOP}" class="btn btn-primary" rel="noopener">Get the suite on Whop &rarr;</a>
                    <a href="/software/comparison/" class="btn btn-outline">Read the honest comparisons &rarr;</a>
                </div>
            </div>
        </section>

        <section class="section" aria-label="Products">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">Shipped &amp; Ready</span>
                    <h2>Fifteen Apps. Zero Subscriptions.</h2>
                    <p>Each one replaces a tool that bills you monthly, forever.</p>
                </div>
                <div class="sw-grid">${cards}
                </div>
            </div>
        </section>

        <section class="section section-alt" aria-label="Coming soon">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">Coming Soon</span>
                    <h2>More on the Bench</h2>
                    <p>Same deal — pay once, own forever. In the workshop now:</p>
                </div>
                <div class="soon-strip">
                    ${COMING_SOON.map(s => `<span class="soon-pill">${s}</span>`).join('\n                    ')}
                </div>
            </div>
        </section>

        <section class="section cta-section" id="contact" aria-label="Get the suite">
            <div class="container">
                <h2>Stop Renting Your Tools</h2>
                <p>Every app in the suite is a one-time purchase on Whop — signed installers, 1-click setup, updates included. The source code is free (MIT) on GitHub if you'd rather build it yourself.</p>
                <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                    <a href="${WHOP}" class="btn btn-primary" rel="noopener">Get it on Whop &rarr;</a>
                    <a href="https://github.com/bensblueprints" class="btn btn-outline" rel="noopener">Browse the source &nearr;</a>
                </div>
            </div>
        </section>`;

  write('software', page({
    title: 'Software — Pay Once, Own It Forever | Advanced Marketing',
    desc: 'Fifteen desktop & self-hosted apps that replace monthly SaaS subscriptions — social scheduling, PDF tools, transcription, QR codes, OG images, uptime monitoring, invoicing and more. One-time prices from $15.',
    canonical: `${SITE}/software/`,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'ItemList',
      itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/software/${p.slug}/`, name: p.brand })),
    }],
    body,
  }));
})();

/* ---------- 2. landing pages ---------- */
products.forEach(p => {
  const compTable = `
                <div class="compare-wrap">
                <table class="compare">
                    <thead><tr><th></th><th class="us">${p.brand}</th><th>${p.competitor}</th></tr></thead>
                    <tbody>
                        ${p.compRows.map(r => `<tr><td>${r[0]}</td><td class="us">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('\n                        ')}
                    </tbody>
                </table>
                </div>`;

  const relatedPosts = posts.filter(x => x.product === p.slug);

  const body = `
        <section class="page-hero" aria-label="${p.brand}">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <a href="/software/">Software</a> &nbsp;/&nbsp; <span>${p.brand}</span></nav>
                <span class="price-badge"><span class="amt">$${p.price}</span> one-time, forever</span>
                <h1>${p.icon} ${p.brand}</h1>
                <p class="lead">${esc(p.tagline)}</p>
                <p class="lead" style="font-size:1.02rem;">${esc(p.heroLead)}</p>
                <div class="hero-ctas">
                    <a href="${WHOP}" class="btn btn-primary" rel="noopener">Get it on Whop — $${p.price} &rarr;</a>
                    <a href="${GH}/${p.repo}" class="btn btn-outline" rel="noopener">View source on GitHub &nearr;</a>
                </div>
            </div>
        </section>

        <section class="section" aria-label="Features">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">What You Get</span>
                    <h2>Features</h2>
                </div>
                <div class="feature-grid">
                    ${p.features.map(f => `<div class="feature-card"><div class="fi" aria-hidden="true">${f[0]}</div><h3>${esc(f[1])}</h3><p>${esc(f[2])}</p></div>`).join('\n                    ')}
                </div>
            </div>
        </section>

        <section class="section section-alt" aria-label="Comparison with ${p.competitor}">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">The Math</span>
                    <h2>${p.brand} vs ${p.competitor}</h2>
                    <p>${p.competitor} at ${esc(p.compPrice)} costs roughly $${p.compYr}/year — $${p.compYr * 2} over two years. ${p.brand} is $${p.price}, once.</p>
                </div>
                ${compTable}
                <p style="color:var(--text-muted);margin-top:1.25rem;font-size:0.95rem;">${esc(p.payback)}</p>
            </div>
        </section>

        <section class="section" aria-label="How it works">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">How It Works</span>
                    <h2>Three Steps, No Subscription</h2>
                </div>
                <div class="process-grid">
                    ${p.steps.map((s, i) => `<div class="process-step"><div class="num">0${i + 1}</div><h3>${esc(s[0])}</h3><p>${esc(s[1])}</p></div>`).join('\n                    ')}
                </div>
            </div>
        </section>

        <section class="section section-alt" aria-label="Frequently asked questions">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">FAQ</span>
                    <h2>Honest Answers</h2>
                </div>
                <div style="max-width:760px;margin:0 auto;">
                    ${p.faq.map(q => `<div class="faq-item"><h3>${esc(q[0])}</h3><p>${esc(q[1])}</p></div>`).join('\n                    ')}
                </div>
                ${relatedPosts.length ? `<div style="max-width:760px;margin:2rem auto 0;">
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem;">Deep-dive comparisons:</p>
                    <div class="related-links">
                        ${relatedPosts.map(x => `<a href="/software/comparison/${x.slug}/">${x.competitor} alternative</a>`).join('\n                        ')}
                    </div>
                </div>` : ''}
            </div>
        </section>

        <section class="section cta-section" id="contact" aria-label="Get ${p.brand}">
            <div class="container">
                <h2>Own ${p.brand} Forever</h2>
                <p>$${p.price} once. Signed installer, 1-click setup, updates included. No renewal, no account with us, no meter. Or build it yourself from the MIT source — it's the same app.</p>
                <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                    <a href="${WHOP}" class="btn btn-primary" rel="noopener">Get it on Whop — $${p.price} &rarr;</a>
                    <a href="${GH}/${p.repo}" class="btn btn-outline" rel="noopener">View source on GitHub &nearr;</a>
                </div>
            </div>
        </section>`;

  write(`software/${p.slug}`, page({
    title: `${p.brand} — ${p.competitor} Alternative, $${p.price} One-Time | Advanced Marketing`,
    desc: p.oneliner + ` Pay once ($${p.price}), own it forever. Replaces ${p.competitor} (${p.compPrice}). MIT source on GitHub.`,
    canonical: `${SITE}/software/${p.slug}/`,
    ogType: 'product',
    jsonld: [
      {
        '@context': 'https://schema.org', '@type': 'Product',
        name: p.brand, description: p.oneliner,
        brand: { '@type': 'Brand', name: 'One-Time Suite' },
        url: `${SITE}/software/${p.slug}/`, image: `${SITE}/logo.png`,
        offers: { '@type': 'Offer', price: String(p.price), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: WHOP },
      },
      {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: p.faq.map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })),
      },
    ],
    body,
  }));
});

/* ---------- 3. comparison hub ---------- */
(function compHub() {
  const groups = products.map(p => {
    const list = posts.filter(x => x.product === p.slug);
    if (!list.length) return '';
    return `
                <div style="margin-bottom:2.5rem;">
                    <h2 style="font-size:1.5rem;margin-bottom:1rem;">${p.icon} ${p.brand} <span style="font-size:0.85rem;color:var(--text-muted);font-family:var(--font-body);">— replaces ${p.competitor} · <a href="/software/${p.slug}/" style="color:var(--gold);">product page</a></span></h2>
                    <div class="post-list">
                        ${list.map(x => `<a class="post-item" href="/software/comparison/${x.slug}/"><h3>Looking for ${art(x.competitor)} ${x.competitor} Alternative? Meet ${p.brand}</h3><p>${esc(x.metaDesc)}</p></a>`).join('\n                        ')}
                    </div>
                </div>`;
  }).join('');

  const body = `
        <section class="page-hero" aria-label="Comparison blog">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <a href="/software/">Software</a> &nbsp;/&nbsp; <span>Comparisons</span></nav>
                <span class="text-label">Honest Comparisons</span>
                <h1>Subscription vs <span class="text-gradient">Pay-Once</span></h1>
                <p class="lead">Straight-shooting breakdowns of ${posts.length} popular SaaS tools: what they do well, where the subscription model hurts, and when our pay-once apps are (and aren't) the better buy. If the competitor is the right choice for you, we'll say so.</p>
            </div>
        </section>

        <section class="section" aria-label="All comparison posts">
            <div class="container">${groups}
            </div>
        </section>

        <section class="section cta-section" id="contact" aria-label="Get the suite">
            <div class="container">
                <h2>Pay Once. Own It Forever.</h2>
                <p>The whole suite is on Whop — one-time prices from $19, MIT source on GitHub.</p>
                <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                    <a href="/software/" class="btn btn-primary">Browse the suite &rarr;</a>
                    <a href="${WHOP}" class="btn btn-outline" rel="noopener">Get it on Whop &nearr;</a>
                </div>
            </div>
        </section>`;

  write('software/comparison', page({
    title: 'SaaS Alternatives — Honest Pay-Once Comparisons (2026) | Advanced Marketing',
    desc: 'Honest comparisons of 34 subscription tools — Buffer, Linktree, SmallPDF, Otter.ai, Loom, Bannerbear, Calendly, Typeform and more — vs our pay-once desktop and self-hosted alternatives.',
    canonical: `${SITE}/software/comparison/`,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'ItemList',
      itemListElement: posts.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/software/comparison/${x.slug}/` })),
    }],
    body,
  }));
})();

/* ---------- 4. comparison posts ---------- */
posts.forEach(post => {
  const p = bySlug[post.product];
  const t = POST_TABLE[post.slug];
  const title = `Looking for ${art(post.competitor)} ${post.competitor} Alternative? Meet ${p.brand} — Pay Once, Own It Forever (2026)`;
  const url = `${SITE}/software/comparison/${post.slug}/`;
  const related = posts.filter(x => x.product === post.product && x.slug !== post.slug);

  const ourLimits = 'None — unlimited use';
  const table = `
                    <div class="compare-wrap">
                    <table class="compare">
                        <thead><tr><th></th><th class="us">${p.brand}</th><th>${post.competitor}</th></tr></thead>
                        <tbody>
                            <tr><td>Price</td><td class="us">$${p.price} once</td><td>${esc(t.price)}</td></tr>
                            <tr><td>Cost over 3 years</td><td class="us">$${p.price}</td><td>${esc(t.yr3)}</td></tr>
                            <tr><td>Where your data lives</td><td class="us">Your machine / your server</td><td>${esc(t.cloud)}</td></tr>
                            <tr><td>Usage limits</td><td class="us">${ourLimits}</td><td>${esc(t.limits)}</td></tr>
                            <tr><td>Works offline</td><td class="us">Yes</td><td>${esc(t.offline)}</td></tr>
                            <tr><td>Source code</td><td class="us">MIT, on GitHub</td><td>${esc(t.src)}</td></tr>
                        </tbody>
                    </table>
                    </div>`;

  const featureBullets = p.features.slice(0, 6).map(f => `<li><strong style="color:var(--text);">${esc(f[1])}</strong> — ${esc(f[2])}</li>`).join('\n                        ');

  const body = `
        <section class="page-hero" aria-label="Article">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <a href="/software/">Software</a> &nbsp;/&nbsp; <a href="/software/comparison/">Comparisons</a> &nbsp;/&nbsp; <span>${post.competitor} Alternative</span></nav>
                <span class="text-label">Honest Comparison · 2026</span>
                <h1 style="font-size:clamp(2rem,4.5vw,3.25rem);">Looking for ${art(post.competitor)} ${post.competitor} Alternative? Meet <span class="text-gradient">${p.brand}</span> — Pay Once, Own It Forever</h1>
            </div>
        </section>

        <section class="section" aria-label="Article body">
            <div class="container">
                <article class="post-body">
                    <p class="post-meta">By Advanced Marketing · Updated 2026 · Part of the <a href="/software/comparison/">pay-once vs subscription</a> series</p>

                    ${post.intro.map(x => `<p>${esc(x)}</p>`).join('\n                    ')}

                    <h2>What ${post.competitor} does well</h2>
                    <p>${esc(post.good.lead)}</p>
                    <ul>
                        ${post.good.items.map(x => `<li>${esc(x)}</li>`).join('\n                        ')}
                    </ul>
                    <p>${esc(post.good.after)}</p>

                    <h2>Where the subscription model hurts</h2>
                    ${post.hurts.map(x => `<p>${esc(x)}</p>`).join('\n                    ')}

                    <h2>${p.brand}: the pay-once alternative</h2>
                    <p><a href="/software/${p.slug}/">${p.brand}</a> is a ${p.price === 39 ? '$39' : '$' + p.price}, one-time purchase. ${esc(p.tagline)} ${esc(post.meetExtra)}</p>
                    <p>The source code is MIT-licensed at <a href="${GH}/${p.repo}" rel="noopener">github.com/bensblueprints/${p.repo}</a> — free to build and run yourself, forever. Buying the packaged version on Whop gets you the signed installer, 1-click setup and updates. Either way, there is no account, no telemetry and no renewal date.</p>
                    <h3 style="font-size:1.15rem;margin:1.5rem 0 0.75rem;">Head to head</h3>
                    ${table}

                    <h2>Who should stay with ${post.competitor}</h2>
                    ${post.stay.map(x => `<p>${esc(x)}</p>`).join('\n                    ')}

                    <h2>Making the switch</h2>
                    ${p.steps.map((s, i) => `<p><strong style="color:var(--text);">Step ${i + 1} — ${esc(s[0])}.</strong> ${esc(s[1])}</p>`).join('\n                    ')}

                    <h2>Common questions</h2>
                    ${p.faq.slice(0, 3).map(q => `<p><strong style="color:var(--text);">${esc(q[0])}</strong><br>${esc(q[1])}</p>`).join('\n                    ')}

                    <h2>The bottom line</h2>
                    <p>Subscriptions make sense when a service does ongoing work for you — hosting, syncing, multi-region infrastructure, human labor. They make much less sense when the work happens on your own hardware and the monthly bill is just a toll booth. ${p.brand} is our bet that for this job, most people are better served owning the tool: $${p.price} once, ${esc(p.payback.charAt(0).toLowerCase() + p.payback.slice(1))}</p>
                    <p>${p.brand} is part of the <a href="/software/">One-Time Suite</a> — fifteen desktop and self-hosted apps (social scheduling, PDF tools, transcription, background removal, screen recording, QR codes, OG images, uptime monitoring, invoicing, booking, forms and more) built on the same principle: your hardware does the work, so you should not pay rent on it. Every app is a one-time purchase with MIT-licensed source on GitHub, no accounts and no telemetry.</p>

                    <div class="post-cta">
                        <h3>Try ${p.brand} — $${p.price}, one time</h3>
                        <p>Signed installer on Whop, or build it free from the MIT source. Your call.</p>
                        <a href="/software/${p.slug}/" class="btn btn-primary">See ${p.brand} features &rarr;</a>
                        <a href="${WHOP}" class="btn btn-outline" rel="noopener" style="margin-left:0.75rem;">Get it on Whop &nearr;</a>
                    </div>

                    ${related.length ? `<p style="font-size:0.9rem;">Related comparisons: ${related.map(x => `<a href="/software/comparison/${x.slug}/">${x.competitor} alternative</a>`).join(' · ')} — or browse <a href="/software/">the whole pay-once suite</a>.</p>` : `<p style="font-size:0.9rem;">Browse <a href="/software/">the whole pay-once suite</a> or <a href="/software/comparison/">all comparisons</a>.</p>`}
                </article>
            </div>
        </section>`;

  write(`software/comparison/${post.slug}`, page({
    title,
    desc: post.metaDesc,
    canonical: url,
    ogType: 'article',
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Article',
      headline: title,
      description: post.metaDesc,
      author: { '@type': 'Organization', name: 'Advanced Marketing', url: SITE },
      publisher: { '@type': 'Organization', name: 'Advanced Marketing', logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
      mainEntityOfPage: url,
      datePublished: '2026-07-06', dateModified: '2026-07-06',
      about: { '@type': 'Product', name: p.brand, offers: { '@type': 'Offer', price: String(p.price), priceCurrency: 'USD' } },
    }],
    body,
  }));
});

console.log(`\nDone: 1 hub + ${products.length} landing pages + 1 comparison hub + ${posts.length} posts = ${2 + products.length + posts.length} pages`);
