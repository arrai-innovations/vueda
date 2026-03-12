import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import NavigationPagination from "@vueda/navigation/pagination/NavigationPagination.vue";
import NavigationPaginationContent from "@vueda/navigation/pagination/NavigationPaginationContent.vue";
import NavigationPaginationEllipsis from "@vueda/navigation/pagination/NavigationPaginationEllipsis.vue";
import NavigationPaginationFirst from "@vueda/navigation/pagination/NavigationPaginationFirst.vue";
import NavigationPaginationItem from "@vueda/navigation/pagination/NavigationPaginationItem.vue";
import NavigationPaginationLast from "@vueda/navigation/pagination/NavigationPaginationLast.vue";
import NavigationPaginationNext from "@vueda/navigation/pagination/NavigationPaginationNext.vue";
import NavigationPaginationPrevious from "@vueda/navigation/pagination/NavigationPaginationPrevious.vue";

// Pagination primitives require context from PaginationRoot.
// Stub them as passthrough divs so each wrapper's own contribution can be tested in isolation.
vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const makePassthrough = (name) =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({}) : undefined);
            },
        });
    return {
        ...actual,
        PaginationRoot: makePassthrough("PaginationRoot"),
        PaginationList: makePassthrough("PaginationList"),
        PaginationListItem: makePassthrough("PaginationListItem"),
        PaginationFirst: makePassthrough("PaginationFirst"),
        PaginationPrev: makePassthrough("PaginationPrev"),
        PaginationNext: makePassthrough("PaginationNext"),
        PaginationLast: makePassthrough("PaginationLast"),
        PaginationEllipsis: makePassthrough("PaginationEllipsis"),
    };
});

describe("lib/navigation/pagination/NavigationPagination.vue", () => {
    describe("NavigationPagination", () => {
        scopedIt("has data-slot=pagination", () => {
            const wrapper = mount(NavigationPagination);
            expect(wrapper.attributes("data-slot")).toBe("pagination");
        });

        scopedIt("applies base layout classes", () => {
            const wrapper = mount(NavigationPagination);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("justify-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NavigationPagination, { props: { class: "my-pagination" } });
            expect(wrapper.classes()).toContain("my-pagination");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(NavigationPagination, { slots: { default: "<span>pages</span>" } });
            expect(wrapper.text()).toBe("pages");
        });
    });

    describe("NavigationPaginationContent", () => {
        scopedIt("has data-slot=pagination-content", () => {
            const wrapper = mount(NavigationPaginationContent);
            expect(wrapper.attributes("data-slot")).toBe("pagination-content");
        });

        scopedIt("applies base flex and gap classes", () => {
            const wrapper = mount(NavigationPaginationContent);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("gap-1");
        });
    });

    describe("NavigationPaginationItem", () => {
        scopedIt("has data-slot=pagination-item", () => {
            const wrapper = mount(NavigationPaginationItem);
            expect(wrapper.attributes("data-slot")).toBe("pagination-item");
        });

        scopedIt("applies ghost variant when not active", () => {
            const wrapper = mount(NavigationPaginationItem, { props: { isActive: false } });
            expect(wrapper.classes()).toContain("hover:bg-accent");
        });

        scopedIt("applies outline variant when active", () => {
            const wrapper = mount(NavigationPaginationItem, { props: { isActive: true } });
            expect(wrapper.classes()).toContain("border");
            expect(wrapper.classes()).toContain("bg-background");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(NavigationPaginationItem, { slots: { default: "5" } });
            expect(wrapper.text()).toBe("5");
        });
    });

    describe("NavigationPaginationFirst", () => {
        scopedIt("has data-slot=pagination-first", () => {
            const wrapper = mount(NavigationPaginationFirst);
            expect(wrapper.attributes("data-slot")).toBe("pagination-first");
        });

        scopedIt("applies ghost button classes", () => {
            const wrapper = mount(NavigationPaginationFirst);
            expect(wrapper.classes()).toContain("hover:bg-accent");
        });

        scopedIt("renders First label in default slot", () => {
            const wrapper = mount(NavigationPaginationFirst);
            expect(wrapper.text()).toContain("First");
        });
    });

    describe("NavigationPaginationPrevious", () => {
        scopedIt("has data-slot=pagination-previous", () => {
            const wrapper = mount(NavigationPaginationPrevious);
            expect(wrapper.attributes("data-slot")).toBe("pagination-previous");
        });

        scopedIt("renders Previous label in default slot", () => {
            const wrapper = mount(NavigationPaginationPrevious);
            expect(wrapper.text()).toContain("Previous");
        });
    });

    describe("NavigationPaginationNext", () => {
        scopedIt("has data-slot=pagination-next", () => {
            const wrapper = mount(NavigationPaginationNext);
            expect(wrapper.attributes("data-slot")).toBe("pagination-next");
        });

        scopedIt("renders Next label in default slot", () => {
            const wrapper = mount(NavigationPaginationNext);
            expect(wrapper.text()).toContain("Next");
        });
    });

    describe("NavigationPaginationLast", () => {
        scopedIt("has data-slot=pagination-last", () => {
            const wrapper = mount(NavigationPaginationLast);
            expect(wrapper.attributes("data-slot")).toBe("pagination-last");
        });

        scopedIt("renders Last label in default slot", () => {
            const wrapper = mount(NavigationPaginationLast);
            expect(wrapper.text()).toContain("Last");
        });
    });

    describe("NavigationPaginationEllipsis", () => {
        scopedIt("has data-slot=pagination-ellipsis", () => {
            const wrapper = mount(NavigationPaginationEllipsis);
            expect(wrapper.attributes("data-slot")).toBe("pagination-ellipsis");
        });
    });
});
