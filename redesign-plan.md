# Redesign plan

October 2026, written at step 3 of the brand work and kept current. How the
approved design in `kit.html` reaches every page, in what order, and what the
new Consulting section looks like. Built from an inventory of every file, three
competing architecture proposals, a consulting draft and a critic's review.
Brand reasoning stays in [`brand.md`](brand.md).

## Decided by Ben

- **Status:** left AppFolio in October 2026. AppFolio becomes past tense on every
  page, in JSON-LD (`worksFor` goes) and in llms.txt.
- **Consulting:** a department of its own (05), with four pages: strategy and
  operations for small and mid-size companies and startups, when something new
  (AI models, agents, a data question) might change how they run. Product
  management is one way the work gets done.
- **Rate:** $250 an hour. A free first conversation. Flexible on outcomes and on
  the number of hours.
- **Pricing presentation:** a rate card, not a tier table. It shows taste through
  craft and does not claim it in a slogan.
- **Never named on the site:** prospective clients.

## Architecture: stamped chrome, committed output

The repo already has two "generator writes between markers, output committed, a
test byte-compares it" tools (`build-tokens.js`, `generate-kit-art.js`). The
shared chrome becomes the third. View-source still shows exactly what runs, and
the site still works from a plain checkout with no build step.

1. **`build-pages.js`** (zero dependencies, `--check` mode, `require.main` guard).
   It stamps shared regions into every page between markers, inlines the
   engraving symbols each page uses, writes reading times, and renders the
   Consulting Markdown into pages. It absorbs `generate-kit-art.js`'s file
   writing (the art functions stay a library).
2. **Markers:** `<!-- chrome:NAME {json} --> ... <!-- /chrome:NAME -->` for `head`,
   `top` (skip link, icons, masthead, menu sheet), `colophon`, `script`, `art`.
   A closed parameter list (`dept`, `art`, `colophon`, `root`). The generator fails
   on unknown keys, misplaced regions, an `h1` inside a region, or id collisions.
3. **`site.json`:** issue number, season, departments, the public résumé PDF,
   the contact address (base64, as today), consulting switch.
4. **`site.css`:** hand-written, extracted from `kit.html`. Anything two or more
   pages use goes here; one-page CSS stays inline. Adds `prefers-contrast` and
   `forced-colors` blocks (the kit draws several control edges with box-shadow,
   which Windows high contrast drops).
5. **One inline chrome script** at the end of `body`: edition words, theme-color,
   menu sheet, copy-email, disclosures. A tiny pre-paint snippet in `head` applies
   the saved edition. No external `site.js`, no custom elements.
6. **Inserts flip in CSS, not JS:** `build-tokens.js` emits the Day rule for
   `[data-insert]`, so paper inserts never flash.
7. **Print:** Day roles from `tokens.css`; `site.css` print hides grain, fades,
   masthead, menu and colophon and drops backgrounds. Roles are never redefined.
8. **Ratchet:** `test/chrome.test.js` keeps a PENDING list that may only shrink and
   an EXEMPT list with reasons. Chrome markup freezes after the home page and Life
   Strategy ship.
9. **Agent safety first:** before any tool is touched, capture
   `test/fixtures/agent-contract.json` from today's pages: every WebMCP tool name
   and input schema, URL parameters, storage keys, and the labels llms.txt quotes.
   Every tool slice must match it.
10. **Browser checks:** one `check-browser.js` (Puppeteer, already a dev
    dependency) for overflow, first-screen bounding boxes, print page counts and
    menu keyboard behavior. Runs locally and as a non-blocking CI job. The node
    test job stays dependency-free.

## Page map

| Page | Template | Size | Must survive |
| --- | --- | --- | --- |
| index.html | The issue: cover, contents, In brief, departments, colophon | L | Person `@id #ben` (tool pages point at it), old section ids as aliases |
| resume.html + 3 PDFs | Résumé on proof stock | L | `?version=` and `?role=`, one Letter page each, PDF filenames |
| writings.html | 04 Writing index | M | three groups, links to every piece |
| 2 essays | Feature on paper insert | S | JSON-LD BlogPosting, text unchanged |
| 4 poems | Poem | S | line and stanza breaks exact |
| serotiny.html | Long read | M | 11 chapters, feedback box |
| life-strategy.html | Tool: wizard | M | 8 URL params, WebMCP `assess_life_balance`, print view |
| decision-assist.html | Tool: wizard | M | URL params, two WebMCP tools, print |
| native-plant-finder.html | Tool: finder | L | ZIP/sun/water params, favorites storage, jsPDF and print |
| memorial-pamphlet.html | Tool: builder with paper proof | L | jsPDF two-page landscape output, URL params |
| service-of-life.html | Tool: builder with paper proof | L | draft storage, print order of service |
| memorial-preferences.html | Print form | M | exactly one page at Letter and A4, `print=1` |
| 404.html | Field page | S | noindex, root-absolute links |
| consulting.html + 3 pages | Resource doc (from Markdown) | L | new |
| orale.html | Private app: head stamp only | S | storage key, single-user flow |
| cmp-case-study.html | Frozen (exempt) | - | noindex, untouched |
| kit.html | Specimen, noindex | - | the reference for every template |

Also touched: `llms.txt`, `sitemap.xml`, `site.webmanifest`, `favicon.svg` (new mark
in the palette), `generate-og-images.js` and all 16 share cards (same filenames)
plus the four Consulting cards, README, CI. `styles.css` is deleted at the end.

## Build order and releases

GitHub Pages serves `main`, so the home page and the pages it links first must
all be on the new design before anything merges. Status, end of October 2026: steps 0 to
6 are done and Release 1 is the next merge. Release 2 is what remains.

| Step | Work | Done when | Status |
| --- | --- | --- | --- |
| 0 | Foundation: `site.css`, `build-pages.js`, `site.json`, CSS insert flip, agent-contract fixture, `kit.html` and 404 as first consumers | tests green, `--check` clean | done |
| 1 | Home page becomes the issue (AppFolio past tense, 05 Consulting department) | first screen holds positioning, proof and both buttons at 1280x900 | done |
| 2 | Life Strategy (proves the tool chrome), then freeze chrome | agent contract unchanged, print view intact | done |
| 3 | Résumé and its three PDFs | each PDF one Letter page, Day edition | done |
| 4 | Writing: index, essays, poems, Serotiny | body text hashes match the originals | done |
| 5 | Consulting: front page, rate card, problems, perspective | content approved by Ben | done |
| 6 | Share cards for every page (four new ones for Consulting) and new plates to go with them, the site icon, the manifest, the rate card's slogan cut, `brand.md` brought up to date | no old palette or fonts on any card; icon reads at 16, 32 and 180 pixels | done |
| **Release 1** | Squash-merge to `main`: everything above | the home page, résumé, Writing and Consulting fully new, and the links to them | next |
| 7 | Decision Assist and Native Plant Finder on the tool template, each with its plate (the balance, the poppies) | agent contract unchanged | to do |
| 8 | The three memorial tools (Memorial Pamphlet, Service of Life, Memorial Preferences) on the tool template, with the candle plate; `orale.html` takes the head; delete `styles.css` and the old fonts only it loads (Inter, JetBrains Mono, Zilla Slab) | printouts unchanged on paper; PENDING in `test/chrome.test.js` empty | to do |
| **Release 2** | Merge to `main` | whole site on the new design | |

## Consulting

**Placement.** Ben is independent, so Consulting gets a department in the issue
(05, replacing the kit's specimen department on the home page), a line on the
contents page, a quieter fifth row in the menu sheet, and a line in the
colophon. It stays off the cover art and the In brief numbers.

**Pages** (Markdown in `content/consulting/`, rendered to the site root):

1. `consulting.html` - front page. Headline draft: **"New tools, tried on real work
   first."** Deck: "I try the new tools on my own work first, and bring you the
   ones that held up." Two short paragraphs, then how it starts: write to me, a
   free first conversation, and before any paid hour we write down what good
   looks like.
2. `consulting-rates.html` - the rate card (below).
3. `consulting-problems.html` - "What to call me about." Seven problems, each a
   plain scene, then where Ben worked on it and the one number that matters, with
   a source note that matches the résumé word for word: people start and don't
   finish; money has to move and be right; nobody can say what a decision did to
   the numbers; everyone is asking about AI; you want to try the new tools and
   have no one to try them; your customers aren't in the room; you need a first
   product person, not a department.
4. `consulting-perspective.html` - "Where I'm from." The Central Valley, the
   Choctaw Nation of Oklahoma, leaving Oracle over the data, the recovering data
   scientist, building his own things, the unglamorous middle, a few clients at a
   time. Ends with selected work as an At a glance list.

**Rate card.** A seed-catalog price list on paper stock inside the Night page.

- Top: a double rule, "Rate card" and "No. 01 · Autumn 2026" in folio caps.
- Left: one engraved marigold plate in a hairline frame with crosshair corners.
  The page's one seal bites its corner: **Free** / first conversation.
- Right: **$250** set large in light Fraunces, the dollar sign raised like a menu
  card, "an hour" small in burnt orange. Then four rows on dot leaders:
  - First conversation ......... Free
  - By the hour ......... $250
  - A block of hours each week ......... $250 an hour, month to month
  - Around an outcome ......... result written down, hours agreed first
- Foot: the page's one orange button, "Ask for a first conversation" (copies the
  email), and "US dollars" in small print.
- Phone: one column; plate cropped 4:3 with the seal on its corner, then the
  number, then the rows. Print: the card alone on one Letter page, on paper.

**Discoverability:** indexed, in the sitemap and llms.txt, with
`ProfessionalService` JSON-LD and an Offer at 250 USD per hour.

**As built (step 5).** The four pages are written in `content/consulting/*.md`
and made whole by `build-pages.js` (its Markdown section lists the subset it
accepts), which also writes their sitemap block and the `## Consulting`
section of llms.txt. The colophon of every page that does not carry the
department itself (the issue and the Consulting pages do) carries the
consulting line; the masthead still names 01 to 04, and the menu sheet adds
05 Consulting as a quieter fifth row (Release 1). Also in Release 1, the
colour came in as fields: each page opens on a Goody Gumdrop field with the
orange rim (the trowel plate on the front page), one Toxic Orange band comes
later, and the four share cards are the nudibranch, a green body with an
orange rim on a dark edge. The open
questions below use their defaults: up to an hour by video, an estimate with
a cap, no weekly minimum stated, no town, the home page's Choctaw wording, no
family line, the copy-email button.

## Open questions for Ben (each has a default so work can proceed)

1. **Cover standfirst** replacing "Product manager at AppFolio". Default: "Product
   manager, data scientist first. Rental applications and payments at AppFolio,
   data at Oracle and Lively. Now helping small companies put what's new to work."
2. **First conversation:** how long and how (default: up to an hour, by video)?
3. **Outcome work:** estimate with a cap, or a fixed fee from the estimate
   (default: estimate with a cap)? Any minimum for a weekly block (default: none
   stated)?
4. **Central Valley:** which town or county, and one object or scene for the first
   sentence (default: no town named until you give one).
5. **Choctaw Nation wording** on the consulting page (default: the home page's
   "Proud future ancestor of the Choctaw Nation of Oklahoma").
6. **Family on a sales page:** OK to say the kids are why you take a few clients
   at a time (default: no, "a few at a time" stands alone).
7. **Contact:** the copy-email button as today, or a scheduling link (default:
   copy-email; scheduling tools track visitors).
8. **Before merging to `main`:** should `brand.md` and this plan ship publicly
   (default: keep them; remove the strategy lines about readers). Done for
   Release 1: both ship, with those lines taken out.

## QA, every step

- `node --test`, htmlhint, lychee, `build-tokens.js --check`, `build-pages.js --check`.
- New tests: chrome ratchet, agent contract, titles and JSON-LD names agree,
  every figure on the home page appears in `resume.html`, in-page `#fragment`
  links resolve, no characters outside the font subsets (re-subset to add the
  thin space and arrows), no client names (gitignored local list).
- Browser checks at 320, 390, 768, 1024, 1280x720, 1366x768, 1440: no overflow,
  first screen holds, menu keyboard behavior, print page counts, forced colors.
