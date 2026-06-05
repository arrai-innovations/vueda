---
title: Client Plugin Prerequisites
status: draft
audience: integrator
type: how-to
---

# Client Plugin Prerequisites

This guide covers the Vue plugins, directives, and VUEDA-specific setup functions that must be registered before mounting a VUEDA client application. It explains what each dependency provides, which built-in components rely on it, and what fails when it is missing. The registration sequence depends on `setTheme` to provide component styling classes and on {@api js:function:@arrai-innovations/vueda/utils/listCrud#setupDefaultListCrud} and {@api js:function:@arrai-innovations/vueda/utils/objectCrud#setupDefaultObjectCrud} to activate the shared {@term CRUDL} data path used by built-in views.

The guide assumes familiarity with Vue 3 application setup (`createApp`, `app.use`, `app.directive`). For the tutorial-style walkthrough that shows the full `main.js` in context, see [Start Building](../tutorials/start-building). For theme customization beyond the base preset, consult the PrimeVue documentation.

## Goal and Preconditions

The objective is a `main.js` that registers all required plugins and setup functions so that VUEDA's built-in views, components, and stores function correctly.

Before you begin:

The project must have `primevue`, `@primeuix/themes`, and `vue-sonner` installed as dependencies. These are peer dependencies of `@arrai-innovations/vueda`. Pinia and Vue Router must also be installed; they are assumed throughout but are not VUEDA-specific.

If you are using the built-in `vueda-tailwind` theme (recommended), you also need `tailwindcss` and `@tailwindcss/vite` installed as dev dependencies, and the Vite plugin registered in `vite.config.js`. Tailwindcss is a build tool, not a runtime peer dependency of VUEDA.

## Registration Order

Plugin registration follows a specific order. Some steps have dependencies on earlier steps; others are order-independent but grouped by concern for clarity.

```javascript
import TheApp from "./TheApp.vue";
import { getRouter } from "./router/index.js";
import Aura from "@primeuix/themes/aura";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setTheme } from "@vueda/use/useTheme.js";
import { setupDefaultListCrud } from "@vueda/utils/listCrud.js";
import { setupDefaultObjectCrud } from "@vueda/utils/objectCrud.js";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

// 1. Theme and CRUDL adapters (before app creation)
setTheme(vuedaTailwind);
setupDefaultListCrud();
setupDefaultObjectCrud();

// 2. App and core plugins
const app = createApp(TheApp);
const pinia = createPinia();
const router = getRouter(app, pinia);

app.use(pinia);
app.use(router);

// 3. PrimeVue and services
app.use(PrimeVue, {
    theme: {
        preset: Aura,
    },
});
app.use(ConfirmationService);
app.directive("tooltip", Tooltip);

// 4. Mount
app.mount("#the-app");
```

The sections below explain each registration step.

## Theme

`setTheme(themeObject)` registers the component theme that VUEDA uses to resolve CSS classes for every component slot (layout containers, buttons, inputs, headings, etc.).

VUEDA ships a first-party Tailwind CSS theme at `@vueda/theme/vueda-tailwind/index.js`. This is the recommended starting point. It maps each component's named slots to Tailwind utility classes and supports overrides through `patchTheme()`, `setTheme()`, and per-component `themeOverride` props. For an explanation of the available customization scopes, see [Theming and Customization](../core-concepts/theming-and-customization); for concrete recipes, see [Customize VUEDA Appearance](customize-vueda-appearance).

Using the `vueda-tailwind` theme requires Tailwind CSS to be set up in your project so those utility classes generate CSS. Install `tailwindcss` and `@tailwindcss/vite` as dev dependencies and add the plugin to your `vite.config.js`:

```javascript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    // ...
});
```

The theme also requires a set of CSS custom properties that the class strings reference: semantic color tokens (`--foreground`, `--background`, `--primary`, `--muted`, `--sidebar` and related variants), VUEDA-specific dimensional tokens (`--vueda-control-height`, `--vueda-control-radius`, `--vueda-cal-day`, `--vueda-sidebar-width`, etc.), shadow tokens (`--vueda-shadow-popover`, `--vueda-shadow-overlay`), and motion tokens (`--vueda-duration-interaction`, `--vueda-ease-interaction`). The full set with default values is shipped at `@vueda/theme/vueda-tailwind/base.css`. Import it once in your project's main CSS file:

```css
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";
```

`base.css` is the brand-customization surface. Override individual tokens after the import to re-skin the app; see [Customize VUEDA Appearance](customize-vueda-appearance#re-skin-via-tokens) for the full recipe. The default values land VUEDA in a near-monochrome cool-neutral palette with dense control sizing; consumers who want a different look should override tokens rather than fork `base.css`.

The theme system itself is CSS-framework-agnostic. `setTheme` accepts any object that follows the `ThemeObject` shape (component name to slot to class map). To use a different CSS framework, provide a theme object that maps the same component and slot keys to your own classes, and either supply your own equivalent token definitions or rewrite the class strings to not depend on the VUEDA tokens.

This must be called **before** any VUEDA component renders. Calling it before `createApp` satisfies this requirement.

**What depends on it:** Every VUEDA component resolves its CSS classes through the theme system. Without a registered theme, components render with empty class attributes.

**What fails without it:** Components render without any styling classes. The application is functional but visually unstyled. No runtime error occurs.

## CRUDL Adapters

`setupDefaultListCrud()` and `setupDefaultObjectCrud()` register the HTTP adapter functions that VUEDA's composables use for every data operation (list, retrieve, create, update, patch, delete, bulk delete).

These must be called **before** any VUEDA store or composable attempts a data fetch. Calling them before `createApp` satisfies this requirement.

**What depends on them:** Every list view (`ViewList`, filtering, pagination), every detail view (`ViewRead`, `ViewCreate`, `ViewUpdate`, `ViewDestroy`), and any composable that calls the {@term CRUDL} layer.

**What fails without them:** Data operations silently return no results. Lists appear empty, forms do not load data, and save operations have no effect. There is no runtime error; the CRUDL layer has no adapter to call, so it produces no output.

## PrimeVue

`app.use(PrimeVue, { theme: { preset } })` registers PrimeVue's configuration system on the Vue application. The `preset` option sets the design token foundation (colors, spacing, typography, border radii) that all PrimeVue components consume through CSS custom properties.

VUEDA uses the Aura preset by default. Any PrimeVue preset is compatible; the choice affects visual appearance but not functionality.

**What depends on it:** Every VUEDA widget component (`WidgetSelect`, `WidgetDatePicker`, `WidgetInput`, `WidgetAutoComplete`, `WidgetMultiSelect`, `WidgetCheckbox`, `WidgetRadio`, `WidgetSlider`, and others) renders a PrimeVue component internally. Layout components such as `Button` (used by `ActionForm` and toolbar controls) also depend on PrimeVue.

**What fails without it:** PrimeVue components render without styling. Inputs, buttons, and dropdowns appear as unstyled HTML elements. CSS custom properties for the design tokens are undefined, so any component that reads them produces visual inconsistencies.

## Toast Notifications (FeedbackToaster)

Toast notifications use `vue-sonner` instead of PrimeVue's ToastService. Install it as a direct application dependency so VUEDA's toaster and any application code that imports `toast` share the same module instance. No plugin registration is needed; `toast` is a plain module import that works anywhere (components, composables, stores, route guards).

**Setup:** Render `<FeedbackToaster />` once in your root component (e.g. `TheApp.vue`):

```vue
<script setup>
import { FeedbackToaster } from "@vueda/feedback/toast";
</script>

<template>
    <FeedbackToaster />
    <RouterView />
</template>
```

**Usage:**

```javascript
import { toast } from "vue-sonner";

toast.success("Saved successfully");
toast.error("Something went wrong", { description: "Details here", duration: 15000 });
toast.warning("Please check your input");
toast.info("No changes detected");
```

**What depends on it:** `ActionForm` displays success, error, and warning toasts after form submissions. `AuthorizingForm` shows a redirect confirmation toast. `useObjectForm` default handlers show toasts for "No Changes Detected", "Pre-save Validation Failed", and "Save Validation Failed" scenarios. `ClickToCopyText`, `ViewWorkflowTransition`, and the MFA setup views also use toast notifications.

**What fails without it:** If `<FeedbackToaster />` is not mounted, `toast(...)` calls silently do nothing (no error is thrown, but no notification appears).

## ConfirmationService

`app.use(ConfirmationService)` registers PrimeVue's global confirmation dialog service. Components access it through the `useConfirm()` composable.

**What depends on it:** `ActionForm` uses confirmation dialogs when the `confirmMessage` prop is set. Bulk delete operations and destructive actions may trigger confirmation prompts.

**What fails without it:** `useConfirm()` returns `undefined`. Any component that attempts to show a confirmation dialog throws a `TypeError`. In practice, this surfaces when a user triggers a delete or other destructive action that is configured to require confirmation.

## Tooltip Directive

`app.directive("tooltip", Tooltip)` registers the PrimeVue tooltip as a global directive. Components use it via the `v-tooltip` attribute on template elements.

**What depends on it:** Field help text, icon labels, and abbreviated content use `v-tooltip` for hover explanations.

**What fails without it:** The `v-tooltip` attribute is silently ignored. No runtime error occurs; help text tooltips simply do not appear. This is the least critical of the plugin dependencies, but users lose access to contextual help on form fields.

## Verification Checklist

After completing the registration sequence, verify the following:

- A list view loads data and renders rows with correct styling.
- Submitting a form displays a success toast notification.
- A form with invalid data displays inline validation errors and a warning toast.
- Hovering over a field with help text shows a tooltip.
- A destructive action (e.g., delete) shows a confirmation dialog before proceeding.

## Troubleshooting

**Toast notifications not appearing.** `<FeedbackToaster />` is not mounted in the root component. Add it to `TheApp.vue`.

**Components render as unstyled HTML.** Either `setTheme` was not called (VUEDA layout classes are missing) or PrimeVue is not registered (PrimeVue widget styling is missing). Verify `setTheme(vuedaTailwind)` is called before app creation and `app.use(PrimeVue, { theme: { preset: Aura } })` is present. Check the browser console for missing CSS custom property warnings.

**Lists load but show no data.** CRUDL adapters are not registered. Verify that `setupDefaultListCrud()` and `setupDefaultObjectCrud()` are called before app creation. Check the network tab; if no HTTP requests are made for list data, the adapter layer has no implementation.

**Tooltips do not appear on hover.** The Tooltip directive is not registered. Add `app.directive("tooltip", Tooltip)`. This has no runtime error, so it is easy to miss.

**Confirmation dialog does not appear for delete actions.** `ConfirmationService` is not registered. Add `app.use(ConfirmationService)`. Also verify that the action's configuration includes a `confirmMessage` prop.

## Relevant Implementation Surface

- JavaScript:
    - {@api js:function:@arrai-innovations/vueda/use/themeRegistry#setTheme}
    - {@api js:function:@arrai-innovations/vueda/use/themeRegistry#patchTheme}
    - {@api js:function:@arrai-innovations/vueda/utils/listCrud#setupDefaultListCrud}
    - {@api js:function:@arrai-innovations/vueda/utils/objectCrud#setupDefaultObjectCrud}
- Vue.js Components:
    - {@api vue:component:ActionForm}
    - {@api vue:component:AuthorizingForm}
    - {@api vue:component:AuthForm}
