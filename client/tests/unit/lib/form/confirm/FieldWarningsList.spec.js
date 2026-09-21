import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FieldWarningsList from "@vueda/form/confirm/FieldWarningsList.vue";

describe("lib/form/confirm/FieldWarningsList.vue", () => {
    describe("Default rendering", () => {
        scopedIt("renders non_field_errors as a plain, unlabeled list", () => {
            const wrapper = mount(FieldWarningsList, {
                props: { messages: { non_field_errors: ["Heads up.", "Also this."] } },
            });
            expect(wrapper.find('[data-qa="form-confirm-warning-field"]').exists()).toBe(false);
            const items = wrapper.findAll('[data-qa="form-confirm-warning"]');
            expect(items).toHaveLength(2);
            expect(items[0].text()).toBe("Heads up.");
            expect(items[1].text()).toBe("Also this.");
        });

        scopedIt("renders a single-message field inline as 'label: message', with no separate list", () => {
            const wrapper = mount(FieldWarningsList, {
                props: { messages: { count: ["A negative count is unusual."] } },
            });
            expect(wrapper.find("ul").exists()).toBe(false);
            const item = wrapper.get('[data-qa="form-confirm-warning"]');
            expect(item.text()).toBe("Count: A negative count is unusual.");
        });

        scopedIt("renders a multi-message field as a sub-header plus its own list", () => {
            const wrapper = mount(FieldWarningsList, {
                props: { messages: { count: ["First issue.", "Second issue."] } },
            });
            const header = wrapper.get('[data-qa="form-confirm-warning-field"]');
            expect(header.text()).toBe("Count");
            const items = wrapper.findAll('[data-qa="form-confirm-warning"]');
            expect(items).toHaveLength(2);
            expect(items[0].text()).toBe("First issue.");
            expect(items[1].text()).toBe("Second issue.");
        });

        scopedIt("coerces a non-array message value into a single-message field", () => {
            const wrapper = mount(FieldWarningsList, {
                props: { messages: { count: "A lone string message." } },
            });
            expect(wrapper.get('[data-qa="form-confirm-warning"]').text()).toBe("Count: A lone string message.");
        });

        scopedIt("names a field by its label from fieldDetails", () => {
            const wrapper = mount(FieldWarningsList, {
                props: {
                    messages: { quantity_on_hand: ["Above the maximum."] },
                    fieldDetails: { quantity_on_hand: { label: "Units in stock" } },
                },
            });
            expect(wrapper.get('[data-qa="form-confirm-warning"]').text()).toBe("Units in stock: Above the maximum.");
        });

        scopedIt("falls back to the start-cased field name when fieldDetails has no entry", () => {
            const wrapper = mount(FieldWarningsList, {
                props: {
                    messages: { expected_arrival_date: ["Earlier than the lead time."] },
                    fieldDetails: { some_other_field: { label: "Elsewhere" } },
                },
            });
            expect(wrapper.get('[data-qa="form-confirm-warning"]').text()).toBe(
                "Expected Arrival Date: Earlier than the lead time.",
            );
        });

        scopedIt("leaves non_field_errors unlabelled even when fieldDetails names it", () => {
            const wrapper = mount(FieldWarningsList, {
                props: {
                    messages: { non_field_errors: ["Form issue."] },
                    fieldDetails: { non_field_errors: { label: "Should not appear" } },
                },
            });
            expect(wrapper.find('[data-qa="form-confirm-warning-field"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="form-confirm-warning"]').text()).toBe("Form issue.");
        });

        scopedIt("sorts non_field_errors before other fields regardless of key order", () => {
            const wrapper = mount(FieldWarningsList, {
                props: { messages: { count: ["field issue"], non_field_errors: ["form issue"] } },
            });
            const text = wrapper.text();
            expect(text.indexOf("form issue")).toBeLessThan(text.indexOf("field issue"));
        });

        scopedIt("renders nothing for an empty messages mapping", () => {
            const wrapper = mount(FieldWarningsList, { props: { messages: {} } });
            expect(wrapper.find('[data-qa="form-confirm-warning"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="field-warnings-list"]').exists()).toBe(true);
        });
    });

    describe("entry slot", () => {
        scopedIt("overrides one field's entire layout, receiving field and messages", () => {
            const wrapper = mount(FieldWarningsList, {
                props: { messages: { count: ["A negative count is unusual."], non_field_errors: ["Heads up."] } },
                slots: {
                    entry: `<template #entry="{ field, messages }">
                        <div data-qa="custom-entry" :data-field="field">{{ messages.join(" | ") }}</div>
                    </template>`,
                },
            });
            expect(wrapper.find('[data-qa="form-confirm-warning"]').exists()).toBe(false);
            const entries = wrapper.findAll('[data-qa="custom-entry"]');
            expect(entries).toHaveLength(2);
            // non_field_errors sorts first, so it is the first custom entry rendered.
            expect(entries[0].attributes("data-field")).toBe("non_field_errors");
            expect(entries[0].text()).toBe("Heads up.");
            expect(entries[1].attributes("data-field")).toBe("count");
            expect(entries[1].text()).toBe("A negative count is unusual.");
        });
    });

    describe("class passthrough", () => {
        scopedIt("merges a custom class onto the root alongside the theme's root class", () => {
            const wrapper = mount(FieldWarningsList, {
                props: { messages: { count: ["x"] }, class: "my-custom-class" },
            });
            expect(wrapper.classes()).toContain("my-custom-class");
        });
    });
});
