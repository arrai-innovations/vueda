import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlInputGroup from "@vueda/controls/input-group/ControlInputGroup.vue";
import ControlInputGroupAddon from "@vueda/controls/input-group/ControlInputGroupAddon.vue";
import ControlInputGroupButton from "@vueda/controls/input-group/ControlInputGroupButton.vue";
import ControlInputGroupInput from "@vueda/controls/input-group/ControlInputGroupInput.vue";
import ControlInputGroupText from "@vueda/controls/input-group/ControlInputGroupText.vue";
import ControlInputGroupTextarea from "@vueda/controls/input-group/ControlInputGroupTextarea.vue";
import { defineComponent } from "vue";

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    return {
        ...actual,
        Primitive: defineComponent({
            name: "Primitive",
            props: { as: { default: "div" }, asChild: Boolean },
            setup(props, { slots, attrs }) {
                return () => h(props.as, attrs, slots.default ? slots.default() : undefined);
            },
        }),
    };
});

describe("lib/controls/input-group/ControlInputGroup.vue", () => {
    describe("ControlInputGroup", () => {
        scopedIt("has data-slot=input-group", () => {
            const wrapper = mount(ControlInputGroup);
            expect(wrapper.attributes("data-slot")).toBe("input-group");
        });

        scopedIt("has role=group", () => {
            const wrapper = mount(ControlInputGroup);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("applies border and flex classes", () => {
            const wrapper = mount(ControlInputGroup);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("rounded-md");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlInputGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlInputGroup, {
                slots: { default: "<span>inside</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlInputGroupAddon", () => {
        scopedIt("has data-slot=input-group-addon", () => {
            const wrapper = mount(ControlInputGroupAddon);
            expect(wrapper.attributes("data-slot")).toBe("input-group-addon");
        });

        scopedIt("has role=group", () => {
            const wrapper = mount(ControlInputGroupAddon);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("defaults data-align to inline-start", () => {
            const wrapper = mount(ControlInputGroupAddon);
            expect(wrapper.attributes("data-align")).toBe("inline-start");
        });

        scopedIt("sets data-align from align prop", () => {
            const wrapper = mount(ControlInputGroupAddon, { props: { align: "inline-end" } });
            expect(wrapper.attributes("data-align")).toBe("inline-end");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlInputGroupAddon, { props: { class: "my-addon" } });
            expect(wrapper.classes()).toContain("my-addon");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlInputGroupAddon, {
                slots: { default: "<span>icon</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("click on addon focuses the sibling input", async () => {
            const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");
            const wrapper = mount(
                defineComponent({
                    components: { ControlInputGroupAddon },
                    template: `<div><ControlInputGroupAddon /><input /></div>`,
                }),
                { attachTo: document.body },
            );
            await wrapper.find('[data-slot="input-group-addon"]').trigger("click");
            expect(focusSpy).toHaveBeenCalled();
            focusSpy.mockRestore();
        });

        scopedIt("click on a button inside addon does not focus the input", async () => {
            const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");
            const wrapper = mount(
                defineComponent({
                    components: { ControlInputGroupAddon },
                    template: `<div><ControlInputGroupAddon><button>x</button></ControlInputGroupAddon><input /></div>`,
                }),
                { attachTo: document.body },
            );
            await wrapper.find("button").trigger("click");
            expect(focusSpy).not.toHaveBeenCalled();
            focusSpy.mockRestore();
        });
    });

    describe("ControlInputGroupButton", () => {
        scopedIt("renders a button element", () => {
            const wrapper = mount(ControlInputGroupButton);
            expect(wrapper.find("button").exists()).toBe(true);
        });

        scopedIt("applies inputGroupButtonVariants xs size class by default", () => {
            const wrapper = mount(ControlInputGroupButton);
            expect(wrapper.find("button").classes()).toContain("h-6");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlInputGroupButton, { props: { class: "my-btn" } });
            expect(wrapper.find("button").classes()).toContain("my-btn");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlInputGroupButton, {
                slots: { default: "<span>Go</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlInputGroupInput", () => {
        scopedIt("has data-slot=input-group-control", () => {
            const wrapper = mount(ControlInputGroupInput);
            expect(wrapper.find('[data-slot="input-group-control"]').exists()).toBe(true);
        });

        scopedIt("applies flex-1 and rounded-none classes", () => {
            const wrapper = mount(ControlInputGroupInput);
            const input = wrapper.find('[data-slot="input-group-control"]');
            expect(input.classes()).toContain("flex-1");
            expect(input.classes()).toContain("rounded-none");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlInputGroupInput, { props: { class: "my-input" } });
            expect(wrapper.find('[data-slot="input-group-control"]').classes()).toContain("my-input");
        });
    });

    describe("ControlInputGroupText", () => {
        scopedIt("renders a span element", () => {
            const wrapper = mount(ControlInputGroupText);
            expect(wrapper.element.tagName).toBe("SPAN");
        });

        scopedIt("applies text-muted-foreground class", () => {
            const wrapper = mount(ControlInputGroupText);
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlInputGroupText, { props: { class: "my-text" } });
            expect(wrapper.classes()).toContain("my-text");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlInputGroupText, {
                slots: { default: "<span>$</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlInputGroupTextarea", () => {
        scopedIt("has data-slot=input-group-control", () => {
            const wrapper = mount(ControlInputGroupTextarea);
            expect(wrapper.find('[data-slot="input-group-control"]').exists()).toBe(true);
        });

        scopedIt("applies flex-1 and resize-none classes", () => {
            const wrapper = mount(ControlInputGroupTextarea);
            const textarea = wrapper.find('[data-slot="input-group-control"]');
            expect(textarea.classes()).toContain("flex-1");
            expect(textarea.classes()).toContain("resize-none");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlInputGroupTextarea, {
                props: { class: "my-textarea" },
            });
            expect(wrapper.find('[data-slot="input-group-control"]').classes()).toContain("my-textarea");
        });
    });
});
