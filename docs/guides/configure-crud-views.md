---
title: Configure `list`/`read`/`create`/`update` Views
type: how-to
audience: implementor
status: briefing
---

# Configure `list`/`read`/`create`/`update` Views

## Intent and Scope

- Configure CRUD view behavior (`list`, `read`, `create`, `update`) using model config overrides without forking core components.
- Capture where each setting is consumed in client code so overrides stay predictable.
- Treat this as a briefing: implementation surface and contracts first, prose polish later.

## Non-goals

- Not a visual design guide for slots/theme customization.
- Not a replacement for generated API docs; source code and tests remain the authoritative behavior source.
- Not a guide for workflow state/transition modeling beyond its impact on available actions.

## Key Tasks

### 1. Start from model-info-derived defaults, then override deliberately

- `storeModelConfig` derives default `displayFields`, `fetchFields`, `submitFields`, `expand`, `routeActions`, actions, filterables, and sortables from model-info.
- Use view-specific overrides only where behavior must differ from this baseline.
- Source anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/use/useModelConfig.js`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

### 2. Configure field sets by what each view actually consumes

- `ViewList` fetches using `fetchFields` and renders using `displayFields`.
- `DetailedView` (used by `read`/`update` flows) retrieves using `fetchFields` and `expand`.
- `ViewCreate` and `ViewUpdate` submit using `submitFields` (with PK injected into request fields).
- Source anchors: `client/lib/views/ViewList.vue`, `client/lib/components/DetailedView.vue`, `client/lib/views/ViewCreate.vue`, `client/lib/views/ViewUpdate.vue`.

### 3. Configure action availability and routing coherently

- Route generation typically starts from `makeCRUDRoutes`; guard checks are enforced by `requireModelInfo`.
- Keep model config action controls (`actions`, `routeActions`, `actionDetails`) aligned with expected route entry and button visibility.
- Source anchors: `client/lib/router/makeCrud.js`, `client/lib/router/guards.js`, `client/lib/use/useFilteredActions.js`, `client/lib/views/ViewActionRouter.vue`.

### 4. Configure list behavior and interaction defaults

- Tune `filterables`, `sortables`, `sorted`, and pagination display flags (`showTotalRecordNum`, `allowShowAllPages`, `alwaysShowAllPages`, `allowColumnHiding`) per model/view needs.
- Verify interactions with list preference persistence and query params.
- Source anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/views/ViewList.vue`, `client/tests/unit/lib/views/ViewList.spec.js`.

### 5. Verify `read`/`create`/`update` flow contracts end-to-end

- Confirm `create`/`update` redirect behavior (`actionRedirects` + `redirectAfter`) and field availability.
- Confirm `read`/`update` screens can retrieve expected fields for rendering and actions.
- Source anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/use/useObjectForm.js`, `client/lib/components/DetailedView.vue`.

### 6. Document template-specific wiring as conditional guidance

- For provided templates, CRUD routing wiring lives in `client/src/router/index.js`.
- Keep this as template context, not a universal hardcoded project path.
- Source anchors: `templates/implementor-monorepo/client/src/router/index.js`, `templates/implementor-monorepo-dx/client/src/router/index.js`.

## Relevant Implementation Surface

- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelConfig.storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.use/useModelConfig.useModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.router/guards}`
- Vue.js Components:
- `{@api vue:component:ViewList}`
- `{@api vue:component:DetailedView}`
- `{@api vue:component:ViewRead}`
- `{@api vue:component:ViewCreate}`
- `{@api vue:component:ViewUpdate}`

## Contracts and Invariants

- Default config omits the PK from baseline `displayFields`/`fetchFields`/`submitFields`; views add PK where needed for fetch/submit internals.
- Empty override arrays for `displayFields`/`fetchFields`/`submitFields` fall back to defaults derived from model-info.
- Default redirect target is derived from available actions with preference order `update`, then `read` (from `retrieve`), then `list`.
- Expansion metadata is flattened into `fieldDetails` using `expand__subfield` keys for display/config targeting.
- Source anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/components/DetailedView.vue`, `client/lib/views/ViewCreate.vue`, `client/lib/views/ViewUpdate.vue`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

## Footguns

- `routeActions` is the supported route-filtering key; there has been confusion with `routerActions` in the past, which is now ignored with a warning.
- If `displayFields` includes fields absent from `fetchFields`, `list`/`read`/`update` rendering may show missing values.
- Overriding `submitFields` without validating server serializer acceptance can cause form submission failures.
- Treating template route paths as universal project structure can mislead non-template adopters.
- Source anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/router/guards.js`, `client/lib/views/ViewList.vue`, `client/lib/components/DetailedView.vue`.

## Suggested Outline

```md
## Goal and Preconditions
## Baseline Config from Model Info
## View-Specific Field Strategy
## Action and Route Strategy
## List Behavior and Defaults
## Verification Checklist
## Troubleshooting
```
