---
title: Glossary
type: reference
audience: integrator
status: draft
---

# Glossary

## Action

A named operation that a VUEDA viewset exposes. The built-in actions are `list`, `retrieve`, `create`, `update`, `partial_update`, and `destroy`. Any other action is an {@term Extra Action}. {@term Model Info} and object payloads report actions by these names. Client routes use the same names, except `read`, which maps to the {@term Canonical Action Name} `retrieve`.

- Names: [`action`]{@api py:function:vueda.core.decorators.action}; [`ModelInfoAction`]{@api rest:schema:ModelInfoAction}; [`ActionInfo`]{@api js:interface:@arrai-innovations/vueda/stores/storeModelInfo#ActionInfo}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md)
- Upstream: [DRF: `action`]{@api ext:drf:rest_framework.decorators.action}

## Action Availability

Which actions the client offers a user. It draws them from {@term Model Actions}, each object's {@term Available Actions}, {@term Permitted Transitions}, and {@term Valid Transitions}. The client uses these lists for routes and buttons. The server checks each request again when it runs.

- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md)

## Action Redirect

The view an action form opens after its action succeeds or you cancel it. You set it per action in the model config's `actionRedirects`, with a `default` entry, and a `returnPath` query value takes precedence. The `actionRedirect` parameter of `makeCRUDRoutes` is a separate setting: where {@term Route Admission} sends a rejected route.

- Names: [`actionRedirects`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actionRedirects}; [`redirectTo`]{@api js:property:@arrai-innovations/vueda/use/useModelAction#ModelActionContext.redirectTo}
- Described in: [Design Transition UX and Redirects](../guides/transition-ux-and-redirects.md#redirect-precedence-and-route-targets)

## Action View Resolution

How `ViewActionRouter` picks the view component for a route that passed {@term Route Admission}. It tries the built-in view registry, then a project view named by convention, then a generic view for the action or transition. A transition code skips the built-in registry.

- Names: [`ViewActionRouter`]{@api vue:component:ViewActionRouter}; [`setCrudComponents`]{@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents}; [`crudComponents`]{@api js:property:@arrai-innovations/vueda/router/routerComponent#crudComponents}; [`ViewAction`]{@api vue:component:ViewAction}; [`ViewExecuteTransition`]{@api vue:component:ViewExecuteTransition}; [`ViewActionNotFound`]{@api vue:component:ViewActionNotFound}
- Described in: [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order)

## Action-Scoped Expand

A per-action list of the relations a request to that action may {@term Expand}, set on the viewset as `permit_<action>_expands`. An action without one allows every declared expand, except `list`, which allows none until you set `permit_list_expands`. The server rejects a request that expands anything else.

- Names: `permit_<action>_expands`; [`FlexFieldsMixin`]{@api py:class:vueda.core.viewsets.FlexFieldsMixin}
- Described in: [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md)
- Upstream: [drf-flex-fields: `FlexFieldsSerializerMixin`]{@api ext:drf-flex-fields:rest_flex_fields.FlexFieldsSerializerMixin}

## Auth-Scoped Stores

The client stores whose cached data depends on the signed-in user's permissions: {@term Model Info}, {@term Model Config}, workflow, and model choices. When a different user signs in or the user signs out, the client empties all four, and composables fetch again. A failed model info fetch, workflow fetch, or config build stays cached for its key until a user change, a store reset, or a page reload clears it.

- Names: [`clearAuthScopedStores`]{@api js:function:@arrai-innovations/vueda/stores/authScope#clearAuthScopedStores}; [`identityGeneration`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.identityGeneration}; [`AuthScopeInvalidatedError`]{@api js:class:@arrai-innovations/vueda/utils/errors#AuthScopeInvalidatedError}
- Described in: [Reactive Data Flow](../core-concepts/reactive-data-flow.md#when-caches-clear)

## Available Actions

The `available_actions` field on an object payload: the actions the current user may perform on that object. Built-in actions appear when an {@term Object-Scope Check} passes; extra actions appear as `get_allowed_extra_actions` returns them. The server includes the field only when the request asks for it through {@term Sparse Fields} (`f`).

- Names: [`available_actions`]{@api py:property:vueda.core.serializers.VuedaSerializer.available_actions}; [`AvailableActionsField`]{@api py:class:vueda.core.serializers.fields.AvailableActionsField}; [`get_allowed_extra_actions`]{@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#object-scope-availability-metadata)

## Baseline Permission

The decision Django's model permission check makes for a codename without an object, from the user's own and group permissions. It never depends on an object's state or row. It is the first of the {@term Permission Layers}, and later layers can change it for one object.

- Names: [`VUEDAPermissionsMixin.has_perm`]{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}
- Described in: [Permission Model](../core-concepts/permission-model.md#permission-authority-layers)
- Upstream: [Django: `ModelBackend.has_perm`]{@api ext:django:django.contrib.auth.backends.ModelBackend.has_perm}

## Bulk Action

An {@term Extra Action} declared with `bulk=True`. `VuedaRouter` also mounts it at the list URL, so one request can target several objects.

- Names: [`bulk`]{@api py:param:vueda.core.decorators.action.bulk}; [`VuedaRouter`]{@api py:class:vueda.core.routers.VuedaRouter}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#server-action-declaration-and-route-partitioning)
- Upstream: [DRF: `action`]{@api ext:drf:rest_framework.decorators.action}

## Cancellable Promise

A promise with a `cancel()` method that aborts its HTTP request. `fetchHelper` and the default {@term CRUD Adapter} functions return one. Promises that store actions return have no `cancel()`.

- Names: [`CancellablePromise`]{@api js:type:@arrai-innovations/vueda/utils/fetchSupport#CancellablePromise}; [`MaybeCancellablePromise`]{@api js:type:@arrai-innovations/vueda/utils/fetchSupport#MaybeCancellablePromise}; [`fetchHelper`]{@api js:function:@arrai-innovations/vueda/utils/fetchSupport#fetchHelper}
- Described in: [Cancellable Network Operations](../core-concepts/cancellable-network-operations.md#cancellation-surface-promise-identity)
- Upstream: [reactive-helpers: `cancellableFetch`]{@api ext:reactive-helpers:cancellableFetch}; [MDN: `AbortController`]{@api ext:mdn:AbortController}

## Canonical Action Name

The name {@term Model Info} uses for an action, which the client compares when it matches a route's action. The route segment `read` maps to the canonical name `retrieve`, and every other name maps to itself.

- Names: [`getActionName`]{@api js:function:@arrai-innovations/vueda/utils/actionMap#getActionName}; [`viewToActionNameMap`]{@api js:property:@arrai-innovations/vueda/utils/actionMap#viewToActionNameMap}
- Described in: [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#action-name-normalization)
- Upstream: [DRF: `ModelViewSet`]{@api ext:drf:rest_framework.viewsets.ModelViewSet}

## Canonical Registration

Registering a model with `register` or `register_serializer`, usually in `AppConfig.ready()`. It records the model's {@term Canonical Serializer} and, with `register`, its {@term Canonical Viewset}. {@term Model Info} describes only registered models.

- Names: [`register`]{@api py:function:vueda.info.registration.register}; [`register_serializer`]{@api py:function:vueda.info.registration.register_serializer}
- Described in: [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md#registration-states-and-transitions)
- Upstream: [Django: `AppConfig.ready`]{@api ext:django:django.apps.AppConfig.ready}

## Canonical Serializer

The serializer registered for a model. Its fields and `Meta.expandable_fields` define the field and expand sections of the model's {@term Model Info}.

- Names: [`canonical_serializer`]{@api py:param:vueda.info.registration.register.canonical_serializer}
- Described in: [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract.md#metadata-sections)
- Upstream: [DRF: `ModelSerializer`]{@api ext:drf:rest_framework.serializers.ModelSerializer}

## Canonical Viewset

The viewset registered with a model's {@term Canonical Serializer}. {@term Model Info} reads the model's actions, filtering, and column totals from it. It also reads the viewset's ordering when it declares one.

- Names: [`canonical_viewset`]{@api py:param:vueda.info.registration.register.canonical_viewset}; [`VuedaViewSet`]{@api py:class:vueda.core.viewsets.VuedaViewSet}
- Described in: [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md#viewset-presence-and-metadata-completeness)
- Upstream: [DRF: `ModelViewSet`]{@api ext:drf:rest_framework.viewsets.ModelViewSet}

## Choice-Backed Field

A field or filter whose {@term Model Info} entry carries `choices`. A list of `{label, value}` pairs with string values is the complete set. The value `true` means the choices come from a queryset, and the client loads them from the server when the field needs them.

- Names: [`FieldInfo.choices`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.choices}; [`FilterInfo.choices`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FilterInfo.choices}; [`model_info_choices`]{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}; [`model_info_filter_choices`]{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}; [`useModelChoices`]{@api js:function:@arrai-innovations/vueda/use/useModelChoices#useModelChoices}; [`storeModelChoices`]{@api js:function:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices}
- Described in: [Choice-Backed Fields and Lookup Models](../guides/choices-and-lookups.md)
- Upstream: [Django: `Field.choices`]{@api ext:django:django.db.models.Field.choices}

## Client Affordance

What the client shows or enables for a user, such as a visible action button or a route the guard admits. Affordances are client behavior; the server authorizes every request on its own.

- Described in: [Authorization vs UI Semantics](../core-concepts/authorization-vs-ui-semantics.md#ui-affordance-filtering)

## Column Adapter

The component that renders the cells of one list column, such as `ColumnText` or `ColumnModelLink`. A `field(<name>)` slot replaces it; otherwise VUEDA picks it from the `columnComponents` prop, then the model config's `columnComponents`, then the field type's default.

- Names: [`resolveColumnComponent`]{@api js:function:@arrai-innovations/vueda/utils/resolveColumnComponents#resolveColumnComponent}; [`columnComponents` prop]{@api vue:component:ViewList:prop:columnComponents}; [`columnComponents` config]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.columnComponents}; [`columnProps`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.columnProps}; [`mergeColumnMappings`]{@api js:function:@arrai-innovations/vueda/utils/columnMappings#mergeColumnMappings}; [`ColumnText`]{@api vue:component:ColumnText}; [`ColumnModelLink`]{@api vue:component:ColumnModelLink}
- Described in: [Customize List Column Rendering](../guides/customize-list-column-rendering.md#how-default-columns-are-chosen)

## Column Totals

Per-column sums a `list` response returns in `columnTotals`, computed over every filtered row on all pages. A viewset declares them in `column_totals`, and a request names the ones it wants in the `ct` query parameter.

- Names: [`column_totals`]{@api py:property:vueda.core.viewsets.ListRowLevelViewSetMixin.column_totals}; [`COLUMN_TOTALS_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#COLUMN_TOTALS_PARAM}; [`model_column_totals`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_column_totals}; [`ModelInfo.columnTotals`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo.columnTotals}; [`totalables`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.totalables}
- Described in: [Expose Aggregates in `list` Responses](../guides/list-column-totals.md)
- Upstream: [Django: `QuerySet.aggregate`]{@api ext:django:django.db.models.query.QuerySet.aggregate}

## Composite Primary Key

A primary key made of several model fields, declared with Django's `CompositePrimaryKey`. VUEDA sends its value as a JSON array string, such as `["1", "42"]`, and reads that string from the pk segment of a detail URL.

- Names: [`CompositePrimaryKeyField`]{@api py:class:vueda.core.serializers.fields.CompositePrimaryKeyField}; [`VuedaCompositePrimaryKeyFilterSet`]{@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}
- Described in: [Set Up CRUD for a Composite Primary Key Model](../guides/composite-primary-keys.md)
- Upstream: [Django: `CompositePrimaryKey`]{@api ext:django:django.db.models.CompositePrimaryKey}

## Composition Primitive

An underscore-prefixed {@term Theme Key}, such as `_ButtonBase`, that styles no component on its own. A {@term Theme Slot} lists primitive slots in its `composes` array and takes their classes before its own. A change to one primitive reaches every slot that composes it.

- Names: `composes`; example [`_ButtonBase`]{@api theme-key:\_ButtonBase}; [`ComponentTheme`]{@api js:type:@arrai-innovations/vueda/use/useTheme#ComponentTheme}
- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md#family-meta-keys)

## Computed Field

A form field that renders read-only in `FormField` and outside the {@term Form Context}. You name computed fields in the model config's `computedFields` list or the form's `computedFields` prop, which replaces the list.

- Names: [`computedFields` prop]{@api vue:component:FormModel:prop:computedFields}; [`computedFields` config]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.computedFields}
- Described in: [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui.md#field-and-widget-resolution)

## Content Type

Django's `ContentType` row, which identifies a model by its `app_label` and model name. VUEDA uses content types to identify the model behind model info, permissions, workflows, and queue items.

- Described in: [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md)
- Upstream: [Django: `ContentType`]{@api ext:django:django.contrib.contenttypes.models.ContentType}

## CRUD

VUEDA's five permission and action names: `create`, `read`, `update`, `delete`, and `list`. In VUEDA, CRUD always includes `list`. Codenames take the form `<app_label>.<name>_<model_name>`, such as `vueda_vdq.list_queueitem`. Client routes use these names. On the server, `read` covers `retrieve`, `update` also covers `partial_update`, and `delete` covers `destroy`.

- Names: [`BaseModelMeta.default_permissions`]{@api py:property:vueda.core.models.BaseModelMeta.default_permissions}; [`ObjectPermissions.perms_map`]{@api py:property:vueda.core.permissions.ObjectPermissions.perms_map}; [`getActionName`]{@api js:function:@arrai-innovations/vueda/utils/actionMap#getActionName}
- Described in: [Permission Model](../core-concepts/permission-model.md#crud-codename-and-action-mapping)
- Upstream: [Django: `default_permissions`]{@api ext:django:django.db.models.Options.default_permissions}

## CRUD Adapter

A function that performs one data operation, such as retrieve, update, or delete, for the reactive-helpers list and object composables. The adapters cover list operations too: list, bulk delete, and actions on several objects. `setupDefaultListCrud` and `setupDefaultObjectCrud` register VUEDA's REST adapters, and you can replace any of them.

- Names: [`setupDefaultListCrud`]{@api js:function:@arrai-innovations/vueda/utils/listCrud#setupDefaultListCrud}; [`setupDefaultObjectCrud`]{@api js:function:@arrai-innovations/vueda/utils/objectCrud#setupDefaultObjectCrud}
- Described in: [CRUD Adapter Layer](../core-concepts/crud-adapter-layer.md)
- Upstream: [reactive-helpers: `setListCrud`]{@api ext:reactive-helpers:setListCrud}; [reactive-helpers: `setObjectCrud`]{@api ext:reactive-helpers:setObjectCrud}

## CRUD Routes

The two client routes that `makeCRUDRoutes` registers for every model and action. The detail route, `/:app/:model/:action/:pk`, targets one object; the list route, `/:app/:model/:action/`, targets a model or the objects in its `pk` query value. Either route may carry a `returnPath` query value, where an action view goes after it finishes.

- Names: [`makeCRUDRoutes`]{@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes}; [`getCRUDForTo`]{@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo}; `actionrouter.detailview`; `actionrouter.listview`
- Described in: [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#route-records-and-names)

## Customization Scope

How much of the UI one theming change reaches. The four scopes are instance ({@term Theme Override}), component ({@term Theme Key}), family ({@term Composition Primitive}), and brand ({@term Theme Token}). Pick the narrowest scope that covers your change.

- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md#the-four-scopes)

## Done State

A {@term Queue Item} workflow state that ends processing: `cancelled`, `succeeded`, or `unconfirmed`. The queue list hides items in a done state, and {@term Sent Item} endpoints show only them. `errored` is not a done state, so an errored item stays in the queue.

- Names: `QUEUE_ITEM_DONE_STATES` in [`vueda.vdq.constants`]{@api py:module:vueda.vdq.constants}
- Described in: [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md#done-state-semantics-and-cleanup-gating)

## Dry Run

A request mode, set with the `Dry-Run: true` header, that runs a write's checks and logic and then keeps none of its changes. Extra actions declared with VUEDA's `action` decorator and `destroy` honor the header. The other built-in writes ignore it.

- Names: the `Dry-Run` header; `DRY_RUN_HEADER`; [`action`]{@api py:function:vueda.core.decorators.action}; [`dryRun`]{@api js:property:@arrai-innovations/vueda/use/useModelAction#ModelActionRunOptions.dryRun}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#dry-run-and-mutation-semantics)
- Upstream: [Django: `set_rollback`]{@api ext:django:django.db.transaction.set_rollback}

## Expand

A request option that returns a related object inline in place of its primary key. You name relations in the `e` query parameter, choosing from the ones the serializer declares and {@term Model Info} lists. On a write, a relation named in `e` also accepts a nested object, for a {@term Nested Write}.

- Names: [`EXPAND_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#EXPAND_PARAM}; `expandable_fields`; [`model_expands`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_expands}; [`ModelInfo.expand`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo.expand}; [`ModelConfig.expand`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.expand}; [`FlexFieldsWriteableNestedSerializerMixin`]{@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}
- Described in: [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md#parameter-namespace-and-wire-shape)
- Upstream: [drf-flex-fields: `FlexFieldsSerializerMixin`]{@api ext:drf-flex-fields:rest_flex_fields.FlexFieldsSerializerMixin}

## Extra Action

An {@term Action} that a viewset declares with VUEDA's `action` decorator, in addition to the built-in actions. It targets one object when declared `detail=True` and the model otherwise; a {@term Bulk Action} can target several objects. Model info reports it by its `url_name`.

- Names: [`action`]{@api py:function:vueda.core.decorators.action}; [`detail`]{@api py:param:vueda.core.decorators.action.detail}; [`get_allowed_extra_actions`]{@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#server-action-declaration-and-route-partitioning)
- Upstream: [DRF: `action`]{@api ext:drf:rest_framework.decorators.action}

## Fast Transition

A {@term Transition} that server code applies through `fast_transition`. It checks only that the current state is a source for the transition, skips permission checks, and records the change under the system user. From a source marked ignored, it keeps the state and runs `on_transition_ignored`; [VDQ]{@term VDQ (VUEDA Dispatch Queue)} uses this for late provider callbacks.

- Names: [`fast_transition`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.fast_transition}; [`TransitionSource.ignored`]{@api py:function:vueda.workflow.models.TransitionSource.ignored}; [`on_transition_ignored`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.on_transition_ignored}
- Described in: [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md#workflow-backed-lifecycle-including-ignored-transitions)

## Feature Policy

A {@term VUEDA Model}'s per-feature settings, declared in a nested `class Vueda` with one inner class per feature, such as `History` or `Workflow`. Options a model leaves out take the feature app's defaults, and declarations inherit through the model's bases.

- Names: `class Vueda`; [`get_vueda_options`]{@api py:function:vueda.core.options.get_vueda_options}; [`register_feature_section`]{@api py:function:vueda.core.features.register_feature_section}
- Described in: [Model Feature Policy](../core-concepts/model-feature-policy.md)
- Upstream: [Django: `class_prepared`]{@api ext:django:django.db.models.signals.class_prepared}

## Field Path

The key that names one field in a form, with dots for nested objects and brackets for list items, such as `address.city` or `items[0].quantity`. The {@term Form Context} and the client's parsed server errors key fields by it.

- Names: [`FormValidationError`]{@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}
- Described in: [Error and Validation Contract](../core-concepts/error-and-validation-contract.md#non-field-and-nested-path-semantics)

## Form Context

The shared form state and methods that `useForm` provides to the fields inside a form: values, errors, messages, and touched and ignored fields. Each field calls `useField`, which creates a field context that reads and writes the form context at the field's {@term Field Path}.

- Names: [`useForm`]{@api js:function:@arrai-innovations/vueda/use/useForm#useForm}; [`FormContext`]{@api js:interface:@arrai-innovations/vueda/use/useForm#FormContext}; [`useField`]{@api js:function:@arrai-innovations/vueda/use/useField#useField}; [`FieldContext`]{@api js:interface:@arrai-innovations/vueda/use/useField#FieldContext}
- Described in: [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md#form-context-state-shape)

## Form Field

The component that renders one field's label, help text, and error and warning messages around its {@term Widget}. VUEDA picks it from the form's `fieldComponents` prop, then the model config's `fieldComponents`, then the default. The default is `FormField`, or an {@term Inline} for an expanded relation.

- Names: [`FormField`]{@api vue:component:FormField}; [`fieldComponents` prop]{@api vue:component:FormModel:prop:fieldComponents}; [`ModelConfig.fieldComponents`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fieldComponents}; [`FIELD_PROPS`]{@api js:property:@arrai-innovations/vueda/use/useField#FIELD_PROPS}; [`availableFields`]{@api js:property:@arrai-innovations/vueda/utils/formLookups#availableFields}
- Described in: [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui.md#field-and-widget-resolution)

## Formatted Name

The display label each {@term VUEDA Model} exposes as `formatted_name`, which the client shows for related objects and choices. By default it is a stored generated column that copies the model's `name` field. A model can instead supply it through another expression, a lookup path, or a `get_formatted_name()` method.

- Names: [`formatted_name`]{@api py:function:vueda.core.models.FormattedNameBaseModel.formatted_name}; [`formatted_name_lookup_expression`]{@api py:property:vueda.core.models.FormattedNameBaseModel.formatted_name_lookup_expression}; `get_formatted_name()`
- Described in: [Create a CRUD Surface](../guides/create-crud-surface.md#the-formatted-name-contract)
- Upstream: [Django: `GeneratedField`]{@api ext:django:django.db.models.GeneratedField}

## Group Management Page

A page, served only when `DEBUG` is on, where you add groups to permissions and remove them. VUEDA records each change for a {@term Group Permission Migration}. The read-only {@term Permissions and Workflow Overview} is a separate page.

- Names: [`PermissionOverviewView`]{@api py:class:vueda.user.views.PermissionOverviewView}
- Described in: [Manage Groups and Generate Group Migrations](../guides/manage-groups.md#group-management-ui)

## Group Permission Migration

A migration that `makegroupmigrations` writes from the changes recorded on the {@term Group Management Page}, so other environments receive the same group permissions. It names groups and permissions by natural key and goes in the app of `AUTH_USER_MODEL`.

- Names: [`makegroupmigrations`]{@api py:class:vueda.user.management.commands.makegroupmigrations.Command}; [`updategroupmigrations`]{@api py:class:vueda.user.management.commands.updategroupmigrations.Command}; [`sync_group_changes`]{@api py:class:vueda.user.management.commands.sync_group_changes.Command}; [`GroupChange`]{@api py:class:vueda.user.models.GroupChange}
- Described in: [Manage Groups and Generate Group Migrations](../guides/manage-groups.md#generating-group-migrations)
- Upstream: [Django: `Group`]{@api ext:django:django.contrib.auth.models.Group}; [Django: `AUTH_USER_MODEL`]{@api ext:django:setting:AUTH_USER_MODEL}

## Hairline

VUEDA's edge line for controls and surfaces. Its width comes from the `--vueda-hairline-width` token, which steps down as screen pixel density rises. The `hairline` utility paints it as an inset shadow, so a four-sided edge adds no layout width.

- Names: [`--vueda-hairline-width`]{@api css-token:vueda-hairline-width}; the `hairline` utility
- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md)

## Icon Registry

The registry that maps icon names, such as `loading` or `check`, to Vue components, grouped by component name. It starts empty. You fill it with `setIcons` or `patchIcons`, for example by installing the Font Awesome Free preset.

- Names: [`setIcons`]{@api js:function:@arrai-innovations/vueda/use/useIcons#setIcons}; [`patchIcons`]{@api js:function:@arrai-innovations/vueda/use/useIcons#patchIcons}; [`useIcons`]{@api js:function:@arrai-innovations/vueda/use/useIcons#useIcons}; [`useIconsOverride`]{@api js:function:@arrai-innovations/vueda/use/useIcons#useIconsOverride}; [`IconRegistry`]{@api js:type:@arrai-innovations/vueda/use/useIcons#IconRegistry}; [`installFontAwesomeFreeIcons`]{@api js:function:@arrai-innovations/vueda/theme/vueda-tailwind/icons/fontAwesomeFree#installFontAwesomeFreeIcons}
- Described in: [Customize VUEDA Appearance](../guides/customize-vueda-appearance.md)

## Ignored Field

A {@term Field Path} marked with the form context's `ignore` method. The form leaves an ignored field out of the values it submits, and the field's errors do not block submitting. An {@term Inline} ignores each saved row you mark for removal.

- Names: [`FormContext.ignore`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.ignore}; [`FieldContext.ignore`]{@api js:property:@arrai-innovations/vueda/use/useField#FieldContext.ignore}; [`submittingValues`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.submittingValues}
- Described in: [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md#ignored-fields-and-submitting-values)

## Inline

A field set that edits related objects inside the parent form. `FieldSetTabularInline` shows them as table rows and `FieldSetStackedInline` as stacked cards. Saving the parent sends them in a {@term Nested Write}.

- Names: [`FieldSetTabularInline`]{@api vue:component:FieldSetTabularInline}; [`FieldSetStackedInline`]{@api vue:component:FieldSetStackedInline}; [`useFieldSetInline`]{@api js:function:@arrai-innovations/vueda/use/useFieldSetInline#useFieldSetInline}
- Described in: [Build Nested/Inlined Writes](../guides/nested-writable-inlines.md)

## List Scope

A constraint on a list that a link or your application code supplies, shown as a chip with no editable input. It comes from a hidden filter's value in the URL, or from a `params` key you declare in the `scopes` option.

- Names: [`scopes`]{@api vue:component:ViewList:prop:scopes}; [`params`]{@api vue:component:ViewList:prop:params}; [`FilterInfo.hidden`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FilterInfo.hidden}; [`ViewListScope`]{@api js:interface:@arrai-innovations/vueda/use/useViewList#ViewListScope}; [`ScopeChip`]{@api vue:component:ScopeChip}; [`ScopeGroup`]{@api vue:component:ScopeGroup}
- Described in: [Open a Scoped List](../guides/scope-a-list.md)

## Lookup

An abstract model base for reference tables of codes and names, such as statuses or categories. It provides a unique `code`, a `name`, and a {@term Formatted Name}. It is a {@term VUEDA Model} base beside `VuedaModel`.

- Names: [`Lookup`]{@api py:class:vueda.core.models.Lookup}; [`VuedaLookupSerializer`]{@api py:class:vueda.core.serializers.VuedaLookupSerializer}
- Described in: [Start Building](../tutorials/start-building.md#models)
- Upstream: [Django: abstract base classes]{@api ext:django:django.db.models.Options.abstract}

## Model Actions

The `model_actions` list in {@term Model Info}: the actions the model's viewset offers the current user, with no object in view. Built-in actions appear when a {@term Model-Scope Check} passes; extra actions appear as `get_allowed_extra_actions` returns them. The list shapes client routes and buttons, and each endpoint still enforces its own permissions.

- Names: `model_actions`; [`get_model_actions`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}; [`ModelInfoAction`]{@api rest:schema:ModelInfoAction}; [`ModelInfo.actions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo.actions}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#model-scope-action-metadata)

## Model API Path

The server path the client requests for a model's endpoints: `/routes/<app_label>/<model_name>/`, with detail and action paths below it. You serve each viewset there, or change the client's URL templates with `setCustomUrl`. The {@term CRUD Routes} are client paths, separate from this server path.

- Names: [`getListUrl`]{@api js:function:@arrai-innovations/vueda/utils/urls#getListUrl}; [`getDetailUrl`]{@api js:function:@arrai-innovations/vueda/utils/urls#getDetailUrl}; [`setCustomUrl`]{@api js:function:@arrai-innovations/vueda/utils/urls#setCustomUrl}; [`VuedaRouter`]{@api py:class:vueda.core.routers.VuedaRouter}; `modelList`; `modelDetail`; `modelAction`; `modelDetailAction`
- Described in: [Create a CRUD Surface for a New Model](../guides/create-crud-surface.md#router-and-url-wiring)
- Upstream: [Django: `Options.app_label`]{@api ext:django:django.db.models.Options.app_label}

## Model Config

The client's settings for a model's views, built from {@term Model Info} and the overrides you pass to `setConfig`. Overrides have a generic layer for every view and a per-view layer keyed by view name. For the same key, the per-view layer wins.

- Names: [`storeModelConfig`]{@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}; [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig}; [`useModelConfig`]{@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig}; [`OverridingModelConfig`]{@api js:interface:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig}
- Described in: [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui.md#configuration-precedence)

## Model History

The record of inserts, updates, and deletes that VUEDA keeps for each tracked model, stored as pghistory event rows. VUEDA tracks every {@term VUEDA Model} unless its {@term Feature Policy} sets `History.enabled = False`. Event rows are append-only, and VUEDA sets no retention policy.

- Names: [`vueda.history`]{@api py:module:vueda.history}; `History.enabled`; `PGHISTORY_APPEND_ONLY`
- Described in: [Model Feature Policy](../core-concepts/model-feature-policy.md#history-and-workflow)
- Upstream: [pghistory: `track`]{@api ext:pghistory:pghistory.track}; [pghistory: `Event`]{@api ext:pghistory:pghistory.models.Event}

## Model Info

The metadata the server publishes for each registered model, in seven sections: fields, actions, expands, ordering, filtering, column totals, and permissions. The actions section depends on the requesting user. The client builds its default views from model info and caches it per model.

- Names: {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}; [`ModelInfoSerializer`]{@api py:class:vueda.info.serializers.ModelInfoSerializer}; [`storeModelInfo`]{@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo}; [`useModelInfo`]{@api js:function:@arrai-innovations/vueda/use/useModelInfo#useModelInfo}; [`ModelInfo`]{@api js:interface:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo}
- Described in: [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract.md#metadata-sections)

## Model-Scope Check

A permission check with no object, which asks whether the user may perform an action on the model at all. The server runs it before a request fetches any object, and {@term Model Actions} runs one for each built-in action.

- Names: [`check_action_permission`]{@api py:function:vueda.core.permissions.check_action_permission}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#model-scope-action-metadata)

## Model-Scope Deferral

On a {@term Workflow-Enabled Model}, the server can hold a model-scope denial open. It does so when a {@term State Permission} rule grants the codename to one of the user's groups. It applies only where a later object check or list filter decides the request; `create` keeps the denial. This is server enforcement.

- Names: [`has_matching_state_grant`]{@api py:function:vueda.core.permissions.has_matching_state_grant}; [`ObjectPermissions.has_permission`]{@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}; [`object_permission_actions`]{@api py:property:vueda.core.permissions.ObjectPermissions.object_permission_actions}; [`workflow_object_permission_actions`]{@api py:property:vueda.core.viewsets.VuedaViewSet.workflow_object_permission_actions}
- Described in: [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md#model-scope-deferral-and-later-decisions)

## Nested Write

A create or update that sends related objects inside the parent payload and saves them in the same request. A relation accepts nested objects when its serializer field is a nested serializer or the request names it in {@term Expand}.

- Names: [`FlexFieldsWriteableNestedSerializerMixin`]{@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}; [`VuedaSerializer`]{@api py:class:vueda.core.serializers.VuedaSerializer}
- Described in: [Nested Write Compatibility](../core-concepts/nested-write-compatibility.md)
- Upstream: [drf-writable-nested: `NestedCreateMixin`]{@api ext:drf-writable-nested:drf_writable_nested.NestedCreateMixin}; [drf-writable-nested: `NestedUpdateMixin`]{@api ext:drf-writable-nested:drf_writable_nested.NestedUpdateMixin}; [drf-flex-fields: `FlexFieldsSerializerMixin`]{@api ext:drf-flex-fields:rest_flex_fields.FlexFieldsSerializerMixin}

## Non-Field Error

A validation error or warning that belongs to the whole form, sent under the `non_field_errors` key. VUEDA's exception handler also puts a validation error raised as a list under that key. `FormMessage` renders these messages in the form.

- Names: [`NON_FIELD_ERRORS_KEY`]{@api js:property:@arrai-innovations/vueda/utils/constants#NON_FIELD_ERRORS_KEY}; [`debug_stack_exception_handler`]{@api py:function:vueda.core.exceptions.debug_stack_exception_handler}; [`FormMessage`]{@api vue:component:FormMessage}
- Described in: [Error and Validation Contract](../core-concepts/error-and-validation-contract.md#non-field-and-nested-path-semantics)
- Upstream: [DRF: `ValidationError`]{@api ext:drf:rest_framework.exceptions.ValidationError}; [Django: `NON_FIELD_ERRORS`]{@api ext:django:django.core.exceptions.NON_FIELD_ERRORS}

## Object State

The record that stores which workflow state one object is in. VUEDA creates it in the workflow's initial state when you save a {@term Workflow-Enabled Model} object that has none. `backfillworkflowstates` creates any that are missing.

- Names: [`ObjectState`]{@api py:class:vueda.workflow.models.ObjectState}; [`workflow_state`]{@api py:property:vueda.workflow.models.WorkflowModelMethods.workflow_state}; [`ensure_object_state`]{@api py:function:vueda.workflow.models.ensure_object_state}; [`backfillworkflowstates`]{@api py:class:vueda.workflow.management.commands.backfillworkflowstates.Command}
- Described in: [Manage Workflows and Generate Workflow Migrations](../guides/manage-workflows.md#enabling-workflow-on-a-model-with-existing-rows)

## Object-Scope Check

A permission check against one object, including its {@term Row-Level Permissions} and {@term State Permission} rules. The server runs it on requests for that object, and it decides which built-in actions appear in the object's {@term Available Actions}.

- Names: [`check_action_permission`]{@api py:function:vueda.core.permissions.check_action_permission}; [`ObjectPermissions`]{@api py:class:vueda.core.permissions.ObjectPermissions}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#object-scope-availability-metadata)

## Permission Layers

The checks `VUEDAPermissionsMixin.has_perm` runs for a permission, in order: the {@term Baseline Permission}, {@term State Permission} rules, `check_instance`, and `check_instance_workflow`. Each layer that returns an answer replaces the decision so far, except that a state deny skips `check_instance`. Superusers pass before any layer runs; this is server enforcement.

- Names: [`VUEDAPermissionsMixin.has_perm`]{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}; [`check_instance`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}; [`check_instance_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}
- Described in: [Permission Model](../core-concepts/permission-model.md#permission-authority-layers)
- Upstream: [Django: `PermissionsMixin.has_perm`]{@api ext:django:django.contrib.auth.models.PermissionsMixin.has_perm}

## Permission Mapping

The `PERMISSION_NAMES_MAPPING` setting, which maps Django's permission action names to VUEDA's. By default `add` becomes `create`, `change` becomes `update`, and `view` becomes `read`. It takes effect when your settings import `vueda.core.patch_django` after setting it.

- Names: `PERMISSION_NAMES_MAPPING`; [`patch_django`]{@api py:module:vueda.core.patch_django}; [`get_builtin_permissions`]{@api py:function:vueda.core.patch_django.get_builtin_permissions}; [`get_permission_codename`]{@api py:function:vueda.core.patch_django.get_permission_codename}
- Described in: [Map Django and VUEDA Permission Names](../guides/permission-name-mapping.md#set-mapping-and-patch-import-order)
- Upstream: [Django: `default_permissions`]{@api ext:django:django.db.models.Options.default_permissions}

## Permissions and Workflow Overview

A read-only page, served only when `DEBUG` is on, that lists each registered model's permissions and the groups that hold them. It also lists each workflow's transitions, workflow permissions, and state rules, and can show what one selected user holds. You edit groups on the {@term Group Management Page}.

- Names: [`InfoOverviewView`]{@api py:class:vueda.info.views.InfoOverviewView}
- Described in: [Use the Permissions and Workflow Overview](../guides/permissions-workflow-overview.md)

## Permitted Transitions

The transitions of a model's {@term Workflow} that the current user may execute, computed at model scope with no object. The client uses them for {@term Route Admission} and for transition buttons on list views. Executing one still checks the object and its current state on the server.

- Names: [`permitted_transitions`]{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}; [`GET permitted_transitions/`]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}; [`fetchWorkflowTransition`]{@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.fetchWorkflowTransition}
- Described in: [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md#which-gate-each-workflow-endpoint-applies)

## Pk Marker

The `pk: true` flag that {@term Model Info} sets on the field whose name matches the model's primary key. The client reads it to find each object's identifier, and fails to load the model's metadata when no field carries it.

- Names: [`FieldInfo.pk`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.pk}; [`ModelInfo.pk`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo.pk}; [`get_model_fields_data`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields_data}
- Described in: [Primary Key and Identifier Discipline](../core-concepts/pk-and-identifier-discipline.md#pk-authority-and-metadata-source)
- Upstream: [Django: `Field.primary_key`]{@api ext:django:django.db.models.Field.primary_key}

## Public Name

The dotted path a request uses for a field, filter, ordering term, or expand, such as `customer.formatted_name`. VUEDA maps it to the `__`-joined Django path on the server, so a request never names an ORM path.

- Names: [`vueda.core.paths`]{@api py:module:vueda.core.paths}; [`PublicFilterAliasMixin`]{@api py:class:vueda.core.filters.PublicFilterAliasMixin}; [`public_ordering_path_to_orm`]{@api py:function:vueda.core.paths.public_ordering_path_to_orm}; [`orm_filter_path_to_public`]{@api py:function:vueda.core.paths.orm_filter_path_to_public}
- Described in: [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics.md)
- Upstream: [django-filter: `FilterSet`]{@api ext:django-filter:django_filters.filterset.FilterSet}

## Query Parameter Validation

The server's rejection of any query parameter that a `list` or `retrieve` request does not recognize. An unknown key, or an `f` or `e` value the endpoint does not offer, returns a validation error that names it.

- Names: [`NoExtraFieldsForViewSetMixin`]{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}; [`get_extra_allowed_fields`]{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.get_extra_allowed_fields}; [`reject_unrecognized_query_params`]{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.reject_unrecognized_query_params}; [`validate_flex_expand_and_field_param`]{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param}
- Described in: [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics.md#query-namespace-and-validation-boundary)

## Queue Item

The database row for one {@term VDQ (VUEDA Dispatch Queue)} message to one receiver. It holds the sender, method (`email` or `sms`), workflow state, and send result. `add_email` creates one queue item per `to`, `cc`, and `bcc` address.

- Names: [`QueueItem`]{@api py:class:vueda.vdq.models.QueueItem}; [`AnyMailQueueItem`]{@api py:class:vueda.vdq.models.AnyMailQueueItem}; [`SMSQueueItem`]{@api py:class:vueda.vdq.models.SMSQueueItem}; [`add_email`]{@api py:function:vueda.vdq.schedulers.add_email}; [`add_sms`]{@api py:function:vueda.vdq.schedulers.add_sms}; [queue item endpoint]{@api rest:endpoint:GET:/vueda.vdq/queueitem/}; [`DefaultQueueItem`]{@api rest:schema:DefaultQueueItem}
- Described in: [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md#persistence-and-workflow-boundary)

## Reauthentication

A check that a signed-in user confirmed their identity recently, by password or second factor. The server enforces it on sensitive actions, such as two-factor device setup. In the client, `requireRecentAuth` and the auth views route the user to the `reauthenticate` page and back.

- Names: [`recent_auth_required`]{@api py:function:vueda.core.decorators.recent_auth_required}; [`recently_logged_in`]{@api py:property:vueda.user.serializers.WhoIsSerializer.recently_logged_in}; [`recentlyLoggedIn`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.recentlyLoggedIn}; [`requireRecentAuth`]{@api js:function:@arrai-innovations/vueda/router/guards#requireRecentAuth}; [`storeUser.reauthenticate`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.reauthenticate}; [reauthenticate endpoint]{@api rest:endpoint:POST:/vueda.user/reauthenticate/}; `ACCOUNT_REAUTHENTICATION_TIMEOUT`
- Described in: [Build Auth Views](../guides/build-auth-views.md#build-a-re-authentication-view)

## Route Admission

The client checks a navigation must pass to open one of the {@term CRUD Routes}, in order: optional sign-in, action allowlist, optional group membership. The allowlist is the user's {@term Model Actions}, narrowed by `routeActions`, plus the user's [permitted transition codes]{@term Permitted Transitions}. A failed check redirects, and the server still authorizes every request on its own.

- Names: [`makeCRUDRoutes`]{@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes}; [`requireAuth`]{@api js:function:@arrai-innovations/vueda/router/guards#requireAuth}; [`requireModelInfo`]{@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo}; [`requireGroups`]{@api js:function:@arrai-innovations/vueda/router/guards#requireGroups}; [`routeActions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.routeActions}; [`actionRedirect`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.actionRedirect}
- Described in: [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#route-guard-chain)

## Row Link

A link from one list column's cells to each row's update view, or to its read view when you cannot update the row. You turn it on by naming the column in the model config's `detailLinkField`. The row's {@term Available Actions} decide which view the link opens, if any.

- Names: [`detailLinkField`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.detailLinkField}; [`LinkModelView`]{@api vue:component:LinkModelView}
- Described in: [Link List Rows to Read and Update Views](../guides/link-list-rows-to-detail-views.md)

## Row-Level Permissions

Project rules, declared in a model's inner `RowLevelPermissions` class, that limit which rows a user may act on. `check_queryset` filters `list`, bulk `destroy`, and the history events a user sees about related rows; `check_instance` joins each object permission check. It is opt-in server enforcement, and {@term Row-Level Workflow Permissions} adds two hooks for workflow models.

- Names: `RowLevelPermissions`; [`BaseRowLevelPermissions`]{@api py:class:vueda.core.permissions.BaseRowLevelPermissions}; [`check_queryset`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}; [`check_instance`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}; [`check_queryset_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow}; [`check_instance_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}; [`filter_rows_for_user`]{@api py:function:vueda.core.permissions.filter_rows_for_user}
- Described in: [Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering.md#authority-and-boundaries)

## Row-Level Workflow Permissions

The two row-level hooks that run only for a {@term Workflow-Enabled Model}. `check_instance_workflow` runs last in an object check and can override any earlier decision, a state deny included. `check_queryset_workflow` can narrow a list further but cannot restore rows a {@term State Permission} rule removed.

- Names: [`check_instance_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}; [`check_queryset_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow}; [`state_denied_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_denied_annotation}; [`state_granted_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_granted_annotation}
- Described in: [Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering.md#authority-and-boundaries)

## Sent Item

A {@term Queue Item} in a {@term Done State}, served by its own endpoints for delivery history and resend. Resending a sent item creates a new queue item and schedules it.

- Names: [`SentItem`]{@api py:class:vueda.vdq.models.SentItem}; [`SentItemManager`]{@api py:class:vueda.vdq.models.SentItemManager}; [sent item endpoint]{@api rest:endpoint:GET:/vueda.vdq/sentitem/}; [resend endpoint]{@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}; [`DefaultSentItem`]{@api rest:schema:DefaultSentItem}
- Described in: [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md#done-state-semantics-and-cleanup-gating)
- Upstream: [Django: proxy models]{@api ext:django:django.db.models.Options.proxy}

## Serializer-Only Registration

Registering a model with `register_serializer` and no viewset. The model gets field, expand, and permission metadata and its choices endpoints, and no actions, filtering, or column totals.

- Names: [`register_serializer`]{@api py:function:vueda.info.registration.register_serializer}
- Described in: [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md#viewset-presence-and-metadata-completeness)

## Server Feedback

Validation errors and {@term Warning Confirmation} warnings from the server, stored in the {@term Form Context} under the reserved `server` code. Local validation cannot write that code. A field's server feedback clears when the field blurs, and remaining server errors do not block the next submit.

- Names: [`ServerFeedbackError`]{@api js:class:@arrai-innovations/vueda/utils/errors#ServerFeedbackError}; [`FormValidationError`]{@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}; [`handleServerFormValidationError`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.handleServerFormValidationError}; [`clearServerErrors`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.clearServerErrors}
- Described in: [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md#server-validation-ingestion-and-clearing)

## Skin

The token-level look of VUEDA: color, type, spacing, radius, and density. A re-skin changes these values through {@term Theme Token} overrides and keeps each component's {@term Visual Contract}.

- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md#brand-css-token-overrides)

## Sparse Fields

A request option that narrows a response to named fields. You list fields to keep in `f` and fields to drop in `om`; on a write, both shape only the response. `f` also requests fields a response leaves out by default, such as {@term Available Actions}.

- Names: [`FIELDS_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#FIELDS_PARAM}; [`OMIT_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#OMIT_PARAM}; [`fetchFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fetchFields}
- Described in: [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md#parameter-namespace-and-wire-shape)
- Upstream: [drf-flex-fields: `FlexFieldsSerializerMixin`]{@api ext:drf-flex-fields:rest_flex_fields.FlexFieldsSerializerMixin}

## State Permission

A rule that grants or denies one permission codename to one group while an object is in one workflow state. On an object check, a grant overrides a {@term Baseline Permission} denial and a deny overrides a grant; when rules conflict, deny wins. List filtering applies the same rules to each row; this is server enforcement.

- Names: [`StatePermission`]{@api py:class:vueda.workflow.models.StatePermission}; [`check_state_permission`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.check_state_permission}
- Described in: [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md#state-permission-data-model)
- Upstream: [Django: `Permission`]{@api ext:django:django.contrib.auth.models.Permission}; [Django: `Group`]{@api ext:django:django.contrib.auth.models.Group}

## Theme Key

One entry in the {@term Theme Registry}, named after the component it styles (`Button`). A {@term Composition Primitive} key has an underscore prefix (`_ButtonBase`). Each theme key holds one or more {@term Theme Slot} entries.

- Names: [theme keys index]{@api theming:keys}; example [`Button`]{@api theme-key:Button}; [`ComponentTheme`]{@api js:type:@arrai-innovations/vueda/use/useTheme#ComponentTheme}
- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md)

## Theme Override

A partial theme object, keyed by component name, that you pass through a component's `themeOverride` prop. `useThemeOverride` merges it with overrides from ancestors and provides the result to every descendant. It changes one subtree of the page.

- Names: [`themeOverride`]{@api js:property:@arrai-innovations/vueda/use/useTheme#THEME_OVERRIDE_PROPS}; [`useThemeOverride`]{@api js:function:@arrai-innovations/vueda/use/useTheme#useThemeOverride}
- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md#instance-usethemeoverride)

## Theme Registry

The active theme: a JavaScript object that maps each component name to its {@term Theme Key} entry. Each themed component adds its default entry with `patchTheme` when its code loads. `patchTheme` merges your changes into the registry, and `setTheme` replaces the whole registry.

- Names: [`patchTheme`]{@api js:function:@arrai-innovations/vueda/use/themeRegistry#patchTheme}; [`setTheme`]{@api js:function:@arrai-innovations/vueda/use/themeRegistry#setTheme}; [`getTheme`]{@api js:function:@arrai-innovations/vueda/use/themeRegistry#getTheme}; [`ThemeObject`]{@api js:type:@arrai-innovations/vueda/use/useTheme#ThemeObject}
- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md#how-the-theme-is-registered)

## Theme Slot

One named element of a {@term Theme Key}, such as `root` or `thumb`, that receives its own classes. Vue slots, which pass template content into a component, are a separate feature.

- Names: example [`_ButtonBase.root`]{@api theme-key:\_ButtonBase.root}; [`useTheme`]{@api js:function:@arrai-innovations/vueda/use/useTheme#useTheme}
- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md#how-the-layers-interact)

## Theme Token

A CSS custom property defined in the default theme's `base.css`, such as `--primary` or `--vueda-control-height`. Theme classes read their values from tokens. Overriding a token after the `base.css` import changes every component that uses it.

- Names: [theme tokens index]{@api theming:tokens}; examples [`--primary`]{@api css-token:primary} and [`--vueda-control-height`]{@api css-token:vueda-control-height}
- Described in: [Theming and Customization](../core-concepts/theming-and-customization.md#brand-css-token-overrides)

## Tone and Emphasis

The two design axes of a `Button`. Tone is the color role (`neutral`, `primary`, `destructive`); emphasis is the structure (`fill`, `outline`, `ghost`, `link`). Each pair maps to one button {@term Composition Primitive}.

- Names: [`tone`]{@api vue:component:Button:prop:tone}; [`emphasis`]{@api vue:component:Button:prop:emphasis}; [`resolveButtonVariant`]{@api js:function:@arrai-innovations/vueda/controls/button/buttonVariant#resolveButtonVariant}; [`actionTone`]{@api js:function:@arrai-innovations/vueda/utils/actionVariant#actionTone}; [`resolveActionVariant`]{@api js:function:@arrai-innovations/vueda/utils/actionVariant#resolveActionVariant}
- Described in: [Buttons](../reference/components/buttons.md#choosing-tone-and-emphasis)

## Transition

A workflow operation that moves an object from one of its source states to a target state. Its `code` identifies it in API requests and client routes, and its `name` is display text.

- Names: [`Transition`]{@api py:class:vueda.workflow.models.Transition}; [`Transition` schema]{@api rest:schema:Transition}; [`PATCH execute-transition/{object_id}/`]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/}; [`executeTransition`]{@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition}; `transition_code`
- Described in: [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md)

## Transition Permission

A row that names one permission a user must hold to execute one transition. The user must hold every permission the rows name, checked against the object so {@term State Permission} rules apply. A transition with no rows denies every user, superusers included; this is server enforcement.

- Names: [`TransitionPermission`]{@api py:class:vueda.workflow.models.TransitionPermission}; [`check_transition_permission`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.check_transition_permission}
- Described in: [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md#transition-permission-gates)
- Upstream: [Django: `PermissionsMixin.has_perms`]{@api ext:django:django.contrib.auth.models.PermissionsMixin.has_perms}

## Two-Factor Authentication

A second sign-in step that asks for a one-time code from an authenticator app, SMS, or email. VUEDA stores each method a user registers as a `TOTPDevice`. The server requires the code; the client routes to the `2fa` page when the server asks for it.

- Names: [`TOTPDevice`]{@api py:class:vueda.user.models.TOTPDevice}; [`storeUser.twoFactorAuthenticate`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.twoFactorAuthenticate}; [2FA endpoint]{@api rest:endpoint:POST:/vueda.user/2fa/authenticate/}; `TWO_FACTOR_AUTHENTICATION_OPTIONS`
- Described in: [Build Auth Views](../guides/build-auth-views.md#route-two-factor-sign-in)

## Valid Transitions

The `valid_transitions` field on a workflow model's object payload: the transitions from the object's current state whose {@term Transition Permission} the user holds. The detail view reads it for its transition buttons.

- Names: `valid_transitions`; [`AvailableTransitionField`]{@api py:class:vueda.workflow.fields.AvailableTransitionField}; [`available_transitions`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.available_transitions}
- Described in: [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#ui-affordance-filtering-layers)

## VDQ (VUEDA Dispatch Queue)

VUEDA's Django app for queued outbound email and SMS. Each message to one receiver is a {@term Queue Item} with a workflow state. Celery workers send it, and provider callbacks record the delivery result.

- Names: [`vueda.vdq`]{@api py:module:vueda.vdq}
- Described in: [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md)
- Upstream: [Celery: `Celery`]{@api ext:celery:celery.Celery}

## View Field Lists

The three field lists a {@term Model Config} holds for each view. `displayFields` is what the view shows, `fetchFields` what it requests in `f`, and `submitFields` what a save sends. {@term Model Info} supplies their defaults.

- Names: [`displayFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.displayFields}; [`fetchFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fetchFields}; [`submitFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.submitFields}
- Described in: [Configure `list`/`read`/`create`/`update` Views](../guides/configure-crud-views.md#baseline-config-from-model-info)

## Visual Contract

What a component page guarantees stays true after a re-skin: how the component's parts compose, and what its states and emphasis levels mean. The current {@term Skin} values come from the theme keys and theme tokens each page links.

- Described in: [Components](../reference/components/index.md)

## VUEDA Model

A Django model built on `VuedaModel` or `Lookup`, VUEDA's abstract model bases, or on a subclass of either. Only a VUEDA model carries a {@term Formatted Name} and a {@term Feature Policy}.

- Names: [`VuedaModel`]{@api py:class:vueda.core.models.VuedaModel}; [`Lookup`]{@api py:class:vueda.core.models.Lookup}; [`FormattedNameBaseModel`]{@api py:class:vueda.core.models.FormattedNameBaseModel}; [`supports_vueda_feature_policy`]{@api py:function:vueda.core.models.supports_vueda_feature_policy}
- Described in: [Model Feature Policy](../core-concepts/model-feature-policy.md#which-models-carry-policy)
- Upstream: [Django: `Model`]{@api ext:django:django.db.models.Model}

## Warning Confirmation

The step that holds a write until the user confirms its advisory warnings. The server answers an unacknowledged write with `409 Conflict`, the warnings, and a digest. The client resubmits with that digest in the `Acknowledge-Warnings` header.

- Names: [`gate_warnings`]{@api py:function:vueda.core.exceptions.gate_warnings}; [`ConfirmationRequired`]{@api py:class:vueda.core.exceptions.ConfirmationRequired}; [`ACKNOWLEDGE_WARNINGS_HEADER`]{@api py:property:vueda.core.exceptions.ACKNOWLEDGE_WARNINGS_HEADER}; [`WarningConfirmationMixin`]{@api py:class:vueda.core.viewsets.WarningConfirmationMixin}; [`ConfirmationRequiredError`]{@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError}
- Described in: [Error and Validation Contract](../core-concepts/error-and-validation-contract.md#warning-confirmation-semantics)

## Widget

The input control inside a {@term Form Field}, such as a text box or a select. VUEDA picks it from the form's `widgetComponents` prop, then the model config's `widgetComponents`, then the default type mapping, which `mergeDefaultFieldMappings` extends. A field that renders read-only uses its type's read-only widget, or `WidgetReadOnly`, and ignores those overrides.

- Names: [`useWidget`]{@api js:function:@arrai-innovations/vueda/use/useWidget#useWidget}; [`widgetComponents` prop]{@api vue:component:FormModel:prop:widgetComponents}; [`ModelConfig.widgetComponents`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.widgetComponents}; [`defaultFieldMappings`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#defaultFieldMappings}; [`mergeDefaultFieldMappings`]{@api js:function:@arrai-innovations/vueda/utils/fieldMappings#mergeDefaultFieldMappings}; [`WidgetReadOnly`]{@api vue:component:WidgetReadOnly}; [`WIDGET_PROPS`]{@api js:property:@arrai-innovations/vueda/use/useWidget#WIDGET_PROPS}; [`availableWidgets`]{@api js:property:@arrai-innovations/vueda/utils/formLookups#availableWidgets}
- Described in: [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui.md#field-and-widget-resolution)

## Wire Query Parameters

The short query parameter names VUEDA endpoints read. `f`, `e`, and `om` shape the fields; `s` searches; `o` orders; `p` and `ps` paginate; `ct` requests column totals. Server settings define the names, and the client holds matching constants.

- Names: [`FIELDS_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#FIELDS_PARAM}; [`EXPAND_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#EXPAND_PARAM}; [`OMIT_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#OMIT_PARAM}; [`SEARCH_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#SEARCH_PARAM}; [`ORDERING_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#ORDERING_PARAM}; [`PAGE_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#PAGE_PARAM}; [`PAGE_SIZE_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#PAGE_SIZE_PARAM}; [`COLUMN_TOTALS_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#COLUMN_TOTALS_PARAM}
- Described in: [Configuration Surface and Defaults](../core-concepts/configuration-surface-and-defaults.md#wire-query-parameter-namespace)
- Upstream: [DRF: `SearchFilter`]{@api ext:drf:rest_framework.filters.SearchFilter}; [DRF: `OrderingFilter`]{@api ext:drf:rest_framework.filters.OrderingFilter}

## Workflow

The states, transitions, initial state, and permission rows defined for one model's {@term Content Type}; each model has at most one. You build workflows in the workflow management views and ship them to other environments as {@term Workflow Migration} files.

- Names: [`Workflow`]{@api py:class:vueda.workflow.models.Workflow}; [`State`]{@api py:class:vueda.workflow.models.State}; [`InitialState`]{@api py:class:vueda.workflow.models.InitialState}
- Described in: [Manage Workflows and Generate Workflow Migrations](../guides/manage-workflows.md#workflow-management-ui)

## Workflow Migration

A Django migration that `makeworkflowmigrations` writes from the workflow changes recorded in history, so a workflow built in one database reaches other environments. It names records by code, app label, and model, since primary keys differ between databases.

- Names: [`makeworkflowmigrations`]{@api py:class:vueda.workflow.management.commands.makeworkflowmigrations.Command}; [`updateworkflowmigrations`]{@api py:class:vueda.workflow.management.commands.updateworkflowmigrations.Command}
- Described in: [Manage Workflows and Generate Workflow Migrations](../guides/manage-workflows.md#generating-workflow-migrations)
- Upstream: [Django: `RunPython`]{@api ext:django:django.db.migrations.operations.RunPython}

## Workflow Overlay

The effect of {@term State Permission} rules on a {@term Workflow-Enabled Model}. Object checks and list filtering grant or deny the same {@term CRUD} codenames by the object's workflow state. {@term Workflow Permission} and {@term Transition Permission} rows are separate gates on transitions. This is server enforcement.

- Names: [`StatePermission`]{@api py:class:vueda.workflow.models.StatePermission}; [`filter_rows_for_user`]{@api py:function:vueda.core.permissions.filter_rows_for_user}
- Described in: [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md#overlay-boundary-and-authority)

## Workflow Permission

A row that names one permission a user must hold to use a workflow's transitions. The user must hold every permission the rows name, and a workflow with no rows denies every user, superusers included. Groups receive these permissions as ordinary Django group permissions; this is server enforcement.

- Names: [`WorkflowPermission`]{@api py:class:vueda.workflow.models.WorkflowPermission}; [`check_workflow_permission`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.check_workflow_permission}
- Described in: [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md#transition-permission-gates)
- Upstream: [Django: `PermissionsMixin.has_perms`]{@api ext:django:django.contrib.auth.models.PermissionsMixin.has_perms}

## Workflow-Enabled Model

A {@term VUEDA Model} whose {@term Feature Policy} enables workflow, with `enabled = True` in `class Vueda.Workflow`. It needs a {@term Workflow} definition; without one, every workflow path raises `WorkflowNotConfiguredError`.

- Names: `class Vueda.Workflow`; [`workflow_enabled`]{@api py:function:vueda.core.installed_apps.workflow_enabled}; [`workflow_enabled` (model info)]{@api py:property:vueda.info.serializers.ModelInfoSerializer.workflow_enabled}; [`WorkflowNotConfiguredError`]{@api py:class:vueda.workflow.exceptions.WorkflowNotConfiguredError}
- Described in: [Model Feature Policy](../core-concepts/model-feature-policy.md#history-and-workflow)
