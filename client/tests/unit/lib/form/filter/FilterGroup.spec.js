import { scopedIt } from "@tests/unit/utils.js";
import { config, mount } from "@vue/test-utils";
import { defineComponent, h, reactive, ref } from "vue";

const FilterMenuStub = defineComponent({
    name: "FilterMenuStub",
    props: ["filterables", "filterableDetails", "query", "triggerTarget"],
    emits: ["hide-filter-form"],
    setup(props) {
        return () => h("div", { "data-qa": "filter-menu", "data-count": props.filterables?.length ?? 0 });
    },
});

const FilterChipStub = defineComponent({
    name: "FilterChipStub",
    props: ["filter", "filterDetails", "query", "errored"],
    emits: ["hide-filter-form"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "filter-chip",
                "data-field": props.filter?.field,
                "data-errored": props.errored ? "true" : undefined,
            });
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["tone", "emphasis"],
    inheritAttrs: false,
    emits: ["click"],
    setup(props, { emit, slots, attrs }) {
        return () =>
            h(
                "button",
                { ...attrs, "data-tone": props.tone, "data-emphasis": props.emphasis, onClick: () => emit("click") },
                slots.default?.(),
            );
    },
});

const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "error-display" }, slots.default ? slots.default() : null);
    },
});

// FilterGroup only calls useFilter() for its side effects (field/widget component resolution and
// the FilterModelSymbol provide for descendants).
const mockedUseFilter = vi.fn();
const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "theme" });

const route = reactive({ query: {} });

vi.mock("@vueda/form/filter/FilterMenu.vue", () => ({ default: FilterMenuStub }));
vi.mock("@vueda/form/filter/FilterChip.vue", () => ({ default: FilterChipStub }));
vi.mock("@vueda/display/error-display/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/use/useFilter.js", () => ({ useFilter: mockedUseFilter }));
vi.mock("@vueda/use/useTheme.js", async () => {
    const actual = await vi.importActual("@vueda/use/useTheme.js");
    return { ...actual, useTheme: mockedUseTheme };
});
vi.mock("vue-router", () => ({ useRoute: () => route }));

let FilterGroup, ListFilterError, vue;

function mountGroup(props = {}) {
    const addedFilters = ref(props.modelValue ?? []);
    const wrapper = mount(FilterGroup, {
        props: {
            app: "a",
            model: "m",
            view: "list",
            filterables: ["foo"],
            filterableDetails: { foo: { typeFilter: "CharField" } },
            validFilterables: ["foo"],
            modelValue: addedFilters.value,
            "onUpdate:modelValue": (v) => (addedFilters.value = v),
            ...props,
        },
    });
    return { wrapper, addedFilters };
}

describe("lib/form/filter/FilterGroup.vue", () => {
    let previousStubs;

    beforeEach(async () => {
        vue = await import("vue");
        FilterGroup = (await import("@vueda/form/filter/FilterGroup.vue")).default;
        // Imported from the same (post-resetModules) registry as FilterGroup, so `instanceof
        // ListFilterError` checks inside the component agree with instances built in tests.
        ListFilterError = (await import("@vueda/utils/errors.js")).ListFilterError;
        route.query = {};
        previousStubs = config.global.stubs;
        config.global.stubs = { ...previousStubs, "router-link": true };
    });

    afterEach(() => {
        config.global.stubs = previousStubs;
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("passes the given validFilterables straight through to the add-filter menu", () => {
        const { wrapper } = mountGroup({ validFilterables: ["foo", "bar"] });
        const menu = wrapper.get('[data-qa="filter-menu"]');
        expect(menu.attributes("data-count")).toBe("2");
    });

    scopedIt("calls useFilter for field/widget component resolution", () => {
        mountGroup();
        expect(mockedUseFilter).toHaveBeenCalledWith(
            expect.objectContaining({ app: "a", model: "m", filterables: ["foo"] }),
        );
    });

    scopedIt("renders a chip per active filter", async () => {
        const { wrapper, addedFilters } = mountGroup({ modelValue: [{ field: "foo", param: "foo", value: "bar" }] });
        await vue.nextTick();
        const chips = wrapper.findAll('[data-qa="filter-chip"]');
        expect(chips).toHaveLength(1);
        expect(chips[0].attributes("data-field")).toBe("foo");
        expect(addedFilters.value).toHaveLength(1);
    });

    scopedIt("offers Clear filters only with more than one filter", async () => {
        const { wrapper, addedFilters } = mountGroup({
            modelValue: [{ field: "foo", param: "foo", value: "bar" }],
        });
        await vue.nextTick();
        expect(wrapper.find('[data-qa="filter-clear"]').exists()).toBe(false);

        addedFilters.value.push({ field: "baz", param: "baz", value: "qux" });
        await wrapper.setProps({ modelValue: addedFilters.value });
        await vue.nextTick();
        expect(wrapper.get('[data-qa="filter-clear"]').exists()).toBe(true);
    });

    scopedIt("clears all filters via the Clear filters button", async () => {
        const { wrapper } = mountGroup({
            modelValue: [
                { field: "foo", param: "foo", value: "bar" },
                { field: "baz", param: "baz", value: "qux" },
            ],
        });
        await vue.nextTick();
        const clear = wrapper.get('[data-qa="filter-clear"]');
        await clear.trigger("click");
        await vue.nextTick();

        expect(wrapper.emitted()["update:modelValue"].at(-1)[0]).toEqual([]);
        await wrapper.setProps({ modelValue: [] });
        await vue.nextTick();
        expect(wrapper.findAll('[data-qa="filter-chip"]')).toHaveLength(0);
    });

    describe("Validation-error mapping", () => {
        scopedIt(
            "maps a ListFilterError's erroredFilters to the matching chip and renders per-field messages",
            async () => {
                const error = new ListFilterError(undefined, { foo: ["This field is required."] });
                const { wrapper } = mountGroup({
                    modelValue: [
                        { field: "foo", param: "foo", value: "" },
                        { field: "baz", param: "baz", value: "qux" },
                    ],
                    error,
                    errored: true,
                });
                await vue.nextTick();

                const chips = wrapper.findAll('[data-qa="filter-chip"]');
                // Only the chip named in erroredFilters is flagged; an unrelated active filter is not.
                expect(chips.find((c) => c.attributes("data-field") === "foo").attributes("data-errored")).toBe("true");
                expect(
                    chips.find((c) => c.attributes("data-field") === "baz").attributes("data-errored"),
                ).toBeUndefined();

                const errorDisplay = wrapper.get('[data-qa="error-display"]');
                expect(errorDisplay.text()).toContain("Invalid filter values.");
                expect(errorDisplay.text()).toContain("foo");
                expect(errorDisplay.text()).toContain("This field is required.");
            },
        );

        scopedIt("does not render the error message list when errored is false, but still flags the chip", async () => {
            const error = new ListFilterError(undefined, { foo: ["This field is required."] });
            const { wrapper } = mountGroup({
                modelValue: [{ field: "foo", param: "foo", value: "" }],
                error,
                errored: false,
            });
            await vue.nextTick();

            // `errored` only gates the message-list display; chip flagging is driven by
            // `error.erroredFilters` alone, independent of `errored`.
            expect(wrapper.find('[data-qa="error-display"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="filter-chip"]').attributes("data-errored")).toBe("true");
        });

        scopedIt("ignores a non-ListFilterError error object", async () => {
            const { wrapper } = mountGroup({
                modelValue: [{ field: "foo", param: "foo", value: "" }],
                error: new Error("boom"),
                errored: true,
            });
            await vue.nextTick();

            expect(wrapper.find('[data-qa="error-display"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="filter-chip"]').attributes("data-errored")).toBeUndefined();
        });
    });
});
