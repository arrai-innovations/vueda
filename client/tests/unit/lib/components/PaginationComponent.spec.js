import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const PaginatorStub = defineComponent({
    name: "PaginatorStub",
    props: ["first", "rows", "currentPageReportTemplate", "totalRecords"],
    emits: ["page", "update:first"],
    setup(props, { attrs }) {
        return () =>
            h("div", {
                "data-qa": "paginator",
                "data-first": props.first,
                "data-rows": props.rows,
                "data-template": props.currentPageReportTemplate,
                "data-total-records": props.totalRecords,
                ...attrs,
            });
    },
});

vi.mock("primevue/paginator", () => ({ default: PaginatorStub }));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: vi.fn(() => () => "t"),
    THEME_OVERRIDE_PROPS: {},
}));

describe("lib/components/PaginationComponent.vue", () => {
    let PaginationComponent, vue;

    beforeEach(async () => {
        PaginationComponent = (await import("@vueda/components/PaginationComponent.vue")).default;
        vue = await import("vue");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("emits update:currentPage when page changes", () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10 },
        });
        const paginator = wrapper.getComponent(PaginatorStub);
        paginator.vm.$emit("page", { first: 20, rows: 10 });
        expect(wrapper.emitted()["update:currentPage"][0]).toEqual([3]);
    });

    scopedIt("uses correct template strings", () => {
        const wrapper1 = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10 },
        });
        expect(wrapper1.getComponent(PaginatorStub).props("currentPageReportTemplate")).toBe(
            "{currentPage} of {totalPages}",
        );

        const wrapper2 = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10, loading: true },
        });
        expect(wrapper2.getComponent(PaginatorStub).props("currentPageReportTemplate")).toBe("{currentPage} of ?");
    });

    scopedIt("computes totalRecords from offset when loading", async () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10, loading: true },
        });
        const paginator = wrapper.getComponent(PaginatorStub);
        expect(paginator.attributes("data-total-records")).toBe("1");
        paginator.vm.$emit("update:first", 10);
        await vue.nextTick();
        expect(wrapper.getComponent(PaginatorStub).attributes("data-total-records")).toBe("11");
    });
});
