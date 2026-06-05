import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { defineComponent, h, ref } from "vue";

describe("lib/use/usePageTitle.js", () => {
    describe("display role (no source)", () => {
        scopedIt("establishes a context with empty state and the expected surface", async () => {
            const context = await withSetup(() => usePageTitle());
            expect(context.current.value).toEqual({});
            expect(context.actionTarget.value).toBeNull();
            expect(typeof context.register).toBe("function");
            expect(typeof context.bindActionZone).toBe("function");
        });

        scopedIt("reflects the most recently registered source and restores prior entries on cleanup", async () => {
            const context = await withSetup(() => usePageTitle());
            const title = ref("A");

            const cleanupA = context.register(() => ({ title: title.value, loading: false }));
            expect(context.current.value).toEqual({ title: "A", loading: false });

            const cleanupB = context.register(() => ({ title: "B", loading: true }));
            expect(context.current.value).toEqual({ title: "B", loading: true });

            cleanupB();
            expect(context.current.value).toEqual({ title: "A", loading: false });

            // current tracks the live source, not a snapshot taken at registration time
            title.value = "A2";
            expect(context.current.value).toEqual({ title: "A2", loading: false });

            cleanupA();
            expect(context.current.value).toEqual({});
        });

        scopedIt("treats a second cleanup call as a no-op", async () => {
            const context = await withSetup(() => usePageTitle());
            const cleanup = context.register(() => ({ title: "Solo" }));
            const other = context.register(() => ({ title: "Other" }));

            cleanup();
            expect(context.current.value).toEqual({ title: "Other" });
            // a stale cleanup must not pop an unrelated entry
            cleanup();
            expect(context.current.value).toEqual({ title: "Other" });
            other();
        });

        scopedIt("resolves the bound action zone to its element, following the ref", async () => {
            const context = await withSetup(() => usePageTitle());
            const element = document.createElement("div");
            const zone = ref(element);

            context.bindActionZone(zone);
            expect(context.actionTarget.value).toBe(element);

            zone.value = null;
            expect(context.actionTarget.value).toBeNull();
        });
    });

    describe("view role (source arg)", () => {
        scopedIt("contributes its title to an ancestor display and clears it on unmount", async () => {
            let displayContext;
            const View = defineComponent({
                props: { title: { type: String, default: undefined } },
                setup(props) {
                    usePageTitle(() => ({ title: props.title, loading: false }));
                    return () => h("div");
                },
            });
            const Display = defineComponent({
                setup() {
                    displayContext = usePageTitle();
                    return () => h(View, { title: "Suppliers" });
                },
            });

            const wrapper = mount(Display);
            expect(displayContext.current.value).toEqual({ title: "Suppliers", loading: false });

            wrapper.unmount();
            expect(displayContext.current.value).toEqual({});
        });

        scopedIt("no-ops and returns undefined when no display context exists above", async () => {
            const result = await withSetup(() => usePageTitle(() => ({ title: "Orphan" })));
            expect(result).toBeUndefined();
        });
    });
});
