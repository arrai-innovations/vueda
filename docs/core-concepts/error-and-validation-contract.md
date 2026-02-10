---
title: Error and Validation Contract
type: explanation
audience: implementor
status: briefing
---

# Error and Validation Contract

## Intent and Scope

- Define the contract boundary for validation and request-error payloads that are consumed as form errors/messages in client runtime state.
- Define authority and lifecycle across server exception shaping, HTTP status classification, client error parsing, and form-context ingestion.
- Include explicit non-validation branches that coexist with this contract (permission/not-found and query-param failures).
- Source anchors: `server/vueda/core/exceptions.py`, `server/vueda/core/default_settings.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/info/viewsets.py`, `client/lib/utils/errors.js`, `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/stores/storeUser.js`, `client/lib/use/useForm.js`, `client/lib/use/useObjectForm.js`, `client/lib/components/ModelActionForm.vue`.

## Non-goals

- Not a catalog of every endpoint-specific error payload in the monorepo.
- Not UI behavior guidance for when to show toasts/feedback blocks.
- Not transport retry/cancellation semantics outside validation classification.

## Key Concepts

### Server exception handler is the wire-shape authority

- What it is: `VuedaValidationError` payload normalization plus `debug_stack_exception_handler` response shaping.
- Why it exists: one server-side path controls non-field conversion and traceback exposure for downstream clients.
- Where it lives: `server/vueda/core/exceptions.py`, `server/vueda/core/default_settings.py`, `server/tests/unit/logging/test_logging.py`.

### HTTP status is the client-side classification gate

- What it is: client CRUD/auth/action adapters map HTTP `400` to `FormValidationError`; non-400 paths become non-form errors.
- Why it exists: form-context mapping is intentionally constrained to one status bucket.
- Where it lives: `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/stores/storeUser.js`, `client/lib/components/ModelActionForm.vue`, `client/tests/unit/lib/utils/objectCrud.spec.js`, `client/tests/unit/lib/components/ModelActionForm.spec.js`, `client/tests/unit/lib/stores/storeUser.spec.js`.

### Path keys (including non-field and nested paths) are preserved as contract keys

- What it is: non-field errors use `non_field_errors`; nested/array keys are tracked as flattened path strings in client form state.
- Why it exists: field routing and first-error discovery require stable key identity across transport and form state.
- Where it lives: `server/vueda/core/default_settings.py`, `server/vueda/core/exceptions.py`, `client/lib/utils/constants.js`, `client/lib/utils/errors.js`, `client/lib/use/useForm.js`, `client/tests/unit/lib/use/useForm.spec.js`.

### Warnings are a parallel channel, not merged into error keys

- What it is: server warning details are emitted under `warnings`; client parser maps warning paths into `messages` and non-warning paths into `errors`.
- Why it exists: non-blocking feedback can coexist with blocking validation failures.
- Where it lives: `server/vueda/core/exceptions.py`, `server/tests/logging/serializers.py`, `server/tests/unit/logging/test_logging.py`, `client/lib/utils/errors.js`.

### Not-found and permission branches are explicit outside form-validation mapping

- What it is: choices/filter-choices endpoints use `404` for invalid model/field/filter and `403` for permission denials.
- Why it exists: contract failures and authorization failures are represented separately from validation payloads.
- Where it lives: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_err.py`, `server/tests/unit/info/test_model_info_choices.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.

## Relevant Implementation Surface

- `{@api py:module:vueda.core.exceptions}`
- `{@api py:function:vueda.core.exceptions.debug_stack_exception_handler}`
- `{@api py:class:vueda.core.exceptions.VuedaValidationError}`
- `{@api py:class:vueda.core.serializers.NoExtraFieldsSerializerMixin}`
- `{@api py:function:vueda.core.serializers.NoExtraFieldsSerializerMixin.validate}`
- `{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_field_param}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_param}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.list}`
- `{@api py:class:vueda.info.viewsets.ModelInfoChoicesBaseViewSet}`
- `{@api py:function:vueda.info.viewsets.ModelInfoChoicesBaseViewSet.check_permissions}`
- `{@api py:function:vueda.info.viewsets.ModelInfoChoicesViewSet.validate_queryset}`
- `{@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.validate_queryset}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- `{@api js:module:@arrai-innovations/vueda.utils/errors}`
- `{@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError}`
- `{@api js:property:@arrai-innovations/vueda.utils/errors.FormValidationError.errors}`
- `{@api js:property:@arrai-innovations/vueda.utils/errors.FormValidationError.messages}`
- `{@api js:property:@arrai-innovations/vueda.utils/errors.FormValidationError.serverStack}`
- `{@api js:module:@arrai-innovations/vueda.utils/objectCrud}`
- `{@api js:module:@arrai-innovations/vueda.utils/listCrud}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeUser}`
- `{@api js:module:@arrai-innovations/vueda.use/useForm}`
- `{@api js:property:@arrai-innovations/vueda.use/useForm.FormContext.handleServerFormValidationError}`
- `{@api js:property:@arrai-innovations/vueda.use/useForm.FormContext.clearServerErrors}`
- `{@api js:property:@arrai-innovations/vueda.use/useForm.FormContext.getFirstErrorField}`
- `{@api js:function:@arrai-innovations/vueda.use/useObjectForm.defaultOnSubmissionError}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.NON_FIELD_ERRORS_KEY}`
- `{@api vue:component:ActionForm}`
- `{@api vue:component:ModelActionForm}`

## Contracts and Invariants

- `VuedaValidationError` normalizes scalar details into list form and preserves dict/list structures recursively; this is the canonical server validation payload type. Anchors: `server/vueda/core/exceptions.py`.
- When `VuedaValidationError.detail` is a top-level list, the exception handler rewrites it to `{non_field_errors: [...]}` before returning. Anchors: `server/vueda/core/exceptions.py`, `server/vueda/core/default_settings.py`, `server/tests/unit/logging/test_logging.py`.
- Error responses handled by `debug_stack_exception_handler` include `serverStack`; in DEBUG/tests it includes traceback, otherwise exception-only text. Anchors: `server/vueda/core/exceptions.py`, `server/tests/unit/info/test_model_info_err.py`.
- Serializer-level extra-field and extra-expand rejections produce field-keyed validation payloads, not generic `detail` strings. Anchors: `server/vueda/core/serializers/__init__.py`, `server/tests/unit/core/test_serializers.py`.
- Viewset flex/query-parameter validation is split: invalid `f`/`e` keys return `400` field-keyed payloads, while unknown list query params return `500` with `detail`. Anchors: `server/vueda/core/viewsets/__init__.py`.
- Client CRUD/auth/action adapters interpret HTTP `400` as `FormValidationError`; non-400 failures remain non-form errors (`FetchError` or resolver-specific classes). Anchors: `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/stores/storeUser.js`, `client/lib/components/ModelActionForm.vue`, `client/tests/unit/lib/utils/objectCrud.spec.js`, `client/tests/unit/lib/components/ModelActionForm.spec.js`, `client/tests/unit/lib/stores/storeUser.spec.js`.
- `FormValidationError` removes `serverStack` from the path map payload and derives two maps: `errors` (non-warning paths) and `messages` (warning paths). Anchors: `client/lib/utils/errors.js`.
- `useForm` ingests server validation via `handleServerFormValidationError` under code key `server`; `clearServerErrors` deletes only server-derived keys (optionally including dependents). Anchors: `client/lib/use/useForm.js`, `client/tests/unit/lib/use/useForm.spec.js`.
- First-error resolution prioritizes `non_field_errors` and supports array/nested keys (`tags[2].label`, `items[0].description`) in deterministic display order. Anchors: `client/lib/use/useForm.js`, `client/tests/unit/lib/use/useForm.spec.js`.
- Choices/filter-choices invalid field/model failures are `404` and permission failures are `403`; these branches are not validation-payload branches. Anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_err.py`, `server/tests/unit/info/test_model_info_choices.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.

## Footguns

- A validation-looking failure that is not HTTP `400` (for example, invalid list query parameter -> `500`) bypasses `FormValidationError` parsing and will not populate form-context server errors/messages. Anchors: `server/vueda/core/viewsets/__init__.py`, `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`.
- `FormValidationError` assumes object-like payload shape (`const data = { ...responseData }`); non-object or atypical payloads can produce sparse/opaque path maps in `errors`/`messages`. Anchors: `client/lib/utils/errors.js`.
- `non_field_errors` are surfaced via form-level feedback paths; field-level feedback components do not implicitly remap them to field keys. Anchors: `client/lib/components/FormFeedback.vue`, `client/lib/utils/constants.js`, `client/lib/use/useForm.js`.
- Warning-only validation responses still use validation error transport (`400`) and can appear alongside errors in non-field payload lists; clients must not assume `400` implies only blocking field errors. Anchors: `server/tests/logging/serializers.py`, `server/tests/unit/logging/test_logging.py`, `client/lib/utils/errors.js`.
- Choices/filter-choices invalid identifiers return `404` (not `400`), so these failures skip form-validation classification and surface as general fetch errors in clients that only special-case `400`. Anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_err.py`, `client/lib/utils/fetchSupport.js`.

## Suggested Outline

- `## Boundary and Authority`
- `## Wire Error Shapes and Status Branches`
- `## Non-Field and Nested Path Semantics`
- `## Warning Channel Semantics`
- `## Client Classification and Form-State Ingestion`
- `## Permission and Not-Found Branches`
- `## Observable Failure Signatures`
