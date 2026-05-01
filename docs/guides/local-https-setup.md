---
title: Local HTTPS Development
audience: integrators
status: draft
type: guide
---

# Local HTTPS Development

By default, the scaffolded project runs over plain HTTP on `localhost`. That is sufficient for most feature development, but VUEDA's production defaults set `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True`, and the scaffolded `settings/local.py` overrides both to `False` to compensate. If you want your local environment to match production security behavior — secure cookies, HTTPS-only — this guide walks through setting that up.

This guide uses [mkcert](https://github.com/FiloSottile/mkcert) to issue a locally trusted certificate for `localhost`. No changes to the project's committed code are required; everything lives in gitignored local files.

## Prerequisites

- [mkcert](https://github.com/FiloSottile/mkcert) installed on your development machine

    On Debian/Ubuntu: `sudo apt install mkcert`

    On Fedora: `sudo dnf install mkcert`

    On macOS: `brew install mkcert`

    On Windows (via Chocolatey): `choco install mkcert`

## Install the Local CA

mkcert creates a local certificate authority (CA) the first time you run:

```console
mkcert -install
```

This adds the CA to your system trust store. On Linux this updates `/etc/ssl/certs`; on macOS it updates the system Keychain.

### WSL2 and Windows browsers

The Linux system trust store is not shared with Windows-side browsers (Firefox, Chrome, Edge). You need to install the CA root certificate on the Windows side as well.

Copy the CA certificate to somewhere accessible from Windows:

```console
cp "$(mkcert -CAROOT)/rootCA.pem" /mnt/c/Users/YourName/Downloads/
```

Then import it into your browser:

- **Firefox**: Settings > Privacy & Security > Certificates > View Certificates > Authorities > Import. Select `rootCA.pem` and check "Trust this CA to identify websites."
- **Chrome / Edge**: Windows searches the Windows certificate store automatically. Run `certmgr.msc`, navigate to Trusted Root Certification Authorities > Certificates, right-click > All Tasks > Import, and import `rootCA.pem`.

## Generate a Certificate

From your project root, generate a certificate for `localhost`:

```console
mkcert -cert-file server/localhost.pem -key-file server/localhost-key.pem localhost 127.0.0.1 ::1
```

This writes `server/localhost.pem` and `server/localhost-key.pem`. Add both to your project's `.gitignore`:

```
server/localhost.pem
server/localhost-key.pem
```

## Configure the Django Server

The scaffolded project includes `server/gunicorn.conf.py.example`. Copy it and fill in the certificate paths:

```console
cp server/gunicorn.conf.py.example server/gunicorn.conf.py
```

Edit `server/gunicorn.conf.py`:

```python
certfile = "localhost.pem"
keyfile  = "localhost-key.pem"
```

Paths are relative to the working directory gunicorn is started from (`server/`). `gunicorn.conf.py` is already gitignored.

gunicorn picks this file up automatically — no extra flags or Justfile changes are needed. `just serve-server` (DX template) and the manual gunicorn command from the start-building guide both pick it up as-is.

## Configure the Vite Dev Server

Edit `client/vite.config.js` to add a `server.https` block:

```js
import { vuedaViteConfig } from "@arrai-innovations/vueda/lib/vite.js";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import fs from "fs";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    ...vuedaViteConfig(),
    server: {
        https: {
            cert: fs.readFileSync("../server/localhost.pem"),
            key: fs.readFileSync("../server/localhost-key.pem"),
        },
    },
});
```

The path `../server/` is relative to `client/`, where Vite runs.

## Update Server Configuration

### `config.toml`

Change the three values that reference the client origin from `http://` to `https://`:

```toml
FRONTEND_DOMAIN = "https://localhost:5173"
CSRF_TRUSTED_ORIGINS = ["https://localhost:5173"]
CORS_ALLOWED_ORIGINS = ["https://localhost:5173"]
```

Replace `5173` with your actual client port if you chose a different one during scaffolding.

### `settings/local.py`

The scaffolded `local.py` overrides `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` directly, so those need to change too. It also disables the secure cookie flags — remove those overrides so the production defaults apply:

```python
from config.settings.base import *

DEBUG = True

CSRF_COOKIE_NAME = "your-project-csrf-token"

CORS_ALLOWED_ORIGINS = [
    "https://localhost:5173",
]
CSRF_TRUSTED_ORIGINS = [
    "https://localhost:5173",
]
CORS_ALLOW_CREDENTIALS = True

# SESSION_COOKIE_SECURE and CSRF_COOKIE_SECURE are intentionally not overridden
# here. The production defaults (True) apply, which requires HTTPS end-to-end.

from vueda.core import patch_django  # noqa: F401
```

Again, replace `5173` with your actual client port.

## Verify

Start both servers:

```console
# DX template
just serve

# Minimal template (two terminals)
cd server && uv run --no-sync gunicorn config.asgi -k uvicorn.workers.UvicornWorker --reload --bind localhost:8000
cd client && pnpm dev
```

Check the Django server is responding over HTTPS:

```console
curl -i https://localhost:8000/routes/vueda.user/who-is/
```

Then open `https://localhost:5173` in your browser. The connection should be trusted and the padlock should show.

## How the Client Handles Protocol Automatically

VUEDA's `connectionHostname` utility derives the backend URL from `window.location.protocol`. When the Vite dev server is on HTTPS, the client automatically sends requests to `https://localhost:8000` rather than `http://`. There is no client-side configuration to change when switching between HTTP and HTTPS local setups.

## Note on `ALLOWED_HOSTS`

If you use a custom local hostname instead of `localhost` — for example, a hosts-file alias like `myproject.local` — add it to `ALLOWED_HOSTS` in `config.toml`:

```toml
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "myproject.local"]
```

Update the three CORS/CSRF/FRONTEND values to match that hostname as well.
