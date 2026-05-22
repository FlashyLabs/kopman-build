# Deploying Kopman Build

This is a **single static HTML file**. Any static host works. Pick one path below — all four take under 10 minutes.

> **Note on heads-up.** I cannot deploy to a real host from this environment — only push files into your project. The steps below are written so you (or Claude Code running locally on your machine) can take it the last mile. Cloudflare Pages is the recommended path: free, fast, no card required, and has the cleanest domain story.

---

## Prerequisites

- The `site/index.html` file from this bundle
- A registered domain (`kopmanbuild.com`) with DNS access
- One of: a GitHub account (recommended) **or** the Wrangler / Netlify / Vercel CLI

---

## Option A — Cloudflare Pages (recommended)

### A1. Push to GitHub
```bash
cd site
git init
git add index.html
git commit -m "Initial site"
gh repo create kopman-build-site --public --source=. --push
# or create the repo in the GitHub UI and push manually
```

### A2. Connect Cloudflare Pages
1. Go to **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**
2. Select the `kopman-build-site` repo
3. Build settings:
   - **Framework preset**: *None*
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/`
4. Click **Save and Deploy**. First deploy completes in ~30 seconds.

### A3. Attach the domain
1. In the project → **Custom domains → Set up a custom domain**
2. Enter `kopmanbuild.com`
3. Cloudflare will either:
   - **Auto-configure** if the domain's nameservers already point at Cloudflare, or
   - Give you a CNAME / two A records to add at your registrar
4. Add `www.kopmanbuild.com` too and set it to redirect to apex (or vice versa — your preference).

SSL is provisioned automatically (Cloudflare Universal SSL, typically within minutes).

---

## Option B — Netlify (drag-and-drop, fastest)

1. Go to **app.netlify.com → Add new site → Deploy manually**
2. Drag the `site/` folder onto the page → instantly live at `https://random-name.netlify.app`
3. **Domain settings → Add custom domain** → enter `kopmanbuild.com`
4. Follow the DNS instructions Netlify shows (usually a CNAME on `www` + A records on apex)

For redeploys, drag the new `site/` folder over the existing site, or connect a GitHub repo via **Site settings → Build & deploy → Link repository**.

---

## Option C — Vercel

```bash
npm i -g vercel
cd site
vercel              # follow prompts; accept defaults
vercel --prod       # promote to production
vercel domains add kopmanbuild.com
```

Then add the DNS records Vercel prints.

---

## Option D — GitHub Pages

1. Push `site/` to a repo (same as A1, or use a `gh-pages` branch)
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**
3. Select branch + `/` root → Save
4. Add a `CNAME` file containing `kopmanbuild.com` to the repo root and add an `ALIAS`/`A` record at your registrar pointing to GitHub Pages IPs (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153).

---

## After Deploy — Production Checklist

### 1. Connect the contact form

The form currently uses a placeholder submit handler that simulates a 700ms response. Replace it with a real backend.

**Easiest: Formspree** (no backend code)

In `index.html`, find the `<form id="contactForm" novalidate>` line and add:
```html
<form id="contactForm" novalidate action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

Then in the `<script>` block at the bottom, replace this block:
```js
// PLACEHOLDER SUBMIT — wire to a real endpoint
status.textContent = 'Sending…';
status.classList.add('show');
try {
  await new Promise(r => setTimeout(r, 700));   // simulate network
  status.classList.add('ok');
  status.textContent = 'Thank you — your inquiry has been received…';
  form.reset();
} catch (err) {
  status.classList.add('err');
  status.textContent = 'Something went wrong…';
}
```

…with this:
```js
status.textContent = 'Sending…';
status.classList.add('show');
try {
  const res = await fetch(form.action, {
    method: 'POST',
    body: new FormData(form),
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error('Bad response');
  status.classList.add('ok');
  status.textContent = 'Thank you — your inquiry has been received. We will respond within two business days.';
  form.reset();
} catch (err) {
  status.classList.add('err');
  status.textContent = 'Something went wrong. Please email us directly at hello@kopmanbuild.com.';
}
```

**Alternative backends** (same fetch pattern, different endpoint):
- **Resend** + a Cloudflare Worker / Vercel Edge Function (more control, your own from-address)
- **Web3Forms** (free, no account)
- **Basin** / **Getform** (similar to Formspree)

Add hCaptcha or Cloudflare Turnstile before going public to stop spam.

### 2. Replace placeholder content

Search `index.html` for the string `placeholder` — every spot that needs a real value is marked. Concretely:
- **Phone**: `+1 (000) 000-0000` (3 places: contact section, footer, JSON-LD)
- **Email**: `hello@kopmanbuild.com` (already a sensible default; change if needed)
- **Service area**: `— Region —`
- **Founder name + bio**: in the `.team-card` block
- **Hero image, project images, founder portrait**: see "Real photography" below

### 3. Add real imagery

Image placeholders use a striped concrete-tone CSS pattern. To swap in real photos:

For the hero, find:
```html
<div class="hero-image ph">
  <span class="corner">Fig. 01 — Hero</span>
  <span class="ph-label">hero_image.jpg — drop a wide site/build photograph here</span>
</div>
```

Replace with:
```html
<div class="hero-image">
  <img src="/images/hero.jpg" alt="Description of the build" style="width:100%;height:100%;object-fit:cover;">
</div>
```

Same pattern for project cards (`<div class="img ph">` → wrap with `<img>`) and founder portrait.

Recommended image sizes:
- Hero: 2400×1050 (16:7), JPG ~85% quality
- Project cards (large): 1600×1000
- Project cards (small): 1200×900
- Founder portrait: 800×1000 (4:5)
- OG card: 1200×630

### 4. OG image + favicon

Add to `<head>`:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

Update the existing `<meta property="og:image" content="https://kopmanbuild.com/og.jpg" />` URL.

### 5. Analytics (optional, privacy-respecting picks)

- **Plausible** — `<script defer data-domain="kopmanbuild.com" src="https://plausible.io/js/script.js"></script>` in `<head>`
- **Cloudflare Web Analytics** — free, no cookies, GDPR-safe
- **Fathom** — paid, similar feel

### 6. Verify

After DNS propagates (5min – a few hours):

- [ ] `https://kopmanbuild.com` loads with valid SSL
- [ ] `https://www.kopmanbuild.com` redirects (or vice versa)
- [ ] Lighthouse run: Performance / Accessibility / SEO all ≥95
- [ ] Submit form end-to-end works and you receive the email
- [ ] OG card previews correctly on linkedin.com/post-inspector and twitter.com/share
- [ ] `https://search.google.com/test/rich-results` passes the `GeneralContractor` JSON-LD
- [ ] Submit `https://kopmanbuild.com` to Google Search Console + add `sitemap.xml`

A trivial `sitemap.xml` for a single-page site:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kopmanbuild.com/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

And `robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://kopmanbuild.com/sitemap.xml
```

---

## TL;DR for Claude Code

If you're Claude Code reading this on a developer's machine:

1. `cd` into `site/`
2. Initialize a git repo, commit, push to a new GitHub repo
3. Connect that repo to Cloudflare Pages (no build command, output dir `/`)
4. Add `kopmanbuild.com` as a custom domain in the Pages project
5. Walk the user through the contact-form backend choice (Formspree vs. Worker + Resend)
6. Replace the `placeholder` strings in `index.html` with real content as it becomes available
7. Drop real images into `/images/` and swap the `.ph` placeholders for `<img>` tags
