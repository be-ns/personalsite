# bensiverly.com

[![CI](https://github.com/be-ns/personalsite/actions/workflows/ci.yml/badge.svg)](https://github.com/be-ns/personalsite/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-bensiverly.com-0047AB)](https://bensiverly.com)
[![No build step](https://img.shields.io/badge/build-none-success)](#philosophy)
[![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-success)](#philosophy)

My personal website and a small workshop of **free, private, no-account browser tools**. It's
a professional home base, a portfolio, and a place to ship things that might quietly be useful
to someone.

**Live:** [bensiverly.com](https://bensiverly.com)

---

## Philosophy

The whole site is hand-written HTML, CSS, and vanilla JavaScript. **No framework, no bundler,
no build step, zero runtime dependencies.** You can clone it and open `index.html` in a browser
and it just works — exactly as it does in production.

That's a deliberate constraint, not a limitation:

- **Longevity** — there is no toolchain to rot. These files will still run in ten years.
- **Speed** — no hydration, no megabytes of JavaScript. Pages are interactive instantly.
- **Privacy** — every tool runs entirely in your browser. No accounts, no servers, no tracking,
  nothing leaves the page. PDFs are generated client-side.
- **Legibility** — the source is the artifact. What you read is what runs.

The only Node dependencies in the repo (`canvas`, `sharp`) power an **offline build script** that
generates Open Graph share images. They never ship to the browser.

## The tools

Each tool is a single, self-contained HTML file. State lives in the URL or `localStorage`; output
is a clean, printable PDF.

| Tool | What it does |
| --- | --- |
| [Life Strategy Matrix](https://bensiverly.com/life-strategy.html) | Score eight life areas on importance vs. satisfaction and see where to invest next. Prints a one-page plan. |
| [Native Plant Finder](https://bensiverly.com/native-plant-finder.html) | Find native plants for your location and sun conditions to support local pollinators with less water and maintenance. |
| [Memorial Pamphlet Creator](https://bensiverly.com/memorial-pamphlet.html) | Lay out a simple, dignified memorial-service pamphlet and export a printable PDF. |
| [Service of Life Builder](https://bensiverly.com/service-of-life.html) | Assemble an order of service / liturgy for a memorial or celebration of life. |
| [Decision Assist](https://bensiverly.com/decision-assist.html) | Weighted-criteria decision matrix — score options against what matters most to you. |
| [Writings](https://bensiverly.com/writings.html) | Poetry and prose. |

## Project structure

```
.
├── index.html               # Home — intro, work, tools, how I work, contact
├── styles.css               # Shared design system (custom properties + components)
├── life-strategy.html        # ┐
├── native-plant-finder.html  # │
├── memorial-pamphlet.html    # ├─ Self-contained tools (HTML + scoped CSS + JS)
├── service-of-life.html      # │
├── decision-assist.html      # ┘
├── writings.html            # Poetry & prose
├── assets/
│   └── native-plants/       # Static JSON datasets (plants, regions, nurseries, ZIP index)
├── images/                  # Generated Open Graph share images (1200×630)
├── generate-og-images.js     # Offline OG-image generator (Node + canvas/sharp)
├── generate-og-images.py     # Python port of the same generator
├── favicon.svg              # Inline SVG favicon
├── site.webmanifest         # PWA / install metadata
├── sitemap.xml · robots.txt # Discoverability
└── CNAME · .nojekyll        # GitHub Pages config
```

## Design system

A small set of CSS custom properties in `styles.css` drives the whole site — color, type scale,
spacing, and motion. Highlights:

- **Type:** Inter (UI), Zilla Slab (display), JetBrains Mono (accents), Instrument Serif (editorial).
- **Motion:** scroll-reveal and a page loader that **fully respect `prefers-reduced-motion`**.
- **Accessibility:** semantic landmarks, ARIA on the menu dialog, visible focus states, a
  skip-to-content link, and live regions for async feedback (e.g. the copy-email button).
- **Responsive:** mobile-first; the bento tool grid and editorial layouts reflow down to small screens.

## Local development

No install required:

```bash
git clone https://github.com/be-ns/personalsite.git
cd personalsite
python -m http.server 8000   # or: npx serve
# open http://localhost:8000
```

### Quality checks

The same checks that run in CI:

```bash
npm run validate    # HTML lint (htmlhint)
npm run links       # internal/external link check (lychee)
```

### Regenerating Open Graph images

```bash
npm install          # installs canvas + sharp (build-time only)
npm run generate-og  # writes images/og-*.png
```

## Continuous integration

Every push and pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

- **HTML validation** with htmlhint
- **Link checking** with lychee (catches dead internal links and broken assets)
- **Sitemap/robots sanity** checks

The site is served by **GitHub Pages from the `main` branch** behind the custom domain in
[`CNAME`](CNAME); every push to `main` publishes automatically. Dependabot keeps the GitHub
Actions and the OG-image toolchain up to date.

## Tech stack

- **Markup/styles:** HTML5, modern CSS (custom properties, grid, container-aware layouts)
- **Behavior:** vanilla ES5/ES6 JavaScript, no dependencies
- **PDF export:** [jsPDF](https://github.com/parallax/jsPDF) (loaded only on the tools that need it)
- **Hosting:** GitHub Pages behind a custom domain (`bensiverly.com`)
- **Tooling:** Node (canvas, sharp) for offline OG-image generation

## License

Source code is released under the [MIT License](LICENSE). Written content — essays, poetry,
prose, and the contents of `writings.html` — is **© Ben Siverly, all rights reserved**, and is
not covered by the MIT grant.
</content>
</invoke>
