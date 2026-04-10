---
title: Customize Field and Widget Rendering
type: how-to
audience: implementor
status: draft
---

# Customize Field and Widget Rendering

This guide covers how to override field and widget rendering for form and filter surfaces without forking core {@term CRUDL} view components. VUEDA provides three override mechanisms (model config, per-instance view props, and slot-level replacement) with a defined precedence order. Custom components must preserve the field/widget contract to remain compatible with VUEDA's form state and validation lifecycle.

The guide assumes familiarity with VUEDA's form concepts. If you have not read [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle), start there. For the server-client metadata contract that drives default field/widget resolution, see [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract).
For the default resolver and override touchpoints, see {@api js:module:@arrai-innovations/vueda/use/useFieldRenderer}. Most cross-view overrides in this guide are keyed by {@term Model Config}.

## Goal and Preconditions

The objective is a custom field or widget rendering that:

- Replaces default rendering for specific fields without modifying core components.
- Preserves form state, validation hooks, touched/focus state, and read-only handling.
- Uses the correct override mechanism for the scope of the change (global model config vs. per-view vs. per-field slot).
- Fails explicitly when misconfigured, rather than silently rendering defaults.

Before you begin:

The model has a canonical registration with working CRUDL views. Override rendering builds on top of the default form infrastructure; verify that default forms render and submit correctly before introducing overrides.

You understand the field/widget distinction. In VUEDA's form architecture, a **field** is the outer container that manages form state, labels, validation messages, and layout. A **widget** is the inner input control that handles user interaction and value adaptation. Overriding a field replaces the entire container; overriding a widget replaces only the input control within the existing field structure.

## Override Surface Selection

Three override surfaces are available, evaluated in precedence order:

**Per-instance view props** take the highest precedence. When a view component passes `fieldComponents`, `widgetComponents`, `fieldProps`, or `widgetProps` as props to `FormModel` or `DetailedView`, those values override any model config settings for that specific view instance.

**Model config** provides portable, model-wide overrides. Setting overrides through `storeModelConfig.setConfig` applies them across all views that use `useModelConfig` for that model. This is the preferred surface for overrides that should be consistent across create, update, and `read` views.

**Type-derived defaults** are the fallback. When no override is specified, form-model resolution selects field and widget components based on the serializer field type and metadata from the server. This is the standard behaviour when no overrides are configured.

Choose the narrowest scope that achieves the goal. For a model-wide override (such as always rendering a specific field as a tabular inline), use model config. For a view-specific override (such as showing a simplified widget only on the `create` form), use per-instance props. For a single-field visual tweak that does not require a different component, use slot overrides.

## Component Registration Strategy

Override entries support three value shapes:

**Direct component references** pass a Vue component object directly. This is the most straightforward approach and provides compile-time verification:

```js
import MyCustomWidget from "./MyCustomWidget.vue";

modelConfigStore.setConfig({ app: "myapp", model: "mymodel" }, { widgetComponents: { status: MyCustomWidget } });
```

**String keys** reference components from the `availableFields` and `availableWidgets` registries. Use this when the target component is already registered in VUEDA's lookup tables:

```js
modelConfigStore.setConfig(
    { app: "myapp", model: "mymodel" },
    {
        fieldComponents: { line_items: "FieldSetTabularInline" },
        widgetComponents: { line_items__status: "WidgetSelectDropdown" },
    },
);
```

**Factory functions** return a component dynamically. Use this for conditional rendering logic that depends on runtime state.

Unknown string keys fail explicitly during form-model resolution. If you reference a string key that is not in the available fields/widgets registry, the error surfaces at form setup time, not silently at render time.

## Custom Component Contract Checklist

Custom components must preserve the field or widget contract to remain compatible with VUEDA's form infrastructure.

**For custom field components**, preserve `FIELD_PROPS` and `FIELD_EMITS` behavior. The standard approach is to use the `useField` composable, which wires form state registration, validation hooks, and label/help/feedback rendering. A custom field that skips `useField` must manually implement the same state management interface, or form submission and validation will not function correctly.

**For custom widget components**, preserve `WIDGET_PROPS` and `WIDGET_EMITS` behavior. Use the `useWidget` composable to handle value adaptation, touch/focus state tracking, and validation flag propagation:

```js
const props = defineProps({
    ...WIDGET_PROPS,
    myDomainProp: { type: Object, default: () => ({}) },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widget = useWidget(props, emit);
```

Spreading `WIDGET_PROPS` and `WIDGET_EMITS` alongside custom props ensures the component receives all standard widget inputs and can emit all standard widget events. The `useWidget` composable manages the standard behaviours; your custom logic extends it without replacing the contract.

When a custom widget renders slot content (labels, help text, validation feedback), pass the incoming slot renderers through. Dropping the slot passthrough removes expected label/help/feedback behaviour from the rendered field.

## Slot Override Patterns

Slot overrides provide per-field rendering customization without replacing the entire component. `FieldRenderer` exposes slot targets for each field:

- `field(<name>)`: replaces the entire field container for the named field.
- `field(<name>)default`: replaces the default content within the field container.
- `widget(<name>)`: replaces the widget for the named field.
- `widget(<name>)default`: replaces the default content within the widget.

For filter rendering, the same slot contract applies with `filter-` prefixes: `filter-widget(<name>)`, `filter-field(<name>)`, etc.

A slot override that wraps the default component while adding behaviour:

```vue
<template #widget(line_items__status)="slotProps">
    <component :is="slotProps.widgetComponent" v-bind="slotProps.widgetProps">
        <template v-for="[slotName, slotRenderer] of slotProps.slots" #[slotName]="innerProps" :key="slotName">
            <component :is="slotRenderer" v-bind="innerProps" />
        </template>
    </component>
</template>
```

This pattern renders the default widget component with all its standard props and slots, while giving you a template scope to add surrounding markup or conditional logic. The slot renderer passthrough (`slotProps.slots`) is important; without it, the widget loses its label, help text, and validation feedback slots.

Slot key format must be exact. `widget(fieldName)` and `widget(fieldName)default` are different targets. `filter-widget(fieldName)` is different from `widget(fieldName)`. Typos or incorrect formats cause the slot override to silently have no effect.

## Expanded Field and Read-Only Edge Cases

Expanded relation fields require specific targeting. The base field of an expanded relation may resolve without a direct widget component; the expanded subfields are the meaningful targets. Use flattened keys with double underscores for subfield targeting:

```js
modelConfigStore.setConfig(
    { app: "myapp", model: "order" },
    {
        widgetComponents: { line_items__amount: MyAmountWidget },
        widgetProps: { line_items__amount: { step: 0.01 } },
    },
);
```

Overriding the base expanded field as if it were a simple widget can silently miss. The base expanded widget may be `null`; target the subfields (`expand__field`) instead.

Read-only view handling and field-level `readOnly` metadata can force read-only widget resolution even when writable widget overrides are present. When a view is in `read` mode, the form infrastructure may select a read-only widget variant even when a writable widget override is configured. Verify override behaviour in both writable and read-only view modes.

When a widget entry is missing or `null` during renderer resolution, `WidgetUnmapped` is rendered and surfaces an explicit UI error. This is a development-time signal that a required widget mapping is absent, not a graceful fallback.

## Verification Checklist

After configuring overrides, verify the following:

- The overridden field/widget renders in create, update, and `read` views as expected.
- Form submission still works, field values are captured and included in the request payload.
- Validation errors for the overridden field are displayed correctly.
- Touch/focus state tracking works, leaving the field triggers validation if configured.
- Read-only mode renders appropriately for the overridden component.
- Filter forms using the same field render with the correct override (or default, if filter overrides are not configured).
- Inline fieldsets with overridden subfields handle row indexing correctly.

## Portable Example Patterns

**Config-level override** for consistent model-wide behavior:

```js
modelConfigStore.setConfig(
    { app: "myapp", model: "mymodel" },
    {
        fieldComponents: { line_items: "FieldSetTabularInline" },
        widgetComponents: { line_items__status: "WidgetSelectDropdown" },
        fieldProps: { line_items: { showCreateButton: false } },
        widgetProps: { line_items__amount: { step: 0.01 } },
    },
    {
        update: {
            expand: ["line_items"],
            displayFields: ["line_items", "line_items__status", "line_items__amount"],
        },
    },
);
```

**Custom widget wrapper** that extends standard behavior:

```js
const props = defineProps({
    ...WIDGET_PROPS,
    myDomainProp: { type: Object, default: () => ({}) },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widget = useWidget(props, emit);
```

## Troubleshooting

**Override has no effect.** Verify the field name matches the form's field path exactly. For expanded subfields, use double-underscore notation (`expand__field`). Check that the override surface has higher precedence than the currently rendering surface. A model config override will not take effect if per-instance props are also set for the same field.

**"Unknown mapping" error at form setup.** A string key passed to `fieldComponents` or `widgetComponents` does not match any entry in `availableFields` or `availableWidgets`. Verify the string key matches a registered component name exactly.

**Widget renders but loses label/help/validation feedback.** The custom component or slot override is not passing through slot renderers. Ensure the template includes the slot passthrough pattern when wrapping the default component.

**`WidgetUnmapped` renders for a field.** The widget resolution could not find a component for this field. Check that the field's serializer type is mapped in `formLookups`, or provide an explicit override.

**Override works in edit mode but not read mode.** Read-only view handling may select a different widget variant. Check that the override is compatible with read-only rendering, or provide separate overrides for read and write modes via per-instance view props.

## Relevant Implementation Surface

- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
    - {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}
    - {@api js:module:@arrai-innovations/vueda/use/useModelConfig}
    - {@api js:module:@arrai-innovations/vueda/use/useFormModel}
    - {@api js:function:@arrai-innovations/vueda/use/useFormModel#useFormModel}
    - {@api js:module:@arrai-innovations/vueda/use/useFieldRenderer}
    - {@api js:function:@arrai-innovations/vueda/use/useFieldRenderer#useFieldRenderer}
    - {@api js:module:@arrai-innovations/vueda/use/useField}
    - {@api js:function:@arrai-innovations/vueda/use/useField#useField}
    - {@api js:module:@arrai-innovations/vueda/use/useWidget}
    - {@api js:function:@arrai-innovations/vueda/use/useWidget#useWidget}
    - {@api js:module:@arrai-innovations/vueda/utils/buildForm}
    - {@api js:module:@arrai-innovations/vueda/utils/formLookups}
- Vue.js Components:
    - {@api vue:component:FormModel}
    - {@api vue:component:FieldRenderer}
    - {@api vue:component:DetailedView}
    - {@api vue:component:FilterForm}
    - {@api vue:component:FieldSetTabularInline}
    - {@api vue:component:WidgetSelectDropdown}
    - {@api vue:component:WidgetUnmapped}
