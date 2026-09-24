import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive, ref } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    inheritAttrs: false,
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () =>
            h("button", { ...attrs, onClick: (e) => emit("click", e) }, slots.default ? slots.default() : null);
    },
});

const FilterFormStub = defineComponent({
    name: "FilterFormStub",
    props: ["filterName", "filterLabel", "applyFilter", "hasFilterValue"],
    setup(props, { slots }) {
        // Surface the overridden submit-button slot so the Remove/Apply row is asserted.
        return () =>
            h("form", { "data-qa": "filter-form" }, [
                slots["filter-form-submit-button"] ? slots["filter-form-submit-button"]({ disabled: false }) : null,
            ]);
    },
});

vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/form/filter/FilterForm.vue", () => ({ default: FilterFormStub }));

const mockedUseModelChoices = vi.fn(() => ({ choices: {} }));
vi.mock("@vueda/use/useModelChoices.js", () => ({ useModelChoices: mockedUseModelChoices }));

const mockedUseForm = vi.fn();
vi.mock("@vueda/use/useForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useForm.js");
    return { __esModule: true, ...actual, useForm: mockedUseForm };
});

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: () => "t" });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

let FilterFieldForm;

beforeEach(async () => {
    mockedUseForm.mockReset();
    FilterFieldForm = (await import("@vueda/form/filter/FilterFieldForm.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

function mountForm(options = {}) {
    const addedFilters = ref(options.addedFilters ?? []);
    const wrapper = mount(FilterFieldForm, {
        props: {
            filterName: "status",
            filterDetails: { label: "Status", typeFilter: "ModelChoiceField" },
            query: {},
            modelValue: addedFilters.value,
            "onUpdate:modelValue": (v) => (addedFilters.value = v),
            ...options.props,
        },
    });
    return { wrapper, addedFilters };
}

describe("lib/form/filter/FilterFieldForm.vue", () => {
    scopedIt("applyFilter adds then updates the filter, and emits", async () => {
        const state = reactive({ submittingValues: { status: "open" } });
        mockedUseForm.mockReturnValue({ state });
        const { wrapper, addedFilters } = mountForm();

        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        expect(addedFilters.value[0]).toMatchObject({ field: "status", value: "open" });
        expect(wrapper.emitted()["applied"][0]).toEqual(["status"]);
        expect(wrapper.emitted()["hide-filter-form"][0]).toEqual(["status"]);

        state.submittingValues.status = "closed";
        await nextTick();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        expect(addedFilters.value[0].value).toBe("closed");
    });

    scopedIt("applyFilter reads a dotted related-field name as one flat key", async () => {
        // `toFlatValuePath` stores a dotted name's value under a literal top-level key (proven in
        // formValuePath.spec.js), so `submittingValues` here is shaped exactly as the real
        // `useForm`/`useFieldRenderer` pairing would produce it for `customer.formatted_name`.
        const state = reactive({ submittingValues: { "customer.formatted_name": "Acme" } });
        mockedUseForm.mockReturnValue({ state });
        const { wrapper, addedFilters } = mountForm({ props: { filterName: "customer.formatted_name" } });

        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        expect(addedFilters.value[0]).toMatchObject({ field: "customer.formatted_name", value: "Acme" });
    });

    scopedIt("removeFilter clears the field's entry", async () => {
        const state = reactive({ submittingValues: { status: "open" } });
        mockedUseForm.mockReturnValue({ state });
        const { wrapper, addedFilters } = mountForm();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);

        wrapper.vm.removeFilter();
        await nextTick();
        expect(addedFilters.value).toHaveLength(0);
    });

    scopedIt("renders a Remove control only when showRemove is set", async () => {
        mockedUseForm.mockReturnValue({ state: reactive({ submittingValues: { status: "open" } }) });
        const { wrapper } = mountForm({ props: { showRemove: true } });
        expect(wrapper.find('[data-qa="filter-field-form-remove"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="filter-field-form-apply"]').exists()).toBe(true);
    });

    scopedIt("omits the Remove control by default", () => {
        mockedUseForm.mockReturnValue({ state: reactive({ submittingValues: { status: "open" } }) });
        const { wrapper } = mountForm();
        expect(wrapper.find('[data-qa="filter-field-form-remove"]').exists()).toBe(false);
    });
});
