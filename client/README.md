# VUEDA Client

![VUEDA logo - vueda - vue.js user experience for django administration](/docs/assets/logo-text.png)

[![code style: prettier][]][prettier] ![tests][] [![coverage: status][]][coverage] ![eslint][] ![audit][]

<!-- prettier-ignore-start -->
<!--TOC-->

- [VUEDA Client](#vueda-client)
  - [About](#about)
  - [Install](#install)
  - [Usage](#usage)
    - [JSDocs](#jsdocs)
    - [Forms](#forms)
    - [CRUD Operation Views](#crud-operation-views)
    - [Dynamic Routing](#dynamic-routing)
    - [Authentication](#authentication)
    - [Navigation](#navigation)
    - [Permissions](#permissions)
    - [Theming](#theming)
    - [Customization](#customization)
  - [Development](#development)
    - [Environment](#environment)
    - [Running Locally](#running-locally)
    - [Testing](#testing)
      - [Running Tests](#running-tests)
      - [Writing Tests](#writing-tests)
      - [Coverage](#coverage)
    - [Reporting Bugs](#reporting-bugs)
    - [Getting my changes into the main branch](#getting-my-changes-into-the-main-branch)
    - [Making a Release](#making-a-release)
    - [Changelog](#changelog)

<!--TOC-->
<!-- prettier-ignore-end -->

## About

[VUEDA Client][vueda-client] offers a dynamic Vue.js frontend framework, tailored
for seamless integration with Django REST Framework backends and designed to
complement [VUEDA Server][vueda-server]. This client library enables rapid development of
reactive user interfaces in Django-Vue projects. It features components and
composables for efficient form handling, CRUD operations, and dynamic routing.
These tools allow client-side configuration and leverage server-supplied model
and field metadata to drive forms, fields, views, and routes dynamically.
Prioritizing developer flexibility, [VUEDA Client][vueda-client] provides extensive
customization and theming options for its default components. It also includes
authentication, navigation, and permission management features, all
crafted to integrate smoothly with the corresponding backend
services of [VUEDA Server][vueda-server].

## Install

1.  ```console
    $ npm install @arrai-innovations/vueda
    ```

2.  (optional) Strip test attributes from production builds, by installing the `rollup-plugin-strip` plugin and adding it to your `vite.config.js`:

    ```console
    $ npm install --save-dev rollup-plugin-strip
    ```

    ```js
    ...
    import strip from 'rollup-plugin-strip';
    ...
    export default defineConfig({
        ...
        build: {
            ...
            rollupOptions: {
                ...
                plugins: [
                    ...
                    strip({
                        // Remove attributes with the "data-qa" prefix
                        pattern: /data-qa-.*/g,
                        // Remove console.log statements
                        functions: ["console.log"],
                    }),
                ],
            },
        },
    });
    ```

## Usage

### JSDocs

[View the JSDocs](./docs.md)

### Forms

### CRUD Operation Views

### Dynamic Routing

### Authentication

### Navigation

### Permissions

### Theming

### Customization

## Development

### Environment

Clone the repository and install the dependencies:

```console
$ git clone https://github.com/arrai-innovations/vueda.git
$ cd vueda
[vueda]$ cd client
[client]$ npm install --include=dev
```

Install with dev dependencies so local linting and test tooling are available.

### Running Locally

As a library, VUEDA Client is not intended to be run as a standalone application.
It is designed to be integrated into a Vue.js project, where it will be served by the Django backend.
However, you can use the example server & client to run the library locally.

<!-- todo: test these instructions when the examples exist -->

1. Clone `vueda-example-client`:
    ```console
    $ git clone https://github.com/arrai-innovations/vueda-example-client.git
    ```
2. Install the dependencies:

    ```console
    $ cd vueda-example-client
    [vueda-example-client]$ npm install
    ```

3. Clone `vueda-example-server`:
    ```console
    $ git clone https://github.com/arrai-innovations/vueda-example-server.git
    ```
4. Install the dependencies:
    ```console
    $ cd vueda-example-server
    [vueda-example-server]$ npm install
    [vueda-example-server]$ pipenv install
    ```
5. Use the local version of VUEDA Client in the example client:
    ```console
    [vueda-example-client]$ npm link ../vueda/client
    ```
6. Use the local version of VUEDA Server in the example server:
    ```console
    [vueda-example-server]$ pipenv run pip install -e ../vueda/server
    ```
7. Run the server:
    ```console
    [vueda-example-server]$ pipenv run ./guincorn.sh
    ```
8. Run the client:
    ```console
    [vueda-example-client]$ npm run dev
    ```

### Testing

#### Running Tests

```console
$ npm run test
```

#### Writing Tests

[VUEDA Client][vueda-client] has unit tests for its components and composables. These tests are written using the [@testing-library/vue] library. The tests are located in the `tests` directory. The tests run using [vitest].

#### Coverage

```console
$ npm run coverage
```

### Reporting Bugs

Report any bugs you find in the issues section of this repository, and tag them with the `bug` label. Please include a description of the bug, the steps to reproduce it, and the expected and actual results.

### Getting my changes into the main branch

Make a pull request with your changes, a description of the changes, and tests. The pull request will be reviewed and, if accepted, merged into the main branch.

If you want your changes OK'd before making a pull request, you can create an issue with a description of the changes and tag using the `change-request` label.

### Making a Release

1. Change the version number in `package.json`.
2. Install dependencies with `npm install`, which will update the version in `package-lock.json`.
3. Commit the changes to `package.json` and `package-lock.json`.
4. Merge the changes into the `main` branch.
5. On the `main` branch, with the latest changes, create a new tag and push to GitHub.
    ```console
    $ git tag v1.0.0
    $ git push --tags
    ```
6. The circleci will publish a new version to NPM and create a release on GitHub.

### Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a complete list of changes by version.

[prettier]: https://github.com/prettier/prettier
[code style: prettier]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=for-the-badge
[coverage]: https://docs.arrai.dev/vueda-client/artifacts/main/coverage_tests/
[coverage: status]: https://docs.arrai.dev/vueda-client/artifacts/main/tests.coverage.svg
[eslint]: https://docs.arrai.dev/vueda-client/artifacts/main/eslint.svg
[audit]: https://docs.arrai.dev/vueda-client/artifacts/main/npm-audit.svg
[tests]: https://docs.arrai.dev/vueda-client/artifacts/main/tests.svg
[vueda-client]: ./README.md
[vueda-server]: ../server/README.md
[@testing-library/vue]: https://github.com/testing-library/vue-testing-library
[vitest]: https://github.com/vitest-dev/vitest
