<script setup>
import { DEMO_LATENCY_MS } from "../fixtures/authUser.js";
import { registerDemoRoutes } from "../fixtures/demoApi.js";
import DemoPageChrome from "./DemoPageChrome.vue";
import { bootDemoSubApp, installDefaultCrud, wrapDemoAction } from "./demoSubApp.js";
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

/**
 * Docs-only harness that previews a real model view (ViewList, ViewRead, ViewDestroy,
 * ViewAction, ViewWorkflowTransition, ViewHistoryList, ...) against offline data.
 *
 * It is the CRUDL counterpart to `AuthDemo`. Both mount the real view in an isolated
 * sub-app (see `demoSubApp.js`); they differ in where the offline seam sits. Auth views
 * call `storeUser` actions, which `AuthDemo` replaces directly. Model views read through
 * `useList` / `useObject`, whose crud handlers are wired inside the composables and
 * cannot be injected, so their seam is the `fetch` layer instead: pass the endpoints
 * this demo answers as `api` and every real adaptor between the view and the response
 * stays in play.
 *
 * Two things still have to be supplied together and kept consistent:
 *
 * - `seed` puts the model's metadata into `storeModelInfo` so `getConfig` resolves
 *   offline (no `model_info` round-trip). See `fixtures/showcaseCustomer.js`.
 * - `api` answers the data endpoints the view then calls for that model.
 *
 * The fixture builders in `fixtures/showcaseRecords.js` produce a matched pair, so a
 * page normally passes `:seed` and `:api` from the same scenario.
 */
const props = defineProps({
    /** Loader for the view, e.g. `() => import("@vueda/views/ViewList.vue")`. */
    view: { type: Function, required: true },
    /** Django app label. Forwarded to the view and used to build the initial route. */
    app: { type: String, required: true },
    /** Django model name. Forwarded to the view and used to build the initial route. */
    model: { type: String, required: true },
    /**
     * Primary key for detail views, or an array of them for an action targeting several records.
     * Omit for list-shaped views. The view receives the array as-is; the demo route, which has a
     * single `:pk` segment, receives it comma-joined.
     */
    pk: { type: [String, Number, Array], default: undefined },
    /** Route `action` param, e.g. "list", "read", "destroy". Defaults from `pk`. */
    action: { type: String, default: undefined },
    /** Extra props merged over the app / model / pk trio the harness supplies. */
    viewProps: { type: Object, default: () => ({}) },
    /**
     * Offline endpoints for this demo, as `DemoRoute[]` (see `fixtures/demoApi.js`).
     * Registration is global and ordered, so two demos needing different responses for
     * the same model must be registered under different app labels.
     */
    api: { type: Array, default: () => [] },
    /** `(pinia) => void` hook run against this demo's isolated pinia before mount. */
    seed: { type: Function, default: undefined },
    /** `storeUser` state preset patched onto the isolated store before mount. */
    state: { type: Object, default: () => ({}) },
    /**
     * Per-action offline behavior keyed by `storeUser` action name, wrapped in the
     * standard loading and error toggling. Same contract as `AuthDemo`'s `mocks`; used
     * by views that call the user store directly rather than a model endpoint.
     */
    mocks: { type: Object, default: () => ({}) },
    /**
     * Wrap the view in `DemoPageChrome`, a stand-in for the integrator's layout. Views
     * that contribute a title through `usePageTitle` or teleport buttons through
     * `PageActions` need it: without a layout above them the title is dropped and the
     * page actions render inline at the top of the view body.
     */
    pageTitle: { type: Boolean, default: false },
    /** Milliseconds every mocked response stalls, so loading states are visible. */
    latency: { type: Number, default: DEMO_LATENCY_MS },
    /**
     * Mount vueda's Sonner so the views' toasts render. vue-sonner's toast store is a
     * global singleton, so enable it on exactly one demo per page.
     */
    toasts: { type: Boolean, default: false },
});

// Route table mirroring makeCRUDRoutes (client/lib/router/makeCrud.js) so LinkModelView
// and getCRUDForTo resolve their targets, plus the auth names the views redirect to.
// The sub-app root is the view itself (not a RouterView), so navigating never unmounts
// the demo; only route and query move.
const NOOP = { render: () => null };
const ROUTES = [
    { path: "/:app/:model/:action/:pk", name: "actionrouter.detailview", component: NOOP, meta: { detail: true } },
    { path: "/:app/:model/:action/", name: "actionrouter.listview", component: NOOP },
    { path: "/", name: "welcome", component: NOOP },
    { path: "/sign-in", name: "sign-in", component: NOOP },
    { path: "/not-found", name: "not-found", component: NOOP },
    { path: "/:pathMatch(.*)*", name: "catch-all", component: NOOP },
];

const mountPoint = ref(null);
const subApp = shallowRef(null);
let unregisterApi = null;

onMounted(async () => {
    await installDefaultCrud();
    unregisterApi = registerDemoRoutes(props.api, { latency: props.latency });

    const action = props.action ?? (props.pk === undefined ? "list" : "read");
    const viewPk = Array.isArray(props.pk)
        ? props.pk.map(String)
        : props.pk === undefined
          ? undefined
          : String(props.pk);
    const routePk = Array.isArray(viewPk) ? viewPk.join(",") : viewPk;
    const app = await bootDemoSubApp({
        mountPoint: mountPoint.value,
        view: props.view,
        viewProps: {
            app: props.app,
            model: props.model,
            ...(viewPk === undefined ? {} : { pk: viewPk }),
            ...props.viewProps,
        },
        routes: ROUTES,
        initialRoute: {
            name: viewPk === undefined ? "actionrouter.listview" : "actionrouter.detailview",
            params: {
                app: props.app,
                model: props.model,
                action,
                ...(routePk === undefined ? {} : { pk: routePk }),
            },
        },
        seed: props.seed,
        chrome: props.pageTitle ? DemoPageChrome : undefined,
        setup: async ({ pinia }) => {
            if (!Object.keys(props.state).length && !Object.keys(props.mocks).length) {
                return;
            }
            const { storeUser } = await import("@vueda/stores/storeUser.js");
            const store = storeUser(pinia);
            store.$patch(props.state);
            for (const [name, fn] of Object.entries(props.mocks)) {
                store[name] = wrapDemoAction(store, fn, props.latency);
            }
        },
        toasts: props.toasts,
        // Bail if the host component unmounted while the dynamic imports were in flight.
        isStale: () => !mountPoint.value,
    });
    subApp.value = app;
});

onBeforeUnmount(() => {
    if (subApp.value) {
        subApp.value.unmount();
        subApp.value = null;
    }
    unregisterApi?.();
    unregisterApi = null;
});
</script>

<template>
    <div ref="mountPoint" data-qa="model-demo" />
</template>
