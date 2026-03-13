import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellField from "@vueda/shell/field/ShellField.vue";
import ShellFieldContent from "@vueda/shell/field/ShellFieldContent.vue";
import ShellFieldDescription from "@vueda/shell/field/ShellFieldDescription.vue";
import ShellFieldError from "@vueda/shell/field/ShellFieldError.vue";
import ShellFieldGroup from "@vueda/shell/field/ShellFieldGroup.vue";
import ShellFieldLabel from "@vueda/shell/field/ShellFieldLabel.vue";
import ShellFieldLegend from "@vueda/shell/field/ShellFieldLegend.vue";
import ShellFieldSeparator from "@vueda/shell/field/ShellFieldSeparator.vue";
import ShellFieldSet from "@vueda/shell/field/ShellFieldSet.vue";
import ShellFieldTitle from "@vueda/shell/field/ShellFieldTitle.vue";
import { fieldVariants } from "@vueda/shell/field/index.js";

describe("lib/shell/field/ShellField.vue", () => {
    describe("fieldVariants", () => {
        it("applies vertical layout classes by default", () => {
            const cls = fieldVariants({});
            expect(cls).toContain("flex-col");
        });

        it("applies horizontal layout classes when orientation=horizontal", () => {
            const cls = fieldVariants({ orientation: "horizontal" });
            expect(cls).toContain("flex-row");
            expect(cls).toContain("items-center");
        });

        it("applies responsive layout classes when orientation=responsive", () => {
            const cls = fieldVariants({ orientation: "responsive" });
            expect(cls).toContain("flex-col");
        });

        it("includes invalid state class in base", () => {
            const cls = fieldVariants({});
            expect(cls).toContain("data-[invalid=true]:text-destructive");
        });
    });

    describe("ShellField", () => {
        scopedIt("has role=group", () => {
            const wrapper = mount(ShellField);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("has data-slot=field", () => {
            const wrapper = mount(ShellField);
            expect(wrapper.attributes("data-slot")).toBe("field");
        });

        scopedIt("applies vertical flex-col class by default", () => {
            const wrapper = mount(ShellField);
            expect(wrapper.classes()).toContain("flex-col");
        });

        scopedIt("applies horizontal layout classes when orientation=horizontal", () => {
            const wrapper = mount(ShellField, { props: { orientation: "horizontal" } });
            expect(wrapper.classes()).toContain("flex-row");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("reflects orientation in data-orientation attribute", () => {
            const wrapper = mount(ShellField, { props: { orientation: "horizontal" } });
            expect(wrapper.attributes("data-orientation")).toBe("horizontal");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ShellField, { props: { class: "my-field" } });
            expect(wrapper.classes()).toContain("my-field");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellField, { slots: { default: "<span>content</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ShellFieldGroup", () => {
        scopedIt("has data-slot=field-group", () => {
            const wrapper = mount(ShellFieldGroup);
            expect(wrapper.attributes("data-slot")).toBe("field-group");
        });

        scopedIt("applies flex-col and w-full classes", () => {
            const wrapper = mount(ShellFieldGroup);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("w-full");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellFieldGroup, { slots: { default: "<div>field</div>" } });
            expect(wrapper.find("div").exists()).toBe(true);
        });
    });

    describe("ShellFieldContent", () => {
        scopedIt("has data-slot=field-content", () => {
            const wrapper = mount(ShellFieldContent);
            expect(wrapper.attributes("data-slot")).toBe("field-content");
        });

        scopedIt("applies flex-col and flex-1 classes", () => {
            const wrapper = mount(ShellFieldContent);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("flex-1");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldContent, { props: { class: "my-content" } });
            expect(wrapper.classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellFieldContent, { slots: { default: "Content" } });
            expect(wrapper.text()).toBe("Content");
        });
    });

    describe("ShellFieldLabel", () => {
        scopedIt("has data-slot=field-label", () => {
            const wrapper = mount(ShellFieldLabel);
            expect(wrapper.find('[data-slot="field-label"]').exists()).toBe(true);
        });

        scopedIt("applies leading-snug and gap-2 classes", () => {
            const wrapper = mount(ShellFieldLabel);
            const el = wrapper.find('[data-slot="field-label"]');
            expect(el.classes()).toContain("leading-snug");
            expect(el.classes()).toContain("gap-2");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldLabel, { props: { class: "my-label" } });
            expect(wrapper.find('[data-slot="field-label"]').classes()).toContain("my-label");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellFieldLabel, { slots: { default: "Label text" } });
            expect(wrapper.text()).toBe("Label text");
        });
    });

    describe("ShellFieldTitle", () => {
        scopedIt("has data-slot=field-label", () => {
            const wrapper = mount(ShellFieldTitle);
            expect(wrapper.attributes("data-slot")).toBe("field-label");
        });

        scopedIt("applies text-sm and font-medium classes", () => {
            const wrapper = mount(ShellFieldTitle);
            expect(wrapper.classes()).toContain("text-sm");
            expect(wrapper.classes()).toContain("font-medium");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldTitle, { props: { class: "my-title" } });
            expect(wrapper.classes()).toContain("my-title");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellFieldTitle, { slots: { default: "Title" } });
            expect(wrapper.text()).toBe("Title");
        });
    });

    describe("ShellFieldDescription", () => {
        scopedIt("renders as a p element", () => {
            const wrapper = mount(ShellFieldDescription);
            expect(wrapper.element.tagName).toBe("P");
        });

        scopedIt("has data-slot=field-description", () => {
            const wrapper = mount(ShellFieldDescription);
            expect(wrapper.attributes("data-slot")).toBe("field-description");
        });

        scopedIt("applies muted text and text-sm classes", () => {
            const wrapper = mount(ShellFieldDescription);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldDescription, { props: { class: "my-desc" } });
            expect(wrapper.classes()).toContain("my-desc");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellFieldDescription, { slots: { default: "Helper text." } });
            expect(wrapper.text()).toBe("Helper text.");
        });
    });

    describe("ShellFieldError", () => {
        scopedIt("renders nothing when no errors and no slot", () => {
            const wrapper = mount(ShellFieldError);
            expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false);
        });

        scopedIt("renders when errors array has one entry", () => {
            const wrapper = mount(ShellFieldError, { props: { errors: ["Required"] } });
            expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(true);
            expect(wrapper.text()).toBe("Required");
        });

        scopedIt("renders a list when errors array has multiple entries", () => {
            const wrapper = mount(ShellFieldError, { props: { errors: ["Too short", "Invalid format"] } });
            expect(wrapper.findAll("li")).toHaveLength(2);
        });

        scopedIt("deduplicates identical error messages", () => {
            const wrapper = mount(ShellFieldError, { props: { errors: ["Required", "Required"] } });
            expect(wrapper.text()).toBe("Required");
            expect(wrapper.findAll("li")).toHaveLength(0);
        });

        scopedIt("renders slot content instead of errors when slot is provided", () => {
            const wrapper = mount(ShellFieldError, {
                props: { errors: ["Required"] },
                slots: { default: "<span>Custom error</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
            expect(wrapper.text()).toBe("Custom error");
        });

        scopedIt("has role=alert and data-slot=field-error", () => {
            const wrapper = mount(ShellFieldError, { props: { errors: ["Oops"] } });
            const el = wrapper.find('[data-slot="field-error"]');
            expect(el.attributes("role")).toBe("alert");
        });

        scopedIt("applies text-destructive class", () => {
            const wrapper = mount(ShellFieldError, { props: { errors: ["Bad"] } });
            expect(wrapper.find('[data-slot="field-error"]').classes()).toContain("text-destructive");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldError, {
                props: { class: "my-error", errors: ["x"] },
            });
            expect(wrapper.find('[data-slot="field-error"]').classes()).toContain("my-error");
        });

        scopedIt("accepts error objects with message property", () => {
            const wrapper = mount(ShellFieldError, {
                props: { errors: [{ message: "Object error" }] },
            });
            expect(wrapper.text()).toBe("Object error");
        });
    });

    describe("ShellFieldLegend", () => {
        scopedIt("renders as a legend element", () => {
            const wrapper = mount(ShellFieldLegend);
            expect(wrapper.element.tagName).toBe("LEGEND");
        });

        scopedIt("has data-slot=field-legend", () => {
            const wrapper = mount(ShellFieldLegend);
            expect(wrapper.attributes("data-slot")).toBe("field-legend");
        });

        scopedIt("applies font-medium class", () => {
            const wrapper = mount(ShellFieldLegend);
            expect(wrapper.classes()).toContain("font-medium");
        });

        scopedIt("reflects variant in data-variant attribute", () => {
            const wrapper = mount(ShellFieldLegend, { props: { variant: "legend" } });
            expect(wrapper.attributes("data-variant")).toBe("legend");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldLegend, { props: { class: "my-legend" } });
            expect(wrapper.classes()).toContain("my-legend");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellFieldLegend, { slots: { default: "Section title" } });
            expect(wrapper.text()).toBe("Section title");
        });
    });

    describe("ShellFieldSet", () => {
        scopedIt("renders as a fieldset element", () => {
            const wrapper = mount(ShellFieldSet);
            expect(wrapper.element.tagName).toBe("FIELDSET");
        });

        scopedIt("has data-slot=field-set", () => {
            const wrapper = mount(ShellFieldSet);
            expect(wrapper.attributes("data-slot")).toBe("field-set");
        });

        scopedIt("applies flex-col and gap-6 classes", () => {
            const wrapper = mount(ShellFieldSet);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("gap-6");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldSet, { props: { class: "my-fieldset" } });
            expect(wrapper.classes()).toContain("my-fieldset");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellFieldSet, { slots: { default: "<legend>Group</legend>" } });
            expect(wrapper.find("legend").exists()).toBe(true);
        });
    });

    describe("ShellFieldSeparator", () => {
        scopedIt("has data-slot=field-separator", () => {
            const wrapper = mount(ShellFieldSeparator);
            expect(wrapper.find('[data-slot="field-separator"]').exists()).toBe(true);
        });

        scopedIt("applies relative and h-5 classes", () => {
            const wrapper = mount(ShellFieldSeparator);
            const el = wrapper.find('[data-slot="field-separator"]');
            expect(el.classes()).toContain("relative");
            expect(el.classes()).toContain("h-5");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellFieldSeparator, { props: { class: "my-sep" } });
            expect(wrapper.find('[data-slot="field-separator"]').classes()).toContain("my-sep");
        });

        scopedIt("does not render separator content when no slot", () => {
            const wrapper = mount(ShellFieldSeparator);
            expect(wrapper.find('[data-slot="field-separator-content"]').exists()).toBe(false);
        });

        scopedIt("renders separator content span when slot is provided", () => {
            const wrapper = mount(ShellFieldSeparator, { slots: { default: "or" } });
            expect(wrapper.find('[data-slot="field-separator-content"]').exists()).toBe(true);
            expect(wrapper.find('[data-slot="field-separator-content"]').text()).toBe("or");
        });
    });
});
