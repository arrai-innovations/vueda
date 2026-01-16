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

docs:
  cd {{justfile_directory()}} && pnpm exec vitepress build docs

docs-serve:
  cd {{justfile_directory()}} && pnpm exec vitepress dev docs --host 0.0.0.0 --port 8000

docs-api:
  cd {{justfile_directory()}} && uv run --no-sync python scripts/build_docs.py --reference-only

docs-rest:
  mkdir -p {{justfile_directory()}}/docs/public/api
  cd {{justfile_directory()}}/server && uv run --no-sync python manage.py spectacular --color --file ../docs/public/api/schema.yml
  cd {{justfile_directory()}} && npx -y @redocly/cli build-docs docs/public/api/schema.yml -o docs/public/api/rest.html

docs-all:
  just docs-api
  just docs-rest
  just docs
