import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import InputGroup from "@vueda/controls/input-group/InputGroup.vue";
import InputGroupAddon from "@vueda/controls/input-group/InputGroupAddon.vue";
import InputGroupButton from "@vueda/controls/input-group/InputGroupButton.vue";
import InputGroupInput from "@vueda/controls/input-group/InputGroupInput.vue";
import InputGroupText from "@vueda/controls/input-group/InputGroupText.vue";
import InputGroupTextarea from "@vueda/controls/input-group/InputGroupTextarea.vue";
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

describe("lib/controls/input-group/InputGroup.vue", () => {
    describe("InputGroup", () => {
        scopedIt("has data-slot=input-group", () => {
            const wrapper = mount(InputGroup);
            expect(wrapper.attributes("data-slot")).toBe("input-group");
        });

        scopedIt("has role=group", () => {
            const wrapper = mount(InputGroup);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("applies border and flex classes", () => {
            const wrapper = mount(InputGroup);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("rounded-md");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(InputGroup, {
                slots: { default: "<span>inside</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("InputGroupAddon", () => {
        scopedIt("has data-slot=input-group-addon", () => {
            const wrapper = mount(InputGroupAddon);
            expect(wrapper.attributes("data-slot")).toBe("input-group-addon");
        });

        scopedIt("has role=group", () => {
            const wrapper = mount(InputGroupAddon);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("defaults data-align to inline-start", () => {
            const wrapper = mount(InputGroupAddon);
            expect(wrapper.attributes("data-align")).toBe("inline-start");
        });

        scopedIt("sets data-align from align prop", () => {
            const wrapper = mount(InputGroupAddon, { props: { align: "inline-end" } });
            expect(wrapper.attributes("data-align")).toBe("inline-end");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputGroupAddon, { props: { class: "my-addon" } });
            expect(wrapper.classes()).toContain("my-addon");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(InputGroupAddon, {
                slots: { default: "<span>icon</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("click on addon focuses the sibling input", async () => {
            const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");
            const wrapper = mount(
                defineComponent({
                    components: { InputGroupAddon },
                    template: `<div><InputGroupAddon /><input /></div>`,
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
                    components: { InputGroupAddon },
                    template: `<div><InputGroupAddon><button>x</button></InputGroupAddon><input /></div>`,
                }),
                { attachTo: document.body },
            );
            await wrapper.find("button").trigger("click");
            expect(focusSpy).not.toHaveBeenCalled();
            focusSpy.mockRestore();
        });
    });

    describe("InputGroupButton", () => {
        scopedIt("renders a button element", () => {
            const wrapper = mount(InputGroupButton);
            expect(wrapper.find("button").exists()).toBe(true);
        });

        scopedIt("applies inputGroupButtonVariants xs size class by default", () => {
            const wrapper = mount(InputGroupButton);
            expect(wrapper.find("button").classes()).toContain("h-6");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputGroupButton, { props: { class: "my-btn" } });
            expect(wrapper.find("button").classes()).toContain("my-btn");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(InputGroupButton, {
                slots: { default: "<span>Go</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("InputGroupInput", () => {
        scopedIt("has data-slot=input-group-control", () => {
            const wrapper = mount(InputGroupInput);
            expect(wrapper.find('[data-slot="input-group-control"]').exists()).toBe(true);
        });

        scopedIt("applies flex-1 and rounded-none classes", () => {
            const wrapper = mount(InputGroupInput);
            const input = wrapper.find('[data-slot="input-group-control"]');
            expect(input.classes()).toContain("flex-1");
            expect(input.classes()).toContain("rounded-none");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputGroupInput, { props: { class: "my-input" } });
            expect(wrapper.find('[data-slot="input-group-control"]').classes()).toContain("my-input");
        });
    });

    describe("InputGroupText", () => {
        scopedIt("renders a span element", () => {
            const wrapper = mount(InputGroupText);
            expect(wrapper.element.tagName).toBe("SPAN");
        });

        scopedIt("applies text-muted-foreground class", () => {
            const wrapper = mount(InputGroupText);
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputGroupText, { props: { class: "my-text" } });
            expect(wrapper.classes()).toContain("my-text");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(InputGroupText, {
                slots: { default: "<span>$</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("InputGroupTextarea", () => {
        scopedIt("has data-slot=input-group-control", () => {
            const wrapper = mount(InputGroupTextarea);
            expect(wrapper.find('[data-slot="input-group-control"]').exists()).toBe(true);
        });

        scopedIt("applies flex-1 and resize-none classes", () => {
            const wrapper = mount(InputGroupTextarea);
            const textarea = wrapper.find('[data-slot="input-group-control"]');
            expect(textarea.classes()).toContain("flex-1");
            expect(textarea.classes()).toContain("resize-none");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputGroupTextarea, {
                props: { class: "my-textarea" },
            });
            expect(wrapper.find('[data-slot="input-group-control"]').classes()).toContain("my-textarea");
        });
    });
});
