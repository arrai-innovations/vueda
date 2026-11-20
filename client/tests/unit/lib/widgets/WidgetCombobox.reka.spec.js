import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick, reactive, toRaw } from "vue";

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

// Reka's virtualizer measures its scroll container, which has no size in jsdom, so it renders
// no items. This stand-in renders every option through the real Reka items.
vi.mock("@vueda/controls/combobox/ComboboxVirtualizer.vue", async () => {
    const { Fragment, defineComponent, h } = await import("vue");
    return {
        default: defineComponent({
            props: { options: { type: Array, required: true }, textContent: { type: Function, default: undefined } },
            setup:
                (props, { slots }) =>
                () =>
                    h(
                        Fragment,
                        props.options.map((option) => slots.default({ option })),
                    ),
        }),
    };
});

const importComponent = () => import("@vueda/widgets/WidgetCombobox.vue");

// A failing test still unmounts, so its portal never leaks into the next test.
enableAutoUnmount(afterEach);

const STATIC_OPTIONS = [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue" },
];

// Option values as a choices endpoint sends them: primary keys cast to strings.
const STRING_PK_OPTIONS = [
    { label: "Can manage clients", value: "4" },
    { label: "Can view reports", value: "7" },
];

const searchInput = () => document.querySelector("[data-slot='combobox-input']");

// Reka resets the search term on a 1 ms timer after the popup closes.
const listItems = () => [...document.querySelectorAll("[role='option']")];

const checkedLabels = () =>
    listItems()
        .filter((item) => item.getAttribute("aria-selected") === "true")
        .map((item) => item.textContent.trim());

const clickItem = async (label) => {
    listItems()
        .find((item) => item.textContent.trim() === label)
        .click();
    await nextTick();
};

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
    let scrollIntoView;

    beforeEach(async () => {
        // jsdom has no scrollIntoView, which Reka calls on the highlighted item.
        scrollIntoView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = vi.fn();
        searchState = makeSearchState();
        mockedUseWidget.mockClear();
        mockedUseComboboxSearch.mockClear();
        WidgetCombobox = (await importComponent()).default;
    });

    afterEach(() => {
        Element.prototype.scrollIntoView = scrollIntoView;
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

    describe("Number values with string option values", () => {
        const mountWithValue = async (value, multiple) => {
            const wrapper = mount(WidgetCombobox, {
                attachTo: document.body,
                props: { options: STRING_PK_OPTIONS, optionLabel: "label", optionValue: "value", multiple },
            });
            widgetContext.state.combinedValue = value;
            await nextTick();
            return wrapper.get("[data-qa='widget-combobox']");
        };

        scopedIt("shows and checks the matching option in single selection", async () => {
            const trigger = await mountWithValue(4, false);
            expect(trigger.text()).toBe("Can manage clients");

            await trigger.trigger("click");
            expect(checkedLabels()).toEqual(["Can manage clients"]);
        });

        scopedIt("shows and checks the matching options in multiple selection", async () => {
            const trigger = await mountWithValue([4, 7], true);
            expect(trigger.text()).toBe("Can manage clients, Can view reports");

            await trigger.trigger("click");
            expect(checkedLabels()).toEqual(["Can manage clients", "Can view reports"]);
        });

        scopedIt("shows the string form of a value that matches no option", async () => {
            expect((await mountWithValue(9, false)).text()).toBe("9");
            expect((await mountWithValue([4, 9], true)).text()).toBe("Can manage clients, 9");
        });

        scopedIt("keeps the bound number when the user picks the selected option in single selection", async () => {
            const trigger = await mountWithValue(4, false);
            await trigger.trigger("click");
            await clickItem("Can manage clients");
            expect(widgetContext.state.combinedValue).toBe(4);
        });

        scopedIt("emits the option's own value for a newly picked option", async () => {
            const trigger = await mountWithValue(4, false);
            await trigger.trigger("click");
            await clickItem("Can view reports");
            expect(widgetContext.state.combinedValue).toBe("7");
        });

        scopedIt("restores the field's initial number when the user picks it again in single selection", async () => {
            const trigger = await mountWithValue(4, false);
            widgetContext.state.initialValue = 4;
            await trigger.trigger("click");

            await clickItem("Can view reports");
            expect(widgetContext.state.combinedValue).toBe("7");

            await clickItem("Can manage clients");
            expect(widgetContext.state.combinedValue).toBe(4);
        });

        scopedIt("deselects a selected number value in multiple selection", async () => {
            const trigger = await mountWithValue([4], true);
            await trigger.trigger("click");
            await clickItem("Can manage clients");
            expect(widgetContext.state.combinedValue).toEqual([]);
        });

        scopedIt("keeps the bound numbers when the user adds and removes another option", async () => {
            const trigger = await mountWithValue([4], true);
            await trigger.trigger("click");

            await clickItem("Can view reports");
            expect(widgetContext.state.combinedValue).toEqual([4, "7"]);

            await clickItem("Can view reports");
            expect(widgetContext.state.combinedValue).toEqual([4]);
        });

        scopedIt("writes no value when the user only opens and closes the list", async () => {
            const bound = [4];
            const trigger = await mountWithValue(bound, true);
            await trigger.trigger("click");
            await trigger.trigger("click");
            await settleClose();
            expect(toRaw(widgetContext.state.combinedValue)).toBe(bound);
        });
    });
});
