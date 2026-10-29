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

The dev dependencies that touch pixels, headless Chrome through
[Puppeteer](https://pptr.dev/) and [sharp](https://sharp.pixelplumbing.com/), power offline
scripts that draw the share cards, the site icons and the résumé PDFs. They never ship to the
browser.

One asterisk. The parts every page shares (the head links, the masthead and menu, the
colophon, the chrome script and the engravings) are stamped into each page by
[`build-pages.js`](build-pages.js), between `<!-- chrome:NAME -->` markers, from
[`site.json`](site.json). The output is committed, so a plain checkout is still exactly what
production serves, and view-source still shows everything. To change the chrome, edit
`site.json` or `build-pages.js` and run `npm run pages`; never edit between the markers by
hand. CI fails when a page is stale. The chrome is frozen: a change to it also updates the
fingerprints in `test/fixtures/chrome-freeze.json`, in the same commit, on purpose.

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
index.html                 Home, set as the issue: cover, contents, In brief, departments 01-05, colophon
llms.txt                   Agent-readable guide to the tools
theme.json                 Theme source of truth: color, type, space, texture, motion, components
tokens.css                 Generated from theme.json by build-tokens.js (npm run tokens)
site.css                   The shared periodical styles, the issue's cover and departments among them
site.json                  Facts the shared chrome carries: issue, departments, résumé PDF, contact, home colophon
build-pages.js             Stamps the shared chrome into each page between markers, and makes the Consulting pages (npm run pages)
content/consulting/        05 Consulting as Markdown, one file per page; also served as-is for agents
consulting*.html           Made by build-pages.js from content/consulting/: the front page, rate card, problems, perspective
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
resume.html                One-page resume on proof stock, with its four PDFs
render-resume-pdf.js       Prints the four resume PDFs and checks them: one Letter page, the site's fonts, reading order
assets/native-plants/      Static JSON datasets: plants, regions, nurseries, ZIP index
images/                    The share cards (og-*.png, 1200x630) and the manifest's icons
generate-og-images.js      Draws the share cards in headless Chrome with the site's own CSS and fonts (npm run generate-og)
generate-icons.js          Draws apple-touch-icon.png and the manifest's icons from favicon.svg (npm run generate-icons)
generate-kit-art.js        Seeded drawings for the engravings and plates, stamped by build-pages.js
check-browser.js           Headless-Chrome checks: overflow, first screen, menu, tool keys, contrast, print, Writing, Consulting, agent contract
test/                      Test suite (node:test, no dependencies)
test/page-sandbox.js       Runs a page's scripts in node:vm to read its WebMCP tools and URL parameters
test/fixtures/             The agent contract, captured before any tool was restyled, the chrome freeze, the resume's and Writing's words, and the Markdown renderer's golden file
```

`sitemap.xml`, `robots.txt`, `site.webmanifest`, and `CNAME` handle discoverability and
GitHub Pages hosting.

## Design

The site is moving to a periodical design, set out in [`brand.md`](brand.md) and rendered
on [`kit.html`](kit.html). Pages on it (the home page, the kit, the 404, the résumé, the
Writing pages, 05 Consulting and the Life Strategy Matrix, the first tool) read
`tokens.css`, compiled from `theme.json`, and the shared `site.css`, with self-hosted
Fraunces, Newsreader and Instrument Sans, in a Night and a Day edition. The pages not yet
moved still use the old system in `styles.css` (Inter, Zilla Slab, JetBrains Mono) or their
own scoped copy; [`redesign-plan.md`](redesign-plan.md) lists the order. Motion respects
`prefers-reduced-motion`, and the pages use semantic landmarks, a skip link, visible focus
states, and live regions for async feedback.

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

After editing `theme.json`, run `npm run tokens`; after editing `site.json`, `build-pages.js`,
a drawing or a page in `content/consulting/`, run `npm run pages`. The Consulting pages are
written whole from their Markdown (a small, safe subset: `build-pages.js` lists it and stops on
anything else, em dashes included), along with their block of `sitemap.xml` and their section of
`llms.txt`; never edit `consulting*.html` by hand. `npm run check-browser` (after `npm install`, Node 22.12 or
later) opens every redesigned page and every tool in headless Chrome; name groups to run fewer,
e.g. `node check-browser.js agent-contract`. In CI the agent contract is a required job and the
other groups are advisory.

Prospective clients are never named on the site. To guard that locally, list their names in
`.client-names` at the repo root (one a line; `.gitignore` keeps it out of the repo) and
`npm test` checks every page, every Markdown file, `llms.txt`, `sitemap.xml` and the latest
commit message against it. Without the file the check skips.

The test suite covers page invariants (titles, descriptions, canonical URLs, heading
structure), internal links and `#fragments`, sitemap coverage, inline-script syntax, the
agent contract (each tool page's scripts run in `node:vm`, so the WebMCP tools it registers,
the URL parameters it reads and the storage keys it touches must match the fixture, as must
the labels `llms.txt` quotes),
the chrome ratchet (which pages carry the shared chrome, which are pending, which are
exempt and why), the chrome freeze (every page's masthead, menu, head links, colophon and
chrome script come from the same partials, pinned by `test/fixtures/chrome-freeze.json`), the
contrast pairs the tools' slider and progress steps need, the characters each vendored font
carries, the Consulting pages (the Markdown renderer against a golden file and every input it
refuses, one rate on the card, in the JSON-LD and in `llms.txt`, and every number on the
problems page quoting the résumé word for word), and the
integrity of the native-plant datasets: every plant, ZIP code, and nursery has to reference
vocabulary and regions that actually exist.

To redraw the share cards and the icons:

```bash
npm install             # installs Puppeteer and sharp (build-time only)
npm run generate-og     # writes images/og-*.png, one card a page; refuses any card whose words leave the middle
npm run generate-icons  # writes apple-touch-icon.png and images/icon-*.png from favicon.svg
```

## Deployment

GitHub Pages serves the `main` branch behind the custom domain in [`CNAME`](CNAME); every
push to `main` publishes automatically. [`ci.yml`](.github/workflows/ci.yml) runs the test
suite, htmlhint, and a lychee link check on every push and pull request.

## License

Source code is released under the [MIT License](LICENSE). Written content (essays, poetry,
prose, and the contents of `writings.html`) is © Ben Siverly, all rights reserved, and is
not covered by the MIT grant.
