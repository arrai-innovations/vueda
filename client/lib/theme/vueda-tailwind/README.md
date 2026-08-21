# VUEDA Default Theme

Design canon for the VUEDA default theme. The audience is contributors:
anyone editing CSS tokens, theme keys, or primitive SFCs in this folder.

The default theme is the visual expression of the VUEDA brand. Brand
details (mark, accent-blue origin, font choices) live in
[brand/README.md](../../../../brand/README.md) at the repo root; the rules
below are how those brand choices land in the running UI.

Realized canon only: every rule below is in effect in this folder and the
SFC tree today. Where a slot ships deliberately empty or a recipe stops short
of what a surface needs, its own JSDoc says so. Settled-but-unrealized design
work is tracked outside the package, so nothing here points at a plan a reader
of the shipped code cannot see.

Token _values_ live authoritatively in `base.css` and the theme JS files.
This document references token _names_ and section headers; it never
restates values. References use the section-header form (e.g. `see base.css
§ Control sizing`) so they survive file edits.

## 1. Overview

### 1.1 Audience

VUEDA serves two audiences simultaneously, and the design respects both:

1. **Developers evaluating adoption.** Reading the landing page, skimming
   docs, wiring it into their project. They judge the framework by the
   default theme they see in screenshots.
2. **Business users doing transactional data work.** Invoicing, AR,
   inventory, correspondence. They live in this UI 6+ hours a day. Every
   pixel of chrome is a pixel of data they did not get to see.

The design resolves the tension in favour of the operator. The framework
looks serious because it is serious. Developers should feel they are
looking at a purpose-built instrument, not a generic SaaS dashboard.

### 1.2 Posture

| Reference                | What VUEDA takes                                                     |
| ------------------------ | -------------------------------------------------------------------- |
| IBM Carbon (condensed)   | Density, table/form patterns, type discipline, stepped neutral scale |
| Uber Base                | Near-monochrome discipline; one functional accent, earned            |
| Siemens iX               | Operator-facing component thinking, no decorative whitespace         |
| Porsche design principle | No element without function                                          |

**Not:** Material Design, Apple HIG, Salesforce Lightning, Mailchimp. No
gradients, no pillow radii, no floating action buttons, no decorative
illustrations inside the UI, no emoji as UI affordance.

### 1.3 Relationship to shadcn-vue / Reka UI

VUEDA's control layer is built on top of **shadcn-vue** (which wraps **Reka
UI** / Radix primitives). That lineage gives accessibility defaults,
sensible state machines, and a familiar component vocabulary. It is a
starting point, **not a style guide**.

- Treat shadcn-vue / Reka defaults as raw material. Use them as-is where
  they already match VUEDA's posture; override freely (radius, height,
  colour, density, motion, focus treatment, spacing, copy) where they do
  not.
- Where shadcn-vue and VUEDA disagree, **VUEDA wins**. Examples in code
  today: 2px control radius (shadcn larger), 32px default control height
  (shadcn 36/40), 1px hairline borders with no ambient shadow on cards or
  controls, ease-out 120ms motion, cool-neutral 250° hue, single accent.
- Do adopt shadcn-vue's API shape and file organisation. The payoff is
  that future shadcn-vue updates remain mergeable.

If a shadcn default would read as "generic SaaS dashboard" in a side-by-
side with the VUEDA screens, override it.

### 1.4 Brand lineage

See [brand/README.md](../../../../brand/README.md) at the repo root. The
default theme should represent the VUEDA brand; the rules that follow
specify how.

## 2. Colors

VUEDA's palette is a near-monochrome cool-neutral scale plus one accent
plus desaturated status colors. Every token is OKLCH (Tailwind v4 `@theme
inline` mappings). See `base.css § Color palette: light` and
`base.css § Color palette: dark`.

### 2.1 Two axes: neutral + one accent

- **Neutral axis.** Hue 250°, chroma ≤ 0.015. Carries 98% of the UI:
  every surface, border, and text colour resolves through `--background`,
  `--foreground`, `--card`, `--popover`, `--muted`, `--secondary`,
  `--accent`, `--border`, `--input`, `--sunken`, `--overlay`, and the
  parallel `--sidebar-*` set.
- **Accent axis.** VUEDA blue, anchored at `oklch(0.58 0.19 254)` =
  `#0077f7`. Bound to `--primary`. Used for: the primary action in a
  context, focus rings (`--ring` aliases `--primary`), selected-row
  signals, the brand mark. Not used for: links in body copy, info
  banners (info has its own token, see § 2.4), chart fills by default,
  decorative tints.

Dark mode is the primary target for operators; light mode is equally
disciplined. Dark mode is one shade darker than `--background`; cards step
up; sidebar is one shade darker than background to read as chrome, not
content.

### 2.2 Selection vs CTA: `--accent` vs `--primary`

A pressed Toggle, a "this view is active" segmented-control state, a
selected menu item: all use `--accent` (neutral surface hover). A primary
Button, the `--ring`, a selected table row's chromatic edge: those use
`--primary`. They must not compete: never reach for Button to express
toggle semantics, and never tint a passive-selection surface with primary.

Half-strength accent (`bg-accent/50`) is the canonical "current section"
treatment and the row-hover rung; full `bg-accent` is menu / list hover and
the toggle-on fill. The half-strength rule prevents a persistent active
marker from competing with hover. `--accent` (and `--sidebar-accent`) are
tuned to sit a perceptible lightness step below the page surface so these
neutral highlights clear the glance threshold (see § 2.5); do not retune
them back toward the surface.

### 2.3 Mix recipes

Surface tints derive from the base tokens via `color-mix(in oklch, …)` or
Tailwind's slash-modifier alpha. The recipes that recur:

- **Hover row.** `bg-accent/50`.
- **Selected row.** Primary @ 6% tint plus an inset 2px primary border,
  escalating to 9% on hover. The chromatic accent distinguishes selection
  from hover (which would otherwise both read as a muted fill).
- **Skeleton placeholder.** `bg-primary/10`. Stays neutral; not
  `bg-accent`, which would tint skeletons brand-blue.
- **Focus ring.** `--ring` at full opacity, 2px outline, 2px offset.

### 2.4 Status colors

Red / amber / green / blue exist as `--destructive`, `--warning`,
`--success`, `--info`. Desaturated, used only when the user must act on
state. All four are short-form names; long-form `--vueda-warning` /
`--vueda-success` does **not** resolve. `--info` is an alias of
`--primary`: info IS the accent.

`--destructive-foreground` is near-white (text **on** a destructive
surface). Reach for `--destructive` for "destructive thing" and
`--destructive-foreground` only for the text colour over a destructive
fill. Conflating the two is a recurring source of bugs.

Status surfaces (`Alert` family) follow a single recipe: `text-{stat}` +
`border-{stat}/50` + `bg-{stat}/10`. Consumers never reach for external
"callout" patterns.

The single use of strikethrough in VUEDA is on unavailable Calendar days
in the destructive colour.

### 2.5 Interactive state steps

Hover and active on a _filled_ control are explicit lightness steps, not
alpha fades over the surface. An alpha fade's delta depends on whatever
sits behind the control and collapses when the fill already sits near the
page surface (secondary-on-background was effectively invisible). The
§2.3 alpha recipes stay correct for _surface_ tints (rows, skeletons);
filled controls use dedicated step tokens.

Each filled variant carries `--<token>-hover` and `--<token>-active`
(e.g. `--primary-hover`, `--secondary-active`); outline / ghost reuse
`--accent` for hover and `--accent-active` for press. Rules of thumb:

- **Step lightness, not hue or alpha.** Lightness survives colour-vision
  deficiency and degraded displays; hue alone does not.
- **Target ΔL ≈ 0.10 (OKLCH L) at hover, ≈ 0.18 at active**, about the
  "noticeable at a glance" threshold (~15 on a 0 to 100 scale).
- **Light darkens, dark lightens.** Push the fill away from the page
  surface; this also widens contrast against the variant's foreground.
- **Ease chroma as lightness rises in dark mode** so the lighter step
  stays inside the sRGB gamut.
- **Small controls need the full step.** An alpha-on-token recipe whose
  token is near the surface (dark `bg-input/*` on outline) caps the delta
  below target and reads as no change at sm; reach for the step tokens.

Neutral surfaces (menus, list rows, ghost controls) are transparent at rest,
so instead of step tokens they ride an accent depth-ladder:
`bg-accent/50` (row hover) → `bg-accent` (menu / list / ghost hover, and row
press) → `bg-accent-active` (menu / ghost / control press). Sidebar controls
mirror it with `--sidebar-accent` → `--sidebar-accent-active`, since the
sidebar owns its own accent. Selected rows ride the chromatic ladder instead:
`primary/[0.06]` rest → `/[0.09]` hover → `/[0.12]` press.

Every clickable control gets a press one step past its hover. The exceptions
are interactions that are not presses: text / date / time field segments
(focus marks the segment being edited) and Slider (drag) carry no `active:`
fill.

## 3. Typography

Font families (Plex Sans, JetBrains Mono, Galano Grotesque) are brand
choices; see [brand/README.md](../../../../brand/README.md). The rules
below govern how those families are used in the running UI. Tokens live
in `base.css § Typography`.

- **Sans (UI):** weights 400 / 500 / 600 only. Never 700. Never italic in
  the UI.
- **Mono (data):** for IDs, money, timestamps, code. Tabular numerals,
  slashed zero where the rendering chain supports it.
- **Brand (marketing only):** Galano Grotesque is unavailable as a
  webfont; `--vueda-font-brand` is a Plex 600 fallback stack only. Live
  brand type ships as pre-rendered SVG paths in `brand/`.

### 3.1 Scale

A 7-step scale tighter than shadcn defaults. Body is 13px. The tokens
live in `base.css § Typography` as `--vueda-text-micro` (11px),
`--vueda-text-supporting` (12px), `--vueda-text-body` (13px),
`--vueda-text-reading` (14px), `--vueda-text-heading` (15px),
`--vueda-text-title` (18px), `--vueda-text-display` (22px).

| Role         | Size | Line | Weight | Slot                                                 |
| ------------ | ---- | ---- | ------ | ---------------------------------------------------- |
| Display      | 22   | 1.2  | 600    | page titles (PageTitle), empty-state hero, marketing |
| Title        | 18   | 1.2  | 600    | section heads above cards                            |
| Heading      | 15   | 1.2  | 600    | section heads inside cards                           |
| Reading      | 14   | 1.4  | 400    | longer prose (docs, dialog body)                     |
| **Body**     | 13   | 1.4  | 400    | dominant UI text                                     |
| Label        | 12   | 1.25 | 600    | form labels, table headers                           |
| Micro / caps | 11   | 1.25 | 600    | eyebrows, keycaps                                    |

`--vueda-font-weight-ui` (500) and `--vueda-font-weight-label` (600) are
semantic weight aliases. The body role is published as a Tailwind
`text-body` utility paired with a 1.4 line-height, so consumers write
`text-body` instead of `text-[length:var(--vueda-text-body)] leading-[1.4]`.

### 3.2 Mono usage

Mono is reserved for content that is machine-generated, positional, or
needs digit-stable alignment. The cross-cutting mono rule covers
quantitative / positional read-only text: count meta, page-of-N,
"showing 1 to 8 of 48", PKs in table cells, mono PK suffix on titles.

`Table` carries `tabular-nums` plus `slashed-zero` at the root via
`font-variant-numeric`, so every numeric cell aligns regardless of
typeface or family override.

### 3.3 Eyebrow micro-text

Two recipes:

- **Page-level eyebrow.** 11px sans, 600, uppercase, `0.06em` to
  `0.08em` letter-spacing, `--muted-foreground`. Used for table-toolbar
  section heads, FieldSet titleBar, SidebarGroupLabel, PageTitle eyebrow,
  filter-strip label, form-section title, step-track labels.
- **In-popover micro-eyebrow.** `--vueda-text-micro` (11px) sans, 600,
  uppercase, `0.04em` letter-spacing, `--muted-foreground`. Used inside
  selection surfaces for group / section labels. The tighter tracking
  distinguishes the in-chrome variant from the page-level eyebrow above.

Menu surfaces (DropdownMenu, ContextMenu, Menubar, Combobox) use a mono
variant of the same recipe for group labels; the sans/mono split is
intentional and tracks the surface (selection vs menu). Keyboard shortcut
components inside menus (`*MenuShortcut`) and command rows render structured
`keys` as `KbdGroup` chords. The shortcut component owns row-end alignment; `Kbd`
owns the visual shortcut cue so users learn one keyboard-hint shape across
buttons, menus, command palettes, tooltips, and action strips.

## 4. Layout

### 4.1 Spacing: 4px grid

Spacing follows a 4px grid. Tighter than shadcn's defaults. Card interior
padding is 12px (`--vueda-section-padding`). Section-to-section gap is
16px to 24px, never larger. Semantic gap tokens: `--vueda-gap-sm` (4px),
`--vueda-gap-md` (8px), `--vueda-gap-lg` (12px). See `base.css § Semantic
spacing tokens`.

### 4.2 Control sizing

Single system-wide height scale shared by buttons, inputs, selects,
toggles, number-fields, tag-input containers, and OTP slots. Mapped
through `@theme` so `h-vueda-control-*` and `px-vueda-control-px-*`
utilities resolve. See `base.css § Control sizing`.

| Tier      | Height | Use                                                 |
| --------- | ------ | --------------------------------------------------- |
| `default` | 32px   | dense-SaaS sweet spot (Carbon condensed, Uber Base) |
| `sm`      | 28px   | table-row edit, action strips                       |
| `lg`      | 40px   | primary page CTAs, auth screens                     |

shadcn's 36px (`h-9`) default is not respected. A specialized step at
20px (`--vueda-chip-height`) handles chip / inline-element height for
TagsInput chips and inline Badges. Calendar geometry uses its own pair
(`--vueda-cal-cell`, `--vueda-cal-day`) so range fills can override the
corner radius independently of the control radius.

### 4.3 Density

Tables and `ObjectsGrid` carry a `data-density` attribute of `default`
(32px row), `compact` (28px), or `condensed` (24px). At `condensed`, the
font drops to 12px / 11px. The density attribute is a cross-cutting
contract; see § 8.

### 4.4 Sidebar

Fixed-width chrome, never floating, never auto-hiding on desktop. Width
tokens: `--vueda-sidebar-width` (224px, tighter than shadcn's 256px) and
`--vueda-sidebar-width-icon` (48px icon-only rail). Mobile sheet uses
`--vueda-sidebar-width-mobile` (288px).

**Active item rail.** The "you are here" indicator is a 2px rail on the
leading edge of the menu button, not a font-weight bump. (A weight shift
moves text by ~1px and reads as jitter on hover.) Rail width is
`--vueda-sidebar-active-rail` (2px) painted in `--sidebar-primary`. The
leading icon flips to `--sidebar-primary` when active. Hover and selected
backgrounds remain `--sidebar-accent`; the rail and icon flip carry the
active signal.

### 4.5 Breakpoints

Defined in `base.css § Breakpoints` and mirrored in
`client/lib/utils/breakpoints.js`:

`2xs:480 · sm:640 · md:768 · lg:1024 · xl:1280 · 2xl:1536 · 3xl:1920 ·
4xl:2240 · 5xl:2560 · inf:999999`.

Admin UI is desktop-first; mobile is a degraded but usable view, not a
redesign. Tables scroll horizontally inside their own container, never
the page. Sticky headers apply to tables with > 1 screen of rows.

### 4.6 Motion

Short, ease-out only. See `base.css § Motion`.

- Duration: `--vueda-duration-interaction` = 120ms.
- Easing: `--vueda-ease-interaction` = `cubic-bezier(0.2, 0, 0, 1)`
  (ease-out). No ease-in-out, no bounce, no springs.
- What animates: opacity on enter / leave; underline position on tab
  change; chevron on disclosure; loading spinner. **Not:** position of
  content on navigation, skeleton shimmers, decorative micro-interactions.
  Page transitions: none. Navigation is instant.

The caret-blink keyframe (`--animate-caret-blink: caret-blink 1.25s
ease-out infinite`) is the one motion exception above 120ms; it lives in
text inputs only.

## 5. Elevation

VUEDA does not use elevation as a hierarchy device. Borders carry the
work. Four shadow tokens, all defined in `base.css § Semantic shadow
tokens`:

| Token                    | Value                        | Use                                            |
| ------------------------ | ---------------------------- | ---------------------------------------------- |
| `--vueda-shadow-control` | `0 0 #0000` (none)           | controls; borders carry definition             |
| `--vueda-shadow-card`    | `0 0 #0000` (none)           | cards; borders carry definition                |
| `--vueda-shadow-popover` | 1px ring + 12px ambient drop | popover, dropdown, context menu, combobox list |
| `--vueda-shadow-overlay` | heavier drop                 | dialogs, sheets, drawers                       |

Cards never raise on hover. Raised surfaces are Popover, HoverCard, and
Dialog only. Protection / fade gradients beneath floating UI are not used,
with no exceptions: not under the pinned PageTitle header, not under
StickyBar. If text would collide with content, redesign the layout.

### 5.1 Stacking order (z-index)

Elevation is borders, not shadow; depth is `z-index`, not shadow either.
VUEDA has no z-index _tokens_ (the values are Tailwind `z-*` utilities in
the theme files), so the scale below is the contract: a band per concern,
ordered so the right thing wins when two surfaces overlap. New chrome
joins an existing band rather than inventing a value between bands.

| Band         | Concern                             | Members today                                                                                                    |
| ------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **< 10**     | Component-local micro-stacking      | NavigationMenuIndicator (`z-[1]`), sticky `TableHead` cell (`z-2`)                                               |
| **10**       | Intra-component focus promotion     | OTP active slot, ToggleGroup / ButtonGroup focus, Resizable grip                                                 |
| **20**       | Intra-component focus-within / rail | Calendar + RangeCalendar focused day, SidebarRail                                                                |
| **30 to 39** | Sticky page chrome (the stack)      | PageTitle (sticky), standalone StickyBar; StickyStackProvider bars                                               |
| **40**       | Fixed shell chrome                  | Sidebar desktop panel                                                                                            |
| **50**       | Floating overlays                   | every Reka portal surface: dialog, sheet, drawer, popover, dropdown, tooltip, menu, select, combobox, hover-card |
| **> 50**     | Toasts                              | Sonner (set by `vue-sonner` internally, **not** by VUEDA)                                                        |

Rules that keep the scale legible:

- **Below 10 is local, not global.** `z-[1]` and `z-2` order siblings
  inside a single component's own stacking context (the nav pointer behind
  its panel, the sticky header cell above scrolling body cells). They do
  not participate in page-level layering; ignore them when reasoning about
  what floats over what.
- **The sticky stack reserves 30 to 39, and it is dynamic.**
  `StickyStackProvider` does not pin every bar at a flat `z-30`; it applies
  `Z_BASE` (30) plus the per-bar order from `resolveStickyStack`, so a
  stack of _N_ bars occupies `31` through `30 + N` (bars nearer the pinned
  edge sit higher, so a hiding bar slides _behind_ the ones that stay). A
  typical page (title + toolbar + action bar) uses `31` to `33`. The band
  has headroom to the shell at 40 only while fewer than ~9 bars stack; treat
  30 to 39 as owned by sticky chrome and do not place other chrome there.
- **Shell chrome sits below overlays, above the stack.** The Sidebar
  (`40`) outranks the sticky stack so a pinned toolbar cannot cover the
  nav, but yields to every floating overlay (`50`) so a dialog covers the
  nav. On mobile the Sidebar becomes a Sheet and joins the `50` band.
- **Toasts always win.** Sonner's toaster carries `vue-sonner`'s own very
  high z-index, which VUEDA neither sets nor overrides. An integrator who
  raises the overlay band must remember confirmations still stack on top.

The integrator-facing restatement of the reserved bands lives in
`docs/core-concepts/theming-and-customization.md`.

## 6. Shapes: radius scale

Five semantic radius tokens generate matching `rounded-vueda-*`
utilities. See `base.css § Semantic radius tokens`.

| Token                     | Value  | Use                                              |
| ------------------------- | ------ | ------------------------------------------------ |
| `--vueda-control-radius`  | 2px    | buttons, inputs, selects, toggles, badges (slab) |
| `--vueda-checkbox-radius` | 4px    | checkbox body, softer than control radius        |
| `--vueda-card-radius`     | 4px    | cards, panels                                    |
| `--vueda-modal-radius`    | 2px    | dialogs, sheets                                  |
| `--vueda-pill-radius`     | 9999px | avatars; user-manipulated tags / chips           |
| `--vueda-cal-day-radius`  | 2px    | calendar day-button corner (cell range fill)     |

### 6.1 Slab vs pill

System-assigned state is a slab: `Badge` uses `rounded-vueda-control`
(2px), not pill. Pills are reserved for user-manipulated tag / chip
objects (TagsInput chips, attachment chips), avatars, and **inline
running-text state markers** (small state tokens that sit inline with
prose or inside a flex row beside other text). Fixed-position state
markers (Badge SFC in table cells, sidebar counts, card headers) stay
slab. The distinguishing question is whether the marker reads as a small
token embedded in line height (pill) or as a discrete chrome element on
a fixed surface (slab).

The checkbox body (4px) is intentionally softer than the slab control
radius (2px). At 16×16 the corner reads as "chit / chiclet" rather than
"miniature slab input", differentiating it from inputs and buttons it
sits beside.

Table rules and sidebar separators carry no radius; they are structural
hairlines, not pills.

## 7. Hairlines and DPR

VUEDA paints structural edges as inset box-shadows via the `hairline`
utility, not as `border`s, and paints focus rings as `outline`s via the
`focus-ring` utility. Both are DPR-keyed: a single source of truth steps
the painted width down from 2px to 1px across the DPR 1.0 to 2.0 range,
keyed by `@media (min-resolution: …)` overrides. The rationale and the
full step table live in `base.css § DPR-aware hairline + focus-ring
widths`.

### 7.1 Why not `border`

Two LCD artifacts drive the choice:

- **Fractional DPR** (Windows 4K @ 150% / 175% scaling). The browser's
  `border` code path snaps each side to the nearest device pixel
  inconsistently per scroll position, producing shimmer. Painting via
  inset `box-shadow` takes Skia's path-rendering path, which
  anti-aliases uniformly.
- **Integer DPR** (4K @ 100% scaling). A single device-pixel hairline
  gets coloured by whichever subpixel column it lands on, producing
  red / blue chromatic fringing. A wider hairline forces Skia to
  distribute colour across adjacent subpixels.

The scale is smooth (steps of 0.25px) and the three tokens
(`--vueda-hairline-width`, `--vueda-focus-ring-width`,
`--vueda-focus-ring-offset`) move in lockstep, so the visual proportions
of "hairline thickness : focus-ring gap : focus-ring thickness" stay
constant when a window is dragged between monitors at different scaling,
or when browser zoom is adjusted.

### 7.2 Focus ring contract

`focus-ring` is the canon. Solid 2px outline (after DPR scaling), 2px
offset, in `--ring` (= `--primary`). Destructive controls swap to
`--destructive` via `focus-ring-destructive`. WCAG 2.2 SC 2.4.13 (AAA)
is satisfied at every DPR step because `--vueda-focus-ring-width` is
always 2× `--vueda-hairline-width`, never below the 2px CSS minimum.

`focus-ring-shadow` is the inset-box-shadow variant for cases where an
outline would clip (overflow contexts, `Reka` portal mounts). Its gap
colour must be opaque (a transparent gap layer does not mask the ring
shadow behind it). Default gap colour is `--background`; override per
surface via `[--vueda-focus-ring-gap-color:var(--card)]` etc.

`hairline-primary` and `hairline-foreground` cover accented and
high-contrast button outlines. `hairline-destructive` swaps the painted
edge to destructive on `aria-invalid` controls. `aria-invalid` is the
cross-cutting trigger (see § 8).

### 7.3 Directional `border-*-hairline` utilities

`border-t-hairline`, `border-b-hairline`, etc. are realized for surfaces
that need only one painted edge (toolbar bottom hairline, sidebar
separator, table head bottom). They consume `--vueda-hairline-width` so
their thickness DPR-tracks with the canon edge. The 4-sided
`border-hairline` is the same tool for elements that must keep a real
`border` (see § 7.5) but should still DPR-track rather than sit at a raw
1px.

For a filled element that _is_ the rule rather than an edge of another box
(a `Separator`, an inline vertical divider between chips), `h-hairline` and
`w-hairline` set that rule's thickness from the same `--vueda-hairline-width`
token: `h-hairline` for a horizontal rule (with `w-full`), `w-hairline` for a
vertical one. So `bg-border` separators DPR-track in lockstep with the
box-shadow and border hairlines instead of sitting at a raw `h-px` / `w-px`.

### 7.4 Floating-surface edges: `overlay-hairline`

A floating surface needs an edge _and_ an elevation, but `hairline` and a
`shadow-*` utility both write `box-shadow` and cannot coexist on one
element. `overlay-hairline` folds both into a single declaration: an inset
hairline (coloured via `--vueda-hairline-color`, default `--border`) plus
the popover shadow. Pair it with `overlay-hairline-elevated` to swap the
popover shadow for the heavier overlay drop on viewport-covering surfaces.
Popover, HoverCard, the dropdown / context / menubar menus, the
combobox / select lists, and the toast surface use `overlay-hairline`;
Dialog, Sheet, and AlertDialog add `overlay-hairline-elevated`.

### 7.5 When a real `border` is still correct

The edge-as-box-shadow rule has principled exceptions, where a real
`border` (or the DPR-tracked `border-hairline` / `border-*-hairline`) is
kept deliberately:

- **Curved edges** (Slider knob, Switch pill, UserAvatar, circular step
  badges). A `rounded-full` edge is browser-anti-aliased, so it shows no
  axis-aligned subpixel fringing; these also compose ring halos through
  `box-shadow`, which `hairline` would collide with.
- **Dashed edges** (FileUpload dropzone, empty-state panels). `box-shadow`
  cannot render dashes.
- **Joined-segment seams** (ButtonGroup, ToggleGroup outline, the
  layout-toggle pair). Adjacent items share a real directional border at
  the seam; a 4-sided inset shadow would double the line. base.css sizes
  `border-*-hairline` for exactly this.
- **Overlapping seams** (InputOTPSlot). Cells pull together by one device
  pixel to read as a single painted line, which needs a real border.
- **2px accent rails** (`border-l-2` dirty / selected / timeline rails).
  2px already distributes colour across subpixels, so it does not fringe.
- **Transparent rest edges** used only to reserve layout space
  (Item, ScrollBar gutter, dense action buttons). A transparent border is
  invisible and cannot fringe.

Surfaces that pair a coloured edge with a `box-shadow` ring (the
`ModelActionForm` / `ViewDestroy` tone cards, the workflow-transition
option) keep a `border-hairline` real edge so the ring keeps its own
`box-shadow`.

## 8. Cross-cutting attributes

Contract attributes that span multiple component families. Each is a
small, well-defined HTML/ARIA contract that primitives honour
consistently so consumers can reason about them uniformly.

- **`data-state`** (Reka-driven). The state machine of every interactive
  primitive surfaces here: `data-state="open"`, `"checked"`,
  `"selected"`, `"active"`, `"indeterminate"`, etc. Theme keys hook
  state-specific classes via `data-[state=…]:` Tailwind variants.
- **`aria-invalid`**. Trigger for the destructive-ring swap on every
  input primitive. Pairs `hairline-destructive` with
  `focus-ring-shadow-destructive`. Display primitives that label invalid
  form state (e.g. `Badge`) mirror the contract.
- **`data-numeric`** on `<th>` / `<td>` (and on `ObjectsGrid` header /
  body cell wrappers). Right text-alignment plus mono font on the cell,
  with sortable headers flipping the sort glyph to the left so the
  column's right edge stays stable across sort-state changes. The
  paired `data-mono` attribute opts an ID / code column into mono
  without right-alignment.
- **`data-density`** on `Table` and `ObjectsGrid`. See § 4.3.
- **`data-tone`** on action-confirmation surfaces. The five-tone
  vocabulary (`info` / `success` / `warning` / `danger` / `neutral`)
  routes border, ring, banner, and icon-tile colours through the
  matching semantic tokens. Used by `ModelActionForm` and
  `SystemMessageCard`.
- **`data-flush`** on bordered containers that embed a child grid /
  table. An ancestor stamps `data-flush="true"`; the embedded surface
  strips its own border and radius so only the outer container's edge
  is visible.

## 9. Components

VUEDA's component layer is shadcn-vue plus VUEDA-original primitives.
The rules above govern _why_ primitives are shaped the way they are; the
auto-generated theme-key reference (rendered from JSDoc in the per-component
`*.theme.js` files) documents _what_ each slot does today.

When extending the primitive layer:

- New primitives override shadcn-vue / Reka defaults where they conflict
  with §§ 2 to 8. Adopt shadcn's API shape so future upstream updates
  remain mergeable.
- New shared idioms (cross-cutting attributes, recipes) graduate into
  § 8 or the relevant rule section here once they ship in more than one
  family.

### 9.1 Theme-key class authoring: each token appears once

A theme key's `class` array is flattened by `combineClasses`, which has
**no tailwind-merge**. When the array mixes plain strings with conditional
objects, it builds a flat `{ token: boolean }` map with **last-write-wins
per token**, splitting compound keys. Two consequences shape how class
arrays must be authored:

- **Same token, two branches: the loser wins.** If a single utility token
  appears in more than one branch of a `variant` / `size` / `align` object
  (or in an unconditional string _and_ a conditional key), an inactive
  branch's `false` silently clears the token an active branch set. This
  diverges from Vue's own array-class binding, which is a union (a `false`
  key never removes a class another entry added). The rule: **a utility
  token appears exactly once across a slot's `class` array.** A token
  common to several branches must be hoisted to its own conditional entry,
  or to an unconditional string, never repeated in mutually-exclusive keys.
- **Conflicting distinct utilities: CSS source order wins, not array
  order.** Because the result is a flat class set (not tailwind-merged),
  two different utilities in the same group (`gap-1` vs `gap-2`,
  `min-w-0` vs `min-w-vueda-control`) both render, and the cascade picks
  the one defined later in the compiled stylesheet, regardless of array
  order. Don't rely on a later array entry "overriding" an earlier one;
  make the conditions mutually exclusive or remove the loser.

The first rule is enforced by `tests/unit/lib/theme/classClobberGuard.spec.js`,
which resolves every registered slot across a grid of prop values and fails
if `combineClasses` drops a token the union would keep.

VUEDA-original primitives (net-new, no shadcn lineage) include the
`Field` shell, `ObjectsGrid`, `PageTitle`, `StickyBar`, the `AuthForm` /
`AuthorizingForm` / `ActionForm` / `ModelActionForm` family, the full
`View*` family, `LoadingSpinnerBlock` / `LoadingSpinnerInline`,
`ClickToCopyText`, the `Sidebar*` family, `UserAvatar`,
`TypedConfirmField`, `ConsequencesBullets`, the `FieldSet*` family,
`FormSection` / `FormSectionTitle` / `FormGrid`, `PaginationBar` /
`PaginationMeta`, `SystemMessageCard`, `LoadingHeartbeatStrip`,
`LoadingSkeletonGhost`, `DiagnosticStrip`, `SuggestionList`, and
`TriedUrlCallout`. Per-primitive behaviour and slot contracts are in
the auto-generated reference.

### 9.2 Button tone and emphasis: placement vs meaning

Button resolves on two axes (`tone`: `neutral` / `primary` / `destructive`;
`emphasis`: `fill` / `outline` / `ghost` / `link`). They answer two
independent questions, and the canon keeps them independent:

- **emphasis is placement.** How loud the control is and what chrome it sits
  in. `fill` is the one earned action in a context (form submit, dialog
  confirm, page-title hero); `outline` is a genuine alternative that still
  deserves a chip (secondary form action, toolbar trigger, pagination,
  error-recovery retry); `ghost` is a dismiss or a dense-strip action (cancel,
  clear, bulk-bar actions); `link` is inline within running prose only.
- **tone is meaning, set once.** A delete reads `destructive` whether it is a
  page hero or a quiet row glyph; the tone does not change as the action moves
  between contexts, only the emphasis does. `neutral` is the resting default,
  so a bare `<Button>` is a neutral fill, not a CTA.
- **`primary` is the one earned action.** Exactly one control per context
  carries the accent. Promotion sets `emphasis` to `fill` and lifts a neutral
  action's tone to `primary`; a promoted destructive action stays a
  `destructive` fill. This is the §2.2 rule (`--primary` is the CTA, not a
  passive surface) expressed on the control: do not spread `primary` across a
  cluster.

Mark a destructive action with `tone="destructive"`, never a one-off
`text-destructive` class: the tone composes the matching `_ButtonDestructive*`
primitive for whichever emphasis the placement chose (a destructive ghost for a
row glyph, a destructive fill for a confirm hero), so the hover / active steps
and focus ring come through with it.

For model-action buttons this resolves at one chokepoint: `LinkModelView`
reads the action's intrinsic tone (delete / destroy → `destructive`, else
`neutral`, overridable via `actionDetail.tone`), applies the placement
`emphasis` the view passes, and promotes the view's hero action to a fill (see
`utils/actionVariant.js`). Hand-authored buttons should follow the same
placement-to-axis mapping so resolved and hand-placed buttons read
identically; the full placement table lives in the buttons reference
(`docs/reference/components/buttons.md`).

## 10. Copy voice

The voice is **terse, factual, operator-first.** Cockpit placards, not
customer-success copy.

- **Voice:** imperative and present-tense. `Save invoice`, not `Save
your invoice` or `Save changes`.
- **Casing:** sentence case everywhere. Lowercase for the product
  wordmark ("vueda") in the logo; "VUEDA" in running prose and headings.
- **Person:** neutral / implied subject. Do not say "you"; do not say
  "we". `Invoice saved.` not `We saved your invoice.`
- **Error copy:** state the problem, then the fix, on one line.
  `Amount must be greater than 0. Enter a positive number.` Not `Oops!
Something went wrong.`
- **Empty states:** one short sentence + one primary action. `No
invoices yet. [New invoice]`
- **Labels:** noun. `Customer`, `Due date`. Not `Who is this for?`
- **Buttons:** verb + noun where meaningful. `Send invoice`, not `Send`.
  Exception: confirm dialogs where the noun is redundant (`Delete` /
  `Cancel`).
- **Confirmation toasts:** past tense, impersonal. `Invoice sent.`
  `3 rows updated.`
- **Dates and money:** always mono, always canonical. `2026-04-17`,
  `$14,028.50`. Never `April 17, 2026` in a data cell. Never colloquial
  ("yesterday") unless the exact timestamp is also visible on hover.
- **Emoji:** never in product UI. Never in docs headers.
- **No exclamation marks.** No ellipses except on actions that open
  more UI (`Void invoice...`).
- **Sentence length target:** 12 words or fewer in UI copy.

| Don't                                          | Do                                                      |
| ---------------------------------------------- | ------------------------------------------------------- |
| `Oops! That didn't work.`                      | `Could not save invoice. Check required fields.`        |
| `Successfully saved your changes!`             | `Invoice saved.`                                        |
| `Welcome back, David! Here are your invoices.` | `Invoices · 48 · 3 overdue`                             |
| `Are you sure you want to delete this?`        | `Delete invoice INV-2026-00482? This cannot be undone.` |
| `Click here to learn more`                     | `Read the auth guide →`                                 |

## 11. Iconography

- **System of choice:** **Font Awesome Free 6.x.** Solid + Regular +
  Brands families. Pro's Light / Thin / Duotone are not available on
  Free; do not rely on them.
- **Preferred style:** Regular where it exists, Solid otherwise. Regular
  reads closer to a stroked icon system at the small sizes VUEDA uses;
  Solid is reserved for filled-state indicators (active nav item,
  toggled button) and for glyphs Free does not ship as Regular.
- **Sizing:** 14px inside 32px controls; 12px inside 28px compact
  controls; 16px in standalone contexts; 20px in page titles only. Set
  via `font-size` on the `<i>`. Never scale with `transform`.
- **Colour:** `currentColor`. Icons inherit from their text context.
  Never a second accent colour. In selected-state nav: icon colour =
  `--primary`.
- **Emoji:** never in UI.
- **Unicode symbols:** permitted for keycap glyphs (`⌘ ⇧ ⌥ ⏎ ⎋`) and
  typographic arrows (`→ ↓`). Nowhere else; reach for an FA glyph
  first.
- **Brand glyphs:** FA Brands is the only acceptable source for
  third-party logos (GitHub, Google, Slack, etc.) inside VUEDA chrome.
  Do not hand-vectorise brand marks.
- **Custom SVG:** allowed when FA Free has no match, but must match
  the visual weight of the regular / solid set it sits beside, not
  the lighter Lucide / Carbon weight.
- **Do not mix icon systems.** A surface uses FA or it does not.

VUEDA does not bundle icons; consuming apps load Font Awesome via their
preferred path (kit, CDN, or self-hosted webfont). The framework's
`useIcons` registry is the integration seam: components that need a
glyph (Sonner toast types, Stepper indicator, pagination chevron,
sidebar trigger) read from the registry and the consumer registers
entries against framework-defined keys. Spinning is one of those
concerns: there is no Spinner SFC; `loading` icon entries handle their
own rotation.

## 12. Dos and Don'ts

### Do

- Use the published radius, height, shadow, and colour tokens. Never
  hardcode hex values, Tailwind colour utilities (`text-amber-600`), or
  Tailwind size utilities for control-height (`h-9`).
- Reach for `hairline` and `focus-ring` utilities, not `border` and
  `outline` directly, when the edge needs to DPR-track.
- Use `--accent` for selection / toggle-on, `--primary` for CTA.
  Half-strength accent (`/50`) for current-section markers that must
  coexist with hover.
- Favour borders over shadows. Pop a surface only when it overlays
  another surface (Popover, Dialog).
- Use mono for IDs, money, timestamps, positional read-outs ("page 3
  of 12"). Use sans for everything else.
- Place card padding on Card children (`CardHeader`, `CardContent`,
  `CardFooter`), so `border-b` rows span full width.
- Compose, do not variantize: a card-with-tinted-bg is composition at
  the feature layer, not a `Card variant="muted"` prop.
- Register icons through the `useIcons` registry; let the consumer
  bring their icon system.

### Don't

- No 700 weight. No italic in the UI.
- No emoji as UI affordance. No exclamation marks.
- No backdrop-filter blur. No glassmorphism.
- No gradients. No textures. No decorative illustrations inside the UI.
- No 36px control heights. No 56px row heights. No pillow radii.
- No raised cards on hover. No elevation as a hierarchy device.
- No alpha-fade hover / active on filled controls (`bg-primary/90`); use
  the `--<token>-hover` / `--<token>-active` lightness steps (see § 2.5).
- No retuning `--accent` / `--sidebar-accent` toward the surface; they're
  tuned to clear the interactive step (§ 2.5). No press fill on focus / drag
  controls (field segments, Slider).
- No protection / fade gradients beneath floating UI; redesign the
  layout instead.
- No text on a destructive surface using `text-destructive` (use
  `text-destructive-foreground`); no destructive item using
  `text-destructive-foreground` for its at-rest text colour (use
  `text-destructive`). Conflating the two is a recurring source of bugs.
- No row striping in tables. Hover and selection already provide enough
  row distinction.
- No labelled or inset Separator variant. A labelled "OR" is two
  Separators plus a span.
- No Spinner SFC. Loading-glyph rotation belongs to the icon registry.
- No ad-hoc Tailwind colour or size literals (`text-amber-*` /
  `text-red-*` / `text-emerald-*` / `bg-zinc-*` / `bg-white` /
  `bg-black`) that bypass the semantic-token system. Use the matching
  semantic token (`text-warning`, `text-destructive`, `text-success`,
  `bg-card`, `bg-background`).
