import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import TypedConfirmField from "@vueda/components/TypedConfirmField.vue";
import { nextTick } from "vue";

describe("lib/components/TypedConfirmField.vue", () => {
    describe("default rendering", () => {
        scopedIt("renders labelLead + chip + labelTail around expectedValue", () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "mara.tani" } });
            const label = wrapper.find('[data-qa="typed-confirm-field-label"]');
            expect(label.text()).toBe("Type mara.tani to confirm");
            const chip = wrapper.find('[data-qa="typed-confirm-field-chip"]');
            expect(chip.exists()).toBe(true);
            expect(chip.element.tagName).toBe("CODE");
            expect(chip.text()).toBe("mara.tani");
        });

        scopedIt("custom labelLead and labelTail flank the chip", () => {
            const wrapper = mount(TypedConfirmField, {
                props: {
                    expectedValue: "delete 3 customers",
                    labelLead: "Type",
                    labelTail: "to permanently delete the selected records",
                },
            });
            expect(wrapper.find('[data-qa="typed-confirm-field-label"]').text()).toBe(
                "Type delete 3 customers to permanently delete the selected records",
            );
        });

        scopedIt("label slot overrides default rendering", () => {
            const wrapper = mount(TypedConfirmField, {
                props: { expectedValue: "yes" },
                slots: {
                    label: '<span data-qa="custom-label">custom label</span>',
                },
            });
            expect(wrapper.find('[data-qa="custom-label"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="typed-confirm-field-chip"]').exists()).toBe(false);
        });

        scopedIt("placeholder defaults to expectedValue", () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "mara.tani" } });
            expect(wrapper.find("input").attributes("placeholder")).toBe("mara.tani");
        });

        scopedIt("explicit placeholder wins over the default", () => {
            const wrapper = mount(TypedConfirmField, {
                props: { expectedValue: "mara.tani", placeholder: "type your username" },
            });
            expect(wrapper.find("input").attributes("placeholder")).toBe("type your username");
        });

        scopedIt("input has spellcheck=false and autocomplete=off", () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "x" } });
            const input = wrapper.find("input");
            expect(input.attributes("spellcheck")).toBe("false");
            expect(input.attributes("autocomplete")).toBe("off");
        });
    });

    describe("match contract", () => {
        scopedIt("starts in non-match state", () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "yes" } });
            expect(wrapper.attributes("data-match")).toBe("false");
        });

        scopedIt("flips data-match to true when typed value equals expectedValue", async () => {
            const wrapper = mount(TypedConfirmField, {
                props: { expectedValue: "yes", modelValue: "" },
            });
            await wrapper.setProps({ modelValue: "yes" });
            expect(wrapper.attributes("data-match")).toBe("true");
        });

        scopedIt("emits match=true on the first keystroke that completes the match", async () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "ok" } });
            const input = wrapper.find("input");
            input.element.value = "o";
            await input.trigger("input");
            expect(wrapper.emitted("match")).toBeUndefined();
            input.element.value = "ok";
            await input.trigger("input");
            expect(wrapper.emitted("match")?.at(-1)).toEqual([true]);
        });

        scopedIt("emits match=false when match state is lost", async () => {
            const wrapper = mount(TypedConfirmField, {
                props: { expectedValue: "ok", modelValue: "ok" },
            });
            await nextTick();
            const input = wrapper.find("input");
            input.element.value = "okx";
            await input.trigger("input");
            expect(wrapper.emitted("match")?.at(-1)).toEqual([false]);
        });

        scopedIt("match comparison is case-sensitive and whitespace-sensitive", async () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "Yes" } });
            await wrapper.setProps({ modelValue: "yes" });
            expect(wrapper.attributes("data-match")).toBe("false");
            await wrapper.setProps({ modelValue: "Yes " });
            expect(wrapper.attributes("data-match")).toBe("false");
            await wrapper.setProps({ modelValue: "Yes" });
            expect(wrapper.attributes("data-match")).toBe("true");
        });
    });

    describe("v-model", () => {
        scopedIt("emits update:modelValue on input", async () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "ok", modelValue: "" } });
            const input = wrapper.find("input");
            input.element.value = "o";
            await input.trigger("input");
            expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["o"]);
        });

        scopedIt("reflects modelValue back into the input", async () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "ok", modelValue: "ok" } });
            await nextTick();
            expect(wrapper.find("input").element.value).toBe("ok");
        });
    });

    describe("root contract", () => {
        scopedIt("root has data-slot=typed-confirm-field", () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "x" } });
            expect(wrapper.attributes("data-slot")).toBe("typed-confirm-field");
        });

        scopedIt("root is a <label> that targets the input via for/id", () => {
            const wrapper = mount(TypedConfirmField, { props: { expectedValue: "x" } });
            expect(wrapper.element.tagName).toBe("LABEL");
            const labelFor = wrapper.attributes("for");
            const inputId = wrapper.find("input").attributes("id");
            expect(labelFor).toBeTruthy();
            expect(labelFor).toBe(inputId);
        });

        scopedIt("inputId prop overrides the generated id", () => {
            const wrapper = mount(TypedConfirmField, {
                props: { expectedValue: "x", inputId: "deactivate-confirm" },
            });
            expect(wrapper.find("input").attributes("id")).toBe("deactivate-confirm");
            expect(wrapper.attributes("for")).toBe("deactivate-confirm");
        });

        scopedIt("merges custom class while preserving theme classes", () => {
            const wrapper = mount(TypedConfirmField, {
                props: { expectedValue: "x", class: "my-custom-class" },
            });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("border-border");
        });
    });
});
