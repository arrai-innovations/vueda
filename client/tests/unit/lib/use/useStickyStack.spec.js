import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useStickyStack } from "@vueda/use/useStickyStack.js";
import { defineComponent, h, ref } from "vue";

describe("lib/use/useStickyStack.js", () => {
    describe("provider role (no registration)", () => {
        scopedIt("establishes a context with the expected surface and zone defaults", async () => {
            const context = await withSetup(() => useStickyStack());
            expect(typeof context.zoneTarget).toBe("function");
            expect(typeof context.zoneReveal).toBe("function");
            expect(typeof context.bindZone).toBe("function");
            expect(typeof context.register).toBe("function");

            // Targets are null until the provider binds zone elements.
            expect(context.zoneTarget("top").value).toBeNull();
            expect(context.zoneTarget("bottom").value).toBeNull();

            // Both zones default to "always" (footer always shows; top holds context until a view
            // registers an action strategy).
            expect(context.zoneReveal("top").value).toBe("always");
            expect(context.zoneReveal("bottom").value).toBe("always");
        });

        scopedIt("resolves a bound zone target to its element, following the ref", async () => {
            const context = await withSetup(() => useStickyStack());
            const element = document.createElement("div");
            const zone = ref(element);

            context.bindZone("top", zone);
            expect(context.zoneTarget("top").value).toBe(element);

            zone.value = null;
            expect(context.zoneTarget("top").value).toBeNull();
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

    describe("zone reveal (registration stack)", () => {
        scopedIt("adopts the newest registration's reveal and restores the prior on cleanup", async () => {
            const context = await withSetup(() => useStickyStack());

            const a = context.register({ zone: "top", reveal: "scroll-up" });
            expect(context.zoneReveal("top").value).toBe("scroll-up");

            const b = context.register({ zone: "top", reveal: "scroll-up-or-idle" });
            expect(context.zoneReveal("top").value).toBe("scroll-up-or-idle");

            // Newest off the stack restores the previous registration's strategy.
            b.stop();
            expect(context.zoneReveal("top").value).toBe("scroll-up");

            // Last one off falls back to the zone default.
            a.stop();
            expect(context.zoneReveal("top").value).toBe("always");
        });

        scopedIt("treats a second stop() as a no-op and does not pop an unrelated entry", async () => {
            const context = await withSetup(() => useStickyStack());
            const a = context.register({ zone: "top", reveal: "scroll-up" });
            const b = context.register({ zone: "top", reveal: "scroll-up-or-idle" });

            a.stop();
            expect(context.zoneReveal("top").value).toBe("scroll-up-or-idle");
            // A stale stop must not remove b.
            a.stop();
            expect(context.zoneReveal("top").value).toBe("scroll-up-or-idle");
            b.stop();
        });

        scopedIt("flattens a reactive reveal so consumers read a plain value", async () => {
            const context = await withSetup(() => useStickyStack());
            const reveal = ref("scroll-up");
            context.register({ zone: "top", reveal: () => reveal.value });
            expect(context.zoneReveal("top").value).toBe("scroll-up");

            reveal.value = false;
            expect(context.zoneReveal("top").value).toBe(false);
        });

        scopedIt("keeps each zone's registrations independent", async () => {
            const context = await withSetup(() => useStickyStack());
            context.register({ zone: "top", reveal: "scroll-up" });
            expect(context.zoneReveal("top").value).toBe("scroll-up");
            // Registering top must not disturb the bottom zone default.
            expect(context.zoneReveal("bottom").value).toBe("always");
        });
    });

    describe("view role (registration arg)", () => {
        scopedIt("hands the view the zone target it teleports into", async () => {
            let providerContext;
            let handle;
            const View = defineComponent({
                setup() {
                    handle = useStickyStack({ zone: "top", reveal: "scroll-up" });
                    return () => h("div");
                },
            });
            const Provider = defineComponent({
                setup() {
                    providerContext = useStickyStack();
                    return () => h(View);
                },
            });

            mount(Provider);
            const element = document.createElement("div");
            providerContext.bindZone("top", ref(element));
            expect(handle.target.value).toBe(element);
            expect(providerContext.zoneReveal("top").value).toBe("scroll-up");
        });

        scopedIt("clears its registration when the view unmounts", async () => {
            let providerContext;
            const View = defineComponent({
                setup() {
                    useStickyStack({ zone: "top", reveal: "scroll-up" });
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
            expect(providerContext.zoneReveal("top").value).toBe("scroll-up");

            await wrapper.setProps({ show: false });
            expect(providerContext.zoneReveal("top").value).toBe("always");
        });

        scopedIt("degrades to a null target and no-op stop when no provider exists above", async () => {
            const handle = await withSetup(() => useStickyStack({ zone: "top", reveal: "scroll-up" }));
            expect(handle.target.value).toBeNull();
            expect(typeof handle.stop).toBe("function");
            // Calling stop without a provider must be harmless.
            expect(() => handle.stop()).not.toThrow();
        });

        scopedIt("falls back to the top zone for an unknown zone name", async () => {
            const context = await withSetup(() => useStickyStack());
            const handle = context.register({ zone: "nope", reveal: "scroll-up" });
            const element = document.createElement("div");
            context.bindZone("top", ref(element));
            expect(handle.target.value).toBe(element);
            expect(context.zoneReveal("top").value).toBe("scroll-up");
        });
    });
});
