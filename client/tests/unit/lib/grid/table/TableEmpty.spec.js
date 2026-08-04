import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import TableEmpty from "@vueda/grid/table/TableEmpty.vue";

const mountInTable = (props = {}, slot = "no rows") => {
    return mount(TableEmpty, {
        props,
        slots: { default: slot },
        attachTo: document.body,
        global: { stubs: {} },
    });
};

describe("lib/grid/table/TableEmpty.vue", () => {
    describe("rendering", () => {
        scopedIt("emits a TableRow > TableCell > content div tree", () => {
            const wrapper = mountInTable({ colspan: 4 });
            const row = wrapper.find('[data-slot="table-row"]');
            expect(row.exists()).toBe(true);
            const cell = row.find('[data-slot="table-cell"]');
            expect(cell.exists()).toBe(true);
            expect(cell.attributes("colspan")).toBe("4");
        });
    });

    describe("variant prop", () => {
        scopedIt("defaults to data-variant=empty on the content wrapper", () => {
            const wrapper = mountInTable();
            const content = wrapper.find('[data-slot="table-cell"] > div');
            expect(content.attributes("data-variant")).toBe("empty");
        });

        scopedIt.each(["empty", "loading", "error", "filtered"])(
            "propagates data-variant=%s to the content wrapper",
            (variant) => {
                const wrapper = mountInTable({ variant });
                const content = wrapper.find('[data-slot="table-cell"] > div');
                expect(content.attributes("data-variant")).toBe(variant);
            },
        );
    });
});
