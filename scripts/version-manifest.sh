#!/usr/bin/env bash
# Writes a release version manifest for the external compatibility aggregator.
# Reads client + server versions from in-tree files (monorepo guarantees both
# are present at every tagged commit). One file per release, named by tag.
#
# Usage: scripts/version-manifest.sh <trigger> <output-path>
#   trigger      one of: client | server | docs
#   output-path  file path to write
#
# Requires jq. Uses $CIRCLE_TAG if set, otherwise the exact-match tag on HEAD.

set -euo pipefail

trigger=${1:?trigger required (client|server|docs)}
out=${2:?output path required}

case "$trigger" in
    client|server|docs) ;;
    *) echo "trigger must be client|server|docs, got: $trigger" >&2; exit 1 ;;
esac

repo_root=$(git rev-parse --show-toplevel)

client_version=$(jq -r .version "$repo_root/client/package.json")
server_version=$(
    grep -E '^__version__[[:space:]]*=' "$repo_root/server/vueda/__init__.py" \
        | sed -E 's/^__version__[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/'
)

tag=${CIRCLE_TAG:-$(git describe --exact-match --tags HEAD 2>/dev/null || true)}
commit=$(git rev-parse HEAD)
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$(dirname "$out")"
jq -n \
    --arg trigger "$trigger" \
    --arg tag "$tag" \
    --arg commit "$commit" \
    --arg builtAt "$built_at" \
    --arg client "$client_version" \
    --arg server "$server_version" \
    '{trigger: $trigger, tag: $tag, commit: $commit, builtAt: $builtAt, client: $client, server: $server}' \
    > "$out"

echo "Wrote $out"
