---
title: Configuration Surface and Defaults
type: explanation
audience: integrator
status: draft
---

# Configuration Surface and Defaults

A VUEDA project is configured in three places: the Django settings that {@api py:function:vueda.core.default_settings.get_defaults} builds, the query parameter names that the server and client both hold, and a few Vite environment variables on the client. This page describes what each one sets, which values a project must supply, and what fails when a value is missing or the two sides disagree. It also states the request transaction rule that these defaults put in place.

## Server Settings from `get_defaults`

`get_defaults(env)` reads values through an env adapter and returns a dict of Django settings. The adapter is any object with the methods of the {@api py:class:vueda.core.default_settings.EnvLike} protocol. VUEDA ships {@api py:class:vueda.core.config.TomlEnv}, which reads a mapping built by {@api py:function:vueda.core.config.load_toml} and checks the process environment first. A project's settings module applies the result with `locals().update(get_defaults(env))` and overrides individual keys after that line. VUEDA has no settings reference page yet ([#382](https://github.com/arrai-innovations/vueda/issues/382)), so the `get_defaults` source is the complete list of keys it sets.

### Required keys

`get_defaults` reads these keys with no default, so the project must supply each one:

- Identity and hosts: `SECRET_KEY`, `SITE_NAME`, `TIME_ZONE`, `ALLOWED_HOSTS`, `AUTH_USER_MODEL`.
- Frontend: `FRONTEND_DOMAIN`, `FRONTEND_LOGIN_URL`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`.
- Storage: `DATABASE_URL`, `CACHE_URL`, `DATABASE_BACKUP_DIR`, `STATIC_ROOT`, `STATICFILES_DIRS`.
- Email: `SUPPORT_EMAIL`, and `NO_REPLY_EMAIL`, the sender for password reset, welcome, and two-factor email.
- Mailgun, only when `EMAIL_BACKEND` is `anymail.backends.mailgun.EmailBackend`: `ANYMAIL_MAILGUN_API_KEY`, `ANYMAIL_MAILGUN_SENDER_DOMAIN`, `ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY`, `ANYMAIL_WEBHOOK_SECRET`.

`CACHE_URL` is required because sessions are stored in the cache. [Configure the Cache and Sessions](../guides/configure-cache-and-sessions) describes the backend choices.

VUEDA code also reads one setting that `get_defaults` never sets. The VDQ attachment serializer builds attachment URLs from `VDQ_URL`, so a project that serves VDQ attachments sets it itself.

### Optional keys

Optional keys have defaults: {@api ext:django:setting:DEBUG} is `False`, `LANGUAGE_CODE` is `"en-us"`, `MEDIA_ROOT` is `"/tmp/media"`, `LOGS_FOLDER` is `"."`, and `EMAIL_BACKEND` is Django's console backend.

By default, `get_defaults` puts the email backend in Django's deprecated {@api ext:django:setting:EMAIL_BACKEND} setting, with `EMAIL_TIMEOUT` set to 5. These settings still work on Django 6.1, and packages that a project depends on may not yet support the replacement. Passing [`use_mailers=True`]{@api py:param:vueda.core.default_settings.get_defaults.use_mailers} puts the same backend in Django 6.1's {@api ext:django:setting:MAILERS} setting instead, as `{"default": {"BACKEND": ..., "OPTIONS": {"timeout": 5}}}`. Before opting in, read Django's [MAILERS migration guide](https://docs.djangoproject.com/en/6.1/howto/mailers-migration/) and confirm that your email packages (for example `django-anymail`) support `MAILERS`. On Django versions before 6.1, `use_mailers=True` raises {@api ext:django:django.core.exceptions.ImproperlyConfigured}, because those versions ignore `MAILERS` and would send through Django's default SMTP backend.

### Derived values

After reading keys, `get_defaults` computes these settings:

- {@api ext:django:setting:INSTALLED_APPS} is `DJANGO_APPS`, then `VUEDA_APPS`, then `THIRD_PARTY_APPS`, then `LOCAL_APPS`. `get_defaults` appends `pgtrigger` and `pghistory` to the third-party apps.
- `VUEDA_APPS` must include `vueda.history`, because the migrations of every app with a tracked model depend on it. Without it, `get_defaults` raises `ImproperlyConfigured`.
- {@api py:class:vueda.history.middleware.VuedaHistoryMiddleware} goes into {@api ext:django:setting:MIDDLEWARE} directly after Django's `AuthenticationMiddleware`, since it reads `request.user`. The system checks `vueda_history.W001` and `vueda_history.W002` report a project that removes it or moves it before authentication.
- `PGHISTORY_APPEND_ONLY` is `True` and `PGHISTORY_CREATED_AT_FUNCTION` is `"clock_timestamp()"`. The shipped migrations write both into their trigger SQL, so `get_defaults` sets them unconditionally.
- The `default` database gets [`ATOMIC_REQUESTS`]{@api ext:django:setting:DATABASE-ATOMIC_REQUESTS} set to `True` and `CONN_MAX_AGE` set to `0`. On a PostgreSQL-family engine it also gets the `REPEATABLE READ` isolation level.
- When `drf_spectacular` is importable, `get_defaults` adds it to the third-party apps, sets VUEDA's schema class in `REST_FRAMEWORK`, and adds `SPECTACULAR_SETTINGS`. Removing the package later removes these settings.

### Production defaults

{@api py:function:vueda.core.default_settings.get_production_defaults} returns the Sentry settings and makes `SENTRY_DSN` required. Nothing in VUEDA or the project templates calls this function or initializes Sentry, so a production settings file does both.

## Request Transactions

Every request to a view runs in one database transaction on the `default` database. `get_defaults` turns this on with `ATOMIC_REQUESTS`, and Django then wraps each view call in {@api ext:django:django.db.transaction.atomic}. The transaction commits when the view returns a response and rolls back when the view raises.

DRF views catch exceptions and turn them into responses, so without further help Django would commit writes made before the error. VUEDA's exception handler, {@api py:function:vueda.core.exceptions.debug_stack_exception_handler}, marks the transaction for rollback before it builds any response. This covers every error it answers:

- Validation, permission, and not-found errors.
- Exceptions that DRF does not handle, which become a `500` response.
- The `409` that [`gate_warnings`]{@api py:function:vueda.core.exceptions.gate_warnings} raises during {@term Warning Confirmation}, so a withheld write keeps nothing it did before the gate.

A {@term Dry Run} request also rolls back, after the action body returns. Two cases still commit:

- A view that returns an error response directly, without raising, commits the writes it made, whatever the status code.
- Writes to a database without `ATOMIC_REQUESTS` commit, because only databases with the flag set take part. `get_defaults` sets the flag on the `default` entry it returns, so a project that replaces that entry or adds another database sets the flag itself.

## Wire Query Parameter Namespace

The server and client use the same fixed query parameter names, called {@term Wire Query Parameters}. Server settings define each name, and the client holds a matching constant in {@api js:module:@arrai-innovations/vueda/utils/constants}:

| Name | Purpose       | Server setting                     | Client constant                                                                 |
| ---- | ------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `s`  | Search        | `REST_FRAMEWORK["SEARCH_PARAM"]`   | {@api js:property:@arrai-innovations/vueda/utils/constants#SEARCH_PARAM}        |
| `o`  | Ordering      | `REST_FRAMEWORK["ORDERING_PARAM"]` | {@api js:property:@arrai-innovations/vueda/utils/constants#ORDERING_PARAM}      |
| `p`  | Page number   | `PAGE_QUERY_PARAM`                 | {@api js:property:@arrai-innovations/vueda/utils/constants#PAGE_PARAM}          |
| `ps` | Page size     | `PAGE_SIZE_QUERY_PARAM`            | {@api js:property:@arrai-innovations/vueda/utils/constants#PAGE_SIZE_PARAM}     |
| `e`  | Expand        | `REST_FLEX_FIELDS["EXPAND_PARAM"]` | {@api js:property:@arrai-innovations/vueda/utils/constants#EXPAND_PARAM}        |
| `f`  | Fields        | `REST_FLEX_FIELDS["FIELDS_PARAM"]` | {@api js:property:@arrai-innovations/vueda/utils/constants#FIELDS_PARAM}        |
| `om` | Omit          | `REST_FLEX_FIELDS["OMIT_PARAM"]`   | {@api js:property:@arrai-innovations/vueda/utils/constants#OMIT_PARAM}          |
| `ct` | Column totals | `COLUMN_TOTALS_PARAM`              | {@api js:property:@arrai-innovations/vueda/utils/constants#COLUMN_TOTALS_PARAM} |

{@api py:class:vueda.core.pagination.VUEDAPageNumberPagination} reads `PAGE_QUERY_PARAM` and `PAGE_SIZE_QUERY_PARAM`. DRF's own defaults for search and ordering are `search` and `ordering`; [DRF Ecosystem Compatibility Boundaries](./drf-ecosystem-deviations) describes that departure.

The client does not discover these names at runtime. [#301](https://github.com/arrai-innovations/vueda/issues/301) tracks reporting them to the client. Until then, renaming one on the server requires the same change to the client constant.

The server builds its set of accepted query keys from the same settings. After a server-side rename, a client that still sends the old key gets a `400` "Invalid query parameter" response from `list` and `retrieve` on {@api py:class:vueda.core.viewsets.VuedaViewSet} and {@api py:class:vueda.core.viewsets.VuedaReadOnlyViewSet} endpoints. [Query parameter validation]{@term Query Parameter Validation} describes which keys each endpoint accepts.

`ct` is the one name whose accepted values depend on the viewset. When drf-spectacular is installed, [`get_override_parameters`]{@api py:function:vueda.core.open_api.VuedaBaseAutoSchema.get_override_parameters} documents it on each `list` operation whose viewset declares {@term Column Totals}, with that viewset's total names.

## Permission Name Patch

VUEDA names permissions with its {@term CRUD} actions. The {@term Permission Mapping} setting, `PERMISSION_NAMES_MAPPING`, renames Django's actions. By default it maps `add` to `create`, `change` to `update`, and `view` to `read`. Importing {@api py:module:vueda.core.patch_django} from the project's settings applies it. The import patches four things:

- {@api py:function:vueda.core.patch_django.get_permission_codename} replaces Django's `get_permission_codename` and renames the action through the mapping.
- {@api py:function:vueda.core.patch_django.get_builtin_permissions} replaces the function that Django uses to build a model's default permission rows, and renames each action the same way.
- Every model that does not declare its own {@api ext:django:django.db.models.Options.default_permissions} gets `list` added to its `default_permissions`, third-party models included. This is where each model's `list` permission row comes from.
- When the mapping is a reverse mapping (it maps to Django's names), the import rewrites {@api py:property:vueda.core.permissions.ObjectPermissions.perms_map} to check those names.

The two replacement functions read the mapping when called and cache it until Django's {@api ext:django:django.test.signals.setting_changed} signal reports a change. The `perms_map` rewrite is decided once, when `patch_django` is imported. The import leaves {@api py:class:vueda.core.permissions.DynamicObjectPermissions} and {@api py:class:vueda.workflow.permissions.WorkflowObjectPermissions} alone, because they resolve their action through the mapping when each check runs.

[Map Django and VUEDA Permission Names](../guides/permission-name-mapping) gives the import placement and the steps for changing the mapping. [Permissions](../reference/permissions#permission-name-mapping) lists the setting's values.

## Client Model Config

On the client, {@term Model Config} comes from {@term Model Info} and the overrides that a project passes to [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig}. [Reactive Data Flow](./reactive-data-flow) describes how {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig} builds, caches, and clears configs. [Contract-First Dynamic UI](./contract-first-dynamic-ui#configuration-precedence) describes which layer wins when defaults and overrides disagree.

## Client Environment Variables

Three Vite build-time variables configure the client:

- `VITE_CSRF_COOKIE_NAME` names the cookie that the client reads, through {@api js:function:@arrai-innovations/vueda/utils/csrf#getCSRFValue}, to fill the `X-CSRFToken` header on writes. It must equal the server's {@api ext:django:setting:CSRF_COOKIE_NAME}. `get_defaults` leaves that setting at Django's `csrftoken`, and the project templates set both names only in their development settings.
- `VITE_DJANGO_CONNECTION_PORT`, when set, is appended as a port to `window.location.hostname` to form {@api js:property:@arrai-innovations/vueda/utils/connectionHostname#connectionHostname}. Development setups use it when Vite and Django listen on different ports.
- `VITE_PACKAGE_VERSION` is the project's client version, which {@api js:function:@arrai-innovations/vueda/use/useVersion#useVersion} reports as `projectClientVersion`. No VUEDA code sets it ([#300](https://github.com/arrai-innovations/vueda/issues/300)). While it is unset, `newClientAvailable` stays false.

## Failure Modes

**Missing required key.** `TomlEnv` raises `KeyError("Missing config key: <key>")` when `get_defaults` reads it, so the server fails at startup and names the key. `load_toml` returns an empty mapping for a missing file, so a missing `config.local.toml` shows up only as this error.

**Invalid typed value.** Values from the environment are strings, and TOML values arrive typed; the typed accessors convert both. A boolean accepts `1`, `true`, `t`, `yes`, `y`, or `on`, and `0`, `false`, `f`, `no`, `n`, or `off`, in any case. Any other value, such as `"maybe"`, raises a `ValueError` that names the key. An integer or float accessor names the key only for an empty string. Any other bad string, such as `"abc"`, raises Python's own `ValueError`, which does not name the key.

**Environment overlay surprises.** `TomlEnv` checks the process environment before the TOML mapping by default, because its `prefer_env` argument defaults to `True`. With a `prefix`, `TomlEnv` adds the prefix to the key for both lookups, so the TOML keys need it too.

**Permission patch missing.** Without the `patch_django` import, Django creates permission rows under its own names (`add_*`, `change_*`, `view_*`) and creates no `list_*` rows. `ObjectPermissions` still checks `create_*`, `read_*`, `list_*`, `update_*`, and `delete_*`, so every check against an assigned permission fails. The symptom is `403` responses that do not match the user's assigned permissions. When the mapping changes later, existing permission rows keep the codenames they were created with.

**Reverse mapping set after the import.** If a reverse mapping is set after `patch_django` is imported, `ObjectPermissions.perms_map` keeps the entries selected at import. Its HTTP method checks then disagree with the mapping in effect. `DynamicObjectPermissions` and `WorkflowObjectPermissions` are unaffected.

**CSRF cookie name missing or wrong.** When `VITE_CSRF_COOKIE_NAME` is unset or differs from `CSRF_COOKIE_NAME`, the client sends no valid token. The server's CSRF check then answers `403` to `POST`, `PUT`, `PATCH`, and `DELETE` requests. `GET` requests still work, so the application looks healthy until the first write.
