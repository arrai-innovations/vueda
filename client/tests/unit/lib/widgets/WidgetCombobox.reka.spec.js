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

// Uses the real Reka Combobox/ComboboxInput controls, unlike WidgetCombobox.spec.js which
// stubs the control layer with an input stub that calls displayValue on every render. That
// stubbing hid a real timing bug: Reka's own search-term reset only re-derives the input's
// text when the combobox's model value itself changes, not when reactive state read inside
// that derivation (an async label lookup) resolves afterward. WidgetCombobox now disables
// Reka's reset (`reset-search-term-on-select="false"`) and syncs the query itself; mounting
// the real controls here proves that sync actually reaches the DOM input.
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
        scopedIt("updates the API input when the selected label resolves after the PK", async () => {
            searchState.singleSelectedLabel = "\u00A0";

            const wrapper = mount(WidgetCombobox, {
                attachTo: document.body,
                props: { app: "myapp", model: "thing" },
            });

            await wrapper.get("[data-qa='widget-combobox']").trigger("click");

            widgetContext.state.combinedValue = 9;
            await nextTick();

            searchState.singleSelectedLabel = "Apple";
            await nextTick();

            expect(searchState.query).toBe("Apple");
            expect(document.querySelector("[data-slot='combobox-input']").value).toBe("Apple");

            wrapper.unmount();
        });

        scopedIt("shows the resolved label again after closing and re-opening", async () => {
            searchState.singleSelectedLabel = "Apple";

            const wrapper = mount(WidgetCombobox, {
                attachTo: document.body,
                props: { app: "myapp", model: "thing" },
            });
            widgetContext.state.combinedValue = 9;
            await nextTick();

            const trigger = wrapper.get("[data-qa='widget-combobox']");

            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']").value).toBe("Apple");

            // ComboboxList (and the input inside it) unmounts while closed.
            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']")).toBeNull();

            await trigger.trigger("click");
            expect(document.querySelector("[data-slot='combobox-input']").value).toBe("Apple");

            wrapper.unmount();
        });
    });
});
