---
title: Inputs
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Label from "@vueda/shell/label/Label.vue";
import Input from "@vueda/controls/input/Input.vue";
import Textarea from "@vueda/controls/textarea/Textarea.vue";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import NativeSelectOptGroup from "@vueda/controls/native-select/NativeSelectOptGroup.vue";
import NumberField from "@vueda/controls/number-field/NumberField.vue";
import NumberFieldContent from "@vueda/controls/number-field/NumberFieldContent.vue";
import NumberFieldDecrement from "@vueda/controls/number-field/NumberFieldDecrement.vue";
import NumberFieldIncrement from "@vueda/controls/number-field/NumberFieldIncrement.vue";
import NumberFieldInput from "@vueda/controls/number-field/NumberFieldInput.vue";
import Checkbox from "@vueda/controls/checkbox/Checkbox.vue";
import RadioGroup from "@vueda/controls/radio-group/RadioGroup.vue";
import RadioGroupItem from "@vueda/controls/radio-group/RadioGroupItem.vue";
import TagsInput from "@vueda/controls/tags-input/TagsInput.vue";
import TagsInputItem from "@vueda/controls/tags-input/TagsInputItem.vue";
import TagsInputItemText from "@vueda/controls/tags-input/TagsInputItemText.vue";
import TagsInputItemDelete from "@vueda/controls/tags-input/TagsInputItemDelete.vue";
import TagsInputInput from "@vueda/controls/tags-input/TagsInputInput.vue";
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";
import InputOTPSeparator from "@vueda/controls/input-otp/InputOTPSeparator.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
</script>

# Inputs

The input family covers every text-entry, selection, and toggleable form
control: labels, plain inputs, textareas, native selects, number fields,
checkboxes, radio groups, tags inputs, and the OTP slot composer. They share
the same control sizing as buttons (32 / 28 / 40 governed by
{@api css-token:vueda-control-height} and its sm / lg companions) and the
same focus treatment (2 px solid {@api css-token:ring} outline at 2 px
offset). Border colors come from {@api css-token:border} and
{@api css-token:input}; invalid states swap the outline to
{@api css-token:destructive}.

This page is the visual contract the default theme guarantees. Use it as the
target spec when you re-skin: every cell shown here should still read as the
same control after a customization, even if its color, radius, or density
shifts. If a cell breaks, the change has crossed from skin into design
language.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). In
brief: values (color, dimension, duration) belong in
[CSS tokens](../theming/tokens.md); compositions (class arrangements,
state recipes) belong in [theme keys](../theming/keys.md).

Two corners worth flagging up front. The checkbox body uses
{@api css-token:vueda-checkbox-radius} (4 px) rather than the 2 px slab
{@api css-token:vueda-control-radius} so a 16 × 16 box reads as a chiclet next
to the slab inputs and buttons it sits beside in a form. And the focus ring
is rendered as a real `outline`, not a `box-shadow` sandwich, so it sits
outside the border-box without seam artifacts at sharp 2 px corners.

## Label

Label is a typographic primitive paired with a focusable control. The
interesting axes are _content_ (text alone, text with an icon) and
_pairing_ (with an enabled control versus a disabled one, where
`peer-disabled:opacity-50` cascades the dimmed treatment from the sibling
input).

Theme key: {@api theme-key:Label}. Typography reads from
{@api css-token:vueda-text-body} (13 px) at weight 500.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="content">
    <div class="flex flex-col gap-2">
      <Label for="lbl-default">Company name</Label>
      <Input id="lbl-default" placeholder="Acme, Inc." />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="lbl-icon">
        <FontAwesomeIcon :icon="faClock" />
        Updated at
      </Label>
      <Input id="lbl-icon" readonly value="2026-04-23 14:22:06" />
    </div>
    <template #footer>
      <span class="whitespace-nowrap">fg <code>--foreground</code></span>
      <span class="whitespace-nowrap">gap-2 between icon and text</span>
    </template>
  </DemoCard>
  <DemoCard title="paired with disabled input">
    <div class="flex flex-col gap-2">
      <Label for="lbl-peer" class="peer-disabled:opacity-50">Legacy ID</Label>
      <Input id="lbl-peer" class="peer" disabled placeholder="—" />
    </div>
    <template #footer>
      <span class="whitespace-nowrap"><code>peer-disabled:opacity-50</code> cascades from sibling input</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Input: state matrix

The state cube for plain inputs is the validation axis (default, invalid),
the read mode (read/write, readonly, disabled), and the type axis (text,
password, file). Focus is reproduced via the docs harness so the ring is
visible without keyboard interaction; hover has no dedicated treatment in
the default theme for this control.

Theme key: {@api theme-key:Input}. Token surface: {@api css-token:input}
(border), {@api css-token:background} (fill), {@api css-token:ring} (focus
outline), {@api css-token:destructive} (invalid outline),
{@api css-token:muted} (read-only fill).

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="validation states">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>default</StateLabel>
      <StateLabel>filled</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <div><Input placeholder="Search invoices…" /></div>
      <div><Input value="INV-2026-0418-A1" /></div>
      <div><ForceState state="focus" as="block"><Input value="Focused" /></ForceState></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>invalid</StateLabel>
      <StateLabel>invalid + focus</StateLabel>
      <StateLabel>invalid + filled</StateLabel>
      <div><Input aria-invalid="true" value="not-an-email" /></div>
      <div><ForceState state="focus" as="block"><Input aria-invalid="true" value="not-an-email" /></ForceState></div>
      <div><Input aria-invalid="true" placeholder="required" /></div>
    </div>
    <template #footer>
      <span class="whitespace-nowrap">border <code>--input</code></span>
      <span class="whitespace-nowrap">focus outline <code>--ring</code></span>
      <span class="whitespace-nowrap">invalid border <code>--destructive</code></span>
      <span class="whitespace-nowrap">invalid outline <code>--destructive</code></span>
    </template>
  </DemoCard>
  <DemoCard title="read modes">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>read/write</StateLabel>
      <StateLabel>readonly</StateLabel>
      <StateLabel>disabled</StateLabel>
      <div><Input value="Editable text" /></div>
      <div><Input readonly value="2026-04-23T14:22:06Z" /></div>
      <div><Input disabled value="Archived" /></div>
    </div>
    <template #footer>
      <span class="whitespace-nowrap">readonly fill <code>--muted</code>/50</span>
      <span class="whitespace-nowrap">disabled opacity 50</span>
      <span class="whitespace-nowrap">disabled has no pointer events</span>
    </template>
  </DemoCard>
  <DemoCard title="input types" class="sm:col-span-2">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>type=text</StateLabel>
      <StateLabel>type=password</StateLabel>
      <StateLabel>type=file</StateLabel>
      <div><Input value="Acme, Inc." /></div>
      <div><Input type="password" value="verysecret" /></div>
      <div><Input type="file" /></div>
    </div>
    <template #footer>
      <span class="whitespace-nowrap">file picker chrome is a per-OS native control</span>
      <span class="whitespace-nowrap">password masking comes from the browser</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Textarea: state matrix

Textarea shares Input's border, focus, and invalid behavior; the only
difference is height. The default theme uses
[`field-sizing-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing)
so the box grows with its content rather than scrolling internally.

Theme key: {@api theme-key:Textarea}. Token surface mirrors Input.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="validation states">
    <div class="flex flex-col gap-1">
      <StateLabel>default</StateLabel>
      <Textarea placeholder="Add a note to the invoice…" />
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>focus-visible</StateLabel>
      <ForceState state="focus" as="block"><Textarea value="Focused for review." /></ForceState>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>invalid</StateLabel>
      <Textarea aria-invalid="true" value="Missing required detail." />
    </div>
    <template #footer>
      <span class="whitespace-nowrap">min-h-16</span>
      <span class="whitespace-nowrap">px-3 py-2</span>
      <span class="whitespace-nowrap">grows with content</span>
    </template>
  </DemoCard>
  <DemoCard title="read modes">
    <div class="flex flex-col gap-1">
      <StateLabel>filled, multi-line</StateLabel>
      <Textarea value="Reconciled against bank feed 2026-04-18. Two entries in the memo column match the ledger on a +1-day offset, investigated and cleared." />
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>disabled</StateLabel>
      <Textarea disabled value="This document has been finalised and cannot be edited." />
    </div>
    <template #footer>
      <span class="whitespace-nowrap">disabled opacity 50</span>
      <span class="whitespace-nowrap">resize disabled (height comes from content)</span>
    </template>
  </DemoCard>
</VuedaDemo>

## NativeSelect: state matrix

NativeSelect wraps a real `<select>` element with a custom chevron icon
overlay so the chrome reads consistently across operating systems. The
chevron sits inside the component template, not the consumer's markup.

Theme keys: {@api theme-key:NativeSelect},
{@api theme-key:NativeSelectOption},
{@api theme-key:NativeSelectOptGroup}. The chevron color reads from
{@api css-token:muted-foreground} at 50% opacity.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="default">
    <div class="flex flex-col gap-1">
      <StateLabel>closed</StateLabel>
      <NativeSelect>
        <NativeSelectOption>Draft</NativeSelectOption>
        <NativeSelectOption>Ready to send</NativeSelectOption>
        <NativeSelectOption>Sent</NativeSelectOption>
        <NativeSelectOption>Paid</NativeSelectOption>
        <NativeSelectOption>Overdue</NativeSelectOption>
      </NativeSelect>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>focus-visible</StateLabel>
      <ForceState state="focus" as="block">
        <NativeSelect>
          <NativeSelectOption>Draft</NativeSelectOption>
          <NativeSelectOption>Sent</NativeSelectOption>
          <NativeSelectOption>Paid</NativeSelectOption>
        </NativeSelect>
      </ForceState>
    </div>
    <template #footer>
      <span class="whitespace-nowrap">px-3 pr-9 (chevron gutter)</span>
      <span class="whitespace-nowrap">chevron <code>--muted-foreground</code>/50</span>
    </template>
  </DemoCard>
  <DemoCard title="with optgroup">
    <NativeSelect>
      <NativeSelectOptGroup label="Sales documents">
        <NativeSelectOption>Invoice</NativeSelectOption>
        <NativeSelectOption>Credit note</NativeSelectOption>
        <NativeSelectOption>Quote</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Purchasing">
        <NativeSelectOption>Purchase order</NativeSelectOption>
        <NativeSelectOption>Receipt</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
    <template #footer>
      <span class="whitespace-nowrap">optgroup label rendering is browser-native</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid">
    <NativeSelect aria-invalid="true">
      <NativeSelectOption>— select —</NativeSelectOption>
      <NativeSelectOption>Net 15</NativeSelectOption>
      <NativeSelectOption>Net 30</NativeSelectOption>
    </NativeSelect>
    <template #footer>
      <span class="whitespace-nowrap">border <code>--destructive</code></span>
    </template>
  </DemoCard>
  <DemoCard title="disabled">
    <NativeSelect disabled>
      <NativeSelectOption>Not available</NativeSelectOption>
    </NativeSelect>
    <template #footer>
      <span class="whitespace-nowrap">wrapper opacity 50 when select disabled</span>
    </template>
  </DemoCard>
</VuedaDemo>

## NumberField: state matrix

NumberField composes an input with paired decrement/increment buttons. The
three sub-components all carry their own theme keys; the wrapper handles
positioning of the steppers inside the input box.

Theme keys: {@api theme-key:NumberField},
{@api theme-key:NumberFieldContent},
{@api theme-key:NumberFieldDecrement},
{@api theme-key:NumberFieldIncrement},
{@api theme-key:NumberFieldInput}. Numerals render as `tabular-nums` so
columns of values stay aligned.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="default">
    <div class="flex flex-col gap-1">
      <StateLabel>resting</StateLabel>
      <NumberField :default-value="42">
        <NumberFieldContent>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldContent>
      </NumberField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>focus-visible</StateLabel>
      <ForceState state="focus" as="block">
        <NumberField :default-value="42">
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </ForceState>
    </div>
    <template #footer>
      <span class="whitespace-nowrap">tabular-nums</span>
      <span class="whitespace-nowrap">text-center</span>
      <span class="whitespace-nowrap">steppers inside the input box</span>
    </template>
  </DemoCard>
  <DemoCard title="at minimum">
    <NumberField :default-value="0" :min="0">
      <NumberFieldContent>
        <NumberFieldDecrement />
        <NumberFieldInput />
        <NumberFieldIncrement />
      </NumberFieldContent>
    </NumberField>
    <template #footer>
      <span class="whitespace-nowrap">decrement opacity 20 when at <code>min</code></span>
    </template>
  </DemoCard>
  <DemoCard title="locale-formatted">
    <NumberField :default-value="1250" :format-options="{ style: 'currency', currency: 'USD' }">
      <NumberFieldContent>
        <NumberFieldDecrement />
        <NumberFieldInput />
        <NumberFieldIncrement />
      </NumberFieldContent>
    </NumberField>
    <template #footer>
      <span class="whitespace-nowrap">formatOptions: <code>{ style: 'currency' }</code></span>
    </template>
  </DemoCard>
  <DemoCard title="disabled">
    <NumberField :default-value="42" disabled>
      <NumberFieldContent>
        <NumberFieldDecrement />
        <NumberFieldInput />
        <NumberFieldIncrement />
      </NumberFieldContent>
    </NumberField>
    <template #footer>
      <span class="whitespace-nowrap">opacity 50 across input and steppers</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Checkbox: state matrix

Checkbox has a tri-state model (unchecked, checked, indeterminate) plus
the standard focus / disabled / invalid axes. The check and minus glyphs
ship as default slot content; consumers can override the indicator slot
to use icon components instead of text glyphs.

Theme key: {@api theme-key:Checkbox}. The body is a 16 × 16 chiclet at
{@api css-token:vueda-checkbox-radius} (4 px), intentionally rounder than
the 2 px slab {@api css-token:vueda-control-radius} so the box reads as a
chit rather than a miniature input next to its label.

<VuedaDemo>
  <DemoCard>
    <div class="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-4 gap-y-2 items-center">
      <div></div>
      <StateLabel>unchecked</StateLabel>
      <StateLabel>checked</StateLabel>
      <StateLabel>indeterminate</StateLabel>
      <StateLabel>default</StateLabel>
      <div><Checkbox /></div>
      <div><Checkbox :default-value="true" /></div>
      <div><Checkbox default-value="indeterminate" /></div>
      <StateLabel>focus</StateLabel>
      <div><ForceState state="focus"><Checkbox /></ForceState></div>
      <div><ForceState state="focus"><Checkbox :default-value="true" /></ForceState></div>
      <div><ForceState state="focus"><Checkbox default-value="indeterminate" /></ForceState></div>
      <StateLabel>disabled</StateLabel>
      <div><Checkbox disabled /></div>
      <div><Checkbox :default-value="true" disabled /></div>
      <div><Checkbox default-value="indeterminate" disabled /></div>
      <StateLabel>invalid</StateLabel>
      <div><Checkbox aria-invalid="true" /></div>
      <div><Checkbox aria-invalid="true" :default-value="true" /></div>
      <div><Checkbox aria-invalid="true" default-value="indeterminate" /></div>
      <StateLabel>invalid + focus</StateLabel>
      <div><ForceState state="focus"><Checkbox aria-invalid="true" /></ForceState></div>
      <div><ForceState state="focus"><Checkbox aria-invalid="true" :default-value="true" /></ForceState></div>
      <div><ForceState state="focus"><Checkbox aria-invalid="true" default-value="indeterminate" /></ForceState></div>
    </div>
    <template #footer>
      <span class="whitespace-nowrap">checked bg <code>--primary</code></span>
      <span class="whitespace-nowrap">checked fg <code>--primary-foreground</code></span>
      <span class="whitespace-nowrap">indeterminate same as checked</span>
      <span class="whitespace-nowrap">focus outline <code>--ring</code></span>
      <span class="whitespace-nowrap">invalid border <code>--destructive</code></span>
      <span class="whitespace-nowrap">invalid + checked bg <code>--destructive</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## RadioGroup: state matrix

RadioGroup is a controlled selection of mutually exclusive items; each
item composes its own per-state appearance from the same scaffolding as
Checkbox. The group itself only contributes layout (gap, orientation).

Theme keys: {@api theme-key:RadioGroup},
{@api theme-key:RadioGroupItem}. The selected dot is a geometric circle
inside the item, not a glyph, so it stays stable across font hydration.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="vertical">
    <RadioGroup default-value="net30">
      <div class="flex items-center gap-2">
        <RadioGroupItem id="terms-15" value="net15" />
        <Label for="terms-15">Net 15</Label>
      </div>
      <div class="flex items-center gap-2">
        <RadioGroupItem id="terms-30" value="net30" />
        <Label for="terms-30">Net 30</Label>
      </div>
      <div class="flex items-center gap-2">
        <RadioGroupItem id="terms-60" value="net60" />
        <Label for="terms-60">Net 60</Label>
      </div>
      <div class="flex items-center gap-2">
        <RadioGroupItem id="terms-receipt" value="receipt" />
        <Label for="terms-receipt">Due on receipt</Label>
      </div>
    </RadioGroup>
    <template #footer>
      <span class="whitespace-nowrap">selected dot <code>--primary</code></span>
      <span class="whitespace-nowrap">border <code>--input</code></span>
    </template>
  </DemoCard>
  <DemoCard title="horizontal">
    <RadioGroup default-value="draft" class="flex flex-row gap-5">
      <div class="flex items-center gap-2">
        <RadioGroupItem id="status-draft" value="draft" />
        <Label for="status-draft">Draft</Label>
      </div>
      <div class="flex items-center gap-2">
        <RadioGroupItem id="status-sent" value="sent" />
        <Label for="status-sent">Sent</Label>
      </div>
      <div class="flex items-center gap-2">
        <RadioGroupItem id="status-paid" value="paid" />
        <Label for="status-paid">Paid</Label>
      </div>
    </RadioGroup>
    <template #footer>
      <span class="whitespace-nowrap">orientation handled by parent layout</span>
    </template>
  </DemoCard>
  <DemoCard title="item state matrix" class="sm:col-span-2">
    <div class="grid grid-cols-5 gap-x-3 gap-y-1 items-center">
      <StateLabel>unchecked</StateLabel>
      <StateLabel>checked</StateLabel>
      <StateLabel>focus</StateLabel>
      <StateLabel>disabled</StateLabel>
      <StateLabel>invalid</StateLabel>
      <div><RadioGroup><RadioGroupItem value="a" /></RadioGroup></div>
      <div><RadioGroup default-value="a"><RadioGroupItem value="a" /></RadioGroup></div>
      <div><ForceState state="focus"><RadioGroup><RadioGroupItem value="a" /></RadioGroup></ForceState></div>
      <div><RadioGroup><RadioGroupItem value="a" disabled /></RadioGroup></div>
      <div><RadioGroup><RadioGroupItem value="a" aria-invalid="true" /></RadioGroup></div>
    </div>
    <template #footer>
      <span class="whitespace-nowrap">focus outline <code>--ring</code></span>
      <span class="whitespace-nowrap">invalid border <code>--destructive</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## TagsInput: composition matrix

TagsInput is a chip container with a trailing input. The composition
axis is _content_ (with chips, empty, full to invalid, disabled across
the whole field). Per-chip focus is shown via `data-state="active"` on
the item; a focused chip gets the same outline ring as the focused
container, just scoped to the chip.

Theme keys: {@api theme-key:TagsInput},
{@api theme-key:TagsInputItem},
{@api theme-key:TagsInputItemText},
{@api theme-key:TagsInputItemDelete},
{@api theme-key:TagsInputInput}. Chips read at
{@api css-token:vueda-chip-height} (20 px), the fourth step of the
control-height ladder below sm.

<VuedaDemo class="grid gap-6">
  <DemoCard title="with chips">
    <TagsInput :default-value="['accounts-receivable', 'q2-2026', 'overdue']">
      <TagsInputItem v-for="tag in ['accounts-receivable', 'q2-2026', 'overdue']" :key="tag" :value="tag">
        <TagsInputItemText />
        <TagsInputItemDelete />
      </TagsInputItem>
      <TagsInputInput placeholder="Add tag…" />
    </TagsInput>
    <template #footer>
      <span class="whitespace-nowrap">gap-2 between chips</span>
      <span class="whitespace-nowrap">item bg <code>--secondary</code></span>
      <span class="whitespace-nowrap">active chip outline <code>--ring</code></span>
    </template>
  </DemoCard>
  <DemoCard title="empty">
    <TagsInput>
      <TagsInputInput placeholder="Type and press Enter to add" />
    </TagsInput>
    <template #footer>
      <span class="whitespace-nowrap">container reads as a single input until chips arrive</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid">
    <TagsInput :default-value="['one', 'two', 'three']" aria-invalid="true">
      <TagsInputItem v-for="tag in ['one', 'two', 'three']" :key="tag" :value="tag">
        <TagsInputItemText />
        <TagsInputItemDelete />
      </TagsInputItem>
      <TagsInputInput placeholder="Max 3 reached" disabled />
    </TagsInput>
    <template #footer>
      <span class="whitespace-nowrap">container border <code>--destructive</code></span>
    </template>
  </DemoCard>
  <DemoCard title="disabled">
    <TagsInput :default-value="['archived', 'read-only']" disabled>
      <TagsInputItem v-for="tag in ['archived', 'read-only']" :key="tag" :value="tag">
        <TagsInputItemText />
        <TagsInputItemDelete />
      </TagsInputItem>
      <TagsInputInput />
    </TagsInput>
    <template #footer>
      <span class="whitespace-nowrap">opacity 50 across container, chips, delete buttons</span>
    </template>
  </DemoCard>
</VuedaDemo>

## InputOTP: composition matrix

InputOTP composes a row of single-character slots, optionally separated
into groups by a glyph. The interesting axis is _composition_ (single
group, multiple groups with separator) and _state_ (resting, partially
filled, invalid, disabled). The active slot's caret animation reads from
the `--animate-caret-blink` token, which drives the `caret-blink`
keyframes inlined at the base layer.

Theme keys: {@api theme-key:InputOTP},
{@api theme-key:InputOTPGroup},
{@api theme-key:InputOTPSlot}. Slots compose into the same border /
focus surface as Input, with adjacent slots sharing seams via
`first:rounded-l-md` / `last:rounded-r-md` rules.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="6-digit, fresh">
    <InputOTP :maxlength="6">
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span class="whitespace-nowrap">first slot becomes active when the field is focused</span>
    </template>
  </DemoCard>
  <DemoCard title="partially filled">
    <InputOTP :maxlength="6" default-value="294">
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span class="whitespace-nowrap">filled slots show the entered digit</span>
      <span class="whitespace-nowrap">empty slots stay blank</span>
    </template>
  </DemoCard>
  <DemoCard title="grouped with separator">
    <InputOTP :maxlength="6" default-value="81502">
      <InputOTPGroup>
        <InputOTPSlot :index="0" />
        <InputOTPSlot :index="1" />
        <InputOTPSlot :index="2" />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot :index="3" />
        <InputOTPSlot :index="4" />
        <InputOTPSlot :index="5" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span class="whitespace-nowrap">separator is a typographic glyph, not a control</span>
    </template>
  </DemoCard>
  <DemoCard title="complete, invalid">
    <InputOTP :maxlength="6" default-value="999999" aria-invalid="true">
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span class="whitespace-nowrap">slot border <code>--destructive</code></span>
    </template>
  </DemoCard>
  <DemoCard title="disabled" class="sm:col-span-2">
    <InputOTP :maxlength="4" disabled>
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span class="whitespace-nowrap">opacity 50 across all slots</span>
      <span class="whitespace-nowrap">no caret on disabled slot</span>
    </template>
  </DemoCard>
</VuedaDemo>
