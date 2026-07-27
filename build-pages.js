/*
 * build-pages.js — generates the missing /about, /services and /services/* pages
 * for advancedmarketing.co, reusing the homepage design system.
 * Extracts the homepage <style> into /css/site.css (+ inner-page additions) and
 * composes each page with the shared nav, footer, voice widget and scripts.
 *
 * Run:  node build-pages.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ---------- 1. Shared stylesheet ---------- */
const styleMatch = index.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error('Could not find <style> block in index.html');
const baseCss = styleMatch[1];

const EXTRA_CSS = `

        /* ===== Inner-page additions ===== */
        .page-hero { padding: 170px 0 80px; position: relative; overflow: hidden; }
        .page-hero::before {
            content: ''; position: absolute; inset: 0;
            background: radial-gradient(ellipse at 25% 0%, rgba(201,169,98,0.10) 0%, transparent 60%),
                        radial-gradient(ellipse at 90% 30%, rgba(201,169,98,0.05) 0%, transparent 55%);
        }
        .page-hero .container { position: relative; z-index: 1; }
        .breadcrumb { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 1.25rem; }
        .breadcrumb a { color: var(--text-muted); text-decoration: none; }
        .breadcrumb a:hover { color: var(--gold); }
        .breadcrumb span { color: var(--gold); }
        .page-hero h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); margin: 0.75rem 0 1.25rem; max-width: 940px; }
        .page-hero .lead { font-size: 1.2rem; color: var(--text-muted); max-width: 700px; margin-bottom: 2.25rem; line-height: 1.6; }
        .page-hero .hero-ctas { margin-bottom: 0.5rem; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
        .two-col img { width: 100%; height: auto; border-radius: var(--radius-md); display: block; }

        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
        .feature-card {
            background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
            padding: 2rem; transition: all 0.4s;
        }
        .feature-card:hover { border-color: rgba(201,169,98,0.3); transform: translateY(-4px); background: var(--bg-card-hover); }
        .feature-card .fi {
            width: 48px; height: 48px; border-radius: var(--radius-md); background: rgba(201,169,98,0.1);
            display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 1.25rem;
        }
        .feature-card h3 { font-size: 1.2rem; margin-bottom: 0.5rem; }
        .feature-card p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }

        .check-list { list-style: none; display: grid; gap: 1rem; }
        .check-list li { display: flex; gap: 0.75rem; align-items: flex-start; color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }
        .check-list li::before { content: '\\2713'; color: var(--gold); font-weight: 700; flex-shrink: 0; margin-top: 1px; }

        .process-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 2.5rem; }
        .process-step .num { font-family: var(--font-display); font-size: 2.75rem; font-weight: 700; color: var(--gold); opacity: 0.55; line-height: 1; }
        .process-step h3 { font-size: 1.15rem; margin: 0.6rem 0 0.4rem; }
        .process-step p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }

        .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 2rem; text-align: center; }
        .stat-row .stat-value { font-family: var(--font-display); font-size: 2.75rem; font-weight: 600; }
        .stat-row .stat-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.35rem; }

        .faq-item { border-bottom: 1px solid var(--border); padding: 1.5rem 0; }
        .faq-item:first-child { border-top: 1px solid var(--border); }
        .faq-item h3 { font-size: 1.1rem; margin-bottom: 0.5rem; font-family: var(--font-body); font-weight: 600; }
        .faq-item p { color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; }

        .pill-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .pill { font-size: 0.75rem; padding: 0.4rem 0.8rem; background: rgba(201,169,98,0.1); color: var(--gold); border-radius: 4px; }

        @media (max-width: 768px) {
            .page-hero { padding: 120px 0 60px; }
            .two-col { grid-template-columns: 1fr; gap: 2rem; }
            .two-col .two-col-img { order: -1; }
        }
`;

fs.mkdirSync(path.join(ROOT, 'css'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'css', 'site.css'), baseCss + EXTRA_CSS, 'utf8');

/* ---------- 2. Shared chrome ---------- */
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
                    <li role="none"><a href="/blog/" role="menuitem">Blog</a></li>
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
                        <li><a href="/blog/">Blog</a></li>
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

const CTA_SECTION = `
        <section class="section cta-section" id="contact" aria-label="Contact us">
            <div class="container">
                <h2>Ready to Scale Your Business?</h2>
                <p>Book a free strategy call to see exactly how we'd grow your business. No obligation, no pressure &mdash; just a clear, actionable plan tailored to your goals.</p>
                <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                    <a href="mailto:ben@advancedmarketing.co?subject=Free%20Strategy%20Call" class="btn btn-primary">Book Free Strategy Call &rarr;</a>
                    <a href="/case-studies" class="btn btn-outline">View Case Studies &rarr;</a>
                </div>
                <div class="voice-ctas" style="justify-content:center;margin-top:1.5rem;">
                    <a href="javascript:void(0)" onclick="openVoiceChat('${AGENT}', 'Talk To Our Sales Team', 'Chat with our AI specialist about growing your business')" class="btn-voice" role="button" aria-label="Start voice chat with our AI sales team">
                        &#x1F4DE; Talk To Sales Now <span class="pulse-dot" aria-hidden="true"></span>
                    </a>
                </div>
                <div class="contact-grid">
                    <div class="contact-item">
                        <div class="contact-item-icon" aria-hidden="true">&#x2709;</div>
                        <h3>Email Us</h3>
                        <a href="mailto:ben@advancedmarketing.co">ben@advancedmarketing.co</a>
                    </div>
                    <div class="contact-item">
                        <div class="contact-item-icon" aria-hidden="true">&#x1F4AC;</div>
                        <h3>AI Sales Chat</h3>
                        <p><a href="javascript:void(0)" onclick="openVoiceChat('${AGENT}', 'Talk To Sales', 'Chat with our AI specialist')" style="color:var(--gold);cursor:pointer;" role="button">Talk to our AI now</a></p>
                    </div>
                    <div class="contact-item">
                        <div class="contact-item-icon" aria-hidden="true">&#x1F3E2;</div>
                        <h3>Our Office</h3>
                        <address style="font-style:normal;font-size:0.85rem;color:var(--text-muted);">Hong Kong, SAR China</address>
                    </div>
                </div>
            </div>
        </section>`;

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
                    <h4>Resources</h4>
                    <a href="/blog/">Blog</a>
                    <a href="/ecommerce-blueprint">E-commerce Blueprint</a>
                    <a href="/case-studies">Case Studies</a>
                    <a href="https://website.advancedmarketing.co">Local Business Sites</a>
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

function jsonLd(obj) {
    return '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';
}

/* ---------- Sitewide schema (every generated page) ---------- */
const ORG_ID = 'https://advancedmarketing.co/#org';
const SHARED_SCHEMA = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': ORG_ID,
            name: 'Advanced Marketing',
            url: 'https://advancedmarketing.co',
            logo: { '@type': 'ImageObject', url: 'https://advancedmarketing.co/logo.png' },
            description: 'Full-service marketing agency specializing in Facebook advertising, Google Ads, PR, e-commerce, AI software, and local business websites.',
            email: 'ben@advancedmarketing.co',
            foundingDate: '2020',
            address: { '@type': 'PostalAddress', addressLocality: 'Hong Kong', addressCountry: 'HK' },
            areaServed: 'Worldwide',
            knowsAbout: ['Facebook Advertising', 'Google Ads', 'PR', 'E-commerce', 'AI Software', 'Web Design', 'Conversion Rate Optimization'],
            sameAs: ['https://github.com/bensblueprints', 'https://onetimesuite.com']
        },
        {
            '@type': 'ProfessionalService',
            '@id': 'https://advancedmarketing.co/#localservice',
            name: 'Advanced Marketing',
            url: 'https://advancedmarketing.co',
            image: 'https://advancedmarketing.co/logo.png',
            priceRange: '$$',
            areaServed: 'Worldwide',
            address: { '@type': 'PostalAddress', addressLocality: 'Hong Kong', addressCountry: 'HK' },
            knowsAbout: ['Facebook Ads', 'Google Ads', 'PR', 'E-commerce', 'AI Software', 'Conversion Rate Optimization'],
            parentOrganization: { '@id': ORG_ID }
        },
        {
            '@type': 'WebSite',
            '@id': 'https://advancedmarketing.co/#website',
            url: 'https://advancedmarketing.co',
            name: 'Advanced Marketing',
            publisher: { '@id': ORG_ID }
        }
    ]
};

function breadcrumbSchema(items) {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: it.name,
            item: it.url
        }))
    };
}

function graph(schema) {
    const nodes = Array.isArray(schema) ? schema : [schema];
    return { '@context': 'https://schema.org', '@graph': nodes.map(x => { const { '@context': _c, ...rest } = x; return rest; }) };
}

function page({ canonical, title, desc, schema, body }) {
    const head = `<!DOCTYPE html>
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
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://advancedmarketing.co/logo.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/site.css">
    ${jsonLd(SHARED_SCHEMA)}
    ${schema ? jsonLd(schema) : ''}
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
    return head;
}

/* ---------- 3. Reusable section builders ---------- */
const breadcrumb = (label) =>
    `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <a href="/services">Services</a> &nbsp;/&nbsp; <span>${label}</span></nav>`;

function heroBlock({ crumb, label, h1, lead, primary }) {
    return `
        <section class="page-hero" aria-label="${label}">
            <div class="container">
                ${crumb ? breadcrumb(crumb) : ''}
                <span class="text-label">${label}</span>
                <h1>${h1}</h1>
                <p class="lead">${lead}</p>
                <div class="hero-ctas">
                    <a href="#contact" class="btn btn-primary">${primary || 'Book Free Strategy Call'} &rarr;</a>
                    <a href="/case-studies" class="btn btn-outline">See Results &nearr;</a>
                </div>
            </div>
        </section>`;
}

function featureSection(label, heading, intro, cards) {
    return `
        <section class="section section-alt" aria-label="${heading}">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">${label}</span>
                    <h2>${heading}</h2>
                    ${intro ? `<p>${intro}</p>` : ''}
                </div>
                <div class="feature-grid">
                    ${cards.map(c => `
                    <div class="feature-card">
                        <div class="fi" aria-hidden="true">${c.icon}</div>
                        <h3>${c.h}</h3>
                        <p>${c.p}</p>
                    </div>`).join('')}
                </div>
            </div>
        </section>`;
}

function processSection(steps) {
    return `
        <section class="section" aria-label="Our process">
            <div class="container">
                <div class="section-header" style="margin:0 auto 4rem;text-align:center;">
                    <span class="text-label">How It Works</span>
                    <h2>A Proven, Transparent Process</h2>
                    <p style="margin-left:auto;margin-right:auto;">No black boxes. You'll always know what we're doing, why, and what it's producing.</p>
                </div>
                <div class="process-grid">
                    ${steps.map((s, i) => `
                    <div class="process-step">
                        <div class="num">${String(i + 1).padStart(2, '0')}</div>
                        <h3>${s.h}</h3>
                        <p>${s.p}</p>
                    </div>`).join('')}
                </div>
            </div>
        </section>`;
}

function statBand(stats) {
    return `
        <section class="section section-alt" aria-label="Results">
            <div class="container">
                <div class="stat-row">
                    ${stats.map(s => `<div><div class="stat-value text-gradient">${s.v}</div><div class="stat-label">${s.l}</div></div>`).join('')}
                </div>
            </div>
        </section>`;
}

function faqSection(faqs) {
    return `
        <section class="section" aria-label="Frequently asked questions">
            <div class="container" style="max-width:820px;">
                <div class="section-header" style="margin:0 auto 3rem;text-align:center;">
                    <span class="text-label">FAQ</span>
                    <h2>Questions, Answered</h2>
                </div>
                ${faqs.map(f => `
                <div class="faq-item">
                    <h3>${f.q}</h3>
                    <p>${f.a}</p>
                </div>`).join('')}
            </div>
        </section>`;
}

function includesSection(label, heading, intro, items) {
    return `
        <section class="section" aria-label="${heading}">
            <div class="container">
                <div class="two-col">
                    <div>
                        <span class="text-label">${label}</span>
                        <h2 style="font-size:clamp(2rem,4vw,3rem);margin:0.75rem 0 1rem;">${heading}</h2>
                        <p style="color:var(--text-muted);margin-bottom:2rem;">${intro}</p>
                        <a href="#contact" class="btn btn-primary">Get Started &rarr;</a>
                    </div>
                    <ul class="check-list">
                        ${items.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </section>`;
}

function engagementSection(eng) {
    return `
        <section class="section section-alt" aria-label="Engagement model and pricing">
            <div class="container">
                <div class="two-col">
                    <div>
                        <span class="text-label">Pricing &amp; Engagement</span>
                        <h2 style="font-size:clamp(2rem,4vw,3rem);margin:0.75rem 0 1rem;">${eng.heading}</h2>
                        <p style="color:var(--text-muted);margin-bottom:2rem;">${eng.intro}</p>
                        <a href="#contact" class="btn btn-primary">Get a Custom Quote &rarr;</a>
                    </div>
                    <ul class="check-list">
                        ${eng.points.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </section>`;
}

function relatedSection(slug) {
    const all = [
        { slug: 'facebook-ads', bg: 'rgba(59,130,246,0.15)', icon: '\u{1F4E3}', h: 'Facebook & Instagram Ads', p: 'Full-funnel Meta campaigns engineered around return on ad spend.' },
        { slug: 'google-ads', bg: 'rgba(16,185,129,0.15)', icon: '\u{1F50D}', h: 'Google Ads', p: 'Capture high-intent demand the moment people search.' },
        { slug: 'pr-press', bg: 'rgba(245,158,11,0.15)', icon: '\u{1F4F0}', h: 'PR & Press Relations', p: 'Earned media coverage that builds lasting authority.' },
        { slug: 'ecommerce-website', bg: 'rgba(168,85,247,0.15)', icon: '\u{1F6D2}', h: 'E-commerce Websites', p: 'High-converting Shopify stores built around the buyer\u2019s journey.' },
        { slug: 'ai-software', bg: 'rgba(6,182,212,0.15)', icon: '\u{1F916}', h: 'AI Software & Automation', p: 'AI voice agents, chatbots and workflows that run 24/7.' },
        { slug: 'cro', bg: 'rgba(244,63,94,0.15)', icon: '\u{1F4C8}', h: 'Conversion Rate Optimization', p: 'Turn more of your existing traffic into customers.' }
    ];
    const siblings = all.filter(c => c.slug !== slug).slice(0, 2);
    return `
        <section class="section" aria-label="Related services">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">Keep Exploring</span>
                    <h2>Works Even Better Together</h2>
                    <p>Most clients pair this service with another lever &mdash; and see the compounding effect in their numbers. See the proof in our <a href="/case-studies" style="color:var(--gold);">case studies</a>, or check out <a href="/software/" style="color:var(--gold);">our own pay-once software tools</a>.</p>
                </div>
                <div class="services-grid">
                    ${siblings.map(c => `
                    <a href="/services/${c.slug}" class="service-card">
                        <div class="service-icon" style="background:${c.bg};" aria-hidden="true">${c.icon}</div>
                        <h3>${c.h}</h3>
                        <p>${c.p}</p>
                    </a>`).join('')}
                    <a href="/case-studies" class="service-card">
                        <div class="service-icon" style="background:rgba(201,169,98,0.15);" aria-hidden="true">\u{1F3C6}</div>
                        <h3>Case Studies</h3>
                        <p>Real client results &mdash; $30K in 30 days, dollar-for-dollar acquisition and more.</p>
                    </a>
                </div>
            </div>
        </section>`;
}

function faqSchema(canonical, faqs) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
    };
}

function serviceSchema(canonical, name, desc) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: name,
        provider: { '@id': ORG_ID, '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co' },
        areaServed: 'Worldwide',
        url: canonical,
        description: desc,
        offers: {
            '@type': 'Offer',
            url: canonical,
            priceCurrency: 'USD',
            description: 'Custom quote based on scope — book a free strategy call for a tailored proposal.',
            availability: 'https://schema.org/InStock'
        }
    };
}

/* ---------- 4. Service pages ---------- */
const services = [
    {
        slug: 'facebook-ads',
        label: 'Facebook & Instagram Advertising',
        crumb: 'Facebook Ads',
        title: 'Facebook Ads Management | Advanced Marketing',
        desc: 'Facebook Ads management that pays for itself — creative, targeting, testing and scaling across Meta. 500+ clients, 3.2x average ROI. Free strategy call.',
        serviceType: 'Facebook Ads Management',
        h1: 'Facebook Ads Management That <span class="text-gradient">Actually Turns a Profit</span>',
        lead: 'Most agencies "boost posts" and call it a day. We build full-funnel Facebook & Instagram campaigns engineered around one number that matters: your return on ad spend.',
        includes: {
            heading: 'Everything Handled, End to End',
            intro: 'You hand us the goal. We handle account structure, creative, audiences, testing and reporting — then scale what wins.',
            items: [
                'Full Meta Business & pixel/Conversions API setup so tracking is bulletproof',
                'Scroll-stopping ad creative — statics, carousels and short-form video',
                'Audience research, lookalikes and retargeting funnels',
                'Daily optimization and systematic A/B testing of creative & angles',
                'Transparent weekly reporting on spend, ROAS and customer acquisition cost',
                'Scaling playbook to grow winners without blowing up your cost per result'
            ]
        },
        features: {
            label: 'What You Get',
            heading: 'Built for Performance, Not Vanity Metrics',
            intro: 'Likes don’t pay the bills. Every lever we pull is tied to revenue.',
            cards: [
                { icon: '\u{1F3AF}', h: 'Precision Targeting', p: 'Data-backed audience building, lookalikes and exclusions so your budget reaches buyers — not tire-kickers.' },
                { icon: '\u{1F3A8}', h: 'Creative That Converts', p: 'Thumb-stopping hooks and offers tested relentlessly. Winning angles get scaled, losers get cut fast.' },
                { icon: '\u{1F4CA}', h: 'Real Attribution', p: 'Pixel + Conversions API setup so you can trust the numbers and make confident scaling decisions.' },
                { icon: '\u{1F680}', h: 'Profitable Scaling', p: 'We scale spend methodically, protecting your cost per acquisition as volume climbs.' }
            ]
        },
        process: [
            { h: 'Audit & Strategy', p: 'We review your offer, funnel and past data, then map a campaign structure built around your target cost per acquisition.' },
            { h: 'Build & Launch', p: 'Tracking, audiences and first-round creative go live with clean testing so we learn fast.' },
            { h: 'Test & Optimize', p: 'We kill losers, double down on winners and refine creative and audiences daily.' },
            { h: 'Scale', p: 'Once we hit profitable, predictable results, we scale spend while defending ROAS.' }
        ],
        stats: [{ v: '$50M+', l: 'Ad Spend Managed' }, { v: '3.2x', l: 'Average ROI' }, { v: '500+', l: 'Clients Served' }, { v: '98%', l: 'Retention Rate' }],
        engagement: {
            heading: 'Month-to-Month Management, Custom-Quoted',
            intro: 'Every account is different — spend levels, creative volume and funnel complexity all shape the work. We quote a flat monthly management fee after your free strategy call, so you know exactly what you’re paying before anything starts. No percentage-of-spend surprises, no long lock-ins.',
            points: [
                'Flat monthly management fee quoted upfront — no hidden margins on your ad spend',
                'Month-to-month engagement — we keep your account by earning it',
                'Ad spend paid directly to Meta, always from your own account',
                'Weekly reporting on spend, ROAS and cost per acquisition',
                'Free strategy call and account audit before you commit to anything'
            ]
        },
        faqs: [
            { q: 'How much does Facebook Ads management cost?', a: 'We charge a flat monthly management fee quoted after a free strategy call — it depends on your ad spend, creative volume and funnel complexity, with no hidden margins on spend. Ad spend itself is separate and paid directly to Meta from your own account; most clients start between $50–$150/day so we can gather data quickly.' },
            { q: 'Is Facebook Ads worth it for a small business?', a: 'Yes — if your offer and margins support it. Meta is often the fastest way for a small business to reach new customers profitably, because you can start small, test cheaply and scale only what works. On your call we’ll tell you honestly whether the numbers can work for you.' },
            { q: 'How fast will I see results?', a: 'We typically have campaigns live within a week. The first 2–4 weeks are the learning and testing phase; profitable scaling usually follows once we’ve found winning creative and audiences.' },
            { q: 'Do you create the ad creative?', a: 'Yes. Creative is where most campaigns are won or lost. We produce statics, carousels and short-form video, and continually test new angles.' },
            { q: 'Is there a long-term contract?', a: 'No long lock-ins. We earn your business month to month with results and transparent reporting.' }
        ]
    },
    {
        slug: 'google-ads',
        label: 'Google Ads Management',
        crumb: 'Google AdWords',
        title: 'Google Ads Management | Advanced Marketing',
        desc: 'Google Ads management across Search, Shopping and Performance Max. Keyword research, ad copy, bidding and tracking that lower your cost per lead. Free audit.',
        serviceType: 'Google Ads Management',
        h1: 'Google Ads Management That <span class="text-gradient">Pays for Itself</span>',
        lead: 'When someone Googles exactly what you sell, you should be the first thing they see — and the easiest to choose. We build Google Ads campaigns that turn high-intent searches into customers.',
        includes: {
            heading: 'Full-Funnel Google Coverage',
            intro: 'Search, Shopping, Performance Max, Display and YouTube — structured around the keywords and queries that actually convert for your business.',
            items: [
                'Deep keyword and competitor research mapped to buyer intent',
                'Tightly themed campaign and ad-group structure for high Quality Scores',
                'High-converting ad copy and assets, tested continuously',
                'Conversion tracking and Google Analytics 4 setup done right',
                'Bid strategy and budget management to protect cost per lead',
                'Negative keyword sculpting to cut wasted spend'
            ]
        },
        features: {
            label: 'What You Get',
            heading: 'Spend Less, Convert More',
            intro: 'Wasted clicks are the silent killer of Google Ads. We engineer accounts to put budget only where it pays.',
            cards: [
                { icon: '\u{1F50D}', h: 'Intent-Based Keywords', p: 'We target the searches of people ready to buy and filter out the rest with rigorous negative keyword work.' },
                { icon: '\u{270D}', h: 'Compelling Ad Copy', p: 'Ads written to win the click and pre-qualify the lead, paired with landing pages that close.' },
                { icon: '\u{1F4C9}', h: 'Lower Cost Per Lead', p: 'Quality Score optimization and smart bidding bring your cost per acquisition down over time.' },
                { icon: '\u{1F4F2}', h: 'Watertight Tracking', p: 'Proper conversion tracking and GA4 so every dollar is accountable to a result.' }
            ]
        },
        process: [
            { h: 'Account Audit', p: 'We assess your current account (or build from scratch), find wasted spend and map high-intent keywords.' },
            { h: 'Build & Track', p: 'Campaigns, ad groups, copy and conversion tracking are set up for clean data from day one.' },
            { h: 'Optimize', p: 'We refine bids, keywords, negatives and copy weekly to drive down cost per lead.' },
            { h: 'Scale Profitably', p: 'We expand into new keywords, Shopping and Performance Max as ROI proves out.' }
        ],
        stats: [{ v: '3.2x', l: 'Average ROI' }, { v: '500+', l: 'Clients Served' }, { v: '24/7', l: 'AI Support' }, { v: '98%', l: 'Retention Rate' }],
        engagement: {
            heading: 'A Flat Monthly Fee. Your Account, Your Data.',
            intro: 'We quote a custom monthly management fee after a free audit of your account and market — based on campaign count, spend and goals. You keep full ownership of your Google Ads account and data; we work inside it, so everything we build stays yours.',
            points: [
                'Custom monthly quote after a free account audit — no percentage-of-spend fees',
                'You own the account, the data and the history, forever',
                'Ad spend paid directly to Google from your own billing',
                'Weekly optimization and transparent reporting on cost per lead',
                'No long-term contracts — month to month, earned with results'
            ]
        },
        faqs: [
            { q: 'How much does Google Ads management cost?', a: 'We charge a flat monthly management fee quoted after a free audit — sized to your campaign count, spend and goals, never a percentage of your ad spend. Ad spend is paid directly to Google from your own account; most small businesses start with $1,500–$3,000/month in spend.' },
            { q: 'Is Google Ads worth it for a small business?', a: 'For businesses whose customers search before they buy — most local and service businesses — it’s often the highest-intent channel there is. Tight keyword and negative-keyword discipline keeps budgets small-business friendly while you prove ROI.' },
            { q: 'Search, Shopping or Performance Max — which do I need?', a: 'It depends on your business. Service businesses usually start with Search; e-commerce brands benefit from Shopping and Performance Max. We’ll recommend the right mix on your strategy call.' },
            { q: 'Will I own my Google Ads account?', a: 'Always. We build inside your own account so you keep full ownership of the data and history if we ever part ways.' },
            { q: 'How soon will I get leads?', a: 'Search campaigns can produce leads within days of launch. We then spend the following weeks optimizing to lower your cost per lead.' }
        ]
    },
    {
        slug: 'pr-press',
        label: 'PR & Press Relations',
        crumb: 'PR & Press',
        title: 'PR & Press Relations | Advanced Marketing',
        desc: 'PR and press relations that earn coverage in publications your audience trusts. Story strategy, press releases and journalist outreach that convert.',
        serviceType: 'PR & Press Relations',
        h1: 'PR & Press Relations That Make You <span class="text-gradient">Impossible to Ignore</span>',
        lead: 'A logo from a publication your audience respects does what ads can’t — it borrows credibility instantly. We secure the coverage that makes prospects say "I’ve heard of them."',
        includes: {
            heading: 'PR That Drives Business, Not Just Clippings',
            intro: 'We don’t chase vanity press. We pursue coverage that builds authority, supports SEO and converts attention into customers.',
            items: [
                'PR strategy and story angles built around your brand and goals',
                'Press release writing and distribution to relevant outlets',
                'Targeted media and journalist outreach in your niche',
                'Securing features, interviews and guest articles in respected publications',
                '"As Featured In" assets you can use across your site and ads',
                'Reputation and brand-narrative support'
            ]
        },
        features: {
            label: 'What You Get',
            heading: 'Authority You Can’t Buy With Ads',
            intro: 'Earned media compounds. One strong feature keeps working for you for years.',
            cards: [
                { icon: '\u{1F4F0}', h: 'Major Publication Coverage', p: 'Placements and features in outlets your audience already reads and trusts.' },
                { icon: '\u{1F91D}', h: 'Journalist Relationships', p: 'Real outreach to real reporters in your space — not spray-and-pray press blasts.' },
                { icon: '⭐', h: 'Instant Credibility', p: '"As Featured In" badges that lift conversion rates across your funnel.' },
                { icon: '\u{1F50D}', h: 'SEO & Brand Lift', p: 'Authoritative backlinks and branded search that strengthen your whole marketing engine.' }
            ]
        },
        process: [
            { h: 'Story Discovery', p: 'We find the angles in your business that journalists actually want to cover.' },
            { h: 'Asset Creation', p: 'We craft press releases, pitches and media kits tailored to each outlet.' },
            { h: 'Outreach', p: 'We pitch the right journalists and publications in your niche and follow up persistently.' },
            { h: 'Amplify', p: 'We help you turn coverage into trust assets across your site, ads and sales process.' }
        ],
        stats: [{ v: '500+', l: 'Clients Served' }, { v: '3.2x', l: 'Average ROI' }, { v: 'Global', l: 'Media Reach' }, { v: '98%', l: 'Retention Rate' }],
        engagement: {
            heading: 'Campaign-Based PR, Quoted Per Scope',
            intro: 'PR engagements are scoped around your goals — a single launch push or an ongoing authority campaign. After a free strategy call you get a fixed quote for the campaign, so costs are clear before any outreach begins.',
            points: [
                'Fixed campaign quote after a free strategy call — no open-ended retainers required',
                'Story strategy, press assets and journalist outreach included',
                '"As Featured In" assets delivered for your site, ads and sales deck',
                'Honest assessment first — if PR isn’t the right lever yet, we’ll say so',
                'Ongoing authority campaigns available for compounding coverage'
            ]
        },
        faqs: [
            { q: 'How much does PR and press outreach cost?', a: 'PR is quoted per campaign scope after a free strategy call — a single product launch push costs less than an ongoing authority campaign. You get a fixed quote before any work begins, so there are no open-ended retainer surprises.' },
            { q: 'Is PR worth it for a small business?', a: 'If your buyers research before they purchase, yes. A handful of placements in publications your audience trusts lifts conversion rates across every other channel — ads, email and sales calls all close easier with third-party credibility behind you.' },
            { q: 'Can you guarantee coverage in a specific publication?', a: 'No reputable PR firm can guarantee a specific outlet — editorial decisions belong to journalists. What we guarantee is a strong, persistent, professional outreach effort built on genuinely newsworthy angles.' },
            { q: 'How is this different from buying ads?', a: 'Ads are paid and stop the moment you stop paying. Earned media is credibility you can’t buy directly — it builds trust, SEO authority and brand recall that compound over time.' },
            { q: 'How long until we see coverage?', a: 'PR is a longer game than ads. Initial placements often land within the first 1–3 months as relationships and pitches mature.' }
        ]
    },
    {
        slug: 'ecommerce-website',
        label: 'E-commerce Websites',
        crumb: 'E-commerce',
        title: 'E-commerce Website Design | Advanced Marketing',
        desc: 'E-commerce website design for high-converting Shopify stores — custom design, payments, checkout optimization and ad-ready tracking. 500+ clients served.',
        serviceType: 'E-commerce Website Design',
        h1: 'E-commerce Website Design That <span class="text-gradient">Sells, Not Just Sits There</span>',
        lead: 'A beautiful store that doesn’t convert is an expensive brochure. We design and build Shopify stores engineered around the buyer’s journey — fast, trustworthy and optimized to close the sale.',
        includes: {
            heading: 'A Complete, Conversion-Ready Storefront',
            intro: 'From design to checkout, we build a store that’s ready to take orders and scale with your marketing.',
            items: [
                'Custom Shopify design that reflects your brand and builds trust',
                'Mobile-first, fast-loading pages (where most sales happen)',
                'Payment, shipping and tax configuration done correctly',
                'Product page and checkout optimization to lift conversion rate',
                'Email/SMS capture and abandoned-cart flows wired in',
                'Analytics and ad-tracking ready for paid traffic'
            ]
        },
        features: {
            label: 'What You Get',
            heading: 'Designed Around the Sale',
            intro: 'Every element — from hero to checkout — is built to move the visitor one step closer to buying.',
            cards: [
                { icon: '\u{1F6D2}', h: 'High-Converting Design', p: 'Layouts proven to build trust and reduce friction from first click to confirmed order.' },
                { icon: '\u{1F4F1}', h: 'Mobile-First & Fast', p: 'Optimized for the phones where most shopping happens — speed that protects conversions.' },
                { icon: '\u{1F4B3}', h: 'Frictionless Checkout', p: 'Clean payment, shipping and tax setup so nothing stands between desire and purchase.' },
                { icon: '\u{1F4C8}', h: 'Built to Scale', p: 'Tracking and capture flows ready so your Facebook and Google Ads convert from day one.' }
            ]
        },
        process: [
            { h: 'Discovery', p: 'We learn your products, margins and customers, then map the store and offer structure.' },
            { h: 'Design & Build', p: 'We design and build a custom, conversion-focused Shopify store on-brand and mobile-first.' },
            { h: 'Optimize', p: 'We wire in tracking, capture and cart-recovery flows, then test for conversion.' },
            { h: 'Launch & Grow', p: 'We launch, connect your ads and support ongoing conversion improvements.' }
        ],
        stats: [{ v: '$35K+', l: 'Generated in 90 Days*' }, { v: '500+', l: 'Clients Served' }, { v: '3.2x', l: 'Average ROI' }, { v: '98%', l: 'Retention Rate' }],
        engagement: {
            heading: 'Fixed-Scope Builds, Quoted Upfront',
            intro: 'Store builds are quoted as a fixed project price after a free discovery call — based on catalog size, design complexity and integrations. You approve the full scope and price before we start; no hourly billing creep.',
            points: [
                'Fixed project quote before work begins — no hourly surprises',
                'Custom Shopify design, build and launch included end to end',
                'Payments, shipping, tax and ad tracking configured for you',
                'Post-launch support and CRO retainers available, never required',
                'You own the store, the domain and all the data'
            ]
        },
        faqs: [
            { q: 'How much does an e-commerce website cost?', a: 'It depends on catalog size, design complexity and integrations — which is why we quote a fixed project price after a free discovery call. You approve the exact scope and price before any work starts, so there’s never billing creep.' },
            { q: 'Is Shopify worth it for a small business?', a: 'For most small e-commerce brands, yes — it’s reliable, secure and scales without a developer on retainer. We specialize in Shopify because it lets us launch fast and keeps your running costs predictable.' },
            { q: 'Can you redesign my existing store?', a: 'Yes. We can rebuild or optimize an existing Shopify store to improve conversion rate, speed and trust without losing your history.' },
            { q: 'Will the store be ready for paid ads?', a: 'Absolutely — we set up the pixel/tracking, capture flows and analytics so your Facebook and Google Ads can convert profitably from launch.' },
            { q: 'Do you offer ongoing support?', a: 'Yes. Many clients keep us on for conversion optimization, new product launches and ad management after launch.' }
        ]
    },
    {
        slug: 'ai-software',
        label: 'AI Software & Automation',
        crumb: 'AI Software',
        title: 'AI Software & Automation | Advanced Marketing',
        desc: 'Custom AI software and automation — voice agents, chatbots and workflows that cut costs, answer every lead 24/7 and plug into the tools you already use.',
        serviceType: 'AI Software & Automation',
        h1: 'AI Software & Automation That <span class="text-gradient">Works While You Sleep</span>',
        lead: 'Imagine a tireless employee that answers every lead in seconds, books calls while you sleep and handles the repetitive work eating your team’s day. That’s what we build — custom AI tools wired into how you actually operate.',
        includes: {
            heading: 'Automation That Pays for Itself',
            intro: 'We identify the repetitive, revenue-leaking tasks in your business and replace them with reliable AI systems.',
            items: [
                'AI voice agents that answer calls, qualify and book — 24/7',
                'Website and chat assistants that capture and convert leads instantly',
                'Workflow automations that connect your tools and kill manual busywork',
                'Custom internal tools and dashboards tailored to your operation',
                'CRM, calendar and messaging integrations',
                'Setup, training and ongoing optimization'
            ]
        },
        features: {
            label: 'What You Get',
            heading: 'Lower Costs, Faster Response, Happier Customers',
            intro: 'AI doesn’t replace your team — it frees them from the work machines should be doing.',
            cards: [
                { icon: '\u{1F916}', h: 'AI Voice & Chat Agents', p: 'Answer every inquiry in seconds, qualify leads and book appointments around the clock.' },
                { icon: '⚡', h: 'Workflow Automation', p: 'Connect your stack and automate the repetitive tasks silently draining hours every week.' },
                { icon: '\u{1F4B0}', h: 'Lower Operating Cost', p: 'Handle more volume without adding headcount — automation that earns its keep.' },
                { icon: '\u{1F551}', h: 'Never Miss a Lead', p: 'Instant response, 24/7. Speed-to-lead is the single biggest driver of conversion.' }
            ]
        },
        process: [
            { h: 'Map the Leaks', p: 'We audit your operations to find where leads slip, time is wasted and AI can help most.' },
            { h: 'Design the System', p: 'We design AI agents and automations around your real workflows and tools.' },
            { h: 'Build & Integrate', p: 'We build, connect to your CRM/calendar/messaging and train the system on your business.' },
            { h: 'Refine', p: 'We monitor, tune and expand automations as they prove their ROI.' }
        ],
        stats: [{ v: '24/7', l: 'AI Availability' }, { v: '500+', l: 'Clients Served' }, { v: '3.2x', l: 'Average ROI' }, { v: '98%', l: 'Retention Rate' }],
        engagement: {
            heading: 'Scoped Builds With a Clear Payback',
            intro: 'We scope each automation around a measurable outcome — leads captured, hours saved, calls answered — then quote a fixed build price. Ongoing optimization is optional and month to month. Prefer owning tools outright? We also sell <a href="/software/" style="color:var(--gold);">pay-once software</a> we built and use ourselves.',
            points: [
                'Fixed build quote tied to a measurable business outcome',
                'Integrates with your existing CRM, calendar and messaging tools',
                'Training, documentation and handover included',
                'Optional month-to-month optimization and expansion',
                'Try a live example — the AI voice chat on this very site'
            ]
        },
        faqs: [
            { q: 'How much does custom AI software cost?', a: 'Each build is quoted as a fixed price after we map your workflows on a free strategy call — scoped to a measurable outcome like leads captured or hours saved. Most automations pay for themselves by catching leads you’d otherwise miss. If you want a lower-cost starting point, our pay-once tools in the software section are a good fit.' },
            { q: 'Is AI automation worth it for a small business?', a: 'Small businesses often benefit most — speed-to-lead is the biggest driver of conversion, and an AI agent answers every inquiry in seconds, 24/7, without adding headcount. Start with one high-leverage automation and expand as it proves ROI.' },
            { q: 'What can the AI voice agent actually do?', a: 'It can answer calls and website chats, answer common questions, qualify prospects and book them straight into your calendar — in a natural, on-brand voice, 24/7. The chat widget on this site is a live example.' },
            { q: 'Will this integrate with my current tools?', a: 'Yes. We connect AI agents and automations to your CRM, calendar, email and messaging tools so everything flows into your existing systems.' },
            { q: 'Do I need technical knowledge?', a: 'Not at all. We handle the build, integration and training — you just get the results and a simple way to manage them.' }
        ]
    },
    {
        slug: 'cro',
        label: 'Conversion Rate Optimization',
        crumb: 'CRO',
        title: 'Conversion Rate Optimization | Advanced Marketing',
        desc: 'Conversion rate optimization that turns existing traffic into more revenue — funnel audits, A/B testing and landing page optimization with clear reporting.',
        serviceType: 'Conversion Rate Optimization',
        h1: 'Conversion Rate Optimization That <span class="text-gradient">Multiplies Every Dollar</span>',
        lead: 'You don’t always need more traffic — you need more of it to convert. CRO is the highest-leverage marketing investment there is: the same visitors, the same spend, more revenue.',
        includes: {
            heading: 'Find the Leaks. Fix Them. Repeat.',
            intro: 'We systematically identify where visitors drop off and run experiments that lift conversion rate across your funnel.',
            items: [
                'Full funnel and landing-page conversion audit',
                'Heatmaps, session analysis and analytics deep-dive',
                'Prioritized testing roadmap based on impact and effort',
                'A/B and multivariate testing of headlines, layouts, offers and CTAs',
                'Landing page and checkout optimization',
                'Clear reporting on lift and revenue impact'
            ]
        },
        features: {
            label: 'What You Get',
            heading: 'The Highest-ROI Lever in Marketing',
            intro: 'A small lift in conversion rate multiplies the return on every other dollar you spend.',
            cards: [
                { icon: '\u{1F50E}', h: 'Data, Not Guesses', p: 'We use heatmaps, analytics and session data to find exactly where and why visitors leave.' },
                { icon: '\u{1F9EA}', h: 'Rigorous A/B Testing', p: 'Structured experiments on headlines, offers, layouts and CTAs — we keep what wins.' },
                { icon: '\u{1F4C8}', h: 'Compounding Returns', p: 'Every conversion gain makes your ads, SEO and email more profitable automatically.' },
                { icon: '\u{1F3AF}', h: 'Funnel-Wide Fixes', p: 'From first click to checkout, we remove the friction quietly costing you sales.' }
            ]
        },
        process: [
            { h: 'Audit', p: 'We analyze your funnel, traffic and data to pinpoint where conversions are leaking.' },
            { h: 'Prioritize', p: 'We build a testing roadmap ranked by potential impact and ease of implementation.' },
            { h: 'Test', p: 'We run controlled A/B experiments so changes are proven, not guessed.' },
            { h: 'Scale Wins', p: 'Winning variations get rolled out, and we move to the next highest-impact test.' }
        ],
        stats: [{ v: '3.2x', l: 'Average ROI' }, { v: '500+', l: 'Clients Served' }, { v: 'Data', l: 'Driven Decisions' }, { v: '98%', l: 'Retention Rate' }],
        engagement: {
            heading: 'A Month-to-Month Testing Program',
            intro: 'CRO is an ongoing discipline, so we run it as a monthly testing program quoted after a free funnel audit. Every month has a clear testing roadmap and a report on lift and revenue impact — you always know what ran and what it earned.',
            points: [
                'Custom monthly quote after a free funnel audit',
                'Prioritized testing roadmap reviewed with you each month',
                'We design, build and run the experiments — you approve what ships',
                'Clear reporting on conversion lift and revenue impact',
                'No long contracts — compounding wins are the reason to stay'
            ]
        },
        faqs: [
            { q: 'How much does conversion rate optimization cost?', a: 'CRO runs as a month-to-month program quoted after a free funnel audit — sized to your traffic volume and testing velocity. The audit itself is free, and even the first round of quick fixes often pays for the program.' },
            { q: 'Is CRO worth it for a small business?', a: 'If you’re paying for any traffic at all, yes — a lift from 2% to 3% conversion is a 50% revenue increase from the same spend. Lower-traffic sites still benefit from expert audits and best-practice fixes before formal A/B testing becomes viable.' },
            { q: 'Do I need a lot of traffic for CRO to work?', a: 'More traffic lets tests reach significance faster, but even lower-traffic sites benefit from expert audits and best-practice fixes. We’ll assess your situation on the call.' },
            { q: 'Does CRO work with my ad campaigns?', a: 'It supercharges them. Lifting conversion rate lowers your effective cost per acquisition, making every ad dollar go further — which is why we often pair CRO with paid media.' },
            { q: 'What do you actually test?', a: 'Headlines, offers, page layouts, calls-to-action, forms, checkout flow and trust elements — anything that influences whether a visitor takes action.' }
        ]
    }
];

function buildServicePage(s) {
    const canonical = `https://advancedmarketing.co/services/${s.slug}`;
    const body =
        heroBlock({ crumb: s.crumb, label: s.label, h1: s.h1, lead: s.lead }) +
        includesSection(s.includes.label || 'What’s Included', s.includes.heading, s.includes.intro, s.includes.items) +
        featureSection(s.features.label, s.features.heading, s.features.intro, s.features.cards) +
        processSection(s.process) +
        statBand(s.stats) +
        engagementSection(s.engagement) +
        faqSection(s.faqs) +
        relatedSection(s.slug) +
        CTA_SECTION;
    const schema = graph([
        serviceSchema(canonical, s.serviceType || s.label, s.desc),
        faqSchema(canonical, s.faqs),
        breadcrumbSchema([
            { name: 'Home', url: 'https://advancedmarketing.co/' },
            { name: 'Services', url: 'https://advancedmarketing.co/services' },
            { name: s.crumb, url: canonical }
        ])
    ]);
    return page({
        canonical,
        title: s.title,
        desc: s.desc,
        schema,
        body
    });
}

/* ---------- 5. Services hub page ---------- */
function buildServicesHub() {
    const canonical = 'https://advancedmarketing.co/services';
    const cards = [
        { href: '/services/facebook-ads', bg: 'rgba(59,130,246,0.15)', icon: '\u{1F4E3}', h: 'Facebook & Instagram Ads', p: 'Full-funnel Meta campaigns engineered around your return on ad spend — creative, targeting, testing and profitable scaling.' },
        { href: '/services/google-ads', bg: 'rgba(16,185,129,0.15)', icon: '\u{1F50D}', h: 'Google Ads', p: 'Capture high-intent demand the moment people search. Search, Shopping and Performance Max managed for a lower cost per lead.' },
        { href: '/services/pr-press', bg: 'rgba(245,158,11,0.15)', icon: '\u{1F4F0}', h: 'PR & Press Relations', p: 'Earn coverage in publications your audience trusts — authority and credibility you can’t buy with ads alone.' },
        { href: '/services/ecommerce-website', bg: 'rgba(168,85,247,0.15)', icon: '\u{1F6D2}', h: 'E-commerce Websites', p: 'Custom, high-converting Shopify stores built around the buyer’s journey and ready for paid traffic from day one.' },
        { href: '/services/ai-software', bg: 'rgba(6,182,212,0.15)', icon: '\u{1F916}', h: 'AI Software & Automation', p: 'Custom AI voice agents, chatbots and workflow automation that cut costs, capture leads and run 24/7.' },
        { href: '/services/cro', bg: 'rgba(244,63,94,0.15)', icon: '\u{1F4C8}', h: 'Conversion Rate Optimization', p: 'Turn the traffic you already have into more customers with data-driven testing and funnel optimization.' }
    ];
    const body = `
        <section class="page-hero" aria-label="Our services">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <span>Services</span></nav>
                <span class="text-label">Full-Service Marketing</span>
                <h1>One Team for <span class="text-gradient">Every Growth Lever</span></h1>
                <p class="lead">Paid ads, PR, e-commerce, AI automation and conversion optimization — working together under one roof. No silos, no finger-pointing, just measurable growth.</p>
                <div class="hero-ctas">
                    <a href="#contact" class="btn btn-primary">Book Free Strategy Call &rarr;</a>
                    <a href="/case-studies" class="btn btn-outline">View Our Work &nearr;</a>
                </div>
            </div>
        </section>

        <section class="section section-alt" aria-label="Services list">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">What We Do</span>
                    <h2>Pick a Lever — or Let Us Build the Whole Engine</h2>
                    <p>Most clients start with one service and expand as results come in. Explore each below, then book a free call and we’ll recommend the highest-impact place to start for your business.</p>
                </div>
                <div class="services-grid">
                    ${cards.map(c => `
                    <a href="${c.href}" class="service-card">
                        <div class="service-icon" style="background:${c.bg};" aria-hidden="true">${c.icon}</div>
                        <h3>${c.h}</h3>
                        <p>${c.p}</p>
                    </a>`).join('')}
                </div>
                <aside class="local-banner">
                    <div>
                        <h3>Websites for Local Businesses</h3>
                        <p>Professional websites with AI receptionists for 15+ industries — restaurants, dental offices, law firms and more. Starting at $1,000 with ongoing support included.</p>
                    </div>
                    <a href="https://website.advancedmarketing.co" class="btn btn-primary" style="white-space:nowrap;">Start Your Project &rarr;</a>
                </aside>
            </div>
        </section>

        ${processSection([
            { h: 'Free Strategy Call', p: 'We learn your business and goals, then show you exactly where the biggest, fastest wins are.' },
            { h: 'Tailored Plan', p: 'You get a clear, prioritized plan — which levers to pull first and what results to expect.' },
            { h: 'Execution', p: 'Our team builds, launches and manages everything, with transparent reporting throughout.' },
            { h: 'Scale', p: 'We double down on what works and expand into new channels as ROI proves out.' }
        ])}

        ${statBand([{ v: '500+', l: 'Clients Served' }, { v: '$50M+', l: 'Ad Spend Managed' }, { v: '3.2x', l: 'Average ROI' }, { v: '98%', l: 'Retention Rate' }])}

        ${CTA_SECTION}`;

    const schema = graph([
        {
            '@type': 'Service',
            provider: { '@id': ORG_ID, '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co' },
            areaServed: 'Worldwide',
            url: canonical,
            description: 'Full-service marketing agency offering Facebook & Instagram ads, Google Ads, PR, e-commerce websites, AI software and conversion rate optimization.'
        },
        breadcrumbSchema([
            { name: 'Home', url: 'https://advancedmarketing.co/' },
            { name: 'Services', url: canonical }
        ])
    ]);
    return page({ canonical, title: 'Marketing Services | Advanced Marketing', desc: 'Full-service marketing: Facebook & Google Ads, PR, e-commerce websites, AI automation and CRO. 500+ clients served, 3.2x average ROI.', schema, body });
}

/* ---------- 6. About page ---------- */
function buildAbout() {
    const canonical = 'https://advancedmarketing.co/about';
    const body = `
        <section class="page-hero" aria-label="About Advanced Marketing">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <span>About</span></nav>
                <span class="text-label">About Advanced Marketing</span>
                <h1>We Exist to Make Marketing <span class="text-gradient">Accountable to Revenue</span></h1>
                <p class="lead">Founded in 2020 and headquartered in Hong Kong, Advanced Marketing is a full-service agency that treats your budget like our own. We don’t sell activity — we sell outcomes.</p>
                <div class="hero-ctas">
                    <a href="#contact" class="btn btn-primary">Work With Us &rarr;</a>
                    <a href="/case-studies" class="btn btn-outline">See Our Results &nearr;</a>
                </div>
            </div>
        </section>

        <section class="section" aria-label="Our story">
            <div class="container">
                <div class="two-col">
                    <div>
                        <span class="text-label">Our Story</span>
                        <h2 style="font-size:clamp(2rem,4vw,3rem);margin:0.75rem 0 1rem;">Built by Operators, Not Just Marketers</h2>
                        <p style="color:var(--text-muted);margin-bottom:1.25rem;">Advanced Marketing started with a simple frustration: too many agencies hide behind vanity metrics and jargon while clients wonder where their money went. We built the opposite — a team obsessed with the numbers that actually move a business: cost per acquisition, return on ad spend, and revenue.</p>
                        <p style="color:var(--text-muted);margin-bottom:1.25rem;">Since 2020 we’ve served over 500 clients across e-commerce, local services and personal brands, managing more than $50M in ad spend and delivering an average 3.2x return on investment. From Facebook and Google campaigns to PR, AI automation and conversion optimization, everything we do is tied back to growth you can measure.</p>
                        <p style="color:var(--text-muted);">Led by founder Benjamin Boyce, we work as an extension of your team — strategic enough to set direction, hands-on enough to execute.</p>
                    </div>
                    <div class="two-col-img why-image">
                        <picture>
                            <source srcset="/hong-kong-office.jpg" type="image/jpeg">
                            <img src="/hong-kong-office.jpg" alt="Advanced Marketing, headquartered in Hong Kong" width="600" height="400" loading="lazy">
                        </picture>
                    </div>
                </div>
            </div>
        </section>

        ${statBand([{ v: '500+', l: 'Clients Served' }, { v: '$50M+', l: 'Ad Spend Managed' }, { v: '3.2x', l: 'Average ROI' }, { v: '98%', l: 'Retention Rate' }])}

        ${featureSection('What We Value', 'Principles We Don’t Compromise On', 'These aren’t poster slogans — they’re how we make decisions every day.', [
            { icon: '\u{1F4CA}', h: 'Results Over Activity', p: 'We report on revenue and ROI, not impressions and busywork. If it doesn’t move the business, it doesn’t matter.' },
            { icon: '\u{1F50D}', h: 'Radical Transparency', p: 'You always know what we’re doing, what it costs and what it’s producing. No black boxes.' },
            { icon: '\u{1F91D}', h: 'Partners, Not Vendors', p: 'We win when you win. We think like owners and treat your budget like our own money.' },
            { icon: '⚡', h: 'Speed & Adaptability', p: 'Markets move fast. We test quickly, kill what fails and double down on what works.' }
        ])}

        <section class="section" aria-label="Why choose us">
            <div class="container">
                <div class="section-header" style="margin:0 auto 3rem;text-align:center;">
                    <span class="text-label">Why Advanced Marketing</span>
                    <h2>Everything You Need, Under One Roof</h2>
                    <p style="margin-left:auto;margin-right:auto;">Stop stitching together five vendors who blame each other. Get one accountable team across every channel.</p>
                </div>
                <div style="max-width:760px;margin:0 auto;">
                    <ul class="check-list">
                        <li>Full-service across paid ads, PR, e-commerce, AI and CRO — strategy through execution</li>
                        <li>A senior, experienced team with proven results across industries worldwide</li>
                        <li>Transparent reporting tied to revenue, not vanity metrics</li>
                        <li>Month-to-month flexibility — we keep your business by earning it</li>
                        <li>1-on-1 coaching available directly with founder Benjamin Boyce</li>
                    </ul>
                    <div style="text-align:center;margin-top:2.5rem;">
                        <a href="/team" class="btn btn-outline">Meet the Team &rarr;</a>
                    </div>
                </div>
            </div>
        </section>

        ${CTA_SECTION}`;

    const schema = graph([
        {
            '@type': 'AboutPage',
            url: canonical,
            mainEntity: { '@id': ORG_ID }
        },
        breadcrumbSchema([
            { name: 'Home', url: 'https://advancedmarketing.co/' },
            { name: 'About', url: canonical }
        ])
    ]);
    return page({ canonical, title: 'About Advanced Marketing | Full-Service Marketing Agency', desc: 'Full-service agency founded in 2020 in Hong Kong. 500+ clients, $50M+ ad spend managed, 3.2x average ROI — marketing accountable to revenue.', schema, body });
}

/* ---------- 7. Write everything ---------- */
const outputs = [];
outputs.push(['about/index.html', buildAbout()]);
outputs.push(['services/index.html', buildServicesHub()]);
services.forEach(s => outputs.push([`services/${s.slug}/index.html`, buildServicePage(s)]));

outputs.forEach(([rel, html]) => {
    const full = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, html, 'utf8');
    console.log('wrote', rel, '(' + html.length + ' bytes)');
});
console.log('\nDone. css/site.css =', (baseCss + EXTRA_CSS).length, 'bytes');
