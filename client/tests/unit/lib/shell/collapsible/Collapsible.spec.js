import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import Collapsible from "@vueda/shell/collapsible/Collapsible.vue";
import CollapsibleContent from "@vueda/shell/collapsible/CollapsibleContent.vue";
import CollapsibleTrigger from "@vueda/shell/collapsible/CollapsibleTrigger.vue";
import { h } from "vue";

const slots = {
    default: () => [
        h(CollapsibleTrigger, {}, () => "Details"),
        h(CollapsibleContent, {}, () => h("input", { value: "Draft" })),
    ],
};

describe("lib/shell/collapsible/Collapsible.vue", () => {
    scopedIt("maps controlled modelValue and updates to Reka's open state", async () => {
        const wrapper = mount(Collapsible, { props: { modelValue: false, unmountOnHide: false }, slots });
        try {
            await flushPromises();
            const trigger = wrapper.get("button");
            const body = wrapper.get('[data-slot="collapsible-content"]');
            expect(trigger.attributes("type")).toBe("button");
            expect(trigger.attributes("aria-controls")).toBe(body.attributes("id"));
            expect(trigger.attributes("aria-expanded")).toBe("false");
            const input = wrapper.get("input").element;
            await trigger.trigger("click");
            expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
            expect(trigger.attributes("aria-expanded")).toBe("false");
            await wrapper.setProps({ modelValue: true });
            await flushPromises();
            expect(trigger.attributes("aria-expanded")).toBe("true");
            expect(body.attributes("hidden")).toBeUndefined();
            await wrapper.setProps({ modelValue: false });
            await flushPromises();
            expect(body.attributes("hidden")).toBeDefined();
            expect(wrapper.get("input").element).toBe(input);
        } finally {
            wrapper.unmount();
        }
    });

    scopedIt("retains uncontrolled toggling and the default unmount behavior", async () => {
        const wrapper = mount(Collapsible, { props: { defaultOpen: true }, slots });
        try {
            await flushPromises();
            expect(wrapper.find("input").exists()).toBe(true);
            await wrapper.get("button").trigger("click");
            await flushPromises();
            expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
            expect(wrapper.find("input").exists()).toBe(false);
            await wrapper.get("button").trigger("click");
            await flushPromises();
            expect(wrapper.find("input").exists()).toBe(true);
        } finally {
            wrapper.unmount();
        }
    });
});
