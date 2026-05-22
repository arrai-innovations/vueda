import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import TableRowActions from "@vueda/grid/table/TableRowActions.vue";

describe("lib/grid/table/TableRowActions.vue", () => {
    describe("rendering", () => {
        scopedIt("renders a span with data-slot=table-row-actions", () => {
            const wrapper = mount(TableRowActions);
            expect(wrapper.element.tagName).toBe("SPAN");
            expect(wrapper.attributes("data-slot")).toBe("table-row-actions");
        });

        scopedIt("starts hidden via the invisible utility", () => {
            const wrapper = mount(TableRowActions);
            expect(wrapper.classes()).toContain("invisible");
        });

        scopedIt("becomes visible inside a hovered/focused/selected <tr>", () => {
            const wrapper = mount(TableRowActions);
            const cls = wrapper.classes().join(" ");
            expect(cls).toContain("[tr:hover_&]:visible");
            expect(cls).toContain("[tr:focus-within_&]:visible");
            expect(cls).toContain("[tr[data-state=selected]_&]:visible");
        });

        scopedIt("exposes actionClass via slot props", () => {
            const wrapper = mount(TableRowActions, {
                slots: {
                    default: `<template #default="{ actionClass }"><button class="action-button" :data-action-class="actionClass">A</button></template>`,
                },
            });
            const button = wrapper.find("button.action-button");
            expect(button.attributes("data-action-class")).toContain("size-6");
        });
    });
});
