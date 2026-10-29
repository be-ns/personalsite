# Ben Siverly - brand

Draft 3.2, October 2026. Direction C: Monocle density, finished. The reasoning
behind the theme. The values live in [`theme.json`](theme.json), compile to
`tokens.css` (`npm run tokens`), and render on [`kit.html`](kit.html), which is
set as an issue of a magazine. Copy rules live in [`my-voice.md`](my-voice.md).

## The idea

**The nudibranch, the orange barn, the marigolds.** Ben's caption: "Orange, acid
green and a dash of Black." Black is the dash, not the page. Orange and green are
fields you can stand in, the way the barn wall fills the painting and the green
body fills the nudibranch. Charcoal is the reading ground between them.

The bones of a fine periodical (Monocle's density, Works in Progress's covers and
interiors). The manners of quiet sportswear (Joah Brown, Skims). Controls people
already know (Material 3).

## Masthead and cover

**Ben Siverly.** No separate publication name. The cover is a Works in Progress
composition:

- A solid issue-colour ground. Autumn and Winter issues are Toxic Orange;
  Spring and Summer issues are Goody Gumdrop. The season and year are the
  issue's own, set in the markup, never read from the visitor's clock.
- The nameplate in the Fraunces display cut (optical size 144, weight 800:
  sharp wedge serifs, high contrast), caps, drawn as one SVG path so it spans
  the cover edge to edge at every width, the way the Works in Progress wordmark
  does.
- An issue line between two rules: `Autumn 2026 - Product, data and AI - Issue 01`
  (the separators are drawn rules, never typed dashes).
- A framed illustration that takes most of the cover.
- Cover lines tight to the frame: up the left edge, down the right, along the
  bottom, separated by short drawn rules, a hairline running to a `+` crosshair
  at each end. On wide covers they are headlines, not navigation; the contents
  page beside the cover holds the links.
- On phones (under 520px, chosen by viewport width, never by the cover's own
  size) the cover is the whole first screen: a standfirst under the issue line,
  the frame, then the cover lines as tappable rows (numeral, headline, arrow),
  one per department. They stand in for the contents list, which phones skip;
  the editor's note that follows says something the standfirst does not.
- Grain sits under the type on every field and on the cover, never over it.
- One seal a page: on the cover, a Goody Gumdrop scallop with a Toxic Orange
  rim (the nudibranch) carrying the one number that matters, 44% to 70%. Its label never drops
  under 12px, and the figures and label always sit inside the dashed ring.

On wide screens the cover and the contents page open as a spread, so the first
screen holds the positioning, the proof and both buttons, with at least 24px of
air above the fold at 1280x900.

## Readers

Ben is independent: he left AppFolio in October 2026, builds Brava with his
brother, and takes a few strategy and operations clients at a time. The site
serves two readers.

**A hiring manager** with about ten seconds, looking for four things. Each
needs proof on the first screen, not a claim.

| Signal | Proof |
| --- | --- |
| Taste | The site itself. The writing. |
| Data | Applied research at Oracle, data science at Lively. Every number carries a source note. |
| PM | AppFolio rental applications: submissions 44% → 70%, vacancies filled 3.4 days faster. |
| AI | AI features at AppFolio. Agent-ready tools (llms.txt, WebMCP). AbiertoClaw. Brava's AI pipeline. |

**Small and mid-size companies and startups** looking for strategy and
operations help, the first call when something new (AI models, agents, a data
question) might change how they run. Product management is one way the work
gets done, not the headline. They have 05 Consulting:
a line on the contents page, a short department after Writing, a line in
every colophon, and four pages of their own (consulting.html and its rate
card, problems and perspective, made from Markdown in `content/consulting/`).
Never on the cover, the cover lines or In brief, so the first screen still
answers the hiring manager, and the price only on the rate card.

## Feel

**Fresh. Dynamic. Organic.** Dense but calm. Every department changes the page:
a new ground, a new layout, a new piece of art.

Never: a SaaS template, a single blog column with the right half empty, costume
vintage (sepia filters, fake film borders, typewriter fonts). The grain is
atmosphere, not a costume.

## References: what we take

**Works in Progress (print).** The framed cover and its wordmark, with cover
lines and crosshair terminals. Feature openers on a bold colour band with
decorative caps, checkered rules and a running line of text around the border.
Interiors: two columns, running heads, charts in one spot colour with a thin
frame and numbered italic captions, stippled engravings framing the text.

**Monocle.** Numbered departments. A contents page with dot leaders. A briefing
strip: five short items, one number each, with sources. Small framed images.
Condensed tracked labels. Plantin and a plain sans, which here are Newsreader
and Instrument Sans.

**What we leave behind:** page numbers. A web page has none, so any we printed
would be invented. The contents and kickers give reading time instead, counted
from the words on the page (230 a minute), and running heads carry the
department number.

**Material 3.** Anatomy and behaviour of buttons, chips, segmented buttons, text
fields, the bottom sheet, state layers and motion.

**Joah Brown, Skims.** Pills, condensed tracked caps, bone and charcoal, few
variants, nothing shouting. We take the manners.

## Editions

- **Night** (default). Gondola `#34302F`, Ben's own swatch, is the page. Never black.
- **Day.** Paper ground. Quiet "Night / Day" words in the masthead (in the menu
  sheet on phones), remembered. Always used for print and the résumé PDF.
- **Inserts.** The Writing department is printed on the other stock: paper inside
  the Night edition, charcoal inside the Day edition. Paper is set in the
  markup, and tokens.css turns it charcoal in Day (on screen; print is always
  Day), so the insert is right before any script runs and never flashes.
- Night stays the default even when the device asks for light mode.

## Color

Ratio, by area: roughly 55% charcoal, 30% colour fields (orange and green), 15%
newsprint. Every screen of a page should hold a colour field or a piece of art.
Orange touches green at least once (the rim on the Workshop field, the seal).

### Night

| Role | Name | Hex | Use | Contrast |
| --- | --- | --- | --- | --- |
| Ground | Gondola | `#34302F` | The page | |
| Sunk | Deep Gondola | `#2A2625` | Briefing, colophon, the cover art's ground | |
| Surface | High Gondola | `#3E3937` | Text-field containers | |
| Raised | Higher Gondola | `#48423F` | Menu sheet | |
| Ink | Newsprint | `#EFE8DC` | Body text | 10.7 on ground |
| Quiet ink | Ash | `#B8AFA3` | Captions, folios, notes | 6.0 on ground |
| Spot | Ember | `#FF8460` | Small orange text: department numbers, units, note markers | 5.4 on ground |
| Spot, large | Toxic Orange | `#FE5F35` | Orange type 24px and up, chart ink, numerals | 4.3 on ground |
| Leaf | Goody Gumdrop | `#CAD576` | Kickers, pull quotes | 8.3 on ground |
| Fields | Toxic Orange, Goody Gumdrop | | The cover, the Work band, the Workshop field, selected states, the one orange button | |
| Ink on fields | Char | `#1F1B1A` | All type on orange and green | 5.6 on orange, 10.8 on green |
| Quiet ink on green | Moss | `#404026` | Descriptions on the Workshop field | 6.7 |
| Outline | Pewter | `#A0978C` | Control boundaries | 4.5 on ground |

### Day

| Role | Name | Hex | Use | Contrast |
| --- | --- | --- | --- | --- |
| Ground | Paper | `#F4EFE6` | The page | |
| Ink | Gondola | `#34302F` | Body text | 11.4 |
| Spot | Burnt Orange | `#B63A14` | Orange text, chart ink | 5.1 |
| Leaf | Olive | `#5C6B1E` | Green as text | 5.1 |

Fields keep full Toxic Orange and Goody Gumdrop in both editions, with Char type.
As text on paper they fail (2.7 and 1.4), so on paper orange type is Burnt Orange.

**Never:** white text on green or orange. Pure black or pure white anywhere.
Muddy tints of the brand colours (no olive-drab "leaf container").

## Type

All free (SIL Open Font License) and self-hosted. Three families.

| Job | Family | Settings |
| --- | --- | --- |
| Nameplate, wordmark | **Fraunces** display cut | 800, optical size 144, one static instance (17 KB), caps |
| Feature openers | Fraunces | 640, SOFT 100, caps: soft decorative display on a colour band |
| Headlines | Fraunces | 360, SOFT 50, tight tracking: light, so they don't fight the nameplate |
| Figures, numerals | Fraunces | 300, SOFT 0 for figures, SOFT 100 for department numbers |
| Pull quotes | Fraunces italic | 380, SOFT 100, in Goody Gumdrop (Burnt Orange on paper) |
| Text | **Newsreader** | 17px body, two ragged-right columns on wide screens, hyphenated, `text-wrap: pretty` |
| Labels, folios, buttons | **Instrument Sans** | Width axis kept: kickers at 85%, folios at 80%, buttons at 88%, tracked caps |

- Optical size is pinned to keep files small: Fraunces at 72, Newsreader at 16.
  Instrument Sans now ships with its width axis (Latin subset, 57 KB), which is
  what makes the Monocle-style condensed labels possible without a fourth family.
- Weight and width carry the hierarchy as much as size.

## Texture: grain, fades, art

- **Grain.** Fine film grain: one SVG tile of soft light and dark specks on
  separate noise channels, so it shows on charcoal and on paper. Many faint
  specks, not a few bright ones; bright ones read as white dust at 1x. Measured
  on screen (standard deviation of luma): about 4.5 levels on Gondola, with
  under 0.2% of pixels more than 20 levels off; 9 on paper; 8 on the orange
  and green fields. Orange fields carry an extra layer; Goody Gumdrop a lighter
  one. Both sit under the type, so small text on a field stays clean. Never animated; off
  in print.
- **Fades.** The grainy fade of an old print, used sparingly: about 120px where
  the charcoal briefing runs into the orange Work opener, and where the paper
  Writing insert runs into what follows it: the charcoal Kit on `kit.html`, the
  colophon's sunk ground on the home page. A CSS gradient with a second
  pass of grain across its middle, which dithers the ramp. The paper fade
  passes through warm sepia, never neutral grey, like a faded print's edge.
  No large SVG blurs.
- **Light leaks.** One faint orange leak behind the contents page and one faint
  green leak in the Kit: cheap radial gradients under the grain.
- **Sun-fades.** A pale bloom at one corner of each colour field and a burn at
  the far edge of the large orange ones. Never a burn under small type: the
  cover's foot is lifted, not burned, so the credit keeps its contrast.
- **Edges.** Where a field meets the page, a ruffled edge with an orange rim:
  the nudibranch. Checkered rules and a running line of text frame the Work band.
- **Photos.** One treatment as an SVG filter in the page: colour at 70%, blacks
  lifted to `#4A413B`, highlights held at `#E8DCC8`, grain. Photos are small and
  framed (the editor's portrait), never the cover.
- **Illustration.** Engraved and stippled line art drawn as inline SVG by a
  seeded generator (`generate-kit-art.js`, `npm run generate-art`): a still
  life of marigolds and hanging amaranth in a stoneware jar (the cover; from
  Ben's palette photo), a street of apartment buildings with one orange-lit
  window (the Work feature; rental applications), and a single marigold. Crops
  of the still life do the small jobs, like the tall strip in the Writing
  margin. The marigolds are domes of small ruffled petals with no centre disc,
  in several sizes and angles, some in profile on a green calyx, with buds
  among them. The amaranth hangs in long tapering tassels of clustered seed,
  knobbly at the edge, never a string of beads. Line work inks in Newsprint on charcoal and Char on paper. The mood
  images (the cow painting, the nudibranch) aren't ours to publish.
- **Plates.** Small framed drawings in the same hand, one a page where a page
  needs its own: California poppies for the Native Plant Finder, an orange
  watering can over a seedling for Life Strategy, a bronze balance weighing a
  marigold for Decision Assist, a lit candle with a marigold laid beside it for
  the three memorial tools, and a trowel left in the dirt by a marigold
  seedling for Consulting (new tools, tried on real work first). Coloured fills
  under Char outlines, shade cut with the hatch masks, no ground of their own:
  the frame gives them the dark plate.

## Layout grammar

- **Grid:** 12 columns from 840px up, 1.25rem gaps. One column with 16px gutters
  on phones.
- **Departments:** 01 Work · 02 Method · 03 Workshop · 04 Writing ·
  05 Consulting, the five the home page carries; the masthead and menu name
  the first four, the proof a hiring manager came for. `kit.html` sets
  01 to 04 as specimens and numbers its own 05 Kit, a supplement the
  colophon links as "How this issue is made". Each opens with a large soft
  numeral, its reading time, a light headline and a ruled intro, and each
  sits on its own ground.
- **Running heads** on every department: department number, title, and
  "Ben Siverly · Issue 01 · season" on the other side, alternating sides like
  left and right pages. On phones, number and title only.
- **Running borders** set whole phrases, justified so a line always ends on a
  word; never a phrase clipped at the edge. On phones, where only a phrase or
  two fit, they are centred at their natural spacing instead.
- **Story:** kicker → decorative caps on the band → deck → byline. Inside: two
  ragged-right columns with a drop cap (`initial-letter`), a ruled margin column
  with a terse "At a glance" strip (company, role, what shipped) and numbered
  source notes, then the chart, then shorter
  briefs, then the street engraving along the bottom.
- **Briefs:** a large Fraunces figure with a small unit in Ember (word units
  set off by a thin space), a tracked-caps label and one source. No body line
  that restates the story. Every fact matches the home page or the résumé.
- **Say it once.** A sentence appears once on the page. The cover, contents,
  briefs and story each add something; the headline figure is not repeated in
  a margin.
- **Notes:** circled numerals in the text link to notes in the margin; on phones
  the notes sit after the text, always visible.
- **Charts:** one spot colour, thin frame, tracked-caps title, `Fig. n` caption,
  labels in HTML so they stay readable on phones, and a plain-English takeaway
  beside the legend ("26 more of every 100 started applications now get
  submitted"). Show only real numbers. Where a chart has one region that asks
  for action (Invest on the Life Strategy matrix), that region alone takes the
  chart wash, Toxic Orange at 14% on Gondola and 12% on paper (`spot-wash`),
  and its points turn orange. A focused point keeps its ground-colour gap and
  takes the focus ring outside it, so focus shows on an orange point too.
  Points that would land on each other sit side by side, up to three; four or
  more share one point marked with how many (×4), and its label names them.
- **Tools:** a Workshop tool is a calm work surface on the plain ground: no
  fields, fades, rims or seals while you work. It opens like a department
  (kicker, a light headline, a deck, the one orange button, the marigold in a
  frame, then How it works and the example as Fig. 1), and its results read
  like a short feature: the one priority set large in orange, the chart, the
  lists under hairlines. What it prints is shown first as a paper proof.
- **Writing:** the index and every piece are printed on the insert stock and
  fade into the colophon. The index is the department: the sprig in its
  margin, then Poetry, Prose and Short Stories as shelves, each entry one
  link with its own first lines (a poem's keep their line breaks). An essay
  is a feature: on wide screens a spread, the kicker, a light headline, the
  deck, the byline and the marigold plate held on the left while the text
  runs down the right at the measure, drop cap first. A poem is one column
  as wide as its longest line, the title as written in Fraunces italic, the
  marigold in the margin, each line its own block with a hanging indent so
  a wrapped line reads as carried over. Serotiny, the long read, opens on an
  orange band with its title in the display caps and the still life beside
  it; its chapters are soft numerals between hairlines, with a list to jump
  to (held beside the text from 1024px; below that a Chapters link waits at
  the foot of the screen once the list has scrolled away), and the machine
  speaks in Instrument Sans on the sunk stock with an orange rule. Every
  piece ends with the way on: the piece before and after it in the index's
  order, and All writing. The words are never restyled. On paper a piece
  prints alone at 12pt, so a short one takes one sheet, and a poem's year
  stays with its last stanza. Kit 5.6 shows the feature, the poem and the
  long read.
- **Phones:** under 600px the Kit subsections and the Writing list close into
  M3 list rows, each title a disclosure button with one short line under it,
  so the page is a third shorter. From 600px up they are plain headings.
- **End marks:** a small orange square closes a piece. It is drawn as a
  border, so it prints with the dialog's Background graphics box off.

## Components: Material 3, dressed quiet

- **Buttons:** filled (Newsprint, Char label), outlined (1px Pewter), text
  (tracked caps with a drawn arrow, underline on hover). One filled orange button
  per page. On an orange or green field, buttons turn Char with a Newsprint label.
- **Labels:** Instrument Sans 12px, 600, 88% width, tracked 0.14em, uppercase.
  48px targets.
- **Chips and segmented buttons:** full pills; selected is solid Goody Gumdrop
  with a Char label and a small dot, no checkmark. The edition switch is not a
  segmented button: it is two quiet folio-caps words, "Night / Day", with an
  orange rule under the active one (still buttons, with `aria-pressed`).
- **Text field:** M3 filled field: a quiet container, small caps label, a 1px
  rule that turns into a 2px orange rule on focus, supporting text below.
- **Menu:** an M3 bottom sheet on phones and tablets, opened by a button labelled
  "Menu": large Fraunces department names with orange numerals and arrows, the
  edition words, and a full-width Résumé pill. The departments sit in the
  masthead on wide screens. On phones the masthead holds the issue folio (the
  wordmark once the cover scrolls away), Résumé and Menu.
- **Teasers, not cards:** an engraving crop, kicker, title, one line, a text
  button. No boxes, hairlines between columns.
- **States:** hover 8%, focus 10%, press 12%, a 2px focus ring (Char on fields),
  pills ease to 12px corners on press. No shadows. The Kit renders every state.
- **Colophon:** "Write to me" as an outlined pill that copies the address (the
  home page's pattern, with a live status line), "For agents: llms.txt", and
  one line to 05 Consulting.
- **Rate card:** a seed-catalog price list on the paper stock (an insert, so
  charcoal in Day): a double rule and folio caps across the top, one engraved
  marigold plate in a hairline frame with crosshair corners, the page's one
  seal on its corner ("Free, first conversation"), one number in light
  Fraunces with its dollar sign raised and its unit in orange, the shapes of
  work on dot leaders (a name too long to share a line puts its terms on the
  next), and the page's one orange button, which copies the address. It
  prints alone on one Letter page, the button giving way to the address.
- **Tool bar:** a running head with the department, the tool's name and a
  text button, Start over, that appears once there is something to start over.
- **Progress steps:** one real button per step, a bar over a tracked-caps name:
  a hairline in Pewter not yet answered, Goody Gumdrop (olive on paper) with its
  value once answered, a heavier orange bar for the current one. On phones the
  bars and values stay and the names go to screen readers.
- **Slider:** the M3 Expressive anatomy, dressed quiet: a hairline track, a
  heavier active track in Goody Gumdrop (olive on paper), a bar handle in ink
  with a gap either side, numbered stops below with a ruler tick over each and
  the chosen one underlined in orange, like the edition words. Focus rings the
  handle. Not set yet, it is all Pewter and the hint takes the figure's place.
  It stays a native range input, so keys and screen readers work as usual.
- **Paper proof:** whatever a tool prints, set on Day stock in either edition
  (`data-edition="day"`, no `data-insert`, so it never flips), with grain on
  screen and none on paper.
- **Résumé:** the same proof stock, one Letter sheet set at its printed size
  in inches and points, shown at 115% from 1024px and 125% from 1120px
  (where its smallest caps reach 12px), so the screen breaks every line
  where the PDF does. Narrower screens never show it at print size: the
  type comes up to 16px and the lines reflow. The name in light Fraunces,
  companies in Fraunces, text in Newsreader, labels and dates in Instrument
  Sans. Burnt Orange for the version's title and the line markers; Toxic
  Orange once, the end mark. The marks are drawn, not typed, and print with
  the dialog's Background graphics box off (`print-color-adjust: exact`).
  Caps on the sheet track at 0.08em, because a PDF reader takes wider gaps
  for spaces. The tool bar stays under the masthead where it fits on one
  line. The PDFs come from the page's own print CSS
  (`npm run generate-resume-pdf`), one Letter page each, Day ink on white.

## Share cards and the site icon

- **Share cards** (`npm run generate-og`, `generate-og-images.js`): the picture
  a link shows on LinkedIn, Slack and the rest, 1200 by 630, one system for
  every page. Each card is a page of the issue in miniature, set with
  tokens.css and site.css through headless Chromium: a running head in folio
  caps, the department's soft numeral in the left wing, the words in the
  middle, a framed engraving with crosshair corners in the right wing, and the
  address on a hairline foot. The field is the department's: Toxic Orange for
  the cover and any piece that opens on an orange band (Serotiny), Goody
  Gumdrop for the Workshop tools, paper for Writing and the résumé, charcoal
  with a ruffled orange rim on a pale green body for Consulting (the
  nudibranch). The words (a kicker, the title, one line a person can read on
  a phone) stay between x 300 and 900, so a square crop keeps all of them.
  The filenames are public and never change; the alt text is the card's own.
- **Site icon:** "BS" from the nameplate's display cut, drawn as paths, Char
  on a Toxic Orange square: the cover at 16 pixels. Chosen over a single B,
  the letters on Gondola and a simplified marigold, side by side at 16, 32 and
  180: the B alone read well but lost the name, Gondola vanished in a dark tab
  strip, and the marigold was a blob at 16. `favicon.svg` is the source; the
  Apple touch icon, the manifest's icons and the maskable one are drawn from it
  (`npm run generate-icons`). The theme colour stays Gondola, and turns paper
  with the Day edition.

## Motion

- Things arrive once and sit still. The masthead wordmark fades in only after the
  cover nameplate scrolls away.
- "Dynamic" lives in the content: the season in the issue line, the issue colour.
  Both change with each issue, not with the reader's clock.
- `prefers-reduced-motion`: no movement.

## Accessibility floor

- WCAG AA everywhere: 4.5:1 for text, 3:1 for large text, controls and chart ink.
  Every pair kit.html uses is listed in `theme.json` and checked by the tests.
- Contrast is measured with the grain on.
- Rotated cover lines are never the only route to anything.
- Print: Day edition, no grain.

## Decided

1. Night is the default on every device, whatever the system setting.
2. Fraunces for display.
3. The whole kit gets the redesign, tool pages included, not just their headers.
   Anything a tool prints (pamphlets, worksheets, the résumé PDF) prints in the
   Day edition, on paper.
4. The palette is used as fields, not hairlines; Gondola itself is the Night page.
