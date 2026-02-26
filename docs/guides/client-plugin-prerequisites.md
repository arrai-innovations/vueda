---
title: Client Plugin Prerequisites
status: brainstorming
audience: implementor
type: how-to
---

# Client Plugin Prerequisites

Exists to document the Vue plugins and directives that VUEDA's built-in views and components depend on, and how to register them.

## Why this page exists

The tutorial shows a complete `main.js` with PrimeVue, ToastService, ConfirmationService, Tooltip, and `setPrimeVuePreset()` but does not explain why each is required. This page should cover:

- Which PrimeVue plugins are required and which built-in components depend on them
- What `setPrimeVuePreset()` does (lets VUEDA's theme system read PrimeVue tokens)
- The relationship between the PrimeVue preset passed to `app.use(PrimeVue, { theme: { preset } })` and `setPrimeVuePreset()`
- Failure modes when plugins are missing (e.g., `TypeError` from toast service, unstyled components)
