# VUEDA Monorepo Justfile

# Treat recipe lines starting with `#` as justfile comments: don't echo them to
# stderr or pass them to the shell.
set ignore-comments := true

# Load machine-specific env (gitignored) if present. Used for local-dev knobs
# like HTTPS_CERT_PATH / HTTPS_KEY_PATH that enable HTTPS in docs-serve.
set dotenv-load := true
set dotenv-filename := ".env.local"

bootstrap: # for development environment setup
  # not concurrently for clarity in output
  cd {{justfile_directory()}} && pnpm install
  pnpm -C {{justfile_directory()}} exec lefthook install
  cd {{justfile_directory()}} && uv sync --all-groups --all-packages

test:
  pnpx concurrently -n server,client,docs-tooling -c green,cyan,magenta "just test-server" "just test-client" "just test-docs-tooling"

[positional-arguments]
test-server *args:
  cd {{justfile_directory()}}/server && uv run --no-sync pytest "$@"

[positional-arguments]
test-client *args:
  cd {{justfile_directory()}}/client && pnpm test "$@"

test-docs-tooling:
  pnpx concurrently -n js,py -c cyan,green "just test-docs-tooling-js" "just test-docs-tooling-py"

[positional-arguments]
test-docs-tooling-js *args:
  cd {{justfile_directory()}}/docs-tooling && pnpm test "$@"

[positional-arguments]
test-docs-tooling-py *args:
  cd {{justfile_directory()}}/docs-tooling && uv run --group test --no-sync pytest "$@"

coverage:
  pnpx concurrently -n server,client,docs-tooling -c green,cyan,magenta "just coverage-server" "just coverage-client" "just coverage-docs-tooling"

[positional-arguments]
coverage-server *args:
  cd {{justfile_directory()}}/server && uv run --no-sync pytest --cov "$@"

[positional-arguments]
coverage-client *args:
  cd {{justfile_directory()}}/client && pnpm coverage "$@"

coverage-docs-tooling:
  pnpx concurrently -n js,py -c cyan,green "just coverage-docs-tooling-js" "just coverage-docs-tooling-py"

[positional-arguments]
coverage-docs-tooling-js *args:
  cd {{justfile_directory()}}/docs-tooling && pnpm coverage "$@"

[positional-arguments]
coverage-docs-tooling-py *args:
  cd {{justfile_directory()}}/docs-tooling && uv run --group test --no-sync pytest --cov "$@"

check:
  pnpx concurrently -n ruff,eslint,prettier -c green,cyan,magenta "just check-ruff" "just check-eslint" "just check-prettier"

check-ruff:
  cd {{justfile_directory()}} && uv run --group dev --no-sync ruff check server docs-tooling/py scripts

check-eslint:
  cd {{justfile_directory()}} && pnpm run lint:eslint

check-prettier:
  cd {{justfile_directory()}} && pnpm run lint:prettier

fix:
  pnpx concurrently -n ruff,eslint,prettier -c green,cyan,magenta "just fix-ruff" "just fix-eslint" "just fix-prettier"

fix-ruff:
  cd {{justfile_directory()}} && uv run --group dev --no-sync ruff check --fix server docs-tooling/py scripts && uv run --group dev --no-sync ruff format server docs-tooling/py scripts

fix-eslint:
  cd {{justfile_directory()}} && pnpm run fix:eslint

fix-prettier:
  cd {{justfile_directory()}} && pnpm run fix:prettier | sed '/unchanged/d'

types-client:
  cd {{justfile_directory()}}/client && pnpm run build:types

manage *args:
  cd {{justfile_directory()}}/server && uv run --no-sync python manage.py {{args}}

# VUEDA Documentation
docs-rebuild:
  rm -rf {{justfile_directory()}}/docs/.vitepress/.temp {{justfile_directory()}}/docs/.vitepress/cache
  cd {{justfile_directory()}}/docs && pnpm exec vitepress build

docs-rebuild-timing:
  rm -rf {{justfile_directory()}}/docs/.vitepress/.temp {{justfile_directory()}}/docs/.vitepress/cache
  cd {{justfile_directory()}}/docs && VUEDA_DOCS_TIMING=1 pnpm exec vitepress build

docs-serve:
  cd {{justfile_directory()}}/docs && pnpm exec vitepress dev --host 0.0.0.0 --port 8081 --force

docs-preview:
  cd {{justfile_directory()}}/docs && pnpm exec vitepress preview --host 0.0.0.0 --port 8081

docs-extract:
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js extract

docs-normalize:
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js normalize

docs-render:
  rm -rf {{justfile_directory()}}/docs/reference/api
  rm -rf {{justfile_directory()}}/docs/reference/theming/tokens
  rm -f {{justfile_directory()}}/docs/reference/theming/tokens.md
  rm -rf {{justfile_directory()}}/docs/reference/theming/keys
  rm -f {{justfile_directory()}}/docs/reference/theming/keys.md
  mkdir -p {{justfile_directory()}}/docs/reference/api
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js render

docs-api:
  just docs-extract
  just docs-normalize
  just docs-render

docs:
  just docs-api
  just docs-serve

docs-validate:
  just docs-api
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js validate

docs-build:
  just docs-api
  just docs-rebuild

docs-build-timing:
  just docs-api
  just docs-rebuild-timing

docs-preview-build:
  just docs-api
  just docs-rebuild
  just docs-preview
