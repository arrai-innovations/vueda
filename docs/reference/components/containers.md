---
title: Containers
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Card from "@vueda/shell/card/Card.vue";
import CardHeader from "@vueda/shell/card/CardHeader.vue";
import CardTitle from "@vueda/shell/card/CardTitle.vue";
import CardDescription from "@vueda/shell/card/CardDescription.vue";
import CardAction from "@vueda/shell/card/CardAction.vue";
import CardContent from "@vueda/shell/card/CardContent.vue";
import CardFooter from "@vueda/shell/card/CardFooter.vue";
import Accordion from "@vueda/shell/accordion/Accordion.vue";
import AccordionItem from "@vueda/shell/accordion/AccordionItem.vue";
import AccordionTrigger from "@vueda/shell/accordion/AccordionTrigger.vue";
import AccordionContent from "@vueda/shell/accordion/AccordionContent.vue";
import Collapsible from "@vueda/shell/collapsible/Collapsible.vue";
import CollapsibleTrigger from "@vueda/shell/collapsible/CollapsibleTrigger.vue";
import CollapsibleContent from "@vueda/shell/collapsible/CollapsibleContent.vue";
import Item from "@vueda/shell/item/Item.vue";
import ItemMedia from "@vueda/shell/item/ItemMedia.vue";
import ItemContent from "@vueda/shell/item/ItemContent.vue";
import ItemTitle from "@vueda/shell/item/ItemTitle.vue";
import ItemDescription from "@vueda/shell/item/ItemDescription.vue";
import ItemActions from "@vueda/shell/item/ItemActions.vue";
import ItemGroup from "@vueda/shell/item/ItemGroup.vue";
import ItemSeparator from "@vueda/shell/item/ItemSeparator.vue";
import Stepper from "@vueda/shell/stepper/Stepper.vue";
import StepperItem from "@vueda/shell/stepper/StepperItem.vue";
import StepperTrigger from "@vueda/shell/stepper/StepperTrigger.vue";
import StepperIndicator from "@vueda/shell/stepper/StepperIndicator.vue";
import StepperTitle from "@vueda/shell/stepper/StepperTitle.vue";
import StepperDescription from "@vueda/shell/stepper/StepperDescription.vue";
import StepperSeparator from "@vueda/shell/stepper/StepperSeparator.vue";
import ScrollArea from "@vueda/shell/scroll-area/ScrollArea.vue";
import Separator from "@vueda/shell/separator/Separator.vue";
import Button from "@vueda/controls/button/Button.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faCheck, faChevronRight, faClock, faEllipsis, faFile, faFileExport, faFolder, faImage, faUser } from "@fortawesome/free-solid-svg-icons";
</script>

# Containers

The container family covers the box-shaped surfaces that wrap other content:
cards, accordions, collapsibles, list items, steppers, scrollable regions,
and separators. They live under `shell/` because they hold the page chrome
together rather than collecting input or driving an action. Their visual
contract is a small set of values: a 14 px corner radius (the card
{@api css-token:vueda-card-radius}), a 1 px {@api css-token:border}, the
{@api css-token:card} fill, and the {@api css-token:vueda-shadow-card} drop.

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

One structural decision worth flagging up front. Card uses vertical-only
padding on its root (`py-6`, no `px`) and lets each child apply its own
`px-6`. The result is that a child can opt out of the gutter (a table that
needs to bleed to the edge) by setting its own padding to zero, and a header
that wants a divider rule can add `border-b` and pick up `pb-6` automatically
via `[.border-b]:pb-6`. Header / content / footer divisions stay
self-similar without per-position wrappers.

## Card

Card is the primary surface for presenting a single object's information.
It is a flex column with `gap-6` between regions and seven theme keys:
the shell ({@api theme-key:Card}) plus six region keys
({@api theme-key:CardHeader}, {@api theme-key:CardTitle},
{@api theme-key:CardDescription}, {@api theme-key:CardAction},
{@api theme-key:CardContent}, {@api theme-key:CardFooter}). The header is a
two-row CSS grid; when a {@api theme-key:CardAction} child is present, the
grid switches to `[1fr auto]` so the action lands flush right and spans both
rows.

Token surface: {@api css-token:card} (fill),
{@api css-token:card-foreground} (text), {@api css-token:border}
(stroke), {@api css-token:vueda-card-radius} (corners),
{@api css-token:vueda-shadow-card} (drop).

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="header + content">
    <Card>
      <CardHeader>
        <CardTitle>Invoice 2024-10-0482</CardTitle>
        <CardDescription>Acme Pressroom, Ltd. · due in 4 days</CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground m-0">
          Balance outstanding of <strong class="text-foreground">$4,280.00</strong>
          after a partial payment on March 14.
        </p>
      </CardContent>
    </Card>
    <template #footer>
      <span>gap-6 between children</span>
      <span>py-6 on root, px-6 on each child</span>
    </template>
  </DemoCard>
  <DemoCard title="header + action">
    <Card>
      <CardHeader>
        <CardTitle>Payment reminders</CardTitle>
        <CardDescription>Automated emails sent to overdue customers.</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">Configure</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-foreground font-medium m-0">
          3 reminders queued · next send <code class="font-mono text-xs">2026-04-26 09:00</code>
        </p>
      </CardContent>
    </Card>
    <template #footer>
      <span>header grid becomes <code>[1fr auto]</code> when action is present</span>
    </template>
  </DemoCard>
  <DemoCard title="header + content + footer">
    <Card>
      <CardHeader>
        <CardTitle>Archive invoice</CardTitle>
        <CardDescription>Archived invoices are hidden from the main ledger.</CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground m-0">
          They remain searchable and are retained for 7 years per retention policy.
        </p>
      </CardContent>
      <CardFooter class="justify-end gap-2">
        <Button size="sm" variant="ghost">Cancel</Button>
        <Button size="sm">Archive</Button>
      </CardFooter>
    </Card>
    <template #footer>
      <span>CardFooter is a flex row; consumer aligns it</span>
    </template>
  </DemoCard>
  <DemoCard title="border-b on header — tight grouping">
    <Card>
      <CardHeader class="border-b">
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Last 3 days, from all connected feeds.</CardDescription>
      </CardHeader>
      <CardContent>
        <table class="w-full text-sm">
          <tbody>
            <tr>
              <td class="py-1 text-muted-foreground font-mono text-xs">04-22</td>
              <td>Stripe payout</td>
              <td class="text-right tabular-nums">$2,480.00</td>
            </tr>
            <tr>
              <td class="py-1 text-muted-foreground font-mono text-xs">04-21</td>
              <td>AWS</td>
              <td class="text-right tabular-nums text-destructive">−$312.40</td>
            </tr>
            <tr>
              <td class="py-1 text-muted-foreground font-mono text-xs">04-20</td>
              <td>Mercury interest</td>
              <td class="text-right tabular-nums">$18.22</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
    <template #footer>
      <span><code>[.border-b]:pb-6</code> picks up the rule</span>
      <span>consumer adds <code>border-b</code> on the header</span>
    </template>
  </DemoCard>
  <DemoCard title="border-t on footer — danger zone">
    <Card>
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>These actions can't be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground m-0">
          Deleting a customer removes all linked invoices, payments, and contact records.
        </p>
      </CardContent>
      <CardFooter class="border-t justify-end">
        <Button size="sm" variant="destructive">Delete customer…</Button>
      </CardFooter>
    </Card>
    <template #footer>
      <span><code>[.border-t]:pt-6</code> on footer</span>
    </template>
  </DemoCard>
  <DemoCard title="content-only — metric tile">
    <Card>
      <CardContent>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-semibold tabular-nums tracking-tight">$48,204</span>
          <span class="font-mono text-xs text-success">+12.4%</span>
        </div>
        <p class="mt-1 font-mono text-xs text-muted-foreground">
          outstanding · 28 invoices
        </p>
      </CardContent>
    </Card>
    <template #footer>
      <span>the shell is the whole component; no header required</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Accordion

Accordion is a stack of disclosure rows. Each row is an
{@api theme-key:AccordionItem} (a 1 px bottom border, suppressed on the
last item) with a header trigger ({@api theme-key:AccordionTrigger}) and a
collapsible panel ({@api theme-key:AccordionContent}). The chevron rotates
180° via `[&[data-state=open]>svg]:rotate-180` on the trigger; the panel
animates with the `accordion-up` / `accordion-down` keyframes inlined at
the base layer.

Theme keys: {@api theme-key:Accordion}, {@api theme-key:AccordionItem},
{@api theme-key:AccordionTrigger}, {@api theme-key:AccordionContent}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="FAQ pattern — single, collapsible">
    <Accordion type="single" collapsible default-value="terms">
      <AccordionItem value="overdue">
        <AccordionTrigger>When does an invoice become overdue?</AccordionTrigger>
        <AccordionContent>
          An invoice is overdue the day after its due date. Reminders fire on
          a configurable schedule from that point.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="terms">
        <AccordionTrigger>Can I change the payment terms after sending?</AccordionTrigger>
        <AccordionContent>
          Yes, until the invoice is paid. Editing terms triggers a revision
          and a new PDF is sent to the customer. If the invoice is already
          partially paid, only the balance follows the new terms.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="bank">
        <AccordionTrigger>How do bank-feed matches work?</AccordionTrigger>
        <AccordionContent>
          Incoming transactions are matched to invoices by amount, currency,
          and a fuzzy memo comparison. Confidence below 90% is queued for
          manual review.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    <template #footer>
      <span>border-b between items, suppressed on last</span>
      <span>content inner uses <code>pt-0 pb-4</code></span>
    </template>
  </DemoCard>
  <DemoCard title="disabled item">
    <Accordion type="single" collapsible>
      <AccordionItem value="2fa">
        <AccordionTrigger>Two-factor authentication</AccordionTrigger>
        <AccordionContent>Enrollment options for TOTP and WebAuthn devices.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="sso" disabled>
        <AccordionTrigger>SSO (Enterprise plan only)</AccordionTrigger>
        <AccordionContent>Available on the Enterprise plan.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="session">
        <AccordionTrigger>Session timeout</AccordionTrigger>
        <AccordionContent>Idle sessions expire after 30 minutes by default.</AccordionContent>
      </AccordionItem>
    </Accordion>
    <template #footer>
      <span>disabled trigger: <code>opacity 50</code>, no pointer events</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Collapsible

Collapsible is a logic primitive, not a styled surface. All three of its
theme keys ({@api theme-key:Collapsible}, {@api theme-key:CollapsibleTrigger},
{@api theme-key:CollapsibleContent}) ship empty in the default theme; the
component contributes show / hide behavior and `data-state` attributes, and
the consumer brings the chrome. Use it when you want disclosure without
the FAQ-style row treatment of {@api theme-key:Accordion}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="bare — closed">
    <Collapsible>
      <CollapsibleTrigger as-child>
        <button type="button" class="flex items-center gap-2 text-sm font-medium">
          <FontAwesomeIcon :icon="faChevronRight" class="size-3 transition-transform data-[state=open]:rotate-90" />
          Advanced filters
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p class="mt-2 text-sm text-muted-foreground">
          Applies to: invoice date · status · amount · memo
        </p>
      </CollapsibleContent>
    </Collapsible>
    <template #footer>
      <span>trigger and panel are consumer-styled</span>
    </template>
  </DemoCard>
  <DemoCard title="bare — open by default">
    <Collapsible default-open>
      <CollapsibleTrigger as-child>
        <button type="button" class="flex items-center gap-2 text-sm font-medium">
          <FontAwesomeIcon :icon="faChevronRight" class="size-3 transition-transform data-[state=open]:rotate-90" />
          Advanced filters
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p class="mt-2 text-sm text-muted-foreground">
          Applies to: invoice date · status · amount · memo
        </p>
      </CollapsibleContent>
    </Collapsible>
    <template #footer>
      <span><code>data-state</code> on trigger and panel drives the chrome</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Item / ItemGroup

Item is a flexible row primitive used for list-like layouts where each row
shows a heading, an optional media slot, and optional trailing actions. The
shell ({@api theme-key:Item}) takes a `variant`
(`outline`, `muted`, default transparent) and a `size` (`sm`, default `md`).
Sub-keys carve the row into regions: {@api theme-key:ItemMedia} (left
icon / image), {@api theme-key:ItemContent} (title + description),
{@api theme-key:ItemActions} (right buttons), with
{@api theme-key:ItemHeader} and {@api theme-key:ItemFooter} for full-width
auxiliary rows. {@api theme-key:ItemGroup} is a vertical flex column;
{@api theme-key:ItemSeparator} drops a 1 px rule between rows.

The default Item is `bg-transparent`; an `is-link` (or anchor) item raises
to `bg-accent/50` on hover via `[a]:hover:bg-accent/50` on the root.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="variants — default · outline · muted">
    <ItemGroup class="gap-2">
      <Item>
        <ItemContent>
          <ItemTitle>default — bg transparent</ItemTitle>
          <ItemDescription>No border, no fill. Flush against the container.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>outline — border-border</ItemTitle>
          <ItemDescription>Use for standalone items where a separator would be awkward.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>muted — bg-muted/50</ItemTitle>
          <ItemDescription>For inline grouping inside a Card or row.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  </DemoCard>
  <DemoCard title="sizes — sm · md">
    <ItemGroup class="gap-2">
      <Item size="sm" variant="outline">
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faClock" /></ItemMedia>
        <ItemContent>
          <ItemTitle>sm — py-3 px-4 gap-2.5</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faClock" /></ItemMedia>
        <ItemContent>
          <ItemTitle>md — p-4 gap-4 (default)</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  </DemoCard>
  <DemoCard title="ItemMedia — icon · image · none">
    <ItemGroup class="gap-2">
      <Item variant="outline">
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faFile" /></ItemMedia>
        <ItemContent>
          <ItemTitle>icon — size-8 bordered</ItemTitle>
          <ItemDescription>32 px square, 1 px border, bg-muted, svg size-4 inside.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="image"><FontAwesomeIcon :icon="faImage" class="size-6 text-muted-foreground" /></ItemMedia>
        <ItemContent>
          <ItemTitle>image — size-10 rounded</ItemTitle>
          <ItemDescription>40 px square, rounded-sm, object-cover. For avatars and thumbs.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>no media</ItemTitle>
          <ItemDescription>Absent slot collapses; title and description sit flush left.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  </DemoCard>
  <DemoCard title="ItemActions — trailing buttons">
    <ItemGroup class="gap-2">
      <Item variant="outline">
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faFileExport" /></ItemMedia>
        <ItemContent>
          <ItemTitle>Exports</ItemTitle>
          <ItemDescription>CSV, Parquet, JSON · 3 destinations.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="ghost">Rename</Button>
          <Button size="sm" variant="outline">Run</Button>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faFolder" /></ItemMedia>
        <ItemContent>
          <ItemTitle>Sandbox webhook</ItemTitle>
          <ItemDescription>https://webhook.site/abc-123 · last ping 2 h ago</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="ghost" aria-label="More">
            <FontAwesomeIcon :icon="faEllipsis" />
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  </DemoCard>
  <DemoCard title="ItemGroup + ItemSeparator — divider rows" class="sm:col-span-2">
    <ItemGroup class="rounded-md border overflow-hidden">
      <Item>
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faUser" /></ItemMedia>
        <ItemContent>
          <ItemTitle>Erin Meyers</ItemTitle>
          <ItemDescription>erin@acme.co · admin</ItemDescription>
        </ItemContent>
        <ItemActions>
          <span class="rounded-full bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">Admin</span>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faUser" /></ItemMedia>
        <ItemContent>
          <ItemTitle>Sam Rao</ItemTitle>
          <ItemDescription>sam@acme.co · member</ItemDescription>
        </ItemContent>
        <ItemActions>
          <span class="rounded-full bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">Member</span>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon"><FontAwesomeIcon :icon="faUser" /></ItemMedia>
        <ItemContent>
          <ItemTitle>Jules Park</ItemTitle>
          <ItemDescription>jules@acme.co · viewer · invited</ItemDescription>
        </ItemContent>
        <ItemActions>
          <span class="rounded-full bg-warning/10 px-2 py-1 font-mono text-[11px] text-warning">Pending</span>
        </ItemActions>
      </Item>
    </ItemGroup>
    <template #footer>
      <span>outer border belongs to the parent; items stay default (transparent)</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Stepper

Stepper renders a sequence of milestone indicators, optionally with title
and description, separated by a connecting bar. The state cube is encoded
in `data-state` on the {@api theme-key:StepperItem}: `active` flips the
indicator to {@api css-token:primary} / {@api css-token:primary-foreground},
`completed` flips it to {@api css-token:accent} /
{@api css-token:accent-foreground}, and the unset (future) state shows
muted-foreground at 50% opacity. `data-disabled` propagates opacity 50
across the indicator and the separator that follows.

Theme keys: {@api theme-key:Stepper}, {@api theme-key:StepperItem},
{@api theme-key:StepperTrigger}, {@api theme-key:StepperIndicator},
{@api theme-key:StepperTitle}, {@api theme-key:StepperDescription},
{@api theme-key:StepperSeparator}.

<VuedaDemo class="flex flex-col gap-6">
  <DemoCard title="4 steps — completed · completed · active · future">
    <Stepper :default-value="3">
      <StepperItem :step="1" completed>
        <StepperTrigger>
          <StepperIndicator><FontAwesomeIcon :icon="faCheck" class="size-3" /></StepperIndicator>
          <StepperTitle>Connect bank</StepperTitle>
          <StepperDescription>Plaid or manual</StepperDescription>
        </StepperTrigger>
        <StepperSeparator class="h-px flex-1" />
      </StepperItem>
      <StepperItem :step="2" completed>
        <StepperTrigger>
          <StepperIndicator><FontAwesomeIcon :icon="faCheck" class="size-3" /></StepperIndicator>
          <StepperTitle>Import customers</StepperTitle>
          <StepperDescription>42 imported</StepperDescription>
        </StepperTrigger>
        <StepperSeparator class="h-px flex-1" />
      </StepperItem>
      <StepperItem :step="3">
        <StepperTrigger>
          <StepperIndicator>3</StepperIndicator>
          <StepperTitle>Set up reminders</StepperTitle>
          <StepperDescription>3 templates available</StepperDescription>
        </StepperTrigger>
        <StepperSeparator class="h-px flex-1" />
      </StepperItem>
      <StepperItem :step="4">
        <StepperTrigger>
          <StepperIndicator>4</StepperIndicator>
          <StepperTitle>Invite team</StepperTitle>
          <StepperDescription>Optional</StepperDescription>
        </StepperTrigger>
      </StepperItem>
    </Stepper>
    <template #footer>
      <span>active <code>bg-primary</code></span>
      <span>completed <code>bg-accent</code></span>
      <span>future <code>text-muted-foreground/50</code></span>
    </template>
  </DemoCard>
  <DemoCard title="with a disabled step">
    <Stepper :default-value="2">
      <StepperItem :step="1" completed>
        <StepperTrigger>
          <StepperIndicator><FontAwesomeIcon :icon="faCheck" class="size-3" /></StepperIndicator>
          <StepperTitle>Upload CSV</StepperTitle>
        </StepperTrigger>
        <StepperSeparator class="h-px flex-1" />
      </StepperItem>
      <StepperItem :step="2">
        <StepperTrigger>
          <StepperIndicator>2</StepperIndicator>
          <StepperTitle>Map columns</StepperTitle>
        </StepperTrigger>
        <StepperSeparator class="h-px flex-1" />
      </StepperItem>
      <StepperItem :step="3" disabled>
        <StepperTrigger>
          <StepperIndicator>3</StepperIndicator>
          <StepperTitle>Import</StepperTitle>
        </StepperTrigger>
      </StepperItem>
    </Stepper>
    <template #footer>
      <span>disabled propagates opacity 50 to indicator + trailing separator</span>
    </template>
  </DemoCard>
</VuedaDemo>

## ScrollArea

ScrollArea wraps a fixed-height region and replaces the platform's native
scrollbar with a 10 px track plus a `bg-border` thumb. The component renders
both axes; whichever isn't needed stays inert. The viewport is what receives
focus, so the ring outline lands inside the parent's overflow clip.

Theme keys: {@api theme-key:ScrollArea} (root + viewport),
{@api theme-key:ScrollBar} (track + thumb). The thumb reads from
{@api css-token:border}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="vertical">
    <div class="rounded-md border overflow-hidden">
      <ScrollArea style="height: 200px;" class="p-3">
        <ul class="m-0 list-none p-0 text-sm leading-relaxed">
          <li>01. Draft a new invoice</li>
          <li>02. Send to customer</li>
          <li>03. Record payment</li>
          <li>04. Match to bank transaction</li>
          <li>05. Generate a statement</li>
          <li>06. Apply a credit note</li>
          <li>07. Record a refund</li>
          <li>08. Set up a recurring schedule</li>
          <li>09. Split a line item</li>
          <li>10. Add a tax rate</li>
          <li>11. Duplicate an invoice</li>
          <li>12. Archive overdue invoices</li>
          <li>13. Export a ledger</li>
          <li>14. Reconcile a feed</li>
          <li>15. Add a team member</li>
          <li>16. Invite an accountant</li>
        </ul>
      </ScrollArea>
    </div>
    <template #footer>
      <span>10 px scrollbar</span>
      <span>thumb <code>bg-border</code>, rounded-full</span>
    </template>
  </DemoCard>
  <DemoCard title="inside a Card">
    <Card class="py-0">
      <CardHeader class="border-b py-4">
        <CardTitle class="text-sm">Activity</CardTitle>
        <CardDescription class="text-xs">Last 30 events</CardDescription>
      </CardHeader>
      <ScrollArea style="height: 180px;" class="px-5 py-2">
        <ul class="m-0 list-none p-0 font-mono text-xs leading-relaxed text-muted-foreground">
          <li><span class="text-foreground">10:12</span> · invoice.sent · INV-0482</li>
          <li><span class="text-foreground">10:08</span> · webhook.delivered · stripe</li>
          <li><span class="text-foreground">09:54</span> · invoice.created · INV-0482</li>
          <li><span class="text-foreground">09:12</span> · customer.updated · acme-pressroom</li>
          <li><span class="text-foreground">08:47</span> · bank.match · txn_48B2Kq</li>
          <li><span class="text-foreground">08:40</span> · invoice.paid · INV-0479</li>
          <li><span class="text-foreground">08:36</span> · reminder.sent · INV-0470</li>
          <li><span class="text-foreground">08:01</span> · session.login · erin@acme</li>
          <li><span class="text-foreground">07:44</span> · export.completed · reconciliation-q1</li>
          <li><span class="text-foreground">07:02</span> · invoice.viewed · INV-0478</li>
          <li><span class="text-foreground">06:51</span> · webhook.failed · zapier (retry 2/3)</li>
        </ul>
      </ScrollArea>
    </Card>
    <template #footer>
      <span>card's rounded corners clip the scroll viewport</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Separator

Separator is a 1 px rule. It picks an axis from `orientation` and stretches
along the cross axis: a horizontal separator is `h-px w-full`, a vertical
one is `w-px h-full`. Both modes read color from {@api css-token:border}.
The vertical mode requires the parent to set an explicit height because
`h-full` collapses inside a `flex` row otherwise.

Theme key: {@api theme-key:Separator}. The default theme does not ship a
labeled "OR" variant; compose two separators around a span when you need
one.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="horizontal — section break">
    <div class="rounded-md border p-4">
      <div class="text-sm font-medium">Account</div>
      <p class="mt-1 text-xs text-muted-foreground">Change the email and password used to sign in.</p>
      <Separator class="my-3" />
      <div class="text-sm font-medium">Billing</div>
      <p class="mt-1 text-xs text-muted-foreground">Plan, payment method, invoices.</p>
    </div>
    <template #footer>
      <span>1 px <code>bg-border</code>, full width</span>
    </template>
  </DemoCard>
  <DemoCard title="vertical — inline items">
    <div class="inline-flex w-fit items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium">
      <span>Overview</span>
      <Separator orientation="vertical" class="h-4" />
      <span>Transactions</span>
      <Separator orientation="vertical" class="h-4" />
      <span>Customers</span>
      <Separator orientation="vertical" class="h-4" />
      <span class="text-muted-foreground">Reports</span>
    </div>
    <template #footer>
      <span>parent sets an explicit height for vertical</span>
    </template>
  </DemoCard>
  <DemoCard title="labeled — composed &quot;OR&quot;" class="sm:col-span-2">
    <div class="flex items-center gap-3">
      <Separator class="flex-1" />
      <span class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
      <Separator class="flex-1" />
    </div>
    <template #footer>
      <span>Separator does not ship a labeled variant; compose two with a span between</span>
    </template>
  </DemoCard>
</VuedaDemo>
