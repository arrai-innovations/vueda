import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { defineComponent, h } from "vue";

// Stubs
const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "error-display" }, slots.default ? slots.default() : null);
    },
});
const FormChoresStub = defineComponent({
    name: "FormChoresStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-chores" }, slots.default ? slots.default() : null);
    },
});
const FieldStringStub = defineComponent({
    name: "FieldStringStub",
    props: ["fieldValue", "label", "name"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "field-string" }, slots.default ? slots.default() : null);
    },
});
const WidgetReadOnlyStub = defineComponent({
    name: "WidgetReadOnlyStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "widget-read-only" }, slots.default ? slots.default() : null);
    },
});
const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label", "loading"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "prime-button",
                    "data-label": props.label,
                    "data-loading": String(props.loading),
                    onClick: () => emit("click"),
                },
                slots.default ? slots.default() : null,
            );
    },
});

// Mocks
const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig", () => ({ useModelConfig: mockedUseModelConfig }));
const mockedUseTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));
const toastAdd = vi.fn();
vi.mock("primevue/usetoast", () => ({ useToast: () => ({ add: toastAdd }) }));
const routerPush = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ query: { returnPath: "/back" } }),
}));
const getCRUDForTo = vi.fn(async () => "/list");
vi.mock("@vueda/router/getCrud.js", () => ({ getCRUDForTo }));
vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/FormChores.vue", () => ({ default: FormChoresStub }));
vi.mock("@vueda/fields/FieldString.vue", () => ({ default: FieldStringStub }));
vi.mock("@vueda/widgets/WidgetReadOnly.vue", () => ({ default: WidgetReadOnlyStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));

let ActionForm, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    ActionForm = (await import("@vueda/components/ActionForm.vue")).default;
    mockedUseModelConfig.mockReset();
    mockedUseTheme.mockClear();
    toastAdd.mockClear();
    routerPush.mockClear();
});

function mountWithContext(options = {}) {
    const formContext = {
        state: vue.reactive({ anyError: false, submittingValues: {} }),
        setAllTouched: vi.fn(),
    };
    const modelConfig = vue.reactive({
        info: { verboseName: "Person", verboseNamePlural: "People" },
        config: { defaultView: "detail" },
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    const runAction = vi.fn(() => Promise.resolve());
    const wrapper = mount(ActionForm, {
        props: {
            app: "app",
            model: "person",
            action: "activate",
            fetchState: {
                errored: false,
                error: null,
                loading: false,
                objectsInOrder: [{ id: 1 }, { id: 2 }],
                objects: { 1: {}, 2: {} },
            },
            runAction,
        },
        global: { provide: { [FormContextSymbol]: formContext } },
        ...options,
    });
    return { wrapper, runAction };
}

describe("lib/components/ActionForm.vue", () => {
    scopedIt("renders selected objects and confirm message", () => {
        const { wrapper } = mountWithContext();
        const items = wrapper.findAll('[data-qa="action-form-list-item"]');
        expect(items).toHaveLength(2);
        const message = wrapper.find('[data-qa="action-form-message"]').text();
        expect(message).toContain("Are you sure you want to activate the selected People?");
        expect(mockedUseTheme).toHaveBeenCalledWith("ActionForm", expect.any(Object));
    });

    scopedIt("executes runAction and shows toast on confirm", async () => {
        const { wrapper, runAction } = mountWithContext();
        await wrapper.findAll('[data-qa="prime-button"]')[0].trigger("click");
        await flushPromises();
        expect(runAction).toHaveBeenCalledWith("activate");
        expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: "success" }));
        expect(routerPush).toHaveBeenCalledWith("/back");
    });

    scopedIt("navigates back when cancel clicked", async () => {
        const { wrapper } = mountWithContext();
        routerPush.mockClear();
        await wrapper.findAll('[data-qa="prime-button"]')[1].trigger("click");
        expect(routerPush).toHaveBeenCalledWith("/list");
    });
});
