---
title: Configuration Surface and Defaults
type: explanation
audience: implementor
status: draft
---

# Configuration Surface and Defaults

VUEDA's runtime behaviour depends on configuration surfaces that span the server and client. Server defaults assemble Django settings, framework configuration, and VUEDA-specific values into a single dict. An env-adapter contract governs how required keys are read and validated at startup. Wire-level query parameter names form a shared namespace that both server and client must agree on. {@term Permission Mapping} is patched into Django at import time. On the client side, model configuration defaults are derived from server-emitted metadata, and a small set of Vite environment variables governs CSRF and connection behaviour.

This page explains each configuration surface, the authority boundaries between them, and the failure modes that emerge when configuration is missing, mistyped, or out of sync. This is not a catalogue of every setting or a how-to for overriding defaults: the authoritative list of settings is the source code of `get_defaults` and `get_production_defaults`, and the API reference documents individual functions and modules. For the client-side store that consumes model-info to build config objects, see [Reactive Data Flow](./reactive-data-flow). For how query parameters interact with filtering and ordering, see [Filtering and Ordering Semantics](./filtering-and-ordering-semantics). For the permission codename vocabulary, see [Permission Model](./permission-model).

## Configuration Authority Boundaries

Configuration authority is divided across four layers, each with a different scope and override model.

The server defaults layer (`get_defaults` and `get_production_defaults`) defines the baseline. It reads values from an env adapter, computes derived settings, and returns a dict that projects assume as the starting point. This layer is the single point where VUEDA-specific defaults are established: query parameter names, permission classes, middleware stacks, security cookie flags, and installed apps. Projects consume these defaults and may override individual keys, but the defaults layer defines the contract shape that runtime code depends on.

The env adapter layer sits beneath defaults and governs how raw configuration values are read from the environment. The adapter is a protocol; any object that satisfies the `EnvLike` typing contract will work. The concrete implementation shipped with VUEDA is `TomlEnv`, which reads from a TOML file and optionally overlays process environment variables. The env adapter is responsible for type coercion (booleans, integers, lists, URLs) and for enforcing required-key semantics. Missing required keys and invalid type conversions are raised as exceptions at read time.

The wire namespace layer defines query parameter names that must match between server and client. This layer is not negotiated at runtime; both sides hard-code the same literal strings. The server sets these in `REST_FRAMEWORK` and `REST_FLEX_FIELDS` settings; the client declares them as constants. Drift between the two is a wire contract break.

The client config layer derives model-specific UI configuration from server-emitted metadata. `storeModelConfig` builds a `ModelConfig` object by reading model-info (fields, expands, actions, filtering, ordering), computing defaults, and merging any project-supplied overrides. This layer operates entirely at runtime and depends on the server metadata contract being stable.

## Server Settings Assembly Surface

`get_defaults(env)` accepts an env-adapter object and returns a dict containing all settings that VUEDA runtime code assumes. The function is organized around concern groups.

Required keys are read from the env adapter without a default value, so the adapter must provide them or raise an exception. These include cryptographic identity keys (`SECRET_KEY`), persistence backends (`DATABASE_URL`, `DATABASE_BACKUP_DIR`), frontend integration surfaces (`ALLOWED_HOSTS`, `FRONTEND_DOMAIN`, `FRONTEND_LOGIN_URL`), cross-origin trust configuration (`CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`), authentication identity (`AUTH_USER_MODEL`), and project identity (`TIME_ZONE`, `SITE_NAME`, `SUPPORT_EMAIL`). The distinction between required and optional is intentional: required keys represent values that have no safe default and must be provided by the project deployer.

Optional keys provide defaults that work for development or common deployment patterns. `DEBUG` defaults to `False`, `LANGUAGE_CODE` to `"en-us"`, `MEDIA_ROOT` to `"/tmp/media"`, `LOGS_FOLDER` to `"."`, and email backend to the console backend. These can be overridden through the env adapter without affecting VUEDA's contract assumptions.

Derived values are computed after the initial read pass. `INSTALLED_APPS` is assembled from core Django apps, third-party apps, and VUEDA's own apps. Database options are post-processed to enable atomic requests, set isolation level, and pin `CONN_MAX_AGE` to `0`. Optional dependency detection (for example, `drf_spectacular`) can mutate the apps list, REST framework defaults, and add additional settings blocks.

The production defaults (`get_production_defaults`) layer adds additional requirements on top of `get_defaults`. `SENTRY_DSN` is required only in the production path, not in baseline defaults. This split allows development environments to omit telemetry configuration while production deployments enforce it.

## Env Adapter Contract and Error Semantics

The env adapter is a duck-typed object that provides typed accessors for configuration values. The `EnvLike` typing contract defines the expected interface: methods for reading strings, booleans, integers, lists, and URLs, each with optional default values. When a default is omitted, the key is treated as required.

`TomlEnv`, the concrete adapter shipped with VUEDA, reads configuration from a TOML file and optionally overlays process environment variables when `prefer_env` is true. When the environment overlay is active, a process environment variable with a matching key (after prefix stripping) takes precedence over the TOML-loaded value. This enables deployment-time overrides without modifying the TOML file.

Error semantics are strict and immediate. A missing required key raises `KeyError("Missing config key: ...")` at the point where `get_defaults` reads it, which typically means server startup fails before Django finishes configuration. Invalid type coercions raise `ValueError` with a descriptive message. For example, a non-boolean string for `DEBUG` or a non-integer string for `SITE_ID`. These errors surface during settings assembly, not at request time, so misconfiguration is caught early.

## Wire Query Parameter Namespace

The server and client share a fixed set of query parameter names for search, ordering, pagination, and flex-field control. These names are a wire contract: both sides must use the same strings, and there is no runtime negotiation or discovery mechanism.

The canonical names are: `s` for search, `o` for ordering, `p` for page number, `ps` for page size, `e` for expand, `f` for fields, and `om` for omit. The server declares these in `REST_FRAMEWORK` settings (`SEARCH_PARAM`, `ORDERING_PARAM`), `REST_FLEX_FIELDS` settings (`EXPAND_PARAM`, `FIELDS_PARAM`, `OMIT_PARAM`), and pagination class settings. The client declares the same values as constants in `@vueda/utils/constants`.

These short, single-letter names are a deliberate departure from DRF's upstream defaults (which use longer names like `search` and `ordering`). The short names reduce URL length, but the important property is that they are fixed. If a project overrides the server's query parameter settings without also updating the client constants, client requests will silently stop applying the intended search, ordering, pagination, or flex-field behaviour; the server will ignore the client's query keys because they do not match the expected names.

## Permission Codename Mapping Lifecycle

VUEDA replaces Django's default permission codename vocabulary with {@term CRUDL} names: `create`, `read`, `update`, `delete`, and `list` instead of `add`, `view`, `change`, and `delete`. This remapping is implemented as a monkey-patch applied at module import time.

`vueda.core.patch_django` reads `settings.PERMISSION_NAMES_MAPPING` when it is first imported and caches the mapping. It then patches Django's `get_permission_codename` function and built-in permission generation to use the cached mapping. Because the mapping is captured at import time, any mutation of `PERMISSION_NAMES_MAPPING` after the patch module has been imported is not observed. The VUEDA defaults set `PERMISSION_NAMES_MAPPING` in `get_defaults`, so under normal startup ordering, the mapping is in place before the patch module runs.

The consequence of this lifecycle is that import ordering matters. If `vueda.core.patch_django` is imported before `PERMISSION_NAMES_MAPPING` is finalized in Django settings, the patch module captures an incomplete or absent mapping. For example, by a third-party app that imports it during its own `AppConfig.ready()` before VUEDA's settings are applied. The symptom is permissions being created and checked under unexpected codenames, which can cause silent authorization failures. For the full permission evaluation model, see [Permission Model](./permission-model).

## Client ModelConfig Derivation and Cache

On the client side, `storeModelConfig` builds per-model, per-view configuration objects from server-emitted model-info metadata. This derivation is the bridge between the server's metadata contract and the client's UI rendering decisions.

The derivation starts with `getDefaultFromModelInfo`, which reads the model-info object's `fields`, `expand`, `actions`, `filtering`, and `ordering` entries and computes sensible defaults: which fields to fetch, display, and submit; which expands to request; which actions are available; and how to route action results. If the model-info object is missing any of these top-level keys, the function returns a minimal config shape with empty detail objects rather than throwing an error.

Default action redirects use view-name strings (for example, `"read"`) even though the underlying server action name is `"retrieve"`. The mapping boundary is `viewToActionNameMap`, which translates between the client's view-oriented naming and the server's DRF-oriented naming. This translation is a stable convention, not a runtime lookup.

After defaults are computed, the config store merges in any project-supplied overrides; first generic overrides (applicable to all views of the model), then view-specific overrides. The merged result is cached under an `app.model.view` key. Subsequent requests for the same key return the cached config immediately.

When a project calls `setConfig` to apply new overrides, the config store cancels any in-flight builds for the affected model and deletes cached built configs. This ensures that the next config request rebuilds from the new overrides rather than serving a stale cache entry.

## Client Runtime Env Surface

A small number of Vite build-time environment variables configure client-side behaviour that cannot be derived from server metadata.

`VITE_CSRF_COOKIE_NAME` specifies the name of the CSRF cookie that the client reads to populate the `X-CSRFToken` header on unsafe HTTP methods. If this variable is unset, the CSRF utility reads from an undefined cookie name, and requests send an empty or missing CSRF token. The server then rejects the request with a CSRF failure, which results in a `403` response for any `POST`, `PUT`, `PATCH`, or `DELETE` operation.

`VITE_DJANGO_CONNECTION_PORT` optionally specifies the port for the Django backend connection hostname. When set, it is appended to the hostname used by the client's fetch utilities. This is primarily useful in development environments where the Vite dev server and Django run on different ports.

## Observable Failure Modes

Configuration failures surface at different points in the application lifecycle depending on which layer is affected.

**Missing required server keys.** The env adapter raises `KeyError("Missing config key: ...")` during `get_defaults` execution, which typically aborts server startup. The error message names the missing key. This is the most common configuration failure during initial project setup.

**Invalid typed values.** `TomlEnv` raises `ValueError` when a typed accessor cannot coerce the raw value; for example, `"yes"` for a boolean field that expects `"true"` or `"false"`, or `"abc"` for an integer field. The error message includes the key name and the invalid value.

**Optional dependency coupling.** If `drf_spectacular` is importable, `get_defaults` mutates the apps list, REST framework schema class, and adds `SPECTACULAR_SETTINGS`. If the dependency is removed after initial setup, these settings disappear, which can change the shape of the settings dict. This is not a failure per se, but it means that the presence or absence of an optional dependency changes the runtime settings surface.

**Permission mapping drift.** Importing `vueda.core.patch_django` before the permission mapping is in place causes the patch to capture stale or empty mapping data. Permissions are then created and checked under Django's default codenames (`add_*`, `view_*`, `change_*`) rather than VUEDA's CRUDL names. The symptom is authorization failures that seem unrelated to the actual permission assignments.

**Server/client query parameter drift.** Overriding the server's query parameter settings without updating the client constants breaks the wire contract. Client requests continue to send the original parameter names, which the server ignores because they no longer match the parameter names it expects. The symptom is that search, ordering, pagination, or flex-field selections have no effect; requests succeed but return unfiltered, unordered, or unpaginated results.

**Client CSRF env missing.** When `VITE_CSRF_COOKIE_NAME` is unset, the CSRF utility constructs headers with an undefined cookie name. The server's CSRF middleware returns a `403` for unsafe HTTP methods. This failure is particularly confusing because `GET` requests work normally, so the application appears functional until the first mutation.

**Model-info PK omission in config derivation.** `getDefaultFromModelInfo` expects `modelInfo.pk` to be present when computing default field lists. If PK is missing (because the server serializer omits it), the PK field is not excluded from display and submit field defaults, which causes it to appear in forms and list columns where it would normally be hidden.

## Relevant Implementation Surface

- {@api py:module:vueda.core.default_settings}
- {@api py:function:vueda.core.default_settings.get_defaults}
- {@api py:function:vueda.core.default_settings.get_production_defaults}
- {@api py:module:vueda.core.config}
- {@api py:class:vueda.core.config.TomlEnv}
- {@api py:function:vueda.core.config.load_toml}
- {@api py:module:vueda.core.patch_django}
- {@api py:module:vueda.core.permissions}
- {@api js:module:@arrai-innovations/vueda.utils/constants}
- {@api js:module:@arrai-innovations/vueda.utils/actionMap}
- {@api js:module:@arrai-innovations/vueda.utils/csrf}
- {@api js:module:@arrai-innovations/vueda.utils/connectionHostname}
- {@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}
