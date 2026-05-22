# VUEDA Design Backlog

Design work where the intent is settled but landing is blocked by something
concrete: server-side data the API does not yet expose, a missing first
consumer that would anchor the visual decisions, or a primitive-level API
decision that should be taken alongside related work rather than guessed in
isolation.

Each entry is self-contained: a `Status:` line names the blocker category,
followed by what is missing today, what the realized shape looks like, what
unblocks it, and where the work lands. Entries graduate out when the
blocker clears and the implementation lands.

Status values:

- **Awaiting server.** The client-side shape is settled; the API needs to
  expose new data or accept new input before the view can land.
- **Awaiting consumer.** The primitive or theme is realized (or near-realized)
  but visual decisions need a concrete consuming surface to avoid guessing in
  isolation.
- **Awaiting API decision.** A primitive-level API choice (one SFC vs many,
  variant vs new component, theme-key split) should be taken alongside
  related work, not piecemeal.

New entries append to the end of the list with the next sequential
`BACKLOG-NNN` number.

---

### BACKLOG-001 — Recovery codes: render used codes with strikethrough

**Status:** Awaiting server.

**Today.** `ViewRecoveryCodes.vue` reads only `response?.data?.unused_codes`,
so codes that have been redeemed never appear in the UI. Users cannot tell
how many of the originally generated set have been used.

**Intended shape.** The view renders the full set of codes; used codes are
struck through and muted (`text-muted-foreground line-through`) via a
`data-used="true"` attribute on each `<li>`. The subtitle becomes count-aware:
"5 codes remaining. We'll prompt you to regenerate at 2."

**Theme.** Add `data-[used=true]:line-through data-[used=true]:text-muted-foreground`
to `ViewRecoveryCodes.listItem` in `client/lib/theme/vueda-tailwind/views/index.js`.

**Blocked by.** The allauth headless `RecoveryCodesResponse` returns only
`unused_codes` (the `_authenticator_data` field is marked `sensitive=True`);
there is no `get_used_codes()` method and no server override exposing used
codes. Server-side work is required to either extend the allauth response
with a `used_codes` field or unify into a single list with a per-code
usage flag.

**Files.** `client/lib/views/ViewRecoveryCodes.vue`,
`client/lib/theme/vueda-tailwind/views/index.js`, plus the corresponding
server-side endpoint extension.

---

### BACKLOG-002 — ModelActionForm: per-row dry-run eligibility marker

**Status:** Awaiting server.

**Today.** After a dry-run flags row-level errors (e.g. "no payment method
on file" on subscription #4421), the realized selected-objects panel keeps
every row visually identical. The user has to scroll back to the validation
summary to see which rows are ineligible.

**Intended shape.** Each row in the selected-objects panel tints by dry-run
result: green check + neutral border for eligible rows, red X plus
destructive-tinted background for ineligible, with the failure reason
replacing the PK suffix ("no payment method", "paused"). The user can untick
failing rows from the same panel.

**Theme.** `ModelActionForm.vue` selected-objects panel renders a
`data-eligible="false"` modifier on rows; theme keys `selectedRow` and
`selectedRowIcon` swap colors based on the attribute. Likely needs
`formContext.state.dryRunByPk` exposed as a reactive map.

**Blocked by.** The server has not exposed per-PK dry-run eligibility. The
`destroy` endpoint returns `HTTP_200_OK` with no body on dry-run success,
and `useActionForm.js` discards the dry-run response entirely. Server work
is needed to return `{ pk, ok, reason? }[]` from dry-run responses, plus
client work in `useActionForm.js` to capture and surface the result in
form-context state.

**Files.** `client/lib/composables/useActionForm.js`,
`client/lib/components/ModelActionForm.vue`, plus the corresponding
server-side dry-run response shape.

---

### BACKLOG-003 — ViewWorkflowTransition: first-class reason textarea

**Status:** Awaiting server.

**Today.** No first-class reason slot exists on the workflow transition view;
consumers can wire one up via `extraFields` but the value silently drops on
submit. Workflow transitions almost always benefit from a reason.

**Intended shape.** A `<textarea>` immediately below the transition list and
above the submit button. Label: "Reason (optional)". Hint: "Stored against
the audit entry. Visible to anyone with access to this <object>." Min-height
84px. Reason value flows through `executeTransition` to the server and
becomes the audit-log entry's reason.

**Theme.** Add `ViewWorkflowTransition.{reason,reasonLabel,reasonHint}` keys
in `client/lib/theme/vueda-tailwind/views/index.js`. Decide
always-rendered-with-optional-copy vs gated on a per-transition
`reason_required` flag (current intent: always rendered, optional copy).

**Blocked by.** The server's transition viewset
(`vueda/workflow/viewsets.py`) only reads `transition_code` from the PATCH
body, and the model layer hardcodes `change_reason` to
`f"Transition {transition.code!r} applied."` There is no path for a
client-supplied reason to land in the audit history. Shipping the textarea
client-side now would surface a field that silently drops user input, which
is worse than the status quo.

**Files.** `client/lib/views/ViewWorkflowTransition.vue`,
`client/lib/theme/vueda-tailwind/views/index.js`, plus
`vueda/workflow/viewsets.py` and the underlying `update_object_state` call
site to forward the reason into `_change_reason`.

---

### BACKLOG-004 — VerbTag: tag suggestion-list actions with HTTP verb

**Status:** Awaiting server.

**Today.** Action-shape suggestion rows in `SuggestionList.vue` have a verb
chip slot already wired and ready, but no source of verb metadata. Routes
shape works; action shape currently degrades because the model action
registry does not expose verb information per action.

**Intended shape.** Each action row carries a small verb chip (10px mono
uppercase, 1px border, muted bg, 2px radius) showing `POST` / `DELETE`.
Destructive verbs (DELETE) tint the verb chip and row label using
`color-mix(in oklch, var(--destructive) 70%, var(--foreground))`, so the
operator can spot a destructive suggestion before clicking.

**Theme.** New `VerbTag.vue` SFC (or theme-key-only sub-component inside
`SuggestionList`) with `verb` prop and `destructive` boolean. Theme keys
`VerbTag.{root,destructive}`.

**Blocked by.** Server-side model action registry must expose verb metadata
per action: `{key, label, verb, destructive, description}`. Without verbs
the action shape cannot render the chip.

**Open question.** Whether destructive-verb tinting graduates to a generic
verb-tone recipe in the theme README § 9.1 (action canon), or stays scoped
to `VerbTag`. Decide alongside server work so the canon and the metadata
land together.

**Files.** New `client/lib/components/VerbTag.vue`,
`client/lib/components/SuggestionList.vue`, plus the corresponding
server-side action registry extension.

---

### BACKLOG-005 — FormHiddenFeedback SFC

**Status:** Awaiting consumer.

**Today.** Theme keys `FormHiddenFeedback.{root,popoverBody,popoverItem,button,icon,required,errors,warnings,help}`
exist in `client/lib/theme/vueda-tailwind/form/index.js`. No SFC consumes
them.

**Intended shape.** Icon-only button (ghost variant, icon-sm size) that
opens a popover with field errors, warnings, and help text from the
injected form context. Intended for inline / tabular editing contexts
where there is no room for a message line below the control.

**Blocked by.** The first consumer that needs inline-editing feedback. The
tabular `FieldSetTabularInline` chassis is now realized; the SFC visuals
should be finalised against a concrete consuming surface so the popover
positioning, icon choice, and label conventions are anchored to a real
use case rather than guessed.

**Files.** New `client/lib/components/FormHiddenFeedback.vue` (or
`client/lib/fields/FormHiddenFeedback.vue`), consuming
`useTheme("FormHiddenFeedback", ...)` and rendering a `Button` + `Popover`
composition that pulls from the form-context error/warning/help state.

---

### BACKLOG-006 — Stepper: error step state

**Status:** Awaiting consumer.

**Today.** The Stepper theme in `client/lib/theme/vueda-tailwind/shell/index.js`
has no mapping for `data-state="error"` on `StepperItem`,
`StepperIndicator`, or `StepperSeparator`. A failed step renders identically
to a pending step.

**Intended shape.** Indicator: destructive background and foreground
(`group-data-[state=error]:bg-destructive group-data-[state=error]:text-destructive-foreground`).
Separator leading into the failed step: destructive bg. Failure icon
inside the indicator (likely an X or alert glyph).

**Blocked by.** The first workflow that surfaces a failed-step state.
Without a concrete failure case (failed import row, workflow transition
error, batch validation failure), the contrast, outline, and icon
decisions risk bikeshedding. Land the theme entries when the consumer
arrives so the visuals are anchored to a real scenario.

**Files.** `client/lib/theme/vueda-tailwind/shell/index.js`
(`StepperItem.root`, `StepperIndicator.root`, `StepperSeparator.root`).

---

### BACKLOG-007 — Stepper: vertical orientation theme overrides

**Status:** Awaiting consumer.

**Today.** `Stepper.vue` already forwards the `orientation` prop to Reka's
`StepperRoot`. The theme however only defines horizontal classes
(`flex gap-2` on `Stepper.root` with no `data-orientation` overrides), so
a vertical stepper would lay out incorrectly.

**Intended shape.** `data-[orientation=vertical]:flex-col` on `Stepper.root`,
`StepperItem.root`, and `StepperSeparator.root`, plus centerline-alignment
adjustments to the separator under vertical layout.

**Blocked by.** The first onboarding flow or left-rail wizard that needs
vertical layout. Centerline-alignment math depends on indicator size,
label width, and gap conventions in the specific use case; designing
those without a consuming surface produces a brittle default.

**Files.** `client/lib/theme/vueda-tailwind/shell/index.js`.

---

### BACKLOG-008 — ComboboxTrigger: default input-shell visual

**Status:** Awaiting API decision.

**Today.** The realized `ComboboxTrigger.root` theme key is empty (`""`).
All visual styling comes from whatever the consumer composes around it
via `asChild`. `WidgetCombobox` supplies its own input-shell styling via a
local `theme('trigger')` class, so the bare primitive has no in-tree
consumer that suffers the empty default. Multi-select triggers separately
need `<div role="combobox" tabindex="0" aria-haspopup="listbox">` rather
than `<button>` to avoid invalid nested-button HTML.

**Intended shape.** Two distinct decisions, which should be taken together:
(a) bake input-shell styles into `ComboboxTrigger.root` (border, control
height, px, bg-transparent, focus ring) so the primitive has a usable
default; (b) provide a `ComboboxMultiTrigger` for the multi-select
div-trigger pattern so multi-select consumers do not have to re-derive
the role/tabindex/aria contract.

**Blocked by.** A Combobox-wide API session that consolidates primitive
decisions in one pass. Taking (a) and (b) independently risks a surface
where the primitive has half a default and the rest is documented in
prose elsewhere.

**Files.** `client/lib/theme/vueda-tailwind/controls/index.js`
(`ComboboxTrigger.root` and potentially `ComboboxMultiTrigger.root`),
plus possibly a new `client/lib/controls/ComboboxMultiTrigger.vue`.

---

### BACKLOG-009 — Method picker: segmented radio rail

**Status:** Awaiting API decision.

**Today.** `ViewSetupDevice.vue` and `ViewTwoFactorAuth.vue` both use
`WidgetSelectDropdown` for the method choice (TOTP / SMS / email). Choice
space is 2-4 short labels with one sub-line each (1Password / ···· 0413 /
j@arrai.com).

**Intended shape.** A segmented radio rail in place of the dropdown:
1px hairline + muted-50% wash group container; 6px gap; 4px inner padding.
Selected option: `bg-background + border-border + shadow-vueda-control` +
ring-coloured icon. Disabled options dim to opacity 0.45. Removes a click
and reads as the primary decision on the screen.

**Blocked by.** A primitive-level decision: new `WidgetSegmentedRadio`
widget under `client/lib/widgets/`, or extend `WidgetRadioGroup` with a
`variant="rail"` mode. The current `WidgetRadioGroup` does not cleanly
accommodate the rail recipe (per-option icons + sub-line meta + group
container with selected-option chrome) through theme-key swaps alone; it
requires structural template changes plus accessibility plumbing (option
groups, sub-line ids). Either path is viable; the choice should be taken
once and applied to all rail-style radios.

**Files.** New `client/lib/widgets/WidgetSegmentedRadio.vue` or revised
`client/lib/widgets/WidgetRadioGroup.vue`, plus
`client/lib/views/ViewSetupDevice.vue` and
`client/lib/views/ViewTwoFactorAuth.vue` consuming the new primitive.

---

### BACKLOG-010 — ObjectsGridShell: chrome composer family

**Status:** Awaiting consumer.

**Today.** No chrome composer wraps `ObjectsGrid` (or a raw `Table`) with the
toolbar / filter-chip rail / selection-bar / footer surfaces that kit 1.10
described. Consumers that need this composition open-code the chrome around
the body each time. The family shape is settled (chrome wraps a body slot;
the shell stays body-agnostic), but no in-tree view exercises it yet.

**Intended shape.** New family at `client/lib/grid/shell/`:
`ObjectsGridShell` (root, vertical flex container, propagates `data-density`
and `data-flush`), `ObjectsGridShellToolbar` (search left, filter/range
buttons, spacer, meta strip, view controls, primary CTA right),
`ObjectsGridShellFilterChips` (active-filter chip rail using a standalone
`FilterChip` primitive; hides when SelectionBar is active),
`ObjectsGridShellSelectionBar` (primary-tinted bar mounted above the body
when the selection set is non-empty, replacing FilterChips),
`ObjectsGridShellFooter` (meta strip + rows-per-page selector +
`PaginationBar`). The body is a slot; consumers drop in `ObjectsGrid` for
the rich path or a raw `Table` for direct row control. Headless: state is
passed via props / v-model, never owned by the shell. The name is
deliberately not `DataTable` (which would imply a TanStack column-defs
adapter and a Table-only body, neither of which applies).

**Theme.** New file `client/lib/theme/vueda-tailwind/grid-shell/index.js`
with keys `ObjectsGridShell`, `ObjectsGridShellToolbar` (sub-slots
`toolbarSearch`, `toolbarMeta`, `toolbarSpacer`, `toolbarViewControls`),
`ObjectsGridShellFilterChips`, `FilterChip` (standalone so it can be reused
outside the rail), `ObjectsGridShellSelectionBar`, `ObjectsGridShellFooter`
(sub-slots `footerMeta`, `footerRowsPerPage`; `PaginationBar` slots in).

**Blocked by.** The first in-tree view that needs the full composition.
Without a consuming surface the toolbar layout decisions (search width,
meta-strip placement, view-control grouping), the filter-chip-to-selection-
bar swap timing, and the footer's rows-per-page / pagination alignment risk
being guessed in isolation. `PaginationBar` is realized and ready to slot
in; the missing piece is a consumer that exercises all four chrome surfaces
together.

**Open question.** Whether to land `FilterChip` as a standalone primitive
first (it has reuse outside the rail) or alongside the shell. Decide
alongside the first consumer so the chip's affordances match real filter
metadata rather than guessed shapes.

**Files.** New `client/lib/grid/shell/ObjectsGridShell.vue`,
`ObjectsGridShellToolbar.vue`, `ObjectsGridShellFilterChips.vue`,
`FilterChip.vue`, `ObjectsGridShellSelectionBar.vue`,
`ObjectsGridShellFooter.vue`. New
`client/lib/theme/vueda-tailwind/grid-shell/index.js`. Demo at
`docs/reference/components/ObjectsGridShell` composing both an
`ObjectsGrid` body and a raw `Table` body to exercise the slot contract.

---

### BACKLOG-011 — CalendarNavButton: one key, two consumers

**Status:** Awaiting API decision.

**Today.** The theme key `CalendarNavButton` is consumed by two SFCs,
`CalendarPrevButton.vue` and `CalendarNextButton.vue` (both call
`useTheme("CalendarNavButton", ...)`). This diverges from the
range-calendar layer, where `RangeCalendarPrevButton` and
`RangeCalendarNextButton` are paired one-to-one with keys of the same
names. The shared key works at runtime, but it breaks the
`{@api theme-key:<Component>}` cross-link contract: neither SFC's
generated API page can resolve to a `CalendarNavButton` page, and the
`CalendarNavButton` theme entry has no API page to link back to.

**Intended shape.** Two options, equally defensible; pick alongside the
next Calendar API touch so the cost is paid once:
(a) Split the theme key into `CalendarPrevButton` and `CalendarNextButton`
matching the existing SFCs and the range-calendar pair. The two keys
would carry near-identical class lists; a `_CalendarNavButton`
underscore primitive could hold the shared composition.
(b) Consolidate the two SFCs into a single `CalendarNavButton.vue` with
a `direction` prop, matching the single key. Range-calendar would also
collapse to one `RangeCalendarNavButton` for consistency.

**Blocked by.** A Calendar API session that confirms which side of the
split is canonical (per-direction SFCs or a unified directional SFC).
The decision affects calendar usage examples and any consumer that
imports `CalendarPrevButton` / `CalendarNextButton` directly.

**Files.** `client/lib/theme/vueda-tailwind/controls/index.js` (the
`CalendarNavButton` key, plus the `RangeCalendarPrevButton` /
`RangeCalendarNextButton` keys if option (b) wins),
`client/lib/controls/calendar/CalendarPrevButton.vue` and
`CalendarNextButton.vue` (and the range-calendar equivalents if (b)).

### BACKLOG-012 — css-tokens extractor: DPR media-query re-declarations break banner grouping

**Status:** Awaiting docs-tooling pass.

**Today.** Three of the four tokens under the `DPR-aware hairline +
focus-ring widths` banner (`--vueda-hairline-width`,
`--vueda-focus-ring-width`, `--vueda-focus-ring-offset`) render under
the catch-all `Base` group on the tokens index, not under their owning
banner. The fourth token (`--vueda-focus-ring-gap-color`) groups
correctly because it has no `@media` override.

**Cause.** `docs-tooling/js/extractors/css-tokens.js` walks every
`:root` rule in `base.css`, including the four `:root` blocks nested
inside the `@media (min-resolution: ...)` overrides at the bottom of
`base.css`. Each nested `:root` is its own PostCSS rule with no banner
comment inside, so `collectGroupBoundaries(rule)` returns an empty
list, and decls inside fall back to `Base`. The normalizer then
last-wins on the redeclaration, so the canonical entry inherits the
`Base` group from the media-query block rather than the
`DPR-aware hairline + focus-ring widths` banner from the outer `:root`.

**Intended shape.** The extractor should either (a) skip `:root`
selectors nested inside `@media` at-rules so only the outer-scope
declaration counts toward grouping, or (b) inherit the group from the
first prior declaration of the same property name when a redeclaration
has none. Option (a) is the simpler fix and matches author intent: the
`@media` blocks are scale overrides, not new logical groups.

**Blocked by.** A docs-tooling sweep with permission to touch the
extractor. The fix lives in `docs-tooling/js/extractors/css-tokens.js`
(skip `@media`-nested rules in the `walkRules` loop, or seed group
inheritance through repeat declarations).

**Files.** `docs-tooling/js/extractors/css-tokens.js`,
`client/lib/theme/vueda-tailwind/base.css` (no source change required;
the trailing prose on the outer-scope declarations is already in
place).

<!-- next backlog entry -->
