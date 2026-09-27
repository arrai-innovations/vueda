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
import Slider from "@vueda/controls/slider/Slider.vue";
import InputGroup from "@vueda/controls/input-group/InputGroup.vue";
import InputGroupAddon from "@vueda/controls/input-group/InputGroupAddon.vue";
import InputGroupButton from "@vueda/controls/input-group/InputGroupButton.vue";
import InputGroupInput from "@vueda/controls/input-group/InputGroupInput.vue";
import InputGroupText from "@vueda/controls/input-group/InputGroupText.vue";
import InputGroupTextarea from "@vueda/controls/input-group/InputGroupTextarea.vue";
import FileUpload from "@vueda/controls/file-upload/FileUpload.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faClock, faMagnifyingGlass, faPercent } from "@fortawesome/free-solid-svg-icons";
import { ref } from "vue";

const sliderSingle = ref([40]);
const sliderRange = ref([20, 70]);
const uploadFile = ref(null);
const uploadDropFile = ref(null);
</script>

# Inputs

This page shows the {@term Visual Contract} of the text-entry, selection, and
toggle controls: labels, text inputs, selects, number fields, checkboxes, radio
groups, tags inputs, one-time code inputs, sliders, input groups, and file
pickers. [Components](index.md) describes the rules every component page
shares.

## Input shell

The input shell is the field treatment shared by {@api vue:component:Input},
{@api vue:component:Textarea}, {@api vue:component:NativeSelect},
{@api vue:component:NumberFieldInput}, {@api vue:component:TagsInput}, and
{@api vue:component:InputGroup}. The select trigger on
[Selection + Command](selection-and-command.md) and the fields on
[Date + Time](datetime.md) use it too. A re-skin keeps these states distinct
wherever a control has them:

- **Rest:** a filled field with a bottom edge line. Hover steps the fill.
- **Focus:** the edge line takes the focus color, and a focus ring surrounds
  the whole field.
- **Warning:** a field marked `data-warning="true"` and not invalid shows its
  edge line in the warning color.
- **Invalid:** `aria-invalid="true"` shows the edge line and the focus ring in
  the destructive color.
- **Read-only:** the fill drops away and the line softens, so the field reads
  as displayed text.
- **Disabled:** a disabled fill, edge, and text color at full opacity. The
  value stays readable, and the field takes no pointer input.

Every shell sits on the control height scale. {@api theme-key:Input.root} is
the reference recipe. Current values: {@api css-token:field},
{@api css-token:field-hover}, {@api css-token:field-line},
{@api css-token:ring}, {@api css-token:warning}, {@api css-token:destructive},
{@api css-token:border}, {@api css-token:disabled},
{@api css-token:disabled-foreground}, {@api css-token:vueda-control-height},
and {@api css-token:vueda-field-radius}.

## Label

{@api vue:component:Label} is the text paired with a control. It holds text
alone or text with an icon. When its control is disabled, the label dims with
it; {@api theme-key:Label.root} lists the markup arrangements it detects.

Theme key: {@api theme-key:Label}.

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
  </DemoCard>
  <DemoCard title="paired with disabled input">
    <div class="flex flex-col gap-2">
      <Label for="lbl-peer" class="peer-disabled:opacity-50">Legacy ID</Label>
      <Input id="lbl-peer" class="peer" disabled placeholder="—" />
    </div>
  </DemoCard>
</VuedaDemo>

## Input

`Input` is the single-line text field and uses the [input shell](#input-shell).
Its states combine validation (default, invalid) with the read mode (editable,
read-only, disabled). The `type` attribute passes to the native element, so the
browser draws the password mask and the file picker button.

Theme key: {@api theme-key:Input}.

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
      <span>invalid keeps its destructive edge with or without focus</span>
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
      <span>read-only reads as displayed text</span>
      <span>disabled keeps the value readable</span>
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
      <span>file picker chrome is a per-OS native control</span>
      <span>password masking comes from the browser</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Textarea

`Textarea` is the multi-line text field and uses the
[input shell](#input-shell). Its height grows with its content.

Theme key: {@api theme-key:Textarea}.

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
      <span>grows with content</span>
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
  </DemoCard>
</VuedaDemo>

## NativeSelect

`NativeSelect` renders a native `<select>` in the [input shell](#input-shell)
and draws its own chevron, so the closed control looks the same on every
operating system. The value never runs under the chevron. The browser draws the
open option list, including {@api vue:component:NativeSelectOptGroup} labels.
A native select has no read-only state.

Theme keys: {@api theme-key:NativeSelect},
{@api theme-key:NativeSelectOption},
{@api theme-key:NativeSelectOptGroup}.

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
      <span>the value stops short of the chevron</span>
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
      <span>optgroup label rendering is browser-native</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid">
    <NativeSelect aria-invalid="true">
      <NativeSelectOption>Select terms</NativeSelectOption>
      <NativeSelectOption>Net 15</NativeSelectOption>
      <NativeSelectOption>Net 30</NativeSelectOption>
    </NativeSelect>
  </DemoCard>
  <DemoCard title="disabled">
    <NativeSelect disabled>
      <NativeSelectOption>Not available</NativeSelectOption>
    </NativeSelect>
  </DemoCard>
</VuedaDemo>

## NumberField

{@api vue:component:NumberField} pairs a `NumberFieldInput` with optional
{@api vue:component:NumberFieldDecrement} and
{@api vue:component:NumberFieldIncrement} steppers inside
{@api vue:component:NumberFieldContent}. The input uses the
[input shell](#input-shell), and the steppers sit inside its edge on either
side of the value. The value sits centered in fixed-width numerals, so its
width stays stable while it steps. A stepper dims when the value reaches
[`min`]{@api vue:component:NumberField:prop:min} or
[`max`]{@api vue:component:NumberField:prop:max}.
[`formatOptions`]{@api vue:component:NumberField:prop:formatOptions} formats
the displayed value for the locale.

Theme keys: {@api theme-key:NumberField},
{@api theme-key:NumberFieldContent},
{@api theme-key:NumberFieldDecrement},
{@api theme-key:NumberFieldIncrement},
{@api theme-key:NumberFieldInput}.

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
      <span>steppers inside the input edge</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid">
    <div class="flex flex-col gap-1">
      <StateLabel>invalid value</StateLabel>
      <NumberField :default-value="42">
        <NumberFieldContent>
          <NumberFieldDecrement />
          <NumberFieldInput aria-invalid="true" aria-label="Invalid number" />
          <NumberFieldIncrement />
        </NumberFieldContent>
      </NumberField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>empty and invalid</StateLabel>
      <NumberField>
        <NumberFieldContent>
          <NumberFieldDecrement />
          <NumberFieldInput aria-invalid="true" aria-label="Empty invalid number" />
          <NumberFieldIncrement />
        </NumberFieldContent>
      </NumberField>
    </div>
    <template #footer>
      <span>invalid shows at rest and while focused</span>
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
      <span>the decrement stepper dims at <code>min</code></span>
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
      <span>formatOptions: <code>{ style: 'currency' }</code></span>
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
  </DemoCard>
</VuedaDemo>

## Checkbox

{@api vue:component:Checkbox} has three values: unchecked, checked, and
indeterminate. Checked and indeterminate share one solid fill. The check and
indeterminate marks come from the {@term Icon Registry}, and the
[default slot]{@api vue:component:Checkbox:slot:default} replaces them. The box
corner is rounder than the field corner, so the box reads as a separate kind of
control from the text fields beside it.

Focus shows a focus ring. Invalid shows the destructive color on the edge, and
on the fill of a checked or indeterminate box. A disabled box keeps its mark
and uses the disabled fill, edge, and mark color at full opacity. Disabled
colors take precedence over invalid colors.

Theme key: {@api theme-key:Checkbox}. Current values:
{@api css-token:vueda-checkbox-radius}, {@api css-token:primary},
{@api css-token:destructive}, {@api css-token:disabled}, and
{@api css-token:disabled-foreground}.

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
      <StateLabel>disabled + invalid</StateLabel>
      <div><Checkbox disabled aria-invalid="true" /></div>
      <div><Checkbox :default-value="true" disabled aria-invalid="true" /></div>
      <div><Checkbox default-value="indeterminate" disabled aria-invalid="true" /></div>
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
      <span>indeterminate uses the checked fill</span>
      <span>invalid recolors the fill of a checked box</span>
    </template>
  </DemoCard>
</VuedaDemo>

## RadioGroup

{@api vue:component:RadioGroup} holds mutually exclusive
{@api vue:component:RadioGroupItem} choices. Each item matches the checkbox in
size and in its focus, invalid, and disabled treatments. The selected mark is
a drawn dot in the item's selection color; invalid turns the dot destructive.
The group only lays out its items.

A disabled item keeps its dot visible. A disabled group applies the disabled
treatment to every item.

Theme keys: {@api theme-key:RadioGroup},
{@api theme-key:RadioGroupItem}.

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
      <span>orientation handled by parent layout</span>
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
  </DemoCard>
  <DemoCard title="disabled group">
    <RadioGroup default-value="selected" disabled class="flex flex-row gap-5">
      <div class="flex items-center gap-2">
        <RadioGroupItem value="selected" aria-label="Disabled selected" />
        <StateLabel>selected</StateLabel>
      </div>
      <div class="flex items-center gap-2">
        <RadioGroupItem value="unselected" aria-label="Disabled unselected" />
        <StateLabel>unselected</StateLabel>
      </div>
    </RadioGroup>
    <template #footer>disabled fill and ink; selection stays visible</template>
  </DemoCard>
</VuedaDemo>

## TagsInput

`TagsInput` is an [input shell](#input-shell) that holds committed
{@api vue:component:TagsInputItem} chips followed by a
{@api vue:component:TagsInputInput} for the next entry. Chips wrap onto new
rows as they accumulate. Each chip holds a {@api vue:component:TagsInputItemText}
and a {@api vue:component:TagsInputItemDelete} button. Only one focus ring
shows at a time: the field's while you type, or a chip's when a chip has
focus.

Theme keys: {@api theme-key:TagsInput},
{@api theme-key:TagsInputItem},
{@api theme-key:TagsInputItemText},
{@api theme-key:TagsInputItemDelete},
{@api theme-key:TagsInputInput}. Chip height:
{@api css-token:vueda-chip-height}.

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
      <span>a focused chip shows its own focus ring</span>
    </template>
  </DemoCard>
  <DemoCard title="empty">
    <TagsInput>
      <TagsInputInput placeholder="Type and press Enter to add" />
    </TagsInput>
    <template #footer>
      <span>container reads as a single input until chips arrive</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid">
    <TagsInput :default-value="['one', 'two', 'three']" aria-invalid="true">
      <TagsInputItem v-for="tag in ['one', 'two', 'three']" :key="tag" :value="tag">
        <TagsInputItemText />
        <TagsInputItemDelete />
      </TagsInputItem>
      <TagsInputInput placeholder="Edit tags" aria-label="Invalid tags" />
    </TagsInput>
    <template #footer>
      <span><code>aria-invalid="true"</code>: the field edge and focus ring use the destructive color</span>
    </template>
  </DemoCard>
  <DemoCard title="explicitly valid">
    <TagsInput :default-value="['reviewed']" aria-invalid="false">
      <TagsInputItem value="reviewed">
        <TagsInputItemText />
        <TagsInputItemDelete />
      </TagsInputItem>
      <TagsInputInput placeholder="Add tag…" aria-label="Valid tags" />
    </TagsInput>
    <template #footer>
      <span><code>aria-invalid="false"</code>: the focus edge and ring use the normal focus color</span>
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
  </DemoCard>
</VuedaDemo>

## InputOTP

{@api vue:component:InputOTP} shows a one-time code as a row of
{@api vue:component:InputOTPSlot} cells, one character each. An
{@api vue:component:InputOTPGroup} joins adjacent slots so they share one edge
and read as one field. An {@api vue:component:InputOTPSeparator} between groups
is decorative. The active slot shows a blinking caret.

Set `aria-invalid="true"` on `InputOTP` to give every slot a destructive edge.
The focus ring follows the active slot, including across separated groups, and
uses the destructive color while invalid. Disabled takes precedence: disabled
slots use the disabled fill, text, and edge colors at full opacity. Filled
slots keep their characters and empty slots stay blank.

In a form, the {@api vue:component:WidgetOTPInput} {@term Widget} renders this
control.

Theme keys: {@api theme-key:InputOTP},
{@api theme-key:InputOTPGroup},
{@api theme-key:InputOTPSlot}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="6-digit, fresh">
    <InputOTP :maxlength="6">
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span>first slot becomes active when the field is focused</span>
    </template>
  </DemoCard>
  <DemoCard title="partially filled">
    <InputOTP :maxlength="6" default-value="294">
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span>filled slots show the entered digit</span>
      <span>empty slots stay blank</span>
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
      <span>the separator is decorative and takes no input</span>
    </template>
  </DemoCard>
  <DemoCard title="complete, invalid">
    <InputOTP :maxlength="6" default-value="999999" aria-invalid="true">
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span>every slot shows the destructive edge</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled">
    <InputOTP :maxlength="4" default-value="29" disabled>
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span>disabled fill and ink preserve entered digits</span>
      <span>no caret on disabled slot</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled, invalid">
    <InputOTP :maxlength="4" default-value="29" disabled aria-invalid="true">
      <InputOTPGroup>
        <InputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </InputOTPGroup>
    </InputOTP>
    <template #footer>
      <span>disabled edges take precedence over invalid state</span>
      <span>no focus ring</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Slider

{@api vue:component:Slider} is a track with one or more draggable thumbs. Its
[`modelValue`]{@api vue:component:Slider:prop:modelValue} is an **array** of
numbers, and each entry renders one thumb, so one component covers a single
value and a range. The filled range runs from the track start to a single
thumb, or between two thumbs.

[`step`]{@api vue:component:Slider:prop:step} quantizes the value, and
[`minStepsBetweenThumbs`]{@api vue:component:Slider:prop:minStepsBetweenThumbs}
keeps two thumbs apart. The slider emits its value on every change while a
thumb moves and does not debounce.
[`orientation`]{@api vue:component:Slider:prop:orientation} set to `vertical`
turns the track upright.

A disabled slider keeps its thumb positions and selected span visible, using
disabled colors at full opacity in either orientation.

Theme keys: {@api theme-key:Slider}. Current values:
{@api css-token:primary} (range), {@api css-token:muted} (track),
{@api css-token:ring} (thumb focus), {@api css-token:disabled}, and
{@api css-token:disabled-foreground}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="single value">
    <ClientOnly>
      <div class="flex flex-col gap-3">
        <Slider v-model="sliderSingle" :max="100" :min="0" :step="1" />
        <span class="font-mono text-xs text-muted-foreground">v-model: [{{ sliderSingle.join(", ") }}]</span>
      </div>
    </ClientOnly>
    <template #footer>
      <span>one array entry, one thumb; the fill runs from the track start to the thumb</span>
      <span>drag the thumb or focus it and use the arrow keys</span>
    </template>
  </DemoCard>
  <DemoCard title="range" description=" (two thumbs)">
    <ClientOnly>
      <div class="flex flex-col gap-3">
        <Slider v-model="sliderRange" :max="100" :min="0" :min-steps-between-thumbs="5" :step="5" />
        <span class="font-mono text-xs text-muted-foreground">v-model: [{{ sliderRange.join(", ") }}]</span>
      </div>
    </ClientOnly>
    <template #footer>
      <span>two entries, two thumbs; the fill spans between them</span>
      <span><code>:step="5"</code> quantises, and <code>:min-steps-between-thumbs="5"</code> keeps them from crossing</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled">
    <ClientOnly>
      <Slider disabled :default-value="[60]" :max="100" />
    </ClientOnly>
    <template #footer>
      <span>disabled track, range, and thumb colors preserve the value without fading the control</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled range">
    <ClientOnly>
      <Slider disabled :default-value="[25, 75]" :max="100" />
    </ClientOnly>
    <template #footer>both thumb positions and the selected span remain visible</template>
  </DemoCard>
  <DemoCard title="vertical" description=" (orientation)">
    <ClientOnly>
      <div class="flex h-40 justify-center">
        <Slider orientation="vertical" :default-value="[35]" :max="100" />
      </div>
    </ClientOnly>
    <template #footer>
      <span><code>orientation="vertical"</code> swaps the track axis; the host has to give it a height</span>
    </template>
  </DemoCard>
</VuedaDemo>

## InputGroup

`InputGroup` joins addons to one control so the group reads as a single field.
The group draws the [input shell](#input-shell), including the edge, focus
ring, and invalid state, and the inner control draws no shell of its own. Put
an {@api vue:component:InputGroupInput} or
{@api vue:component:InputGroupTextarea} inside, then any number of
{@api vue:component:InputGroupAddon} elements around it.

[`align`]{@api vue:component:InputGroupAddon:prop:align} places an addon.
`inline-start` (the default) and `inline-end` sit beside the control on the
same row; `block-start` and `block-end` sit above and below it. An addon holds
any content. Two ready pieces ship with the family:
{@api vue:component:InputGroupText} for static labels, prefixes, and units, and
{@api vue:component:InputGroupButton} for an action. `InputGroupButton`
defaults to a `ghost` [emphasis]{@term Tone and Emphasis} at `xs`
[size]{@api vue:component:InputGroupButton:prop:size}, so it fits the row.

Theme keys: {@api theme-key:InputGroup}, {@api theme-key:InputGroupAddon},
{@api theme-key:InputGroupInput}, {@api theme-key:InputGroupText},
{@api theme-key:InputGroupButton}, {@api theme-key:InputGroupTextarea}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="text prefix" description=" (inline-start)">
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
    <template #footer>
      <span>the prefix reads as part of the value, so the reader does not retype it</span>
      <span>the group draws one border and one focus ring around both parts</span>
    </template>
  </DemoCard>
  <DemoCard title="unit suffix" description=" (inline-end)">
    <InputGroup>
      <InputGroupInput placeholder="0" inputmode="decimal" />
      <InputGroupAddon align="inline-end">
        <InputGroupText><FontAwesomeIcon :icon="faPercent" /></InputGroupText>
      </InputGroupAddon>
    </InputGroup>
    <template #footer>
      <span>a unit belongs in an addon rather than the placeholder, so it stays visible once a value is typed</span>
    </template>
  </DemoCard>
  <DemoCard title="icon and button" description=" (both inline edges)">
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <FontAwesomeIcon :icon="faMagnifyingGlass" class="size-4 text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search invoices" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton tone="primary" emphasis="fill">Search</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
    <template #footer>
      <span>an addon takes arbitrary content; the icon here is not an <code>InputGroupText</code></span>
      <span><code>InputGroupButton</code> defaults to a ghost <code>xs</code> button; this one opts into a filled primary</span>
    </template>
  </DemoCard>
  <DemoCard title="textarea with a block addon" description=" (block-end)">
    <InputGroup>
      <InputGroupTextarea placeholder="Add a note for the reviewer" rows="3" />
      <InputGroupAddon align="block-end">
        <InputGroupText>Markdown supported</InputGroupText>
        <InputGroupButton>Attach</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
    <template #footer>
      <span><code>block-end</code> puts the addon on its own row under the control, inside the same border</span>
      <span>one addon can hold several children; they lay out along the row</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid group with prefix">
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput model-value="invalid address" aria-invalid="true" aria-label="Invalid address" />
    </InputGroup>
    <template #footer>
      <span>The group owns the error edge and focus ring; the input draws no inner border.</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid textarea with block addon">
    <InputGroup>
      <InputGroupTextarea model-value="Incomplete note" aria-invalid="true" aria-label="Invalid note" />
      <InputGroupAddon align="block-end">
        <InputGroupText>Markdown supported</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
    <template #footer>
      <span>One error edge encloses the textarea and addon, including when the textarea loses focus.</span>
    </template>
  </DemoCard>
</VuedaDemo>

## FileUpload

{@api vue:component:FileUpload} hides a native file input behind a "Choose
file" trigger and emits the chosen {@api ext:mdn:File} through
[`modelValue`]{@api vue:component:FileUpload:prop:modelValue}.
[`accept`]{@api vue:component:FileUpload:prop:accept} (default `*`) filters
what the picker offers; a dropped file is not checked against it.
[`maxFileSize`]{@api vue:component:FileUpload:prop:maxFileSize} (bytes,
default 1,000,000) drops a larger file without emitting.
[`dropzone`]{@api vue:component:FileUpload:prop:dropzone} adds a drop target
and an "or drag and drop here" line around the trigger.

The component selects a file and sends nothing. `accept` and `maxFileSize` run
only in the browser, so the server must validate file type and size itself.

Theme keys: {@api theme-key:FileUpload}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="default trigger">
    <div class="flex flex-col gap-2">
      <FileUpload v-model="uploadFile" accept=".csv,.tsv" />
      <span class="font-mono text-xs text-muted-foreground">v-model: {{ uploadFile ? uploadFile.name : "null" }}</span>
    </div>
    <template #footer>
      <span>the native input is hidden; the visible trigger opens the browser's own picker</span>
      <span><code>accept=".csv,.tsv"</code> narrows what the picker offers, and the read-out shows the selected <code>File.name</code></span>
      <span>selection is local: this demo has nowhere to send a file and does not try</span>
    </template>
  </DemoCard>
  <DemoCard title="dropzone">
    <div class="flex flex-col gap-2">
      <FileUpload v-model="uploadDropFile" accept="image/*" dropzone :max-file-size="2000000" />
      <span class="font-mono text-xs text-muted-foreground">v-model: {{ uploadDropFile ? uploadDropFile.name : "null" }}</span>
    </div>
    <template #footer>
      <span><code>dropzone</code> adds a drop target and an "or drag and drop here" line; the trigger keeps working for readers who would rather browse</span>
      <span><code>:max-file-size="2000000"</code> raises the 1 MB default to 2 MB, rejecting anything larger before your code sees it</span>
    </template>
  </DemoCard>
</VuedaDemo>
