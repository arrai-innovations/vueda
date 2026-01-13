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
