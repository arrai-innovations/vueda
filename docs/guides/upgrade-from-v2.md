---
title: Upgrade from VUEDA v2
type: how-to
audience: integrator
status: draft
---

# Upgrade from VUEDA v2

This guide moves a project from server v2.3.3 and client v2.0.4 to the v3 beta. Each step names a change that needs action in your project and links the page that explains the current behavior.

Upgrade the server and the client together. A v3 client cannot read the metadata that a v2 server sends, and a v2 client cannot read the v3 metadata. Neither side reports a metadata version, so a mismatch produces broken screens instead of a clear error.

## Before You Begin

- Take a full database backup.
- Archive the django-simple-history tables. The upgrade deletes them, and VUEDA does not copy their rows into the v3 history. [Archive v2 History](#archive-v2-history) lists the tables.
- Read [Assess v2 Security Exposure](#assess-v2-security-exposure). Several v2 defects need a review of existing data or accounts.
- Plan a test upgrade on a copy of the production database before you upgrade production.

## Archive v2 History

Server v2 recorded history in django-simple-history tables. VUEDA's nine workflow models wrote `vueda_workflow_historical*` tables. Your models wrote a `Historical*` table when they subclassed `VuedaHistoryBaseModel`, `SimpleHistoryModelMixin`, or `AbstractVUEDAUserWithHistory`, or when they declared `HistoricalRecords`.

Server v3 records history with django-pghistory event models. The `vueda_workflow` migration `0009` deletes the nine workflow history tables. When you run `makemigrations`, Django generates `DeleteModel` operations for your own `Historical*` tables. After the upgrade, history lists start empty, and an object's workflow state history starts at its next state change.

Export every `Historical*` table before you apply those migrations. A user history table from `AbstractVUEDAUserWithHistory` holds password hashes. Protect that export the same way you protect the user table. [#511](https://github.com/arrai-innovations/vueda/issues/511) tracks a conversion of v2 history rows into v3 events.

## Upgrade the Server

### Update Python, Django, and Dependencies

Server v3 requires Python 3.12 to 3.14, Django 6.1, and Django REST framework 3.18 or later. It installs from the public PyPI index as `vueda`. Remove any private index and source binding for `vueda` from your `pyproject.toml`. The beta is a prerelease, so opt in when you add it:

```bash
uv add --prerelease allow vueda
```

These dependencies changed:

- `django-simple-history` is no longer a dependency. Keep it as a direct dependency of your project while any of your migrations still import `simple_history`. Alternatively, edit those migrations to drop the import and the `HistoricalChanges` entry in each `bases=` tuple.
- `drf-flex-fields` became `drf-flex-fields2`. Rename the `REST_FLEX_FIELDS` setting to `REST_FLEX_FIELDS2`, and change `rest_flex_fields` imports to submodules of `rest_flex_fields2`. The package root of `rest_flex_fields2` exports nothing.
- `django-pghistory`, `django-pgtrigger`, and `channels` are new dependencies.
- `dj-rest-auth` moved to version 7 and `django-anymail` to version 15.
- Redis support is the `redis` extra. Install `vueda[redis]` when your cache is Redis.

### Update Settings

`get_defaults()` reads and sets these keys differently:

- **`CACHE_URL` replaces `REDIS_URL`.** Server v2 built a Redis cache from `REDIS_URL` with the key prefix `vueda-`. Server v3 builds `CACHES["default"]` from a required `CACHE_URL` and sets no prefix. Add `?key_prefix=vueda-` to a Redis `CACHE_URL` to keep existing sessions. Without it, the deploy signs every user out once. [Configure the Cache and Sessions](configure-cache-and-sessions.md) describes the backends.
- **`FRONTEND_DOMAIN` is a full origin.** Server v2 put `https://` in front of the value. Server v3 uses the value as written. Change `app.example.com` to `https://app.example.com`. Without the scheme, welcome and password-reset emails carry broken links.
- **`NO_REPLY_EMAIL` is required.** `get_defaults()` reads it at startup.
- **History middleware.** Remove `simple_history.middleware.HistoryRequestMiddleware` from any `MIDDLEWARE` list or ASGI stack that you build yourself. `get_defaults()` adds `vueda.history.middleware.VuedaHistoryMiddleware` after `AuthenticationMiddleware`. A hand-built `MIDDLEWARE` must add it at that position. The checks `vueda_history.W001` and `W002` report a missing or misplaced middleware.
- **Logging.** Remove references to the `ignore_validation_warnings` filter and to the `vueda.core.logging_filters` module. Neither exists in v3, and a reference fails at startup.
- **CORS.** If you replace `CORS_ALLOW_HEADERS`, add `acknowledge-warnings`. If you replace `CORS_EXPOSE_HEADERS`, add `retry-after`.
- **Throttle rates.** The `anon`, `user`, and `dj_rest_auth` rates are gone, and several auth rates are new. Override single keys of `DEFAULT_THROTTLE_RATES` instead of replacing the dictionary. [Rate-Limited Auth Endpoints](configure-cache-and-sessions.md#rate-limited-auth-endpoints) lists the rates and the proxy settings that identify a client address.
- **Anymail webhooks.** When `EMAIL_BACKEND` is the Mailgun backend, server v2 stored the webhook secret under a key that Anymail never read. Server v3 sets `ANYMAIL_WEBHOOK_SECRET` in that case, so Anymail now checks basic authentication on every webhook. Add `user:password@` credentials that match the secret to each Mailgun webhook URL. Without them, Anymail rejects tracking events, and queue items stay in `awaiting`. `get_defaults()` sets no webhook secret for other email backends, so set `ANYMAIL_WEBHOOK_SECRET` yourself when you use one.
- **Empty choices.** VUEDA no longer reads `EMPTY_CHOICE_LABEL` or `EMPTY_CHOICE_VALUE`. Remove them from your settings.

### Update Your Code

- **Base model.** `VuedaBaseModel` and `VuedaHistoryBaseModel` are now `VuedaModel`. `AbstractVUEDAUserWithHistory` is now `AbstractVUEDAUser`. No old name remains as an alias.
- **History classes.** `SimpleHistoryModelMixin`, `VuedaHistoryViewSet`, `VuedaHistorySerializer`, `SimpleHistoryViewSetMixin`, `SimpleHistorySerializerMixin`, `HistoricalRecordField`, and `create_historical_record` are removed. Remove them from your models, serializers, and viewsets. A `VuedaModel` subclass records history without a mixin, and every `VuedaViewSet` for a tracked model serves `history-list`. Code that read `instance.history` must query the model's event model. [Find the Event Model for a Tracked Model](purge-model-history.md#find-the-event-model-for-a-tracked-model) shows how.
- **History policy.** Every `VuedaModel` subclass records history unless it opts out. Composite primary key models must opt out. History never records `password`. [History and Workflow](../core-concepts/model-feature-policy.md#history-and-workflow) describes the policy and its options. Run `makemigrations`, review the generated event models and triggers, and exclude noisy fields such as `last_login`.
- **Writes outside a request.** Wrap writes in management commands and scripts in `audited_action(..., kind="command")` so that `audited_action` groups their history into one action.
- **Workflow opt-in.** `HasWorkflowModelMixin`, `HasWorkflowSerializerMixin`, `HasWorkflowViewMixin`, `HasWorkflowViewSetMixin`, and `HasWorkflowFilterSetMixin` are removed. Declare `class Vueda.Workflow: enabled = True` on the model instead. VUEDA then adds the workflow fields, the `workflow_state` filter, and the permission overlay. [History and Workflow](../core-concepts/model-feature-policy.md#history-and-workflow) describes the options.
- **Default manager.** `FormattedNameManager` is the default manager of every VUEDA model. A custom `objects` manager must subclass it or use `FormattedNameManager.from_queryset(...)`. For a model that declares `formatted_name_lookup_expression`, `Model.objects.values()` without arguments now includes `formatted_name`.
- **Model info hook.** `get_expandable_fields()` is removed, and VUEDA silently ignores a v2 override. Override `get_expand_model_info(self, expands)` instead. [Correct an Expand Descriptor](customize-model-info-metadata.md#correct-an-expand-descriptor) shows the hook.
- **Validation warnings.** `VuedaValidationError(..., is_warning=True)` is removed. Return warnings from `VuedaSerializer.get_warnings()`, or from the viewset's `get_warnings_for_object` and `get_warnings`. The client confirms them through a `409` response. [Require Confirmation Before a Write](require-write-confirmation.md) covers each hook.
- **Column totals.** `column_totals` is a mapping from the client column name to an ORM path. Rewrite each v2 list as a mapping. `get_column_info` takes `(self, queryset, requested_column_totals=())`. The server computes totals only for the names that the request sends in `ct`. [Expose Aggregates in `list` Responses](list-column-totals.md) describes the contract.
- **Extra query parameters.** `get_extra_allowed_fields` is an instance method. An override must extend the result of `super()`. Otherwise, the server rejects `ct`.
- **Search through many-valued relations.** De-duplicated search builds its subquery from the viewset's `get_search_queryset()` when the viewset defines one. Otherwise, it uses the model's default manager. A `search_fields` entry that names an annotation from `get_queryset()` needs a `get_search_queryset()` that adds it. The check `vueda_info.E014` reports the problem. [Search Through a Many-Valued Relation](../core-concepts/filtering-and-ordering-semantics.md#search-through-a-many-valued-relation) explains the hook.
- **Nested writes.** A nested write to a forward foreign key, one-to-one, or many-to-many relation now runs the related model's viewset permissions. Register a canonical viewset for each related model that a nested write changes, and grant create or update on it. [Set Up Permissions for Related Rows](nested-writable-inlines.md#permissions-for-related-rows) lists the steps.
- **Permission name mapping.** `PERMISSION_NAMES_MAPPING` accepts only two values: the default mapping, and the mapping to Django's names, `{"create": "add", "update": "change", "read": "view", "list": "view"}`. The check `vueda_core.E018` reports any other value. [Map Django and VUEDA Permission Names](permission-name-mapping.md) covers both values.
- **File and image fields.** Model `FileField` and `ImageField` columns serialize as `{name, url}`. Declare a stock DRF `FileField` or `ImageField` on the serializer to keep a plain URL string for one field.
- **Unhandled exceptions.** VUEDA's exception handler now rolls back the request transaction when it answers an unhandled exception with `500`. Server v2 committed the writes that a custom view made before it raised. A custom view that must keep such a write must make it outside the request transaction.

### Run the Migrations

Read these warnings before you run any migration command:

::: danger
Do not apply a workflow migration that v3 generates to a database upgraded from v2. Each generated workflow migration checks every object's state history. It moves an object back to its workflow's initial state when its state history shows no change since the object's creation. Object states carried over from v2 have no history in v3. The migration therefore resets every object that v2 moved out of its initial state. [#512](https://github.com/arrai-innovations/vueda/issues/512) tracks the fix.
:::

::: warning
Do not reverse a workflow migration that v2 generated. Its reverse code deletes the object states of every workflow, including workflows that the migration did not create. `updateworkflowmigrations` does not rewrite these files.

Test a full replay of your migrations on an empty database before you deploy. A v2-generated workflow migration looks up the `Historical*` workflow models, which `vueda_workflow` `0009` deletes. When your dependency graph lets `0009` run first, the replay fails. [#510](https://github.com/arrai-innovations/vueda/issues/510) tracks a supported path for these files.
:::

1. Run `python manage.py updategroupmigrations` before you apply v2-generated group migrations in another environment. The v2 replay code deleted a group, with its memberships, when the group lost its last permission. The command rewrites that code. [Updating Existing Group Migrations](manage-groups.md#updating-existing-group-migrations) describes it.
2. Run `makemigrations` and review the result. Expect event models and triggers for each tracked model, and `DeleteModel` operations for each `Historical*` table.
3. Review the migration plan with `python manage.py migrate --plan`. On an empty database, check that every workflow migration that v2 generated runs before `vueda_workflow` `0009`. On the database that you upgrade, check that the plan holds no workflow migration that v3 generated.
4. Apply the migrations.
5. Run `python manage.py check --database default`. If `vueda_workflow.W002` reports models with rows that have no workflow state, run `python manage.py backfillworkflowstates`. [Enabling Workflow on a Model with Existing Rows](manage-workflows.md#enabling-workflow-on-a-model-with-existing-rows) explains the check.
6. Run `python manage.py remove_stale_contenttypes`. The deleted `Historical*` models leave content types behind, and the permission pickers keep offering their permissions until you remove those content types.

### Fix What the System Checks Report

Server v2 registered no system checks. Server v3 registers checks in `vueda_core`, `vueda_info`, `vueda_history`, and `vueda_workflow`. An error stops `runserver` and `migrate`. Run `python manage.py check` and fix each finding. The checks that v2 projects most often hit are:

- `vueda_core.E018`: an unsupported `PERMISSION_NAMES_MAPPING`.
- `vueda_info.E006`: a viewset `ordering` or `ordering_fields` entry that names no field.
- `vueda_info.E009`: a default manager that cannot annotate `formatted_name`.
- `vueda_info.E010`: a class-level `queryset.order_by()` that disagrees with the declared ordering.
- `vueda_info.E013`: a column total path that crosses a reverse or many-to-many relation, or that ends on a field that cannot be summed.
- `vueda_info.E014`: a search annotation that the search queryset lacks.

`vueda_info.E006` and `E013` also reject paths that end in a transform, such as `created__year`. Server v2 accepted those. Until [#494](https://github.com/arrai-innovations/vueda/issues/494) lands, declare an annotation for such a path, or silence the check.

### Review Authorization Changes

Several v2 permission paths admitted requests that v3 refuses. Before you deploy, grant the permissions below so that users keep their access:

- **`HEAD` requests** need the permission that the matching `GET` needs. Server v2 required none. [Required Codename per Request](../reference/permissions.md#required-codename-per-request) lists the rules.
- **State permission rows no longer bypass model permissions.** In v2, a viewset that used `HasWorkflowViewMixin` skipped its model permission checks whenever the model's workflow had any `StatePermission` row. That covered list, create, and other actions that do not fetch one object. In v3, a state grant admits a request only when it matches the user's group and the requested permission. It then admits only rows in the granted states, and create always needs the model permission. For each group that used such a viewset, decide which access it should keep. Grant a model permission only where the group should reach rows in every state. [Model-Scope Deferral and Later Decisions](../core-concepts/workflow-permission-overlay.md#model-scope-deferral-and-later-decisions) explains the rules.
- **Conflicting state rules resolve to deny.** In v2, the outcome depended on row order.
- **A workflow needs `WorkflowPermission` rows.** In v2, any `StatePermission` row on a workflow skipped the workflow permission check. A workflow that has `StatePermission` rows but no `WorkflowPermission` rows now refuses every transition, for superusers too.
- **Transitions need object `read`.** Transition discovery and execution require the `read` permission on each target object. `read_workflow` alone no longer lets a user list or run an object's transitions. [Which Gate Each Workflow Endpoint Applies](../core-concepts/workflow-permission-overlay.md#which-gate-each-workflow-endpoint-applies) lists every endpoint.
- **Field choices for serializer-only fields** require `read` on the serializer's model. A related field also requires `list` on the related model. Server v2 served these choices to any caller, including anonymous ones.
- **Filter choices** come only from rows that the user may list.

### Update API Consumers

The VUEDA client handles these changes. Update any other client or integration that calls the API:

- Ordering terms and filter names that cross a relation use dots: `?o=-customer.name`, not `customer__name`. An invalid ordering term answers `400`. [Public Filter Names](../core-concepts/filtering-and-ordering-semantics.md#public-filter-names) describes the names.
- An unrecognized query parameter answers `400` on `list` and `retrieve`. Server v2 answered `500` on a filtered `list` and ignored the parameter elsewhere. `retrieve` accepts only `e`, `f`, and `om`.
- `f` and `om` shape only the response on writes. A `POST` or `PUT` must include every required field. [Sparse Fields and Expand on Writes](../core-concepts/field-and-expand-semantics.md#sparse-fields-and-expand-on-writes) states the rule.
- An `e` path deeper than 4 levels answers `400`.
- Object responses include `available_actions` only when `f` names it.
- `model_ordering` is an object with `default` and `fields`. `model_filtering` reports dotted names. Filter choices have no empty option, and their values are strings.
- Invalid `f` and `e` names come back as plain strings in the error list.
- A nested write matches child primary keys only among the parent's own children. A v2 client that moved a child to another parent by sending its key under the new parent now creates a new row. To move a child, update its foreign key through the child's own endpoint.
- `model_filtering` reports `AllValuesChoiceField` and `AllValuesMultipleChoiceField` as the `type_filter` of value-derived filters, where v2 reported `ChoiceField` and `MultipleChoiceField`.
- `vueda.user/_allauth/` is no longer mounted. Recovery codes are at `vueda.user/2fa/recovery-codes/`.
- The who-is response carries `auth_pending_flow` in place of `recently_logged_in`.
- VUEDA routes `vueda.user/forgot-password/` and `vueda.user/reset-password/`. Remove your own routes for those views. Both answer `204` on success, and forgot-password answers `204` for every well-formed address. Errors that are not about one field carry `detail` in place of v2's `result` and `message`. Field errors stay keyed by field name.
- History responses group events by user action. Workflow `valid_transitions` entries are `{code, name}` objects.
- The workflow object-state and execute-transition responses carry `object_state_revision`, a string, in place of the integer `current_history_id`. Object and who-is responses no longer carry `current_history_id`. History-tracked objects carry `object_revision` instead.
- Workflow state history moved from `object-history/<app_label>/<model>/<object_id>/` (URL name `get-object-history`) to `vueda.history/workflow-state-history/<app_label>/<model>/<object_id>/` (URL name `workflow-state-history`). `vueda.history.urls` carries its own prefix, so include it at `""` in your routes. [Wire Up Workflow URLs](../tutorials/add-workflow.md#wire-up-workflow-urls) shows the include.
- Debug-only pages moved under the app prefixes: `vueda.user/dev-login/`, `vueda.user/dev-logout/`, `vueda.user/permissions/`, and `vueda.workflow/`. The URL names `local-login` and `local-logout` are now `dev-login` and `dev-logout`.

## Upgrade the Client

### Update Dependencies and the Build

The client installs from the public npm registry as `@arrai-innovations/vueda`. Point the `@arrai-innovations` scope at the public registry, and name the `beta` tag when you add it:

```bash
pnpm add @arrai-innovations/vueda@beta
```

- Remove the peers that v3 no longer uses: `primevue`, `@primeuix/themes`, `quill`, `@floating-ui/vue`, `@arrai-innovations/pro-duotone-svg-icons`, and `@arrai-innovations/vue-fontawesome`.
- Install `@arrai-innovations/vue-sonner` 2.0.11 or later. Import `toast` from it, not from upstream `vue-sonner`.
- Raise `@arrai-innovations/reactive-helpers` to 25 and `@vueuse/core` to 14. Both have breaking changes of their own.
- Use Node 22 or later. The package does not declare this requirement, so a package manager does not warn about an older Node.
- Install Tailwind CSS 4 and `@tailwindcss/vite`.
- Spread `vuedaViteConfig()` into your Vite config, and pass your `src` directory as `extraAliases["@"]`. Without that alias, VUEDA does not find convention-named action views. [View Component Resolution Order](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order) describes the lookup.

[Client Plugin Prerequisites](client-plugin-prerequisites.md) lists the setup that each package needs.

### Replace PrimeVue Setup

VUEDA's controls are its own, built on Reka UI. Remove PrimeVue setup that existed only for VUEDA: `app.use(PrimeVue)`, the preset, `setPrimeVuePreset`, `warningsPrimeVueConfig`, and `ToastService`.

- Import `@vueda/theme/vueda-tailwind/base.css` after `tailwindcss` in your stylesheet. Dark mode follows a `.dark` class on an ancestor.
- Mount `<Sonner />` once. Without it, VUEDA's toasts do not render. `requireGroups` accepts the v2 toast options, but passing the PrimeVue severity `secondary` or `contrast` now throws.
- Register icons. The icon registry starts empty. Call `installFontAwesomeFreeIcons()` and install the Font Awesome Free packages, or register your own icon components with `setIcons`.
- Remove `pt`, `mergeSections`, and `mergeProps` from `widgetProps` and `fieldProps`.
- Rewrite slot overrides that render PrimeVue components or read PrimeVue slot props such as `severity` and `verb`.

### Move the Page Title and Sticky Bars to the Layout

Views register their title with `usePageTitle()`, and the root layout renders it. Call `usePageTitle()` in your root component. Wrap `<RouterView>` in `<StickyStackProvider>` and put `<PageTitle />` in its `top` slot. Remove per-page `<PageTitle title="...">` components. [Place the Page Title and Page Actions](place-page-title-and-actions.md) shows the layout.

### Update Imports

The `@vueda/components/` and `@vueda/fields/` folders no longer exist. Components moved into family folders:

| Components                                                                                                                                     | Folder                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `ActionForm`, `AuthForm`, `AuthorizingForm`, `ModelActionForm`                                                                                 | `@vueda/views/`                                                 |
| `FormModel`, `FieldRenderer`                                                                                                                   | `@vueda/form/form-model/`                                       |
| `FieldSetMany`, `FieldSetRange`, `FieldSetSingularStackedInline`, `FieldSetStackedInline`, `FieldSetStackedInlineRow`, `FieldSetTabularInline` | `@vueda/form/field-set/`                                        |
| `FilterForm`, `FilterGroup`                                                                                                                    | `@vueda/form/filter/`                                           |
| `ObjectsGrid` and its cell and header components                                                                                               | `@vueda/objects-grid/`                                          |
| `PageTitle`, `StickyBar`                                                                                                                       | `@vueda/shell/page-title/`, `@vueda/shell/sticky/`              |
| `NavigationItem`, `LinkModelView`                                                                                                              | `@vueda/navigation/item/`, `@vueda/navigation/link-model-view/` |
| `ClickToCopyText`, `DateTimeDisplay`, `DateRangeDisplay`, `ErrorDisplay`, `LoadingSpinnerBlock`, `LoadingSpinnerInline`                        | Folders under `@vueda/display/`                                 |
| `EmptyComponent`, `LazyRender`                                                                                                                 | `@vueda/support/`                                               |

These components are removed:

| Removed                                                               | Use instead                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `DetailedView`                                                        | `DetailView`                                                     |
| `FilterComponent`                                                     | `FilterMenu`, `FilterChip`, and `FilterFieldForm`                |
| `MobileSortComponent`                                                 | `SortControl` with `SortGroup` and `SortChip`                    |
| `PaginationComponent`                                                 | `PaginationFooter`                                               |
| `FormChores`, `FormFeedback`, `FormHelpText`, `FormHiddenFeedback`    | The field shell components and `FormMessage`                     |
| `NavigationDisplay`                                                   | `useNavigation` with `NavigationItem`, or the sidebar components |
| `ViewWorkFlowTransition`                                              | `ViewExecuteTransition`                                          |
| `Field<Type>` components such as `FieldString` and `FieldDate`        | `FormField` with `fieldProps`                                    |
| `storeCollapseNav`                                                    | `SidebarProvider` with `v-model:open`                            |
| `useWarnings`, `useSearchableSelect`, `useObjectsWorkflowTransitions` | None                                                             |

The widgets that wrapped PrimeVue controls have new names:

| Field type                    | v3 widget                                      |
| ----------------------------- | ---------------------------------------------- |
| `CharField`                   | `WidgetTextInput`                              |
| `TextField`                   | `WidgetTextTextarea`                           |
| Number fields                 | `WidgetNumberInput`                            |
| `DateField`, `DateTimeField`  | `WidgetDateField`                              |
| `TimeField`                   | `WidgetTimeField`                              |
| Date ranges, `TimeRangeField` | `WidgetDateRangeField`, `WidgetTimeRangeField` |
| Relations                     | `WidgetCombobox`                               |
| Choices                       | `WidgetSelectDropdown` or `WidgetRadioGroup`   |
| `BooleanField`                | `WidgetToggle`                                 |
| `JSONField`                   | `WidgetJson`                                   |

Rename `widgetComponents` entries, `mergeDefaultFieldMappings` registrations, and direct imports. Recheck every custom `widgetProps`, because the PrimeVue props such as `showTime` no longer apply. A `fieldComponents` or `widgetComponents` string that names an unregistered component now shows an error in place of the field.

### Update Theme Overrides

`setTheme`, `patchTheme`, `getTheme`, `mergeTheme`, and `useTheme` keep their v2 names, and a theme entry still maps a component's slots to classes. Use `overrideTheme` for project changes. Unlike `patchTheme`, it does not depend on module load order. [How the layers interact](../core-concepts/theming-and-customization.md#how-the-layers-interact) explains the order.

- `ViewList` drops `variant` and its `*Class` props, and `ObjectsGrid` drops its `*Class` props. `DetailView` has no `outerClass`. Style the region around its form through the `body` slot of its theme entry. Move each one to a `themeOverride` prop or to an `overrideTheme` entry. `ViewCreate` and `DetailView` keep `variant` and `formModelVariant`, which select a model config variant.
- Theme keys and slot names changed with the components. Retarget each v2 patch at the current key.
- `mergeTheme` throws when it receives fewer than two layers. Write a variable-length merge as `mergeTheme({}, ...layers)`.
- `themeOverride` accepts only an object.

### Update Routes

- **`makeCRUDRoutes` redirects.** Pass `actionRedirect`, pointing at a route that `requireModelInfo` does not guard. Pass `groupsRedirect` whenever `groups` contains a group. `makeCRUDRoutes` throws without them.
- **`routeActions` takes effect.** The v2 guard read a key that model config never set, so `routeActions` had no effect in v2. In v3, it limits which action routes open. Audit every `routeActions` you set. It uses canonical action names, so list `retrieve`, not `read`. [Limit Which Routes Open](configure-crud-views.md#limit-which-routes-open) shows the setting.
- **Transitions route by code.** Link to a transition by its `code`. Rename any transition code that equals a `crudComponents` key.
- **Multi-object routes repeat `pk`.** Write `?pk=4&pk=7`, not `?pk=4,7`. Bookmarks in the old form select one key named `4,7`. `getCRUDForTo` throws when the forwarded `query` already contains `pk`.
- **Guard renames.** `waitForInitialising` is now `waitForCurrentUser`, and `requireInitialized` is now `requireCurrentUser`.
- **Guard placement.** The CRUD checks run from a global `beforeEach`, and the route records have no `beforeEnter`. Move code that extended `beforeEnter` into your own guard.
- **Auth routes.** Define routes named `sign-in`, `reauthenticate`, `2fa`, and `welcome`. The auth composables navigate to those names.
- **Custom action views.** VUEDA keeps a custom view mounted across app, model, and `pk` changes when the resolved component stays the same. Watch those props instead of reading them once at setup.

### Update Model Config and Metadata Reads

- `storeModelInfo` camelCases top-level keys and expand descriptor keys: `appLabel`, `verboseName`, `verboseNamePlural`. Rename reads, fixtures, and seeded store data. [Client Normalization](../core-concepts/server-client-metadata-contract.md#client-normalization) lists the rules.
- `expand` defaults to an empty list. Add each relation that a view must embed to that view's `expand`. A list view also needs the relation in the viewset's `permit_list_expands`. A form that must edit a relation inline needs the relation in `expand`. When the viewset sets `permit_<action>_expands` for the form's action, the relation must be in that list too.
- Model config throws when `expand` names an undeclared expand, or when a dotted field entry needs a relation that `expand` omits.
- Keys for expanded subfields use dots: `employee.name`, not `employee__name`. This applies to `fieldComponents`, `widgetComponents`, `fieldProps`, `widgetProps`, `columnComponents`, `sortables`, `filterableDetails`, and slot names such as `field(employee.name)`.
- Default field lists differ per view, and they leave out hidden fields. By default, `submitFields` holds writable fields, and the create view shows writable fields. [Choose Each View's Field Lists](configure-crud-views.md#choose-each-view-s-field-lists) describes the defaults.
- `submitFields` limits the request body. Name every value that the form must send, including values that a custom widget sets without an input. `fetchFields` sets the `f` parameter of a save request.
- `sorted` starts from the server's default ordering. Pass `sorted: []` to start unsorted.

### Update Forms

- Replace `Field<Type>` components with `FormField`.
- Warnings use a confirmation step. Remove `setUsingWarnings` calls. A custom create or update shell built on `useObjectForm` must render `FormConfirmDialog` bound to `objectForm.confirmation`. Without it, a save that returns warnings resolves as cancelled.
- A custom CRUD adapter reports field errors by throwing a `ServerFeedbackError` subclass. A submission error that the form does not recognize becomes `objectForm.state.error`.
- Saves with files send a multipart body with a manifest. A custom DRF view that receives those saves must list `NestedMultipartMixin` before its DRF base class. [Multipart Saves](../core-concepts/crud-adapter-layer.md#multipart-saves) describes the format.
- File and image widgets read the `url` of a `{name, url}` value.
- `WidgetDuration` takes a duration string. With the `seconds` prop, it takes a number of seconds.
- Read-only fields render formatted values. The `widget(<name>)default` slot receives `rawValue` for code that needs the stored value.
- A custom `redirectTo` on `ActionForm` that stays on the form after a success must return or resolve `false`. The form treats any other result as navigation away and keeps its buttons disabled. [What an Action Form Does on Pre-Flight, Submit, and Cancel](transition-ux-and-redirects.md#what-an-action-form-does-on-pre-flight-submit-and-cancel) describes the contract.
- Save buttons read "Create" and "Update". Update tests that find "Submit".
- The `escapeHtml` export is removed. Send markup unencoded when it should render.
- Saved inline rows offer a delete checkbox whenever the inline is writable. The parent update deletes omitted children and does not check a child destroy permission. To stop users with parent `update` from removing children, validate the child list on the server.

### Update List Views

- `FilterGroup` takes the array of active filters as its `v-model`. `filterables`, `filterableDetails`, and `validFilterables` are required props.
- `ViewList` drops `filterFormsValues`, `allowShowAllPages`, and `alwaysShowAllPages`. Its `filter-change` event is now `filtered`, and it emits once with a live ref.
- `ViewList` opens at 25 rows unless the user saved another size, and sends that size as `ps`. The server's `PAGE_SIZE` no longer applies. Pass `defaultPageSize` to start at another size, or `defaultPageSize="all"` where a model used `alwaysShowAllPages`. Keep page size options at or below the server's `MAX_PAGE_SIZE`.
- `ObjectsGrid` has no sorting props. Sort with `SortControl` and `SortGroup`. Replace `girdType` slot checks with `isTableLayout` and `isCardLayout`.
- `ViewList` writes a sort that the user picks to the URL as `o`.
- Columns render through typed adapters: foreign keys as links, and dates, booleans, durations, and JSON through their own adapters. Set `columnComponents: { <column>: "ColumnText" }` to keep plain text. [Customize List Column Rendering](customize-list-column-rendering.md) covers the adapters.
- The filter menu offers only filter types that the client can render. Register a missing type with `mergeFilterFieldMapping`. [Custom Filter Types](../core-concepts/filtering-and-ordering-semantics.md#custom-filter-types) describes the mapping.
- A project-registered `list` adapter must pass `repeatedParams` to `makeSearchParamsString`. A custom bulk delete adapter must accept `formData` and treat a dry-run `200` as success.
- The client ignores saved sorts and filters that use `__` names, so users see the defaults once.

### Update Auth and Store Code

- `storeUser.pendingFlow` is now `authPendingFlow`, a string. Replace `recentlyLoggedIn` with `loggedIn && !authPendingFlow`. Replace `init()` with `waitForCurrentUser(pinia)`. `initialized` and `initializingPromise` are removed.
- `AuthForm` sends a user with a pending reauthentication to the `reauthenticate` route as soon as the form opens. Set `requireRecentAuth` to `false` on an `AuthForm` whose action does not need a recent sign-in.
- Users with a two-factor device reauthenticate with a code. Mount `ViewReauthenticate` at the `reauthenticate` route. [Build a Re-Authentication View](build-auth-views.md#build-a-re-authentication-view) covers it.
- `setUsingVuedaWorkFlow` and `getUsingVuedaWorkFlow` are now `setUsingVuedaWorkflow` and `getUsingVuedaWorkflow`.
- `storeWorkflow` drops `fetchObjectState`, `fetchObjectTransitions`, `fetchModelStates`, and `initializeObjectTransitions`, and the `objectStates`, `objectTransitions`, and `modelStates` caches. Read an object's state from its `workflow_state_code` and `workflow_state_name` fields, and its transitions from `valid_transitions`. A transition response carries the new state. Nothing replaces the list of a model's states.
- The custom URL key `workflowObjectHistory` is now `historyWorkflowStateHistory`, and its value is a full template with `:app`, `:model`, and `:pk`. Update each `setCustomUrl` call for that key.
- `ViewHistoryList` field names changed from `history_*` to `recorded_at`, `actor`, `kind`, `label`, `model`, `relation`, `type`, `field`, `old`, and `new`. Its slots follow the new names. [ViewHistoryList](../reference/components/action-workflow.md#viewhistorylist) lists them.

## Assess v2 Security Exposure

v3 fixes these v2 defects. Each one may need a review of data or accounts that v2 created:

- **Public signup.** Server v2 mounted every allauth headless route, including `vueda.user/_allauth/browser/v1/auth/signup`. Anyone could create an account and get a signed-in session. Review accounts that nobody on your side created. Server v3 does not mount the allauth routes. Do not mount allauth's signup route yourself: VUEDA's account adapter leaves signup open, so a mounted signup route accepts new accounts.
- **Nested writes across parents.** Server v2 looked up nested child rows by primary key across the whole child table. A user who could update one parent could move another parent's child row into it and change it. Review child rows whose parent changed.
- **Nested writes to related models** skipped the related model's permissions.
- **State permission bypass.** On a viewset that used `HasWorkflowViewMixin`, any `StatePermission` row on the model's workflow let every authenticated user pass the model permission checks. That covered list, create, and other actions that do not fetch one object. The workflow endpoints skipped their model check in the same case. Transitions also ignored object `read`.
- **Password hashes in history.** `AbstractVUEDAUserWithHistory` recorded password hashes, and the v2 history endpoints and `history` expand could return them to anyone who could read the user.
- **Forgot-password enumeration.** Server v2 answered "Email not found" for unknown addresses.
- **`HEAD` requests** skipped read permission, so the status code revealed which primary keys exist.
- **Choices.** Serializer-only field choices had no permission check, and filter choices came from every row.
- **Two-factor changes** accepted a password-only reauthentication.
- **Two-factor device deletion.** A bulk delete of a user's own devices compared the number of devices deleted with the number of keys sent. A repeated or unknown key could turn off two-factor authentication while the user still had devices. It could also leave two-factor authentication on with no device left. Only the user's own recent session could send such a request. Review accounts whose two-factor state does not match their devices.
- **Rate limits.** Code sends and password changes had no limit. Forgot-password had only a one-minute cooldown for addresses with an account.
- **Anymail webhooks.** On the Mailgun backend, the tracking endpoints of providers other than Mailgun accepted unauthenticated events.
- **Group migrations** deleted a group, with its user memberships, when it lost its last permission.
- **Client caches** kept the previous user's metadata, choices, and workflow data after a sign-out without a page reload. The server still checked every request.

## Verify the Upgrade

- `python manage.py check` reports no errors.
- A fresh database replays every migration.
- A user from each group that uses the application can sign in, open its lists and forms, and save.
- Users with two-factor devices can sign in and reauthenticate.
- Workflow transitions appear and run for the groups that should have them.
- History lists show a change made after the upgrade.
- The browser console shows no unregistered-component, unmapped-filter, or route warnings.
