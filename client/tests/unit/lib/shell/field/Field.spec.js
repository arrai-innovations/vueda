import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldGroup from "@vueda/shell/field/FieldGroup.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import FieldLegend from "@vueda/shell/field/FieldLegend.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import FieldSeparator from "@vueda/shell/field/FieldSeparator.vue";
import FieldSet from "@vueda/shell/field/FieldSet.vue";
import FieldTitle from "@vueda/shell/field/FieldTitle.vue";

describe("lib/shell/field/Field.vue", () => {
    describe("Field", () => {
        scopedIt("has role=group", () => {
            const wrapper = mount(Field);
            expect(wrapper.attributes("role")).toBe("group");
        });

        scopedIt("has data-slot=field", () => {
            const wrapper = mount(Field);
            expect(wrapper.attributes("data-slot")).toBe("field");
        });

        scopedIt("applies vertical flex-col class by default", () => {
            const wrapper = mount(Field);
            expect(wrapper.classes()).toContain("flex-col");
        });

        scopedIt("applies horizontal layout classes when orientation=horizontal", () => {
            const wrapper = mount(Field, { props: { orientation: "horizontal" } });
            expect(wrapper.classes()).toContain("flex-row");
            expect(wrapper.classes()).toContain("items-start");
        });

        scopedIt("reflects orientation in data-orientation attribute", () => {
            const wrapper = mount(Field, { props: { orientation: "horizontal" } });
            expect(wrapper.attributes("data-orientation")).toBe("horizontal");
        });

        scopedIt("applies grid layout classes when orientation=read", () => {
            const wrapper = mount(Field, { props: { orientation: "read" } });
            expect(wrapper.classes()).toContain("grid");
            expect(wrapper.classes()).toContain("border-b");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Field, { props: { class: "my-field" } });
            expect(wrapper.classes()).toContain("my-field");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Field, { slots: { default: "<span>content</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("FieldGroup", () => {
        scopedIt("has data-slot=field-group", () => {
            const wrapper = mount(FieldGroup);
            expect(wrapper.attributes("data-slot")).toBe("field-group");
        });

        scopedIt("applies flex-col and w-full classes", () => {
            const wrapper = mount(FieldGroup);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("w-full");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FieldGroup, { slots: { default: "<div>field</div>" } });
            expect(wrapper.find("div").exists()).toBe(true);
        });
    });

    describe("FieldContent", () => {
        scopedIt("has data-slot=field-content", () => {
            const wrapper = mount(FieldContent);
            expect(wrapper.attributes("data-slot")).toBe("field-content");
        });

        scopedIt("applies flex-col and flex-1 classes", () => {
            const wrapper = mount(FieldContent);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("flex-1");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldContent, { props: { class: "my-content" } });
            expect(wrapper.classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FieldContent, { slots: { default: "Content" } });
            expect(wrapper.text()).toBe("Content");
        });
    });

    describe("FieldLabel", () => {
        scopedIt("has data-slot=field-label", () => {
            const wrapper = mount(FieldLabel);
            expect(wrapper.find('[data-slot="field-label"]').exists()).toBe(true);
        });

        scopedIt("applies leading-snug and gap-2 classes", () => {
            const wrapper = mount(FieldLabel);
            const el = wrapper.find('[data-slot="field-label"]');
            expect(el.classes()).toContain("leading-snug");
            expect(el.classes()).toContain("gap-2");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldLabel, { props: { class: "my-label" } });
            expect(wrapper.find('[data-slot="field-label"]').classes()).toContain("my-label");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FieldLabel, { slots: { default: "Label text" } });
            expect(wrapper.text()).toBe("Label text");
        });
    });

    describe("FieldTitle", () => {
        scopedIt("has data-slot=field-label", () => {
            const wrapper = mount(FieldTitle);
            expect(wrapper.attributes("data-slot")).toBe("field-label");
        });

        scopedIt("applies text-sm and font-medium classes", () => {
            const wrapper = mount(FieldTitle);
            expect(wrapper.classes()).toContain("text-sm");
            expect(wrapper.classes()).toContain("font-medium");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldTitle, { props: { class: "my-title" } });
            expect(wrapper.classes()).toContain("my-title");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FieldTitle, { slots: { default: "Title" } });
            expect(wrapper.text()).toBe("Title");
        });
    });

    describe("FieldDescription", () => {
        scopedIt("renders as a p element", () => {
            const wrapper = mount(FieldDescription);
            expect(wrapper.element.tagName).toBe("P");
        });

        scopedIt("has data-slot=field-description", () => {
            const wrapper = mount(FieldDescription);
            expect(wrapper.attributes("data-slot")).toBe("field-description");
        });

        scopedIt("applies muted text and supporting text size classes", () => {
            const wrapper = mount(FieldDescription);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("text-[length:var(--vueda-text-supporting)]");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldDescription, { props: { class: "my-desc" } });
            expect(wrapper.classes()).toContain("my-desc");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FieldDescription, { slots: { default: "Helper text." } });
            expect(wrapper.text()).toBe("Helper text.");
        });
    });

    describe("FieldMessage", () => {
        scopedIt("renders nothing when no messages and no slot", () => {
            const wrapper = mount(FieldMessage);
            expect(wrapper.find('[data-slot="field-message"]').exists()).toBe(false);
        });

        scopedIt("renders when messages array has one entry", () => {
            const wrapper = mount(FieldMessage, { props: { messages: ["Required"] } });
            expect(wrapper.find('[data-slot="field-message"]').exists()).toBe(true);
            expect(wrapper.text()).toBe("Required");
        });

        scopedIt("renders a list when messages array has multiple entries", () => {
            const wrapper = mount(FieldMessage, { props: { messages: ["Too short", "Invalid format"] } });
            expect(wrapper.findAll("li")).toHaveLength(2);
        });

        scopedIt("deduplicates identical messages", () => {
            const wrapper = mount(FieldMessage, { props: { messages: ["Required", "Required"] } });
            expect(wrapper.text()).toBe("Required");
            expect(wrapper.findAll("li")).toHaveLength(0);
        });

        scopedIt("renders slot content instead of messages when slot is provided", () => {
            const wrapper = mount(FieldMessage, {
                props: { messages: ["Required"] },
                slots: { default: "<span>Custom error</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
            expect(wrapper.text()).toBe("Custom error");
        });

        scopedIt("defaults to severity=error with role=alert", () => {
            const wrapper = mount(FieldMessage, { props: { messages: ["Oops"] } });
            const el = wrapper.find('[data-slot="field-message"]');
            expect(el.attributes("role")).toBe("alert");
            expect(el.attributes("data-severity")).toBe("error");
        });

        scopedIt("applies text-destructive class for error severity", () => {
            const wrapper = mount(FieldMessage, { props: { messages: ["Bad"] } });
            expect(wrapper.find('[data-slot="field-message"]').classes()).toContain("text-destructive");
        });

        scopedIt("uses role=status and text-warning for warning severity", () => {
            const wrapper = mount(FieldMessage, { props: { messages: ["Watch out"], severity: "warning" } });
            const el = wrapper.find('[data-slot="field-message"]');
            expect(el.attributes("role")).toBe("status");
            expect(el.attributes("data-severity")).toBe("warning");
            expect(el.classes()).toContain("text-warning");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldMessage, {
                props: { class: "my-error", messages: ["x"] },
            });
            expect(wrapper.find('[data-slot="field-message"]').classes()).toContain("my-error");
        });

        scopedIt("accepts message objects with message property", () => {
            const wrapper = mount(FieldMessage, {
                props: { messages: [{ message: "Object error" }] },
            });
            expect(wrapper.text()).toBe("Object error");
        });
    });

    describe("FieldLegend", () => {
        scopedIt("renders as a legend element", () => {
            const wrapper = mount(FieldLegend);
            expect(wrapper.element.tagName).toBe("LEGEND");
        });

        scopedIt("has data-slot=field-legend", () => {
            const wrapper = mount(FieldLegend);
            expect(wrapper.attributes("data-slot")).toBe("field-legend");
        });

        scopedIt("applies font-medium class", () => {
            const wrapper = mount(FieldLegend);
            expect(wrapper.classes()).toContain("font-medium");
        });

        scopedIt("reflects variant in data-variant attribute", () => {
            const wrapper = mount(FieldLegend, { props: { variant: "legend" } });
            expect(wrapper.attributes("data-variant")).toBe("legend");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldLegend, { props: { class: "my-legend" } });
            expect(wrapper.classes()).toContain("my-legend");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FieldLegend, { slots: { default: "Section title" } });
            expect(wrapper.text()).toBe("Section title");
        });
    });

    describe("FieldSet", () => {
        scopedIt("renders as a fieldset element", () => {
            const wrapper = mount(FieldSet);
            expect(wrapper.element.tagName).toBe("FIELDSET");
        });

        scopedIt("has data-slot=field-set", () => {
            const wrapper = mount(FieldSet);
            expect(wrapper.attributes("data-slot")).toBe("field-set");
        });

        scopedIt("applies flex-col and gap-6 classes", () => {
            const wrapper = mount(FieldSet);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("gap-6");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldSet, { props: { class: "my-fieldset" } });
            expect(wrapper.classes()).toContain("my-fieldset");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FieldSet, { slots: { default: "<legend>Group</legend>" } });
            expect(wrapper.find("legend").exists()).toBe(true);
        });
    });

    describe("FieldSeparator", () => {
        scopedIt("has data-slot=field-separator", () => {
            const wrapper = mount(FieldSeparator);
            expect(wrapper.find('[data-slot="field-separator"]').exists()).toBe(true);
        });

        scopedIt("applies relative and h-5 classes", () => {
            const wrapper = mount(FieldSeparator);
            const el = wrapper.find('[data-slot="field-separator"]');
            expect(el.classes()).toContain("relative");
            expect(el.classes()).toContain("h-5");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(FieldSeparator, { props: { class: "my-sep" } });
            expect(wrapper.find('[data-slot="field-separator"]').classes()).toContain("my-sep");
        });

        scopedIt("does not render separator content when no slot", () => {
            const wrapper = mount(FieldSeparator);
            expect(wrapper.find('[data-slot="field-separator-content"]').exists()).toBe(false);
        });

        scopedIt("renders separator content span when slot is provided", () => {
            const wrapper = mount(FieldSeparator, { slots: { default: "or" } });
            expect(wrapper.find('[data-slot="field-separator-content"]').exists()).toBe(true);
            expect(wrapper.find('[data-slot="field-separator-content"]').text()).toBe("or");
        });
    });
});
