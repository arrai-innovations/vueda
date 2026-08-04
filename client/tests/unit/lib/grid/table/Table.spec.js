import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Table from "@vueda/grid/table/Table.vue";

describe("lib/grid/table/Table.vue", () => {
    describe("rendering", () => {
        scopedIt("renders a container div wrapping a <table>", () => {
            const wrapper = mount(Table);
            expect(wrapper.element.tagName).toBe("DIV");
            expect(wrapper.attributes("data-slot")).toBe("table-container");
            expect(wrapper.find("table").exists()).toBe(true);
            expect(wrapper.find("table").attributes("data-slot")).toBe("table");
        });
    });

    describe("sticky prop", () => {
        scopedIt("does not set data-sticky by default", () => {
            const wrapper = mount(Table);
            expect(wrapper.attributes("data-sticky")).toBeUndefined();
        });

        scopedIt("sets data-sticky on the container when sticky is true", () => {
            const wrapper = mount(Table, { props: { sticky: true } });
            expect(wrapper.attributes("data-sticky")).toBe("");
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
