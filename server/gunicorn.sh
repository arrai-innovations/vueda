#!/bin/bash
pipenv run gunicorn config.asgi -k uvicorn.workers.UvicornWorker --reload --bind 0.0.0.0:8000 --keyfile /etc/pki/tls/private/arrai.com.key --certfile /etc/pki/tls/certs/arrai.com.crt
