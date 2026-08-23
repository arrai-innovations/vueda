/**
 * @module .vitepress/theme/components/demoSubApp
 *
 * Shared boot sequence for the live-view demo harnesses (`AuthDemo`, `ModelDemo`).
 *
 * Each demo mounts a real vueda view in its OWN Vue sub-app with a fresh pinia and an
 * in-memory router, so pinia singletons (`storeUser`, `storeModelInfo`, ...) and the
 * router never leak across demos on the same docs page. The vueda theme and icon
 * registries are module-level singletons, so a sub-app inherits the same look as the
 * rest of the docs without re-registration.
 *
 * vue-router, the stores, and the view are all loaded with dynamic `import()` from
 * inside `onMounted` so none of them (nor their vue-router / vue-sonner chains) enter
 * the static SSR graph. A harness therefore contributes only an empty `<div>` to
 * server-rendered output, and every `view` prop is a loader, e.g.
 * `() => import("@vueda/views/ViewList.vue")`.
 */
import { createPinia } from "pinia";
import { createApp, h } from "vue";

let crudInstalled = false;

/**
 * Install vueda's default crud adaptors into reactive-helpers' module-level registry.
 *
 * `useObject` (and so every detail view) resolves retrieve / update / delete through that
 * registry, which a real vueda app fills at bootstrap. The docs site is not a vueda app
 * and never runs that bootstrap, so without this the detail views fail with
 * `Crud method "retrieve" is not implemented`. `useViewList` passes its own list handler
 * and does not depend on the registry, but registering both keeps the two paths
 * consistent. The registry is a global, so installing once per page load is enough.
 *
 * @returns {Promise<void>}
 */
export async function installDefaultCrud() {
    if (crudInstalled) {
        return;
    }
    crudInstalled = true;
    const [{ setupDefaultObjectCrud }, { setupDefaultListCrud }] = await Promise.all([
        import("@vueda/utils/objectCrud.js"),
        import("@vueda/utils/listCrud.js"),
    ]);
    setupDefaultObjectCrud();
    setupDefaultListCrud();
}

/**
 * Boot one demo sub-app: build the pinia and in-memory router, seed them, then mount
 * the view at `mountPoint`.
 *
 * @param {object} options
 * @param {HTMLElement} options.mountPoint - Element the sub-app mounts into.
 * @param {() => Promise<any>} options.view - Loader for the view component.
 * @param {object} [options.viewProps] - Props passed to the view as the sub-app root props.
 * @param {import('vue-router').RouteRecordRaw[]} options.routes - Route table for the in-memory router.
 * @param {import('vue-router').RouteLocationRaw} options.initialRoute - Route pushed before mount.
 * @param {(pinia: import('pinia').Pinia) => void} [options.seed] - Runs against the fresh pinia before mount.
 * @param {(context: { pinia: import('pinia').Pinia, router: import('vue-router').Router }) => void|Promise<void>} [options.setup] -
 *   Runs after the router is ready and the seed has applied, before mount. Use it to
 *   patch stores or swap in offline actions.
 * @param {import('vue').Component} [options.chrome] - Optional component wrapping the view
 *   inside the sub-app root, receiving it as its default slot. Use it to supply layout-level
 *   context a view expects from its host (see `DemoPageChrome.vue`).
 * @param {boolean} [options.toasts=false] - Mount vueda's `Sonner` alongside the view.
 * @param {() => boolean} [options.isStale] - Called after every await; when it returns
 *   true the boot aborts because the host component unmounted mid-import.
 * @returns {Promise<import('vue').App|null>} The mounted sub-app, or null if it was aborted.
 */
export async function bootDemoSubApp({
    mountPoint,
    view,
    viewProps = {},
    routes,
    initialRoute,
    seed,
    setup,
    chrome,
    toasts = false,
    isStale = () => false,
}) {
    // Defer the SSR-hostile chain (vue-router, the view) to the client.
    const [{ createMemoryHistory, createRouter }, viewModule] = await Promise.all([import("vue-router"), view()]);
    // Optional toast host (client-only like the rest, kept out of the SSR graph).
    const SonnerComponent = toasts ? (await import("@vueda/feedback/toast/Sonner.vue")).default : null;
    if (isStale()) {
        return null;
    }
    const ViewComponent = viewModule?.default ?? viewModule;

    const pinia = createPinia();
    seed?.(pinia);
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push(initialRoute);
    await router.isReady();
    if (isStale()) {
        return null;
    }

    await setup?.({ pinia, router });
    if (isStale()) {
        return null;
    }

    const app = createApp({
        render: () => {
            const view = h(ViewComponent, viewProps);
            const rendered = chrome ? h(chrome, null, { default: () => view }) : view;
            return SonnerComponent ? [rendered, h(SonnerComponent)] : rendered;
        },
    });
    app.use(pinia);
    app.use(router);
    app.mount(mountPoint);
    return app;
}

/**
 * Wrap an offline action with the loading and error toggling the real store actions
 * perform, so a view's submit lifecycle (spinners, disabled states) behaves believably.
 *
 * @param {object} store - The pinia store the action belongs to.
 * @param {(payload: any, store: object) => any} fn - The offline behavior; throw to reject.
 * @param {number} latency - Milliseconds to stall before running `fn`.
 * @returns {(payload: any) => Promise<any>} The wrapped action.
 */
export function wrapDemoAction(store, fn, latency) {
    return async (payload) => {
        store.loading = true;
        store.error = null;
        store.errored = false;
        try {
            if (latency) {
                await new Promise((resolve) => setTimeout(resolve, latency));
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
}
