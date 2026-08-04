import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { defineComponent, h } from "vue";

/**
 * Mounts a minimal component whose setup calls useForwardPropsEmits, captures the
 * returned ComputedRef, and returns it for assertions.
 *
 * @param {object|string[]} emitsDefinition - Passed as the component's `emits` option.
 * @param {Function} emitFn - The function forwarded to useForwardPropsEmits as the emit arg.
 * @returns {import('vue').ComputedRef}
 */
function mountAndCapture(emitsDefinition, emitFn) {
    let captured;
    const TestComponent = defineComponent({
        emits: emitsDefinition,
        setup(props, { emit }) {
            captured = useForwardPropsEmits({}, emitFn ?? emit);
            return () => h("div");
        },
    });
    mount(TestComponent);
    return captured;
}

describe("lib/use/useForwardPropsEmits.js", () => {
    // Vue's camelize only converts hyphens, not colons, so `update:open`
    // maps to the handler key `onUpdate:open`, not `onUpdateOpen`.
    describe("object-form emits (the vueda convention)", () => {
        scopedIt("produces an onXxx handler for the declared event", () => {
            const result = mountAndCapture({ "update:open": null });
            expect(typeof result.value["onUpdate:open"]).toBe("function");
        });

        scopedIt("calling the handler forwards the event and args to emit", () => {
            const emit = vi.fn();
            const result = mountAndCapture({ "update:open": null }, emit);
            result.value["onUpdate:open"](true);
            expect(emit).toHaveBeenCalledWith("update:open", true);
        });
    });

    describe("array-form emits", () => {
        scopedIt("produces an onXxx handler for the declared event", () => {
            const result = mountAndCapture(["update:open"]);
            expect(typeof result.value["onUpdate:open"]).toBe("function");
        });

        scopedIt("calling the handler forwards the event and args to emit", () => {
            const emit = vi.fn();
            const result = mountAndCapture(["update:open"], emit);
            result.value["onUpdate:open"](true);
            expect(emit).toHaveBeenCalledWith("update:open", true);
        });
    });
});
