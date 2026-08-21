---
title: Feedback + Loading
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Badge from "@vueda/display/badge/Badge.vue";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertActions from "@vueda/feedback/alert/AlertActions.vue";
import AlertClose from "@vueda/feedback/alert/AlertClose.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import AlertTitle from "@vueda/feedback/alert/AlertTitle.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import Progress from "@vueda/feedback/progress/Progress.vue";
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import Sonner from "@vueda/feedback/toast/Sonner.vue";
import Button from "@vueda/controls/button/Button.vue";
import { toast } from "vue-sonner";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faBell,
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faClock,
  faHourglassHalf,
  faLock,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

function fireLoadingToast() {
  toast.promise(new Promise((resolve) => setTimeout(resolve, 2500)), {
    loading: "Generating export",
    description: "Reconciling ledger.",
    success: () => ({ message: "Export ready", description: "Available in Downloads." }),
  });
}
</script>

# Feedback + Loading

The feedback family covers the surfaces that report state to the operator:
alerts, badges, loading icons, progress bars, skeleton placeholders, and the
toast container. They share the status token surface
({@api css-token:destructive}, {@api css-token:warning},
{@api css-token:info}, {@api css-token:success}) and the popover surface
({@api css-token:popover}, {@api css-token:popover-foreground},
{@api css-token:border}). Status treatments must remain legible as status
treatments after a re-skin: destructive, warning, info, success, neutral, and
loading must not collapse into one another.

This page is the visual contract the default theme guarantees. Use it as the
target spec when you re-skin: every cell shown here should still read as the
same surface after a customization, even if its color, radius, or density
shifts. If a cell breaks, the change has crossed from skin into design
language.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). In
brief: values (color, dimension, duration) belong in
[CSS tokens](../theming/tokens.md); compositions (class arrangements,
state recipes) belong in [theme keys](../theming/keys.md).

## Alert: variant matrix

Alert is the canonical boxed status message. The default variant is neutral;
destructive, warning, info, and success all use the same recipe: status text,
a status hairline at 50%, status background at 10%. The edge is a `hairline`
(inset box-shadow), not a `border`, so the saturated status colors do not
fringe at integer DPR. The icon column collapses
when no direct SVG child is present, so consumers never align icon and text
manually: the grid template selects between `[16px_1fr]` and `[0_1fr]` based
on `has-[>svg]`.

Theme keys: {@api theme-key:Alert}, {@api theme-key:AlertTitle},
{@api theme-key:AlertDescription}, {@api theme-key:AlertActions},
{@api theme-key:AlertClose}. Token surface:
{@api css-token:card}, {@api css-token:card-foreground},
{@api css-token:destructive}, {@api css-token:warning},
{@api css-token:info}, {@api css-token:success}, and
{@api css-token:border}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="variants">
    <div class="grid gap-3 lg:grid-cols-2">
      <Alert>
        <FontAwesomeIcon :icon="faBell" />
        <AlertTitle>Job queued</AlertTitle>
        <AlertDescription>
          Export begins once the current batch finishes. No action required.
        </AlertDescription>
      </Alert>
      <Alert variant="info">
        <FontAwesomeIcon :icon="faCircleInfo" />
        <AlertTitle>Scheduled maintenance at 02:00 UTC</AlertTitle>
        <AlertDescription>
          Read-only mode will be active for 15 minutes. Drafts will persist.
        </AlertDescription>
      </Alert>
      <Alert variant="success">
        <FontAwesomeIcon :icon="faCircleCheck" />
        <AlertTitle>Invoice A-0419 posted</AlertTitle>
        <AlertDescription>
          Payment applied to customer 3487. Receipt emailed.
        </AlertDescription>
      </Alert>
      <Alert variant="warning">
        <FontAwesomeIcon :icon="faTriangleExclamation" />
        <AlertTitle>Tax table expires in 7 days</AlertTitle>
        <AlertDescription>
          Renew or configure manual rates before 2026-05-01.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive" class="lg:col-span-2">
        <FontAwesomeIcon :icon="faCircleExclamation" />
        <AlertTitle>Reconciliation failed</AlertTitle>
        <AlertDescription>
          3 entries could not be matched. Review the audit log and retry.
        </AlertDescription>
        <AlertClose aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </AlertClose>
      </Alert>
    </div>
    <template #footer>
      <span>status bg <code>/10</code></span>
      <span>status hairline <code>/50</code></span>
      <span>icon column only when direct SVG child exists</span>
    </template>
  </DemoCard>
  <section class="grid gap-3 rounded-vueda-card hairline hairline-border p-4 lg:grid-cols-2">
    <div class="flex flex-col gap-3">
      <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        no icon
      </header>
      <Alert variant="info">
        <AlertTitle>Showing archived records</AlertTitle>
        <AlertDescription>
          Results include rows from before 2025-01-01. Clear the filter to return to live data.
        </AlertDescription>
      </Alert>
    </div>
    <div class="flex flex-col gap-3">
      <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        title only
      </header>
      <Alert>
        <AlertTitle>Read-only mode is active.</AlertTitle>
      </Alert>
    </div>
  </section>
  <DemoCard title="with actions">
    <Alert variant="warning">
      <FontAwesomeIcon :icon="faTriangleExclamation" />
      <AlertTitle>Tax table expires in 7 days</AlertTitle>
      <AlertDescription>
        Renew the table or configure manual rates before 2026-05-01.
      </AlertDescription>
      <AlertActions>
        <Button emphasis="ghost" size="sm">Dismiss</Button>
        <Button emphasis="outline" size="sm">Renew</Button>
      </AlertActions>
    </Alert>
    <template #footer>
      <span><code>AlertActions</code> aligns under title / description column</span>
      <span>icon spans both rows when description is present</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Badge: variant matrix

Badge marks system-assigned state inside dense surfaces (FSM labels, workflow
states, grids, action strips, menu trailing slots). The body uses
{@api css-token:vueda-control-radius} (a 2 px slab), not a pill: pill radii
are reserved for user-managed tag and chip objects. The outline variant uses
{@api css-token:foreground} text on a transparent fill so it competes less
in dense rows. A badge is a status marker by default; only a linked badge
(`as="a"`) is interactive, and on hover it shifts its background by one
lightness step (the same `--*-hover` tokens the buttons use), not an alpha
fade.

Two families of variant share the component. `default`, `secondary`, and
`destructive` are **solid**: a saturated fill with its own paired foreground
token for the label. `info`, `success`, and `warning` are **tinted**: a 10 %
surface, the tone itself as the label colour, and a 50 % tone hairline. The
split follows the tokens: the three semantic tones ship no paired foreground
token, so a solid fill would have no readable label colour to state. Reach for
the solid family for identity and counts, and the tinted family for status a
row reports about itself.

A badge presents status the application or server supplied. It is not an
authorization signal, and hiding one does not withhold a permission.

Theme key: {@api theme-key:Badge}. Token surface:
{@api css-token:primary}, {@api css-token:secondary},
{@api css-token:destructive}, {@api css-token:info},
{@api css-token:success}, {@api css-token:warning},
{@api css-token:foreground}, {@api css-token:border}, and
{@api css-token:vueda-control-radius}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="variants" description=" (solid family)">
    <div class="flex flex-wrap items-center gap-2">
      <Badge>Active</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="destructive">Void</Badge>
      <Badge variant="outline">Archived</Badge>
    </div>
    <template #footer>
      <span>radius <code>--vueda-control-radius</code></span>
      <span>padding <code>px-2 py-0.5</code></span>
      <span>solid fills carry a transparent hairline, so no edge shows; <code>outline</code> paints <code>--border</code></span>
    </template>
  </DemoCard>
  <DemoCard title="variants" description=" (tinted status family)">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="info">Updated</Badge>
      <Badge variant="success">Reconciled</Badge>
      <Badge variant="warning">Needs review</Badge>
      <Badge variant="destructive">Failed</Badge>
    </div>
    <template #footer>
      <span>surface <code>&lt;tone&gt;/10</code>, label <code>text-&lt;tone&gt;</code>, hairline the tone at 50 %</span>
      <span><code>destructive</code> shown alongside for contrast: it is the solid family's error state, not a tinted tone</span>
      <span>tones read against the page surface, so re-toning <code>--info</code>, <code>--success</code>, or <code>--warning</code> shifts these and <code>Alert</code> together</span>
    </template>
  </DemoCard>
  <DemoCard title="with icons">
    <div class="flex flex-wrap items-center gap-2">
      <Badge><FontAwesomeIcon :icon="faCircleCheck" /> Reconciled</Badge>
      <Badge variant="secondary"><FontAwesomeIcon :icon="faHourglassHalf" /> Pending</Badge>
      <Badge variant="destructive"><FontAwesomeIcon :icon="faLock" /> Locked</Badge>
      <Badge variant="outline"><FontAwesomeIcon :icon="faClock" /> Scheduled</Badge>
      <Badge variant="info"><FontAwesomeIcon :icon="faCircleInfo" /> Updated</Badge>
      <Badge variant="success"><FontAwesomeIcon :icon="faCircleCheck" /> Created</Badge>
      <Badge variant="warning"><FontAwesomeIcon :icon="faTriangleExclamation" /> Restored</Badge>
    </div>
    <template #footer>
      <span>icon size <code>3</code></span>
      <span>gap <code>1</code></span>
      <span>a tinted badge's icon inherits the tone, since the label colour is the tone itself</span>
    </template>
  </DemoCard>
  <DemoCard title="interactive (link)" description='(as="a")' class="lg:col-span-2">
    <div class="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] items-center gap-x-3 gap-y-2">
      <div></div>
      <StateLabel>default</StateLabel>
      <StateLabel>secondary</StateLabel>
      <StateLabel>destructive</StateLabel>
      <StateLabel>outline</StateLabel>
      <StateLabel>info</StateLabel>
      <StateLabel>success</StateLabel>
      <StateLabel>warning</StateLabel>
      <StateLabel>rest</StateLabel>
      <div><Badge as="a" href="#">Active</Badge></div>
      <div><Badge as="a" href="#" variant="secondary">Draft</Badge></div>
      <div><Badge as="a" href="#" variant="destructive">Void</Badge></div>
      <div><Badge as="a" href="#" variant="outline">Archived</Badge></div>
      <div><Badge as="a" href="#" variant="info">Updated</Badge></div>
      <div><Badge as="a" href="#" variant="success">Created</Badge></div>
      <div><Badge as="a" href="#" variant="warning">Review</Badge></div>
      <StateLabel>hover</StateLabel>
      <div><ForceState state="hover"><Badge as="a" href="#">Active</Badge></ForceState></div>
      <div><ForceState state="hover"><Badge as="a" href="#" variant="secondary">Draft</Badge></ForceState></div>
      <div><ForceState state="hover"><Badge as="a" href="#" variant="destructive">Void</Badge></ForceState></div>
      <div><ForceState state="hover"><Badge as="a" href="#" variant="outline">Archived</Badge></ForceState></div>
      <div><ForceState state="hover"><Badge as="a" href="#" variant="info">Updated</Badge></ForceState></div>
      <div><ForceState state="hover"><Badge as="a" href="#" variant="success">Created</Badge></ForceState></div>
      <div><ForceState state="hover"><Badge as="a" href="#" variant="warning">Review</Badge></ForceState></div>
    </div>
    <template #footer>
      <span>only linked badges hover</span>
      <span>a solid fill shifts one lightness step, through the same <code>--*-hover</code> tokens the buttons use</span>
      <span>a tinted tone deepens its surface from 10 % to 20 % instead, keeping the label colour fixed</span>
    </template>
  </DemoCard>
  <DemoCard title="table context" class="lg:col-span-2">
    <div class="overflow-x-auto rounded-vueda-control hairline hairline-border">
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] border-b-hairline bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>ID</span>
        <span>Customer</span>
        <span>Amount</span>
        <span>Status</span>
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b-hairline px-3 py-2 text-sm last:border-b-0">
        <span class="font-mono text-xs">INV-0419</span>
        <span>Granger Holdings</span>
        <span class="font-mono text-xs">$12,840.00</span>
        <span><Badge><FontAwesomeIcon :icon="faCircleCheck" /> Paid</Badge></span>
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b-hairline px-3 py-2 text-sm last:border-b-0">
        <span class="font-mono text-xs">INV-0420</span>
        <span>Bannerman &amp; Co.</span>
        <span class="font-mono text-xs">$4,210.50</span>
        <span><Badge variant="secondary"><FontAwesomeIcon :icon="faHourglassHalf" /> Due soon</Badge></span>
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center px-3 py-2 text-sm">
        <span class="font-mono text-xs">INV-0421</span>
        <span>Hollister Logistics</span>
        <span class="font-mono text-xs">$980.00</span>
        <span><Badge variant="destructive"><FontAwesomeIcon :icon="faCircleExclamation" /> Overdue</Badge></span>
      </div>
    </div>
  </DemoCard>
</VuedaDemo>

## Loading icon: registry controlled

Loading indicators are icon entries, not a shipped spinner primitive. VUEDA
renders the configured `loading` icon through `useIcons`; the consuming app
chooses the icon component and any motion props. In this docs app, the default
registry maps `Default.loading` to a Font Awesome circle-notch icon with
Font Awesome's `spin` prop.

This keeps animation semantics with the integrator's icon system. Font
Awesome spins its own SVG; a Lucide-based app can provide a Lucide icon with
the classes it expects.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="configured loading icon">
    <div class="flex flex-wrap items-center gap-8">
      <div class="flex min-w-16 flex-col items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">inline</span>
        <LoadingSpinnerInline />
      </div>
      <div class="flex min-w-16 flex-col items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">button</span>
        <Button tone="primary" disabled>
          <LoadingSpinnerInline />
          Saving
        </Button>
      </div>
    </div>
  </DemoCard>
  <DemoCard title="status copy">
    <div class="flex flex-wrap items-center gap-4">
      <span class="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <LoadingSpinnerInline />
        Reconciling 24 entries
      </span>
    </div>
    <template #footer>
      <span>icon key <code>Default.loading</code></span>
      <span>animation owned by icon props</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Progress: state matrix

The indicator moves with `translateX` rather than width to match Reka UI's
semantics and keep transitions smooth. The canonical height is 8 px (`h-2`),
with the track at `primary/20` and the indicator at `primary`. The `size` prop
exposes `sm` (4 px) and `lg` (12 px) variants for inline-row indicators and
prominent task progress. Status tones (`success`, `warning`, `destructive`)
swap track and indicator to the matching status surface, mirroring the alert
status recipe. Omitting `max` leaves the bar in Reka's indeterminate state and
animates the indicator across the track.

Theme key: {@api theme-key:Progress}. Token surface: {@api css-token:primary},
{@api css-token:success}, {@api css-token:warning},
{@api css-token:destructive}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="determinate values">
    <div class="grid gap-4">
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Queueing export</span>
          <span>12%</span>
        </div>
        <Progress :model-value="12" :max="100" />
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Importing rows</span>
          <span>6,400 / 10,000</span>
        </div>
        <Progress :model-value="64" :max="100" />
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Finished</span>
          <span>100%</span>
        </div>
        <Progress :model-value="100" :max="100" />
      </div>
    </div>
    <template #footer>
      <span>height <code>h-2</code></span>
      <span>track <code>--primary</code>/20</span>
      <span>indicator <code>--primary</code></span>
    </template>
  </DemoCard>
  <DemoCard title="size variants">
    <div class="grid gap-4">
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Inline row indicator</span>
          <span>40%</span>
        </div>
        <Progress size="sm" :model-value="40" :max="100" />
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Default</span>
          <span>40%</span>
        </div>
        <Progress :model-value="40" :max="100" />
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Bulk import</span>
          <span>40%</span>
        </div>
        <Progress size="lg" :model-value="40" :max="100" />
      </div>
    </div>
    <template #footer>
      <span><code>size="sm"</code> 4px</span>
      <span><code>size="md"</code> 8px</span>
      <span><code>size="lg"</code> 12px</span>
    </template>
  </DemoCard>
  <DemoCard title="status tones">
    <div class="grid gap-4">
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Job complete</span>
          <span>100%</span>
        </div>
        <Progress tone="success" :model-value="100" :max="100" />
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Quota nearing limit</span>
          <span>82%</span>
        </div>
        <Progress tone="warning" :model-value="82" :max="100" />
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Quota exceeded</span>
          <span>112%</span>
        </div>
        <Progress tone="destructive" :model-value="100" :max="100" />
      </div>
    </div>
    <template #footer>
      <span>track <code>--{tone}</code>/20</span>
      <span>indicator <code>--{tone}</code></span>
    </template>
  </DemoCard>
  <DemoCard title="indeterminate">
    <div class="grid gap-4">
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Connecting</span>
          <span>...</span>
        </div>
        <Progress />
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>Verifying</span>
          <span>...</span>
        </div>
        <Progress tone="warning" />
      </div>
    </div>
    <template #footer>
      <span>omit <code>max</code> for indeterminate</span>
      <span>indicator sweeps left to right</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Skeleton: composition matrix

Skeleton placeholders claim the same footprint as the content they replace.
The fill is `primary/10` rather than `accent`: accent would tint loading
states brand-blue and read as selected, while `primary/10` stays neutral
against the surrounding muted neutrals. Radius and dimensions come from the
caller, so card-shaped skeletons override with `rounded-vueda-card` and
avatars override with `rounded-full`.

Theme key: {@api theme-key:Skeleton}. Token surface:
{@api css-token:primary}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="text rows">
    <div class="grid gap-2">
      <Skeleton class="h-3 w-3/5" />
      <Skeleton class="h-3 w-full" />
      <Skeleton class="h-3 w-11/12" />
      <Skeleton class="h-3 w-1/2" />
    </div>
  </DemoCard>
  <DemoCard title="card footprint">
    <div class="grid gap-3 rounded-vueda-card hairline hairline-border bg-card p-3">
      <Skeleton class="h-28 w-full rounded-vueda-card" />
      <Skeleton class="h-4 w-2/3" />
      <Skeleton class="h-3 w-full" />
      <Skeleton class="h-3 w-4/5" />
      <div class="flex items-center gap-2">
        <Skeleton class="size-8 rounded-full" />
        <Skeleton class="h-5 w-24" />
      </div>
    </div>
  </DemoCard>
  <DemoCard title="table rows" class="lg:col-span-2">
    <div class="overflow-x-auto rounded-vueda-control hairline hairline-border">
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] border-b-hairline bg-muted/50 px-3 py-2">
        <Skeleton class="h-3 w-12" />
        <Skeleton class="h-3 w-24" />
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-14" />
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b-hairline px-3 py-2 last:border-b-0">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-4/5" />
        <Skeleton class="h-3 w-20" />
        <Skeleton class="h-5 w-14" />
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b-hairline px-3 py-2 last:border-b-0">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-3/5" />
        <Skeleton class="h-3 w-20" />
        <Skeleton class="h-5 w-14" />
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center px-3 py-2">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-2/3" />
        <Skeleton class="h-3 w-20" />
        <Skeleton class="h-5 w-14" />
      </div>
    </div>
  </DemoCard>
</VuedaDemo>

## Sonner: variant matrix

Sonner is the toast container. Like Button, it resolves on two axes: `type`
(info, success, warning, error, loading -- the tone) and a surface treatment,
normal vs `richColors`. The normal surface reads against the popover token;
`richColors` reuses Alert's status recipe (status text, a status hairline at
50%, background at 10%, mixed against `--popover` rather than `transparent` so
the filled surface stays opaque like every other floating overlay) instead
of a bold fill, so re-toning stays consistent with Alert's already-
established status language. Loading and the default type have no semantic
tone to fill, so they only appear on the normal-surface cards. Every toast,
normal or rich, carries the same edge and elevation as Popover and HoverCard:
an inset `hairline` (so the saturated rich edges do not fringe at integer DPR)
composed with {@api css-token:vueda-shadow-popover}. The live toasts override
vue-sonner's own border and drop shadow to match. Toasts are also dismissible
by dragging; a grab cursor and suppressed text selection make that
discoverable from the first pointer-down, rather than only once a drag is
already underway.

Each row below has a static pair (the intended target, hand-authored) and a
live pair (a real `Sonner` firing real `toast()` calls, so animation,
stacking, drag-dismiss, and timing behave exactly as they do in a consuming
app).

Icons come from the `check`, `info`, `triangleExclamation`, `close`, and
`loading` registry keys via `useIcons`; override them with `setIcons()` or
per-instance `iconOverride`.
Toasts read against the popover surface, the same one used by Popover and
HoverCard, so re-toning the popover token shifts all three in lockstep.

Theme key: {@api theme-key:Sonner}. Token surface:
{@api css-token:popover}, {@api css-token:popover-foreground},
{@api css-token:border}, and {@api css-token:vueda-control-radius}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="static — normal surface">
    <div class="grid gap-2 lg:grid-cols-2">
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline bg-popover p-3 text-popover-foreground">
        <FontAwesomeIcon :icon="faCircleInfo" class="mt-0.5" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">New records imported</div>
          <div class="text-xs leading-snug text-muted-foreground">248 entries added by the Stripe connector.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline bg-popover p-3 text-popover-foreground">
        <FontAwesomeIcon :icon="faCircleCheck" class="mt-0.5 text-success" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Invoice posted · A-0419</div>
          <div class="text-xs leading-snug text-muted-foreground">Payment of $12,840.00 applied.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline bg-popover p-3 text-popover-foreground">
        <FontAwesomeIcon :icon="faTriangleExclamation" class="mt-0.5 text-warning" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Session expires in 5 minutes</div>
          <div class="text-xs leading-snug text-muted-foreground">Save your work to avoid losing changes.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline bg-popover p-3 text-popover-foreground">
        <FontAwesomeIcon :icon="faCircleExclamation" class="mt-0.5 text-destructive" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Sync failed · Stripe</div>
          <div class="text-xs leading-snug text-muted-foreground">HTTP 502, will retry in 60s.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline bg-popover p-3 text-popover-foreground">
        <span class="mt-0.5 size-4"><LoadingSpinnerInline /></span>
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Generating export</div>
          <div class="text-xs leading-snug text-muted-foreground">Reconciling ledger.</div>
        </div>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline bg-popover p-3 text-popover-foreground">
        <FontAwesomeIcon :icon="faBell" class="mt-0.5 text-muted-foreground" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Draft saved</div>
          <div class="text-xs leading-snug text-muted-foreground">Last change 2s ago, autosave every 30s.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
    </div>
    <template #footer>
      <span>bg <code>--popover</code></span>
      <span>fg <code>--popover-foreground</code></span>
      <span>hairline edge <code>--border</code> + <code>--vueda-shadow-popover</code></span>
      <span>loading omits the dismiss button: it tracks a pending promise</span>
    </template>
  </DemoCard>
  <DemoCard title="live — normal surface" description="fires real toast() calls against the actual Sonner component">
    <div class="flex flex-wrap gap-2">
      <Button size="sm" @click="toast.info('New records imported', { description: '248 entries added by the Stripe connector.', duration: Infinity })">Info</Button>
      <Button size="sm" @click="toast.success('Invoice posted · A-0419', { description: 'Payment of $12,840.00 applied.', duration: Infinity })">Success</Button>
      <Button size="sm" @click="toast.warning('Session expires in 5 minutes', { description: 'Save your work to avoid losing changes.', duration: Infinity })">Warning</Button>
      <Button size="sm" @click="toast.error('Sync failed · Stripe', { description: 'HTTP 502, will retry in 60s.', duration: Infinity })">Error</Button>
      <Button size="sm" @click="fireLoadingToast">Loading</Button>
      <Button size="sm" @click="toast('Draft saved', { description: 'Last change 2s ago, autosave every 30s.', duration: Infinity })">Default</Button>
      <Button size="sm" @click="toast.success('Copied to clipboard', { description: 'Share link copied.', duration: 2000 })">Short duration</Button>
    </div>
    <template #footer>
      <span>info/success/warning/error/default use <code>duration: Infinity</code></span>
      <span>loading uses <code>toast.promise()</code> and resolves to success after 2.5s</span>
      <span>"short duration" auto-dismisses after 2s</span>
      <span>drag any toast to dismiss it early -- cursor shows grab/grabbing</span>
    </template>
  </DemoCard>
  <DemoCard title="static — rich colors">
    <div class="grid gap-2 lg:grid-cols-2">
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline [--vueda-hairline-color:color-mix(in_oklab,var(--info)_50%,var(--popover))] bg-info/10 p-3 text-info">
        <FontAwesomeIcon :icon="faCircleInfo" class="mt-0.5" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">New records imported</div>
          <div class="text-xs leading-snug text-info/90">248 entries added by the Stripe connector.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline [--vueda-hairline-color:color-mix(in_oklab,var(--success)_50%,var(--popover))] bg-success/10 p-3 text-success">
        <FontAwesomeIcon :icon="faCircleCheck" class="mt-0.5" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Invoice posted · A-0419</div>
          <div class="text-xs leading-snug text-success/90">Payment of $12,840.00 applied.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline [--vueda-hairline-color:color-mix(in_oklab,var(--warning)_50%,var(--popover))] bg-warning/10 p-3 text-warning">
        <FontAwesomeIcon :icon="faTriangleExclamation" class="mt-0.5" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Session expires in 5 minutes</div>
          <div class="text-xs leading-snug text-warning/90">Save your work to avoid losing changes.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control overlay-hairline [--vueda-hairline-color:color-mix(in_oklab,var(--destructive)_50%,var(--popover))] bg-destructive/10 p-3 text-destructive">
        <FontAwesomeIcon :icon="faCircleExclamation" class="mt-0.5" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Sync failed · Stripe</div>
          <div class="text-xs leading-snug text-destructive/90">HTTP 502, will retry in 60s.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
    </div>
    <template #footer>
      <span>bg <code>--{type}</code>/10</span>
      <span>hairline edge <code>--{type}</code>/50</span>
      <span>elevation <code>--vueda-shadow-popover</code></span>
      <span>mirrors Alert's status recipe</span>
      <span>loading and the default type have no semantic tone to fill, so they stay off this card</span>
    </template>
  </DemoCard>
  <DemoCard title="live — rich colors" description="same buttons, richColors: true on each toast() call">
    <div class="flex flex-wrap gap-2">
      <Button size="sm" @click="toast.info('New records imported', { description: '248 entries added by the Stripe connector.', duration: Infinity, richColors: true })">Info</Button>
      <Button size="sm" @click="toast.success('Invoice posted · A-0419', { description: 'Payment of $12,840.00 applied.', duration: Infinity, richColors: true })">Success</Button>
      <Button size="sm" @click="toast.warning('Session expires in 5 minutes', { description: 'Save your work to avoid losing changes.', duration: Infinity, richColors: true })">Warning</Button>
      <Button size="sm" @click="toast.error('Sync failed · Stripe', { description: 'HTTP 502, will retry in 60s.', duration: Infinity, richColors: true })">Error</Button>
    </div>
    <template #footer>
      <span><code>richColors</code> is a per-toast option, not just a Toaster-level prop</span>
      <span>description inherits the tone automatically; the close button stays neutral, matching the static preview</span>
    </template>
  </DemoCard>
</VuedaDemo>
<ClientOnly>
  <Sonner />
</ClientOnly>
