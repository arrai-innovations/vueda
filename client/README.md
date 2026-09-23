# VUEDA Client

<a href="https://vueda.dev">
    <img src="https://vueda.dev/v3/assets/logo-text-solid.png" alt="VUEDA: Vue.js User Experience for Django Administration" width="420">
</a>

[![npm alpha](https://img.shields.io/npm/v/@arrai-innovations/vueda/alpha)](https://www.npmjs.com/package/@arrai-innovations/vueda/v/alpha)

[vueda.dev](https://vueda.dev) · [Documentation](https://vueda.dev/v3/) · [Start building](https://vueda.dev/v3/tutorials/start-building.html) · [Client changelog](https://vueda.dev/v3/reference/changelog/client.html)

VUEDA Client is the Vue 3 frontend library for VUEDA, a framework for building
business applications with Django and Vue. It turns metadata from
[VUEDA Server](https://github.com/arrai-innovations/vueda/tree/main/server) into
forms, lists, detail screens, and routes. Metadata describes the models' fields,
actions, and permissions.

The npm package is [@arrai-innovations/vueda](https://www.npmjs.com/package/@arrai-innovations/vueda/v/alpha).

<!-- prettier-ignore-start -->
<!--TOC-->

- [VUEDA Client](#vueda-client)
  - [What it provides](#what-it-provides)
  - [Get started](#get-started)
    - [Integration requirements](#integration-requirements)
  - [Customize a model's views](#customize-a-models-views)
  - [Contributing](#contributing)

<!--TOC-->
<!-- prettier-ignore-end -->

## What it provides

- **Application views:** lists with filtering and pagination, create and edit
  forms, detail views, business actions, and audit history.
- **Forms and inputs:** field and widget components, validation, choice loading,
  and form state management.
- **Routing and navigation:** routes derived from server metadata, action view
  resolution, and navigation components.
- **Authentication:** sign-in, account, and multi-factor authentication views.
- **Customization:** model configuration, custom Vue views and widgets, and a
  default Tailwind CSS theme with light and dark modes.

[Explore the components](https://vueda.dev/v3/reference/components/) to see the
interface and available controls. The server enforces permissions on every
request; the client's visible actions and route guards describe UI behavior.

## Get started

For a new application, follow
[Start Building](https://vueda.dev/v3/tutorials/start-building.html). It scaffolds
both packages and walks through a working inventory application.

To add the client to an existing project, install the alpha from public npm.
No registry credentials are needed:

```console
npm install @arrai-innovations/vueda@alpha --registry=https://registry.npmjs.org/
```

The v3 series is currently a prerelease. Use the documentation for the major
version installed in your application.

### Integration requirements

The supported setup uses Vue 3, Vite, Pinia, Vue Router, and a VUEDA Server API.
The package ships Vue and JavaScript source. Configure `@vueda` as an alias to
`@arrai-innovations/vueda/lib` so imports resolve to that source directory.

Application setup includes registering the theme, data adapters, plugins, and
routes. The default theme also requires Tailwind CSS and its Vite plugin.
Follow the [client setup walkthrough](https://vueda.dev/v3/tutorials/start-building.html#vueda-client)
and [plugin prerequisites](https://vueda.dev/v3/guides/client-plugin-prerequisites.html)
for the complete configuration.

## Customize a model's views

After the application is connected and Pinia is installed, configure a registered
model without writing a replacement view. For example, choose the columns shown
in the inventory product list:

```javascript
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

const modelConfig = storeModelConfig();

modelConfig.setConfig({ app: "inventory", model: "product" }, null, {
    list: { displayFields: ["name", "sku", "description"] },
});
```

This assumes the server exposes those fields on `inventory.product`. Other views
keep their existing configuration.

- [Configure views](https://vueda.dev/v3/guides/configure-crud-views.html): fields,
  columns, sorting, and action-specific options.
- [Customize appearance](https://vueda.dev/v3/guides/customize-vueda-appearance.html):
  theme tokens and component overrides.
- [Use a custom field widget](https://vueda.dev/v3/guides/custom-field-widget-rendering.html):
  replace a field's input while keeping the form behavior.
- [Build authentication views](https://vueda.dev/v3/guides/build-auth-views.html):
  sign-in and account flows.

## Contributing

Development setup, checks, and test commands live in the
[monorepo README](https://github.com/arrai-innovations/vueda#develop-vueda).
Read the [contribution guide](https://github.com/arrai-innovations/vueda/blob/main/CONTRIBUTING.md)
or [report an issue](https://github.com/arrai-innovations/vueda/issues).

Built by [Arrai Innovations](https://arrai.com), under the
[BSD 3-Clause license](https://github.com/arrai-innovations/vueda/blob/main/client/LICENSE).
