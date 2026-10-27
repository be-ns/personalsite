# Ben Siverly - brand

Draft 1, October 2026. Step 1 of the redesign: this feeds `theme.json` (step 2)
and the specimen page (step 3). Copy rules live in [`my-voice.md`](my-voice.md);
this file covers how the site looks and behaves.

## The idea

**The nudibranch.** A dark field, a pale green body, an orange rim. Most of the
page is quiet charcoal. Green is the living thing. Orange is the edge you notice.

The bones of a fine periodical (Monocle, Works in Progress). The manners of quiet
sportswear (Joah Brown, Skims). Controls people already know (Material 3).

## Masthead

**Ben Siverly.** No separate publication name.

Under the nameplate sits an issue line, the way a magazine carries one:

> 2026 · Product, data and AI · Night edition · Autumn

The season comes from the date, so the cover stays current without anyone
touching it. Separators are drawn hairlines with a small `+` at each end (the
Works in Progress cover move), never typed em dashes.

## Reader

A hiring manager with about ten seconds, looking for four things. Each needs
proof on the front page, not a claim.

| Signal | Proof |
| --- | --- |
| Taste | The site itself. The writing. |
| Data | Applied research at Oracle, data science at Lively. Every number carries a source note. |
| PM | AppFolio rental applications: submissions 44% → 70%, vacancies filled 3.4 days faster. |
| AI | AI features at AppFolio. Agent-ready tools (llms.txt, WebMCP). AbiertoClaw. Brava's AI pipeline. |

**Second reader: fractional clients.** They get their own department, never the
cover. A hiring manager who meets pricing on the front page reads "one foot out
the door."

## Feel

**Fresh. Dynamic. Organic.**

Never (proposed): a SaaS template. Costume vintage: sepia filters, fake film
borders, typewriter fonts. The grain is atmosphere, not a costume.

## References: what we take

**Works in Progress (print).** Two serifs, GT Alpina for text and Lock Serif for
headlines. From the issues:

- **The cover.** Nameplate, an issue line under it, a framed picture in the
  middle, cover lines running up and down the frame's edges. The front page is
  built this way, and the cover lines are the navigation.
- **Running heads** with page number, section and story name. A dotted end mark
  to close a piece.
- **Charts in one spot color:** thin frame, tracked-caps title, numbered caption.
  Ours are orange on charcoal.
- **Engraved, stippled line art** that frames the text column instead of sitting
  in a box.
- **Ornament with restraint:** checkered or dotted borders, `+` terminals on
  rules. One per page.
- **Each issue gets its own color.** Ours: the frame and spot illustration shift
  with the season. The charcoal never changes.

**Monocle.** Plantin with a plain sans. Numbered departments. Small tracked
labels. Dense but calm; sober, uncoated-paper feel.

**Material 3.** Anatomy and behavior of buttons, chips, menus, state layers and
motion. People already know how to use it.

**Joah Brown, Skims.** Quiet sporty luxury: tracked uppercase sans, pill shapes,
earthy neutrals, lots of air, nothing shouts. We take the manners.

## Editions

- **Night** (default). Charcoal ground. This is the brand.
- **Day.** Paper ground. A one-tap toggle, remembered. Always used for print and
  the résumé PDF.
- Night stays the default even when the device asks for light mode
  (recommended; open below).

## Color

Ratio: roughly 80% charcoal, 15% newsprint and green, 5% orange. Orange is a rim,
not a fill.

### Night

| Role | Name | Hex | Use | Contrast |
| --- | --- | --- | --- | --- |
| Ground | Deep Gondola | `#2A2625` | Page background | |
| Surface | Gondola | `#34302F` | Cards, menu sheet, anything raised | |
| Ink | Newsprint | `#EFE8DC` | Body text | 12.3 on ground |
| Quiet ink | Ash | `#B8AFA3` | Captions, bylines, meta | 6.9 on ground |
| Spot | Toxic Orange | `#FE5F35` | Links, rules, focus ring, charts, one CTA per page | 4.9 on ground |
| Spot on surfaces | Ember | `#FF6A43` | Orange text on Gondola cards, where Toxic Orange drops to 4.3 | 4.6 on Gondola |
| Leaf | Goody Gumdrop | `#CAD576` | Kickers, highlights, status, the Fractional section's ground | 9.5 on ground |
| Ink on color | Char | `#1F1B1A` | Labels on orange or green fills | 5.6 on orange, 10.8 on green |

### Day

| Role | Name | Hex | Use | Contrast |
| --- | --- | --- | --- | --- |
| Ground | Paper | `#F4EFE6` | Page background | |
| Ink | Gondola | `#34302F` | Body text | 11.4 |
| Spot | Burnt Orange | `#B63A14` | Links, small orange text | 5.1 |
| Leaf | Olive | `#5C6B1E` | Green as text | 5.1 |

On Day, Toxic Orange and Goody Gumdrop are fills only. As text on paper they fail
(2.7 and 1.4).

**Never:** white text on green or orange. Pure black or pure white anywhere.

## Type

All free (SIL Open Font License) and self-hosted. Three families: two serifs and a
plain sans, which is Works in Progress's pairing plus Monocle's sans.

| Job | Family | Why |
| --- | --- | --- |
| Display: nameplate, headlines, big figures | **Fraunces** (variable) | Our Lock Serif. Its softness and optical-size axes are the organic dial: crisp on a cover, softer in a pull quote. |
| Text: body, decks, sidenotes | **Newsreader** (variable, optical sizes 6-72) | Our Plantin and GT Alpina. Built for reading news on screens. |
| Labels, nav, buttons, folios | **Instrument Sans** (variable width) | The sportswear voice: tracked uppercase. |

- The specimen tests one fallback each: Newsreader at display size instead of
  Fraunces, and Hanken Grotesk instead of Instrument Sans.
- Zilla Slab, Inter and JetBrains Mono retire from the editorial pages. The
  numbers carry the data story; a code font doesn't need to.
- Budget: 200 KB of fonts or less on first load (Latin subset, woff2).

## Texture: grain and fades

- **Grain.** One static film-grain layer over the whole page, faint enough to
  vanish on text and show on charcoal. Generated once offline (`sharp` is already
  a dev dependency). Never animated. Off in print.
- **Fades.** No hard color breaks between sections. The charcoal shifts tone
  through soft gradients, like light falling off at the edge of an old print. A
  light vignette at the viewport edges.
- **Photos.** One treatment, baked offline: blacks lifted to Gondola (never
  `#000`), highlights warmed toward Newsprint, saturation pulled down a little,
  heavy grain, edges fading into the page. A 1970s print found in a drawer. The
  Day edition fades to Paper.
- **Display type.** A faint ink bleed on the nameplate only. Never on body text.
- **Illustration.** Works in Progress commissions engravings and paintings. Ours:
  public-domain botanical engravings of California natives, duotoned Gondola and
  Leaf, with an orange rim on one detail. Line art takes grain well and ties to
  the garden and the Plant Finder. The mood images (the cow painting, the
  nudibranch) aren't ours to publish.

## Layout grammar

- **Story head:** kicker (sans, tracked caps, Leaf) → headline (Fraunces) → deck
  (Newsreader italic) → byline and date (sans, Ash).
- **Numbered departments:** 01 Work · 02 Method · 03 Workshop · 04 Writing ·
  05 Fractional.
- **Running head** on long pages: page number, department, story name.
- **Sidenotes.** Every number gets a source note in the margin on wide screens
  and a tap-to-open note on phones. This is where "data" shows instead of being
  claimed.
- **One big figure per story:** the number that matters, set huge in Fraunces,
  with a label under it. One earned number beats five.
- **Rules:** Newsprint hairlines at low opacity, a double rule under the
  nameplate, `+` terminals.
- Ragged right. Drop cap on long-form only. A text column of about 64 characters
  plus a margin column for sidenotes; one column with 16px gutters on phones.

## Components: Material 3, dressed quiet

- **Keep M3's anatomy and behavior:** filled, tonal, outlined and text buttons;
  chips; state layers (hover 8%, focus and press 10%); 48px touch targets;
  emphasized easing.
- **Dress it:** pill shape; Instrument Sans label, uppercase, tracked about
  +0.08em, 13-14px. No drop shadows: elevation is tone (Gondola raised on Deep
  Gondola), the way M3's tonal surfaces work.
- **One loud thing per page:** one filled orange button, max. Everything else is
  filled Newsprint, tonal Leaf, or a hairline outline.
- **Organic shape:** on press, buttons ease from pill toward a softer square
  (M3 Expressive's shape morph). Its scalloped shapes echo the nudibranch's
  ruffled rim; use them for the portrait mask and the status badge only.

## Motion

- Things arrive once (a fade and an 8px rise, 300-400ms), then sit still.
- "Dynamic" lives in the content, not the animation: the season in the issue
  line, a "Now" line, the latest writing on the cover.
- `prefers-reduced-motion`: no movement.

## Accessibility floor

- WCAG AA everywhere: 4.5:1 for text, 3:1 for UI and large text. Every pair above
  is checked.
- QA measures contrast with the grain on.
- Focus ring: 2px Toxic Orange (Burnt Orange on Day) with a 2px offset.
- Print: Day edition, no grain, no fades.

## Open, to settle in the theme step

1. Night as the default even when the device asks for light mode.
2. Fraunces or Newsreader for display (the specimen decides).
3. Tool pages: header, buttons and type adopt the theme; their work surfaces stay
   calm and their printed outputs don't change.
