---
title: Place the Page Title and Page Actions
type: how-to
audience: integrator
status: draft
---

# Place the Page Title and Page Actions

VUEDA splits the page header into two concerns. The **title** (the page `<h1>` text and a loading indicator) is page identity: each view declares its own, and the value flows up to one display component your layout places wherever you want the header to appear. **Page actions** (the buttons for a view, such as "New", "Edit", or "Delete") are view behavior: each view authors them, but they render into an action zone the title display owns, so the header reads as one composed bar.

This guide shows how to wire that up: establish the shared context in your layout, place or replace the title display, contribute a title from a custom view, and render page actions into the zone (or let them fall back inline).

## The three roles

One composable, {@api js:function:@arrai-innovations/vueda/use/usePageTitle#usePageTitle}, serves three callers. Which role you get depends on where you call it and whether you pass an argument:

| Role        | Caller           | Call                   | Responsibility                                                             |
| ----------- | ---------------- | ---------------------- | -------------------------------------------------------------------------- |
| Establisher | Your root layout | `usePageTitle()`       | Create the context above both the display and the views, so they share it. |
| Display     | `PageTitle`      | `usePageTitle()`       | Read the active title and host the action zone.                            |
| Contributor | A view           | `usePageTitle(getter)` | Register the current view's title and loading state.                       |

The establisher and the display make the same no-argument call. The difference is position: the first no-argument call up the component tree creates the context; later no-argument calls reuse it. This matters because the title display and `<RouterView>` are usually siblings, so neither can provide the context to the other. The layout that renders both must establish it.

## Establish the context in your layout

Call `usePageTitle()` once in your root layout's `<script setup>`, then render {@api vue:component:PageTitle} above `<RouterView>`:

```vue
<!-- TheApp.vue -->
<script setup>
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import { usePageTitle } from "@vueda/use/usePageTitle.js";

// Establish the context above both the title display and the routed views,
// so each view can contribute its title and page actions.
usePageTitle();
</script>

<template>
    <PageTitle />
    <RouterView />
</template>
```

The Copier client templates do this by default, so a freshly generated project already has a working header. You only need to revisit it if you change your layout or replace the display.

::: warning
If no caller establishes the context above your views, contributing a title is a silent no-op: views call `usePageTitle(getter)`, the getter is never read, and the header stays empty. If the title does not appear, confirm that `usePageTitle()` runs in a component that is an ancestor of both `PageTitle` and `<RouterView>`.
:::

## Contribute a title from a view

VUEDA's built-in views (`ViewList`, `ViewRead`, `ViewCreate`, `ViewUpdate`, and the rest) already contribute their title, so the recipes above are all you need for the default surface. Write this only when you build a custom view.

Pass a getter that returns the current title and loading state. Returning a getter (not a plain object) keeps the value reactive, so the header updates as your data resolves:

```vue
<script setup>
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { computed } from "vue";

const props = defineProps({ report: { type: Object, default: null } });

usePageTitle(() => ({
    title: props.report ? props.report.name : "Report",
    loading: !props.report,
}));
</script>
```

Both fields are optional. Omit `loading` for a view that has nothing to load. The contribution clears itself when the view unmounts, so the header tracks the active route automatically. While a route transition briefly mounts both the leaving and entering views, the most recently registered title wins.

## Render page actions

Wrap a view's action buttons in {@api vue:component:PageActions}. It teleports the buttons into the action zone the title display owns, so they appear on the title row even though you author them inside the view:

```vue
<script setup>
import Button from "@vueda/controls/button/Button.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
</script>

<template>
    <PageActions>
        <Button>New</Button>
        <Button variant="outline">Export</Button>
    </PageActions>
    <!-- the rest of the view body -->
</template>
```

`PageActions` has no inline wrapper of its own. When a title display has bound an action zone, the buttons render there. When no zone exists (a view rendered outside a layout that places `PageTitle`, or a test harness), the buttons render inline where you placed `PageActions` instead, so the view still works on its own.

## Build a custom title display

To render the header yourself (a different layout, extra chrome, your own markup) call `usePageTitle()` with no argument to read the same context, then expose an action zone for `PageActions` to teleport into.

Read the active title and loading state from `current`, and bind the element that should host page actions with `bindActionZone`.

An empty `title` means the active view has registered but has not resolved its title yet. For example, a detail view emits an empty title until the model's verbose name is known. Render a placeholder in that case rather than an empty heading. `current` is an empty object only when no view has registered, so check for the `title` key to tell the two cases apart. The built-in `PageTitle` shows a skeleton, and the skeleton stays if the title never arrives:

```vue
<script setup>
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { computed, ref } from "vue";

const page = usePageTitle();
const title = computed(() => page.current.value.title);
const loading = computed(() => page.current.value.loading);
// A view is registered but its title is not known yet.
const titlePending = computed(() => "title" in page.current.value && !title.value);

// The element page actions teleport into. Bind the ref so it resolves once mounted.
const actionZone = ref(null);
page.bindActionZone(actionZone);
</script>

<template>
    <header>
        <div v-if="titlePending" class="title-placeholder" aria-hidden="true" />
        <h1 v-else>{{ title }}<span v-if="loading"> (loading)</span></h1>
        <!-- PageActions teleports view buttons here. -->
        <div ref="actionZone" />
    </header>
</template>
```

Place your custom display in the same position as `PageTitle` (above `<RouterView>`, under the layout that establishes the context). You can keep using VUEDA's `PageTitle`, replace it with your own, or render both in different layouts; they all read the one context the layout established.

::: tip
The built-in `PageTitle` is the worked reference for this composable. If you want a starting point closer to the default look, copy its source (`@vueda/shell/page-title/PageTitle.vue`) and edit from there rather than starting blank.
:::

## Restyle the default display

If you want the default `PageTitle` markup but different styling, you do not need a custom display. `PageTitle` registers theme entries you can override through the normal theming mechanisms (`themeOverride` for one instance, `patchTheme` for every instance). The relevant slots are `root` (the header bar), `title` (the `<h1>`), `titleSkeleton` (the placeholder shown while the title is empty), `buttons` (the action zone), and `gradient` (the sticky-mode cap). See {@api theme-key:PageTitle} for the full list and [Customize VUEDA Appearance](customize-vueda-appearance) for the override recipes.

## Common pitfalls

**Forgetting to establish the context.** A title contributed by a view goes nowhere unless a no-argument `usePageTitle()` call runs above it. Establish it in your root layout, not inside a view.

**Placing `PageTitle` where it cannot see the context.** The display must be a descendant of the component that called `usePageTitle()`. If you establish the context in `TheApp.vue` but render `PageTitle` in a sibling tree, it establishes a second, empty context instead of reusing the first.

**Returning a plain object instead of a getter.** `usePageTitle(getter)` expects a function. Passing `usePageTitle({ title: "..." })` registers a non-reactive value that never updates as your data loads.

**Expecting page actions to appear without a zone.** `PageActions` only teleports when a display has bound an action zone. If your custom display omits `bindActionZone`, the buttons fall back to rendering inline inside each view.
