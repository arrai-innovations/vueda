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
  rm -rf {{justfile_directory()}}/docs/api
  mkdir -p {{justfile_directory()}}/docs/api
  cd {{justfile_directory()}}/docs-tooling && ./bin/docs-tooling.js render --output ../docs/api

docs-api:
  just docs-extract
  just docs-normalize
  just docs-render

docs:
  just docs-api
  just docs-serve

docs-build:
  just docs-api
  just docs-rebuild
