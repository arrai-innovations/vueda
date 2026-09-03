---
title: Client Plugin Prerequisites
status: draft
audience: integrator
type: how-to
---

# Client Plugin Prerequisites

This guide covers the Vue plugins, directives, and VUEDA-specific setup functions that must be registered before mounting a VUEDA client application. It explains what each dependency provides, which built-in components rely on it, and what fails when it is missing. The registration sequence depends on `setTheme` to provide component styling classes and on {@api js:function:@arrai-innovations/vueda/utils/listCrud#setupDefaultListCrud} and {@api js:function:@arrai-innovations/vueda/utils/objectCrud#setupDefaultObjectCrud} to activate the shared {@term CRUDL} data path used by built-in views.

The guide assumes familiarity with Vue 3 application setup (`createApp`, `app.use`). For the tutorial-style walkthrough that shows the full `main.js` in context, see [Start Building](../tutorials/start-building). For theme customization beyond the base tokens, see [Customize VUEDA Appearance](customize-vueda-appearance).

## Goal and Preconditions

The objective is a `main.js` that registers all required plugins and setup functions so that VUEDA's built-in views, components, and stores function correctly.

Before you begin:

The project must install `@arrai-innovations/vue-sonner`, our maintained fork of `vue-sonner`. It is a peer dependency of `@arrai-innovations/vueda` and backs the toast surface. VUEDA's control and widget components are first-party (built on Reka UI, which VUEDA bundles), so there is no third-party component-library peer dependency to install. Pinia and Vue Router must also be installed; they are assumed throughout but are not VUEDA-specific.

If you are using the built-in `vueda-tailwind` theme (recommended), you also need `tailwindcss` and `@tailwindcss/vite` installed as dev dependencies, and the Vite plugin registered in `vite.config.js`. Tailwindcss is a build tool, not a runtime peer dependency of VUEDA.

## Registration Order

Plugin registration follows a specific order. Some steps have dependencies on earlier steps; others are order-independent but grouped by concern for clarity.

```javascript
import TheApp from "./TheApp.vue";
import { getRouter } from "./router/index.js";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setTheme } from "@vueda/use/useTheme.js";
import { setupDefaultListCrud } from "@vueda/utils/listCrud.js";
import { setupDefaultObjectCrud } from "@vueda/utils/objectCrud.js";
import { createPinia } from "pinia";
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

// 3. Mount
app.mount("#the-app");
```

VUEDA's controls, widgets, tooltips, and confirmation dialogs are first-party components, so there are no third-party UI plugins, services, or directives to register here. The toast surface is mounted as a component in your root template rather than registered as a plugin; see [Toast Notifications](#toast-notifications) below.

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

## Controls and Widgets

VUEDA's controls and widgets (`Button`, `WidgetSelect`, `WidgetDatePicker`, `WidgetInput`, `WidgetMultiSelect`, `WidgetCheckbox`, `WidgetRadio`, `WidgetSlider`, and others) are first-party components built on Reka UI, which VUEDA bundles. There is no third-party component-library plugin to register: once `setTheme` has run, these components resolve their classes from the registered theme and render styled output. The remaining setup steps cover the toaster surface, which is mounted as a component rather than registered as a plugin.

## Toast Notifications

Toast notifications are backed by `@arrai-innovations/vue-sonner`. Import `toast` from that package name, not from upstream `vue-sonner`, so your application code and VUEDA's toaster share the same module instance. No plugin registration is needed; `toast` is a plain module import that works anywhere (components, composables, stores, route guards).

**Setup:** Mount the `Sonner` toaster once in your root component (e.g. `TheApp.vue`):

```vue
<script setup>
import Sonner from "@vueda/feedback/toast/Sonner.vue";
</script>

<template>
    <RouterView />
    <Sonner />
</template>
```

**Usage:**

```javascript
import { toast } from "@arrai-innovations/vue-sonner";

toast.success("Saved successfully");
toast.error("Something went wrong", { description: "Details here", duration: 15000 });
toast.warning("Please check your input");
toast.info("No changes detected");
```

**What depends on it:** `ActionForm` displays success, error, and warning toasts after form submissions, including for `ViewExecuteTransition`'s workflow-transition submissions, which run through the same `ActionForm` shell. `AuthorizingForm` shows a redirect confirmation toast. `useObjectForm` default handlers show toasts for "No Changes Detected", "Pre-save Validation Failed", and "Save Validation Failed" scenarios. `ClickToCopyText` and the MFA setup views also use toast notifications.

**What fails without it:** If the `Sonner` toaster is not mounted, `toast(...)` calls silently do nothing (no error is thrown, but no notification appears).

## Confirmation Dialogs

Confirmation is built into VUEDA's forms; there is no global service to register. Forms that can prompt for confirmation (for example, `ActionForm` and the object-form flows) render their own `FormConfirmDialog` and drive it through the per-form controller returned by `useConfirmationController`. When a submission returns warnings that require confirmation, the form opens its dialog and resolves once the user responds.

**What depends on it:** `ActionForm` and the destroy and update flows prompt for confirmation when an action is configured to require it or when the server returns confirm-then-save warnings (HTTP 409).

**What fails without it:** Nothing to register, so nothing fails at setup time. If you build a fully custom submit surface that bypasses the built-in dialog, the controller fails closed: it logs a console warning and treats the submission as cancelled rather than leaving it pending. Render `<FormConfirmDialog :controller="..." />` (or register a custom consumer via `confirmation.register()`) so the submission can be confirmed.

## Tooltips

Tooltips are first-party components built on Reka UI, not a registered directive. The shell layer (for example, `SidebarProvider`) wraps the relevant subtree in a `TooltipProvider`, and components render the `Tooltip` component where hover explanations are needed. There is no `v-tooltip` directive to register and nothing to install.

**What depends on it:** Field help text, icon labels, and abbreviated content render tooltips for hover explanations.

**What fails without it:** Nothing to register. Tooltips appear wherever a `TooltipProvider` is present in the component tree above them, which the built-in shell components provide.

## Verification Checklist

After completing the registration sequence, verify the following:

- A list view loads data and renders rows with correct styling.
- Submitting a form displays a success toast notification.
- A form with invalid data displays inline validation errors and a warning toast.
- Hovering over a field with help text shows a tooltip.
- A destructive action (e.g., delete) shows a confirmation dialog before proceeding.

## Troubleshooting

**Toast notifications not appearing.** The `Sonner` toaster is not mounted in the root component. Add `<Sonner />` to `TheApp.vue`.

**Components render as unstyled HTML.** `setTheme` was not called, so components resolve empty class strings. Verify `setTheme(vuedaTailwind)` is called before app creation and that Tailwind plus `@vueda/theme/vueda-tailwind/base.css` are imported in your stylesheet. Check the browser console for missing CSS custom property warnings.

**Lists load but show no data.** CRUDL adapters are not registered. Verify that `setupDefaultListCrud()` and `setupDefaultObjectCrud()` are called before app creation. Check the network tab; if no HTTP requests are made for list data, the adapter layer has no implementation.

**Tooltips do not appear on hover.** No `TooltipProvider` is present above the component in the tree. The built-in shell components provide one; if you render tooltip-bearing components outside that shell, wrap them in a `TooltipProvider`.

**Confirmation dialog does not appear for an action.** The action is not configured to require confirmation, or a fully custom submit surface bypasses the built-in `FormConfirmDialog`. Verify the action's configuration requires confirmation, and that any custom form renders `FormConfirmDialog` (or registers a consumer on the confirmation controller).

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
