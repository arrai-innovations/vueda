#!/bin/bash

# bail on the first error, disallow clobbering
set -eC

# set the default listen addresses, but allow them
# to be overwritten if they're already set in the env.
export MP_SMTP_BIND_ADDR="${MP_SMTP_BIND_ADDR:-0.0.0.0:1025}"
export MP_UI_BIND_ADDR="${MP_UI_BIND_ADDR:-0.0.0.0:8025}"

# figure out the latest release version
LATEST_RELEASE=$(curl -sS -L https://api.github.com/repos/axllent/mailpit/releases/latest | jq -r '.tag_name')

# check if mailpit is installed
if [ ! -f ~/.local/bin/mailpit ]; then
    # make sure we have a local bin folder
    if [ ! -d ~/.local/bin/ ]; then
        mkdir -p -m 0700 ~/.local/bin/
    fi

    # create a temporary directory for the download and clean up on exit
    TMP=$(mktemp -d 2>/dev/null)
    trap '{ rm -rf -- "${TMP}"; }' EXIT

    # download, extract, and copy mailpit into the local bin folder
    curl -L -S -s "https://github.com/axllent/mailpit/releases/download/${LATEST_RELEASE}/mailpit-linux-amd64.tar.gz" | tar azxf - -C "${TMP}/"
    /usr/bin/cp -n "${TMP}/mailpit" ~/.local/bin/mailpit
    chmod 700 ~/.local/bin/mailpit
else
    # get the current version number
    CURRENT_RELEASE=$(~/.local/bin/mailpit version | awk '{print $2; exit}')

    # update using the built-in update function, if needed
    if [ "${CURRENT_RELEASE}" != "${LATEST_RELEASE}" ]; then
        ~/.local/bin/mailpit version -u
    fi
fi

~/.local/bin/mailpit
