<script setup>
import { DEMO_LATENCY_MS } from "../fixtures/authUser.js";
import { mergeTheme } from "@vueda/use/useTheme.js";
import { createPinia } from "pinia";
import { createApp, h, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

// AuthorizingForm's root uses min-h-svh so a real sign-in page fills the browser viewport and
// centers vertically (see AuthorizingForm.theme.js). Here it mounts inline in a scrolling docs
// page instead, where "the viewport" is the whole doc, not the card, so min-h-svh reserves a full
// screen height of blank space around a much shorter card. min-h-svh and a replacement like
// min-h-full both set the CSS min-height property but are different utility classes, and
// combineClasses has no tailwind-merge, so adding a replacement class would just add a second
// competing utility rather than override the first (see
// client/lib/theme/vueda-tailwind/README.md § 9.1). Cancel the exact token instead: combineClasses
// treats a class object's `false` entries as a clobber on that literal key, which reliably removes
// min-h-svh without depending on which utility rule happens to compile later.
const AUTH_DEMO_THEME_OVERRIDE = { AuthorizingForm: { root: { class: { "min-h-svh": false } } } };

/**
 * Docs-only harness that previews a real auth view (ViewSignIn, ViewTwoFactorAuth,
 * ViewChangePassword, ...) against offline, per-demo store state.
 *
 * Each instance mounts the view in its OWN Vue sub-app with a fresh pinia and an
 * in-memory vue-router, so the singleton `storeUser` and the router never leak
 * across demos on the same page (a signed-out SignIn and a signed-in ChangePassword
 * can coexist). The vueda theme and icon registries are module-level singletons, so
 * the sub-app inherits the same look as the rest of the docs without re-registration.
 *
 * The view, theme, and store class are the real implementation; only the store
 * actions the view calls are replaced (via `mocks`) with canned offline behavior,
 * because the real actions hit the network and never resolve in the docs build.
 *
 * vue-router, storeUser, and the view are loaded with dynamic import() inside
 * onMounted so none of them (nor their vue-router / vue-sonner chains) enter the
 * static SSR graph; the harness contributes only an empty <div> to server-rendered
 * output. The `view` prop is therefore a loader, e.g.
 * `() => import("@vueda/views/ViewSignIn.vue")`.
 */
const props = defineProps({
    /** Loader for the auth view, e.g. `() => import("@vueda/views/ViewSignIn.vue")`. */
    view: { type: Function, required: true },
    /** Props passed to the view as the sub-app root props. */
    viewProps: { type: Object, default: () => ({}) },
    /** storeUser state preset patched onto the isolated store before mount. */
    state: { type: Object, default: () => ({}) },
    /**
     * Per-action offline behavior, keyed by storeUser action name. Each value is
     * `(payload, store) => result`; throw to reject. The harness wraps each in the
     * standard loading and error toggling so the view sees a realistic lifecycle.
     */
    mocks: { type: Object, default: () => ({}) },
    /**
     * Optional `(pinia) => void` hook run against this demo's isolated pinia before
     * the view mounts. Each instance builds its own pinia, so metadata seeded into
     * the docs app's store at start-up (see `fixtures/showcaseCustomer.js`) is not
     * visible here. Views that resolve model config, such as `ViewSetupDevice`
     * reading its method choices from `useModelConfig`, need their fixture seeded
     * through this hook instead.
     */
    seed: { type: Function, default: undefined },
    /** Initial in-memory route name (one of the stubbed auth routes). */
    routeName: { type: String, default: "sign-in" },
    /** Initial in-memory route query. */
    routeQuery: { type: Object, default: () => ({}) },
    /**
     * Mount vueda's Sonner so the auth flows' toasts (success, validation warning,
     * action error) render. vue-sonner's toast store is a global singleton, so a single
     * mounted Sonner shows every demo's toasts as one corner overlay (as in a real app).
     * Enable on exactly one demo per page to avoid duplicate toasters.
     */
    toasts: { type: Boolean, default: false },
});

// Stub routes covering every name the auth flows push to, so router.push() in the
// views resolves instead of warning. The sub-app root is the view itself (not a
// RouterView), so navigating never unmounts the demo; only route and query move.
const NOOP = { render: () => null };
const ROUTE_NAMES = ["welcome", "sign-in", "2fa", "reauthenticate", "setup-device"];

const mountPoint = ref(null);
const subApp = shallowRef(null);

// Wrap a mock with the loading/error toggling the real storeUser actions perform,
// so the view's submit lifecycle (spinners, disabled states) behaves believably.
const makeWrapped = (store, fn) => async (payload) => {
    store.loading = true;
    store.error = null;
    store.errored = false;
    try {
        if (DEMO_LATENCY_MS) {
            await new Promise((resolve) => setTimeout(resolve, DEMO_LATENCY_MS));
        }
        return await fn(payload, store);
    } catch (error) {
        store.error = error;
        store.errored = true;
        throw error;
    } finally {
        store.loading = false;
    }
};

onMounted(async () => {
    // Defer the SSR-hostile chain (vue-router, storeUser, the view) to the client.
    const [{ createMemoryHistory, createRouter }, { storeUser }, viewModule] = await Promise.all([
        import("vue-router"),
        import("@vueda/stores/storeUser.js"),
        props.view(),
    ]);
    // Optional toast host (client-only like the rest, kept out of the SSR graph).
    const SonnerComponent = props.toasts ? (await import("@vueda/feedback/toast/Sonner.vue")).default : null;
    // Bail if the host component unmounted while the dynamic imports were in flight.
    if (!mountPoint.value) {
        return;
    }
    const ViewComponent = viewModule?.default ?? viewModule;

    const routes = ROUTE_NAMES.map((name) => ({
        path: name === "welcome" ? "/" : `/${name}`,
        name,
        component: NOOP,
    }));
    routes.push({ path: "/:pathMatch(.*)*", name: "catch-all", component: NOOP });

    const pinia = createPinia();
    props.seed?.(pinia);
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push({ name: props.routeName, query: props.routeQuery });
    await router.isReady();

    // Bind the store to this demo's pinia, seed its state, and swap in offline actions.
    const store = storeUser(pinia);
    store.$patch(props.state);
    for (const [name, fn] of Object.entries(props.mocks)) {
        store[name] = makeWrapped(store, fn);
    }

    // Vue's attrs fallthrough carries themeOverride from the sub-app root all the way to
    // AuthorizingForm, since ViewSignIn (and its siblings) declare no props of their own and don't
    // set inheritAttrs: false.
    const viewProps = {
        ...props.viewProps,
        themeOverride: mergeTheme(AUTH_DEMO_THEME_OVERRIDE, props.viewProps.themeOverride),
    };
    const app = createApp({
        render: () => {
            const view = h(ViewComponent, viewProps);
            return SonnerComponent ? [view, h(SonnerComponent)] : view;
        },
    });
    app.use(pinia);
    app.use(router);
    app.mount(mountPoint.value);
    subApp.value = app;
});

onBeforeUnmount(() => {
    if (subApp.value) {
        subApp.value.unmount();
        subApp.value = null;
    }
});
</script>

<template>
    <div ref="mountPoint" data-qa="auth-demo" />
</template>
