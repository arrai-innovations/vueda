# Tooling Recommendations

This document describes the recommended tooling used in VUEDA projects, why each tool exists, and when it is appropriate
to adopt it. None of these tools are required to evaluate or prototype VUEDA. You can adopt them incrementally.

Each section explains **why we use the tool**, **where it fits**, and any **important caveats**.

## `uv`

VUEDA Server uses `uv` for Python dependency management, and we recommend adopting it for all VUEDA-based projects. It
provides isolated workspaces, dependency groups, and a straightforward CLI for managing dependencies.

Compared to traditional `pip`/`virtualenv` workflows or wrapper tools like `pipenv`, `uv` offers significantly faster
dependency resolution and a more unified model for managing project environments.

You can install `uv` globally using either:
```console
curl -LsSf https://astral.sh/uv/install.sh | sh
```
or
```console
wget -qO- https://astral.sh/uv/install.sh | sh
```

`uv` is different other Python dependency management tools, particularly in its support for monorepos via isolated
workspaces with their own dependencies. It pays to familiarize yourself with its concepts, particularly groups and
packages, and the CLI in the [`uv` documentation](https://docs.astral.sh/uv/)

> [!WARNING]
> `uv run` synchronizes dependencies by default

`uv run` performs a dependency sync before executing a command. By default, this sync targets **only the default
dependency group**.

This is convenient for local development, but can be surprising in CI or production contexts. If you have additional
dependency groups (for example `dev`, `test`, or `lint`), running `uv run` may install or uninstall packages in order to
reconcile the environment back to the default set.

Conversely, if you have marked additional groups as defaults (such as `dev`), `uv run` will always include those
packages, which may be undesirable for certain commands or environments.

To avoid unintended environment changes, you can either:

-   Disable automatic syncing:

    ```console
    export UV_NO_SYNC=1
    ```

-   Or opt out per command:

    ```console
    uv run --no-sync <command>
    ```

## `pnpm`

VUEDA Client uses `pnpm` for Node.js dependency management, and we recommend it for all VUEDA-based client applications.
It provides fast, deterministic installs and strong monorepo support via workspaces.

Compared to `npm` and `yarn`, `pnpm` uses a content-addressable store and a strict node_modules layout, resulting in
faster installs, lower disk usage, and fewer hidden dependency issues. Dependency graphs become more predictable and
failures easier to debug as projects grow.

You can install `pnpm` globally with either command:

```console
curl -fsSL https://get.pnpm.io/install.sh | sh -

```

or

```console
wget -qO- https://get.pnpm.io/install.sh | sh -

```

For VUEDA projects, the most relevant `pnpm` feature is its support for workspaces, which allow the client application  
and related packages to share a single dependency store. This aligns well with the VUEDA monorepo layout and avoids  
duplication and drift in multi-package JavaScript projects.

Unlike `npm` and `yarn`, `pnpm` does not automatically install peer dependencies. This is intentional: strict peer  
dependency handling keeps requirements explicit and prevents accidental reliance on transitive dependencies that may  
change or disappear. As a result, you may see peer dependency warnings or errors when adding packages, particularly in  
the Vue ecosystem.

> [!TIP]  
> Installing peer dependencies programmatically
>
> When installing packages with many peer dependencies (such as `@arrai-innovations/vueda`), you can inspect and  
> install them in one step:
>
> ```console
> pnpm view @arrai-innovations/vueda peerDependencies --json \
> | jq -r 'to_entries | map("\(.key)@\(.value)") | .[]' \
> | xargs pnpm add
> 
> ```

## `ruff`

VUEDA Server uses `ruff` for Python linting and formatting. It replaces the traditional combination of `flake8`,
multiple flake8 plugins, and separate formatters with a single, fast, all-in-one tool.

Compared to older toolchains, `ruff` offers dramatically better performance and a unified configuration model, while
preserving the consistency benefits we valued from tools like `black`. This makes linting and formatting fast enough
to run in pre-commit hooks without becoming a bottleneck.

Install ruff in the server uv workspace:

```console
uv add --group dev ruff
```

Add ruff configuration into your `server/pyproject.toml`. VUEDA keeps a commented reference configuration in the
server project so implementors can read it in context:
[`server/pyproject.toml`](https://github.com/arrai-innovations/vueda/blob/main/server/pyproject.toml).

Ruff can then be run directly using:
```console
uv run --no-sync ruff check .
uv run --no-sync ruff format .
```

## `eslint`

VUEDA Client uses `eslint` for static analysis and linting of JavaScript and Vue code. It helps catch common errors,
enforce best practices, and apply framework-specific rules during development. `eslint` is a long-standing standard in
the JavaScript ecosystem with strong support for Vue and single-file components.

Install eslint in the client pnpm workspace:

   ```console
   pnpm add -D eslint
   ```

Eslint's new flat config format is recommended, but involved, with a lot of sharp edges. To avoid cargo culting VUEDA's
eslint setup, start with a minimal config and expand as needed. VUEDA uses
[`neostandard`](https://github.com/neostandard/neostandard) as a base, which is a spiritual successor to the
[`standard`](https://github.com/standard/standard) JavaScript style guide with modern tooling. It also uses
[`eslint-config-prettier`](https://github.com/prettier/eslint-config-prettier) for compatibility with Prettier,
[`eslint-plugin-vue`](https://eslint.vuejs.org/) for Vue.js-specific linting, and
[`@vue/eslint-config-prettier`](https://github.com/vuejs/eslint-config-prettier) for compatibility between Vue.js and
Prettier.

If you want a real-world flat config example, VUEDA's client config includes inline commentary explaining the
composition and key tradeoffs:
[`client/eslint.config.js`](https://github.com/arrai-innovations/vueda/blob/main/client/eslint.config.js).

Eslint can then be run directly using:

```console
pnpm run eslint .
```

## `prettier`

VUEDA Client uses `prettier` for automatic code formatting. It enforces a consistent style across the codebase and
removes formatting decisions from day-to-day development.

By treating formatting as a purely mechanical step, `prettier` reduces diff noise, avoids style debates, and ensures
that code layout remains consistent regardless of author or editor configuration.

Install prettier in the client pnpm workspace:

```console
pnpm add -D prettier
```

Add a Prettier configuration file at `client/.prettierrc.js`:

```json
module.exports = {
   trailingComma: "all",
   printWidth: 120,
   tabWidth: 4,
   plugins: ["@trivago/prettier-plugin-sort-imports"],
   importOrder: ["^@\\/(.*)$"],
   importOrderSeparation: true,
   importOrderSortSpecifiers: true,
};
```

Prettier can then be run directly using:

```console
pnpm run prettier --write .
```

## `md-toc`

`md-toc` is used to automatically maintain Markdown table-of-contents blocks in repository documentation. Manual TOC
updates are error-prone and tend to drift as sections are added or renamed. Automating TOC generation keeps
documentation navigation accurate with minimal overhead.

Install md-toc in the monorepo root uv workspace:

```console
uv add --group dev md-toc
```

You can then update the TOC of any Markdown file using:

```console
uv run --no-sync md-toc README.md --in-place
```

## `pwt`

VUEDA Server uses `pwt` (pytest-watch) for test watching during development. It monitors source files and test files
for changes, automatically re-running tests when relevant files are modified. This provides rapid feedback and
encourages a test-driven development workflow. It provides parallels the `vitest --watch` experience used in VUEDA
Client.

Install pwt in the server uv workspace:

```console
uv add --group dev pwt
```

You can then run `pytest` tests in watch mode using:

```console
uv run --no-sync pwt tests/ --now
```

## `concurrently`

VUEDA's common development commands run both server-side and client-side tasks in parallel, such as starting dev servers
or running tests. `concurrently` is a Node.js tool that makes it easy to run multiple commands simultaneously while
labeling their output for clarity.

Install concurrently in the monorepo root pnpm workspace:

```console
pnpm add -D concurrently
```

Example usage is shown in the `just` commands below.

## `just`

VUEDA uses `just` as a thin, language-agnostic command runner at the monorepo root. Its role is not to replace `uv` or
`pnpm`, but to provide a select documenting, human-oriented command surface that orchestrates tasks across the server and
client projects from a single source.

A `Justfile` is used to define these commands. You can run these commands from the repo root using
`just <command>`. The following commands are examples.

```make
bootstrap: # for development environment setup
  # not concurrently for clarity in output
  cd {{justfile_directory()}} && pnpm install
  pnpm -C {{justfile_directory()}} exec lefthook install
  cd {{justfile_directory()}} && uv sync --all-groups --all-packages

test:
  just test-run

test-run:
  pnpx concurrently -n server,client -c green,cyan "just test-server-run" "just test-client-run"

test-server:
  just test-server-run

test-server-run:
  cd {{justfile_directory()}}/server && uv run --no-sync pytest

test-client:
  just test-client-run

test-client-run:
  cd {{justfile_directory()}}/client && pnpm test run

test-watch:
  pnpx concurrently -n server,client -c green,cyan "just test-server-watch" "just test-client-watch"

test-server-watch:
  cd {{justfile_directory()}}/server && uv run --no-sync ptw . --now

test-client-watch:
  cd {{justfile_directory()}}/client && pnpm test

check:
  pnpx concurrently -n server,client -c green,cyan "just check-server" "just check-client"

check-server:
  cd {{justfile_directory()}}/server && uv run --no-sync ruff check .

check-client:
  cd {{justfile_directory()}}/client && pnpm run lint && pnpm run format

fix:
  pnpx concurrently -n server,client -c green,cyan "just fix-server" "just fix-client"

fix-server:
  cd {{justfile_directory()}}/server && uv run --no-sync ruff check --fix . && uv run --no-sync ruff format .

fix-client:
  cd {{justfile_directory()}}/client && pnpm run eslint && pnpm run prettier

manage *args:
  cd {{justfile_directory()}}/server && uv run --no-sync python manage.py {{args}}
```

## `commitlint`

We use `commitlint` to enforce consistent commit message formatting. Commit message checks make project history easier
to read and search by ensuring changes are described in a consistent, readable format. Consistent commit messages also
allow for easier adoption of future tools like changelog generation or automated releases, should we add them later.

Install commitlint in the monorepo root pnpm workspace:

```console
pnpm add -D @commitlint/cli @arrai-innovations/commitlint-config
```

Used via lefthook git hooks (see below).

## `lefthook`

VUEDA uses and recommends `lefthook` to define git hooks for commit-time linting and formatting.

Unlike script-based managers such as `husky`, `lefthook` uses a single configuration file for all hooks, making setup,
review, and maintenance simpler and more visible.

`lefthook` natively supports staged-file filtering and restaging, eliminating the need for additional tools like
`lint-staged`. This allows language-specific checks to run only on relevant files without extra scripting or glue code.

Compared to `pre-commit`, which creates and manages separate tool environments, `lefthook` runs checks using the
project’s existing environments (for example `uv` or `pnpm`). This reduces duplication, improves performance and keeps
hook behavior aligned with how tools are run elsewhere in the repository.

Install lefthook in the monorepo root pnpm workspace:

```console
pnpm add -D lefthook
```

Add a lefthook configuration file at `lefthook.yml`.

VUEDA's lefthook config includes inline commentary explaining the CI-only guards and staged-file fixes:
[`lefthook.yml`](https://github.com/arrai-innovations/vueda/blob/main/lefthook.yml).


## Continuous Integration

VUEDA does not require a specific continuous integration provider. Instead, it assumes a small set of CI
expectations that any provider should be able to enforce.

At a minimum, CI should:

- Install dependencies for both server and client projects
- Run linting and formatting checks
- Run the full test suite
- Fail fast on violations that would be blocked by local git hooks

VUEDA’s reference implementation currently uses CircleCI. An example configuration file is included at the monorepo
root:

[`.circleci/config.yml`](https://github.com/arrai-innovations/vueda/blob/main/.circleci/config.yml)

This configuration relies on Arrai-specific CircleCI orbs and infrastructure (such as private registries, SSH
configuration, and badge publishing). As a result, it should be treated as illustrative rather than directly reusable.

When adopting VUEDA, expect to either adapt these steps to your own CI provider or reimplement them using the same
underlying commands.
