# vueda-server

![VUEDA Logo - Vue.js User Experience for Django Admin](/VUEDA.png)

[![code style: black][]][black] [![code style: prettier][]][prettier] ![pytest status][] ![coverage status][] ![flake8 status][] ![safety status][]

<!--prettier-ignore-start-->
<!--TOC-->

- [About](#about)
- [Usage](#usage)
  - [Install](#install)
  - [Setup](#setup)
- [Development](#development)
  - [Environment](#environment)
  - [Dependency Management](#dependency-management)
  - [Hooks](#hooks)
  - [Updating](#updating)
  - [Tagging Releases](#tagging-releases)
- [Testing](#testing)
  - [Running Tests](#running-tests)
  - [Generating Coverage Locally](#generating-coverage-locally)

<!--TOC-->
<!--prettier-ignore-end-->

## About

`vueda-server`, the counterpart to `vueda-client`, is designed for projects that
integrate Vue.js frontends with Django REST Framework backends. This server
library enhances Django's native authentication and permissions systems
with default DRF classes and optimizes integration with `django-filters`,
`drf-flex-fields`, and `drf-writable-nested`. It offers essential out-of-the-box
functionalities such as custom workflow management, audit trails (with DRF
support for `django-simple-history`), and both row-level and field-level
permissions. Additionally, `vueda-server` provides DRF classes to expose Django
model details to the frontend, filtered by user permissions. It is built with
customization in mind, offering most features as base classes that can be
extended in your application, ensuring both control and adaptability.

## Usage

### Install

1. Start a `pipenv` `Pipfile` for your project.
    ```shell
    [you@your MyVuedaServer]$ pipenv shell
    (MyVuedaServer)[you@your MyVuedaServer]$
    ```
2. If not already setup, add `PIP_EXTRA_INDEX_URL` to your environment.
    ```shell
    export PIP_EXTRA_INDEX_URL=https://you:password@pypi.arrai-dev.com
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
    ```shell
    (MyVuedaServer)[you@your MyVuedaServer]$ pipenv install
    ```

### Setup

<!-- #todo: document -->

## Development

### Environment

Install packages:

```shell
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

```shell
(vueda-server)[you@your vueda-server]$ pre-commit install
pre-commit installed at .git/hooks/pre-commit
(vueda-server)[you@your vueda-server]$ pre-commit install --hook-type commit-msg
pre-commit installed at .git/hooks/commit-msg
```

### Updating

In development, pull new changes from the git repo and update your environment with:

```shell
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
[pytest status]: https://docs.arrai-dev.com/vueda-server/artifacts/main/pytest.svg
[coverage status]: https://docs.arrai-dev.com/vueda-server/artifacts/main/pytest.coverage.svg
[flake8 status]: https://docs.arrai-dev.com/vueda-server/artifacts/main/flake8.svg
[pipenv]: https://github.com/pypa/pipenv
[safety status]: https://docs.arrai-dev.com/vueda-server/artifacts/main/safety.svg
