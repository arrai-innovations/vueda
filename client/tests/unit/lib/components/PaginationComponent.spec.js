import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock({ slotResolver: () => "t" }),
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

    describe("Page navigation and loading", () => {
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
            expect(wrapper.text()).toContain("Page 1 of 5");
        });

        scopedIt("displays loading page report when loading", () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 1, rows: 10, loading: true },
            });
            expect(wrapper.text()).toContain("Page 1 of ?");
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
    });

    describe("Range read-out", () => {
        scopedIt("shows the showing X to Y of N range", () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 2, rows: 10 },
            });
            expect(wrapper.text()).toContain("Showing 11 to 20 of 50");
        });

        scopedIt("clamps the range end to the total on the last page", () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 42, currentPage: 5, rows: 10 },
            });
            expect(wrapper.text()).toContain("Showing 41 to 42 of 42");
        });

        scopedIt("shows an all-results read-out when perPage is 'all'", () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 1, rows: 10, perPage: "all" },
            });
            expect(wrapper.text()).toContain("All 50 results");
        });

        scopedIt("hides the read-out when showTotalRecordNum is false", () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 1, rows: 10, showTotalRecordNum: false },
            });
            expect(wrapper.text()).not.toContain("Showing");
        });
    });

    describe("Rows-per-page selector", () => {
        scopedIt("renders the supplied page-size options including All", () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 1, rows: 25, perPage: 25, pageSizeOptions: [25, 50, "all"] },
            });
            const optionText = wrapper.findAll("option").map((o) => o.text());
            expect(optionText).toEqual(["25", "50", "All"]);
        });

        scopedIt("emits a numeric update:perPage when a size is chosen", async () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 1, rows: 25, perPage: 25, pageSizeOptions: [25, 50, "all"] },
            });
            await wrapper.find("select").setValue("50");
            expect(wrapper.emitted()["update:perPage"][0]).toEqual([50]);
        });

        scopedIt("emits the 'all' sentinel when All is chosen", async () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 1, rows: 25, perPage: 25, pageSizeOptions: [25, 50, "all"] },
            });
            await wrapper.find("select").setValue("all");
            expect(wrapper.emitted()["update:perPage"][0]).toEqual(["all"]);
        });

        scopedIt("hides the paginator when perPage is 'all'", () => {
            const wrapper = mount(PaginationComponent, {
                props: { totalRecords: 50, currentPage: 1, rows: 10, perPage: "all" },
            });
            expect(wrapper.find('[data-slot="pagination"]').exists()).toBe(false);
        });
    });
});
