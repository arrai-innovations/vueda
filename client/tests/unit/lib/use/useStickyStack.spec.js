import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useStickyStack } from "@vueda/use/useStickyStack.js";
import { defineComponent, h, ref } from "vue";

describe("lib/use/useStickyStack.js", () => {
    describe("provider role (no registration)", () => {
        scopedIt("establishes a context with the expected surface and empty zones", async () => {
            const context = await withSetup(() => useStickyStack());
            expect(typeof context.zoneRegistrations).toBe("function");
            expect(typeof context.register).toBe("function");
            expect(context.zoneRegistrations("top").value).toEqual([]);
            expect(context.zoneRegistrations("bottom").value).toEqual([]);
        });

        scopedIt("reuses the context an ancestor already established", () => {
            let providerContext;
            let childContext;
            const Child = defineComponent({
                setup() {
                    childContext = useStickyStack();
                    return () => h("div");
                },
            });
            const Provider = defineComponent({
                setup() {
                    providerContext = useStickyStack();
                    return () => h(Child);
                },
            });

            mount(Provider);
            expect(childContext).toBe(providerContext);
        });
    });

    describe("registration", () => {
        scopedIt("returns an entry with a stable id, the registered order/reveal, and a teleport target", async () => {
            const context = await withSetup(() => useStickyStack());
            const entry = context.register({ zone: "top", order: 5, reveal: "scroll-up" });

            expect(typeof entry.id).toBe("string");
            expect(entry.order).toBe(5);
            expect(entry.reveal).toBe("scroll-up");
            expect(entry.target.value).toBeNull();

            // The provider binds the element; the view's teleport target then resolves.
            const element = document.createElement("div");
            entry.el.value = element;
            expect(entry.target.value).toBe(element);
        });

        scopedIt("lists a zone's registrations sorted by order (ascending)", async () => {
            const context = await withSetup(() => useStickyStack());
            context.register({ zone: "top", order: 30, reveal: "scroll-up" });
            context.register({ zone: "top", order: 10, reveal: "always" });
            context.register({ zone: "top", order: 20, reveal: "scroll-up-or-idle" });

            expect(context.zoneRegistrations("top").value.map((e) => e.order)).toEqual([10, 20, 30]);
        });

        scopedIt("re-sorts when a reactive order changes", async () => {
            const context = await withSetup(() => useStickyStack());
            const orderA = ref(20);
            context.register({ zone: "top", order: () => orderA.value, reveal: "a" });
            context.register({ zone: "top", order: 10, reveal: "b" });
            expect(context.zoneRegistrations("top").value.map((e) => e.reveal)).toEqual(["b", "a"]);

            orderA.value = 5;
            expect(context.zoneRegistrations("top").value.map((e) => e.reveal)).toEqual(["a", "b"]);
        });

        scopedIt("keeps equal-order registrations in registration order", async () => {
            const context = await withSetup(() => useStickyStack());
            const a = context.register({ zone: "top", order: 0, reveal: "a" });
            const b = context.register({ zone: "top", order: 0, reveal: "b" });
            expect(context.zoneRegistrations("top").value.map((e) => e.reveal)).toEqual(["a", "b"]);
            expect([a.id, b.id]).toHaveLength(2);
            expect(a.id).not.toBe(b.id);
        });

        scopedIt("lets bars coexist (no newest-wins) and removes only its own on stop", async () => {
            const context = await withSetup(() => useStickyStack());
            const a = context.register({ zone: "top", order: 0 });
            const b = context.register({ zone: "top", order: 1 });
            expect(context.zoneRegistrations("top").value).toHaveLength(2);

            a.stop();
            expect(context.zoneRegistrations("top").value.map((e) => e.id)).toEqual([b.id]);
            // A stale stop is a no-op and must not remove b.
            a.stop();
            expect(context.zoneRegistrations("top").value.map((e) => e.id)).toEqual([b.id]);
        });

        scopedIt("keeps zones independent", async () => {
            const context = await withSetup(() => useStickyStack());
            context.register({ zone: "top", order: 0 });
            context.register({ zone: "bottom", order: 0 });
            expect(context.zoneRegistrations("top").value).toHaveLength(1);
            expect(context.zoneRegistrations("bottom").value).toHaveLength(1);
        });

        scopedIt("falls back to the top zone for an unknown zone name", async () => {
            const context = await withSetup(() => useStickyStack());
            context.register({ zone: "nope", order: 0 });
            expect(context.zoneRegistrations("top").value).toHaveLength(1);
        });
    });

    describe("view role (registration arg)", () => {
        scopedIt("registers into the provider's zone and cleans up on unmount", async () => {
            let providerContext;
            const View = defineComponent({
                setup() {
                    useStickyStack({ zone: "top", order: 0, reveal: "scroll-up" });
                    return () => h("div");
                },
            });
            const Provider = defineComponent({
                props: { show: { type: Boolean, default: true } },
                setup(props) {
                    providerContext = useStickyStack();
                    return () => (props.show ? h(View) : h("div"));
                },
            });

            const wrapper = mount(Provider);
            expect(providerContext.zoneRegistrations("top").value).toHaveLength(1);

            await wrapper.setProps({ show: false });
            expect(providerContext.zoneRegistrations("top").value).toHaveLength(0);
        });

        scopedIt("degrades to a null target and no-op stop when no provider exists above", async () => {
            const entry = await withSetup(() => useStickyStack({ zone: "top", reveal: "scroll-up" }));
            expect(entry.target.value).toBeNull();
            expect(typeof entry.stop).toBe("function");
            expect(() => entry.stop()).not.toThrow();
        });
    });
});
