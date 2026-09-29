---
title: Client Plugin Prerequisites
status: draft
audience: integrator
type: how-to
---

# Client Plugin Prerequisites

This guide sets up the client files that VUEDA's built-in views, components, and stores need. It covers the dependencies, the Vite config, the stylesheet, the theme, the icons, the {@term CRUD} adapters, and the toaster. The copier templates generate all of these files. Use this guide to set up a client without a template, or to learn what each generated call does.

The guide assumes that you know how to create a Vue 3 application with Pinia and Vue Router. [Start Building](../tutorials/start-building.md) walks through a generated project.

## Install the Dependencies

Install `@arrai-innovations/vueda` and its peer dependencies:

- `@arrai-innovations/reactive-helpers`
- `@arrai-innovations/vue-sonner`, VUEDA's maintained fork of `vue-sonner`, which shows toasts
- `@sentry/vue`
- `@vueuse/core`
- `lodash-es`
- `luxon`
- `pinia`
- `vue`
- `vue-draggable-next`
- `vue-router`

The three Font Awesome packages are optional peers: `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, and `@fortawesome/vue-fontawesome`. Install them to use the Font Awesome icons in [Register the Icons](#register-the-icons). The version ranges are in the `peerDependencies` field of VUEDA's `package.json`.

The built-in `vueda-tailwind` theme needs `tailwindcss` and `@tailwindcss/vite` as dev dependencies, next to `vite` and `@vitejs/plugin-vue`.

## Configure Vite

Add the Tailwind plugin, and spread the result of {@api js:function:@arrai-innovations/vueda/vite#vuedaViteConfig} into `vite.config.js`:

```javascript
import { vuedaViteConfig } from "@arrai-innovations/vueda/lib/vite.js";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    ...vuedaViteConfig({
        extraAliases: {
            "@": path.resolve(__dirname, "src"),
        },
    }),
});
```

`vuedaViteConfig` defines the `@vueda` alias, which points at VUEDA's `lib` directory. Every VUEDA import on this page uses that alias. The function also makes VUEDA and its peer dependencies resolve to one copy each.

The `@` alias in [`extraAliases`]{@api js:param:@arrai-innovations/vueda/vite#vuedaViteConfig:options.extraAliases} points at your `src` directory. {@api vue:component:ViewActionRouter} uses it to find the project views in `src/views` that follow its naming convention. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order) describes that convention. Without the alias, the built-in views and the generic action views still work.

When VUEDA is linked from a local checkout, `vuedaViteConfig` returns a `server.fs.allow` list. If your config declares its own `server` block, combine the two configs with Vite's `mergeConfig`. A `server` key that follows the spread result replaces the whole `server` object, including that list.

## Import the Stylesheet

Import Tailwind and the theme's `base.css` in your application stylesheet. Load that stylesheet from `index.html` or `main.js`:

```css
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";
```

`base.css` defines the {@term Theme Token} values that the theme classes read. It also tells Tailwind to scan VUEDA's `lib` directory, so Tailwind generates the classes that the theme uses. [Customize VUEDA Appearance](customize-vueda-appearance.md#re-skin-via-tokens) describes how to override the tokens.

`base.css` names the fonts IBM Plex Sans and JetBrains Mono, but it does not load them. Load those families, or point the font tokens at fonts that your application already loads. [Load or replace the fonts](customize-vueda-appearance.md#load-or-replace-the-fonts) gives both options.

## Write `main.js`

The following `main.js` registers the theme, the icons, and the CRUD adapters before it creates the app:

```javascript
import TheApp from "./TheApp.vue";
import { getRouter } from "./router/index.js";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { installFontAwesomeFreeIcons } from "@vueda/theme/vueda-tailwind/icons/fontAwesomeFree.js";
import "@vueda/theme/vueda-tailwind/index.js";
import { setupDefaultListCrud } from "@vueda/utils/listCrud.js";
import { setupDefaultObjectCrud } from "@vueda/utils/objectCrud.js";
import { createPinia } from "pinia";
import { createApp } from "vue";

faConfig.autoAddCss = false;
installFontAwesomeFreeIcons();

setupDefaultListCrud();
setupDefaultObjectCrud();

const app = createApp(TheApp);
const pinia = createPinia();
const router = getRouter(app, pinia);

app.use(pinia);
app.use(router);
app.mount("#the-app");
```

`getRouter` is your application's router factory. The templates generate one in `src/router/index.js`. `#the-app` is the mount element in `index.html`.

### Register the Theme

The import of `@vueda/theme/vueda-tailwind/index.js` registers the default classes of every built-in component in the {@term Theme Registry}. No function call is needed. [How the theme is registered](../core-concepts/theming-and-customization.md#how-the-theme-is-registered) describes the per-family and per-component alternatives, and when to apply project patches.

### Register the Icons

The {@term Icon Registry} starts empty. A component renders no icon for a name that has no entry, so fill the registry before the app mounts.

{@api js:function:@arrai-innovations/vueda/theme/vueda-tailwind/icons/fontAwesomeFree#installFontAwesomeFreeIcons} passes a Font Awesome Free registry to {@api js:function:@arrai-innovations/vueda/use/useIcons#setIcons}. That registry covers the icon names that the default components use. The example imports the Font Awesome stylesheet and turns off `autoAddCss`, so that Font Awesome does not insert the same styles again at runtime.

To use another icon library, call `setIcons` with your own registry. The generated templates call `setIcons` with a list of Font Awesome entries.

### Register the CRUD Adapters

{@api js:function:@arrai-innovations/vueda/utils/listCrud#setupDefaultListCrud} and {@api js:function:@arrai-innovations/vueda/utils/objectCrud#setupDefaultObjectCrud} register VUEDA's REST [CRUD adapters]{@term CRUD Adapter}. Built-in list views, detail views, and forms send every data request through them.

Call both before the app creates any list or object instance, because each instance copies the adapters when it is created. Without them, every data request rejects with `Crud method "<name>" is not implemented.` [CRUD Adapter Layer](../core-concepts/crud-adapter-layer.md) describes the adapter slots and how to replace one.

## Toast Notifications

Mount the {@api vue:component:Sonner} toaster once in your root component:

```vue
<script setup>
import Sonner from "@vueda/feedback/toast/Sonner.vue";
</script>

<template>
    <RouterView />
    <Sonner />
</template>
```

Built-in forms, route guards, and auth views report results through toasts. When no toaster is mounted, the user sees none of those messages, and no error is raised. [Build Auth Views](build-auth-views.md) lists the messages that the auth views show.

To show your own toasts, import `toast` from `@arrai-innovations/vue-sonner`. Your code and the toaster then share one module:

```javascript
import { toast } from "@arrai-innovations/vue-sonner";

toast.success("Saved successfully");
```

## Components With No Setup

Controls, widgets, tooltips, and confirmation dialogs need no plugin or directive. Forms render their own {@api vue:component:FormConfirmDialog}. Tooltips need a {@api vue:component:TooltipProvider} above them, and {@api vue:component:SidebarProvider} provides one for the built-in shell. Wrap components that you render outside that shell in a `TooltipProvider`.

## Check the Setup

After the app starts:

- A list view loads rows, and its controls are styled.
- A checked checkbox shows its check mark icon.
- Saving a form shows a success toast.

## Troubleshooting

**Components render as unstyled HTML.** The class names are registered, but no CSS was generated for them. Check that the application loads its stylesheet, and that the stylesheet imports Tailwind and `base.css`. Check that `vite.config.js` registers the Tailwind plugin. If elements lack their slot classes, a later `setTheme` call may have replaced the registry with an incomplete theme.

**Components show no icons.** The icon registry has no entry for those names. Call `installFontAwesomeFreeIcons()` or `setIcons` in `main.js`, and check that your registry covers the names that the components use.

**Text renders in a system font.** The page loads no font with the family name in {@api css-token:vueda-font-sans} or {@api css-token:vueda-font-mono}, so the browser uses a fallback. Load the default fonts or override the font tokens.

**Lists and forms load no data.** Each data request fails with `Crud method "<name>" is not implemented.` Call `setupDefaultListCrud()` and `setupDefaultObjectCrud()` in `main.js` before `createApp`.

**Toasts do not appear.** The root component does not mount `<Sonner />`, or your code imports `toast` from upstream `vue-sonner`. Mount the toaster, and import `toast` from `@arrai-innovations/vue-sonner`.

**A project view in `src/views` is not used.** Vite has no `@` alias for your `src` directory. Add it to `extraAliases` in `vite.config.js`.
