# VUEDA Server

<!--prettier-ignore-start-->
<!--TOC-->

- [VUEDA Server](#vueda-server)
  - [About](#about)
  - [Usage](#usage)
    - [Install (pipenv)](#install-pipenv)
    - [Install (uv)](#install-uv)
    - [Setup](#setup)
    - [Permissions](#permissions)
    - [Permission Names](#permission-names)
      - [Names Mapping (Important)](#names-mapping-important)
        - [Names Mapping For New Projects (default)](#names-mapping-for-new-projects-default)
        - [Names Mapping For Existing Django Projects](#names-mapping-for-existing-django-projects)
    - [Developer Tools](#developer-tools)
      - [Group Management](#group-management)
      - [Workflow Management](#workflow-management)
      - [Permissions and Workflow Overview](#permissions-and-workflow-overview)
    - [Set up Dispatch Queue](#set-up-dispatch-queue)
      - [start celery worker:](#start-celery-worker)
  - [Development](#development)
    - [Environment](#environment)
    - [Hooks](#hooks)
    - [API Documentation Generation](#api-documentation-generation)
    - [Updating](#updating)
    - [Tagging Releases](#tagging-releases)
  - [Testing](#testing)
    - [Setup](#setup-1)
    - [Running Tests](#running-tests)
    - [Generating Coverage Locally](#generating-coverage-locally)

<!--TOC-->
<!--prettier-ignore-end-->

## About

VUEDA Server, the counterpart to [VUEDA Client](../client/README.md), is designed for projects that
integrate Vue.js frontends with Django REST Framework backends. This server
library enhances Django's native authentication and permissions systems
with default DRF classes and optimizes integration with [django-filter],
[drf-flex-fields], and [drf-writable-nested]. It offers essential out-of-the-box
functionalities such as custom workflow management, audit trails (with DRF
support for [django-simple-history]), and row-level
permissions. Additionally, VUEDA Server provides DRF classes to expose Django
model details to the frontend, filtered by user permissions. It is built with
customization in mind, offering most features as base classes that can be
extended in your application, ensuring both control and adaptability.

## Usage

### Install (pipenv)

1. Start a `pipenv` `Pipfile` for your project.
    ```console
    [MyVuedaServer]$ pipenv shell
    (MyVuedaServer)[MyVuedaServer]$
    ```
2. If not already setup, add `PIP_EXTRA_INDEX_URL` to your environment (`~/.bashrc`, `~/.bash_profile`, etc.):
    ```shell
    export PIP_EXTRA_INDEX_URL=https://you:password@pypi.arrai.dev
    ```
3. Add our private pypi index into the `Pipfile` created by the last step.
    ```toml
    [[source]]
    url = "${PIP_EXTRA_INDEX_URL}"
    verify_ssl = true
    name = "arrai"
    ```
4. Add `vueda` into your project's dependencies.
    ```toml
    [packages]
    vueda = { version = ">=1.0.0,<2.0.0", index = "arrai" }
    ```
5. Install packages.
    ```console
    (MyVuedaServer)[MyVuedaServer]$ pipenv install
    ```

### Install (uv)

1. Start a new `pyproject.toml` for your project.
    ```console
    [MyVuedaServer]$ uv init --bare
    ```
2. Unless already set up, add `UV_INDEX_ARRAI_USERNAME` and `UV_INDEX_ARRAI_PASSWORD` to your environment. These
   are your credentials for the private PyPI server that hosts the release builds of `vueda`.
3. Add the private PyPI index to the `pyproject.toml` file.
    ```toml
    [[tool.uv.index]]
    name = "arrai"
    url = "https://pypi.arrai.dev/simple/"
    explicit = true
    ```
4. Specify the private PyPI index as the source of the `vueda` package in the `pyproject.toml` file.
    ```toml
    [tool.uv.sources]
    vueda = { index = "arrai" }
    ```
5. Add `vueda` to your project's dependencies.
    ```console
    [MyVuedaServer]$ uv add vueda
    ```
6. Install the packages.
    ```console
    [MyVuedaServer]$ uv sync
    ```

### Setup

<!-- #todo: document -->

- it's up to you to add `vueda` to your `INSTALLED_APPS` in `settings.py`, as well as any standard Django
  settings, like database, middleware, asgi vs wsgi, etc.
- it's up to you to add `vueda`'s `urls` to your `urls.py`.
- `HistoryRequestMiddleware` should be added to your `MIDDLEWARE` in `settings.py`, even if not otherwise
  using `simple_history`.

    example wsgi settings:

    ```py
    MIDDLEWARE = [
        ...
        'simple_history.middleware.HistoryRequestMiddleware',
        ...
    ]
    ```

    if using asgi, you should also add `HistoryRequestMiddleware` to your middleware stack, for example:

    ```py
    from asgi_cors_middleware import CorsASGIApp
    from channels.auth import AuthMiddleware
    from channels.sessions import CookieMiddleware
    from channels.sessions import SessionMiddleware
    from django.conf import settings
    from simple_history.middleware import HistoryRequestMiddleware

    def my_middlewares_stack(inner):
        return CorsASGIApp(
          CookieMiddleware(
              SessionMiddleware(
                  AuthMiddleware(
                      HistoryRequestMiddleware(
                          # ...
                          inner
                      )
                  )
              )
           ),
           # use django-cors-header's settings for asgi-cors-middleware
           origins=settings.CORS_ALLOWED_ORIGINS,
           allow_headers=settings.CORS_ALLOW_HEADERS,
           expose_headers=settings.CORS_EXPOSE_HEADERS,
           allow_methods=settings.CORS_ALLOW_METHODS,
           allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
           max_age=settings.CORS_PREFLIGHT_MAX_AGE,
       )
    ```

### Permissions

In order for a logged in user to be able to hit the server and ask for model info, the user will need to have the following permissions (codenames):

For new projects:

- `list_contenttype`
- `read_contenttype`

For existing django projects:

- `view_contenttype`

### Permission Names

Django uses permission names like `view`, `add`, and `change`.
Rest Framework uses permission names like `read`, `create`, and `update`.

In order to have everything work as we expect, we need to modify the permission code names when django creates them, so permissions are created with the correct names.

When adding vueda to handle part or all of an existing django site, then we need to do the mapping in the reverse order. VUEDA will look for `list_object` or `read_object`, and we want to look at the permission called `view_object` in these cases.

In order to accomplish this, there is a setting that exists which needs to be created and possibly modified, before patching django. In order to patch django, so that it works the same when running tests, migrations, or the server, we need to add the import that patches django after the permission mapping has been imported into the settings, or after it has been modified.

#### Names Mapping (Important)

Because we can only patch django when some code in the project runs, and we need to have the permission names mapping loaded and/or adjusted before django creates any permission names, we must add the following import into the settings file.
This must be added after the default settings have been added into the settings (`locals().update(get_defaults(env))`), or after you have made changes to this permission. The bottom of the settings is fine.

```python
from vueda.core import patch_django  # noqa F401
```

##### Names Mapping For New Projects (default)

```python
PERMISSION_NAMES_MAPPING = {
    "add": "create",
    "change": "update",
    "view": "read",
},
```

##### Names Mapping For Existing Django Projects

```python
PERMISSION_NAMES_MAPPING = {
    "create": "add",
    "list": "view",
    "read": "view",
    "update": "change",
}
```

### Developer Tools

VUEDA includes browser-based management tools and matching management commands to help developers track and migrate changes to group permissions and workflows without having to manually create migrations.

#### Group Management

The permission overview screen at `/routes/vueda.user/permissions/overview/` lets you view, add, rename, and remove groups for any permission in the project. When you are ready to roll those changes out to other environments, run `makegroupmigrations` to produce a migration with the changes.

For full instructions, see [Manage Groups and Generate Group Migrations](https://github.com/arrai-innovations/vueda/blob/main/docs/guides/manage-groups.md).

#### Workflow Management

The workflow overview screen at `/routes/vueda.workflow/overview/` lets you create and configure workflows with states, transitions, and permissions. When you are ready to roll those changes out to other environments, run `makeworkflowmigrations` to produce a migration with the changes.

For full instructions, see [Manage Workflows and Generate Workflow Migrations](https://github.com/arrai-innovations/vueda/blob/main/docs/guides/manage-workflows.md).

#### Permissions and Workflow Overview

The permissions and workflow overview at `/vueda.info/overview/` provides a read-only audit of which groups have which permissions and which workflow transitions they can trigger. Select a specific user to see exactly what that user can and cannot do. The page can be printed as a reference to share with clients or as a starting point when diagnosing access issues.

For full instructions, see [Use the Permissions and Workflow Overview](https://github.com/arrai-innovations/vueda/blob/main/docs/guides/permissions-workflow-overview.md).

### Set up Dispatch Queue

The dispatch queue uses celery to run tasks.
Celery can be used with a number of different [backends](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/index.html).
You will need to select the backend you want to you and then configure the `CELERY_BROKER_URL` in your environment, for example:

```text
CELERY_BROKER_URL=redis://localhost:6379/3
```

For email sending, you need to have the following environment variables set (via env vars or your config loader):

```text
ANYMAIL_MAILGUN_API_KEY=
ANYMAIL_MAILGUN_API_URL=
ANYMAIL_WEBHOOK_SECRET=
ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY=
```

For SMS sending, you need to have the following environment variables set (via env vars or your config loader):

```text
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WEBHOOK_URL=""
```

you would also need to set `VDQ_URL` in your settings.py file for the attachment url to work properly.

#### start celery worker:

```console
[project-server]$ DJANGO_SETTINGS_MODULE=[path/to/settings/file] celery -A vueda.vdq.celery:app worker -l info  -B --statedb=[path/to/worker/state/file]
```

## Development

First, clone the repository:

```console
$ git clone https://github.com/arrai-innovations/vueda.git
```

or

```console
$ git clone git@github.com:arrai-innovations/vueda.git
```

```console
$ cd vueda
[vueda]$ cd server
[server]$
```

### Environment

Install packages:

```console
[server]$ uv sync
```

### Hooks

Setup pre-commit hooks:

```console
[server]$ uv tool install pre-commit --with pre-commit-uv
[server]$ pre-commit install
pre-commit installed at .git/hooks/pre-commit
pre-commit installed at .git/hooks/commit-msg
```

### API Documentation Generation

API documentation is generated automatically as part of the CI process when tags are pushed. The versioned documentation is made available on the [documentation server][api-docs].

To manually generate the documentation, make sure dev packages are installed and call the following two commands:

```console
[server]$ uv python manage.py spectacular --color --file schema.yml
[server]$ npx -y @redocly/cli build-docs schema.yml
```

The first command will generate the `schema.yml` file.
The second command will install the code if needed and generate a `redoc-static.html` file from the `schema.yml` file.
If you would like, you can get json by clicking the download button when viewing the html.

### Updating

In development, pull new changes from the git repo and update your environment with:

```console
[server]$ git pull --ff-only
[server]$ uv sync
```

### Tagging Releases

Git tags are used to indicate to CircleCI that a commit is considered a release. You can make git tags like this:

```console
[server]$ git tag v1.0.1
[server]$ git push --tags
```

Tags will have GitHub releases created and be published to our pypi index.

## Testing

### Setup

You'll need a database role that can make databases, if a vueda role doesn't already exist. You can create a role like this:

```console
[server]$ createuser --username postgres --pwprompt --createdb vueda
# or
[server]$ createuser -U postgres -P -d vueda
```

And you'll then need to put the connection details in your local config (e.g. `.env.local` or TOML), like this:

```console
DATABASE_URL="postgresql://vueda:password@/vueda"
```

Depending on your local postgres setup, you may need to add a `pg_hba.conf` entry for the `vueda` user, or you may not need to provide a password in the connection string.

### Running Tests

```console
[server]$ uv run pytest
```

### Generating Coverage Locally

Coverage will be generated in circleci, but you can do so locally if you don't want to commit & push.

```console
[server]$ uv run pytest --cov-config=.coveragerc
[server]$ uv run coverage combine
[server]$ uv run coverage html
[server]$ open htmlcov/index.html
```

[django-filter]: https://github.com/carltongibson/django-filter
[drf-flex-fields]: https://github.com/rsinger86/drf-flex-fields
[drf-writable-nested]: https://github.com/beda-software/drf-writable-nested
[django-simple-history]: https://github.com/jazzband/django-simple-history
[api-docs]: https://docs.arrai.dev/vueda-server/documentation/
