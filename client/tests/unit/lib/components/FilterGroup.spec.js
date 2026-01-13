import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, reactive, ref, toRef } from "vue";

const FilterComponentStub = defineComponent({
    name: "FilterComponentStub",
    props: ["filterName"],
    emits: ["hide-filter-form"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "filter-component", "data-name": props.filterName },
                slots.default ? slots.default() : null,
            );
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label", "severity", "name"],
    emits: ["click"],
    setup(props, { emit }) {
        return () =>
            h("button", {
                "data-qa": "button",
                "data-label": props.label,
                "data-severity": props.severity,
                onClick: () => emit("click"),
            });
    },
});

const stopFns = [];
const useSlotNameResolver = vi.fn(() => {
    const stop = vi.fn();
    stopFns.push(stop);
    return { name: "slot", stop };
});
const mockedUseFilter = vi.fn((props) =>
    reactive({
        filterables: computed(() =>
            (props.filterables ?? []).filter((f) => {
                const detail = props.filterableDetails?.[f];
                return detail && detail.typeFilter;
            }),
        ),
        filterableDetails: toRef(props, "filterableDetails"),
    }),
);
const mockedUseTheme = vi.fn(() => () => "theme");

const route = reactive({ query: {} });

vi.mock("@vueda/components/FilterComponent.vue", () => ({ default: FilterComponentStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));
vi.mock("@vueda/use/useFilter.js", () => ({ useFilter: mockedUseFilter }));
vi.mock("@vueda/use/useTheme.js", async () => {
    const actual = await vi.importActual("@vueda/use/useTheme.js");
    return { ...actual, useTheme: mockedUseTheme };
});
vi.mock("vue-router", () => ({ useRoute: () => route }));

let FilterGroup, vue;

describe("lib/components/FilterGroup.vue", () => {
    beforeEach(async () => {
        vue = await import("vue");
        FilterGroup = (await import("@vueda/components/FilterGroup.vue")).default;
        useSlotNameResolver.mockClear();
        stopFns.length = 0;
        route.query = {};
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("renders filter components only for detailed filters", () => {
        const params = ref({});
        const wrapper = mount(FilterGroup, {
            props: {
                app: "a",
                model: "m",
                view: "v",
                filterables: ["foo", "bar"],
                filterableDetails: { foo: { typeFilter: "CharField" }, bar: undefined },
                filterFormsValues: {},
                modelValue: params.value,
                "onUpdate:modelValue": (v) => (params.value = v),
            },
        });

        expect(useSlotNameResolver).toHaveBeenCalledTimes(1);
        expect(useSlotNameResolver).toHaveBeenCalledWith(
            ["filter-component(foo)", "filter-component"],
            expect.any(Object),
        );
        const comps = wrapper.findAll('[data-qa="filter-component"]');
        expect(comps).toHaveLength(1);
        expect(comps[0].attributes("data-name")).toBe("foo");
    });

    scopedIt("emits query-change when route query changes", async () => {
        route.query = { q: "1" };
        const params = ref({});
        const wrapper = mount(FilterGroup, {
            props: {
                app: "a",
                model: "m",
                view: "v",
                filterables: [],
                filterableDetails: {},
                modelValue: params.value,
                "onUpdate:modelValue": (v) => (params.value = v),
            },
        });
        expect(wrapper.emitted()["query-change"][0]).toEqual([{ q: "1" }]);

        route.query = { q: "2" };
        await vue.nextTick();
        expect(wrapper.emitted()["query-change"][1]).toEqual([{ q: "2" }]);

        route.query = {};
        await vue.nextTick();
        expect(wrapper.emitted()["query-change"].length).toBe(2);
    });

    scopedIt("updates params and emits filter-change on addedFilters update", async () => {
        const params = ref({});
        const wrapper = mount(FilterGroup, {
            props: {
                app: "a",
                model: "m",
                view: "v",
                filterables: ["foo"],
                filterableDetails: { foo: {} },
                modelValue: params.value,
                "onUpdate:modelValue": (v) => (params.value = v),
            },
        });

        wrapper.vm.addedFilters.push({ param: "foo", value: "bar" });
        await vue.nextTick();

        expect(params.value).toEqual({ foo: "bar" });
        expect(wrapper.emitted()["filter-change"][0][0]).toEqual([{ param: "foo", value: "bar" }]);

        wrapper.vm.addedFilters[0] = {
            param: ["foo_lower", "foo_upper"],
            value: { lower: 1, upper: 2 },
            isValueRawObject: false,
        };
        await vue.nextTick();

        expect(params.value).toEqual({ foo_lower: 1, foo_upper: 2 });
    });

    scopedIt("manages resolvers when filters list changes", async () => {
        const params = ref({});
        const wrapper = mount(FilterGroup, {
            props: {
                app: "a",
                model: "m",
                view: "v",
                filterables: ["foo"],
                filterableDetails: { foo: { typeFilter: "CharField" }, bar: { typeFilter: "IntegerField" } },
                modelValue: params.value,
                "onUpdate:modelValue": (v) => (params.value = v),
            },
        });

        const stopFoo = stopFns[0];

        await wrapper.setProps({ filterables: ["foo", "bar"] });
        await vue.nextTick();
        expect(useSlotNameResolver).toHaveBeenCalledTimes(2);

        await wrapper.setProps({ filterables: ["bar"] });
        await vue.nextTick();
        expect(stopFoo).toHaveBeenCalled();
    });

    scopedIt("clears filters via button", async () => {
        const params = ref({});
        const wrapper = mount(FilterGroup, {
            props: {
                app: "a",
                model: "m",
                view: "v",
                filterables: ["foo"],
                filterableDetails: { foo: {} },
                modelValue: params.value,
                "onUpdate:modelValue": (v) => (params.value = v),
            },
        });

        wrapper.vm.addedFilters.push({ param: "foo", value: "bar" });
        await vue.nextTick();
        expect(wrapper.get('[data-qa="button"]').attributes("data-severity")).toBe("warn");

        await wrapper.get('[data-qa="button"]').trigger("click");
        await vue.nextTick();
        expect(wrapper.vm.addedFilters.length).toBe(0);
        expect(wrapper.get('[data-qa="button"]').attributes("data-severity")).toBe("secondary");
    });
});
