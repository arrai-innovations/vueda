import { scopedIt } from "@tests/unit/utils.js";
import { config, mount } from "@vue/test-utils";
import { computed, defineComponent, h, reactive, ref, toRef } from "vue";

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

const mockedUseFilter = vi.fn((props) =>
    reactive({
        app: toRef(props, "app"),
        model: toRef(props, "model"),
        filterables: computed(() =>
            (props.filterables ?? []).filter((f) => {
                const detail = props.filterableDetails?.[f];
                return detail && detail.typeFilter;
            }),
        ),
        filterableDetails: toRef(props, "filterableDetails"),
    }),
);
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

let FilterGroup, vue;

function mountGroup(props = {}) {
    const params = ref(props.modelValue ?? {});
    const wrapper = mount(FilterGroup, {
        props: {
            app: "a",
            model: "m",
            view: "list",
            filterables: ["foo"],
            filterableDetails: { foo: { typeFilter: "CharField" } },
            modelValue: params.value,
            "onUpdate:modelValue": (v) => (params.value = v),
            ...props,
        },
    });
    return { wrapper, params };
}

describe("lib/form/filter/FilterGroup.vue", () => {
    let previousStubs;

    beforeEach(async () => {
        vue = await import("vue");
        FilterGroup = (await import("@vueda/form/filter/FilterGroup.vue")).default;
        route.query = {};
        previousStubs = config.global.stubs;
        config.global.stubs = { ...previousStubs, "router-link": true };
    });

    afterEach(() => {
        config.global.stubs = previousStubs;
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("renders the add-filter menu with the valid filterables", () => {
        const { wrapper } = mountGroup({
            filterables: ["foo", "bar"],
            filterableDetails: { foo: { typeFilter: "CharField" }, bar: undefined },
        });
        const menu = wrapper.get('[data-qa="filter-menu"]');
        // Only foo has a typeFilter, so bar is filtered out of the valid filterables.
        expect(menu.attributes("data-count")).toBe("1");
    });

    scopedIt("excludes server-hidden filters from the menu and restoration", async () => {
        route.query = { id: "1,2" };
        const { wrapper } = mountGroup({
            filterables: ["foo", "id"],
            filterableDetails: {
                foo: { typeFilter: "CharField" },
                id: { typeFilter: "DecimalInField", hidden: true },
            },
        });
        await vue.nextTick();
        // The hidden id__in filter is omitted from the add-filter menu...
        expect(wrapper.get('[data-qa="filter-menu"]').attributes("data-count")).toBe("1");
        // ...and is not restored as an editable chip even when present in the URL.
        expect(wrapper.vm.addedFilters.some((f) => f.field === "id")).toBe(false);
    });

    scopedIt("updates params and emits filter-change on addedFilters update", async () => {
        const { wrapper, params } = mountGroup();
        wrapper.vm.addedFilters.push({ field: "foo", param: "foo", value: "bar" });
        await vue.nextTick();

        expect(params.value).toEqual({ foo: "bar" });
        expect(wrapper.emitted()["filter-change"][0][0]).toEqual([{ field: "foo", param: "foo", value: "bar" }]);

        wrapper.vm.addedFilters[0] = {
            field: "foo",
            param: ["foo_lower", "foo_upper"],
            value: { lower: 1, upper: 2 },
            isValueRawObject: false,
        };
        await vue.nextTick();
        expect(params.value).toEqual({ foo_lower: 1, foo_upper: 2 });
    });

    scopedIt("renders a chip per active filter", async () => {
        const { wrapper } = mountGroup();
        wrapper.vm.addedFilters.push({ field: "foo", param: "foo", value: "bar" });
        await vue.nextTick();
        const chips = wrapper.findAll('[data-qa="filter-chip"]');
        expect(chips).toHaveLength(1);
        expect(chips[0].attributes("data-field")).toBe("foo");
    });

    scopedIt("restores active filters from the URL query on mount", async () => {
        route.query = { foo: "bar" };
        const { wrapper } = mountGroup();
        await vue.nextTick();
        expect(wrapper.vm.addedFilters).toHaveLength(1);
        expect(wrapper.vm.addedFilters[0]).toMatchObject({ field: "foo", param: "foo", value: "bar", range: false });
        expect(wrapper.findAll('[data-qa="filter-chip"]')).toHaveLength(1);
    });

    scopedIt("emits query-change when the route query changes", async () => {
        route.query = { q: "1" };
        const { wrapper } = mountGroup({ filterables: [], filterableDetails: {} });
        expect(wrapper.emitted()["query-change"][0]).toEqual([{ q: "1" }]);

        route.query = { q: "2" };
        await vue.nextTick();
        expect(wrapper.emitted()["query-change"][1]).toEqual([{ q: "2" }]);
    });

    scopedIt("offers Clear filters only with more than one filter", async () => {
        const { wrapper } = mountGroup();
        wrapper.vm.addedFilters.push({ field: "foo", param: "foo", value: "bar" });
        await vue.nextTick();
        // A lone filter is removed by its own chip; no bulk clear.
        expect(wrapper.find('[data-qa="filter-clear"]').exists()).toBe(false);

        wrapper.vm.addedFilters.push({ field: "baz", param: "baz", value: "qux" });
        await vue.nextTick();
        expect(wrapper.get('[data-qa="filter-clear"]').exists()).toBe(true);
    });

    scopedIt("clears all filters via the Clear filters button", async () => {
        const { wrapper } = mountGroup();
        wrapper.vm.addedFilters.push({ field: "foo", param: "foo", value: "bar" });
        wrapper.vm.addedFilters.push({ field: "baz", param: "baz", value: "qux" });
        await vue.nextTick();
        const clear = wrapper.get('[data-qa="filter-clear"]');
        await clear.trigger("click");
        await vue.nextTick();
        expect(wrapper.vm.addedFilters.length).toBe(0);
        expect(wrapper.findAll('[data-qa="filter-chip"]')).toHaveLength(0);
    });
});
