# bensiverly.com

[![CI](https://github.com/be-ns/personalsite/actions/workflows/ci.yml/badge.svg)](https://github.com/be-ns/personalsite/actions/workflows/ci.yml)

My personal website, plus a small workshop of free browser tools. Live at
[bensiverly.com](https://bensiverly.com).

## How it's built

Everything is hand-written HTML, CSS, and vanilla JavaScript. There is no framework, no
bundler, and no build step: clone the repo, open `index.html`, and you are running exactly
what production runs.

I keep it this way on purpose. Plain files outlive any toolchain, pages are interactive the
moment they load, and the source stays readable — what you read is what runs. The tools work
entirely in the browser: no accounts, no servers, no tracking. State lives in the URL or
`localStorage`, and PDFs are generated client-side with [jsPDF](https://github.com/parallax/jsPDF),
loaded only on the pages that need it.

The single dev dependency that touches pixels, [sharp](https://sharp.pixelplumbing.com/),
powers an offline script that renders the Open Graph share images. It never ships to the
browser.

## The tools

Each tool is one self-contained HTML file.

| Tool | What it does |
| --- | --- |
| [Life Strategy Matrix](https://bensiverly.com/life-strategy.html) | Score eight life areas on importance vs. satisfaction and see where to invest next. Prints a one-page plan. |
| [Native Plant Finder](https://bensiverly.com/native-plant-finder.html) | Find California native plants for your ZIP code and sun conditions, with local nursery suggestions. |
| [Memorial Pamphlet Creator](https://bensiverly.com/memorial-pamphlet.html) | Lay out a simple, dignified memorial-service pamphlet and export a printable PDF. |
| [Service of Life Builder](https://bensiverly.com/service-of-life.html) | Assemble an order of service for a memorial or celebration of life. |
| [Memorial Preferences Worksheet](https://bensiverly.com/memorial-preferences.html) | A one-page form to print and fill out by hand — record service wishes on paper, no screen required. |
| [Decision Assist](https://bensiverly.com/decision-assist.html) | A weighted-criteria decision matrix: score your options against what matters most. |
| [Writings](https://bensiverly.com/writings.html) | Poetry and prose. |

## Repository layout

```
index.html                 Home: intro, work, tools, contact
styles.css                 Design system for the home page (custom properties + components)
life-strategy.html         Self-contained tools, each one file
native-plant-finder.html   (HTML + scoped CSS + JS)
memorial-pamphlet.html
service-of-life.html
memorial-preferences.html
decision-assist.html
writings.html              Poetry and prose
resume.html                One-page resume with downloadable PDFs
assets/native-plants/      Static JSON datasets: plants, regions, nurseries, ZIP index
images/                    Generated Open Graph share images (1200x630)
generate-og-images.js      Offline OG-image generator (Node + sharp)
test/                      Test suite (node:test, no dependencies)
```

`sitemap.xml`, `robots.txt`, `site.webmanifest`, and `CNAME` handle discoverability and
GitHub Pages hosting.

## Design

A set of CSS custom properties in `styles.css` defines the color, type scale, spacing, and
motion for the home page; each tool page carries its own scoped copy so it stays portable.
Type is Inter for UI, Zilla Slab for display, and JetBrains Mono for accents. Animations and
the page loader respect `prefers-reduced-motion`, and the pages use semantic landmarks, a
skip link, visible focus states, and live regions for async feedback.

## Working on the site

No install needed to run it:

```bash
git clone https://github.com/be-ns/personalsite.git
cd personalsite
python3 -m http.server 8000    # or: npm run serve
```

The checks that CI runs:

```bash
npm test            # test suite (node:test, zero dependencies)
npm run validate    # HTML lint (htmlhint)
npm run links       # offline link check (lychee)
```

The test suite covers page invariants (titles, descriptions, canonical URLs, heading
structure), internal link resolution, sitemap coverage, inline-script syntax, and the
integrity of the native-plant datasets — every plant, ZIP code, and nursery has to reference
vocabulary and regions that actually exist.

To regenerate the Open Graph images:

```bash
npm install          # installs sharp (build-time only)
npm run generate-og  # writes images/og-*.png
```

## Deployment

GitHub Pages serves the `main` branch behind the custom domain in [`CNAME`](CNAME); every
push to `main` publishes automatically. [`ci.yml`](.github/workflows/ci.yml) runs the test
suite, htmlhint, and a lychee link check on every push and pull request.

## License

Source code is released under the [MIT License](LICENSE). Written content — essays, poetry,
prose, and the contents of `writings.html` — is © Ben Siverly, all rights reserved, and is
not covered by the MIT grant.
