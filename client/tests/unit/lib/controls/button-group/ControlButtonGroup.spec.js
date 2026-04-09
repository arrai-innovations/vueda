import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlButtonGroup from "@vueda/controls/button-group/ControlButtonGroup.vue";
import ControlButtonGroupSeparator from "@vueda/controls/button-group/ControlButtonGroupSeparator.vue";
import ControlButtonGroupText from "@vueda/controls/button-group/ControlButtonGroupText.vue";
import { h } from "vue";

describe("lib/controls/button-group/ControlButtonGroup.vue", () => {
    describe("ControlButtonGroup", () => {
        scopedIt("has role=group", () => {
            const wrapper = mount(ControlButtonGroup);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("has data-slot=button-group", () => {
            const wrapper = mount(ControlButtonGroup);
            expect(wrapper.attributes("data-slot")).toBe("button-group");
        });

        scopedIt("applies base layout classes", () => {
            const wrapper = mount(ControlButtonGroup);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("items-stretch");
        });

        scopedIt("reflects orientation in data-orientation", () => {
            const wrapper = mount(ControlButtonGroup, { props: { orientation: "vertical" } });
            expect(wrapper.attributes("data-orientation")).toBe("vertical");
        });

        scopedIt("applies vertical orientation classes", () => {
            const wrapper = mount(ControlButtonGroup, { props: { orientation: "vertical" } });
            expect(wrapper.classes()).toContain("flex-col");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ControlButtonGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlButtonGroup, { slots: { default: "<button>A</button>" } });
            expect(wrapper.find("button").exists()).toBe(true);
        });
    });

    describe("ControlButtonGroupSeparator", () => {
        scopedIt("has data-slot=button-group-separator", () => {
            const wrapper = mount(ControlButtonGroupSeparator);
            expect(wrapper.find('[data-slot="button-group-separator"]').exists()).toBe(true);
        });

        scopedIt("applies bg-input and self-stretch classes", () => {
            const wrapper = mount(ControlButtonGroupSeparator);
            const sep = wrapper.find('[data-slot="button-group-separator"]');
            expect(sep.classes()).toContain("bg-input");
            expect(sep.classes()).toContain("self-stretch");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlButtonGroupSeparator, { props: { class: "my-sep" } });
            expect(wrapper.find('[data-slot="button-group-separator"]').classes()).toContain("my-sep");
        });

        scopedIt("defaults to vertical orientation", () => {
            const wrapper = mount(ControlButtonGroupSeparator);
            const sep = wrapper.find('[data-slot="button-group-separator"]');
            expect(sep.attributes("data-orientation")).toBe("vertical");
        });
    });

    describe("ControlButtonGroupText", () => {
        scopedIt("has data-slot=button-group", () => {
            const wrapper = mount(ControlButtonGroupText);
            expect(wrapper.attributes("data-slot")).toBe("button-group");
        });

        scopedIt("applies muted background and layout classes", () => {
            const wrapper = mount(ControlButtonGroupText);
            expect(wrapper.classes()).toContain("bg-muted");
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlButtonGroupText, { props: { class: "my-text" } });
            expect(wrapper.classes()).toContain("my-text");
        });

        scopedIt("renders as div by default", () => {
            const wrapper = mount(ControlButtonGroupText);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("renders as a different element when as prop is set", () => {
            const wrapper = mount(ControlButtonGroupText, { props: { as: "span" } });
            expect(wrapper.element.tagName).toBe("SPAN");
        });

        scopedIt("merges onto child when asChild is true", () => {
            const wrapper = mount(ControlButtonGroupText, {
                props: { asChild: true },
                slots: { default: () => h("span", {}, "Label") },
            });
            expect(wrapper.element.tagName).toBe("SPAN");
            expect(wrapper.attributes("data-slot")).toBe("button-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlButtonGroupText, { slots: { default: "Label text" } });
            expect(wrapper.text()).toBe("Label text");
        });
    });
});
