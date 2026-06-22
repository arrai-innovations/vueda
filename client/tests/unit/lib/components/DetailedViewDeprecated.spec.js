import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const DetailViewStub = defineComponent({
    name: "DetailViewStub",
    setup(_, { attrs, slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "detail-view",
                    ...attrs,
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});

vi.mock("@vueda/components/DetailView.vue", () => ({
    default: DetailViewStub,
}));

describe("lib/components/DetailedView.vue", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    let DetailedView;

    beforeEach(async () => {
        delete globalThis.__VUEDA_DETAILED_VIEW_DEPRECATION_WARNED__;
        warnSpy.mockClear();
        DetailedView = (await import("@vueda/components/DetailedView.vue")).default;
    });

    afterAll(() => {
        warnSpy.mockRestore();
    });

    scopedIt("warns once in development and forwards attrs and slots", () => {
        const wrapperOne = mount(DetailedView, {
            attrs: { app: "myApp", model: "myModel", pk: "123", viewName: "read", foo: "bar" },
            slots: { header: "<span>header</span>" },
        });
        const wrapperTwo = mount(DetailedView, {
            attrs: { app: "myApp", model: "myModel", pk: "123", viewName: "read" },
        });

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("DetailedView is deprecated");
        expect(warnSpy.mock.calls[0][0]).toContain("@vueda/components/DetailView.vue");

        const dvOne = wrapperOne.get('[data-qa="detail-view"]');
        const dvTwo = wrapperTwo.get('[data-qa="detail-view"]');
        expect(dvOne.attributes("foo")).toBe("bar");
        expect(dvTwo.attributes("viewname")).toBe("read");
        expect(dvOne.find('[data-slot="header"]').text()).toBe("header");
    });
});
