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
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import Progress from "@vueda/feedback/progress/Progress.vue";
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import Button from "@vueda/controls/button/Button.vue";
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
</script>

# Feedback + Loading

The feedback family covers the surfaces that report state to the operator:
alerts, badges, loading icons, progress bars, skeleton placeholders, the toast
container, and the hover card popover. They share the status token surface
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
status border at 50%, status background at 10%. The icon column collapses
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
      <span>status border <code>/50</code></span>
      <span>icon column only when direct SVG child exists</span>
    </template>
  </DemoCard>
  <section class="grid gap-3 rounded-vueda-card border border-border p-4 lg:grid-cols-2">
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
        <Button variant="ghost" size="sm">Dismiss</Button>
        <Button variant="outline" size="sm">Renew</Button>
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
in dense rows; linked badges fade their background by 10% on hover.

Theme key: {@api theme-key:Badge}. Token surface:
{@api css-token:primary}, {@api css-token:secondary},
{@api css-token:destructive}, {@api css-token:foreground},
{@api css-token:border}, and {@api css-token:vueda-control-radius}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="variants">
    <div class="flex flex-wrap items-center gap-2">
      <Badge>Active</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="destructive">Void</Badge>
      <Badge variant="outline">Archived</Badge>
    </div>
    <template #footer>
      <span>radius <code>--vueda-control-radius</code></span>
      <span>padding <code>px-2 py-0.5</code></span>
    </template>
  </DemoCard>
  <DemoCard title="with icons">
    <div class="flex flex-wrap items-center gap-2">
      <Badge><FontAwesomeIcon :icon="faCircleCheck" /> Reconciled</Badge>
      <Badge variant="secondary"><FontAwesomeIcon :icon="faHourglassHalf" /> Pending</Badge>
      <Badge variant="destructive"><FontAwesomeIcon :icon="faLock" /> Locked</Badge>
      <Badge variant="outline"><FontAwesomeIcon :icon="faClock" /> Scheduled</Badge>
    </div>
    <template #footer>
      <span>icon size <code>3</code></span>
      <span>gap <code>1</code></span>
    </template>
  </DemoCard>
  <DemoCard title="table context" class="lg:col-span-2">
    <div class="overflow-x-auto rounded-vueda-control border border-border">
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] border-b border-border bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>ID</span>
        <span>Customer</span>
        <span>Amount</span>
        <span>Status</span>
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b border-border px-3 py-2 text-sm last:border-b-0">
        <span class="font-mono text-xs">INV-0419</span>
        <span>Granger Holdings</span>
        <span class="font-mono text-xs">$12,840.00</span>
        <span><Badge><FontAwesomeIcon :icon="faCircleCheck" /> Paid</Badge></span>
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b border-border px-3 py-2 text-sm last:border-b-0">
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

This keeps animation semantics with the implementor's icon system. Font
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
        <Button disabled>
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

Progress is determinate by default. The indicator moves with `translateX`
rather than width to match Reka UI's semantics and keep transitions smooth;
the canonical height is 8 px (`h-2`), with the track at `primary/20` and the
indicator at `primary`. Status tones (success, warning, destructive) and
indeterminate styling are open design questions; the current theme is
primary-only.

Theme key: {@api theme-key:Progress}. Token surface: {@api css-token:primary}.

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
    <div class="grid gap-3 rounded-vueda-card border border-border bg-card p-3">
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
    <div class="overflow-x-auto rounded-vueda-control border border-border">
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] border-b border-border bg-muted/50 px-3 py-2">
        <Skeleton class="h-3 w-12" />
        <Skeleton class="h-3 w-24" />
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-14" />
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b border-border px-3 py-2 last:border-b-0">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-4/5" />
        <Skeleton class="h-3 w-20" />
        <Skeleton class="h-5 w-14" />
      </div>
      <div class="grid min-w-[620px] grid-cols-[96px_1fr_120px_120px] items-center border-b border-border px-3 py-2 last:border-b-0">
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

Sonner is the toast container. The component supplies VUEDA colors and renders
registered icons for its named icon slots (`success-icon`, `info-icon`,
`warning-icon`, `error-icon`, `loading-icon`, `close-icon`). Consumers can
override any slot with an icon component.
Toasts read against the popover surface, the same one used by Popover and
HoverCard, so re-toning the popover token shifts all three in lockstep.

Theme key: {@api theme-key:Sonner}. Token surface:
{@api css-token:popover}, {@api css-token:popover-foreground},
{@api css-token:border}, and {@api css-token:vueda-control-radius}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="types with default glyphs">
    <div class="grid gap-2 lg:grid-cols-2">
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
        <span class="mt-0.5 font-mono text-sm leading-none">ℹ</span>
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">New records imported</div>
          <div class="text-xs leading-snug text-muted-foreground">248 entries added by the Stripe connector.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
        <span class="mt-0.5 font-mono text-sm leading-none text-success">✓</span>
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Invoice posted · A-0419</div>
          <div class="text-xs leading-snug text-muted-foreground">Payment of $12,840.00 applied.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
        <span class="mt-0.5 font-mono text-sm leading-none text-warning">⚠</span>
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Session expires in 5 minutes</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
        <span class="mt-0.5 font-mono text-sm leading-none text-destructive">✕</span>
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Sync failed · Stripe</div>
          <div class="text-xs leading-snug text-muted-foreground">HTTP 502, will retry in 60s.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
        <span class="mt-0.5 size-4"><LoadingSpinnerInline /></span>
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Generating export</div>
          <div class="text-xs leading-snug text-muted-foreground">Reconciling ledger.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
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
      <span>border <code>--border</code></span>
      <span>icons from <code>useIcons</code></span>
    </template>
  </DemoCard>
  <DemoCard title="Font Awesome override">
    <div class="grid gap-2 lg:grid-cols-2">
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
        <FontAwesomeIcon :icon="faCircleCheck" class="mt-0.5 text-success" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Reconciliation complete</div>
          <div class="text-xs leading-snug text-muted-foreground">All 247 entries matched.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
      <div class="grid grid-cols-[16px_1fr_auto] items-start gap-3 rounded-vueda-control border border-border bg-popover p-3 text-popover-foreground shadow-vueda-popover">
        <FontAwesomeIcon :icon="faCircleExclamation" class="mt-0.5 text-destructive" />
        <div class="grid gap-1">
          <div class="text-sm font-medium leading-tight">Upload rejected</div>
          <div class="text-xs leading-snug text-muted-foreground">File exceeds 50MB limit.</div>
        </div>
        <button class="mt-0.5 rounded-vueda-control text-muted-foreground hover:text-foreground" type="button" aria-label="Dismiss">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
    </div>
    <template #footer>
      <span>slot names <code>success-icon</code>, <code>info-icon</code>, <code>warning-icon</code>, <code>error-icon</code>, <code>loading-icon</code>, <code>close-icon</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## HoverCard: composition matrix

HoverCard is a glance-weight summary popover, lighter than Popover. The
content panel is `w-64` (256 px) with {@api css-token:vueda-control-radius},
deliberately tighter than the popover surface used for actionable Popover
content; HoverCard is for read-only summaries (a profile by hovering a
username, a record summary by hovering an ID), Popover is for actions.

Theme key: {@api theme-key:HoverCardContent}. Token surface:
{@api css-token:popover}, {@api css-token:popover-foreground},
{@api css-token:border}, and {@api css-token:vueda-control-radius}. The
elevation comes from {@api css-token:vueda-shadow-popover}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="profile summary">
    <div class="w-64 rounded-vueda-control border border-border bg-popover p-4 text-popover-foreground shadow-vueda-popover">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">JO</div>
        <div class="grid gap-0.5">
          <div class="text-sm font-medium leading-tight">Jadesola Okafor</div>
          <div class="text-xs text-muted-foreground">j.okafor · Accounts</div>
        </div>
      </div>
      <p class="mt-3 text-xs leading-snug text-muted-foreground">
        Senior AR specialist. Posts to GL-4100 and GL-4105 only.
      </p>
      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt class="text-muted-foreground">Role</dt>
        <dd class="font-mono">AR.Specialist</dd>
        <dt class="text-muted-foreground">Last login</dt>
        <dd>today, 13:52</dd>
        <dt class="text-muted-foreground">Posted</dt>
        <dd>1,284 invoices</dd>
      </dl>
    </div>
    <template #footer>
      <span>width <code>w-64</code></span>
      <span>padding <code>p-4</code></span>
      <span>radius <code>--vueda-control-radius</code></span>
    </template>
  </DemoCard>
  <DemoCard title="record summary">
    <div class="w-64 rounded-vueda-control border border-border bg-popover p-4 text-popover-foreground shadow-vueda-popover">
      <div class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</div>
      <div class="mt-1 text-sm font-medium leading-tight">Granger Holdings</div>
      <div class="text-xs text-muted-foreground">CUST-3487 · Net 30</div>
      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt class="text-muted-foreground">Balance</dt>
        <dd class="font-mono">$24,108.50</dd>
        <dt class="text-muted-foreground">Open INV</dt>
        <dd class="font-mono">3</dd>
        <dt class="text-muted-foreground">DSO</dt>
        <dd class="font-mono">42d</dd>
        <dt class="text-muted-foreground">Credit</dt>
        <dd class="font-mono">$50,000</dd>
      </dl>
    </div>
    <template #footer>
      <span>summary, not actionable</span>
      <span>use Popover when the panel needs buttons</span>
    </template>
  </DemoCard>
</VuedaDemo>
