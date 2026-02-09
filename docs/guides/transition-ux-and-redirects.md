---
title: Design Transition UX and Redirects
type: how-to
audience: implementor
status: briefing
---

# Design Transition UX and Redirects

## Intent and Scope

- Scope transition execution UX for action forms and workflow-transition views, plus post-action routing behavior.
- Cover the implemented redirect precedence and guard/router checks that affect transition routes.
- Treat this as a technical briefing (contracts, edge cases, verification anchors), not tutorial prose.
- Source anchors: `client/lib/components/ActionForm.vue`, `client/lib/components/ModelActionForm.vue`, `client/lib/views/ViewActionRouter.vue`, `client/lib/views/ViewWorkFlowTransition.vue`, `client/lib/router/guards.js`, `client/lib/stores/storeWorkflow.js`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Non-goals

- Not a workflow modeling guide (states/sources/permissions design).
- Not a UI copy/style guide for toasts and confirmation text.
- Not a guarantee that generated API pages capture runtime edge cases; source code/tests are authoritative.

## Key Tasks

### 1. Wire route gating and transition route resolution

- Gate CRUD routes through `requireModelInfo` and ensure transition availability is included in guard checks.
- Ensure route action normalization (`read` -> `retrieve`) is applied before action matching.
- For resolved transition pages, ensure `ViewActionRouter` can find transition routes by transition `code`.
- Source anchors: `client/lib/router/makeCrud.js`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/views/ViewActionRouter.spec.js`.

### 2. Define submit, dry-run, and cancel flow in action forms

- Use `ActionForm` success/error hooks to standardize toast + redirect behavior; cancel path is explicit (`redirectTo("cancel")`).
- Use `readyToDryRun` only for validation/prefetch behavior; dry runs should not redirect or emit success toasts.
- Source anchors: `client/lib/components/ActionForm.vue`, `client/tests/unit/lib/components/ActionForm.spec.js`.

### 3. Implement redirect precedence for transition-like actions

- In `ModelActionForm`, `route.query.returnPath` takes precedence over configured redirects.
- If no return path exists, resolve redirect from `config.actionRedirects[action]` then `config.actionRedirects.default`.
- Route bulk actions (or explicit `"list"` redirect) to list view; otherwise route to detail action with selected PK.
- Source anchors: `client/lib/components/ModelActionForm.vue`, `client/tests/unit/lib/components/ModelActionForm.spec.js`.

### 4. Verify server transition execution semantics before UX assumptions

- Use workflow execute endpoint dry-run mode when UX needs preview/validation without persistence.
- Confirm non-dry-run execution lock behavior and locked-row validation errors.
- Confirm bulk execution contract (`object_ids` list) for multi-select UX.
- Source anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.

### 5. Validate name/code consistency across transition paths

- Guard path and action router both use transition `code` as route/action identifier.
- `ViewWorkFlowTransition` submits selected transition `code` as `transition_code`; transition `name` is display-only.
- Source anchors: `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/views/ViewWorkFlowTransition.vue`, `client/tests/unit/lib/views/ViewWorkFlowTransition.spec.js`.

## Relevant Implementation Surface

- Python:
- `{@api py:module:vueda.workflow.viewsets}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_transitions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.available_transitions}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_transition}`
- REST:
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}`
- `{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}`
- JavaScript:
- `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}`
- `{@api js:function:@arrai-innovations/vueda.use/useWorkflowTransitions.useWorkflowTransitions}`
- `{@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}`
- Vue.js Components:
- `{@api vue:component:ActionForm}`
- `{@api vue:component:ModelActionForm}`
- `{@api vue:component:ViewActionRouter}`
- `{@api vue:component:ViewWorkFlowTransition}`

## Contracts and Invariants

- `ActionForm` calls `redirectTo("success")` after successful non-dry-run submit when no custom success handler is provided.
- `ActionForm` calls `redirectTo("cancel")` on cancel.
- `ModelActionForm.redirectTo` precedence is: `returnPath` query -> `actionRedirects[action]` -> `actionRedirects.default` -> computed list/detail route behavior.
- `ModelActionForm.defaultRunAction` sends `Dry-Run: true` header for dry runs and sends bulk payload as `{ pks: [...] }`.
- Workflow execute-transition dry-run skips locking and state persistence; non-dry-run uses row locking and persists when successful.
- Bulk execute-transition uses `object_ids`; non-list payload returns `400`.
- Source anchors: `client/lib/components/ActionForm.vue`, `client/lib/components/ModelActionForm.vue`, `client/tests/unit/lib/components/ActionForm.spec.js`, `client/tests/unit/lib/components/ModelActionForm.spec.js`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Footguns

- Transition objects without a valid string `code` now throw in route guard evaluation (`requireModelInfo`) instead of being silently treated as unavailable actions.
- `ViewWorkFlowTransition` submit now requires a string transition code and throws if selection is invalid/missing.
- Client `storeWorkflow.executeTransition` route mapping checks `new_state.state.code`, while server returns `new_state.code`; state-to-route push may silently no-op.
- `ViewWorkFlowTransition` includes a TODO claiming server bulk transition support is missing, but server and tests show bulk support via `object_ids`.
- Source anchors: `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/views/ViewWorkFlowTransition.vue`, `client/lib/stores/storeWorkflow.js`, `client/tests/unit/lib/views/ViewWorkFlowTransition.spec.js`, `client/tests/unit/lib/stores/storeWorkflow.spec.js`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Suggested Outline

```md
## Goal and Preconditions
## Route Guard and Action Router Wiring
## Action Form Submit/Dry-Run/Cancel Flow
## Redirect Precedence and Route Targets
## Workflow Execute-Transition Contract (Detail and Bulk)
## Verification Checklist
## Known Limitations
```
