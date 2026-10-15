import { scopedIt } from "@tests/unit/utils.js";
import { shallowMount } from "@vue/test-utils";
import FormModel from "@vueda/form/form-model/FormModel.vue";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";

// Every view under test builds its FormModel props through the real composables. Only the data sources are mocked,
// so these specs cover the whole path from one model config to the props that FormModel receives.

const { mockedUseObject, modelConfig } = vi.hoisted(() => ({
    mockedUseObject: vi.fn(),
    modelConfig: { loading: false, error: null, info: { pk: "id" }, config: {} },
}));
vi.mock("@arrai-innovations/reactive-helpers", async (importOriginal) => ({
    ...(await importOriginal()),
    assignReactiveObject: vi.fn(),
    loadingCombine: (a, b) => a || b,
    useObject: mockedUseObject,
}));

vi.mock("@vueda/use/useModelConfig.js", async () => {
    const { reactive } = await vi.importActual("vue");
    const state = reactive(modelConfig);
    return { useModelConfig: () => state };
});
vi.mock("@vueda/use/useFilteredActions.js", async () => {
    const { reactive } = await vi.importActual("vue");
    return { useFilteredActions: () => reactive({ actions: [] }) };
});
vi.mock("@vueda/use/useIsActive.js", async () => {
    const { ref } = await vi.importActual("vue");
    return { useIsActive: () => ref(true) };
});
vi.mock("@vueda/use/useObject404.js", () => ({ useObject404: vi.fn() }));
vi.mock("@vueda/use/useLookupContext.js", () => ({ useLookupContext: vi.fn() }));
vi.mock("@vueda/use/useModelInitialValues.js", async () => {
    const { reactive } = await vi.importActual("vue");
    return { useModelInitialValues: () => reactive({}) };
});
vi.mock("@vueda/use/usePageTitle.js", () => ({ usePageTitle: vi.fn() }));
vi.mock("@vueda/use/useObjectForm.js", async () => {
    const { reactive } = await vi.importActual("vue");
    return {
        useObjectForm: () => ({
            state: reactive({ loading: false, error: null }),
            submit: vi.fn(),
            confirmation: reactive({ open: false, messages: {}, confirm: vi.fn(), cancel: vi.fn() }),
        }),
    };
});

// One model config shared by every view: a map, a variant, a key that no view forwards, and the three selector keys.
const CONFIG_FORM_PROPS = {
    fieldProps: { name: { source: "config" } },
    widgetProps: { name: { source: "config" } },
    variant: "configured",
    computedFields: ["configured_total"],
    app: "otherapp",
    model: "othermodel",
    view: "otherview",
};

// The form props that a consuming view passes, for the views that declare them.
const PASSED_PROPS = {
    fieldProps: { name: { source: "view" } },
    widgetProps: { name: { source: "view" } },
    formModelVariant: "passed",
};

let instanceState;
let modelSequence = 0;

beforeEach(() => {
    setActivePinia(createPinia());
    instanceState = reactive({
        loading: false,
        error: null,
        object: null,
        relatedObjects: {},
        calculatedObjects: {},
        calculatedObject: {},
    });
    mockedUseObject.mockReturnValue({ state: instanceState });
    modelConfig.config = {
        verboseName: "Widget",
        fetchFields: ["id", "name"],
        actionDetails: {},
        formProps: { ...CONFIG_FORM_PROPS },
    };
});

afterEach(() => {
    vi.restoreAllMocks();
});

// A fresh model name per mount, because the selector-key warning logs once per app, model, and view.
const nextModel = () => `widget${++modelSequence}`;

const VIEWS = {
    ViewCreate: {
        load: () => import("@vueda/views/ViewCreate.vue"),
        view: "create",
        props: () => ({}),
    },
    ViewUpdate: {
        load: () => import("@vueda/views/ViewUpdate.vue"),
        view: "update",
        props: () => ({ pk: "1" }),
    },
    ViewRead: {
        load: () => import("@vueda/views/ViewRead.vue"),
        view: "read",
        props: () => ({ pk: "1" }),
    },
    DetailView: {
        load: () => import("@vueda/views/DetailView.vue"),
        view: "update",
        props: () => ({ pk: "1", viewName: "update", modelValue: {} }),
    },
};

async function mountView(name, extraProps = {}) {
    const { default: component } = await VIEWS[name].load();
    const model = nextModel();
    const formContext = { state: reactive({ values: {}, anyModified: false }), getFirstErrorField: () => null };
    const wrapper = shallowMount(component, {
        props: { app: "shop", model, ...VIEWS[name].props(), ...extraProps },
        global: { provide: { [FormContextSymbol]: formContext } },
    });
    return { formModel: wrapper.findComponent(FormModel), model };
}

describe("formProps precedence across the form views", () => {
    describe.each(Object.keys(VIEWS))("%s", (name) => {
        scopedIt("applies model config formProps when the view passes no form props", async () => {
            const { formModel } = await mountView(name);
            expect(formModel.props("fieldProps")).toEqual({ name: { source: "config" } });
            expect(formModel.props("widgetProps")).toEqual({ name: { source: "config" } });
            expect(formModel.props("variant")).toBe("configured");
        });

        scopedIt("passes a configured key that the view does not forward", async () => {
            const { formModel } = await mountView(name);
            expect(formModel.props("computedFields")).toEqual(["configured_total"]);
        });

        scopedIt("ignores app, model, and view in model config formProps and warns once per key", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const { formModel, model } = await mountView(name);
            expect(formModel.props("app")).toBe("shop");
            expect(formModel.props("model")).toBe(model);
            expect(formModel.props("view")).toBe(VIEWS[name].view);
            const messages = warn.mock.calls.map(([message]) => message);
            for (const key of ["app", "model", "view"]) {
                expect(messages.filter((m) => m.startsWith(`The "${key}" key in model config formProps`))).toHaveLength(
                    1,
                );
            }
        });

        scopedIt("renders FormModel's own variant default when neither layer sets one", async () => {
            delete modelConfig.config.formProps.variant;
            const { formModel } = await mountView(name);
            expect(formModel.props("variant")).toBe("default");
        });
    });

    describe.each(["ViewCreate", "ViewUpdate", "DetailView"])("%s with form props passed", (name) => {
        scopedIt("lets the view's own form props win over model config formProps", async () => {
            const { formModel } = await mountView(name, PASSED_PROPS);
            expect(formModel.props("fieldProps")).toEqual({ name: { source: "view" } });
            expect(formModel.props("widgetProps")).toEqual({ name: { source: "view" } });
            expect(formModel.props("variant")).toBe("passed");
            expect(formModel.props("computedFields")).toEqual(["configured_total"]);
        });

        scopedIt("ranks the view's formProps between model config and the view's own form props", async () => {
            const { formModel } = await mountView(name, {
                formProps: { fieldProps: { name: { source: "formProps" } }, variant: "fromFormProps" },
                formModelVariant: "passed",
            });
            expect(formModel.props("fieldProps")).toEqual({ name: { source: "formProps" } });
            expect(formModel.props("variant")).toBe("passed");
        });

        scopedIt("ignores app, model, and view in the view's formProps", async () => {
            vi.spyOn(console, "warn").mockImplementation(() => {});
            const { formModel, model } = await mountView(name, {
                formProps: { app: "otherapp", model: "othermodel", view: "otherview" },
            });
            expect(formModel.props("app")).toBe("shop");
            expect(formModel.props("model")).toBe(model);
            expect(formModel.props("view")).toBe(VIEWS[name].view);
        });
    });

    describe.each(["ViewUpdate", "ViewRead", "DetailView"])("%s with a calculated object", (name) => {
        scopedIt("layers calculated values over the configured widgetProps map", async () => {
            instanceState.calculatedObject = { total: 3 };
            const { formModel } = await mountView(name);
            expect(formModel.props("widgetProps")).toEqual({ name: { source: "config" }, total: 3 });
        });
    });
});
