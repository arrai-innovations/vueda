import { Time, parseDate, parseDateTime } from "@internationalized/date";
import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { mount, shallowMount } from "@vue/test-utils";
import { computed, defineComponent, h, nextTick, reactive, ref, toRaw, unref } from "vue";

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
    setup() {
        return () => h("form", { "data-qa": "filter-form" });
    },
});

vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/form/filter/FilterForm.vue", () => ({ default: FilterFormStub }));

vi.mock("@vueda/use/useModelChoices.js", () => ({ useModelChoices: vi.fn(() => ({ choices: {} })) }));
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: vi.fn(() => reactive({ loading: false, config: {} })),
}));

// The form's submitted values stand in for the filter field's value, which each case first
// obtains from its real widget.
const formState = reactive({ submittingValues: {} });
vi.mock("@vueda/use/useForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useForm.js");
    return { __esModule: true, ...actual, useForm: vi.fn(() => ({ state: formState })) };
});

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: () => "t" });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

const WIDGET_MODULES = {
    WidgetCombobox: () => import("@vueda/widgets/WidgetCombobox.vue"),
    WidgetDateField: () => import("@vueda/widgets/WidgetDateField.vue"),
    WidgetDuration: () => import("@vueda/widgets/WidgetDuration.vue"),
    WidgetModel: () => import("@vueda/widgets/WidgetModel.vue"),
    WidgetNumberInput: () => import("@vueda/widgets/WidgetNumberInput.vue"),
    WidgetSelectDropdown: () => import("@vueda/widgets/WidgetSelectDropdown.vue"),
    WidgetTagsInput: () => import("@vueda/widgets/WidgetTagsInput.vue"),
    WidgetTextInput: () => import("@vueda/widgets/WidgetTextInput.vue"),
    WidgetTimeField: () => import("@vueda/widgets/WidgetTimeField.vue"),
};

/** The component inside each widget that the reader operates, and which reports the entered value. */
const CONTROL_MODULES = {
    Combobox: () => import("@vueda/controls/combobox/Combobox.vue"),
    DateField: () => import("@vueda/controls/date-field/DateField.vue"),
    Input: () => import("@vueda/controls/input/Input.vue"),
    NumberField: () => import("@vueda/controls/number-field/NumberField.vue"),
    Select: () => import("@vueda/controls/select/Select.vue"),
    TagsInput: () => import("@vueda/controls/tags-input/TagsInput.vue"),
    TimeField: () => import("@vueda/controls/time-field/TimeField.vue"),
    // `WidgetModel` hands its fetched choices to `WidgetCombobox`, which writes the selected values.
    WidgetCombobox: () => import("@vueda/widgets/WidgetCombobox.vue"),
};

/** Widgets whose control sits in another component's default slot, such as the date field inside its popover. */
const WIDGETS_WITH_SLOTTED_CONTROLS = new Set(["WidgetDateField"]);

const FIXED_CHOICES = [
    { label: "New", value: "new" },
    { label: "Used", value: "used" },
];
const NULL_BOOLEAN_CHOICES = [
    { label: "Unknown", value: "" },
    { label: "Yes", value: "true" },
    { label: "No", value: "false" },
];
const SERVER_CHOICES = { choices: true, appLabel: "catalog", model: "distributor" };
const FILTER_NAME = "f";

/**
 * One non-hidden filter per non-range type the client maps. `inputs` are what the reader enters
 * into the widget's control, in order. `value` is what the widget then writes to the filter field:
 * the same value the request parameter carries. `query` is the query string the list request sends
 * for that value, when it differs from the value sent as one parameter.
 */
const CASES = [
    { typeFilter: "CharField", widget: "WidgetTextInput", inputs: [["Input", "widgets"]], value: "widgets" },
    {
        typeFilter: "ChoiceField",
        details: { choices: FIXED_CHOICES },
        widget: "WidgetSelectDropdown",
        inputs: [["Select", "new"]],
        value: "new",
        widgetProps: { options: FIXED_CHOICES },
    },
    {
        typeFilter: "TypedChoiceField",
        details: { choices: FIXED_CHOICES },
        widget: "WidgetSelectDropdown",
        inputs: [["Select", "new"]],
        value: "new",
        widgetProps: { options: FIXED_CHOICES },
    },
    {
        typeFilter: "NullBooleanField",
        details: { choices: NULL_BOOLEAN_CHOICES },
        widget: "WidgetSelectDropdown",
        inputs: [["Select", "false"]],
        value: "false",
        widgetProps: { options: NULL_BOOLEAN_CHOICES },
    },
    {
        typeFilter: "MultipleChoiceField",
        details: { choices: FIXED_CHOICES },
        widget: "WidgetCombobox",
        inputs: [["Combobox", ["new", "used"]]],
        value: ["new", "used"],
        query: "?f=new&f=used",
        widgetProps: { multiple: true, optionLabel: "label", options: FIXED_CHOICES },
    },
    {
        typeFilter: "ModelChoiceField",
        details: SERVER_CHOICES,
        widget: "WidgetModel",
        inputs: [["WidgetCombobox", "1"]],
        value: "1",
        widgetProps: { type: "select", isFilter: true, fieldName: "f" },
    },
    ...[
        ["ModelChoiceInField", "?f=1%2C2"],
        ["ModelMultipleChoiceInField", "?f=1%2C2"],
        ["ModelMultipleChoiceField", "?f=1&f=2"],
    ].map(([typeFilter, query]) => ({
        typeFilter,
        details: SERVER_CHOICES,
        widget: "WidgetModel",
        inputs: [["WidgetCombobox", ["1", "2"]]],
        value: ["1", "2"],
        query,
        widgetProps: { type: "multiSelect", isFilter: true, fieldName: "f" },
    })),
    {
        typeFilter: "AllValuesChoiceField",
        details: SERVER_CHOICES,
        widget: "WidgetModel",
        inputs: [["WidgetCombobox", "Acme"]],
        value: "Acme",
        widgetProps: { type: "select", isFilter: true, fieldName: "f" },
    },
    {
        typeFilter: "AllValuesMultipleChoiceField",
        details: SERVER_CHOICES,
        widget: "WidgetModel",
        inputs: [["WidgetCombobox", ["Acme, Inc.", "Globex"]]],
        value: ["Acme, Inc.", "Globex"],
        query: "?f=Acme%2C+Inc.&f=Globex",
        widgetProps: { type: "multiSelect", isFilter: true, fieldName: "f" },
    },
    {
        typeFilter: "DateField",
        widget: "WidgetDateField",
        inputs: [["DateField", parseDate("2026-09-25")]],
        value: "2026-09-25",
    },
    {
        typeFilter: "DateTimeField",
        widget: "WidgetDateField",
        inputs: [["DateField", parseDateTime("2026-09-25T10:30:00")]],
        value: "2026-09-25T10:30:00",
        widgetProps: { granularity: "minute" },
    },
    {
        typeFilter: "IsoDateTimeField",
        widget: "WidgetDateField",
        inputs: [["DateField", parseDateTime("2026-09-25T10:30:00")]],
        value: "2026-09-25T10:30:00",
        widgetProps: { granularity: "minute" },
    },
    {
        typeFilter: "TimeField",
        widget: "WidgetTimeField",
        inputs: [["TimeField", new Time(10, 30)]],
        value: "10:30:00",
    },
    {
        typeFilter: "DurationField",
        widget: "WidgetDuration",
        // Days, hours, and minutes, in rendered order.
        inputs: [
            ["NumberField", 1, 0],
            ["NumberField", 2, 1],
            ["NumberField", 30, 2],
        ],
        value: "1 02:30:00",
        widgetProps: { showDays: true, showHours: true, showMinutes: true },
    },
    {
        typeFilter: "DecimalField",
        widget: "WidgetNumberInput",
        inputs: [["NumberField", 3.25]],
        value: "3.25",
        widgetProps: { stepSnapping: false },
    },
    {
        typeFilter: "FloatField",
        widget: "WidgetNumberInput",
        inputs: [["NumberField", 1.5]],
        value: "1.5",
        widgetProps: { stepSnapping: false },
    },
    {
        typeFilter: "PositiveDecimalField",
        widget: "WidgetNumberInput",
        inputs: [["NumberField", 2.75]],
        value: "2.75",
        widgetProps: { min: 0 },
    },
    {
        typeFilter: "DecimalInField",
        widget: "WidgetTagsInput",
        inputs: [["TagsInput", ["1", "2.5"]]],
        value: ["1", "2.5"],
        query: "?f=1%2C2.5",
        widgetProps: { numeric: true },
    },
].map((testCase) => ({
    label: testCase.typeFilter,
    details: {},
    widgetProps: {},
    query: `?${new URLSearchParams({ [FILTER_NAME]: testCase.value })}`,
    ...testCase,
}));

/**
 * Mapped types whose input does not yet apply and restore a value, and the behavior still missing.
 * Each one is listed as a pending test.
 */
const PENDING_TYPES = {
    BooleanField:
        "applies a toggle's true or false value, which the filter form treats as empty, and restores it from its URL string",
};

/**
 * @param {typeof CASES[number]} testCase
 * @returns {import('@vueda/stores/storeModelInfo.js').FilterInfo}
 */
const filterDetailsOf = (testCase) => ({ typeFilter: testCase.typeFilter, label: "Filter", ...testCase.details });

/** @returns {import('@vueda/use/useField.js').FieldContext} A field context for a mounted widget. */
const makeFieldContext = () => ({
    state: reactive({
        fieldId: "filter-field-id",
        dependencyValues: {},
        value: undefined,
        required: false,
        errors: {},
        name: FILTER_NAME,
    }),
    registerDependencyValues: vi.fn(),
    unregisterDependencyValues: vi.fn(),
    setTouched: vi.fn(),
    clearTouched: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
});

describe("lib/**/*Filter*", () => {
    let FilterFieldForm, useFilter, filterModule, fieldMappings, listCrud, availableFields, availableWidgets;

    beforeEach(async () => {
        formState.submittingValues = {};
        FilterFieldForm = (await import("@vueda/form/filter/FilterFieldForm.vue")).default;
        useFilter = (await import("@vueda/use/useFilter.js")).useFilter;
        filterModule = await import("@vueda/use/useFilterForm.js");
        fieldMappings = await import("@vueda/utils/fieldMappings.js");
        listCrud = await import("@vueda/utils/listCrud.js");
        ({ availableFields, availableWidgets } = await import("@vueda/utils/formLookups.js"));
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    /**
     * Resolve the filter's input the way the filter menu does.
     *
     * @param {typeof CASES[number]} testCase
     */
    const resolveInput = async (testCase) => {
        const props = reactive({
            app: "app",
            model: "model",
            view: "list",
            filterables: [FILTER_NAME],
            filterableDetails: { [FILTER_NAME]: filterDetailsOf(testCase) },
        });
        const state = await withSetup(() => useFilter(props));
        await nextTick();
        return state;
    };

    /**
     * Mount the case's real widget with its resolved props, enter the case's inputs into the
     * widget's control, and return the value the widget wrote for the filter field.
     *
     * @param {typeof CASES[number]} testCase
     * @returns {Promise<any>}
     */
    const enterThroughWidget = async (testCase) => {
        const state = await resolveInput(testCase);
        const Widget = (await WIDGET_MODULES[testCase.widget]()).default;
        const { FieldContextSymbol } = await import("@vueda/utils/symbols.js");
        const fieldContext = makeFieldContext();
        const wrapper = shallowMount(Widget, {
            props: { ...unref(state.widgetProps[FILTER_NAME]), modelValue: undefined },
            global: {
                provide: { [FieldContextSymbol]: fieldContext },
                renderStubDefaultSlot: WIDGETS_WITH_SLOTTED_CONTROLS.has(testCase.widget),
            },
        });
        for (const [controlName, input, index = 0] of testCase.inputs) {
            const Control = (await CONTROL_MODULES[controlName]()).default;
            wrapper.findAllComponents(Control)[index].vm.$emit("update:modelValue", input);
            await nextTick();
        }
        // A widget that wraps another widget relays the value through its own update event.
        const relayed = wrapper.emitted("update:modelValue");
        return relayed ? relayed.at(-1)[0] : fieldContext.state.value;
    };

    /**
     * Mount the filter form against an active-filter list and apply the filter field's value.
     *
     * @param {typeof CASES[number]} testCase
     * @param {any} fieldValue
     * @param {object[]} [initialFilters]
     */
    const applyThroughForm = (testCase, fieldValue, initialFilters = []) => {
        const addedFilters = ref(initialFilters);
        formState.submittingValues = { [FILTER_NAME]: fieldValue };
        const wrapper = mount(FilterFieldForm, {
            props: {
                filterName: FILTER_NAME,
                filterDetails: filterDetailsOf(testCase),
                query: {},
                modelValue: addedFilters.value,
                "onUpdate:modelValue": (v) => (addedFilters.value = v),
            },
        });
        wrapper.vm.applyFilter();
        return addedFilters;
    };

    describe("Built-in filter types", () => {
        it("have a case for every non-range type the client maps", () => {
            const mappedTypes = Object.keys(fieldMappings.filterFieldMapping).filter(
                (typeFilter) => !fieldMappings.FilterFieldMappings[typeFilter]?.range,
            );
            const coveredTypes = [...CASES.map(({ typeFilter }) => typeFilter), ...Object.keys(PENDING_TYPES)];
            expect([...coveredTypes].sort()).toEqual([...mappedTypes].sort());
        });

        for (const [typeFilter, behavior] of Object.entries(PENDING_TYPES)) {
            it.todo(`${typeFilter} ${behavior}`);
        }

        scopedIt.each(CASES)("$label renders its input", async (testCase) => {
            const state = await resolveInput(testCase);

            expect(toRaw(unref(state.fieldComponents[FILTER_NAME]))).toBe(toRaw(availableFields.FormField));
            expect(toRaw(unref(state.widgetComponents[FILTER_NAME]))).toBe(toRaw(availableWidgets[testCase.widget]));
            expect(unref(state.widgetProps[FILTER_NAME])).toMatchObject(testCase.widgetProps);
        });

        scopedIt.each(CASES)("$label widget writes the request value", async (testCase) => {
            expect(await enterThroughWidget(testCase)).toEqual(testCase.value);
        });

        scopedIt.each(CASES)("$label applies its value as the request parameter", async (testCase) => {
            const addedFilters = applyThroughForm(testCase, await enterThroughWidget(testCase));

            expect(filterModule.filtersToParams(addedFilters.value)).toEqual({ [FILTER_NAME]: testCase.value });
        });

        scopedIt.each(CASES)("$label sends its value in the list request query string", (testCase) => {
            const [applied] = applyThroughForm(testCase, testCase.value).value;
            const repeatedParams = filterModule.getRepeatedFilterParams({ [FILTER_NAME]: filterDetailsOf(testCase) });

            const query = listCrud.makeSearchParamsString(filterModule.filtersToParams([applied]), repeatedParams);

            expect(query).toBe(testCase.query);
        });

        scopedIt.each(CASES)("$label restores from the URL it wrote", (testCase) => {
            const [applied] = applyThroughForm(testCase, testCase.value).value;
            const query = filterModule.filtersToParams([applied]);

            const restored = filterModule.buildFilterFromQuery(FILTER_NAME, filterDetailsOf(testCase), query);

            expect(restored).toMatchObject({ field: FILTER_NAME, param: FILTER_NAME, value: testCase.value });
            expect(filterModule.filtersToParams([restored])).toEqual(query);
        });

        scopedIt.each(CASES)("$label reopens its form with the URL value", async (testCase) => {
            const query = { [FILTER_NAME]: testCase.value };
            const props = reactive({ filterName: FILTER_NAME, filterDetails: filterDetailsOf(testCase) });
            const queryValue = computed(() =>
                filterModule.getFilterQueryValue(FILTER_NAME, props.filterDetails, query),
            );

            const state = await withSetup(() => filterModule.useFilterField(props, queryValue));

            expect(state.initialValues[FILTER_NAME]).toEqual(testCase.value);
        });

        scopedIt.each(CASES)("$label clears when its input is emptied", (testCase) => {
            const [applied] = applyThroughForm(testCase, testCase.value).value;
            const emptyValue = fieldMappings.FilterFieldMappings[testCase.typeFilter].initialValue;

            const addedFilters = applyThroughForm(testCase, emptyValue, [applied]);

            expect(addedFilters.value).toEqual([]);
        });

        scopedIt.each(CASES.filter(({ value }) => Array.isArray(value)))(
            "$label restores a single URL value as a one-entry list",
            (testCase) => {
                const restored = filterModule.buildFilterFromQuery(FILTER_NAME, filterDetailsOf(testCase), {
                    [FILTER_NAME]: testCase.value[0],
                });

                expect(restored.value).toEqual([testCase.value[0]]);
            },
        );
    });
});
