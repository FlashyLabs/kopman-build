# Marco Law — marco.law

Marketing website for **Marco Law**, a criminal litigation firm in Markham, Ontario founded by Daniel Marcovitch. 15 static pages: Home, About, Practice Areas index, Results, Contact, and 10 practice-area pages.

Built from the design handoff as a dependency-free static site: all page content lives in `src/data.js`, and `src/build.js` renders the HTML. No frameworks, no npm install.

## Structure

```
index.html                  Home
about/                      About the firm
practice-areas/             Practice areas index
practice-areas/<slug>/      10 practice-area pages (appeals, sexual-offences, drug-offences,
                            impaired-driving, fraud, assault, weapons-offences,
                            property-offences, bail-hearings, provincial-offences)
results/                    Results
contact/                    Contact + consultation form
css/styles.css              Design system (tokens, components, responsive rules)
js/site.js                  Nav dropdown, mobile drawer, contact form
src/data.js                 ALL site content — edit here, then rebuild
src/build.js                Static site generator
sitemap.xml, robots.txt     Generated
```

## Editing content

1. Edit `src/data.js` (copy, phone/email, stats, results, practice areas).
2. Rebuild: `node src/build.js` (requires any recent Node; writes the HTML pages, sitemap, robots).
3. Commit the regenerated files.

Do not edit the generated `*.html` files directly — they are overwritten by the build.

## Deploying

The repo root is a ready-to-serve static site — deploy the folder as-is on Vercel (zero config; `vercel.json` sets clean URLs), Netlify, GitHub Pages, or any static host. Point the `marco.law` domain at the deployment.

## Placeholders to replace before launch

- Phone **(416) 555-0198** and email **defence@marcolaw.ca** (`src/data.js` → `site`)
- Stats: 500+ trials, 40+ appeals (`stats`)
- Testimonial quote (`testimonial`)
- All 6 results entries (`results`)
- Expanded bio paragraph on About (marked `[Placeholder]` in `src/build.js` about page)
- Photography: professional photos of Daniel Marcovitch for the Home (440×550) and About (460×580) slots — replace the `.photo-slot` divs in `src/build.js` with `<img>` tags when supplied
- Contact form is client-side only (shows a thank-you panel) — wire it to email/CRM before launch (`js/site.js`)
