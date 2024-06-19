# vueda-server

![VUEDA Logo - Vue.js User Experience for Django Admin](/VUEDA.png)

[![code style: black][]][black] [![code style: prettier][]][prettier] ![pytest status][] ![coverage status][] ![flake8 status][] ![safety status][]

<!--prettier-ignore-start-->
<!--TOC-->

- [About](#about)
- [Usage](#usage)
  - [Install](#install)
  - [Setup](#setup)
  - [Workflow Management](#workflow-management)
    - [Adding a workflow](#adding-a-workflow)
    - [Deleting a Workflow](#deleting-a-workflow)
  - [Workflow Management Command](#workflow-management-command)
- [Development](#development)
  - [Environment](#environment)
  - [Dependency Management](#dependency-management)
  - [Hooks](#hooks)
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

### Install

1. Start a `pipenv` `Pipfile` for your project.
    ```console
    [you@your MyVuedaServer]$ pipenv shell
    (MyVuedaServer)[you@your MyVuedaServer]$
    ```
2. If not already setup, add `PIP_EXTRA_INDEX_URL` to your environment.
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
    (MyVuedaServer)[you@your MyVuedaServer]$ pipenv install
    ```
6. Install the os python test package. For python 3.11 it is called `python3.11-test`.

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

### Workflow Management

#### Adding a workflow

1. Go to the workflow overview page at `/routes/workflow/overview/`.
2. Create a superuser if you need one and then log in.
3. Click the `Add Workflow` button.
4. Fill out the form and save. You will be redirected to the edit form.
5. Because initial state and transitions require a state to be selected when the edit form is saved, but no states exist by default, state changes will be saved if they don't have any validation errors, even if the server generates other validation errors. This is on purpose, so the state drop down will update, allowing you to select a state.
6. When the states and transitions have been created, you can access their edit forms from the workflow overview page. These forms allow you to add/edit/delete state permissions, transition permissions, and transition sources.
7. Once the workflow has been created the way you want it, you can use the [Workflow Management Command](#workflow-management-command).

#### Deleting a Workflow

If you have a model that used the workflow, you will need to remove the association to any workflow objects on the model before you can delete the workflow.

NOTE: Instruction 7 needs to have specific things deleted at the same time to prevent blow ups.

1. Go to the workflow overview page at `/routes/workflow/overview/`.
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

`--env-guarded-operations` - This causes created migrations to not run the migration sql, when the environment variable.

`skip_migration_when_setting_up_db` is 'true'. When testing, we use this to basically fake and roll back a migration, then remove the environment variable and run the migrations manually. This is probably only needed for tests.

<!-- #todo: document -->

## Development

### Environment

Install packages:

```console
[you@your vueda-server]$ pipenv install --dev
[you@your vueda-server]$ pipenv shell
(vueda-server)[you@your vueda-server]$
```

### Dependency Management

While `pipenv` is used as a development environment, it is a poor tool for package dependency management.

-   `requirements.txt` is used to manage dependencies for end-users.
-   `PipFile`'s `[dev-packages]` for development packages.
-   `test-requirements.txt` is used to manage dependencies used in unit tests.

### Hooks

Setup pre-commit hooks:

```console
(vueda-server)[you@your vueda-server]$ pre-commit install
pre-commit installed at .git/hooks/pre-commit
(vueda-server)[you@your vueda-server]$ pre-commit install --hook-type commit-msg
pre-commit installed at .git/hooks/commit-msg
```

### Updating

In development, pull new changes from the git repo and update your environment with:

```console
(vueda-server)[you@your vueda-server]$ git pull --ff-only
(vueda-server)[you@your vueda-server]$ pipenv sync --dev
```

### Tagging Releases

Git tags are used to indicate to CircleCI that a commit is considered a release. You can make git tags like this:

```console
(vueda-server)[you@your vueda-server]$ git tag v1.0.1
(vueda-server)[you@your vueda-server]$  git push --tags
```

Tags will have GitHub releases created and be published to our pypi index.

## Testing

### Setup

You'll need a database role that can make databases, if a vueda role doesn't already exist. You can create a role like this:

```console
(vueda-server)[you@your vueda-server]$ createuser --username postgres --pwprompt --createdb vueda
# or
(vueda-server)[you@your vueda-server]$ createuser -U postgres -P -d vueda
```

And you'll then need to put the connection details in your `.env.local`, like this:

```console
DATABASE_URL="postgresql://vueda:password@/vueda"
```

Depending on your local postgres setup, you may need to add a `pg_hba.conf` entry for the `vueda` user, or you may not need to provide a password in the connection string.

### Running Tests

```console
(vueda-server)[you@your vueda-server]$ pytest
```

### Generating Coverage Locally

Coverage will be generated in circleci, but you can do so locally if you don't want to commit & push.

```console
(vueda-server)[you@your vueda-server]$ pytest --cov-config=.coveragerc
(vueda-server)[you@your vueda-server]$ coverage combine
(vueda-server)[you@your vueda-server]$ coverage html
(vueda-server)[you@your vueda-server]$ open htmlcov/index.html
```

[code style: black]: https://img.shields.io/badge/code%20style-black-000000.svg?style=for-the-badge
[black]: https://github.com/ambv/black
[code style: prettier]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=for-the-badge
[prettier]: https://github.com/prettier/prettier
[pytest status]: https://docs.arrai.dev/vueda-server/artifacts/main/pytest.svg
[coverage status]: https://docs.arrai.dev/vueda-server/artifacts/main/pytest.coverage.svg
[flake8 status]: https://docs.arrai.dev/vueda-server/artifacts/main/flake8.svg
[pipenv]: https://github.com/pypa/pipenv
[safety status]: https://docs.arrai.dev/vueda-server/artifacts/main/safety.svg
[django-filter]: https://github.com/carltongibson/django-filter
[drf-flex-fields]: https://github.com/rsinger86/drf-flex-fields
[drf-writable-nested]: https://github.com/beda-software/drf-writable-nested
[django-simple-history]: https://github.com/jazzband/django-simple-history
[vueda-client]: https://github.com/arrai-innovations/vueda-client
[vueda-server]: https://github.com/arrai-innovations/vueda-server
