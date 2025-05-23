import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseObject = vi.fn();
const mockedUseForm = vi.fn();
const mockedUseLookupContext = vi.fn();
const mockedUseModelConfig = vi.fn();
const mockedUseObjectForm = vi.fn();
const mockedUseWarnings = vi.fn();

vi.mock("@arrai-innovations/reactive-helpers", () => ({
    useObject: mockedUseObject,
}));
vi.mock("@vueda/use/useForm.js", () => ({
    useForm: mockedUseForm,
}));
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));
vi.mock("@vueda/use/useObjectForm.js", () => ({
    useObjectForm: mockedUseObjectForm,
}));
vi.mock("@vueda/use/useWarnings.js", () => ({
    useWarnings: mockedUseWarnings,
}));

let detailedViewEmit;
const DetailedViewStub = defineComponent({
    name: "DetailedViewStub",
    props: ["modelValue", "app", "model", "pk", "viewName", "submitFields", "objectForm"],
    emits: ["update:modelValue", "form-context", "form-object", "loading", "object"],
    setup(props, { emit, attrs, slots }) {
        detailedViewEmit = emit;
        return () =>
            h(
                "div",
                {
                    "data-qa": "detailed-view",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-pk": props.pk,
                    "data-view-name": props.viewName,
                    "data-submit-fields": JSON.stringify(props.submitFields),
                    "data-object-form": props.objectForm ? "true" : "false",
                    ...attrs,
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});

vi.mock("@vueda/components/DetailedView.vue", () => ({
    default: DetailedViewStub,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewUpdate, vue, modelConfig;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    detailedViewEmit = undefined;
    modelConfig = vue.reactive({
        loading: vue.ref(false),
        error: vue.ref(null),
        info: { pk: "id" },
        config: { verboseName: "Thing", submitFields: ["name"], fieldDetails: {}, expand: [] },
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseObject.mockReturnValue({ state: vue.reactive({}) });
    mockedUseForm.mockReturnValue({
        state: vue.reactive({ values: {}, anyModified: false }),
        getFirstErrorField: vi.fn(() => "name"),
    });
    mockedUseObjectForm.mockReturnValue({ state: vue.reactive({ loading: false }), submit: vi.fn() });
    ViewUpdate = (await import("@vueda/views/ViewUpdate.vue")).default;
    provideStore.clear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewUpdate, { props: { app: "app", model: "model", pk: "1" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewUpdate, { props: { app: "app", model: "model", pk: "1" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("passes props to DetailedView and forwards events", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewUpdate, {
        props: { app: "myApp", model: "myModel", pk: "5", submitFields: ["name"], redirectAfter: "read" },
        attrs: { foo: "bar" },
        slots: { default: "<span>default</span>", extra: "<span>extra</span>" },
    });

    const dv = wrapper.find('[data-qa="detailed-view"]');
    expect(dv.attributes("data-app")).toBe("myApp");
    expect(dv.attributes("data-model")).toBe("myModel");
    expect(dv.attributes("data-pk")).toBe("5");
    expect(dv.attributes("data-view-name")).toBe("update");
    expect(dv.attributes("foo")).toBe("bar");
    expect(JSON.parse(dv.attributes("data-submit-fields"))).toEqual(["name"]);
    expect(dv.attributes("data-object-form")).toBe("true");
    expect(dv.find('[data-slot="default"]').text()).toBe("default");
    expect(dv.find('[data-slot="extra"]').text()).toBe("extra");

    detailedViewEmit("loading", true);
    detailedViewEmit("object", { id: 5 });
    detailedViewEmit("form-object", { foo: "bar" });
    detailedViewEmit("form-context", { baz: 1 });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("loading")[0]).toEqual([true]);
    expect(wrapper.emitted("object")[0]).toEqual([{ id: 5 }]);
    expect(wrapper.emitted("form-object")[0]).toEqual([{ foo: "bar" }]);
    expect(wrapper.emitted("form-context")[0]).toEqual([{ baz: 1 }]);

    const formArg = mockedUseForm.mock.calls[0][0];
    expect(vue.isReactive(formArg)).toBe(true);
    expect(mockedUseWarnings).toHaveBeenCalled();
});
