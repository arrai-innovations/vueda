---
title: Local HTTPS Development
audience: integrator
status: draft
type: how-to
---

# Local HTTPS Development

VUEDA's default settings set {@api ext:django:setting:SESSION_COOKIE_SECURE} and {@api ext:django:setting:CSRF_COOKIE_SECURE} to `True`, so browsers send those cookies only over HTTPS. The scaffolded `server/config/settings/local.py` sets both to `False` so the project runs over plain HTTP. This guide serves both local servers over HTTPS and removes those two overrides, so local cookies behave as they do in production. Production keeps the same secure cookie defaults; this guide covers only the local development servers.

The steps use [mkcert](https://github.com/FiloSottile/mkcert) to issue a certificate that your browser trusts. Install it by following its README.

## Install the Local CA

Create mkcert's local certificate authority (CA) and add it to your system trust store:

```console
mkcert -install
```

If you develop in WSL2 and browse from Windows, the Windows browsers do not read the Linux trust store. Import the CA file into the Windows certificate store. If you use Firefox, import it into Firefox's own store. This command prints the folder that holds the CA file, `rootCA.pem`:

```console
mkcert -CAROOT
```

## Generate a Certificate

The certificate must name the host that you open in the browser. That host is the `bind_ip` you chose when scaffolding, which defaults to `localhost`. From the project root, run:

```console
mkcert -cert-file server/localhost.pem -key-file server/localhost-key.pem localhost 127.0.0.1 ::1
```

If your `bind_ip` is not one of these names, add it to the end of the command.

The project's `.gitignore` does not cover these files. Add them:

```
server/localhost.pem
server/localhost-key.pem
```

## Configure gunicorn

Both templates include `server/gunicorn.conf.py.example`. Copy it:

```console
cp server/gunicorn.conf.py.example server/gunicorn.conf.py
```

In `server/gunicorn.conf.py`, uncomment `certfile` and `keyfile` and set the paths:

```python
certfile = "localhost.pem"
keyfile  = "localhost-key.pem"
```

gunicorn resolves these paths from `server/`, where it runs, and reads `gunicorn.conf.py` from that folder on startup. `server/gunicorn.conf.py` is already gitignored.

## Configure Vite

In `client/vite.config.js`, merge a `server.https` block into the result of {@api js:function:@arrai-innovations/vueda/vite#vuedaViteConfig}. Merging keeps the `server.fs.allow` list that `vuedaViteConfig` returns when VUEDA is linked from a source checkout. The added lines are the `fs` import, `mergeConfig`, and the `server` block:

```js
import { vuedaViteConfig } from "@arrai-innovations/vueda/lib/vite.js";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, mergeConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    ...mergeConfig(
        vuedaViteConfig({
            extraAliases: {
                // The action router uses this alias to discover views in src/views.
                "@": path.resolve(__dirname, "src"),
            },
        }),
        {
            server: {
                https: {
                    cert: fs.readFileSync("../server/localhost.pem"),
                    key: fs.readFileSync("../server/localhost-key.pem"),
                },
            },
        },
    ),
});
```

Vite runs from `client/`, so `../server/` points at the certificate files.

The client needs no other change. The {@api js:module:@arrai-innovations/vueda/utils/connectionHostname} module takes the protocol and host from the page's own address, so a page served over HTTPS calls the server over `https` and opens WebSockets over `wss`. It takes the server's port from `VITE_DJANGO_CONNECTION_PORT` in `client/.env.development`.

## Update `config.local.toml`

In `server/config.local.toml`, change the three origin values from `http://` to `https://`. With the default `bind_ip` and client port, they read:

```toml
FRONTEND_DOMAIN = "https://localhost:5173"
CSRF_TRUSTED_ORIGINS = ["https://localhost:5173"]
CORS_ALLOWED_ORIGINS = ["https://localhost:5173"]
```

`FRONTEND_DOMAIN` is the client's full origin, including the scheme. The server builds the links in account emails, such as the password reset email, from this value exactly as written.

If you open the app under another hostname, such as a hosts-file alias like `myproject.local`, use that hostname in all three values. Add it to {@api ext:django:setting:ALLOWED_HOSTS} in the same file, and include it in the certificate:

```toml
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "myproject.local"]
```

## Remove the Cookie Overrides

In `server/config/settings/local.py`, delete these two lines and leave the rest of the file as it is:

```python
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
```

The file's `CSRF_COOKIE_SAMESITE = "Lax"` and `SESSION_COOKIE_SAMESITE = "Lax"` lines stay.

## Verify

Start both servers. With the DX template, run `just serve`. With the minimal template, run each in its own terminal:

```console
cd server && uv run gunicorn config.asgi -k uvicorn.workers.UvicornWorker --reload --bind localhost:8000
cd client && pnpm dev
```

Check the server over HTTPS:

```console
curl -i https://localhost:8000/routes/vueda.user/who-is/
```

The [who-is endpoint]{@api rest:endpoint:GET:/vueda.user/who-is/} answers `200` without a certificate error. When no user is signed in, the body is an empty JSON object.

Then open `https://localhost:5173`. The browser loads the app without a certificate warning.
