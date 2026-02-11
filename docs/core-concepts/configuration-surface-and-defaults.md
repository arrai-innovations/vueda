---
title: Configuration Surface and Defaults
type: explanation
audience: implementor
status: briefing
---

# Configuration Surface and Defaults

## Intent and Scope

- Define the configuration contract surface that is treated as stable by VUEDA runtime code: server settings assembly, env-adapter semantics, wire-level query parameter names, permission-codename mapping, and client runtime env + model config defaults.
- Establish authority boundaries: which layer defines defaults, which layer consumes them, and which layer may override without being observed by other layers.
- Enumerate observable failure modes when required config keys are missing, types are invalid, or server/client config surfaces drift.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/config.py`, `server/vueda/core/patch_django.py`, `client/lib/utils/constants.js`, `client/lib/stores/storeModelConfig.js`.

## Non-goals

- Not a catalog of every Django/DRF setting value shipped by VUEDA.
- Not a how-to for overriding settings or choosing deployment-specific values.
- Not an environment-variable reference for a particular project template.

## Key Concepts

### Server defaults are assembled as a settings dict

- What it is: `get_defaults(env)` computes a single dict containing Django settings, framework configuration, and VUEDA-specific settings (including derived `INSTALLED_APPS` and database options). Anchors: `server/vueda/core/default_settings.py#L35`, `server/vueda/core/default_settings.py#L397`.
- Why it exists: VUEDA runtime code assumes the presence and shape of specific settings (e.g. query param names, permissions class, middleware/security defaults). Anchors: `server/vueda/core/default_settings.py#L122`, `server/vueda/core/default_settings.py#L250`.
- Where it lives: `vueda.core.default_settings.get_defaults`. Anchors: `server/vueda/core/default_settings.py#L35`.

### Env adapter semantics are part of the contract boundary

- What it is: `get_defaults(env)` requires an “Env-like” object with typed accessors; missing keys may raise immediately, and typed getters may reject invalid values. Anchors: `server/vueda/core/default_settings.py#L20`, `server/vueda/core/config.py#L52`.
- Why it exists: defaults intentionally omit a default value for some keys (treating them as required) and normalize types (e.g. booleans/lists/URLs) at the config boundary. Anchors: `server/vueda/core/default_settings.py#L66`, `server/vueda/core/config.py#L62`.
- Where it lives: `vueda.core.default_settings.EnvLike` (typing contract) and `vueda.core.config.TomlEnv` (one concrete implementation). Anchors: `server/vueda/core/default_settings.py#L10`, `server/vueda/core/config.py#L32`.

### Wire-level query parameter names are a shared server/client surface

- What it is: the server declares canonical query keys for search/ordering/pagination and flex-fields (`s`, `o`, `p`, `ps`, `e`, `f`, `om`), and the client hard-codes the same keys as constants. Anchors: `server/vueda/core/default_settings.py#L265`, `server/vueda/core/default_settings.py#L284`, `client/lib/utils/constants.js#L23`.
- Why it exists: client network utilities and metadata fetch paths depend on stable query key names; drift is a wire contract break, not a UI-only change. Anchors: `client/lib/utils/constants.js#L23`.
- Where it lives: `REST_FRAMEWORK` / `REST_FLEX_FIELDS` / pagination settings and `@vueda/utils/constants`. Anchors: `server/vueda/core/default_settings.py#L250`, `client/lib/utils/constants.js#L19`.

### Permission codename mapping is patched at import-time

- What it is: VUEDA patches Django permission codename derivation and builtin permission generation using `settings.PERMISSION_NAMES_MAPPING`, and caches that mapping at module import time. Anchors: `server/vueda/core/patch_django.py#L11`, `server/vueda/core/patch_django.py#L14`.
- Why it exists: server permissions and client metadata rely on CRUDL-ish permission names (e.g. `read_*`, `create_*`) rather than Django’s default `view_*`, `add_*`, `change_*`. Anchors: `server/vueda/core/default_settings.py#L164`, `server/vueda/core/permissions.py#L12`.
- Where it lives: `vueda.core.patch_django` and the default mapping in `get_defaults`. Anchors: `server/vueda/core/patch_django.py#L1`, `server/vueda/core/default_settings.py#L164`.

### Client model configuration defaults are derived from model-info

- What it is: `storeModelConfig` builds a `ModelConfig` from `modelInfo` (fields/expand/actions/filtering/ordering) and merges view-specific and custom overrides, then caches the merged result. Anchors: `client/lib/stores/storeModelConfig.js#L106`, `client/lib/stores/storeModelConfig.js#L441`.
- Why it exists: client UI behavior (fields fetched/displayed, expand flattening, action routing defaults) depends on a normalized config object even when no project-specific config exists. Anchors: `client/lib/stores/storeModelConfig.js#L133`, `client/lib/stores/storeModelConfig.js#L229`.
- Where it lives: `@vueda/stores/storeModelConfig`. Anchors: `client/lib/stores/storeModelConfig.js#L403`.

## Relevant Implementation Surface

- `{@api py:module:vueda.core.default_settings}`
- `{@api py:function:vueda.core.default_settings.get_defaults}`
- `{@api py:function:vueda.core.default_settings.get_production_defaults}`
- `{@api py:module:vueda.core.config}`
- `{@api py:class:vueda.core.config.TomlEnv}`
- `{@api py:function:vueda.core.config.load_toml}`
- `{@api py:module:vueda.core.patch_django}`
- `{@api py:module:vueda.core.permissions}`
- `{@api js:module:@arrai-innovations/vueda.utils/constants}`
- `{@api js:module:@arrai-innovations/vueda.utils/actionMap}`
- `{@api js:module:@arrai-innovations/vueda.utils/csrf}`
- `{@api js:module:@arrai-innovations/vueda.utils/connectionHostname}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`

## Contracts and Invariants

- `get_defaults(env)` returns a dict intended to be treated as authoritative defaults, including derived values computed after optional dependency checks (e.g. drf-spectacular) and post-processing (DB options, `INSTALLED_APPS`). Anchors: `server/vueda/core/default_settings.py#L351`, `server/vueda/core/default_settings.py#L397`.
- Required key semantics: any config key read without a default in `get_defaults` or `get_production_defaults` is required by the env adapter (missing key is an error at read-time). Anchors: `server/vueda/core/default_settings.py#L66`, `server/vueda/core/default_settings.py#L418`, `server/vueda/core/config.py#L52`.
- Required/contractual keys grouped by concern (non-exhaustive; authoritative list is the set of keys read without defaults in `get_defaults` / `get_production_defaults`). Anchors: `server/vueda/core/default_settings.py#L60`, `server/vueda/core/default_settings.py#L412`.
- **Cryptographic identity and session integrity**: `SECRET_KEY` is required; sessions are configured to use the cache backend; default session cookie flags are secure/strict/httponly; the cache backend is Redis and requires `REDIS_URL`. Anchors: `server/vueda/core/default_settings.py#L66`, `server/vueda/core/default_settings.py#L122`, `server/vueda/core/default_settings.py#L229`, `server/vueda/core/default_settings.py#L231`.
- **Frontend origin, host acceptance, and redirect surfaces**: `ALLOWED_HOSTS`, `FRONTEND_DOMAIN`, and `FRONTEND_LOGIN_URL` are required; `FRONTEND_RESET_URL` defaults to `"/reset-password"`. Anchors: `server/vueda/core/default_settings.py#L109`, `server/vueda/core/default_settings.py#L117`.
- **Authentication identity surfaces**: `AUTH_USER_MODEL` is required; default authentication backends include Django model auth and allauth. Anchors: `server/vueda/core/default_settings.py#L147`, `server/vueda/core/default_settings.py#L151`.
- **Project identity and localization**: `TIME_ZONE`, `SITE_NAME`, and `SUPPORT_EMAIL` are read via the env adapter without defaults; `LANGUAGE_CODE` defaults to `"en-us"`. Anchors: `server/vueda/core/default_settings.py#L113`, `server/vueda/core/default_settings.py#L114`, `server/vueda/core/default_settings.py#L131`.
- **Database and persistence backends**: `DATABASE_URL` is required; DB options are post-processed to enable atomic requests, set isolation level, and set `CONN_MAX_AGE` to `0`; defaults also include `DATABASE_BACKUP_DIR` (required) and `PACKAGE_MANAGER` (default `"auto"`) as part of the server-side “update” tooling surface. Anchors: `server/vueda/core/default_settings.py#L118`, `server/vueda/core/default_settings.py#L333`, `server/vueda/core/default_settings.py#L397`.
- **Static/media paths**: `STATIC_ROOT` and `STATICFILES_DIRS` are read via the env adapter without defaults; media paths default to `MEDIA_ROOT="/tmp/media"` and `MEDIA_URL="/media/"`. Anchors: `server/vueda/core/default_settings.py#L137`, `server/vueda/core/default_settings.py#L139`, `server/vueda/core/default_settings.py#L144`.
- **Cross-origin and CSRF trust configuration**: `CSRF_TRUSTED_ORIGINS` is required; `CSRF_COOKIE_HTTPONLY` defaults to `False` and `CSRF_COOKIE_SECURE` defaults to `True`; `CORS_ALLOWED_ORIGINS` is required and is used to populate CORS settings. Anchors: `server/vueda/core/default_settings.py#L133`, `server/vueda/core/default_settings.py#L134`, `server/vueda/core/default_settings.py#L300`.
- **Messaging/observability backends**: logging file path is derived from `LOGS_FOLDER` (default `"."`), email backend defaults to console, and optional integration keys exist for Celery/Twilio; when Mailgun backend is selected, Mailgun-related keys become required. Anchors: `server/vueda/core/default_settings.py#L61`, `server/vueda/core/default_settings.py#L93`, `server/vueda/core/default_settings.py#L119`, `server/vueda/core/default_settings.py#L338`.
- **Telemetry/trace backends**: `SENTRY_DSN` is required by production defaults and is not required by baseline defaults. Anchors: `server/vueda/core/default_settings.py#L418`.
- Env adapter precedence (TomlEnv): when `prefer_env` is true, process environment variables override TOML-loaded config values with the same key/prefix. Anchors: `server/vueda/core/config.py#L42`, `server/vueda/core/config.py#L361`.
- Wire key invariants:
  - Server declares `SEARCH_PARAM == "s"` and `ORDERING_PARAM == "o"`; client uses the same literal constants. Anchors: `server/vueda/core/default_settings.py#L265`, `client/lib/utils/constants.js#L42`.
  - Server declares flex-field params `e`/`f`/`om`; client uses the same literal constants. Anchors: `server/vueda/core/default_settings.py#L284`, `client/lib/utils/constants.js#L23`.
  - Server declares pagination params `p`/`ps`; client uses the same literal constants. Anchors: `server/vueda/core/default_settings.py#L297`, `client/lib/utils/constants.js#L54`.
- Permission mapping lifecycle: `vueda.core.patch_django` snapshots `settings.PERMISSION_NAMES_MAPPING` at import time; later mutation of the setting is not observed by the patch module. Anchors: `server/vueda/core/patch_django.py#L11`, `server/vueda/core/patch_django.py#L23`.
- Client config derivation invariants:
  - If `modelInfo` is missing `fields`, `expand`, or `actions`, `getDefaultFromModelInfo` returns a minimal config shape with empty detail objects. Anchors: `client/lib/stores/storeModelConfig.js#L107`.
  - Default action redirects use view-name strings (e.g. `"read"`) even when the underlying server action name is `"retrieve"`; the mapping boundary is `viewToActionNameMap`. Anchors: `client/lib/stores/storeModelConfig.js#L129`, `client/lib/stores/storeModelConfig.js#L159`, `client/lib/utils/actionMap.js#L1`.
  - `storeModelConfig` caches merged configs by `app.model[.view]` key; `setConfig` cancels in-flight builds and deletes cached built configs for the affected model. Anchors: `client/lib/stores/storeModelConfig.js#L426`, `client/lib/stores/storeModelConfig.js#L449`.
- Client runtime env surfaces:
  - CSRF cookie name is read from `import.meta.env.VITE_CSRF_COOKIE_NAME`. Anchors: `client/lib/utils/constants.js#L5`.
  - Connection hostname may include a Vite-injected port via `import.meta.env.VITE_DJANGO_CONNECTION_PORT`. Anchors: `client/lib/utils/connectionHostname.js#L2`.

## Footguns

- Missing required server keys manifests as a startup-time exception raised by the env adapter (TomlEnv: `KeyError("Missing config key: ...")`). Anchors: `server/vueda/core/config.py#L52`, `server/vueda/core/default_settings.py#L66`.
- Invalid typed values in TomlEnv manifest as `ValueError` (e.g. `Invalid boolean value for DEBUG: ...`, `Invalid integer value for SITE_ID: ...`). Anchors: `server/vueda/core/config.py#L62`, `server/vueda/core/config.py#L78`.
- Optional dependency coupling: if `drf_spectacular` is importable, `get_defaults` mutates `THIRD_PARTY_APPS`, `REST_FRAMEWORK.DEFAULT_SCHEMA_CLASS`, and adds `SPECTACULAR_SETTINGS`; presence/absence of the dependency changes runtime settings shape. Anchors: `server/vueda/core/default_settings.py#L351`.
- Permission mapping drift: importing `vueda.core.patch_django` before finalizing `PERMISSION_NAMES_MAPPING` causes the patch module to capture an earlier mapping; symptoms include permissions being created/checked under unexpected codenames. Anchors: `server/vueda/core/patch_django.py#L11`, `server/vueda/core/default_settings.py#L164`.
- Server/client query param drift: query param names are a wire contract and are not negotiated at runtime; the client uses fixed constants (`s`, `o`, `p`, `ps`, `e`, `f`, `om`) and the server defaults are set to those names. Divergence can make client requests silently stop applying search/order/pagination/flex-field intent. Anchors: `server/vueda/core/default_settings.py#L265`, `server/vueda/core/default_settings.py#L284`, `server/vueda/core/default_settings.py#L295`, `client/lib/utils/constants.js#L19`.
- Client CSRF env missing: if `import.meta.env.VITE_CSRF_COOKIE_NAME` is unset, CSRF header construction uses an undefined cookie name and requests send `X-CSRFToken` with a missing value; symptoms include server-side CSRF rejection of unsafe HTTP methods. Anchors: `client/lib/utils/constants.js#L5`, `client/lib/utils/csrf.js#L4`, `client/lib/utils/objectCrud.js#L130`, `server/vueda/core/default_settings.py#L176`.
- Model-info PK omission: `getDefaultFromModelInfo` assumes `modelInfo.pk` is present when excluding the PK field from default field lists; missing PK causes PK inclusion in `displayFields`/`fetchFields`/`submitFields`. Anchors: `client/lib/stores/storeModelConfig.js#L123`, `client/lib/stores/storeModelConfig.js#L124`.

## Suggested Outline

- `## Configuration Authority Boundaries`
- `## Server Settings Assembly Surface`
- `## Env Adapter Contract and Error Semantics`
- `## Wire Query Parameter Namespace`
- `## Permission Codename Mapping Lifecycle`
- `## Client ModelConfig Derivation and Cache`
- `## Client Runtime Env Surface`
- `## Observable Failure Modes`
