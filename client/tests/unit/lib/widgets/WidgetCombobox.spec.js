import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-combobox";
const QA_SEL = `[data-qa='${QA}']`;

const STATIC_OPTIONS = [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue" },
];

/* ------------------------------------------------------------------ */
/*  Stubs for the Combobox family                               */
/* ------------------------------------------------------------------ */

const ControlComboboxStub = defineComponent({
    name: "ControlComboboxStub",
    props: ["modelValue", "multiple", "disabled", "name", "required", "resetSearchTermOnSelect"],
    emits: ["update:modelValue", "update:open"],
    setup(props, { slots, attrs, emit }) {
        return () =>
            h(
                "div",
                {
                    "data-stub": "combobox",
                    ...attrs,
                    "onUpdate:open": (val) => emit("update:open", val),
                },
                slots.default?.(),
            );
    },
});

const ControlComboboxAnchorStub = defineComponent({
    name: "ControlComboboxAnchorStub",
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "combobox-anchor" }, slots.default?.());
    },
});

const ControlComboboxTriggerStub = defineComponent({
    name: "ControlComboboxTriggerStub",
    props: ["id"],
    emits: ["focus", "blur"],
    setup(props, { emit, attrs, slots }) {
        return () =>
            h(
                "button",
                {
                    id: props.id,
                    ...attrs,
                    "data-qa": QA,
                    onFocus: () => emit("focus"),
                    onBlur: () => emit("blur"),
                },
                slots.default?.(),
            );
    },
});

const ControlComboboxListStub = defineComponent({
    name: "ControlComboboxListStub",
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "combobox-list" }, slots.default?.());
    },
});

const ControlComboboxInputStub = defineComponent({
    name: "ControlComboboxInputStub",
    props: ["modelValue", "placeholder", "displayValue"],
    emits: ["update:modelValue"],
    setup(props, { emit }) {
        return () =>
            h("input", {
                "data-stub": "combobox-input",
                "data-display-value": props.displayValue?.(),
                value: props.modelValue,
                placeholder: props.placeholder,
                onInput: (e) => emit("update:modelValue", e.target.value),
            });
    },
});

const ControlComboboxViewportStub = defineComponent({
    name: "ControlComboboxViewportStub",
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "combobox-viewport" }, slots.default?.());
    },
});

const ControlComboboxItemStub = defineComponent({
    name: "ControlComboboxItemStub",
    props: ["value", "textValue"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-stub": "combobox-item", "data-value": props.value, "data-text-value": props.textValue },
                slots.default?.(),
            );
    },
});

const ControlComboboxGroupStub = defineComponent({
    name: "ControlComboboxGroupStub",
    props: ["heading"],
    setup(props, { slots }) {
        return () => h("div", { "data-stub": "combobox-group", "data-heading": props.heading }, slots.default?.());
    },
});

const ControlComboboxItemIndicatorStub = defineComponent({
    name: "ControlComboboxItemIndicatorStub",
    setup(_props, { slots }) {
        return () => h("span", { "data-stub": "combobox-item-indicator" }, slots.default?.());
    },
});

const ControlComboboxEmptyStub = defineComponent({
    name: "ControlComboboxEmptyStub",
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "combobox-empty" }, slots.default?.());
    },
});

const ControlComboboxVirtualizerStub = defineComponent({
    name: "ControlComboboxVirtualizerStub",
    props: ["options", "textContent", "estimateSize", "overscan"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-stub": "combobox-virtualizer" },
                props.options?.map((option) => slots.default?.({ option })),
            );
    },
});

vi.mock("@vueda/controls/combobox/Combobox.vue", () => ({ default: ControlComboboxStub }));
vi.mock("@vueda/controls/combobox/ComboboxAnchor.vue", () => ({ default: ControlComboboxAnchorStub }));
vi.mock("@vueda/controls/combobox/ComboboxTrigger.vue", () => ({ default: ControlComboboxTriggerStub }));
vi.mock("@vueda/controls/combobox/ComboboxList.vue", () => ({ default: ControlComboboxListStub }));
vi.mock("@vueda/controls/combobox/ComboboxInput.vue", () => ({ default: ControlComboboxInputStub }));
vi.mock("@vueda/controls/combobox/ComboboxViewport.vue", () => ({ default: ControlComboboxViewportStub }));
vi.mock("@vueda/controls/combobox/ComboboxItem.vue", () => ({ default: ControlComboboxItemStub }));
vi.mock("@vueda/controls/combobox/ComboboxGroup.vue", () => ({ default: ControlComboboxGroupStub }));
vi.mock("@vueda/controls/combobox/ComboboxItemIndicator.vue", () => ({
    default: ControlComboboxItemIndicatorStub,
}));
vi.mock("@vueda/controls/combobox/ComboboxEmpty.vue", () => ({ default: ControlComboboxEmptyStub }));
vi.mock("@vueda/controls/combobox/ComboboxVirtualizer.vue", () => ({ default: ControlComboboxVirtualizerStub }));

const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "pk", "label", "view"],
    setup(props) {
        return () => h("a", { "data-stub": "link-model-view", "data-pk": props.pk }, props.label);
    },
});

vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

vi.mock("reka-ui", () => ({
    useFilter: () => ({
        contains: (string, substring) => {
            if (!substring) return true;
            return string.toLowerCase().includes(substring.toLowerCase());
        },
    }),
}));

/* ------------------------------------------------------------------ */
/*  Mock useWidget                                                      */
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
/*  Mock useComboboxSearch                                              */
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

    /* -------------------------------------------------------------- */
    /*  Static mode                                                    */
    /* -------------------------------------------------------------- */

    describe("Static mode (options prop)", () => {
        scopedIt("renders option items from the options prop", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(3);
            expect(items[0].attributes("data-value")).toBe("red");
            expect(items[1].attributes("data-value")).toBe("green");
            expect(items[2].attributes("data-value")).toBe("blue");
        });

        scopedIt("renders item textValue from optionLabel key", async () => {
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label" },
            });
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items[0].attributes("data-text-value")).toBe("Red");
        });

        scopedIt("skips options with an empty-string value (Reka rejects them)", async () => {
            // The server prepends an empty/placeholder choice to filter choices,
            // e.g. {label: "None", value: ""}. Reka UI's ComboboxItem throws on an
            // empty-string value, so the widget must not render it as an item.
            const wrapper = mount(WidgetCombobox, {
                props: {
                    options: [{ label: "None", value: "" }, ...STATIC_OPTIONS],
                    optionLabel: "label",
                },
            });
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(3);
            expect(items.map((i) => i.attributes("data-value"))).toEqual(["red", "green", "blue"]);
        });

        scopedIt("skips options with a nullish value", async () => {
            const wrapper = mount(WidgetCombobox, {
                props: {
                    options: [{ label: "None", value: null }, ...STATIC_OPTIONS],
                    optionLabel: "label",
                },
            });
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(3);
        });

        scopedIt("respects custom optionLabel and optionValue keys", async () => {
            const custom = [{ name: "Alpha", code: "a" }];
            const wrapper = mount(WidgetCombobox, {
                props: { options: custom, optionLabel: "name", optionValue: "code" },
            });
            const item = wrapper.find("[data-stub='combobox-item']");
            expect(item.attributes("data-value")).toBe("a");
            expect(item.attributes("data-text-value")).toBe("Alpha");
        });

        scopedIt("shows placeholder text when no value is selected", async () => {
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, placeholder: "Pick a color" },
            });
            const trigger = wrapper.get(QA_SEL);
            expect(trigger.text()).toContain("Pick a color");
        });

        scopedIt("shows selected option label in the trigger when a value is set", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label", optionValue: "value" },
            });
            widgetContext.state.combinedValue = "green";
            await nextTick();
            expect(wrapper.get(QA_SEL).text()).toContain("Green");
        });

        scopedIt("shows joined labels for multiple selected values", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, multiple: true, optionLabel: "label", optionValue: "value" },
            });
            widgetContext.state.combinedValue = ["red", "blue"];
            await nextTick();
            expect(wrapper.get(QA_SEL).text()).toContain("Red");
            expect(wrapper.get(QA_SEL).text()).toContain("Blue");
        });

        scopedIt("does not render LinkModelView in static readonly mode", async () => {
            widgetContext.state.combinedValue = "red";
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, readonly: true },
            });
            expect(wrapper.find("[data-stub='link-model-view']").exists()).toBe(false);
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("shows selected label in readonly span for static mode", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, readonly: true, optionLabel: "label", optionValue: "value" },
            });
            widgetContext.state.combinedValue = "green";
            await nextTick();
            expect(wrapper.find("span").text()).toContain("Green");
        });
    });

    /* -------------------------------------------------------------- */
    /*  API mode                                                       */
    /* -------------------------------------------------------------- */

    describe("API mode (app + model props)", () => {
        const apiProps = { app: "myapp", model: "thing" };

        scopedIt("renders options from the composable", async () => {
            searchState.options = [
                { id: 1, formatted_name: "Alpha" },
                { id: 2, formatted_name: "Beta" },
            ];
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(2);
            expect(items[0].attributes("data-value")).toBe("1");
            expect(items[1].attributes("data-value")).toBe("2");
        });

        scopedIt("shows singleSelectedLabel in the trigger when a value is selected", async () => {
            const { nextTick } = await vi.importActual("vue");
            searchState.singleSelectedLabel = "Alpha";
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            widgetContext.state.combinedValue = 1;
            await nextTick();
            expect(wrapper.get(QA_SEL).text()).toContain("Alpha");
        });

        scopedIt("shows placeholder when singleSelectedLabel is a non-breaking space", async () => {
            searchState.singleSelectedLabel = "\u00A0";
            searchState.placeholder = "Select a thing";
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            expect(wrapper.get(QA_SEL).text()).toContain("Select a thing");
        });

        scopedIt("shows multiple-selection count in the trigger for API mode", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, { props: { ...apiProps, multiple: true } });
            widgetContext.state.combinedValue = [1, 2, 3];
            await nextTick();
            expect(wrapper.get(QA_SEL).text()).toContain("3 items selected");
        });

        scopedIt("shows '1 item selected' for exactly one selection in API multiple mode", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, { props: { ...apiProps, multiple: true } });
            widgetContext.state.combinedValue = [5];
            await nextTick();
            expect(wrapper.get(QA_SEL).text()).toContain("1 item selected");
        });

        scopedIt("renders LinkModelView in API readonly mode", async () => {
            const { nextTick } = await vi.importActual("vue");
            searchState.singleSelectedLabel = "Alpha";
            const wrapper = mount(WidgetCombobox, { props: { ...apiProps, readonly: true } });
            widgetContext.state.combinedValue = 1;
            await nextTick();
            const link = wrapper.find("[data-stub='link-model-view']");
            expect(link.exists()).toBe(true);
            expect(link.attributes("data-pk")).toBe("1");
            expect(link.text()).toContain("Alpha");
        });

        scopedIt("calls composable's onOpen when update:open fires with true", async () => {
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            await wrapper.getComponent(ControlComboboxStub).vm.$emit("update:open", true);
            expect(searchState.onOpen).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls composable's onClose when update:open fires with false", async () => {
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            await wrapper.getComponent(ControlComboboxStub).vm.$emit("update:open", false);
            expect(searchState.onClose).toHaveBeenCalledTimes(1);
        });

        scopedIt("renders grouped items using ComboboxGroup when isGrouped is true", async () => {
            searchState.isGrouped = true;
            searchState.groupByField = "category";
            searchState.options = [
                { category: "Fruit", items: [{ id: 1, formatted_name: "Apple" }] },
                { category: "Veggie", items: [{ id: 2, formatted_name: "Carrot" }] },
            ];
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            const groups = wrapper.findAll("[data-stub='combobox-group']");
            expect(groups).toHaveLength(2);
            expect(groups[0].attributes("data-heading")).toBe("Fruit");
            expect(groups[1].attributes("data-heading")).toBe("Veggie");
        });

        scopedIt("renders items inside groups", async () => {
            searchState.isGrouped = true;
            searchState.groupByField = "category";
            searchState.options = [
                {
                    category: "Fruit",
                    items: [
                        { id: 1, formatted_name: "Apple" },
                        { id: 2, formatted_name: "Banana" },
                    ],
                },
            ];
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(2);
            expect(items[0].attributes("data-value")).toBe("1");
            expect(items[1].attributes("data-value")).toBe("2");
        });

        scopedIt("passes emptyMessage from composable to the empty slot", async () => {
            searchState.emptyMessage = "No matching results.";
            const wrapper = mount(WidgetCombobox, { props: apiProps });
            expect(wrapper.find("[data-stub='combobox-empty']").text()).toBe("No matching results.");
        });
    });

    /* -------------------------------------------------------------- */
    /*  Input display value                                            */
    /* -------------------------------------------------------------- */

    // Reka UI resets the search input's text to this function's return value after a
    // selection. Without it, Reka falls back to `String(modelValue)` (e.g. "9" instead
    // of "Apple") for non-object model values.
    describe("Input display value", () => {
        scopedIt("shows the resolved label, not the raw pk, for a selected API-mode option", async () => {
            const { nextTick } = await vi.importActual("vue");
            searchState.singleSelectedLabel = "Apple";
            const wrapper = mount(WidgetCombobox, { props: { app: "myapp", model: "thing" } });
            widgetContext.state.combinedValue = 9;
            await nextTick();
            const input = wrapper.find("[data-stub='combobox-input']");
            expect(input.attributes("data-display-value")).toBe("Apple");
        });

        scopedIt("shows the resolved label for a selected static-mode option", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label", optionValue: "value" },
            });
            widgetContext.state.combinedValue = "green";
            await nextTick();
            const input = wrapper.find("[data-stub='combobox-input']");
            expect(input.attributes("data-display-value")).toBe("Green");
        });

        scopedIt("shows an empty string when nothing is selected", async () => {
            const wrapper = mount(WidgetCombobox, { props: { app: "myapp", model: "thing" } });
            const input = wrapper.find("[data-stub='combobox-input']");
            expect(input.attributes("data-display-value")).toBe("");
        });
    });

    /* -------------------------------------------------------------- */
    /*  Widget state bindings                                          */
    /* -------------------------------------------------------------- */

    describe("Widget state bindings", () => {
        scopedIt("passes disabled state to the combobox root", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            const root = wrapper.getComponent(ControlComboboxStub);
            expect(root.props("disabled")).toBe(false);
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(root.props("disabled")).toBe(true);
        });

        scopedIt("passes combinedName to the combobox root", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            const root = wrapper.getComponent(ControlComboboxStub);
            expect(root.props("name")).toBe("test-name");
        });

        scopedIt("applies aria-invalid on the trigger when validation fails", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid when valid", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required on the trigger when required", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });
    });

    /* -------------------------------------------------------------- */
    /*  Field context integration                                      */
    /* -------------------------------------------------------------- */

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the trigger id", async () => {
            const fc = { state: reactive({ fieldId: "field-xyz" }) };
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS },
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-xyz");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    /* -------------------------------------------------------------- */
    /*  Events                                                         */
    /* -------------------------------------------------------------- */

    describe("Events", () => {
        scopedIt("calls widgetContext.focus when the trigger is focused", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalled();
        });

        scopedIt("calls widgetContext.blur when the trigger is blurred", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalled();
        });

        scopedIt("calls widgetContext.focus when the combobox opens", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            await wrapper.getComponent(ControlComboboxStub).vm.$emit("update:open", true);
            expect(widgetContext.focus).toHaveBeenCalled();
        });

        scopedIt("calls widgetContext.blur when the combobox closes", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            await wrapper.getComponent(ControlComboboxStub).vm.$emit("update:open", false);
            expect(widgetContext.blur).toHaveBeenCalled();
        });
    });

    /* -------------------------------------------------------------- */
    /*  Attribute passthrough                                          */
    /* -------------------------------------------------------------- */

    describe("Attribute passthrough", () => {
        scopedIt("passes non-widget attrs to the combobox root via $attrs", async () => {
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS },
                attrs: { "aria-label": "color picker" },
            });
            const root = wrapper.getComponent(ControlComboboxStub);
            expect(root.attributes("aria-label")).toBe("color picker");
        });
    });

    /* -------------------------------------------------------------- */
    /*  Multiple mode edge cases                                       */
    /* -------------------------------------------------------------- */

    describe("Multiple mode", () => {
        scopedIt("passes multiple prop to the combobox root", async () => {
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, multiple: true },
            });
            const root = wrapper.getComponent(ControlComboboxStub);
            expect(root.props("multiple")).toBe(true);
        });

        scopedIt("initialises effectiveValue as empty array when combinedValue is null and multiple=true", async () => {
            widgetContext.state.combinedValue = null;
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, multiple: true },
            });
            const root = wrapper.getComponent(ControlComboboxStub);
            expect(root.props("modelValue")).toEqual([]);
        });

        scopedIt("shows placeholder for empty multiple selection", async () => {
            widgetContext.state.combinedValue = [];
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, multiple: true, placeholder: "Choose colors" },
            });
            expect(wrapper.get(QA_SEL).text()).toContain("Choose colors");
        });
    });

    /* -------------------------------------------------------------- */
    /*  Virtualizer                                                    */
    /* -------------------------------------------------------------- */

    describe("Virtualizer", () => {
        scopedIt("renders non-grouped items through the virtualizer", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: STATIC_OPTIONS } });
            expect(wrapper.find("[data-stub='combobox-virtualizer']").exists()).toBe(true);
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(3);
        });

        scopedIt("passes options to virtualizer in API mode", async () => {
            searchState.options = [
                { id: 1, formatted_name: "Alpha" },
                { id: 2, formatted_name: "Beta" },
            ];
            const wrapper = mount(WidgetCombobox, { props: { app: "myapp", model: "thing" } });
            const virt = wrapper.getComponent(ControlComboboxVirtualizerStub);
            expect(virt.props("options")).toHaveLength(2);
        });

        scopedIt("passes textContent function to virtualizer", async () => {
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label" },
            });
            const virt = wrapper.getComponent(ControlComboboxVirtualizerStub);
            const fn = virt.props("textContent");
            expect(fn({ label: "Red", value: "red" })).toBe("Red");
        });

        scopedIt("does not render virtualizer for grouped items", async () => {
            searchState.isGrouped = true;
            searchState.groupByField = "category";
            searchState.options = [{ category: "Fruit", items: [{ id: 1, formatted_name: "Apple" }] }];
            const wrapper = mount(WidgetCombobox, { props: { app: "myapp", model: "thing" } });
            expect(wrapper.find("[data-stub='combobox-virtualizer']").exists()).toBe(false);
            expect(wrapper.find("[data-stub='combobox-group']").exists()).toBe(true);
        });
    });

    /* -------------------------------------------------------------- */
    /*  Static mode filtering                                          */
    /* -------------------------------------------------------------- */

    describe("Static mode filtering", () => {
        scopedIt("filters static options by search query", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label" },
            });
            searchState.query = "re";
            await nextTick();
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(2); // Red, Green
        });

        scopedIt("shows all options when query is empty", async () => {
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label" },
            });
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(3);
        });

        scopedIt("filtering is case-insensitive", async () => {
            const { nextTick } = await vi.importActual("vue");
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label" },
            });
            searchState.query = "RED";
            await nextTick();
            const items = wrapper.findAll("[data-stub='combobox-item']");
            expect(items).toHaveLength(1);
            expect(items[0].attributes("data-text-value")).toBe("Red");
        });

        scopedIt("shows 'No matching results.' when query matches nothing", async () => {
            const { nextTick } = await vi.importActual("vue");
            searchState.query = "xyz";
            const wrapper = mount(WidgetCombobox, {
                props: { options: STATIC_OPTIONS, optionLabel: "label" },
            });
            await nextTick();
            expect(wrapper.find("[data-stub='combobox-empty']").text()).toBe("No matching results.");
        });

        scopedIt("shows 'No options available.' when no query and no options", async () => {
            const wrapper = mount(WidgetCombobox, { props: { options: [] } });
            expect(wrapper.find("[data-stub='combobox-empty']").text()).toBe("No options available.");
        });
    });
});
