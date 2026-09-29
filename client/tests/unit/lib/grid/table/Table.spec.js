import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Table from "@vueda/grid/table/Table.vue";

describe("lib/grid/table/Table.vue", () => {
    describe("rendering", () => {
        scopedIt("renders a frame around a scroll container wrapping a <table>", () => {
            const wrapper = mount(Table);
            expect(wrapper.element.tagName).toBe("DIV");
            expect(wrapper.attributes("data-slot")).toBe("table-frame");
            const container = wrapper.find('[data-slot="table-container"]');
            expect(container.element.parentElement).toBe(wrapper.element);
            expect(container.find("table").exists()).toBe(true);
            expect(container.find("table").attributes("data-slot")).toBe("table");
        });
    });

    describe("sticky prop", () => {
        scopedIt("does not set data-sticky by default", () => {
            const wrapper = mount(Table);
            expect(wrapper.find('[data-slot="table-container"]').attributes("data-sticky")).toBeUndefined();
        });

        scopedIt("sets data-sticky on the scroll container, not the frame, when sticky is true", () => {
            const wrapper = mount(Table, { props: { sticky: true } });
            expect(wrapper.find('[data-slot="table-container"]').attributes("data-sticky")).toBe("");
            expect(wrapper.attributes("data-sticky")).toBeUndefined();
        });
    });

    describe("density prop", () => {
        scopedIt("does not set data-density by default", () => {
            const wrapper = mount(Table);
            expect(wrapper.find("table").attributes("data-density")).toBeUndefined();
        });

        scopedIt.each(["default", "compact", "condensed"])("sets data-density=%s on the table element", (density) => {
            const wrapper = mount(Table, { props: { density } });
            expect(wrapper.find("table").attributes("data-density")).toBe(density);
        });
    });
});
