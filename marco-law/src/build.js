#!/usr/bin/env node
// Static site generator for marco.law — run `node src/build.js` from the site
// root. Writes all pages, sitemap.xml, and robots.txt alongside css/ and js/.

const fs = require("fs");
const path = require("path");
const { site, stats, workPillars, testimonial, beliefs, credentials, results, areas } = require("./data");

const ROOT = path.join(__dirname, "..");

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Archivo:wght@400;500;600&display=swap" rel="stylesheet">';

// ---------- Shared components ----------

function nav() {
  const dropdownLinks = areas
    .map((a) => `<a href="/practice-areas/${a.slug}/">${a.title.replace("&", "&amp;")}</a>`)
    .join("\n        ");
  const drawerLinks = areas
    .map((a) => `<a href="/practice-areas/${a.slug}/">${a.title.replace("&", "&amp;")}</a>`)
    .join("\n      ");
  return `<header class="site-header">
  <div class="utility-bar">
    <div class="utility-bar__note">Available 24 hours a day, seven days a week</div>
    <div class="utility-bar__links">
      <a class="phone" href="${site.phoneHref}">${site.phone}</a>
      <a class="email" href="mailto:${site.email}">${site.email}</a>
    </div>
  </div>
  <div class="nav-bar">
    <a class="wordmark" href="/">
      <span class="wordmark__name">MARCO LAW</span>
      <span class="wordmark__sub">${site.tagline}</span>
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a class="nav-link" href="/">Home</a>
      <a class="nav-link" href="/about/">About</a>
      <div class="nav-dropdown-wrap">
        <a class="nav-link" href="/practice-areas/">Practice Areas <span class="nav-caret">▼</span></a>
        <div class="nav-dropdown">
          <div class="nav-dropdown__panel">
        ${dropdownLinks}
        <a class="view-all" href="/practice-areas/">View all practice areas →</a>
          </div>
        </div>
      </div>
      <a class="nav-link" href="/results/">Results</a>
      <a class="nav-link" href="/contact/">Contact</a>
      <a class="nav-cta" href="/contact/">Book a Consultation</a>
    </nav>
    <button class="nav-toggle" aria-expanded="false" aria-controls="mobile-drawer">Menu</button>
  </div>
  <div class="mobile-drawer" id="mobile-drawer">
    <a href="/">Home</a>
    <a href="/about/">About</a>
    <a href="/results/">Results</a>
    <a href="/contact/">Contact</a>
    <div class="mobile-drawer__label">Practice Areas</div>
      ${drawerLinks}
    <a href="/practice-areas/">View all practice areas →</a>
    <a class="drawer-cta" href="/contact/">Book a Consultation</a>
  </div>
</header>`;
}

function footer() {
  const col = (links) =>
    links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("\n      ");
  const firstHalf = areas.slice(0, 5).map((a) => [`/practice-areas/${a.slug}/`, a.title.replace("&", "&amp;")]);
  const secondHalf = areas.slice(5).map((a) => [`/practice-areas/${a.slug}/`, a.title.replace("&", "&amp;")]);
  return `<footer class="site-footer">
  <div class="site-footer__grid">
    <div>
      <div class="wordmark__name">MARCO LAW</div>
      <div class="wordmark__sub">${site.tagline}</div>
      <div class="site-footer__address">${site.address.join("<br>")}</div>
      <div class="site-footer__contact"><a class="phone" href="${site.phoneHref}">${site.phone}</a><br><a class="email" href="mailto:${site.email}">${site.email}</a></div>
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Practice Areas</div>
      ${col(firstHalf)}
    </div>
    <div class="footer-col">
      <div class="footer-col__heading footer-col__heading--blank">.</div>
      ${col(secondHalf)}
    </div>
    <div class="footer-col">
      <div class="footer-col__heading">Firm</div>
      ${col([
        ["/about/", "About"],
        ["/results/", "Results"],
        ["/practice-areas/", "Practice Areas"],
        ["/contact/", "Contact"],
      ])}
    </div>
  </div>
  <div class="site-footer__bottom">
    <div>${site.copyright}</div>
    <div class="site-footer__legal">${site.disclaimer}</div>
  </div>
</footer>`;
}

function ctaBand(heading) {
  return `<div class="section-dark cta-band">
  <div class="container cta-band__inner">
    <h2>${heading}</h2>
    <div class="hero-ctas">
      <a class="btn-filled" href="/contact/">Book a Consultation</a>
      <a class="btn-ghost" href="${site.phoneHref}">Call ${site.phone}</a>
    </div>
  </div>
</div>`;
}

function pageHero(eyebrow, title, sub, wide) {
  return `<div class="section-dark page-hero">
  <div class="container">
    <div class="eyebrow">${eyebrow}</div>
    <h1>${title}</h1>
    <p class="page-hero__sub${wide ? " page-hero__sub--wide" : ""}">${sub}</p>
  </div>
</div>`;
}

function page({ title, description, canonicalPath, body }) {
  return `<!DOCTYPE html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${site.domain}${canonicalPath}">
${FONTS}
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
${nav()}
${body}
${footer()}
<script src="/js/site.js"></script>
</body>
</html>
`;
}

// ---------- Pages ----------

function homePage() {
  const statCells = stats
    .map(
      (s) => `<div class="stats__cell">
        <div class="stats__value">${s.value}</div>
        <div class="stats__label">${s.label}</div>
      </div>`
    )
    .join("\n      ");

  const areaRows = areas
    .map(
      (a) => `<a class="area-row" href="/practice-areas/${a.slug}/">
        <span class="area-row__num">${a.num}</span>
        <span class="area-row__title">${a.title.replace("&", "&amp;")}</span>
        <span class="area-row__blurb">${a.homeBlurb}</span>
        <span class="area-row__arrow">→</span>
      </a>`
    )
    .join("\n      ");

  const pillars = workPillars
    .map(
      (p) => `<div class="pillar">
        <div class="pillar__num">${p.num}</div>
        <h3>${p.title}</h3>
        <p>${p.body}</p>
      </div>`
    )
    .join("\n      ");

  const body = `<div class="section-dark home-hero">
  <div class="container">
    <div class="eyebrow">Markham — Criminal Trials · Appeals · Provincial Offences</div>
    <h1>The defence of serious charges is all we do.</h1>
    <div class="home-hero__row">
      <p class="home-hero__sub">Marco Law is a criminal litigation firm appearing at every level of court in Ontario. Founded by Daniel Marcovitch, the firm acts for individuals facing the most serious criminal and provincial offence prosecutions.</p>
      <div class="hero-ctas">
        <a class="btn-filled" href="/contact/">Book a Consultation</a>
        <a class="btn-ghost" href="${site.phoneHref}">Call ${site.phone}</a>
      </div>
    </div>
    <div class="stats">
      ${statCells}
    </div>
  </div>
</div>
<div class="section-light founder">
  <div class="container founder__grid">
    <div class="photo-slot photo-slot--home"><span>Photograph of<br>Daniel Marcovitch<br>to come</span></div>
    <div>
      <div class="eyebrow">Founding Partner</div>
      <h2>Daniel Marcovitch</h2>
      <p>Daniel Marcovitch has devoted his career to criminal trials and appeals. He has defended a wide range of criminal charges and serious Provincial Offence Act prosecutions — drug trafficking, sexual assault, impaired driving, fraud, and careless driving causing death among them.</p>
      <p>Every file at Marco Law is prepared for trial from the first day. That preparation is what produces withdrawn charges, favourable resolutions, and acquittals.</p>
      <a class="link-underline" href="/about/">About the firm →</a>
    </div>
  </div>
</div>
<div class="section-light practice-list-section">
  <div class="container">
    <div class="practice-list-section__head">
      <div>
        <div class="eyebrow">Practice Areas</div>
        <h2 class="h2-light">We defend every serious charge.</h2>
      </div>
      <a class="link-underline" href="/practice-areas/">All practice areas →</a>
    </div>
    <div class="area-rows">
      ${areaRows}
      <div class="area-rows__end"></div>
    </div>
  </div>
</div>
<div class="section-dark how-we-work">
  <div class="container">
    <div class="eyebrow">How we work</div>
    <div class="how-we-work__grid">
      ${pillars}
    </div>
  </div>
</div>
<div class="section-light testimonial">
  <div class="testimonial__inner">
    <div class="eyebrow">What clients say</div>
    <blockquote>${testimonial.quote}</blockquote>
    <div class="testimonial__attribution">${testimonial.attribution}</div>
  </div>
</div>
${ctaBand("The first conversation is confidential.")}`;

  return page({
    title: "Marco Law — Criminal Litigation | Markham Criminal Defence Lawyer",
    description:
      "Marco Law is a criminal litigation firm in Markham, Ontario. Founded by Daniel Marcovitch, the firm defends serious criminal charges and Provincial Offence Act prosecutions at every level of court in Ontario.",
    canonicalPath: "/",
    body,
  });
}

function aboutPage() {
  const credRows = credentials
    .map(
      (c) => `<div class="credentials-card__row"><span class="key">${c.key}</span><span class="value">${c.value}</span></div>`
    )
    .join("\n          ");
  const beliefRows = beliefs
    .map(
      (b) => `<div class="belief">
        <span class="belief__numeral">${b.numeral}</span>
        <p><strong>${b.lead}</strong> ${b.body}</p>
      </div>`
    )
    .join("\n      ");

  const body = `${pageHero(
    "About the Firm",
    "A firm built for the courtroom.",
    "Marco Law exists for one purpose: the defence of individuals facing serious criminal and provincial offence prosecutions in Ontario."
  )}
<div class="section-light about-main">
  <div class="container about-main__grid">
    <div>
      <div class="photo-slot photo-slot--about"><span>Portrait of<br>Daniel Marcovitch<br>to come</span></div>
      <div class="credentials-card">
        <span class="card-eyebrow">Credentials</span>
        <div class="credentials-card__rows">
          ${credRows}
        </div>
      </div>
    </div>
    <div class="bio">
      <div class="eyebrow">Founding Partner</div>
      <h2 class="h2-light">Daniel Marcovitch</h2>
      <p>Daniel Marcovitch is the founding partner of Marco Law. His practice is devoted exclusively to criminal trials and appeals, and to the defence of serious Provincial Offence Act prosecutions.</p>
      <p>He has defended a wide range of charges — drug trafficking, sexual assault, impaired driving, fraud, and careless driving causing death among them — before the Ontario Court of Justice, the Superior Court of Justice, and the Court of Appeal for Ontario.</p>
      <p>[Placeholder — expanded biography: articling, prior firms, notable matters, memberships, teaching, and community work.]</p>
      <div class="beliefs">
        <h3>What we believe</h3>
        <div class="beliefs__rows">
          ${beliefRows}
        </div>
      </div>
    </div>
  </div>
</div>
${ctaBand("Facing a charge? Speak to counsel today.")}`;

  return page({
    title: "About the Firm — Marco Law | Daniel Marcovitch, Criminal Lawyer",
    description:
      "Marco Law is a criminal litigation firm founded by Daniel Marcovitch, devoted exclusively to criminal trials and appeals and the defence of serious Provincial Offence Act prosecutions in Ontario.",
    canonicalPath: "/about/",
    body,
  });
}

function practiceIndexPage() {
  const cards = areas
    .map(
      (a) => `<a class="pa-card" href="/practice-areas/${a.slug}/">
        <div class="pa-card__top">
          <span class="pa-card__num">${a.num}</span>
          <span class="pa-card__arrow">→</span>
        </div>
        <div class="pa-card__title">${a.title.replace("&", "&amp;")}</div>
        <div class="pa-card__blurb">${a.blurb}</div>
      </a>`
    )
    .join("\n      ");

  const body = `${pageHero(
    "Practice Areas",
    "Criminal litigation, in full.",
    "From the bail hearing to the appeal, Marco Law defends every serious criminal charge and Provincial Offence Act prosecution in Ontario."
  )}
<div class="section-light pa-index">
  <div class="container">
    <div class="pa-index__grid">
      ${cards}
    </div>
  </div>
</div>
${ctaBand("Not sure where your charge fits? Ask us.")}`;

  return page({
    title: "Practice Areas — Marco Law | Criminal Defence in Ontario",
    description:
      "Marco Law defends every serious criminal charge and Provincial Offence Act prosecution in Ontario — from bail hearings and trials to appeals before the Court of Appeal for Ontario.",
    canonicalPath: "/practice-areas/",
    body,
  });
}

function resultsPage() {
  const rows = results
    .map(
      (r) => `<div class="result-row">
        <div>
          <div class="result-row__charge">${r.charge}</div>
          <div class="result-row__cite">${r.cite}</div>
        </div>
        <p class="result-row__summary">${r.summary}</p>
        <div class="result-row__meta">
          <div class="result-row__badge">${r.outcome}</div>
          <div class="result-row__court">${r.court}</div>
        </div>
      </div>`
    )
    .join("\n      ");

  const body = `${pageHero(
    "Results",
    "Judged by outcomes.",
    "A selection of matters defended by the firm. All entries below are placeholders to be replaced with actual results."
  )}
<div class="section-light results-main">
  <div class="container">
    <div class="result-rows">
      ${rows}
      <div class="area-rows__end"></div>
    </div>
    <p class="results-disclaimer">Past results are not necessarily indicative of future outcomes. Every case turns on its own facts. The matters above are illustrative placeholders and will be replaced with the firm's actual reported and unreported results.</p>
  </div>
</div>
${ctaBand("Your case deserves the same preparation.")}`;

  return page({
    title: "Results — Marco Law | Criminal Defence Outcomes",
    description:
      "A selection of matters defended by Marco Law — acquittals, withdrawn charges, and successful appeals in courts across Ontario.",
    canonicalPath: "/results/",
    body,
  });
}

function contactPage() {
  const body = `${pageHero(
    "Contact",
    "Speak to counsel.",
    "The first conversation is confidential and without obligation. We respond to every inquiry — day or night."
  )}
<div class="section-light contact-main">
  <div class="container contact-main__grid">
    <div>
      <h2>Request a consultation</h2>
      <div class="contact-thanks">
        <div class="contact-thanks__title">Thank you.</div>
        <p>Your message has been received. Counsel will contact you shortly. If the matter is urgent, call <a href="${site.phoneHref}">${site.phone}</a> now.</p>
      </div>
      <div class="contact-form-wrap">
        <form novalidate>
          <div class="contact-form">
            <div class="field">
              <label for="cf-name">Full name</label>
              <input id="cf-name" name="name" type="text" placeholder="Your name" required>
            </div>
            <div class="field">
              <label for="cf-phone">Phone</label>
              <input id="cf-phone" name="phone" type="tel" placeholder="(416) 000-0000" required>
            </div>
            <div class="field field--full">
              <label for="cf-email">Email</label>
              <input id="cf-email" name="email" type="email" placeholder="you@example.com">
            </div>
            <div class="field field--full">
              <label for="cf-message">Nature of the charge</label>
              <textarea id="cf-message" name="message" rows="5" placeholder="Briefly describe the matter. Do not include sensitive details — those are for the consultation."></textarea>
            </div>
          </div>
          <button type="submit" class="btn-filled contact-submit">Send Inquiry</button>
        </form>
        <p class="contact-note">Submitting this form does not create a solicitor-client relationship. Please do not send confidential or time-sensitive information through this form.</p>
      </div>
    </div>
    <div class="contact-sidebar">
      <div class="urgent-card">
        <div class="card-eyebrow">Urgent matters</div>
        <div class="urgent-card__title">Arrested or under investigation?</div>
        <p>Say nothing. Call counsel first — we are available 24 hours a day.</p>
        <a class="btn-filled" href="${site.phoneHref}">Call ${site.phone}</a>
      </div>
      <div class="office-card">
        <div>
          <div class="card-eyebrow">Office</div>
          <div class="office-card__value">${site.address.join("<br>")}</div>
        </div>
        <div>
          <div class="card-eyebrow">Reach us</div>
          <div class="office-card__value"><a class="phone" href="${site.phoneHref}">${site.phone}</a><br><a href="mailto:${site.email}">${site.email}</a></div>
        </div>
        <div>
          <div class="card-eyebrow">Serving</div>
          <div class="office-card__value">${site.serving}</div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  return page({
    title: "Contact — Marco Law | Book a Confidential Consultation",
    description:
      "Speak to criminal defence counsel in Markham, Ontario. The first conversation with Marco Law is confidential and without obligation — available 24 hours a day.",
    canonicalPath: "/contact/",
    body,
  });
}

function practiceAreaPage(area) {
  const handleRows = area.handle
    .map(
      (item, i) => `<div class="pa-handle__row"><span class="pa-handle__dash">—</span><span>${item}</span></div>`
    )
    .join("\n          ");
  const steps = area.steps
    .map(
      (s, i) => `<div class="pa-step">
            <div class="pa-step__num">0${i + 1}</div>
            <div class="pa-step__label">${s.label}</div>
            <p>${s.body}</p>
          </div>`
    )
    .join("\n          ");
  const otherLinks = areas
    .map((a) => `<a href="/practice-areas/${a.slug}/">${a.title.replace("&", "&amp;")}</a>`)
    .join("\n          ");

  const body = `${pageHero("Practice Area", area.title.replace("&", "&amp;"), area.blurb, true)}
<div class="section-light pa-detail">
  <div class="container pa-detail__grid">
    <div>
      <p class="pa-detail__intro-lead">${area.intros[0]}</p>
      <p class="pa-detail__intro">${area.intros[1]}</p>
      <div class="pa-handle">
        <h2>What we handle</h2>
        <div class="pa-handle__rows">
          ${handleRows}
        </div>
      </div>
      <div class="pa-how">
        <h2>How we defend</h2>
        <div class="pa-how__grid">
          ${steps}
        </div>
      </div>
    </div>
    <div class="pa-sidebar">
      <div class="consult-card">
        <div class="card-eyebrow">Charged?</div>
        <div class="consult-card__title">Speak to counsel today.</div>
        <p>Confidential, without obligation, and available 24 hours a day.</p>
        <a class="btn-filled" href="/contact/">Book a Consultation</a>
        <a class="consult-card__call" href="${site.phoneHref}">Call ${site.phone}</a>
      </div>
      <div class="other-areas-card">
        <span class="card-eyebrow">Other practice areas</span>
        <div class="other-areas-card__links">
          ${otherLinks}
        </div>
      </div>
    </div>
  </div>
</div>
${ctaBand("The first conversation is confidential.")}`;

  return page({
    title: `${area.title} — Marco Law | Criminal Defence in Ontario`,
    description: `${area.blurb} Marco Law defends ${area.title.toLowerCase()} matters throughout Ontario — the first conversation is confidential.`,
    canonicalPath: `/practice-areas/${area.slug}/`,
    body,
  });
}

// ---------- Write everything ----------

function write(relPath, content) {
  const abs = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  console.log("wrote " + relPath);
}

write("index.html", homePage());
write("about/index.html", aboutPage());
write("practice-areas/index.html", practiceIndexPage());
write("results/index.html", resultsPage());
write("contact/index.html", contactPage());
for (const area of areas) {
  write(`practice-areas/${area.slug}/index.html`, practiceAreaPage(area));
}

const urls = [
  "/",
  "/about/",
  "/practice-areas/",
  "/results/",
  "/contact/",
  ...areas.map((a) => `/practice-areas/${a.slug}/`),
];
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${site.domain}${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`
);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site.domain}/sitemap.xml\n`);

console.log(`\nDone — ${urls.length} pages generated.`);
