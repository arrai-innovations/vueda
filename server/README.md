# vueda-server

![VUEDA Logo - Vue.js User Experience for Django Admin](/VUEDA.png)

[![code style: ruff][]][ruff] [![code style: prettier][]][prettier] ![pytest status][] ![coverage status][] ![ruff status][] ![pysentry status][]

<!--prettier-ignore-start-->
<!--TOC-->

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
  - [Workflow Management](#workflow-management)
    - [Adding a workflow](#adding-a-workflow)
    - [Deleting a Workflow](#deleting-a-workflow)
  - [Workflow Management Command](#workflow-management-command)
  - [Group Management](#group-management)
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

[vueda-server], the counterpart to [vueda-client], is designed for projects that
integrate Vue.js frontends with Django REST Framework backends. This server
library enhances Django's native authentication and permissions systems
with default DRF classes and optimizes integration with [django-filter],
[drf-flex-fields], and [drf-writable-nested]. It offers essential out-of-the-box
functionalities such as custom workflow management, audit trails (with DRF
support for [django-simple-history]), and row-level
permissions. Additionally, [vueda-server] provides DRF classes to expose Django
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
4. Add `vueda-server` into your project's dependencies.
    ```toml
    [packages]
    vueda-server = { version = ">=1.0.0,<2.0.0", index = "arrai" }
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
   are your credentials for the private PyPI server that hosts the release builds of `vueda-server`.
3. Add the private PyPI index to the `pyproject.toml` file.
    ```toml
    [[tool.uv.index]]
    name = "arrai"
    url = "https://pypi.arrai.dev/simple/"
    explicit = true
    ```
4. Specify the private PyPI index as the source of the `vueda-server` package in the `pyproject.toml` file.
    ```toml
    [tool.uv.sources]
    vueda-server = { index = "arrai" }
    ```
5. Add `vueda-server` to your project's dependencies.
    ```console
    [MyVuedaServer]$ uv add vueda-server
    ```
6. Install the packages.
    ```console
    [MyVuedaServer]$ uv sync
    ```

### Setup

<!-- #todo: document -->

-   it's up to you to add `vueda-server` to your `INSTALLED_APPS` in `settings.py`, as well as any standard Django
    settings, like database, middleware, asgi vs wsgi, etc.
-   it's up to you to add `vueda-server`'s `urls` to your `urls.py`.
-   `HistoryRequestMiddleware` should be added to your `MIDDLEWARE` in `settings.py`, even if not otherwise
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

-   `list_contenttype`
-   `read_contenttype`

For existing django projects:

-   `view_contenttype`

### Permission Names

Django uses permission names like `view`, `add`, and `change`.
Rest Framework uses permission names like `read`, `create`, and `update`.

In order to have everything work as we expect, we need to modify the permission code names when django creates them, so permissions are created with the correct names.

When adding vueda to handle part or all of an existing django site, then we need to do the mapping in the reverse order. Vueda will look for `list_object` or `read_object`, and we want to look at the permission called `view_object` in these cases.

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

### Workflow Management

#### Adding a workflow

1. Go to the workflow overview page at `/routes/vueda.workflow/overview/`.
2. Create a superuser if you need one and then log in.
3. Click the `Add Workflow` button.
4. Fill out the form and save. You will be redirected to the edit form.
5. Because initial state and transitions require a state to be selected when the edit form is saved, but no states exist by default, state changes will be saved if they don't have any validation errors, even if the server generates other validation errors. This is on purpose, so the state drop down will update, allowing you to select a state.
6. When the states and transitions have been created, you can access their edit forms from the workflow overview page. These forms allow you to add/edit/delete state permissions, transition permissions, and transition sources.
7. Once the workflow has been created the way you want it, you can use the [Workflow Management Command](#workflow-management-command).

#### Deleting a Workflow

If you have a model that used the workflow, you will need to remove the association to any workflow objects on the model before you can delete the workflow.

NOTE: Instruction 7 needs to have specific things deleted at the same time to prevent blow ups.

1. Go to the workflow overview page at `/routes/vueda.workflow/overview/`.
2. Create a superuser if you need one and then log in.
3. Edit each of the states that have state permissions, check delete on each and save.
4. Edit each of the transitions that have transition permissions and transition sources, check delete on each and save.
5. Edit the workflow.
6. Check the workflow permissions, transitions, and states that are not used by the initial state, and save.
7. Check the last remaining state and the initial state that uses it, and save.
8. Then you can go to the workflow overview page and click the delete workflow button that will appear.
9. Once the workflow has been deleted, you can use the [Workflow Management Command](#workflow-management-command).

NOTE: Permissions and Groups associated with Workflows that are being deleted, must not be deleted until the workflow has been deleted from any servers, since they don't have history.

### Workflow Management Command

A management command to automate the creation of migrations that reflect workflow changes made locally. These generated migrations can be migrated forwards and backwards, and do not use ids, since they can be different between databases.

`python manage.py makeworkflowmigrations`

Similar to django `makemigrations`, you can specify the app_label(s) you want to make migrations for, or all if none are specified.

If you are the user that made the changes to workflow manually, then you will want to fake this migration, since you already have the changes.

Some additional options were added to the management command, mainly for testing.

`--dry-run` - Use this to see the output of what the management command would do. No migrations are actually created when this is specified.

`--keep-history-date` - If this is specified, then when migrations are run, the history that is created for the changes will use the history dates from the history records that were created when the workflow was created/edited/deleted. This is mainly used for testing.

<!-- #todo: document -->

### Group Management

A view exists, where you can see permissions and groups.

`/routes/vueda.user/permissions/overview/`

Similar to workflow, you will need to log in.

On this screen you can add/edit/delete groups per permission.

Once the management command that will create group migrations is written, then you will be able to create the migration similar to `makeworkflowmigrations`.

### Set up Dispatch Queue

You need to configure the `CELERY_BROKER_URL` in your environment (or whatever config loader your project uses), for example:

```
CELERY_BROKER_URL=redis://localhost:6379/3
```

For email sending, you need to have the following environment variables set (via env vars or your config loader):

```
ANYMAIL_MAILGUN_API_KEY=
ANYMAIL_MAILGUN_API_URL=
ANYMAIL_WEBHOOK_SECRET=
ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY=
```

For SMS sending, you need to have the following environment variables set (via env vars or your config loader):

```
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
$ git clone https://github.com/arrai-innovations/vueda-server.git
$ # or
$ git clone git@github.com:arrai-innovations/vueda-server.git
$ cd vueda-server
[vueda-server]$
```

### Environment

Install packages:

```console
[vueda-server]$ uv sync
```

### Hooks

Setup pre-commit hooks:

```console
[vueda-server]$ uv tool install pre-commit --with pre-commit-uv
[vueda-server]$ pre-commit install
pre-commit installed at .git/hooks/pre-commit
pre-commit installed at .git/hooks/commit-msg
```

### API Documentation Generation

API documentation is generated automatically as part of the CI process when tags are pushed. The versioned documentation is made available on the [documentation server][api-docs].

To manually generate the documentation, make sure dev packages are installed and call the following two commands:

```console
[vueda-server]$ uv python manage.py spectacular --color --file schema.yml
[vueda-server]$ npx -y @redocly/cli build-docs schema.yml
```

The first command will generate the `schema.yml` file.
The second command will install the code if needed and generate a `redoc-static.html` file from the `schema.yml` file.
If you would like, you can get json by clicking the download button when viewing the html.

### Updating

In development, pull new changes from the git repo and update your environment with:

```console
[vueda-server]$ git pull --ff-only
[vueda-server]$ uv sync
```

### Tagging Releases

Git tags are used to indicate to CircleCI that a commit is considered a release. You can make git tags like this:

```console
[vueda-server]$ git tag v2.0.0
[vueda-server]$ git push --tags
```

Tags will have GitHub releases created and be published to our pypi index.

## Testing

### Setup

You'll need a database role that can make databases, if a vueda role doesn't already exist. You can create a role like this:

```console
[vueda-server]$ createuser --username postgres --pwprompt --createdb vueda
# or
[vueda-server]$ createuser -U postgres -P -d vueda
```

And you'll then need to put the connection details in your local config (e.g. `.env.local` or TOML), like this:

```console
DATABASE_URL="postgresql://vueda:password@/vueda"
```

Depending on your local postgres setup, you may need to add a `pg_hba.conf` entry for the `vueda` user, or you may not need to provide a password in the connection string.

### Running Tests

```console
[vueda-server]$ uv run pytest
```

### Generating Coverage Locally

Coverage will be generated in circleci, but you can do so locally if you don't want to commit & push.

```console
[vueda-server]$ uv run pytest --cov-config=.coveragerc
[vueda-server]$ uv run coverage combine
[vueda-server]$ uv run coverage html
[vueda-server]$ open htmlcov/index.html
```

[code style: ruff]: https://img.shields.io/badge/code%20style-ruff-000000.svg?style=for-the-badge
[ruff]: https://docs.astral.sh/ruff/formatter/#style-guide
[code style: prettier]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=for-the-badge
[prettier]: https://github.com/prettier/prettier
[pytest status]: https://docs.arrai.dev/vueda-server/artifacts/v2.x.x/server-pytest.svg
[coverage status]: https://docs.arrai.dev/vueda-server/artifacts/v2.x.x/server-pytest.coverage.svg
[ruff status]: https://docs.arrai.dev/vueda-server/artifacts/v2.x.x/ruff.svg
[pipenv]: https://github.com/pypa/pipenv
[pysentry status]: https://docs.arrai.dev/vueda-server/artifacts/v2.x.x/server-pysentry.svg
[django-filter]: https://github.com/carltongibson/django-filter
[drf-flex-fields]: https://github.com/rsinger86/drf-flex-fields
[drf-writable-nested]: https://github.com/beda-software/drf-writable-nested
[django-simple-history]: https://github.com/jazzband/django-simple-history
[vueda-client]: https://github.com/arrai-innovations/vueda-client
[vueda-server]: https://github.com/arrai-innovations/vueda-server
[api-docs]: https://docs.arrai.dev/vueda-server/documentation/
