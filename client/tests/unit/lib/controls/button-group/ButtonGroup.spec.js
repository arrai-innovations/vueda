import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ButtonGroup from "@vueda/controls/button-group/ButtonGroup.vue";
import ButtonGroupSeparator from "@vueda/controls/button-group/ButtonGroupSeparator.vue";
import ButtonGroupText from "@vueda/controls/button-group/ButtonGroupText.vue";
import { h } from "vue";

describe("lib/controls/button-group/ButtonGroup.vue", () => {
    describe("ButtonGroup", () => {
        scopedIt("has role=group", () => {
            const wrapper = mount(ButtonGroup);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("has data-slot=button-group", () => {
            const wrapper = mount(ButtonGroup);
            expect(wrapper.attributes("data-slot")).toBe("button-group");
        });

        scopedIt("applies base layout classes", () => {
            const wrapper = mount(ButtonGroup);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("items-stretch");
        });

        scopedIt("reflects orientation in data-orientation", () => {
            const wrapper = mount(ButtonGroup, { props: { orientation: "vertical" } });
            expect(wrapper.attributes("data-orientation")).toBe("vertical");
        });

        scopedIt("applies vertical orientation classes", () => {
            const wrapper = mount(ButtonGroup, { props: { orientation: "vertical" } });
            expect(wrapper.classes()).toContain("flex-col");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ButtonGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ButtonGroup, { slots: { default: "<button>A</button>" } });
            expect(wrapper.find("button").exists()).toBe(true);
        });
    });

    describe("ButtonGroupSeparator", () => {
        scopedIt("has data-slot=button-group-separator", () => {
            const wrapper = mount(ButtonGroupSeparator);
            expect(wrapper.find('[data-slot="button-group-separator"]').exists()).toBe(true);
        });

        scopedIt("applies bg-input and self-stretch classes", () => {
            const wrapper = mount(ButtonGroupSeparator);
            const sep = wrapper.find('[data-slot="button-group-separator"]');
            expect(sep.classes()).toContain("bg-input");
            expect(sep.classes()).toContain("self-stretch");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ButtonGroupSeparator, { props: { class: "my-sep" } });
            expect(wrapper.find('[data-slot="button-group-separator"]').classes()).toContain("my-sep");
        });

        scopedIt("defaults to vertical orientation", () => {
            const wrapper = mount(ButtonGroupSeparator);
            const sep = wrapper.find('[data-slot="button-group-separator"]');
            expect(sep.attributes("data-orientation")).toBe("vertical");
        });
    });

    describe("ButtonGroupText", () => {
        scopedIt("has data-slot=button-group-text", () => {
            const wrapper = mount(ButtonGroupText);
            expect(wrapper.attributes("data-slot")).toBe("button-group-text");
        });

        scopedIt("applies muted background and layout classes", () => {
            const wrapper = mount(ButtonGroupText);
            expect(wrapper.classes()).toContain("bg-muted");
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ButtonGroupText, { props: { class: "my-text" } });
            expect(wrapper.classes()).toContain("my-text");
        });

        scopedIt("renders as div by default", () => {
            const wrapper = mount(ButtonGroupText);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("renders as a different element when as prop is set", () => {
            const wrapper = mount(ButtonGroupText, { props: { as: "span" } });
            expect(wrapper.element.tagName).toBe("SPAN");
        });

        scopedIt("merges onto child when asChild is true", () => {
            const wrapper = mount(ButtonGroupText, {
                props: { asChild: true },
                slots: { default: () => h("span", {}, "Label") },
            });
            expect(wrapper.element.tagName).toBe("SPAN");
            expect(wrapper.attributes("data-slot")).toBe("button-group-text");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ButtonGroupText, { slots: { default: "Label text" } });
            expect(wrapper.text()).toBe("Label text");
        });
    });
});
