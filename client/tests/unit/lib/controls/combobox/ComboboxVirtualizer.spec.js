import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ComboboxVirtualizer from "@vueda/controls/combobox/ComboboxVirtualizer.vue";
import { Fragment } from "vue";

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    return {
        ...actual,
        ComboboxVirtualizer: defineComponent({
            name: "MockRekaComboboxVirtualizer",
            props: {
                options: { type: Array, required: true },
                estimateSize: {},
                overscan: {},
                textContent: {},
            },
            setup(props, { slots }) {
                return { capturedSlot: slots.default };
            },
            render() {
                return h("div");
            },
        }),
    };
});

describe("lib/controls/combobox/ComboboxVirtualizer.vue", () => {
    describe("slot forwarding", () => {
        scopedIt("passes the parent slot through without an extra renderSlot Fragment wrap", () => {
            const options = [{ id: 1, label: "One" }];

            const wrapper = mount({
                components: { ComboboxVirtualizer },
                template: `
                        <ComboboxVirtualizer :options="options">
                            <template #default="{ option }">
                                <div class="item">{{ option.label }}</div>
                            </template>
                        </ComboboxVirtualizer>
                    `,
                setup() {
                    return { options };
                },
            });

            const mock = wrapper.findComponent({ name: "MockRekaComboboxVirtualizer" });
            const capturedSlot = mock.vm.capturedSlot;

            expect(capturedSlot).toBeDefined();

            const result = capturedSlot({ option: options[0] });

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);

            // reka-ui's ComboboxVirtualizer already wraps this slot in its own
            // renderSlot() call before passing it to ListboxVirtualizer. ListboxVirtualizer
            // then does a depth-1 .find() on the Fragment's children to locate the item
            // VNode. If our wrapper also uses renderSlot (via `<slot v-bind="slotProps" />`
            // in a template), the children would be [Fragment] rather than [div], causing
            // .find() to return undefined and cloneVNode to crash.
            expect(result[0].type).not.toBe(Fragment);
        });
    });
});
