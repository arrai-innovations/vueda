---
title: Configure `list`/`read`/`create`/`update` Views
type: how-to
audience: integrator
status: draft
---

<script setup>
import { orderScenario } from "../.vitepress/theme/fixtures/showcaseOrder.js";

const order = orderScenario();
</script>

# Configure `list`/`read`/`create`/`update` Views

The built-in {@term CRUD} views render from {@term Model Info}, so a registered model starts with working `list`, `read`, `create`, and `update` pages. When one view needs different fields, actions, or list controls, you change it through {@term Model Config} overrides. Views that you do not override keep the defaults.

This guide assumes a working CRUD surface: the model is registered with a viewset, and {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} wires its routes (see [Create a CRUD Surface](./create-crud-surface)). Keep the model's model-info response at hand, so you can check which fields, actions, and expands the server lists. [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui#configuration-precedence) describes how model config ranks against component props and server defaults.

## Baseline Config from Model Info

{@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig} builds each view's config from model info. You override only the keys that need to change. The defaults are:

- The {@term View Field Lists}, [`displayFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.displayFields} and [`fetchFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fetchFields}: every serializer field except the pk and fields marked [`hidden`]{@api rest:schema:ModelInfoField}. Two views narrow `displayFields`:
    - `create` shows only writable fields. A new record has no value for a read-only field, and the server ignores input for one.
    - `list` shows only fields whose model-info entry does not set [`list_default`]{@api rest:schema:ModelInfoField} to `false`. A workflow model's serializers set `list_default` to `false` on `workflow_state_code` and `valid_transitions` ({@api py:function:vueda.workflow.serializers.workflow_serializer_fields}), so a workflow list shows `workflow_state_name` alone.
- [`submitFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.submitFields}: the writable fields.
- [`expand`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.expand}: every relation that model info lists for {@term Expand}.
- [`routeActions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.routeActions} and [`actions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actions}: every action in the user's {@term Model Actions}.
- [`actionDetails`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actionDetails}: each action's model-info entry, keyed by action name, including its `detail` and `bulk` flags.
- [`fieldDetails`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fieldDetails}: each field's model-info entry, keyed by field name.
- [`filterables`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.filterables}: the filters in model info's [`model_filtering`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_filtering}.
- [`sortables`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.sortables}: the field names in [`model_ordering.fields`]{@api rest:schema:ModelInfoOrdering}.
- [`sorted`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.sorted}: the server's default order from `model_ordering.default`. A descending field carries a leading `-`.
- [`showTotalRecordNum`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.showTotalRecordNum} is `true`, and [`allowColumnHiding`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.allowColumnHiding} is `false`.
- [`actionRedirects`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actionRedirects}: `{ default: "update" }` when the user can update. Otherwise, `default` is `"read"` when the user can read, `"list"` when the user can list, and `null` when the user can do neither.

## Register Overrides with `setConfig`

Call [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} when the application starts, before any view of the model renders. It takes the model, a model-wide override, and a map of per-view overrides:

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

storeModelConfig().setConfig(
    { app: "myapp", model: "widget" },
    // Model-wide overrides (every view)
    {
        displayFields: ["name", "status", "category"],
        fetchFields: ["name", "status", "category", "description"],
        submitFields: ["name", "status", "category", "description"],
        expand: ["category"],
    },
    // Per-view overrides
    {
        create: { submitFields: ["name", "category"] },
        list: { displayFields: ["name", "status"] },
    },
);
```

For the same key, the per-view override wins over the model-wide one. Key a per-view override by route name (`list`, `read`, `create`, `update`) or by action name. `read` and `retrieve` name the same view.

Each call replaces what it names. A model-wide object replaces the stored model-wide override, and `{}` clears it. Each per-view key replaces that view's stored override. Pass `null` for a level that you want to keep.

## Choose Each View's Field Lists

Each view uses the three field lists this way:

- {@api vue:component:ViewList} requests `fetchFields` and renders a column for each `displayFields` entry. It always adds the pk to the request. When you name only `displayFields`, the list's `fetchFields` follow them.
- {@api vue:component:ViewRead} and {@api vue:component:ViewUpdate} retrieve `fetchFields` and `expand` through {@api js:function:@arrai-innovations/vueda/use/useDetailView#useDetailView}. They also request the object's {@term Available Actions}.
- {@api vue:component:ViewCreate} and `ViewUpdate` render `displayFields`, and create derives its initial values from them. The form's [`fields`]{@api vue:component:FormModel:prop:fields} prop replaces the list. `ViewUpdate` takes `fields` as its own prop, and `ViewCreate` passes it through [`formProps`]{@api vue:component:ViewCreate:prop:formProps}.

A save uses all three lists:

- `displayFields` selects the fields that the form renders.
- `submitFields` selects the values that the request body carries. A value outside `submitFields` stays out of the body, even when the form shows it.
- `fetchFields` selects the fields that the save response returns, through {@term Sparse Fields}. Both views add the pk.

A top-level `submitFields` name, such as `lines`, sends that field's whole value, including nested inline rows. A dotted path, such as `address.city`, sends only that nested value. Do not name a subfield of an expanded relation: the view's config then fails to build, with an error that names the path.

For example, an order form can render and submit `quantity` while a summary reads the server-calculated `unit_price` and `total`:

```js
storeModelConfig().setConfig(
    { app: "shop", model: "order" },
    {
        displayFields: ["quantity"],
        fetchFields: ["quantity", "unit_price", "total"],
        submitFields: ["quantity"],
    },
);
```

The save response is available as [`objectForm.state.object`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormRawState.object}, and `ViewUpdate` retrieves the object again after each save. The summary shows fresh values after every save, and neither `unit_price` nor `total` joins the next request body.

The demo below runs that configuration against an offline server. Change the quantity and submit, then compare the request log with the summary.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view update · submit, display, and fetch fields · live ViewUpdate</header>
  <ModelDemo
    :view="() => import('../.vitepress/theme/components/DemoOrderUpdate.vue')"
    :app="order.app"
    :model="order.model"
    pk="1"
    action="update"
    :seed="order.seed"
    :api="order.api"
    page-title
  />
  <section class="flex flex-col gap-1 text-xs" data-qa="order-request-log">
    <h4 class="font-semibold uppercase tracking-wide text-muted-foreground">Requests</h4>
    <p v-if="!order.requests.length" class="text-muted-foreground">No requests yet.</p>
    <ol v-else class="flex flex-col gap-1">
      <li v-for="(request, index) in order.requests" :key="index" class="font-mono">{{ request.method }} f={{ request.fields }}<template v-if="request.body"> body={{ JSON.stringify(request.body) }}</template></li>
    </ol>
  </section>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>form: <code>displayFields</code> renders only <code>quantity</code></span>
    <span>summary: an <code>after-fields</code> slot reads <code>unit_price</code> and <code>total</code> from the form context, which holds every fetched field</span>
    <span>save: the <code>PUT</code> body carries only <code>submitFields</code>, and its <code>f</code> requests <code>fetchFields</code>, so the response includes the recalculated total</span>
    <span>after the save, the view retrieves the order again and the summary shows the stored values</span>
  </footer>
</VuedaDemo>
</ClientOnly>

Create and update resolve `submitFields` and `fetchFields` in this order:

1. The view's [`submitFields`]{@api vue:component:ViewCreate:prop:submitFields} or [`fetchFields`]{@api vue:component:ViewCreate:prop:fetchFields} prop, when it is not empty.
2. The per-view override.
3. The model-wide override.
4. The `fields` shorthand from either override, which sets all three lists at once.
5. The defaults from model info.

An omitted list falls through to the next step. An empty list in a per-view override skips the model-wide list and falls through to the `fields` shorthand, then the defaults.

{@term Ignored Field} values stay out of the body even when `submitFields` names them. `submitFields` narrows only what the client sends. The server still validates each write against the serializer's writable fields and the user's permissions.

When `expand` is not empty, the config adds each expanded relation's subfields to `fieldDetails` under dotted keys. With `category` expanded, `fieldDetails["category.name"]` holds the metadata for the category's `name`, and you can override it there.

### Show a Field the Defaults Leave Out

To show a read-only field on a create form, or a `list_default: false` field in a list, name the view's fields:

```js
storeModelConfig().setConfig({ app: "myapp", model: "purchaseorder" }, null, {
    create: { displayFields: ["reference", "supplier", "total_value"] },
    list: { displayFields: ["reference", "workflow_state_code", "workflow_state_name"] },
});
```

The narrower `create` and `list` defaults apply only when no override names that list or the `fields` shorthand. A model-wide `displayFields` reaches `create` and `list` unchanged.

To change a field's list default wherever a serializer is used, set the flag in the serializer field's `style`. `style={"list_default": False}` leaves the field out of the default list. `style={"list_default": True}` keeps a field that {@api py:class:vueda.core.serializers.WorkflowFieldsSerializerMixin} would leave out.

## Choose Actions and Routes

Three keys control actions. Name actions in each by {@term Canonical Action Name}, such as `retrieve` for the `read` route.

### Limit Which Routes Open

`routeActions` narrows which actions {@term Route Admission} lets a route open. Set it in the model-wide override, because the route guard reads only the model-wide config:

```js
storeModelConfig().setConfig({ app: "myapp", model: "widget" }, { routeActions: ["list", "retrieve", "update"] });
```

A route for a model action that `routeActions` leaves out shows an "Action Not Found" toast and redirects to the `makeCRUDRoutes` [`actionRedirect`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.actionRedirect}. A workflow transition code still opens, whatever `routeActions` lists. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model) describes the full guard chain.

### Limit Which Buttons Render

`actions` narrows which action buttons the views render. An action left out of `actions` can still open by URL, so use `routeActions` to close the route as well.

`actions` takes either a list of action names or an object ({@api js:type:@arrai-innovations/vueda/stores/storeModelConfig#ActionPermissionConfig}) that maps each action to `true` or to a list of group names. With the object form, a user sees an action's button when its value is `true` or when the user belongs to one of the listed groups:

```js
storeModelConfig().setConfig({ app: "myapp", model: "widget" }, null, {
    list: { actions: { create: true, destroy: ["managers"] } },
});
```

Group membership here only hides buttons. The server still checks each request's permissions.

### Check How Each Action Is Grouped

`actionDetails` decides where an action's button renders. Model info supplies an entry for each action that it lists, and a view renders no button for an action without an entry. The `detail` and `bulk` flags group the buttons:

- `ViewList` renders a `bulk` action in the selection strip, and an action with neither flag as a button in the page title. It renders no button for a `detail` action that is not `bulk`. [Link List Rows to Read and Update Views](./link-list-rows-to-detail-views) sets up navigation from a row to its read or update view.
- The read and update views render a `detail` action only when the object's `available_actions` includes it. They render actions without `detail` from the model's action list.
- `ViewCreate` renders only actions without `detail`.

{@api vue:component:LinkModelView} requires a pk before it enables a link to a `detail` or `bulk` action, or to a workflow transition code. If you override `actionDetails`, keep these flags matching the server's action metadata.

## Choose the Redirect After a Save

After a successful save, `ViewCreate` and `ViewUpdate` go where their `redirectAfter` prop sends them:

- [`ViewCreate` `redirectAfter`]{@api vue:component:ViewCreate:prop:redirectAfter} defaults to `"update"`, which opens the new record's update view. It also accepts `"read"` and `"list"`.
- [`ViewUpdate` `redirectAfter`]{@api vue:component:ViewUpdate:prop:redirectAfter} defaults to `null`, which stays on the page. It also accepts `"read"` and `"list"`.

`actionRedirects` sets the {@term Action Redirect} for views that run through {@api vue:component:ModelActionForm}, such as destroy, extra actions, and workflow transitions. Create and update do not read it. [Design Transition UX and Redirects](./transition-ux-and-redirects#redirect-precedence-and-route-targets) describes how an action form picks its redirect.

## Set List Controls

These keys and `ViewList` props shape the list:

- `filterables` sets which filters the filter menu offers. The `ViewList` [`filterables`]{@api vue:component:ViewList:prop:filterables} prop replaces it.
- `sortables` sets which columns offer sorting. [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics) describes which fields the server accepts for ordering.
- `sorted` sets the sort that the list opens with. A saved sort preference wins over it, and {@api vue:component:SortGroup}'s "Reset sort" control returns to it.
- `showTotalRecordNum` shows the total record count in the pagination bar. `allowColumnHiding` shows a control that lets the user hide columns. The `ViewList` props of the same names override both.
- The `ViewList` props [`pageSizeOptions`]{@api vue:component:ViewList:prop:pageSizeOptions} and [`defaultPageSize`]{@api vue:component:ViewList:prop:defaultPageSize} set the rows-per-page choices and the starting size. Include `"all"` in `pageSizeOptions` to let users load every row, or set `defaultPageSize` to `"all"` to start there.

### List Preferences

`ViewList` saves a user's list choices in the browser's local storage, one entry per app and model. It saves:

- the columns the user hid,
- the sort the user chose,
- the page size,
- the filters the user added, and the search term.

Preferences belong to the browser. Everyone who signs in on that browser shares them, and signing out does not clear them. To clear a model's entry, call {@api js:method:@arrai-innovations/vueda/stores/storeListPreference#storeListPreference.clearPreferences}.

Your config and props set the starting state, and a saved preference wins over them. The list restores hidden columns on every visit. It restores the sort, page size, filters, and search term only when it opens with no query parameters. It restores a saved page size only when `pageSizeOptions` still offers it, and a saved filter only when the list still offers that filter.

A hidden filter's URL value, such as an `?id=1,2` link, stays in the URL for that visit and is never saved. Query parameters that the list does not use are not saved either. [Open a Scoped List](./scope-a-list) describes which filters `params` supplies and keeps out of preferences.

## Verify the Result

To read the resolved config in a component, call {@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig} with the app, model, and view name:

```js
import { useModelConfig } from "@vueda/use/useModelConfig.js";

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), "list");

// modelConfig.config: the resolved config for the list view
// modelConfig.info: the model info from the server
// modelConfig.loading, modelConfig.errored, modelConfig.error: load state
```

Then check each view in the browser:

- The list renders a column for each `displayFields` entry, and its request's `f` carries the `fetchFields` plus the pk.
- The read view renders the expected fields, including expanded subfields when `expand` names the relation.
- The create and update forms render the view's `displayFields`, and each save's body carries only `submitFields`.
- After a save, create and update go where their `redirectAfter` sends them.
- Each view shows the action buttons that `actions` and `actionDetails` allow.
- A route for an action outside `routeActions` shows "Action Not Found" and redirects.
- The filter menu and sort controls match `filterables` and `sortables`.
- After you hide a column and reload the list without query parameters, the column stays hidden.

## Troubleshooting

**A list column shows no values.** The list override sets `fetchFields` and leaves the field out. Add the field to `fetchFields`, or remove `fetchFields` from the list override so that the list's `fetchFields` follow `displayFields`.

**An action button is missing.** Check in this order:

1. The model-info response lists the action in `model_actions`. If not, the user lacks the permission for it.
2. The view's `actions` includes the action. With the object form, the user belongs to one of the action's groups.
3. On a read or update view, the object's `available_actions` includes a `detail` action.
4. The action's `actionDetails` flags put it in a group the view renders. A list renders no button for a `detail` action that is not `bulk`.

**A route shows "Action Not Found".** `routeActions` leaves the action out. Set `routeActions` in the model-wide override, and use `retrieve` for the `read` route.

**A create request fails validation for a required field.** `submitFields` leaves the field out, so its value never reaches the server. Add the field to `submitFields`, or give it a default on the server.

**An expanded subfield has no `fieldDetails` entry.** The config adds dotted subfield keys only when `expand` names the relation. Add the relation to `expand` for that view.
