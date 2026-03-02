---
title: Client Plugin Prerequisites
status: draft
audience: implementor
type: how-to
---

# Client Plugin Prerequisites

This guide covers the Vue plugins, directives, and VUEDA-specific setup functions that must be registered before mounting a VUEDA client application. It explains what each dependency provides, which built-in components rely on it, and what fails when it is missing. The registration sequence depends on {@api js:function:@arrai-innovations/vueda.utils/listCrud.setupDefaultListCrud} and {@api js:function:@arrai-innovations/vueda.utils/objectCrud.setupDefaultObjectCrud} to activate the shared {@term CRUDL} data path used by built-in views.

The guide assumes familiarity with Vue 3 application setup (`createApp`, `app.use`, `app.directive`). For the tutorial-style walkthrough that shows the full `main.js` in context, see [Start Building](../tutorials/start-building). For theme customization beyond the base preset, consult the PrimeVue documentation.

## Goal and Preconditions

The objective is a `main.js` that registers all required plugins and setup functions so that VUEDA's built-in views, components, and stores function correctly.

Before you begin:

The project must have `primevue` and `@primeuix/themes` installed as dependencies. These are peer dependencies of `@arrai-innovations/vueda`. Pinia and Vue Router must also be installed; they are assumed throughout but are not VUEDA-specific.

## Registration Order

Plugin registration follows a specific order. Some steps have dependencies on earlier steps; others are order-independent but grouped by concern for clarity.

```javascript
import TheApp from "./TheApp.vue";
import { getRouter } from "./router/index.js";
import Aura from "@primeuix/themes/aura";
import { setPrimeVuePreset } from "@vueda/theme/register.js";
import { setupDefaultListCrud } from "@vueda/utils/listCrud.js";
import { setupDefaultObjectCrud } from "@vueda/utils/objectCrud.js";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

// 1. CRUDL adapters (before app creation)
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
app.use(ToastService);
app.use(ConfirmationService);
app.directive("tooltip", Tooltip);

// 4. VUEDA theme sync
setPrimeVuePreset(Aura);

// 5. Mount
app.mount("#the-app");
```

The sections below explain each registration step.

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

## ToastService

`app.use(ToastService)` registers PrimeVue's global toast notification service. Components access it through the `useToast()` composable, which returns an object with an `add()` method for displaying notifications.

**What depends on it:** `ActionForm` displays success, error, and warning toasts after form submissions. `AuthorizingForm` shows a redirect confirmation toast. `useObjectForm` default handlers show toasts for "No Changes Detected", "Pre-save Validation Failed", and "Save Validation Failed" scenarios. `ClickToCopyText`, `ViewWorkflowTransition`, and the MFA setup views also use toast notifications.

**What fails without it:** `useToast()` returns `undefined`. The first component that calls `toast.add(...)` throws `TypeError: Cannot read properties of undefined (reading 'add')`. This typically surfaces on the first form submission or successful login.

## ConfirmationService

`app.use(ConfirmationService)` registers PrimeVue's global confirmation dialog service. Components access it through the `useConfirm()` composable.

**What depends on it:** `ActionForm` uses confirmation dialogs when the `confirmMessage` prop is set. Bulk delete operations and destructive actions may trigger confirmation prompts.

**What fails without it:** `useConfirm()` returns `undefined`. Any component that attempts to show a confirmation dialog throws a `TypeError`. In practice, this surfaces when a user triggers a delete or other destructive action that is configured to require confirmation.

## Tooltip Directive

`app.directive("tooltip", Tooltip)` registers the PrimeVue tooltip as a global directive. Components use it via the `v-tooltip` attribute on template elements.

**What depends on it:** Field help text, icon labels, and abbreviated content use `v-tooltip` for hover explanations.

**What fails without it:** The `v-tooltip` attribute is silently ignored. No runtime error occurs; help text tooltips simply do not appear. This is the least critical of the plugin dependencies, but users lose access to contextual help on form fields.

## setPrimeVuePreset

`setPrimeVuePreset(preset)` stores the PrimeVue preset object in a module-scoped variable that VUEDA's widget components access at runtime through `getPrimeVuePreset()`.

This is separate from `app.use(PrimeVue, { theme: { preset } })`. The PrimeVue plugin registration configures PrimeVue on the Vue application instance. `setPrimeVuePreset` makes the same preset object available to VUEDA's pass-through styling system, which extends PrimeVue component styling for features like warning states.

The preset passed to `setPrimeVuePreset` must be the same object passed to PrimeVue's `theme.preset` option. Passing a different preset produces styling inconsistencies between base PrimeVue components and VUEDA's extensions.

**What depends on it:** `useWarningClass()`, which adds the `.p-warning` CSS class to form fields that have validation warnings. This composable uses `getPrimeVuePreset()` to build a PrimeVue pass-through configuration that merges warning styles with the base preset.

**What fails without it:** `getPrimeVuePreset()` returns `null`. The pass-through system still operates, but without the base preset's token foundation. Warning states on form fields (amber border, adjusted placeholder color) may render without correct styling. There is no runtime error.

## Verification Checklist

After completing the registration sequence, verify the following:

- A list view loads data and renders rows with correct styling.
- Submitting a form displays a success toast notification.
- A form with invalid data displays inline validation errors and a warning toast.
- Hovering over a field with help text shows a tooltip.
- A destructive action (e.g., delete) shows a confirmation dialog before proceeding.
- Form fields with validation warnings display an amber border (confirming `setPrimeVuePreset` is active).

## Troubleshooting

**`TypeError: Cannot read properties of undefined (reading 'add')` on form submit.** `ToastService` is not registered. Add `app.use(ToastService)` before mounting.

**Components render as unstyled HTML.** PrimeVue is not registered, or the preset is missing. Verify `app.use(PrimeVue, { theme: { preset: Aura } })` is present. Check the browser console for missing CSS custom property warnings.

**Lists load but show no data.** CRUDL adapters are not registered. Verify that `setupDefaultListCrud()` and `setupDefaultObjectCrud()` are called before app creation. Check the network tab; if no HTTP requests are made for list data, the adapter layer has no implementation.

**Tooltips do not appear on hover.** The Tooltip directive is not registered. Add `app.directive("tooltip", Tooltip)`. This has no runtime error, so it is easy to miss.

**Warning field styling is missing.** `setPrimeVuePreset` was not called, or was called with a different preset than PrimeVue. Verify the same preset object is passed to both `app.use(PrimeVue, { theme: { preset } })` and `setPrimeVuePreset(preset)`.

**Confirmation dialog does not appear for delete actions.** `ConfirmationService` is not registered. Add `app.use(ConfirmationService)`. Also verify that the action's configuration includes a `confirmMessage` prop.

## Relevant Implementation Surface

- JavaScript:
    - {@api js:function:@arrai-innovations/vueda.theme/register.setPrimeVuePreset}
    - {@api js:function:@arrai-innovations/vueda.theme/register.getPrimeVuePreset}
    - {@api js:function:@arrai-innovations/vueda.utils/listCrud.setupDefaultListCrud}
    - {@api js:function:@arrai-innovations/vueda.utils/objectCrud.setupDefaultObjectCrud}
    - {@api js:function:@arrai-innovations/vueda.use/useWarningClass.useWarningClass}
    - {@api js:module:@arrai-innovations/vueda.use/useWarningClass}
- Vue.js Components:
    - {@api vue:component:ActionForm}
    - {@api vue:component:AuthorizingForm}
    - {@api vue:component:AuthForm}
