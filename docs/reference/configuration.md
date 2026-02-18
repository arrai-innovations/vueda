---
title: Configuration Surface
type: reference
audience: implementor
status: draft
---

# Configuration Surface

## What This Controls

This page will be the authoritative list of supported VUEDA configuration knobs for server and client integration.

## Server Configuration Areas

- Django settings defaults from `vueda.core.default_settings.get_defaults(...)`
- Permission mapping (`PERMISSION_NAMES_MAPPING`)
- DRF settings expectations (renderer/auth/filter behavior)
- Workflow and VDQ-related settings
- Environment-driven settings (database, cache, security, auth, email/sms integrations)

## Client Configuration Areas

- API base URL and route templates
- Auth/session expectations (cookie + CSRF behavior)
- Model config overrides and action redirect defaults
- Theme registration and component override surfaces

## Related References

- [Permissions](/reference/permissions)
- [Glossary](/reference/glossary)
- [JavaScript API](/reference/api/js/)
- [Python API](/reference/api/py/)
