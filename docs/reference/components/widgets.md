---
title: Form Widgets
status: draft
audience: designer
type: reference
---

<script setup>
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import WidgetDuration from "@vueda/widgets/WidgetDuration.vue";
import WidgetTimeRangeField from "@vueda/widgets/WidgetTimeRangeField.vue";
import { ref } from "vue";
import { SHOWCASE_FIELD_TYPES } from "../../.vitepress/theme/fixtures/showcaseFieldTypes.js";

const duration = ref({ days: 1, hours: 2, minutes: 30, seconds: 0 });
</script>

# Form Widgets

A {@term Widget} is the input that a generated form renders for one field. This page
shows each widget as {@api vue:component:FormModel} renders it. A widget can
carry chrome that its primitive lacks: a picker trigger, a remove control, a preview,
or a notice in place of an input. The [Inputs](/reference/components/inputs) and
[Date + Time](/reference/components/datetime) pages show the primitives that
the widgets use. [Components](/reference/components/) describes the skin rules
that every component page shares.

Every demo runs against one seeded model with one field per widget. The caption
under each demo names the field's
[`typeSerializer`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeSerializer}
and
[`typeModel`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeModel}
pair, which selects the widget through the
[type mapping tables]{@api js:module:@arrai-innovations/vueda/utils/fieldMappings}.
[Field and Widget Resolution](/core-concepts/contract-first-dynamic-ui#field-and-widget-resolution)
describes the lookup.

## Date and time

Four widgets cover date and time fields. The date widgets show editable segments
and a trigger that opens a calendar. The time widgets show editable segments
only. Each range widget shows both bounds on one row.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['releaseDate', 'publishedAt', 'campaignWindow', 'opensAt', 'serviceWindow']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Release date: <code>DateField</code> / <code>DateField</code> selects {@api vue:component:WidgetDateField} at day granularity</span>
    <span>Published at: <code>DateTimeField</code> / <code>DateTimeField</code> selects the same widget with <code>granularity: "minute"</code>, so it adds time segments</span>
    <span>Campaign window: <code>RangeField</code> / <code>DateRangeField</code> selects {@api vue:component:WidgetDateRangeField}</span>
    <span>Opens at: <code>TimeField</code> / <code>TimeField</code> selects {@api vue:component:WidgetTimeField}</span>
    <span>Service window: <code>RangeField</code> / <code>TimeRangeField</code> selects {@api vue:component:WidgetTimeRangeField}</span>
    <span>theme keys: {@api theme-key:WidgetDateField}, {@api theme-key:WidgetDateRangeField}, {@api theme-key:DateField}, {@api theme-key:DateFieldInput}</span>
  </footer>
</VuedaDemo>
</ClientOnly>

A time range with an error marks both bounds invalid.

<VuedaDemo>
  <DemoCard title="Time range: invalid">
    <WidgetTimeRangeField :model-value="{ lower: '17:00:00', upper: '09:00:00' }" invalid />
    <FieldMessage :messages="['End time must be later than start time.']" />
    <template #footer>
      <span>This specimen sets <code>invalid</code> directly; both bounds show the invalid state.</span>
    </template>
  </DemoCard>
</VuedaDemo>

### Read-only dates

A read view, a computed field, or a read-only model config renders a field
without its input. Date, time, and datetime fields then render with
{@api vue:component:WidgetDateTimeReadOnly}, which formats the value. Its display
options come from the mapping entry's
[`readOnlyWidgetProps`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#FieldMappingEntry.readOnlyWidgetProps}.
They match the
[`columnProps`]{@api js:property:@arrai-innovations/vueda/utils/columnMappings#ColumnMappingEntry.columnProps}
of the list column for the same type, so a field reads the same in a list and on
a read view. An empty date renders the same dash in both.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    view="read"
    view-theme="ViewRead"
    :fields="['releaseDate', 'publishedAt', 'opensAt']"
    :initial-values="{ releaseDate: '2026-06-01', publishedAt: '2026-08-25T17:21:56.906248Z', opensAt: '09:30:00' }"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Release date: <code>showTime: false</code>, so the time is left off</span>
    <span>Published at: <code>showTime: true</code>, with the relative time on hover</span>
    <span>Opens at: <code>format: "t"</code>, and no relative text, which would reference today and mislead</span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    view="read"
    view-theme="ViewRead"
    :fields="['releaseDate', 'publishedAt']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>empty dates render the {@api theme-key:DateTimeDisplay} <code>dash</code> slot, matching a list cell</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Duration

{@api vue:component:WidgetDuration} enters a duration through one spinner per
time unit. Only [`showMinutes`]{@api vue:component:WidgetDuration:prop:showMinutes}
defaults to true;
[`showDays`]{@api vue:component:WidgetDuration:prop:showDays},
[`showHours`]{@api vue:component:WidgetDuration:prop:showHours}, and
[`showSeconds`]{@api vue:component:WidgetDuration:prop:showSeconds} add the other
units. Each spinner has a visible unit label, and clicking the label focuses its
input. The {@api theme-key:WidgetDuration.unitLabel} slot styles the labels.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['leadTime']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Lead time: <code>DurationField</code> / <code>DurationField</code> selects {@api vue:component:WidgetDuration}</span>
    <span>a <code>DurationSecondsField</code> serializer selects the same widget with <code>unit: "minutes"</code></span>
    <span>one spinner here, because only <code>showMinutes</code> defaults to true</span>
    <span>theme key: {@api theme-key:WidgetDuration}</span>
  </footer>
</VuedaDemo>
</ClientOnly>

<VuedaDemo>
  <DemoCard title="All duration units">
    <WidgetDuration v-model="duration" show-days show-hours show-seconds />
    <template #footer>
      <span>Each enabled unit has its own label and input.</span>
    </template>
  </DemoCard>
</VuedaDemo>

### Read-only durations

Read-only duration fields render with
{@api vue:component:WidgetDurationReadOnly}, which names the units that the
value holds. A `DurationField` sends `2 08:00:00`, and the read row shows "2 days, 8
hours". A `DurationSecondsField` sends a number of seconds, which the same widget
reads. Units that hold zero are left out, and a duration of zero names its
smallest unit ("0 seconds"). An empty value renders the same dash as an empty
date. A list cell uses {@api vue:component:ColumnDuration}, which wraps the same
display, so a field reads the same in both places.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    view="read"
    view-theme="ViewRead"
    :fields="['leadTime']"
    :initial-values="{ leadTime: '2 08:00:00' }"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Lead time: the stored <code>2 08:00:00</code> reads as named units, and the zero minutes and seconds are left out</span>
    <span>a duration of zero still names its smallest unit, because a recorded zero differs from no value</span>
    <span>theme key: {@api theme-key:DurationDisplay}, whose <code>dash</code> slot holds the empty value</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Choice

A single choice renders {@api vue:component:WidgetSelectDropdown}. The demo
below shows the other two choice widgets: a many-valued choice, and a boolean
with labels for its two states.

`WidgetSelectDropdown` treats empty-string, `null`, and `undefined` choices as no
selection and leaves them out of the menu. Without a
[`placeholder`]{@api vue:component:WidgetSelectDropdown:prop:placeholder}, it uses
the first empty choice's label as the placeholder. The values `false` and `0` stay
in the menu as ordinary choices. The menu has no empty item, so a user cannot
clear a selection from it.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['regions', 'expedited']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Regions: <code>ChoiceField</code> / <code>CharField</code> with <code>many: true</code> selects {@api vue:component:WidgetCombobox} with <code>multiple: true</code>. A relation field selects the same widget, so this demo also shows the picker a foreign key renders</span>
    <span>Handling: <code>BooleanField</code> / <code>BooleanField</code> with <code>choices</code> selects {@api vue:component:WidgetRadioGroup}. The same field without choices selects {@api vue:component:WidgetToggle}</span>
    <span>theme keys: {@api theme-key:WidgetCombobox}, {@api theme-key:RadioGroup}</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Structured data

{@api vue:component:WidgetJson} edits a `JSON` field as text and submits the
parsed value.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['metadata']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Metadata: <code>JSONField</code> / <code>JSONField</code> selects {@api vue:component:WidgetJson}</span>
    <span>theme key: {@api theme-key:WidgetJson}</span>
  </footer>
</VuedaDemo>
</ClientOnly>

### Read-only JSON

Read-only `JSON` fields render with {@api vue:component:WidgetJsonReadOnly},
which prints the payload over several lines, indented by
[`indent`]{@api vue:component:WidgetJsonReadOnly:prop:indent} spaces per level
(2 by default). A list cell uses {@api vue:component:ColumnJson}, which prints the
same value compact and truncates it past
[`maxLength`]{@api vue:component:ColumnJson:prop:maxLength} characters (200 by
default). Both render a null value as the same dash as an empty date. An empty
object or array is a recorded value, so it reads as `{}` or `[]`.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    view="read"
    view-theme="ViewRead"
    :fields="['metadata']"
    :initial-values="{ metadata: { sku: 'BRG-6204', revision: 3, channels: ['direct', 'partner'] } }"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Metadata: each nesting level is indented, and a long string value wraps inside the row</span>
    <span>theme key: {@api theme-key:JsonDisplay}, whose <code>dash</code> slot holds the empty value</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Files and images

Each widget shows an upload control while the field is empty. Once the field has
a file, {@api vue:component:WidgetFile} shows it as a download link with remove
and download controls, and {@api vue:component:WidgetImage} shows a preview with a
remove control.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['datasheet', 'heroImage']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Datasheet: <code>FileField</code> / <code>FileField</code> selects {@api vue:component:WidgetFile}</span>
    <span>Hero image: <code>ImageField</code> / <code>ImageField</code> selects {@api vue:component:WidgetImage}</span>
    <span>theme keys: {@api theme-key:WidgetFile}, {@api theme-key:WidgetImage}, {@api theme-key:FileUpload}</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Unmapped widget

IP address fields map to {@api vue:component:WidgetUnmapped} by default. It
renders an alert that names the field in place of an input, so the field stays
visible on the form. The alert sits in the field's content column and must not
look like a control.
[Map a Field Type to a Widget](/guides/custom-field-widget-rendering#map-a-field-type-to-a-widget)
describes how to give the type a widget, and the error that a field with no
mapping renders.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['serverIp']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Server IP: <code>IPAddressField</code> / <code>IPAddressField</code> selects {@api vue:component:WidgetUnmapped}</span>
    <span>theme key: {@api theme-key:WidgetUnmapped}</span>
  </footer>
</VuedaDemo>
</ClientOnly>
