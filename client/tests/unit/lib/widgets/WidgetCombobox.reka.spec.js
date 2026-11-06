import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
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

// A failing test still unmounts, so its portal never leaks into the next test.
enableAutoUnmount(afterEach);

const STATIC_OPTIONS = [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue" },
];

const searchInput = () => document.querySelector("[data-slot='combobox-input']");

// Reka resets the search term on a 1 ms timer after the popup closes.
const settleClose = () => new Promise((resolve) => setTimeout(resolve, 10));

// jsdom runs no CSS animations, so Reka's Presence unmounts the list as soon as it closes.
// Reporting an exit animation on the closed list keeps the list, and the search input inside
// it, mounted through the close timer, as a browser does while the exit animation plays.
const mockExitAnimation = () => {
    const getComputedStyle = window.getComputedStyle;
    return vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
        const style = getComputedStyle(el, pseudo);
        const list = el.matches("[data-slot='combobox-list']") ? el : el.querySelector("[data-slot='combobox-list']");
        if (list?.dataset.state !== "closed") {
            return style;
        }
        return new Proxy(style, {
            get: (target, key) => {
                if (key === "animationName") {
                    return "exit";
                }
                return typeof target[key] === "function" ? target[key].bind(target) : target[key];
            },
        });
    });
};

// Uses the real Reka Combobox/ComboboxInput controls, unlike WidgetCombobox.spec.js which
// stubs the control layer. Reka writes the selected value into the search box on select and
// again shortly after the popup closes, so only the real controls show what ends up in the box.
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
        let getComputedStyleSpy;

        beforeEach(() => {
            getComputedStyleSpy = mockExitAnimation();
        });

        afterEach(() => {
            getComputedStyleSpy.mockRestore();
        });

        scopedIt("keeps the API-mode search box empty on every open when a value is selected", async () => {
            searchState.singleSelectedLabel = "Apple";

            const wrapper = mount(WidgetCombobox, {
                attachTo: document.body,
                props: { app: "myapp", model: "thing" },
            });
            widgetContext.state.combinedValue = 9;
            await nextTick();

            const trigger = wrapper.get("[data-qa='widget-combobox']");

            await trigger.trigger("click");
            expect(searchInput().value).toBe("");

            await trigger.trigger("click");
            await settleClose();
            expect(searchState.query).toBe("");
            expect(searchInput().value).toBe("");

            await trigger.trigger("click");
            expect(searchInput().value).toBe("");
        });

        scopedIt("keeps the static-mode search box empty on every open when a value is selected", async () => {
            const wrapper = mount(WidgetCombobox, {
                attachTo: document.body,
                props: { options: STATIC_OPTIONS, optionLabel: "label", optionValue: "value" },
            });
            widgetContext.state.combinedValue = "green";
            await nextTick();

            const trigger = wrapper.get("[data-qa='widget-combobox']");

            await trigger.trigger("click");
            expect(searchInput().value).toBe("");

            await trigger.trigger("click");
            await settleClose();
            expect(searchState.query).toBe("");
            expect(searchInput().value).toBe("");

            await trigger.trigger("click");
            expect(searchInput().value).toBe("");
        });
    });
});
