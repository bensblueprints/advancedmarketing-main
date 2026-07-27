/*
 * build-missing-pages.js — generates the pages that were linked site-wide but
 * never built: /case-studies, /case-study/herban-bud, /case-study/burger and
 * /ecommerce-blueprint. Reuses the shared nav/footer/scripts by extracting
 * them from about/index.html so the chrome stays identical everywhere.
 *
 * Run:  node build-missing-pages.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const about = fs.readFileSync(path.join(ROOT, 'about', 'index.html'), 'utf8');

const navStart = about.indexOf('<a href="#main-content"');
const navEnd = about.indexOf('</header>') + '</header>'.length;
const NAV = about.slice(navStart, navEnd);

const footStart = about.indexOf('<footer class="site-footer">');
const FOOTER = about.slice(footStart, about.indexOf('</html>') + '</html>'.length);

/* Reuse the sitewide Organization/ProfessionalService/WebSite schema that
 * build-pages.js injects into every generated page (about is the source). */
const schemaMatch = about.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/);
const SHARED_SCHEMA_TAG = schemaMatch ? schemaMatch[0] : '';

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

function graph(nodes) {
    return { '@context': 'https://schema.org', '@graph': nodes.map(x => { const { '@context': _c, ...rest } = x; return rest; }) };
}

function page({ canonical, title, desc, schema, body }) {
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
    ${SHARED_SCHEMA_TAG}
    ${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
</head>
<body>

    ${NAV}
    <main id="main-content" role="main">
${body}
    </main>
    ${FOOTER}
`;
}

const CTA_SECTION = `
        <section class="section" aria-label="Work with us">
            <div class="container" style="text-align:center;">
                <span class="text-label">Ready for Results Like These?</span>
                <h2 style="font-size:clamp(2rem,4vw,3rem);margin:0.75rem 0 1rem;">Let's Build Your Growth Story</h2>
                <p style="color:var(--text-muted);max-width:600px;margin:0 auto 2rem;">Book a free strategy call and we'll map out exactly how to apply these same systems to your business.</p>
                <a href="/#contact" class="btn btn-primary">Book Free Strategy Call &rarr;</a>
            </div>
        </section>`;

const herbanCard = `
                    <a href="/case-study/herban-bud" class="case-card">
                        <div class="case-img">
                            <picture>
                                <source srcset="/herban-bud-ad.webp" type="image/webp">
                                <img src="/herban-bud-ad.png" alt="Herban Bud cannabis e-commerce advertising campaign" width="600" height="250" loading="lazy">
                            </picture>
                            <div class="case-badge"><span class="text-label" style="color:var(--gold);">Cannabis E-commerce</span></div>
                        </div>
                        <div class="case-content">
                            <h3>Herban Bud</h3>
                            <p class="case-subtitle">From launch to $30K in revenue within 30 days through targeted Facebook advertising and strategic brand positioning.</p>
                            <div class="case-stats">
                                <div><div class="stat-value">$30K</div><div class="stat-label">Revenue in 30 Days</div></div>
                                <div><div class="stat-value">1:1</div><div class="stat-label">Return on Ad Spend</div></div>
                            </div>
                        </div>
                    </a>`;

const burgerCard = `
                    <a href="/case-study/burger" class="case-card">
                        <div class="case-img">
                            <picture>
                                <source srcset="/burger-ad-1.webp" type="image/webp">
                                <img src="/burger-ad-1.png" alt="Quarter Pounder creative marketing campaign" width="600" height="250" loading="lazy">
                            </picture>
                            <div class="case-badge"><span class="text-label" style="color:var(--gold);">Strategic Marketing</span></div>
                        </div>
                        <div class="case-content">
                            <h3>Quarter Pounder</h3>
                            <p class="case-subtitle">Creative cannabis marketing campaign with strategic positioning that achieved dollar-for-dollar returns on customer acquisition.</p>
                            <div class="case-stats">
                                <div><div class="stat-value">$99</div><div class="stat-label">Customer Acquisition Cost</div></div>
                                <div><div class="stat-value">$99</div><div class="stat-label">Average Order Value</div></div>
                            </div>
                        </div>
                    </a>`;

/* ---------- /case-studies ---------- */
function buildCaseStudiesHub() {
    const canonical = 'https://advancedmarketing.co/case-studies';
    const body = `
        <section class="page-hero" aria-label="Case studies">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <span>Case Studies</span></nav>
                <span class="text-label">Case Studies</span>
                <h1>Proven Results, <span class="text-gradient">Real Growth</span></h1>
                <p class="lead">See how we have helped businesses across industries achieve measurable results through strategic marketing, creative advertising, and data-driven optimization.</p>
                <div class="hero-ctas">
                    <a href="/#contact" class="btn btn-primary">Book Free Strategy Call &rarr;</a>
                    <a href="/portfolio" class="btn btn-outline">View Portfolio &nearr;</a>
                </div>
            </div>
        </section>

        <section class="section section-alt" aria-label="Featured case studies">
            <div class="container">
                <div class="case-studies-grid">
${herbanCard}
${burgerCard}
                </div>
            </div>
        </section>

        <section class="section" aria-label="Results at a glance">
            <div class="container">
                <div class="stat-row">
                    <div><div class="stat-value text-gradient">500+</div><div class="stat-label">Clients Served</div></div><div><div class="stat-value text-gradient">$50M+</div><div class="stat-label">Ad Spend Managed</div></div><div><div class="stat-value text-gradient">3.2x</div><div class="stat-label">Average ROI</div></div><div><div class="stat-value text-gradient">98%</div><div class="stat-label">Retention Rate</div></div>
                </div>
            </div>
        </section>
${CTA_SECTION}`;
    const schema = graph([
        {
            '@type': 'CollectionPage', url: canonical,
            name: 'Case Studies | Advanced Marketing',
            publisher: { '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co' }
        },
        breadcrumbSchema([
            { name: 'Home', url: 'https://advancedmarketing.co/' },
            { name: 'Case Studies', url: canonical }
        ])
    ]);
    return page({ canonical, title: 'Case Studies | Advanced Marketing', desc: 'Real client results: $30K in 30 days for Herban Bud, dollar-for-dollar acquisition for Quarter Pounder, and more measurable growth stories from Advanced Marketing.', schema, body });
}

/* ---------- shared case-study layout ---------- */
function caseStudyBody({ crumbLabel, label, h1, lead, statRow, sections, otherCard }) {
    return `
        <section class="page-hero" aria-label="${crumbLabel} case study">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <a href="/case-studies">Case Studies</a> &nbsp;/&nbsp; <span>${crumbLabel}</span></nav>
                <span class="text-label">${label}</span>
                <h1>${h1}</h1>
                <p class="lead">${lead}</p>
                <div class="hero-ctas">
                    <a href="/#contact" class="btn btn-primary">Get Results Like These &rarr;</a>
                    <a href="/case-studies" class="btn btn-outline">All Case Studies &nearr;</a>
                </div>
            </div>
        </section>

        <section class="section section-alt" aria-label="Key results">
            <div class="container">
                <div class="stat-row">
${statRow}
                </div>
            </div>
        </section>
${sections}
        <section class="section section-alt" aria-label="More case studies">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">Keep Reading</span>
                    <h2>More Case Studies</h2>
                </div>
                <div class="case-studies-grid">
${otherCard}
                </div>
            </div>
        </section>
${CTA_SECTION}`;
}

function twoCol(labelTxt, heading, paras, img, alt, reverse) {
    const text = `
                    <div>
                        <span class="text-label">${labelTxt}</span>
                        <h2 style="font-size:clamp(2rem,4vw,3rem);margin:0.75rem 0 1rem;">${heading}</h2>
                        ${paras.map(p => `<p style="color:var(--text-muted);margin-bottom:1.25rem;">${p}</p>`).join('\n                        ')}
                    </div>`;
    const image = `
                    <div class="two-col-img why-image">
                        <picture>
                            ${img.webp ? `<source srcset="${img.webp}" type="image/webp">` : ''}
                            <img src="${img.src}" alt="${alt}" width="600" height="400" loading="lazy" style="border-radius:8px;">
                        </picture>
                    </div>`;
    return `
        <section class="section" aria-label="${heading}">
            <div class="container">
                <div class="two-col">
${reverse ? image + text : text + image}
                </div>
            </div>
        </section>`;
}

/* ---------- /case-study/herban-bud ---------- */
function buildHerbanBud() {
    const canonical = 'https://advancedmarketing.co/case-study/herban-bud';
    const statRow = `                    <div><div class="stat-value text-gradient">$30K</div><div class="stat-label">Revenue in First 30 Days</div></div><div><div class="stat-value text-gradient">$35K+</div><div class="stat-label">Generated in 90 Days</div></div><div><div class="stat-value text-gradient">1:1</div><div class="stat-label">Day-One Return on Ad Spend</div></div><div><div class="stat-value text-gradient">0 &rarr; 1</div><div class="stat-label">Brand Launched From Scratch</div></div>`;
    const sections =
        twoCol('The Challenge', 'Launching a Cannabis Brand in a Restricted Ad Market',
            ['Herban Bud came to us as a brand-new cannabis e-commerce store with no audience, no sales history, and a product category that most ad platforms actively restrict. Standard playbooks simply do not work in this space.',
             'We needed compliant creative, careful audience strategy, and positioning strong enough to convert cold traffic from day one — with zero room for wasted spend.'],
            { src: '/herban-bud-ad.png', webp: '/herban-bud-ad.webp' }, 'Herban Bud advertising creative', false) +
        twoCol('The Approach', 'Compliant Creative + Relentless Testing',
            ['We built a compliant Facebook advertising system around lifestyle-led creative and strategic brand positioning, rapidly testing hooks, offers, and audiences to find winning combinations early.',
             'Seasonal pushes — like the holiday campaign shown here — layered urgency and offers on top of the proven creative foundation, keeping acquisition costs flat while revenue scaled.'],
            { src: '/herban-bud-holiday-campaign.png' }, 'Herban Bud holiday campaign creative', true) +
        twoCol('The Results', '$30K in Revenue Within 30 Days',
            ['The store went from launch to $30,000 in revenue inside its first month, maintaining a dollar-for-dollar return on ad spend from the very first campaigns — rare for a cold-start brand in any category, let alone cannabis.',
             'Over the first 90 days the systems we built generated $35,000+ in tracked revenue, and the playbook behind it became the foundation of our <a href="/ecommerce-blueprint" style="color:var(--gold);">E-commerce Blueprint course</a>.'],
            { src: '/herban-bud-revenue.png', webp: '/herban-bud-revenue.webp' }, 'Herban Bud revenue dashboard showing $35,149 generated', false);
    const body = caseStudyBody({
        crumbLabel: 'Herban Bud', label: 'Cannabis E-commerce',
        h1: 'Herban Bud: <span class="text-gradient">$30K in 30 Days</span> From a Standing Start',
        lead: 'How we took a brand-new cannabis e-commerce brand from launch to $30,000 in revenue within 30 days through targeted Facebook advertising and strategic brand positioning.',
        statRow, sections, otherCard: burgerCard
    });
    const schema = graph([
        {
            '@type': 'Article', headline: 'Herban Bud Case Study: $30K in 30 Days', url: canonical, mainEntityOfPage: canonical,
            image: 'https://advancedmarketing.co/herban-bud-ad.png',
            author: { '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co' },
            publisher: { '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co', logo: { '@type': 'ImageObject', url: 'https://advancedmarketing.co/logo.png' } }
        },
        breadcrumbSchema([
            { name: 'Home', url: 'https://advancedmarketing.co/' },
            { name: 'Case Studies', url: 'https://advancedmarketing.co/case-studies' },
            { name: 'Herban Bud', url: canonical }
        ])
    ]);
    return page({ canonical, title: 'Herban Bud Case Study: $30K in 30 Days | Advanced Marketing', desc: 'How Advanced Marketing took cannabis e-commerce brand Herban Bud from launch to $30K revenue in 30 days with compliant Facebook ads and strategic positioning.', schema, body });
}

/* ---------- /case-study/burger ---------- */
function buildBurger() {
    const canonical = 'https://advancedmarketing.co/case-study/burger';
    const statRow = `                    <div><div class="stat-value text-gradient">$99</div><div class="stat-label">Customer Acquisition Cost</div></div><div><div class="stat-value text-gradient">$99</div><div class="stat-label">Average Order Value</div></div><div><div class="stat-value text-gradient">1:1</div><div class="stat-label">Day-One Payback</div></div><div><div class="stat-value text-gradient">100%</div><div class="stat-label">Compliant Creative</div></div>`;
    const sections =
        twoCol('The Challenge', 'Standing Out in a Crowded, Restricted Category',
            ['The Quarter Pounder campaign needed to sell a cannabis product in a market where direct product advertising is heavily restricted and competitors all sound the same.',
             'The answer was creative: a playful, food-culture-inspired concept that could run compliantly, stop the scroll, and make the brand instantly memorable.'],
            { src: '/burger-ad-1.png', webp: '/burger-ad-1.webp' }, 'Quarter Pounder campaign creative — burger-inspired cannabis ad', false) +
        twoCol('The Approach', 'Creative Positioning That Does the Heavy Lifting',
            ['We leaned into the "Quarter Pounder" concept across every touchpoint — ad creative, landing pages, and offers — turning a restricted product into a brand people wanted to share.',
             'Strategic media buying put the creative in front of high-intent audiences, and disciplined offer math kept acquisition cost locked to average order value from the start.'],
            { src: '/burger-ad-2.png' }, 'Quarter Pounder campaign creative variation', true) +
        twoCol('The Results', 'Dollar-for-Dollar Customer Acquisition',
            ['The campaign achieved a $99 customer acquisition cost against a $99 average order value — customers paid for themselves on day one, before any repeat purchases.',
             'With first-order economics at break-even, every reorder became pure profit, giving the brand a customer base it acquired effectively for free.'],
            { src: '/dope-dispensary.png' }, 'Dispensary storefront branding', false);
    const body = caseStudyBody({
        crumbLabel: 'Quarter Pounder', label: 'Strategic Marketing',
        h1: 'Quarter Pounder: <span class="text-gradient">Dollar-for-Dollar</span> Customer Acquisition',
        lead: 'A creative cannabis marketing campaign with strategic positioning that achieved dollar-for-dollar returns on customer acquisition — every new customer paid for themselves on day one.',
        statRow, sections, otherCard: herbanCard
    });
    const schema = graph([
        {
            '@type': 'Article', headline: 'Quarter Pounder Case Study: Dollar-for-Dollar Acquisition', url: canonical, mainEntityOfPage: canonical,
            image: 'https://advancedmarketing.co/burger-ad-1.png',
            author: { '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co' },
            publisher: { '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co', logo: { '@type': 'ImageObject', url: 'https://advancedmarketing.co/logo.png' } }
        },
        breadcrumbSchema([
            { name: 'Home', url: 'https://advancedmarketing.co/' },
            { name: 'Case Studies', url: 'https://advancedmarketing.co/case-studies' },
            { name: 'Quarter Pounder', url: canonical }
        ])
    ]);
    return page({ canonical, title: 'Quarter Pounder Case Study | Advanced Marketing', desc: 'How a creative cannabis marketing campaign achieved a $99 customer acquisition cost against a $99 average order value — dollar-for-dollar returns from day one.', schema, body });
}

/* ---------- /ecommerce-blueprint ---------- */
function buildBlueprint() {
    const canonical = 'https://advancedmarketing.co/ecommerce-blueprint';
    const modules = [
        ['🔍', 'Product Sourcing', 'Find products worth selling: validation frameworks, supplier vetting, and margin math before you spend a dollar.'],
        ['🧱', 'Store Foundations', 'Build a store that converts — positioning, offer structure, and the pages that actually matter.'],
        ['👥', 'Team Building', 'Hire and manage a lean remote team so the business runs without you doing everything.'],
        ['📣', 'Paid Marketing', 'The compliant Facebook ads system behind our $30K-in-30-days Herban Bud launch.'],
        ['📊', 'Data & Optimization', 'Read the numbers that matter — CAC, AOV, ROAS — and make decisions like an operator.'],
        ['🚀', 'Scaling Operations', 'Systems, SOPs, and automation to go from first sales to a real, sellable business.'],
    ];
    const moduleCards = modules.map(([icon, h, p]) => `
                    <div class="feature-card">
                        <div class="fi" aria-hidden="true">${icon}</div>
                        <h3>${h}</h3>
                        <p>${p}</p>
                    </div>`).join('');
    const body = `
        <section class="page-hero" aria-label="E-commerce Blueprint course">
            <div class="container">
                <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; <span>E-commerce Blueprint</span></nav>
                <span class="text-label">&#x2728; Featured Course</span>
                <h1>Run Your E-commerce Brand <span class="text-gradient">Like an Agency</span></h1>
                <p class="lead">The exact playbook that generated $35,000+ in 90 days. Learn the systems, team building, and marketing strategies that actually work for scaling an online brand from zero to profitability.</p>
                <div style="margin-bottom:2rem;">
                    <span style="font-family:var(--font-display);font-size:3rem;font-weight:600;" class="text-gradient">$27</span>
                    <span style="color:var(--text-muted);margin-left:0.5rem;">one-time payment</span>
                </div>
                <div class="hero-ctas">
                    <a href="/pay/" class="btn btn-primary">Get Instant Access &rarr;</a>
                    <a href="/case-study/herban-bud" class="btn btn-outline">See the Results Behind It &nearr;</a>
                </div>
                <p style="color:var(--text-muted);font-size:0.85rem;margin-top:1rem;">Pay securely via our invoice page (enter $27, reference "E-commerce Blueprint") — course access is delivered to your email within 24 hours.</p>
            </div>
        </section>

        <section class="section section-alt" aria-label="What's inside">
            <div class="container">
                <div class="section-header">
                    <span class="text-label">What's Inside</span>
                    <h2>8 Comprehensive Modules</h2>
                    <p>Covering product sourcing, team hiring, marketing, and scaling operations — plus 5 bonus templates including supplier outreach scripts and financial planning spreadsheets.</p>
                </div>
                <div class="feature-grid">
${moduleCards}
                </div>
            </div>
        </section>

        <section class="section" aria-label="Proof">
            <div class="container">
                <div class="two-col">
                    <div>
                        <span class="text-label">Built on Real Results</span>
                        <h2 style="font-size:clamp(2rem,4vw,3rem);margin:0.75rem 0 1rem;">This Isn't Theory</h2>
                        <p style="color:var(--text-muted);margin-bottom:1.25rem;">Every system in this course was battle-tested on real stores we launched and scaled — including Herban Bud, which went from zero to $30,000 in revenue in its first 30 days.</p>
                        <p style="color:var(--text-muted);margin-bottom:1.25rem;">You get the complete 90-day action plan with weekly milestones — from stuck to scaling your first profitable store.</p>
                        <a href="/case-studies" class="btn btn-outline">Read the Case Studies &rarr;</a>
                    </div>
                    <div class="two-col-img why-image">
                        <picture>
                            <source srcset="/herban-bud-revenue.webp" type="image/webp">
                            <img src="/herban-bud-revenue.png" alt="Revenue dashboard showing $35,149 generated in 90 days" width="600" height="400" loading="lazy" style="border-radius:8px;">
                        </picture>
                    </div>
                </div>
            </div>
        </section>

        <section class="section section-alt" aria-label="Get the course">
            <div class="container" style="text-align:center;">
                <span class="text-label">Ready to Start?</span>
                <h2 style="font-size:clamp(2rem,4vw,3rem);margin:0.75rem 0 1rem;">Get the E-commerce Blueprint for $27</h2>
                <p style="color:var(--text-muted);max-width:600px;margin:0 auto 2rem;">One-time payment. 8 modules, 5 bonus templates, and a complete 90-day action plan. Access delivered to your email within 24 hours.</p>
                <a href="/pay/" class="btn btn-primary">Get Instant Access &rarr;</a>
            </div>
        </section>`;
    const schema = graph([
        {
            '@type': 'Course', name: 'E-commerce Blueprint', url: canonical,
            description: 'The exact playbook that generated $35,000+ in 90 days — systems, team building, and marketing strategies for scaling an online brand from zero to profitability.',
            provider: { '@type': 'Organization', name: 'Advanced Marketing', url: 'https://advancedmarketing.co' },
            offers: { '@type': 'Offer', price: '27', priceCurrency: 'USD' }
        },
        breadcrumbSchema([
            { name: 'Home', url: 'https://advancedmarketing.co/' },
            { name: 'E-commerce Blueprint', url: canonical }
        ])
    ]);
    return page({ canonical, title: 'E-commerce Blueprint Course — $27 | Advanced Marketing', desc: 'The exact playbook that generated $35,000+ in 90 days. 8 modules, 5 bonus templates, and a 90-day action plan for scaling an online brand from zero to profitability.', schema, body });
}

/* ---------- write ---------- */
const outputs = [
    ['case-studies/index.html', buildCaseStudiesHub()],
    ['case-study/herban-bud/index.html', buildHerbanBud()],
    ['case-study/burger/index.html', buildBurger()],
    ['ecommerce-blueprint/index.html', buildBlueprint()],
];
outputs.forEach(([rel, html]) => {
    const full = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, html, 'utf8');
    console.log('wrote', rel, '(' + html.length + ' bytes)');
});
