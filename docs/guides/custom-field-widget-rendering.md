---
title: Customize Field and Widget Rendering
type: how-to
audience: integrator
status: draft
---

# Customize Field and Widget Rendering

This guide shows how to replace the component that VUEDA renders for a form or filter field, change the props that it receives, or write your own. Fields that you leave alone keep their defaults.

[Configuration Precedence](../core-concepts/contract-first-dynamic-ui#configuration-precedence) describes how view props, model config, and the defaults combine, and the cases that do not follow that order.

## Before You Start

- The model has a {@term Canonical Registration} with working CRUD views. Check that its default forms render and submit before you add overrides.
- Each form field renders a {@term Form Field} that wraps a {@term Widget}. Replacing the field component replaces the label, help text, and messages around the input. Replacing the widget replaces only the input.

## Choose Where to Override

| To change                                          | Use                                              |
| -------------------------------------------------- | ------------------------------------------------ |
| One field in every view of a model, or in one view | [Model config](#set-an-override-in-model-config) |
| One field in a view or form you render yourself    | [View or form props](#pass-overrides-as-props)   |
| The markup around one field in one rendered form   | [A slot](#replace-one-field-with-a-slot)         |
| Every field of one type, in every model            | [A type mapping](#map-a-field-type-to-a-widget)  |

## Set an Override in Model Config

1. Get the store with {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}.
2. Call [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} with the model, a generic layer for every view, and optional per-view layers keyed by view name.
3. Key each override by the field name. Use {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.fieldComponents} and {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.widgetComponents} to replace components, and {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.fieldProps} and {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.widgetProps} to add props.

```js
import StatusWidget from "./StatusWidget.vue";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

const modelConfigStore = storeModelConfig();

modelConfigStore.setConfig(
    { app: "myapp", model: "order" },
    {
        widgetProps: { phone: { mask: "###-###-####" } },
    },
    {
        create: { widgetComponents: { status: () => StatusWidget } },
        update: { widgetComponents: { status: "WidgetSelectDropdown" } },
    },
);
```

A component entry takes one of three values:

- **A function that returns a component**, such as `() => StatusWidget`. The store keeps its values in reactive state, and the function keeps the component out of it. VUEDA calls the function with no arguments, so it can read reactive state but receives no field or view context.
- **The name of a built-in component** in {@api js:property:@arrai-innovations/vueda/utils/formLookups#availableFields} or {@api js:property:@arrai-innovations/vueda/utils/formLookups#availableWidgets}, such as `"WidgetSelectDropdown"` for {@api vue:component:WidgetSelectDropdown}.
- **A component object.**

A name that is not in the registry makes that field render an error in place of its input: `No widget component named "X" for field "f" in app "a" model "m"`. The rest of the form still renders.

Filter forms on the list view read `fieldComponents` and `widgetComponents` from the `list` view's model config, keyed by filter name. A generic-layer entry therefore also replaces the filter input of the same name. Put form-only component overrides in the `create` and `update` layers.

## Pass Overrides as Props

When you render a form yourself, pass the same four maps as props. {@api vue:component:FormModel}, {@api vue:component:ViewCreate}, {@api vue:component:ViewUpdate}, and {@api vue:component:DetailView} accept [`fieldComponents`]{@api vue:component:FormModel:prop:fieldComponents}, [`widgetComponents`]{@api vue:component:FormModel:prop:widgetComponents}, [`fieldProps`]{@api vue:component:FormModel:prop:fieldProps}, and [`widgetProps`]{@api vue:component:FormModel:prop:widgetProps}.

```vue
<template>
    <ViewCreate app="myapp" model="order" :widget-components="{ status: 'WidgetSelectDropdown' }" />
</template>
```

For the same field, a prop wins over model config. A prop entry wins even when it is an unknown name: the field renders the error, although model config has a valid entry for it.

{@api vue:component:ViewRead} takes none of these props. Set the `read` layer in model config for the read view.

Model config {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.formProps} can also carry these keys. When it and a view prop set the same key, which one wins depends on the view, as [Configuration Precedence](../core-concepts/contract-first-dynamic-ui#configuration-precedence) describes.

## Target Expanded Fields

An [expanded]{@term Expand} relation renders as an {@term Inline}, and its subfields render inside it. Key overrides for a subfield by its dotted name, `<expand>.<field>`:

```js
modelConfigStore.setConfig(
    { app: "myapp", model: "order" },
    {
        fieldComponents: { line_items: "FieldSetTabularInline" },
        widgetComponents: { "line_items.status": "WidgetSelectDropdown" },
        widgetProps: { "line_items.amount": { step: 0.01 } },
    },
    {
        update: {
            expand: ["line_items"],
            displayFields: ["line_items", "line_items.status", "line_items.amount"],
        },
    },
);
```

The expanded field itself has a field component ({@api vue:component:FieldSetTabularInline} here) and no widget, so a `widgetComponents` entry for `line_items` has no effect. [Build Nested/Inlined Writes](./nested-writable-inlines) describes the inline setup and how the rows save.

## Replace One Field with a Slot

Use a slot when one rendered form needs different markup for one field. Pass the slot to `FormModel`, or to a view, which forwards its slots to the form. Each field renders through {@api vue:component:FieldRenderer}, which offers four slots per field:

- [`field(<name>)`]{@api vue:component:FieldRenderer:slot:field(fieldName)} replaces the field component and everything in it.
- [`field(<name>)default`]{@api vue:component:FieldRenderer:slot:field(fieldName)default} replaces the content inside the field component, which holds the widget.
- [`widget(<name>)`]{@api vue:component:FieldRenderer:slot:widget(fieldName)} replaces the widget.
- [`widget(<name>)default`]{@api vue:component:FieldRenderer:slot:widget(fieldName)default} fills the widget's default slot.

Filter forms use the same names with a `filter-` prefix, such as `filter-widget(status)`. {@api vue:component:ViewList} forwards them to its filter forms.

To change only the label, help text, or messages of a {@api vue:component:FormField}, fill its [`field(<name>)label`]{@api vue:component:FormField:slot:field(fieldName)label}, [`field(<name>)help`]{@api vue:component:FormField:slot:field(fieldName)help}, [`field(<name>)errors`]{@api vue:component:FormField:slot:field(fieldName)errors}, or [`field(<name>)warnings`]{@api vue:component:FormField:slot:field(fieldName)warnings} slot.

This slot wraps the default widget in extra markup:

```vue
<template #widget(line_items.status)="slotProps">
    <div class="status-cell">
        <component :is="slotProps.widgetComponent" v-bind="slotProps.widgetProps">
            <template v-for="[slotName, slotRenderer] of slotProps.slots" #[slotName]="innerProps" :key="slotName">
                <component :is="slotRenderer" v-bind="innerProps" />
            </template>
        </component>
    </div>
</template>
```

`slotProps.slots` holds the other slots that you passed to the form, as `[name, renderer]` pairs. Pass them through, as above, when you render the default component yourself. Without the passthrough, your label, help, message, and named widget slots do not reach the component.

A slot name must match exactly, including the dotted name and the `filter-` prefix. A misspelled slot name is ignored, and the field renders its default.

`FormModel`'s [`fields`]{@api vue:component:FormModel:slot:fields} slot replaces the loop that renders a `FieldRenderer` for each field, and with it the forwarding of the per-field slots above. A per-field slot applies inside a custom `fields` layout only when that layout renders a `FieldRenderer` for the field and forwards the slot to it.

## Write a Custom Widget

A widget spreads {@api js:property:@arrai-innovations/vueda/use/useWidget#WIDGET_PROPS}, declares {@api js:property:@arrai-innovations/vueda/use/useWidget#WIDGET_EMITS}, and calls {@api js:function:@arrai-innovations/vueda/use/useWidget#useWidget}. `useWidget` returns a {@api js:interface:@arrai-innovations/vueda/use/useWidget#WidgetContext} that connects the widget to the field around it: the value, touched and focus state, and validation flags.

```vue
<script setup>
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { inject } from "vue";

defineOptions({ inheritAttrs: false });
const props = defineProps({
    ...WIDGET_PROPS,
    placeholder: { type: String, default: "" },
});
const emit = defineEmits([...WIDGET_EMITS]);
const fieldContext = inject(FieldContextSymbol, null);
const widget = useWidget(props, emit);
</script>

<template>
    <input
        :id="fieldContext?.state.fieldId"
        v-model="widget.state.adaptedValue"
        :name="widget.state.combinedName"
        :placeholder="placeholder"
        :disabled="widget.state.disabled"
        :aria-invalid="widget.state.validationState.invalid || undefined"
        :aria-required="widget.state.required || undefined"
        v-bind="$attrs"
        @blur="widget.blur"
        @focus="widget.focus"
    />
</template>
```

- Bind the value through `widget.state.adaptedValue` or `widget.state.combinedValue`. Writing to either updates the form value.
- Call `widget.blur` and `widget.focus` from the control. Blur marks the field touched.
- Use {@api js:property:@arrai-innovations/vueda/utils/symbols#FieldContextSymbol} for the field's `fieldId`, so the field's label points at your control.

Assign the widget through model config, props, or a type mapping. Your own props, such as `placeholder` here, come from `widgetProps`.

## Write a Custom Field

A field component spreads {@api js:property:@arrai-innovations/vueda/use/useField#FIELD_PROPS}, declares {@api js:property:@arrai-innovations/vueda/use/useField#FIELD_EMITS}, and calls {@api js:function:@arrai-innovations/vueda/use/useField#useField}. `useField` registers the field with the form and returns the {@api js:interface:@arrai-innovations/vueda/use/useField#FieldContext} that the widget reads. `FieldRenderer` puts the widget in the field's default slot.

```vue
<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
    ...FIELD_PROPS,
    hidden: { type: Boolean, default: false },
});
const emit = defineEmits([...FIELD_EMITS]);
const field = useField(props, emit, { showsErrors: () => !props.hidden });
</script>

<template>
    <slot v-if="hidden" />
    <div v-else class="my-field">
        <label :for="field.state.fieldId">{{ field.state.label }}</label>
        <slot />
        <p v-for="(message, code) in field.state.errors" :key="code">{{ message }}</p>
    </div>
</template>
```

`FieldRenderer` passes `hidden` as `true` for fields inside an inline, which render their widget alone. Declare `hidden`, and any other `FormField` prop that your field needs, such as `validation` or `orientation`. An undeclared prop falls through as an HTML attribute. The `showsErrors` option tells the form whether this field shows its own errors; a hidden field leaves them to the form-level summary.

## Map a Field Type to a Widget

The default widget for a field comes from type mapping tables keyed by the field's [`typeSerializer`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeSerializer}, then its [`typeModel`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeModel}. [Field and Widget Resolution](../core-concepts/contract-first-dynamic-ui#field-and-widget-resolution) describes the lookup.

An editable field whose type has no mapping has no widget. That field renders an error in place of its input, `No widget component found for field "f" in app "a" model "m"`, and the rest of the form still renders. Some types map to {@api vue:component:WidgetUnmapped}, which renders a notice in place of an input. By default these are IP address fields.

To give a type a widget in every model, call {@api js:function:@arrai-innovations/vueda/utils/fieldMappings#mergeDefaultFieldMappings} in your client entry, before the app mounts:

```js
import { mergeDefaultFieldMappings } from "@vueda/utils/fieldMappings.js";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";

mergeDefaultFieldMappings({
    IPAddressField: {
        IPAddressField: { widget: WidgetTextInput, default: true },
        GenericIPAddressField: { widget: WidgetTextInput },
    },
});
```

The outer key is the `typeSerializer`, and the inner key is the `typeModel`. The entry marked [`default`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#FieldMappingEntry.default} applies when `typeModel` is empty. An entry can also set [`readOnlyWidget`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#FieldMappingEntry.readOnlyWidget} for read-only rendering, and [`widgetProps`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#FieldMappingEntry.widgetProps} or [`fieldProps`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#FieldMappingEntry.fieldProps}.

## Check the Result

- The field renders as intended in the create, update, and read views.
- A submit sends the field's value.
- Server errors for the field appear beside it.
- Leaving the field marks it touched.
- In an inline, every row's copy of the field renders and saves.
- The list view's filter of the same name renders the input that you intend.

## Troubleshooting

**The override has no effect.** Check that the key matches the field name exactly, with the dotted name for an expanded subfield. A field that renders read-only ignores `widgetComponents`, and a {@term Computed Field} ignores `fieldComponents`; [Exceptions](../core-concepts/contract-first-dynamic-ui#exceptions) describes both and what works instead. A view prop for the same field wins over model config.

**The field shows `No widget component named "X"` or `No field component named "X"`.** The name is not in `availableWidgets` or `availableFields`. Check the spelling, or pass the component through a function.

**The field shows `No widget component found`.** The field's type has no mapping. Add one with `mergeDefaultFieldMappings`, or set a `widgetComponents` entry for the field.

**`WidgetUnmapped` renders for a field.** The field's type maps to it. Map the type to a widget, as in [Map a Field Type to a Widget](#map-a-field-type-to-a-widget).

**A slot override loses your label, help, or message slots.** The slot renders the default component without passing `slotProps.slots` through. Add the passthrough shown in [Replace One Field with a Slot](#replace-one-field-with-a-slot).

**The override works in the update view but not the read view.** The read view renders every field read-only, and a read-only field uses the read-only widget. Replace the field component, fill the `widget(<name>)` slot, or give the type a `readOnlyWidget`.
