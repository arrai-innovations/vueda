---
title: Configure the Cache and Sessions
type: how-to
audience: integrator
status: draft
---

# Configure the Cache and Sessions

{@api py:function:vueda.core.default_settings.get_defaults} requires a `CACHE_URL` key and builds {@api ext:django:setting:CACHES}`["default"]` from it, the same way it requires `DATABASE_URL`. With the scaffolded project's TOML config adapter, startup fails without the key:

```text
KeyError: 'Missing config key: CACHE_URL'
```

This guide covers choosing a value for that key in a deployment. [Architecture Overview](../core-concepts/architecture-overview#architectural-dependencies) covers the cache as an infrastructure dependency, alongside PostgreSQL and the message broker.

## What the Cache Holds

Three features use this cache, and each one needs every process to reach the same cache:

- **Sessions.** `get_defaults` sets {@api ext:django:setting:SESSION_ENGINE} to `django.contrib.sessions.backends.cache`, so a signed-in user's session lives here.
- **The forgot-password cooldown.** {@api py:class:vueda.user.views.VuedaForgotPasswordView} accepts one request per address per minute and answers `429` to the next. It stores a 60-second marker per lower-cased address.
- **Rate-limit counters.** allauth keeps the count for every one of its rate limits here, and DRF keeps the count for every throttle. [Rate-Limited Auth Endpoints](#rate-limited-auth-endpoints) lists the ones that apply to VUEDA's endpoints.

On a per-process cache, each process keeps its own counts and markers. A caller then gets the configured limit once per process.

## Choose a Backend

Count the processes that serve your application. A production deployment normally runs several web worker processes, so treat the first two rows as the normal case.

| Deployment                                      | `CACHE_URL`        | Needs                                 |
| ----------------------------------------------- | ------------------ | ------------------------------------- |
| More than one worker process                    | `redis://...`      | A Redis service and the `redis` extra |
| More than one worker process, no second service | `db://cache_table` | One `createcachetable` run            |
| One process only, or local development          | `locmem://`        | Nothing                               |

## Rate-Limited Auth Endpoints

VUEDA limits the auth endpoints that check a password or code, and the ones that send an email or text message. VUEDA enforces some limits with DRF throttles, and allauth enforces the others. The status code of a refused request depends on which one refuses it:

- **400.** allauth counts wrong passwords and wrong two-factor codes inside form validation (`login_failed`). A refused request gets a 400 response whose body carries `non_field_errors: ["Too many failed login attempts. Try again later."]`.
- **429 without `Retry-After`.** allauth's other limits (`login` and `reauthenticate`) refuse the request before the form runs. The response has no `Retry-After` header.
- **429 with `Retry-After`.** VUEDA's DRF throttles answer 429 with a `Retry-After` header that gives the seconds to wait.

| Endpoint (under `vueda.user/`)             | What the limit counts                                      | Default                                                      | Setting key                                                         | Response               |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------- |
| `login/`                                   | Every sign-in request                                      | 30 a minute per IP address                                   | `ACCOUNT_RATE_LIMITS["login"]`                                      | 429, no `Retry-After`  |
| `login/`                                   | Wrong passwords                                            | 10 a minute per IP address, 5 in 5 minutes per email address | `ACCOUNT_RATE_LIMITS["login_failed"]`                               | 400                    |
| `2fa/authenticate/`, `2fa/reauthenticate/` | Wrong two-factor codes                                     | 10 a minute per IP address, 5 in 5 minutes per user          | `ACCOUNT_RATE_LIMITS["login_failed"]`                               | 400                    |
| `reauthenticate/`                          | Every password confirmation                                | 10 a minute per user                                         | `ACCOUNT_RATE_LIMITS["reauthenticate"]`                             | 429, no `Retry-After`  |
| `change_password/`                         | Every password change                                      | 5 a minute per user                                          | `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["change_password"]`       | 429 with `Retry-After` |
| `forgot-password/`                         | Every reset request                                        | 20 an hour per IP address                                    | `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["forgot_password"]`       | 429 with `Retry-After` |
| `totp_code/`, `totpdevice/setup/`          | Codes sent by email or text message                        | 5 an hour per user for each method, email or SMS             | `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["totp_send_user"]`        | 429 with `Retry-After` |
| `totpdevice/setup/`                        | Codes sent to a new device's email address or phone number | 5 an hour per email address or phone number                  | `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["totp_send_destination"]` | 429 with `Retry-After` |

A correct password does not count toward `login_failed`, and a correct two-factor code clears that user's count. `forgot-password/` also refuses a second request for the same address within 60 seconds.

VUEDA and allauth find a client's IP address the same way, through allauth's `get_client_ip`. It ignores `X-Forwarded-For` unless you set `ALLAUTH_TRUSTED_PROXY_COUNT` or `ALLAUTH_TRUSTED_CLIENT_IP_HEADER`. Behind a reverse proxy, set one of them, or every client shares the proxy's address and its per-IP limits.

To change a VUEDA limit, set its single key in your settings module. Replacing the whole `DEFAULT_THROTTLE_RATES` dictionary drops VUEDA's other rates, and the endpoints that use them then fail when a request arrives. allauth merges `ACCOUNT_RATE_LIMITS` over its own defaults, so that dictionary holds only the keys you change. The allauth [rate limits reference](https://docs.allauth.org/en/dev/account/rate_limits.html) covers its rate format.

## Point `CACHE_URL` at Redis

Install VUEDA with the `redis` extra, which installs the Redis client. Django's `RedisCache` backend imports the client only when the cache is first used. The scaffolded project's `server/pyproject.toml` already lists the extra:

```toml
dependencies = [
    "vueda[redis] >=3.0.0a4,<4",
]
```

Set `CACHE_URL` to the instance's URL:

```toml
CACHE_URL = "redis://localhost:6379/0?key_prefix=widgets-"
```

For a unix socket, leave the host empty. For TLS, use the `rediss://` scheme:

```toml
CACHE_URL = "redis:///var/run/redis/redis.sock?key_prefix=widgets-"
CACHE_URL = "rediss://cache.example.com:6379/0?key_prefix=widgets-"
```

Credentials go in the URL as they do for `DATABASE_URL`, so keep this key in a configuration layer you do not commit, such as `config.local.toml`.

### Set a Key Prefix

Give every deployment its own `key_prefix`, which becomes Django's {@api ext:django:setting:CACHES-KEY_PREFIX}. Use the project's own name.

Two applications that share one Redis database and one prefix share their fixed-name keys:

- A forgot-password request in one application starts the cooldown for the same address in the other.
- Rate-limit counts add up across both applications.

Give each application its own database number as well. {@api ext:django:django.core.cache.cache.clear} empties the whole Redis database regardless of the key prefix. The call signs out every user of every application in that database. A common split puts the cache on `/0` and the Celery broker on `/1`.

## Use the Database Cache Instead

Where a second service is not worth running, point the URL at a table:

```toml
CACHE_URL = "db://widgets_cache"
```

The table sits outside the migration graph, so create it once per deployment, after migrating:

```console
python manage.py createcachetable
```

Run it on every new deployment. Without the table, every request that reads or writes the session fails, including sign-in. The forgot-password cooldown and the rate limits fail too. Every process reaches the same table, so sessions hold across workers. The cost is session traffic on your database connection pool.

## Keep a Per-Process Cache Only for One Process

`locmem://` is private to each process. Use it for `manage.py runserver`, for a test suite, and for a deployment where one process serves every request:

```toml
CACHE_URL = "locmem://unique-snowflake?key_prefix=widgets-"
```

Behind more than one worker, use Redis or the database cache. With `locmem://`, a session that one worker writes is missing when another worker serves the next request. The user loses the session at an unpredictable point.

## Move Sessions Out of the Cache

To keep a per-process cache and still hold sessions across workers, set the database session engine in your own settings module:

```python
SESSION_ENGINE = "django.contrib.sessions.backends.db"
```

The `django.contrib.sessions` migrations create the table. The forgot-password cooldown and the rate limits still live in the cache. On a per-process cache, the cooldown admits one request per address per worker.

{@api ext:django:django.contrib.sessions.backends.cached_db.SessionStore} (`django.contrib.sessions.backends.cached_db`) sits between the two. It reads through the cache and writes through to the database. With a per-process cache, `cached_db` finds fewer sessions in the cache and reads more of them from the database, but it keeps every session.

## Verify the Configuration

Run the deploy checks:

```console
python manage.py check --deploy
```

When sessions use the cache engine and the cache is `locmem://` or `dummy://`, the check reports `vueda_core.W001`:

```text
WARNINGS:
?: (vueda_core.W001) SESSION_ENGINE stores sessions in the 'default' cache, which uses django.core.cache.backends.locmem.LocMemCache.
	HINT: Point CACHE_URL at a cache every worker process shares, such as 'redis://host:6379/0?key_prefix=app-' or 'db://cache_table'. Keep the per-process backend only where one process serves every request, or set SESSION_ENGINE to 'django.contrib.sessions.backends.db'.
```

{@api py:function:vueda.core.checks.check_session_cache_is_shared} runs only with `--deploy`, and only while {@api ext:django:setting:DEBUG} is off, because a development server is one process. It does not report `cached_db`.

To confirm a shared backend end to end, write a value in one shell and read it back in another:

```console
python manage.py shell -c "from django.core.cache import cache; cache.set('probe', 'ok', 60)"
python manage.py shell -c "from django.core.cache import cache; print(cache.get('probe'))"
```

Each command is its own process. `ok` means both reached the same cache, and `None` means they did not.

## Related

- [Local HTTPS Development](local-https-setup.md) covers running locally over HTTPS, so the secure session cookie works the way it does in production.
- [Set Up and Operate the VUEDA Dispatch Queue (VDQ)](vdq-actions.md) covers the Celery broker. The broker has its own `CELERY_BROKER_URL` key, even where one Redis instance serves both.
