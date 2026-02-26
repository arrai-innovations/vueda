---
title: Build Auth Views
status: brainstorming
audience: implementor
type: how-to
---

# Build Auth Views

Exists to document how to build sign-in, sign-up, and re-authentication views using VUEDA's `AuthorizingForm` component and the field/widget system.

## Why this page exists

VUEDA does not ship a sign-in view (login forms are project-specific). The tutorial creates one but keeps explanation minimal. This page should cover:

- What `AuthorizingForm` does: wraps `ActionForm`, watches `storeUser`, redirects on login
- The redirect chain: `route.query.redirect` takes priority, then `props.redirect`, then `{ name: "welcome" }`
- How `runAction` receives `{ formValues }` from `ActionForm`'s submit cycle
- Using `FieldString`/`WidgetInput` in a hand-authored form (outside the metadata-driven CRUD surface)
- Building sign-up and re-authentication variants
- MFA flow handling (`pendingFlow` watcher, redirect to 2FA)

## Related gaps

`docs/guides/custom-field-widget-rendering.md` covers the field/widget architecture at the composable level but does not show how to use `FieldString`/`WidgetInput` in a hand-authored (non-CRUD) form. That gap could be filled here or there.
