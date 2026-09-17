import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Pagination from "@vueda/navigation/pagination/Pagination.vue";
import PaginationBar from "@vueda/navigation/pagination/PaginationBar.vue";
import PaginationContent from "@vueda/navigation/pagination/PaginationContent.vue";
import PaginationEllipsis from "@vueda/navigation/pagination/PaginationEllipsis.vue";
import PaginationFirst from "@vueda/navigation/pagination/PaginationFirst.vue";
import PaginationItem from "@vueda/navigation/pagination/PaginationItem.vue";
import PaginationLast from "@vueda/navigation/pagination/PaginationLast.vue";
import PaginationMeta from "@vueda/navigation/pagination/PaginationMeta.vue";
import PaginationNext from "@vueda/navigation/pagination/PaginationNext.vue";
import PaginationPrevious from "@vueda/navigation/pagination/PaginationPrevious.vue";

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

describe("lib/navigation/pagination/Pagination.vue", () => {
    describe("Pagination", () => {
        scopedIt("has data-slot=pagination", () => {
            const wrapper = mount(Pagination);
            expect(wrapper.attributes("data-slot")).toBe("pagination");
        });

        scopedIt("applies base layout classes", () => {
            const wrapper = mount(Pagination);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("justify-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(Pagination, { props: { class: "my-pagination" } });
            expect(wrapper.classes()).toContain("my-pagination");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Pagination, { slots: { default: "<span>pages</span>" } });
            expect(wrapper.text()).toBe("pages");
        });
    });

    describe("PaginationContent", () => {
        scopedIt("has data-slot=pagination-content", () => {
            const wrapper = mount(PaginationContent);
            expect(wrapper.attributes("data-slot")).toBe("pagination-content");
        });

        scopedIt("applies base flex and gap classes", () => {
            const wrapper = mount(PaginationContent);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("gap-1");
        });
    });

    describe("PaginationItem", () => {
        scopedIt("has data-slot=pagination-item", () => {
            const wrapper = mount(PaginationItem);
            expect(wrapper.attributes("data-slot")).toBe("pagination-item");
        });

        scopedIt("applies ghost variant when not active", () => {
            const wrapper = mount(PaginationItem, { props: { isActive: false } });
            expect(wrapper.classes()).toContain("hover:bg-accent");
        });

        scopedIt("applies outline variant when active", () => {
            const wrapper = mount(PaginationItem, { props: { isActive: true } });
            expect(wrapper.classes()).toContain("hairline");
            expect(wrapper.classes()).toContain("hairline-border-strong");
            expect(wrapper.classes()).toContain("bg-background");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(PaginationItem, { slots: { default: "5" } });
            expect(wrapper.text()).toBe("5");
        });
    });

    describe("PaginationFirst", () => {
        scopedIt("has data-slot=pagination-first", () => {
            const wrapper = mount(PaginationFirst);
            expect(wrapper.attributes("data-slot")).toBe("pagination-first");
        });

        scopedIt("applies outline button classes", () => {
            const wrapper = mount(PaginationFirst);
            expect(wrapper.classes()).toContain("hairline");
            expect(wrapper.classes()).toContain("hairline-border-strong");
            expect(wrapper.classes()).toContain("bg-background");
        });

        scopedIt("applies the compact square size", () => {
            const wrapper = mount(PaginationFirst);
            expect(wrapper.classes()).toContain("size-vueda-control-sm");
        });

        scopedIt("renders First as an sr-only label in default slot", () => {
            const wrapper = mount(PaginationFirst);
            expect(wrapper.text()).toContain("First");
            expect(wrapper.find("span.sr-only").text()).toBe("First");
        });
    });

    describe("PaginationPrevious", () => {
        scopedIt("has data-slot=pagination-previous", () => {
            const wrapper = mount(PaginationPrevious);
            expect(wrapper.attributes("data-slot")).toBe("pagination-previous");
        });

        scopedIt("renders Previous label in default slot", () => {
            const wrapper = mount(PaginationPrevious);
            expect(wrapper.text()).toContain("Previous");
        });
    });

    describe("PaginationNext", () => {
        scopedIt("has data-slot=pagination-next", () => {
            const wrapper = mount(PaginationNext);
            expect(wrapper.attributes("data-slot")).toBe("pagination-next");
        });

        scopedIt("renders Next label in default slot", () => {
            const wrapper = mount(PaginationNext);
            expect(wrapper.text()).toContain("Next");
        });
    });

    describe("PaginationLast", () => {
        scopedIt("has data-slot=pagination-last", () => {
            const wrapper = mount(PaginationLast);
            expect(wrapper.attributes("data-slot")).toBe("pagination-last");
        });

        scopedIt("renders Last label in default slot", () => {
            const wrapper = mount(PaginationLast);
            expect(wrapper.text()).toContain("Last");
        });
    });

    describe("PaginationEllipsis", () => {
        scopedIt("has data-slot=pagination-ellipsis", () => {
            const wrapper = mount(PaginationEllipsis);
            expect(wrapper.attributes("data-slot")).toBe("pagination-ellipsis");
        });
    });

    describe("PaginationBar", () => {
        scopedIt("has data-slot=pagination-bar", () => {
            const wrapper = mount(PaginationBar);
            expect(wrapper.attributes("data-slot")).toBe("pagination-bar");
        });

        scopedIt("applies bar chrome classes", () => {
            const wrapper = mount(PaginationBar);
            const classes = wrapper.classes();
            expect(classes).toContain("flex");
            expect(classes).toContain("justify-between");
            expect(classes).toContain("border-t-hairline");
            expect(classes).toContain("bg-card");
            expect(classes).toContain("rounded-b-vueda-card");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(PaginationBar, { props: { class: "my-bar" } });
            expect(wrapper.classes()).toContain("my-bar");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(PaginationBar, { slots: { default: "<span>meta</span>" } });
            expect(wrapper.text()).toBe("meta");
        });
    });

    describe("PaginationMeta", () => {
        scopedIt("has data-slot=pagination-meta", () => {
            const wrapper = mount(PaginationMeta);
            expect(wrapper.attributes("data-slot")).toBe("pagination-meta");
        });

        scopedIt("applies mono supporting-text classes", () => {
            const wrapper = mount(PaginationMeta);
            const classes = wrapper.classes();
            expect(classes).toContain("font-mono");
            expect(classes).toContain("text-muted-foreground");
            expect(classes).toContain("whitespace-nowrap");
            expect(classes.some((c) => c.includes("--vueda-text-supporting"))).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(PaginationMeta, { slots: { default: "441 invoices" } });
            expect(wrapper.text()).toBe("441 invoices");
        });
    });
});
