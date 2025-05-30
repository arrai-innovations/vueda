import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FilterModelSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const FieldRendererStub = defineComponent({
    name: "FieldRendererStub",
    props: ["formModelName"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "field-renderer", "data-name": props.formModelName },
                Object.entries(slots).map(([n, fn]) => h("div", { "data-slot": n }, fn ? fn() : null)),
            );
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit }) {
        return () => h("button", { "data-qa": "button", onClick: () => emit("click") });
    },
});

const themeFn = vi.fn((k) => k);
const mockedUseTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme }));
const mockedUseSlotNameResolver = vi.fn(() => ({ name: "slot" }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver: mockedUseSlotNameResolver }));
vi.mock("@vueda/components/FieldRenderer.vue", () => ({ default: FieldRendererStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));

let FilterForm;

beforeEach(async () => {
    FilterForm = (await import("@vueda/components/FilterForm.vue")).default;
    themeFn.mockClear();
    mockedUseTheme.mockClear();
    mockedUseSlotNameResolver.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

function mountForm(options = {}) {
    const filterModel = {};
    const formContext = { state: reactive({ anyError: false, anyModified: false }) };
    return mount(FilterForm, {
        props: {
            filterName: "status",
            filterLabel: "Status",
            applyFilter: vi.fn(),
            ...options.props,
        },
        slots: options.slots,
        global: {
            stubs: { FieldRenderer: FieldRendererStub, Button: ButtonStub },
            provide: {
                [FilterModelSymbol]: filterModel,
                [FormContextSymbol]: formContext,
            },
        },
    });
}

describe("lib/components/FilterForm.vue", () => {
    scopedIt("calls applyFilter on submit", async () => {
        const applyFilter = vi.fn();
        const wrapper = mountForm({ props: { applyFilter } });
        await wrapper.get("form").trigger("submit.prevent");
        expect(applyFilter).toHaveBeenCalled();
    });

    scopedIt("uses slot name resolvers", () => {
        const wrapper = mountForm();
        expect(mockedUseSlotNameResolver).toHaveBeenCalledTimes(2);
        expect(wrapper.get("[data-qa='field-renderer']").attributes("data-name")).toBe("status");
    });
});
