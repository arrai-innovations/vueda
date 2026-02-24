# VUEDA Monorepo Justfile

bootstrap: # for development environment setup
  # not concurrently for clarity in output
  cd {{justfile_directory()}} && pnpm install
  pnpm -C {{justfile_directory()}} exec lefthook install
  cd {{justfile_directory()}} && uv sync --all-groups --all-packages

test:
  pnpx concurrently -n server,client -c green,cyan "just test-server" "just test-client"

test-server:
  cd {{justfile_directory()}}/server && uv run --no-sync pytest

test-client:
  cd {{justfile_directory()}}/client && pnpm test

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
  cd {{justfile_directory()}} && pnpm run fix:prettier

manage *args:
  cd {{justfile_directory()}}/server && uv run --no-sync python manage.py {{args}}

# VUEDA Documentation
docs-rebuild:
  rm -rf {{justfile_directory()}}/docs/.vitepress/.temp {{justfile_directory()}}/docs/.vitepress/cache
  cd {{justfile_directory()}}/docs && pnpm exec vitepress build

docs-serve:
  cd {{justfile_directory()}}/docs && pnpm exec vitepress dev --host 0.0.0.0 --port 8000

docs-extract:
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js extract

docs-normalize:
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js normalize

docs-render:
  rm -rf {{justfile_directory()}}/docs/reference/api
  mkdir -p {{justfile_directory()}}/docs/reference/api
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js render --output ../docs/reference/api

docs-api:
  just docs-extract
  just docs-normalize
  just docs-render

docs:
  just docs-api
  just docs-serve

docs-validate:
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js validate

docs-build:
  just docs-api
  just docs-rebuild
