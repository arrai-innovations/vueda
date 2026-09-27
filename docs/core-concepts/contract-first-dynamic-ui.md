---
title: Contract-First Dynamic UI
type: explanation
audience: integrator
status: draft
---

# Contract-First Dynamic UI

VUEDA's client ships without knowledge of your models: which exist, what fields they have, or which actions they offer. It builds routes, forms, field and widget components, and action views at runtime from the server's metadata, called {@term Model Info}. It reads that metadata through {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}.

This page explains how the client turns that metadata into a default UI, and how you customize the parts that need it. It describes configuration precedence, with its exceptions, and field and widget resolution in full. [Server-Client Metadata Contract](./server-client-metadata-contract) describes what the metadata contains, and [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) describes how a model gets metadata.

## The Default UI and Customization

A model registered with a serializer and a viewset gets a complete {@term CRUD} surface with no client code. When a field changes on the server, the form changes with it. When the server stops offering an action, its route goes away.

The default UI is a starting point. A view that needs tweaking, or does not fit its conventions, takes overrides: for a field, for a widget, or for the whole view. Everything an override leaves alone still follows the metadata. [Configuration Precedence](#configuration-precedence) describes how overrides combine with the defaults.

Model info is the only source the client uses for a model's shape: its fields, [expands]{@term Expand}, filters, ordering, and [model-level actions]{@term Model Actions}. A user's actions can also come from the [workflow]{@term Workflow} and from [each object's own availability]{@term Available Actions}. [Action Contract and Availability](./action-contract-and-availability) describes where each action comes from. When the client does something unexpected, start with the metadata it received.

Registration decides what the client can build. A [registered]{@term Canonical Registration} model gets metadata, routes, forms, and permission gating. A model or endpoint outside registration gets none of these, and the client cannot add an action the server does not offer.

## Where the Metadata Comes From

The server derives model info from the model, [serializer]{@term Canonical Serializer}, [viewset]{@term Canonical Viewset}, and filterset definitions. These are the same definitions the server enforces. A field that is read-only in the serializer arrives read-only, and an action the viewset does not implement does not appear.

## Client Derivation Layer

The client renames model info's keys when it stores them; [Server-Client Metadata Contract](./server-client-metadata-contract#client-normalization) lists the names. It then derives each part of the UI from that metadata, with no per-model client code.

### Route Availability

Every model shares the same {@term CRUD Routes}. {@term Route Admission} opens a route only for an action the server lists for the user or one of the user's [permitted transitions]{@term Permitted Transitions}. [Routing and View Resolution Model](./routing-and-view-resolution-model) describes the guard chain and what happens when a guard rejects a route.

### Action View Resolution

For each admitted action, {@api vue:component:ViewActionRouter} picks one view through {@term Action View Resolution}. {@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents} changes the built-in view registry. The order and the transition cases are in [View Component Resolution Order](./routing-and-view-resolution-model#view-component-resolution-order).

### Field and Widget Resolution

Each form field renders as a [field component]{@term Form Field} that wraps a [widget component]{@term Widget}. The field component handles label, layout, help text, and error display. The widget is the input itself, such as a text box, select, or date picker.

The default field component is {@api vue:component:FormField} for every field type. The one type-driven exception is an expand in the form's field list, which renders as an [inline field set]{@term Inline}: {@api vue:component:FieldSetStackedInline} for a many relation, {@api vue:component:FieldSetSingularStackedInline} otherwise.

The default widget comes from [type mapping tables]{@api js:module:@arrai-innovations/vueda/utils/fieldMappings} keyed on the field's [`typeSerializer`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeSerializer}, then its [`typeModel`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeModel}. When `typeModel` is empty, the entry marked [`default`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#FieldMappingEntry.default} for that serializer type applies. [Choice fields]{@term Choice-Backed Field} and many-valued fields have their own tables, checked before the base table. [`typeDb`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeDb} only selects props for a [`GeneratedField`]{@api ext:django:django.db.models.GeneratedField}. {@api js:function:@arrai-innovations/vueda/utils/fieldMappings#mergeDefaultFieldMappings} adds or replaces entries in the base table at runtime.

A read-only field takes its type's read-only widget, or {@api vue:component:WidgetReadOnly} when the type has none. An editable field whose type has no mapping has no widget. That field renders an error in place of its input, and the rest of the form still renders. [Custom Field and Widget Rendering](../guides/custom-field-widget-rendering) describes that fallback and the steps to add a mapping.

### Form Generation

The form builder turns each field's metadata into a field component, a widget component, props for each, and choice-loading behaviour. Fields with static choices get their options inline in the metadata. Fields marked `choices: true` get options from the [choices endpoint]{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}: the widget fetches them when it holds a value or first gets focus. [Choices and Lookups](../guides/choices-and-lookups) describes the endpoint behaviour.

The client flattens expanded relations into [dotted field names]{@term Field Path} (`expandName.fieldName`). An override for a nested field uses the same keys as one for a base field. Composables and symbol-based provide and inject share [form state]{@term Form Context}: values, errors, touched state, and modification tracking. Nested field sets join the same form without passing props down.

## Configuration Precedence

The client can reshape what it derives through two layers above the server's defaults. {@term Model Config} is a Pinia store, {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}, filled with [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig}. It has a generic layer for all views of a model and a view layer keyed by view name (`list`, `create`, `update`, `read`, and others). For the same key, the view layer wins over the generic layer. Component props are the props a view or form receives from the template that renders it. [Reactive Data Flow](./reactive-data-flow) describes how the store builds and caches each view's config.

### The Rule

For fields and widgets, precedence is: **component props > model config > server-derived defaults.** How a layer wins depends on the kind of key:

- **Component maps** ({@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.fieldComponents}, {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.widgetComponents}): the first layer with an entry for the field wins. An entry can be a component, the name of a registered component, or a function that returns a component. An unknown name raises an error for that field.
- **Prop maps** ({@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.fieldProps}, {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.widgetProps}): the layers merge key by key. Defaults come first (the type mapping's props, plus the server's field entry for field props), then model config, then component props.
- **Field lists** ([`fields`]{@api vue:component:FormModel:prop:fields}, {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.expand}, [`computedFields`]{@api vue:component:FormModel:prop:computedFields}): a component prop replaces the model config list whole.
- **Field metadata** ({@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.fieldDetails}): entries merge over the server's field entries, per property, in the same order.

The resolver sets a few props after every layer, so no layer can set them. On the widget these are [`readOnly`]{@api js:property:@arrai-innovations/vueda/use/useWidget#WIDGET_PROPS} and the choice source (`options`, or the endpoint coordinates for `choices: true`). On the field they are [`name`]{@api vue:component:FormField:prop:name} and [`readOnly`]{@api vue:component:FormField:prop:readOnly}.

### Exceptions

Three cases do not follow the rule:

- **Read-only fields take the read-only widget.** When a field renders read-only, the resolver ignores `widgetComponents` from both layers and renders the type's read-only widget or `WidgetReadOnly`. A field renders read-only when the server marks it read-only, when the view is `read`, when it is a computed field, or when either layer sets `readOnly: true`. To customize it, replace the field component with `fieldComponents`, fill the field's [`widget(<name>)`]{@api vue:component:FieldRenderer:slot:widget(fieldName)} slot, or make the field editable.
- **Computed fields always use `FormField`.** A [computed field]{@term Computed Field} ignores `fieldComponents` from both layers.
- **`readOnly: false` wins from either layer.** An explicit `readOnly: false` in the `fieldProps` of either layer makes the field editable in the UI. It beats a server read-only marker, a `read` view, and a `readOnly: true` in the other layer, so a model config `false` beats a component prop `true`.

[`formProps`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.formProps} in model config are extra props for the form model, and the views bind them inconsistently. The {@api vue:component:ViewCreate} view binds its own props after `formProps`, so its props win. {@api vue:component:ViewUpdate}, {@api vue:component:ViewRead}, and {@api vue:component:DetailView} bind `formProps` last, so a model config key there beats the view's own prop of the same name. Issue [#341](https://github.com/arrai-innovations/vueda/issues/341) tracks making the views consistent.

List columns resolve through their own chain, described in [Customize List Column Rendering](../guides/customize-list-column-rendering).

### UI Overrides and Server Enforcement

Overrides change only what the client renders. Field props can replace `required`, `label`, or `readOnly` for the UI, and `fieldDetails` can replace any property of a field's metadata. The server applies its own validation and read-only rules on every write, whatever the form sent.

Overrides cannot add actions. The route guard admits only actions the server lists and workflow transition codes, so an action name that only model config knows gets no route and no view. [`routeActions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.routeActions} can only narrow the server's list. Hiding an action in the client does not remove its endpoint; [Authorization vs UI Semantics](./authorization-vs-ui-semantics) describes that boundary.

## Resolution Determinism

The same metadata, configuration, and registered mappings always produce the same UI. The type mapping tables and the view registry are module-level state, so `mergeDefaultFieldMappings` and `setCrudComponents` change the result for every model at once. Precedence has fixed layers, the resolver applies the three exceptions the same way in every form, and view resolution ends at exactly one component.

This is what makes a UI problem traceable. Debugging it means inspecting the metadata the client received and the configuration it applied.

## Failure Modes

**Client code names a field the server no longer sends.** A configured field list that names a field missing from the metadata throws `Unknown field ... specified` when the form builds. Project overrides and custom views reintroduce this risk whenever they reference contract details by name.

**Premature overrides hide defaults.** The default mapping is often correct. An override added before understanding the default adds maintenance and becomes one more variable when something breaks.

**Client-side restriction mistaken for server-side removal.** Removing an action from `routeActions` hides it in the client, but the endpoint still accepts requests from any user the server permits.

**Dynamic choices assumed to be loaded.** A field with `choices: true` has no options until its widget fetches them. Code that reads its options early sees an empty list, and keeps seeing one if the fetch fails.

**Widget overrides on read-only fields.** A `widgetComponents` entry for a field that renders read-only has no effect, as described under [Exceptions](#exceptions).

**Nested object paths for expanded fields.** Overrides for expanded fields use the flattened dotted key. A nested object path does not match any field, and the override is ignored.

**A failed model-info fetch blocks the model.** The client caches the failure, so the model stays unavailable until the cache clears. [Reactive Data Flow](./reactive-data-flow) describes when cached errors clear.
