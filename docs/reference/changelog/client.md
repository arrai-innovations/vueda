---
title: Client
type: reference
audience: integrator
status: draft
---

# Client Changelog

Integrator-facing changes for the `@arrai-innovations/vueda` npm package.

Use this page for changes that affect client package consumers: public Vue components, composables, routes, stores, theme behavior, build integration, dependency expectations, and migration notes.

<!-- towncrier release notes start -->

## v3.0.0-beta.1 (unreleased)

This is the first public beta of the VUEDA v3 client. It builds list, detail, form, action, and workflow screens from the metadata that the VUEDA server publishes. A project on client v2.0.4 upgrades with [Upgrade from VUEDA v2](../../guides/upgrade-from-v2.md), which also covers the matching server upgrade.

### Installation and Requirements

Install the beta from the public npm registry. The `latest` tag points to an older alpha, so name the `beta` tag:

```bash
pnpm add @arrai-innovations/vueda@beta
```

The client requires:

- Node 22 or later.
- Vue 3.5, Vue Router 4.5, and Pinia 3.
- The peer dependencies in `package.json`, including `@arrai-innovations/reactive-helpers` 25, `@vueuse/core` 14, and `@arrai-innovations/vue-sonner` 2.0.11.
- Tailwind CSS 4 with `@tailwindcss/vite` for the default theme.
- A v3 VUEDA server. The client reads metadata shapes that only the v3 server sends.

[Client Plugin Prerequisites](../../guides/client-plugin-prerequisites.md) lists the setup that the application performs before it mounts.

### Capabilities

- **Controls and theme.** VUEDA ships its own controls, built on Reka UI, and a default theme of Tailwind classes and CSS tokens. You can restyle one instance, one component, a family of components, or the whole brand. [Theming and Customization](../../core-concepts/theming-and-customization.md) describes the four scopes.
- **Icons.** Components resolve icons through a registry. A Font Awesome Free preset fills it. [Register the Icons](../../guides/client-plugin-prerequisites.md#register-the-icons) shows the setup.
- **Layout.** The application layout owns the page title, page actions, and sticky bars, and views contribute to them. [Place the Page Title and Page Actions](../../guides/place-page-title-and-actions.md) shows the setup.
- **Lists.** List views sort by several fields through chips and keep the sort in the URL. They filter through chips with typed inputs, open scoped lists, and link rows to detail views. Columns render by field type and can show server column totals. [Configure `list`/`read`/`create`/`update` Views](../../guides/configure-crud-views.md) covers the options.
- **Forms.** Forms confirm server warnings before a write, upload files at any depth of a nested form, and render read-only values formatted by field type. [Require Confirmation Before a Write](../../guides/require-write-confirmation.md) covers the confirmation step.
- **Routing.** `makeCRUDRoutes` opens a route for each workflow transition by its code, rechecks access when the signed-in user changes, and honors the `routeActions` allowlist. [Routing and View Resolution Model](../../core-concepts/routing-and-view-resolution-model.md) describes the guard chain.
- **Auth views.** Default sign-in, forgot-password, reset-password, and reauthentication views cover two-factor sign-in and code-based reauthentication. [Build Auth Views](../../guides/build-auth-views.md) shows the routes that they expect.
- **User changes.** Stores clear metadata, configuration, choices, and workflow data when the signed-in user changes. [When the Signed-In User Changes](../../core-concepts/reactive-data-flow.md#when-the-signed-in-user-changes) lists what clears.
- **Build integration.** `vuedaViteConfig()` sets up the `@vueda` alias and deduplicates peer packages. When you pass your `src` directory as its `@` alias, it also finds convention-named action views.

### Known Limitations

- A configured `formProps` entry applies differently on create than on update, read, and detail screens ([#341](https://github.com/arrai-innovations/vueda/issues/341)).
- `FormModel` ignores its `variant` when it resolves theme entries ([#339](https://github.com/arrai-innovations/vueda/issues/339)).
- A custom `#fields` layout does not receive per-field slots ([#338](https://github.com/arrai-innovations/vueda/issues/338)). `FieldRenderer` ignores its `fieldProps` prop ([#337](https://github.com/arrai-innovations/vueda/issues/337)).
- A display field whose path starts with a model field named `related` or `calculated` renders blank ([#310](https://github.com/arrai-innovations/vueda/issues/310)).
- `useVersion().newClientAvailable` stays false unless the project defines `VITE_PACKAGE_VERSION` itself, because `vuedaViteConfig()` does not define it ([#300](https://github.com/arrai-innovations/vueda/issues/300)).
- Binding `on-submission-error-handler` on `AuthForm` makes a failed submission throw ([#409](https://github.com/arrai-innovations/vueda/issues/409)).
- Relation selects built on `WidgetModel` load only the first 200 options and have no search. List filter dropdowns have the same limit ([#381](https://github.com/arrai-innovations/vueda/issues/381)). `WidgetCombobox`, the default relation widget, searches the list endpoint and does not have this limit.
- A form does not report fields that failed to render. A user can submit a form with a field that they never saw ([#197](https://github.com/arrai-innovations/vueda/issues/197)).
- The client uses fixed query parameter names. A server that renames `o`, `s`, the page parameters, or `ct` needs a matching client change ([#301](https://github.com/arrai-innovations/vueda/issues/301)).
- A built-in theme module that loads after the application calls `setClassMerger` replaces the application's class merger ([#467](https://github.com/arrai-innovations/vueda/issues/467)).
- The design review of the default theme is incomplete, so default styles may change between betas ([#248](https://github.com/arrai-innovations/vueda/issues/248)).

## Public Baseline

VUEDA client versions before v3.0.0-beta.1 were private releases or prereleases. This page starts the public history at v3.0.0-beta.1.
