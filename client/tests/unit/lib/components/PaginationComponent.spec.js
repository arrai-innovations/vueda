import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: vi.fn(() => () => "t"),
    THEME_OVERRIDE_PROPS: {},
}));

describe("lib/components/PaginationComponent.vue", () => {
    let PaginationComponent;

    beforeEach(async () => {
        PaginationComponent = (await import("@vueda/components/PaginationComponent.vue")).default;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("emits update:currentPage when navigating to next page", async () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10 },
        });
        const nextButton = wrapper.find('[data-slot="pagination-next"]');
        await nextButton.trigger("click");
        expect(wrapper.emitted()["update:currentPage"][0]).toEqual([2]);
    });

    scopedIt("displays correct page report text", () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10 },
        });
        expect(wrapper.text()).toContain("1 of 5");
    });

    scopedIt("displays loading page report when loading", () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10, loading: true },
        });
        expect(wrapper.text()).toContain("1 of ?");
    });

    scopedIt("disables navigation buttons when loading", () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 2, rows: 10, loading: true },
        });
        const navButtons = wrapper.findAll('[data-slot="pagination-content"] button');
        expect(navButtons.length).toBeGreaterThan(0);
        navButtons.forEach((button) => {
            expect(button.attributes("disabled")).toBeDefined();
        });
    });

    scopedIt("hides paginator when showingAllPages is true", () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10, showingAllPages: true },
        });
        expect(wrapper.find('[data-slot="pagination"]').exists()).toBe(false);
    });

    scopedIt("shows 'Show All Pages' button when there are multiple pages", () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10 },
        });
        expect(wrapper.text()).toContain("Show All Pages");
    });

    scopedIt("emits update:showingAllPages when 'Show All Pages' is clicked", async () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10 },
        });
        const showAllButton = wrapper.findAll("button").find((b) => b.text().includes("Show All Pages"));
        await showAllButton.trigger("click");
        expect(wrapper.emitted()["update:showingAllPages"][0]).toEqual([true]);
    });

    scopedIt("hides total record count when showTotalRecordNum is false", () => {
        const wrapper = mount(PaginationComponent, {
            props: { totalRecords: 50, currentPage: 1, rows: 10, showTotalRecordNum: false },
        });
        expect(wrapper.text()).not.toContain("total results");
    });
});
