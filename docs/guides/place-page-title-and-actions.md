---
title: Place the Page Title and Page Actions
type: how-to
audience: integrator
status: draft
---

# Place the Page Title and Page Actions

The page header shows two things from the active view: its **title** (the page `<h1>` and a loading indicator) and its **page actions** (buttons such as "New", "Edit", or "Delete"). Each view supplies both. Your layout decides where the header renders, and the view's actions render in the header's action zone.

This guide shows how to establish the shared context in your layout, contribute a title from a custom view, and render page actions. It also covers pinning the header and view chrome while the page scrolls, and replacing or restyling the header.

## The three roles

One composable, {@api js:function:@arrai-innovations/vueda/use/usePageTitle#usePageTitle}, serves three callers. The caller's position and argument decide its role:

| Role        | Caller           | Call                   | Responsibility                                                            |
| ----------- | ---------------- | ---------------------- | ------------------------------------------------------------------------- |
| Establisher | Your root layout | `usePageTitle()`       | Create the context above both the display and the views, so they share it |
| Display     | `PageTitle`      | `usePageTitle()`       | Read the active title and host the action zone                            |
| Contributor | A view           | `usePageTitle(getter)` | Register the current view's title and loading state                       |

The establisher and the display make the same no-argument call. The first no-argument call up the component tree creates the context, and later calls reuse it. The title display and `<RouterView>` are usually siblings, so neither can provide the context to the other. The layout that renders both must establish it.

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

The Copier client templates generate this layout, with both components inside a sticky stack (see [Pin the header and view chrome](#pin-the-header-and-view-chrome)). A generated project already has a working header. Revisit this step only when you change your layout or replace the display.

::: warning
If no component establishes the context above your views, a view's `usePageTitle(getter)` call does nothing. The getter is never read, and the header stays empty. If the title does not appear, confirm that `usePageTitle()` runs in a component that is an ancestor of both `PageTitle` and `<RouterView>`.
:::

## Contribute a title from a view

VUEDA's CRUD views and action views already contribute their title, so the default surface needs no code here. Write a contribution only when you build a custom view.

The system views ({@api vue:component:ViewNotFound}, {@api vue:component:ViewActionNotFound}, {@api vue:component:ViewLoading}) and the [auth views](build-auth-views.md) contribute no title. The header is empty on those routes.

Pass a getter that returns a {@api js:interface:@arrai-innovations/vueda/use/usePageTitle#PageTitleEntry}. The display calls the getter, so the header updates as your data resolves:

```vue
<script setup>
import { usePageTitle } from "@vueda/use/usePageTitle.js";

const props = defineProps({ report: { type: Object, default: null } });

usePageTitle(() => ({
    title: props.report ? props.report.name : "Report",
    loading: !props.report,
}));
</script>
```

Both fields are optional. Omit `loading` for a view that has nothing to load. The contribution clears itself when the view unmounts, so the header follows the active route. A route transition briefly mounts the leaving and entering views together; the most recently registered title wins.

## Render page actions

Wrap a view's action buttons in {@api vue:component:PageActions}. It teleports the buttons into the action zone that the title display hosts. The buttons appear on the title row even though you write them inside the view:

```vue
<script setup>
import Button from "@vueda/controls/button/Button.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
</script>

<template>
    <PageActions>
        <Button>New</Button>
        <Button emphasis="outline">Export</Button>
    </PageActions>
    <!-- the rest of the view body -->
</template>
```

`PageActions` renders no wrapper element of its own. When a title display has bound an action zone, the buttons render there. With no zone (a layout without `PageTitle`, or a test harness), the buttons render inline where you placed `PageActions`.

## Pin the header and view chrome

A sticky stack keeps the header and a view's toolbars pinned while the window scrolls. {@api js:function:@arrai-innovations/vueda/use/useStickyStack#useStickyStack} works like `usePageTitle`: a layout component establishes the context, and views contribute bars to it. [Sticky Chrome](../reference/components/sticky-chrome.md) describes the zones, the bar order, and the reveal strategies.

1. Wrap the routed content in {@api vue:component:StickyStackProvider} and put `PageTitle` in its [`top`]{@api vue:component:StickyStackProvider:slot:top} slot. Keep the `usePageTitle()` call in the same layout:

    ```vue
    <!-- TheApp.vue -->
    <template>
        <StickyStackProvider>
            <template #top>
                <PageTitle />
            </template>

            <RouterView />

            <!-- Optional: pinned bottom chrome that the layout owns goes in #bottom. -->
        </StickyStackProvider>
    </template>
    ```

    `PageTitle` becomes the first bar of the top stack and stays visible. Leave its [`sticky`]{@api vue:component:PageTitle:prop:sticky} prop off here, because the provider pins it.

2. In a custom view, wrap each piece of chrome that should stay on screen in {@api vue:component:StickyChrome}. Set its `zone` (`top` or `bottom`), an `order` within the zone, and a `reveal` strategy:

    ```vue
    <template>
        <StickyChrome zone="top" :order="10" reveal="scroll-up">
            <ReportFilters />
        </StickyChrome>
        <!-- the rest of the view body -->
        <StickyChrome zone="bottom" reveal="always">
            <ReportTotals />
        </StickyChrome>
    </template>
    ```

    `ReportFilters` and `ReportTotals` stand for your own components. A {@api vue:component:StickyBar} with its `zone` prop set joins the stack the same way. With no provider above it, `StickyChrome` renders its content inline where it sits.

3. Remove any `overflow` value other than `visible` from the elements between the provider and the page. The window is the scroll container, so an ancestor with `overflow` set to `auto`, `scroll`, `hidden`, or `clip` captures the sticky bars. In development, the provider logs a console warning that names the ancestor. {@api vue:component:SidebarProvider} and {@api vue:component:SidebarInset} set no `overflow`.

4. Keep your own chrome out of the sticky stack's z-index band. To pin a custom toolbar, put it in the stack with `StickyChrome`, so the provider orders it. [Reserved z-index bands](../core-concepts/theming-and-customization.md#reserved-z-index-bands) lists the bands.

A layout without a provider can still pin the header: set `sticky` on `PageTitle`.

## Build a custom title display

To render the header yourself (a different layout, extra chrome, your own markup), call `usePageTitle()` with no argument. It returns the same {@api js:interface:@arrai-innovations/vueda/use/usePageTitle#PageTitleContext} that `PageTitle` reads.

Read the active title and loading state from [`current`]{@api js:property:@arrai-innovations/vueda/use/usePageTitle#PageTitleContext.current}. Pass the element that should host page actions to [`bindActionZone`]{@api js:property:@arrai-innovations/vueda/use/usePageTitle#PageTitleContext.bindActionZone}.

An empty `title` means the active view has registered but has not resolved its title yet. For example, a detail view's title stays empty until the model's verbose name is known. Render a placeholder in that case. `current` is an empty object only when no view has registered, so check for the `title` key to tell the two cases apart. The built-in `PageTitle` shows a skeleton, which stays until a title arrives:

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

Place your display where `PageTitle` would go: above `<RouterView>` under the layout that establishes the context, or in the provider's `top` slot. Every display reads the one context that the layout established. You can keep `PageTitle`, replace it, or use each in a different layout.

::: tip
To start closer to the default look, copy the source of `PageTitle` (`@vueda/shell/page-title/PageTitle.vue`) and edit it.
:::

## Restyle the default display

To keep the default `PageTitle` and change its look, use its theme entry, {@api theme-key:PageTitle}, which lists the slots. To change one instance, pass a {@term Theme Override} through its `themeOverride` prop ([Override one instance](customize-vueda-appearance.md#override-one-instance)). To change every instance, call {@api js:function:@arrai-innovations/vueda/use/themeRegistry#patchTheme} at app startup ([Restyle one component system-wide](customize-vueda-appearance.md#restyle-one-component-system-wide)).

To change the heading text itself, fill the [`title`]{@api vue:component:PageTitle:slot:title} slot. Its content renders inside the `<h1>`, and the skeleton does not show while the slot is filled.

## Common pitfalls

**Forgetting to establish the context.** A title contributed by a view goes nowhere unless a no-argument `usePageTitle()` call runs above it. Establish it in your root layout. Do not establish it inside a view.

**Establishing the context below the display.** The display must be a descendant of the component that calls `usePageTitle()`. Suppose a nested layout that wraps only `<RouterView>` makes the call. `PageTitle` then creates a second, empty context, and the views register into the nested one.

**Passing an object to `usePageTitle`.** The argument must be a function. `usePageTitle({ title: "..." })` registers the object, and the display throws a `TypeError` when it calls the object.

**Omitting the action zone in a custom display.** `PageActions` teleports only after a display calls `bindActionZone`. Without that call, the buttons render inline inside each view.
