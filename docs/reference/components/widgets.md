---
title: Form Widgets
status: draft
audience: designer
type: reference
---

<script setup>
import { SHOWCASE_FIELD_TYPES } from "../../.vitepress/theme/fixtures/showcaseFieldTypes.js";
</script>

# Form Widgets

A widget is the control a generated form renders for one model field. The
[Inputs](/reference/components/inputs) and
[Date + Time](/reference/components/datetime) pages show the primitives a widget
is built from; this page shows the widgets themselves, as a real
{@api vue:component:FormModel} renders them.

The difference matters for a re-skin. A primitive is mounted with the props the
demo passes it. A widget is mounted by the form, which supplies its props from
model metadata, so it can carry chrome the primitive demo never shows: a picker
trigger, an add or remove control, a preview, or a fallback for a field type
with no widget of its own.

Every demo below runs against one seeded model whose fields exist to select a
widget. The caption on each names the field type pair that selects it, because
that pair, not the field name, is what decides which widget a form renders.
The mapping lives in `client/lib/utils/fieldMappings.js`.

## Date and time

Four widgets, all built on the segment controls from the
[Date + Time](/reference/components/datetime) page. Each pairs a row of editable
segments with a trigger that opens a calendar or clock popover. The range
widgets render two segment groups and a separator in one shell.

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

## Duration

A duration is stored as one value and entered through one spinner per time unit,
rather than as an interval string. The widget shows minutes only by default; the
`showDays`, `showHours`, and `showSeconds` props add the rest. The spinners carry
an `aria-label` for their unit but print no visible one.

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

## Choice

Choices reach three different widgets. A single choice renders a select, which
the [CRUDL Views](/reference/components/views-crudl) demos already show. The two
below are the cases those demos never reach: a many-valued choice, and a boolean
that carries labels for its two states.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['regions', 'expedited']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Regions: <code>ChoiceField</code> / <code>CharField</code> with <code>many: true</code> selects {@api vue:component:WidgetCombobox} with <code>multiple: true</code>. A relation field selects the same widget, which is why this demo stands in for the picker a foreign key renders</span>
    <span>Handling: <code>BooleanField</code> / <code>BooleanField</code> with <code>choices</code> selects {@api vue:component:WidgetRadioGroup}. The same field without choices selects a toggle instead</span>
    <span>theme keys: {@api theme-key:WidgetCombobox}, {@api theme-key:RadioGroup}</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Structured data

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

## Files and images

Both widgets pair an upload control with a display of what is already stored, so
an empty field and a populated one look different.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['datasheet', 'heroImage']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Datasheet: <code>FileField</code> / <code>FileField</code> selects {@api vue:component:WidgetFile}</span>
    <span>Hero image: <code>ImageField</code> / <code>ImageField</code> selects {@api vue:component:WidgetImage}, which adds a thumbnail of the stored file</span>
    <span>theme keys: {@api theme-key:WidgetFile}, {@api theme-key:WidgetImage}, {@api theme-key:FileUpload}</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Unmapped fallback

When a field's type pair has no widget, the form renders a diagnostic in place
of the control rather than dropping the field, so a missing mapping is visible on
the form instead of silently absent.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <DemoFormModel
    :app="SHOWCASE_FIELD_TYPES.app"
    :model="SHOWCASE_FIELD_TYPES.model"
    :fields="['serverIp']"
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>Server IP: <code>IPAddressField</code> / <code>IPAddressField</code> selects {@api vue:component:WidgetUnmapped}</span>
    <span>an application maps the type to a widget of its own through the model config, or overrides the field with a <code>widget(fieldName)</code> slot</span>
  </footer>
</VuedaDemo>
</ClientOnly>
