# Ben Siverly - brand

Draft 3, October 2026. Direction C: Monocle density. The reasoning behind the
theme. The values live in [`theme.json`](theme.json), compile to `tokens.css`
(`npm run tokens`), and render on [`kit.html`](kit.html), which is set as an
issue of a magazine. Copy rules live in [`my-voice.md`](my-voice.md).

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

- A solid issue-colour ground. Autumn and Winter are Toxic Orange; Spring and
  Summer are Goody Gumdrop. The season comes from the date.
- The nameplate in Fraunces 700 caps, sized to the cover so it spans it exactly.
- An issue line between two rules: `Autumn 2026 - Product, data and AI - Issue 01`
  (the separators are drawn rules, never typed dashes).
- A framed illustration that takes most of the cover.
- Cover lines tight to the frame: up the left edge, down the right, along the
  bottom, separated by short drawn rules, a hairline running to a `+` crosshair
  at each end. On phones they run above and below the frame instead. They are
  headlines, not navigation; the contents page beside or below the cover holds
  the links.
- One seal: a Goody Gumdrop scallop with a Toxic Orange rim (the nudibranch)
  carrying the one number that matters, 44% to 70%.

On wide screens the cover and the contents page open as a spread, so the first
screen holds the positioning, the proof and both buttons.

## Reader

A hiring manager with about ten seconds, looking for four things. Each needs
proof on the first screen, not a claim.

| Signal | Proof |
| --- | --- |
| Taste | The site itself. The writing. |
| Data | Applied research at Oracle, data science at Lively. Every number carries a source note. |
| PM | AppFolio rental applications: submissions 44% → 70%, vacancies filled 3.4 days faster. |
| AI | AI features at AppFolio. Agent-ready tools (llms.txt, WebMCP). AbiertoClaw. Brava's AI pipeline. |

**Second reader: fractional clients.** A line in the colophon, never the cover or
the contents. A hiring manager who meets pricing on the front page reads "one
foot out the door."

## Feel

**Fresh. Dynamic. Organic.** Dense but calm. Every department changes the page:
a new ground, a new layout, a new piece of art.

Never: a SaaS template, a single blog column with the right half empty, costume
vintage (sepia filters, fake film borders, typewriter fonts). The grain is
atmosphere, not a costume.

## References: what we take

**Works in Progress (print).** The framed cover with cover lines and crosshair
terminals. Feature openers on a bold colour band with decorative caps, checkered
rules and a running line of text around the border. Interiors: two justified
columns, running heads with page numbers, charts in one spot colour with a thin
frame and numbered italic captions, stippled engravings framing the text.

**Monocle.** Numbered departments. A contents page with page numbers and dot
leaders. A briefing strip: five short items, one number each, with sources. Small
framed images. Condensed tracked labels. Plantin and a plain sans, which here are
Newsreader and Instrument Sans.

**Material 3.** Anatomy and behaviour of buttons, chips, segmented buttons, text
fields, the bottom sheet, state layers and motion.

**Joah Brown, Skims.** Pills, condensed tracked caps, bone and charcoal, few
variants, nothing shouting. We take the manners.

## Editions

- **Night** (default). Gondola `#34302F`, Ben's own swatch, is the page. Never black.
- **Day.** Paper ground. A one-tap toggle in the masthead, remembered. Always used
  for print and the résumé PDF.
- **Inserts.** The Writing department is printed on the other stock: paper inside
  the Night edition, charcoal inside the Day edition.
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
| Spot | Ember | `#FF8460` | Small orange text: page numbers, note markers | 5.4 on ground |
| Spot, large | Toxic Orange | `#FE5F35` | Orange type 24px and up, chart ink, numerals | 4.3 on ground |
| Leaf | Goody Gumdrop | `#CAD576` | Kickers, pull quotes | 8.3 on ground |
| Fields | Toxic Orange, Goody Gumdrop | | The cover, the Work band, the Workshop field, selected states, the one orange button | |
| Ink on fields | Char | `#1F1B1A` | All type on orange and green | 5.6 on orange, 10.8 on green |
| Quiet ink on green | Moss | `#4A4A2E` | Descriptions on the Workshop field | 5.8 |
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
| Nameplate | **Fraunces** | 700, SOFT 0, caps, sized to the cover |
| Feature openers | Fraunces | 640, SOFT 100, caps: soft decorative display on a colour band |
| Headlines | Fraunces | 360, SOFT 50, tight tracking: light, so they don't fight the nameplate |
| Figures, numerals | Fraunces | 300, SOFT 0 for figures, SOFT 100 for department numbers |
| Pull quotes | Fraunces italic | 380, SOFT 100, in Goody Gumdrop (Burnt Orange on paper) |
| Text | **Newsreader** | 17px body, set in two justified, hyphenated columns on wide screens |
| Labels, folios, buttons | **Instrument Sans** | Width axis kept: kickers at 85%, folios at 80%, buttons at 88%, tracked caps |

- Optical size is pinned to keep files small: Fraunces at 72, Newsreader at 16.
  Instrument Sans now ships with its width axis (Latin subset, 57 KB), which is
  what makes the Monocle-style condensed labels possible without a fourth family.
- Weight and width carry the hierarchy as much as size.

## Texture: grain, fades, art

- **Grain.** One SVG tile of light and dark specks (two thresholds on separate
  noise channels), so it shows on charcoal and on paper. Measured on screen:
  about 5.5 luma levels of variation on Gondola, 6 on paper, 10 on the orange
  fields. Fields carry an extra layer. Never animated; off in print.
- **Fades.** Sun-bleached patches on the colour fields (a pale bloom at one
  corner, a burn at the opposite edge), and a warm orange glow where a story
  starts under its band. No invisible charcoal-to-charcoal gradients.
- **Edges.** Where a field meets the page, a ruffled edge with an orange rim:
  the nudibranch. Checkered rules and a running line of text frame the Work band.
- **Photos.** One treatment as an SVG filter in the page: colour at 70%, blacks
  lifted to `#4A413B`, highlights held at `#E8DCC8`, grain. Photos are small and
  framed (the editor's portrait), never the cover.
- **Illustration.** Engraved and stippled line art drawn as inline SVG from a
  seeded generator: a still life of marigolds and hanging amaranth in a stoneware
  jar (the cover; from Ben's palette photo), a street of apartment buildings with
  one orange-lit window (the Work feature; rental applications), a tall tower for
  the margin, a hanging amaranth sprig for the Writing margin, and a single
  marigold. Line work inks in Newsprint on charcoal and Char on paper. The mood
  images (the cow painting, the nudibranch) aren't ours to publish.

## Layout grammar

- **Grid:** 12 columns from 840px up, 1.25rem gaps. One column with 16px gutters
  on phones.
- **Departments:** 01 Work · 02 Method · 03 Workshop · 04 Writing · 05 Kit. Each
  opens with a large soft numeral, its page range, a light headline and a ruled
  intro, and each sits on its own ground.
- **Running heads** on every department: page number, title, and
  "Ben Siverly · Issue 01 · season" on the other side, alternating sides like
  left and right pages. On phones, page number and title only.
- **Story:** kicker → decorative caps on the band → deck → byline. Inside: two
  justified columns with a drop cap (`initial-letter`), a ruled margin column
  with the big figure, numbered source notes and an engraving, then the chart,
  then shorter briefs, then the street engraving along the bottom.
- **Notes:** circled numerals in the text link to notes in the margin; on phones
  the notes sit after the text, always visible.
- **Charts:** one spot colour, thin frame, tracked-caps title, `Fig. n` caption,
  labels in HTML so they stay readable on phones. Show only real numbers.
- **End marks:** a small orange square closes a piece.

## Components: Material 3, dressed quiet

- **Buttons:** filled (Newsprint, Char label), outlined (1px Pewter), text
  (tracked caps with a drawn arrow, underline on hover). One filled orange button
  per page. On an orange or green field, buttons turn Char with a Newsprint label.
- **Labels:** Instrument Sans 12px, 600, 88% width, tracked 0.14em, uppercase.
  48px targets.
- **Chips and segmented buttons:** full pills; selected is solid Goody Gumdrop
  with a Char label and a small dot, no checkmark.
- **Text field:** M3 filled field: a quiet container, small caps label, a 1px
  rule that turns into a 2px orange rule on focus, supporting text below.
- **Menu:** an M3 bottom sheet on phones and tablets; the departments sit in the
  masthead on wide screens.
- **Teasers, not cards:** an engraving crop, kicker, title, one line, a text
  button. No boxes, hairlines between columns.
- **States:** hover 8%, focus and press 10%, a 2px focus ring (Char on fields),
  pills ease to 12px corners on press. No shadows.

## Motion

- Things arrive once and sit still. The masthead wordmark fades in only after the
  cover nameplate scrolls away.
- "Dynamic" lives in the content: the season in the issue line, the issue colour.
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
