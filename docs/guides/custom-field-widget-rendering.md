---
title: Customize Field and Widget Rendering
type: how-to
audience: implementor
status: briefing
---

# Customize Field and Widget Rendering

## Intent and Scope

- Override field/widget rendering for form and filter surfaces without forking core CRUD view components.
- Capture concrete override points and precedence (model config, view/form props, slot-level replacement).
- Keep custom components compatible with VUEDA form contracts (value flow, touched/validation state, read-only handling).

## Non-goals

- Not a visual theming guide.
- Not a metadata architecture explanation (see core-concepts docs for server/client contract rationale).
- Not a replacement for source code/tests as behavior authority.

## Key Tasks

### 1. Choose override surface and precedence

- Model/view overrides enter through `storeModelConfig` and `useModelConfig`; runtime view components then pass these into `FormModel`/`DetailedView`.
- Per-instance props for `fieldComponents`, `widgetComponents`, `fieldProps`, and `widgetProps` take precedence over model-config values.
- Source anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/use/useModelConfig.js`, `client/lib/components/FormModel.vue`, `client/lib/components/DetailedView.vue`, `client/lib/utils/buildForm.js`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`, `client/tests/unit/lib/use/useFormModel.spec.js`.

### 2. Register component overrides using supported value shapes

- Override entries can be direct components, factory functions, or string keys resolved from `availableFields` / `availableWidgets`.
- Unknown mappings fail explicitly during form-model resolution for field/widget lookup.
- Source anchors: `client/lib/utils/buildForm.js`, `client/lib/utils/formLookups.js`, `client/lib/use/useFormModel.js`, `client/tests/unit/lib/use/useFormModel.spec.js`.

### 3. Keep custom components on the field/widget contract

- Custom field components should preserve `FIELD_PROPS`/`FIELD_EMITS` behavior (typically via `useField`) so form state and validation hooks stay wired.
- Custom widget components should preserve `WIDGET_PROPS`/`WIDGET_EMITS` behavior (typically via `useWidget`) so value adaptation, touch/focus state, and validation flags continue to work.
- Source anchors: `client/lib/use/useField.js`, `client/lib/use/useWidget.js`, `client/lib/fields/FieldString.vue`, `client/lib/widgets/WidgetInput.vue`, `client/tests/unit/lib/use/useWidget.spec.js`.

### 4. Use slot overrides before full component replacement

- `FieldRenderer` supports per-field slot targets: `field(<name>)`, `field(<name>)default`, `widget(<name>)`, `widget(<name>)default`.
- Filter rendering uses the same slot contract with `filter-` prefixes (for example `filter-widget(<name>)`).
- Source anchors: `client/lib/use/useFieldRenderer.js`, `client/lib/components/FieldRenderer.vue`, `client/lib/components/FilterForm.vue`, `client/tests/unit/lib/use/useFieldRenderer.spec.js`.

### 5. Validate expanded/read-only/fallback edge behavior

- Expanded relation base fields can resolve without direct widget components; expanded subfields use flattened keys (`expand__field`) for override targeting.
- Missing/`null` widget entries in renderer resolution fall back to `WidgetUnmapped` and surface an explicit UI error.
- Source anchors: `client/lib/use/useFormModel.js`, `client/lib/use/useFieldRenderer.js`, `client/lib/widgets/WidgetUnmapped.vue`, `client/tests/unit/lib/use/useFormModel.spec.js`, `client/tests/unit/lib/widgets/WidgetUnmapped.spec.js`.

### 6. Portable override patterns

- Config-level override pattern (portable):

```js
modelConfigStore.setConfig(
  { app: "myapp", model: "mymodel" },
  {
    fieldComponents: { "line_items": "FieldSetTabularInline" },
    widgetComponents: { "line_items__status": "WidgetSelect" },
    fieldProps: { "line_items": { showCreateButton: false } },
    widgetProps: { "line_items__amount": { step: 0.01 } },
  },
  {
    update: {
      expand: ["line_items"],
      displayFields: ["line_items", "line_items__status", "line_items__amount"],
    },
  },
);
```

- View slot override pattern (portable):

```vue
<template #widget(line_items__status)="slotProps">
  <component :is="slotProps.widgetComponent" v-bind="slotProps.widgetProps">
    <template v-for="[slotName, slotRenderer] of slotProps.slots" #[slotName]="innerProps" :key="slotName">
      <component :is="slotRenderer" v-bind="innerProps" />
    </template>
  </component>
</template>
```

- Custom widget wrapper pattern (portable):

```js
const props = defineProps({ ...WIDGET_PROPS, myDomainProp: { type: Object, default: () => ({}) } });
const emit = defineEmits([...WIDGET_EMITS]);
const widget = useWidget(props, emit);
```

- Source anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/utils/buildForm.js`, `client/lib/components/FieldRenderer.vue`, `client/lib/use/useFieldRenderer.js`, `client/lib/use/useWidget.js`, `client/lib/widgets/WidgetInput.vue`, `client/tests/unit/lib/use/useFormModel.spec.js`, `client/tests/unit/lib/use/useFieldRenderer.spec.js`.

## Relevant Implementation Surface

- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelConfig.storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.use/useFormModel}`
- `{@api js:function:@arrai-innovations/vueda.use/useFormModel.useFormModel}`
- `{@api js:module:@arrai-innovations/vueda.use/useFieldRenderer}`
- `{@api js:function:@arrai-innovations/vueda.use/useFieldRenderer.useFieldRenderer}`
- `{@api js:module:@arrai-innovations/vueda.use/useField}`
- `{@api js:function:@arrai-innovations/vueda.use/useField.useField}`
- `{@api js:module:@arrai-innovations/vueda.use/useWidget}`
- `{@api js:function:@arrai-innovations/vueda.use/useWidget.useWidget}`
- `{@api js:module:@arrai-innovations/vueda.utils/buildForm}`
- `{@api js:module:@arrai-innovations/vueda.utils/formLookups}`
- Vue.js Components:
- `{@api vue:component:FormModel}`
- `{@api vue:component:FieldRenderer}`
- `{@api vue:component:DetailedView}`
- `{@api vue:component:FilterForm}`
- `{@api vue:component:FieldSetTabularInline}`
- `{@api vue:component:WidgetSelect}`
- `{@api vue:component:WidgetUnmapped}`

## Contracts and Invariants

- Override precedence for field/widget components and props is: per-instance props, then model config, then type-derived defaults.
- `read` view handling and field `readOnly` metadata can force read-only widget resolution, independent of usual writable widget defaults.
- Field targeting uses flattened field paths (`expand__field`), and inline fieldsets rewrite `name` paths with indices for binding.
- Unknown mapping paths fail early (resolution errors), while missing runtime widget entries render `WidgetUnmapped`.
- Source anchors: `client/lib/utils/buildForm.js`, `client/lib/use/useFormModel.js`, `client/lib/use/useFieldRenderer.js`, `client/tests/unit/lib/use/useFormModel.spec.js`, `client/tests/unit/lib/use/useFieldRenderer.spec.js`.

## Footguns

- Overriding expanded relation base fields as if they were simple widgets can silently miss: base expanded widgets may be `null`; target subfields (`expand__subfield`) instead.
- Typos in string-based component names or unknown serializer/type mappings throw at runtime during form-model setup.
- Slot overrides without the exact slot key format (`widget(fieldName)` vs `widget(fieldName)default`, and `filter-` prefixed variants) appear to "do nothing."
- When replacing widgets with custom components, skipping passthrough of incoming slot renderers can drop expected label/help/feedback slot behavior.
- Source anchors: `client/lib/use/useFormModel.js`, `client/lib/utils/buildForm.js`, `client/lib/use/useFieldRenderer.js`, `client/tests/unit/lib/use/useFormModel.spec.js`.

## Suggested Outline

```md
## Goal and Preconditions
## Override Surface Selection
## Component Registration Strategy
## Custom Component Contract Checklist
## Slot Override Patterns
## Verification Checklist
## Portable Example Patterns
## Troubleshooting
```
