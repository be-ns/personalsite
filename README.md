# bensiverly.com

[![CI](https://github.com/be-ns/personalsite/actions/workflows/ci.yml/badge.svg)](https://github.com/be-ns/personalsite/actions/workflows/ci.yml)

My personal website, plus a small workshop of free browser tools. Live at
[bensiverly.com](https://bensiverly.com).

## How it's built

Everything is hand-written HTML, CSS, and vanilla JavaScript. There is no framework, no
bundler, and no build step: clone the repo, open `index.html`, and you are running exactly
what production runs.

I keep it this way on purpose. Plain files outlive any toolchain, pages are interactive the
moment they load, and the source stays readable: what you read is what runs. The tools work
entirely in the browser: no accounts, no servers, no tracking. Inputs can arrive in the URL,
saved state lives in `localStorage`, and PDFs are generated client-side with [jsPDF](https://github.com/parallax/jsPDF),
loaded only on the pages that need it.

The single dev dependency that touches pixels, [sharp](https://sharp.pixelplumbing.com/),
powers an offline script that renders the Open Graph share images. It never ships to the
browser.

One asterisk. The parts every page shares (the head links, the masthead and menu, the
colophon, the chrome script and the engravings) are stamped into each page by
[`build-pages.js`](build-pages.js), between `<!-- chrome:NAME -->` markers, from
[`site.json`](site.json). The output is committed, so a plain checkout is still exactly what
production serves, and view-source still shows everything. To change the chrome, edit
`site.json` or `build-pages.js` and run `npm run pages`; never edit between the markers by
hand. CI fails when a page is stale.

## The tools

Each tool is one self-contained HTML file.

| Tool | What it does |
| --- | --- |
| [Life Strategy Matrix](https://bensiverly.com/life-strategy.html) | Score eight life areas on importance vs. satisfaction and see where to invest next. Prints a one-page plan. |
| [Native Plant Finder](https://bensiverly.com/native-plant-finder.html) | Find California native plants for your ZIP code and sun conditions, with local nursery suggestions. |
| [Memorial Pamphlet Creator](https://bensiverly.com/memorial-pamphlet.html) | Lay out a simple, dignified memorial-service pamphlet and export a printable PDF. |
| [Service of Life Builder](https://bensiverly.com/service-of-life.html) | Assemble an order of service for a memorial or celebration of life. |
| [Memorial Preferences Worksheet](https://bensiverly.com/memorial-preferences.html) | A one-page form to print and fill out by hand: record service wishes on paper, no screen required. |
| [Decision Assist](https://bensiverly.com/decision-assist.html) | A weighted-criteria decision matrix: score your options against what matters most. |
| [Writings](https://bensiverly.com/writings.html) | Poetry and prose. |

## For AI agents

Every tool is built to be found, read, and run by someone's agent, not just clicked by a
person:

- **[`llms.txt`](llms.txt)** at the site root lists each tool, what it does, its URL
  parameters, and its WebMCP tools, in plain Markdown.
- **URL parameters** prefill a tool, so an agent can hand its person a link that opens on
  the answer (for example `native-plant-finder.html?zip=94110&sun=full_sun`).
- **WebMCP**: in browsers that expose `document.modelContext` (or the older
  `navigator.modelContext`), each tool registers callable tools that run the page's own
  logic and return JSON. Elsewhere the code is a no-op.
- **JSON-LD**: each tool page describes itself as a schema.org `WebApplication` with a
  `potentialAction` URL template.

Nothing is hidden from people: there is no invisible text aimed at models.

## Repository layout

```
index.html                 Home: intro, work, tools, contact
llms.txt                   Agent-readable guide to the tools
theme.json                 Theme source of truth: color, type, space, texture, motion, components
tokens.css                 Generated from theme.json by build-tokens.js (npm run tokens)
site.css                   The shared periodical styles (hand-written, reads tokens.css)
site.json                  Facts the shared chrome carries: issue, departments, résumé PDF, contact
build-pages.js             Stamps the shared chrome into each page between markers (npm run pages)
kit.html                   Design kit: every token rendered, Night and Day editions (noindex)
brand.md                   Brand brief: the reasoning behind the theme
redesign-plan.md           How the redesign reaches every page, in order
styles.css                 The old design system, for pages not yet redesigned
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
generate-kit-art.js        Seeded drawings for the engravings, stamped by build-pages.js
check-browser.js           Headless-Chrome checks: overflow, first screen, menu, contrast, print, agent contract
test/                      Test suite (node:test, no dependencies)
test/page-sandbox.js       Runs a page's scripts in node:vm to read its WebMCP tools and URL parameters
test/fixtures/             The agent contract, captured before any tool was restyled
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
npm run check       # tokens.css and the stamped chrome are current
npm run validate    # HTML lint (htmlhint)
npm run links       # offline link check (lychee)
```

After editing `theme.json`, run `npm run tokens`; after editing `site.json`, `build-pages.js`
or a drawing, run `npm run pages`. `npm run check-browser` (after `npm install`, Node 22.12 or
later) opens every redesigned page and every tool in headless Chrome; name groups to run fewer,
e.g. `node check-browser.js agent-contract`. In CI the agent contract is a required job and the
other groups are advisory.

The test suite covers page invariants (titles, descriptions, canonical URLs, heading
structure), internal links and `#fragments`, sitemap coverage, inline-script syntax, the
agent contract (each tool page's scripts run in `node:vm`, so the WebMCP tools it registers,
the URL parameters it reads and the storage keys it touches must match the fixture, as must
the labels `llms.txt` quotes),
the chrome ratchet (which pages carry the shared chrome, which are pending, which are
exempt and why), the characters each vendored font carries, and the
integrity of the native-plant datasets: every plant, ZIP code, and nursery has to reference
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

Source code is released under the [MIT License](LICENSE). Written content (essays, poetry,
prose, and the contents of `writings.html`) is © Ben Siverly, all rights reserved, and is
not covered by the MIT grant.
