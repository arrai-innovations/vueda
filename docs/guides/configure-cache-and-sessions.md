---
title: Configure the Cache and Sessions
type: how-to
audience: integrator
status: draft
---

# Configure the Cache and Sessions

VUEDA requires a `CACHE_URL` key and builds `CACHES["default"]` from it, the same way it requires `DATABASE_URL`. Startup fails without it:

```text
KeyError: Missing config key: CACHE_URL
```

This guide covers answering that key for a deployment. [Architecture Overview](../core-concepts/architecture-overview#architectural-dependencies) covers why the cache is a dependency of its own.

## Choose a Backend

Count the processes that serve your application. Gunicorn, uvicorn, and daphne all run more than one worker by default, so treat the first two rows as the normal case.

| Deployment                                      | `CACHE_URL`        | Needs                                 |
| ----------------------------------------------- | ------------------ | ------------------------------------- |
| More than one worker process                    | `redis://...`      | A Redis service and the `redis` extra |
| More than one worker process, no second service | `db://cache_table` | One `createcachetable` run            |
| One process only, or local development          | `locmem://`        | Nothing                               |

Four things ride on the answer, and each one needs every worker to reach the same cache:

- **Sessions.** `get_defaults` sets `SESSION_ENGINE` to `django.contrib.sessions.backends.cache`, so this is where a signed-in user's session lives.
- **The forgot-password cooldown.** `VuedaForgotPasswordView` writes a marker for 60 seconds and refuses a second request for the same address while it is present.
- **allauth's rate limits.** allauth counts sign-in, sign-up, and password reset attempts here, including `login_failed`, which allows `10/m/ip` by default. Each worker keeps its own count on a per-process cache, so a caller meets the configured limit times the worker count.
- **DRF throttle counters**, once your project sets `DEFAULT_THROTTLE_CLASSES`. VUEDA ships `DEFAULT_THROTTLE_RATES` but no classes, so nothing throttles until you add them.

## Point `CACHE_URL` at Redis

Install VUEDA with the `redis` extra. Django ships the `RedisCache` backend itself and imports the client lazily, so nothing installs the client for you:

```toml
dependencies = [
    "vueda[redis] >=3.0.0a2,<4",
]
```

Name the instance:

```toml
CACHE_URL = "redis://localhost:6379/0?key_prefix=widgets-"
```

For a unix socket, leave the host empty. For TLS, use the `rediss://` scheme:

```toml
CACHE_URL = "redis:///var/run/redis/redis.sock?key_prefix=widgets-"
CACHE_URL = "rediss://cache.example.com:6379/0?key_prefix=widgets-"
```

Credentials go in the URL as they do for `DATABASE_URL`, so keep this key in a configuration layer you do not commit.

### Set a Key Prefix

Give every deployment its own `key_prefix`, which becomes Django's `KEY_PREFIX`. Use the project's own name. Two applications sharing one Redis instance under the same prefix write sessions to the same keys, and each signs the other's users out.

Separate database numbers work as a second layer, one per role. A common split puts the cache on `/0`, the Celery broker on `/1`, and a channel layer on `/2`. Numbering alone is easy to misread a year later, so let the prefix carry the identity.

## Use the Database Cache Instead

Where a second service is not worth running, point the URL at a table:

```toml
CACHE_URL = "db://widgets_cache"
```

The table sits outside the migration graph, so create it once per deployment, after migrating:

```console
python manage.py createcachetable
```

Run it on every new deployment. Without the table, the forgot-password cooldown raises on each attempt. Every process reaches the same table, so sessions behave correctly, at the cost of putting session traffic on your database connection pool.

## Keep a Per-Process Cache Only for One Process

`locmem://` is private to each process. Use it for `manage.py runserver`, for a test suite, and for a deployment where one process serves every request:

```toml
CACHE_URL = "locmem://unique-snowflake?key_prefix=widgets-"
```

Use anything else behind more than one worker. A session one worker writes is missing from the next request another worker serves, and the user loses the session at an unpredictable point.

## Move Sessions Out of the Cache

To keep a per-process cache and still hold sessions across workers, name the database session engine in your own settings module:

```python
SESSION_ENGINE = "django.contrib.sessions.backends.db"
```

`django.contrib.sessions` migrations create the table. The forgot-password cooldown still lives in the cache, so a per-process cache lets it admit one request per worker rather than one per address.

`django.contrib.sessions.backends.cached_db` sits between the two. It reads through the cache and writes through to the database, so a per-process cache costs it reads rather than sessions.

## Verify the Configuration

Ask for the deploy checks:

```console
python manage.py check --deploy
```

A cache that cannot hold sessions reports:

```text
?: (vueda_core.W001) SESSION_ENGINE stores sessions in the 'default' cache, which uses
django.core.cache.backends.locmem.LocMemCache.
```

The check runs only with `--deploy`, and only while `DEBUG` is off, because a development server shares its cache with itself.

To confirm a shared backend end to end, write a value in one shell and read it back in another:

```console
python manage.py shell -c "from django.core.cache import cache; cache.set('probe', 'ok', 60)"
python manage.py shell -c "from django.core.cache import cache; print(cache.get('probe'))"
```

Each command is its own process. `ok` means both reached the same cache, and `None` means they did not.

## Related

- [Architecture Overview](../core-concepts/architecture-overview#architectural-dependencies) covers the shared cache as an infrastructure dependency, alongside PostgreSQL and the message broker.
- [Local HTTPS Development](local-https-setup.md) covers the other half of matching production locally, where secure cookies carry the session.
- [Run Actions in the VUEDA Dispatch Queue (VDQ)](vdq-actions.md) covers the Celery broker. The broker is a separate service with its own `CELERY_BROKER_URL` key, even where one Redis instance serves both.
