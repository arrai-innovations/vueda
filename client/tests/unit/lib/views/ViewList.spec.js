import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

const mockedUseIsActive = vi.fn();
vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: mockedUseIsActive,
}));

const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));

const mockedUseWorkflowTransitions = vi.fn();
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: mockedUseWorkflowTransitions,
}));

const mockedUseFilteredActions = vi.fn();
vi.mock("@vueda/use/useFilteredActions", () => ({
    useFilteredActions: mockedUseFilteredActions,
}));

const mockedUseSlotNameResolver = vi.fn(() => ({ name: "button" }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({
    useSlotNameResolver: mockedUseSlotNameResolver,
}));

const mockedUseTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

const mockedUseList = vi.fn();
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useList: mockedUseList };
});

vi.mock("@vueda/router/getCrud.js", () => ({
    getCRUDForTo: vi.fn(async () => ({})),
}));

const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "error-display", ...attrs });
    },
});
const FilterGroupStub = defineComponent({
    name: "FilterGroupStub",
    emits: ["filter-change", "query-change", "hide-filter-form"],
    setup(_, { slots, attrs }) {
        return () =>
            h(
                "div",
                { "data-qa": "filter-group", ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
const FormFeedbackStub = defineComponent({
    name: "FormFeedbackStub",
    props: ["type"],
    setup(props) {
        return () => h("div", { "data-qa": `form-feedback-${props.type}` });
    },
});
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["view"],
    setup(props) {
        return () => h("div", { "data-qa": "link-model-view", "data-view": props.view });
    },
});
let objectsGridProps;
const ObjectsGridStub = defineComponent({
    name: "ObjectsGridStub",
    props: ["fields"],
    setup(props, { slots, attrs }) {
        objectsGridProps = props;
        return () => h("div", { "data-qa": "objects-grid", ...attrs }, slots.default ? slots.default() : null);
    },
});
const PageTitleStub = defineComponent({
    name: "PageTitleStub",
    props: ["title"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "div",
                { "data-qa": "page-title", "data-title": props.title, ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
const PaginationComponentStub = defineComponent({
    name: "PaginationComponentStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "pagination-component", ...attrs });
    },
});
const StickyBarStub = defineComponent({
    name: "StickyBarStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "sticky-bar", ...attrs }, slots.default ? slots.default() : null);
    },
});
const InputGroupStub = defineComponent({
    name: "InputGroupStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "input-group" }, slots.default ? slots.default() : null);
    },
});
const InputTextStub = defineComponent({
    name: "InputTextStub",
    props: ["modelValue"],
    emits: ["update:model-value", "search"],
    setup(props, { attrs, emit }) {
        return () =>
            h("input", {
                "data-qa": "input-text",
                value: props.modelValue,
                ...attrs,
                onInput: (e) => emit("update:model-value", e.target.value),
                onSearch: () => emit("search"),
            });
    },
});
const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label"],
    emits: ["click"],
    setup(props, { emit }) {
        return () => h("button", { "data-qa": "button", "data-label": props.label, onClick: () => emit("click") });
    },
});
const CheckboxStub = defineComponent({
    name: "CheckboxStub",
    props: ["modelValue", "value", "inputId"],
    emits: ["update:modelValue"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                type: "checkbox",
                "data-qa": "checkbox",
                value: props.value,
                id: props.inputId,
                ...attrs,
                onChange: () => emit("update:modelValue", props.value),
            });
    },
});

vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/FilterGroup.vue", () => ({ default: FilterGroupStub }));
vi.mock("@vueda/components/FormFeedback.vue", () => ({ default: FormFeedbackStub }));
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));
vi.mock("@vueda/components/ObjectsGrid.vue", () => ({ default: ObjectsGridStub }));
vi.mock("@vueda/components/PageTitle.vue", () => ({ default: PageTitleStub }));
vi.mock("@vueda/components/PaginationComponent.vue", () => ({ default: PaginationComponentStub }));
vi.mock("@vueda/components/StickyBar.vue", () => ({ default: StickyBarStub }));
vi.mock("primevue/inputgroup", () => ({ default: InputGroupStub }));
vi.mock("primevue/inputtext", () => ({ default: InputTextStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("primevue/checkbox", () => ({ default: CheckboxStub }));

const route = { query: {} };
const routerPush = vi.fn();
vi.mock("vue-router", () => ({
    useRoute: () => route,
    useRouter: () => ({ push: routerPush }),
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewList, vue, modelConfig;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    objectsGridProps = undefined;
    modelConfig = vue.reactive({
        loading: vue.ref(false),
        errored: vue.ref(false),
        error: vue.ref(null),
        clearError: vi.fn(),
        info: { pk: "id" },
        config: {
            displayFields: ["field__name"],
            fieldDetails: { field__name: {} },
            verboseNamePlural: "items",
            actionDetails: {},
            fetchFields: [],
        },
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseIsActive.mockReturnValue(ref(true));
    mockedUseWorkflowTransitions.mockReturnValue(
        vue.readonly(
            vue.reactive({
                transitions: [],
                loading: ref(false),
                error: ref(null),
                errored: ref(false),
                clearError: vi.fn(),
            }),
        ),
    );
    mockedUseFilteredActions.mockReturnValue(vue.reactive({ actions: [] }));
    mockedUseList.mockReturnValue({
        state: vue.reactive({
            loading: false,
            errored: false,
            error: null,
            order: [],
            sorted: [],
            objects: [],
            objectsInOrder: [],
            totalPages: 1,
            totalRecords: 0,
            perPage: 10,
            relatedObjects: [],
            calculatedObjects: [],
        }),
        clearError: vi.fn(),
    });
    ViewList = (await import("@vueda/views/ViewList.vue")).default;
    provideStore.clear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewList, { props: { app: "app", model: "model" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewList, { props: { app: "app", model: "model" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("translates expanded field names for ObjectsGrid", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewList, {
        props: {
            app: "a",
            model: "b",
            extraFieldObjects: [{ name: "foo__bar", label: "Foo" }],
        },
    });
    await vue.nextTick();
    const fields = objectsGridProps.fields;
    expect(fields[0]).toEqual({ name: "foo__bar", label: "Foo", value: "foo.bar" });
    expect(fields[1]).toEqual({ name: "field__name", value: "field.name" });
    wrapper.unmount();
});
