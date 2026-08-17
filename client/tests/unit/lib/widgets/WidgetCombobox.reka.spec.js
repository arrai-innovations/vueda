import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";

/* ------------------------------------------------------------------ */
/*  Mock useWidget                                                     */
/* ------------------------------------------------------------------ */

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            combinedValue: null,
            disabled: false,
            validationState: reactive({ invalid: false }),
            combinedName: "test-name",
            required: false,
        }),
        blur: vi.fn(),
        focus: vi.fn(),
    };
    return widgetContext;
});

vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: ["update:modelValue"],
    WIDGET_PROPS: {},
    useWidget: mockedUseWidget,
}));

/* ------------------------------------------------------------------ */
/*  Mock useComboboxSearch                                             */
/* ------------------------------------------------------------------ */

let searchState;
const makeSearchState = (overrides = {}) =>
    reactive({
        loading: false,
        options: [],
        optionLabel: "formatted_name",
        optionValue: "id",
        placeholder: "Select a thing",
        query: "",
        singleSelectedLabel: "\u00A0",
        emptyMessage: "Type to search for results.",
        isGrouped: false,
        groupByField: undefined,
        onOpen: vi.fn(),
        onClose: vi.fn(),
        ...overrides,
    });

const mockedUseComboboxSearch = vi.fn(() => searchState);

vi.mock("@vueda/use/useComboboxSearch.js", () => ({
    useComboboxSearch: mockedUseComboboxSearch,
}));

const importComponent = () => import("@vueda/widgets/WidgetCombobox.vue");

const STATIC_OPTIONS = [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue" },
];

// Uses the real Reka Combobox/ComboboxInput controls, unlike WidgetCombobox.spec.js which
// stubs the control layer. WidgetCombobox no longer writes to the search box itself; it
// only toggles `reset-search-term-on-select` (`!isApiMode`) and leaves the resulting DOM
// input text entirely up to Reka, so a stub can't confirm what actually ends up in the box.
describe("lib/widgets/WidgetCombobox.vue", () => {
    let WidgetCombobox;

    beforeEach(async () => {
        searchState = makeSearchState();
        mockedUseWidget.mockClear();
        mockedUseComboboxSearch.mockClear();
        WidgetCombobox = (await importComponent()).default;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Input display value", () => {
        scopedIt("leaves the API-mode search box empty after selecting a value and reopening", async () => {
            searchState.singleSelectedLabel = "Apple";

            const wrapper = mount(WidgetCombobox, {
                attachTo: document.body,
                props: { app: "myapp", model: "thing" },
            });
            widgetContext.state.combinedValue = 9;
            await nextTick();

            const trigger = wrapper.get("[data-qa='widget-combobox']");

            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']").value).toBe("");

            // ComboboxList (and the input inside it) unmounts while closed.
            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']")).toBeNull();

            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']").value).toBe("");

            wrapper.unmount();
        });

        scopedIt("fills the static-mode search box with the selected option on reopen", async () => {
            const wrapper = mount(WidgetCombobox, {
                attachTo: document.body,
                props: { options: STATIC_OPTIONS, optionLabel: "label", optionValue: "value" },
            });
            widgetContext.state.combinedValue = "green";
            await nextTick();

            const trigger = wrapper.get("[data-qa='widget-combobox']");

            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']").value).toBe("green");

            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']")).toBeNull();

            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']").value).toBe("green");

            wrapper.unmount();
        });
    });
});
