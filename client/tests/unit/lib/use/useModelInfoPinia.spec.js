import { scopedIt } from "@tests/unit/utils.js";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import flushPromises from "flush-promises";
import { createPinia } from "pinia";
import { createApp, ref } from "vue";

/**
 * Covers which pinia `useModelInfo` reads.
 *
 * `app.use(pinia)` sets pinia's module-global active instance, so on a page hosting more than one
 * isolated Vue app the last one to boot owns it. A store resolved from inside a watcher callback
 * has no current component instance to inject from and falls back to that global, which is the
 * wrong store as soon as a second app exists. The docs site does exactly this: every `ModelDemo`
 * block boots its own app with its own seeded pinia.
 */

const TARGET = { app: "myapp", model: "mymodel" };

// Held false so the composable's immediate watcher run bails, as it does for a component that has
// not mounted yet. Whatever it defers then runs without a current component instance.
const isActive = vi.hoisted(() => ({ ref: null }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => isActive.ref }));

/**
 * Mount a throwaway app so it takes over pinia's module-global active instance.
 *
 * @returns {import('vue').App} The mounted app.
 */
function mountRivalApp() {
    const rival = createApp({ render: () => null });
    rival.use(createPinia());
    rival.mount(document.createElement("div"));
    return rival;
}

describe("lib/use/useModelInfo.js pinia binding", () => {
    beforeEach(() => {
        global.fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 501 })));
        isActive.ref = ref(false);
    });

    scopedIt("reads the pinia of the app it was created in, not whichever is globally active", async () => {
        const ownPinia = createPinia();
        storeModelInfo(ownPinia).infos[getAppModelDotName(TARGET)] = {
            ...TARGET,
            appLabel: TARGET.app,
            verboseName: "seeded",
            fields: {},
        };

        // Inactive at setup, as a component is before it mounts: the watcher's immediate run
        // returns early, so anything it defers happens without a current instance.
        let modelInfo;
        const own = createApp({
            setup() {
                modelInfo = useModelInfo(TARGET.app, TARGET.model, isActive.ref);
                return () => null;
            },
        });
        own.use(ownPinia);
        own.mount(document.createElement("div"));

        const rival = mountRivalApp();
        isActive.ref.value = true;
        await flushPromises();

        // The seeded entry is already in this app's store, so nothing should reach the network.
        expect(global.fetch).not.toHaveBeenCalled();
        expect(modelInfo.info.verboseName).toBe("seeded");
        expect(modelInfo.errored).toBe(false);

        own.unmount();
        rival.unmount();
    });
});
