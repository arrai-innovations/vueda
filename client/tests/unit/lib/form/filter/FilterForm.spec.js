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

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => k });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));
const mockedUseSlotNameResolver = vi.fn(() => ({ name: "slot" }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver: mockedUseSlotNameResolver }));
vi.mock("@vueda/form/form-model/FieldRenderer.vue", () => ({ default: FieldRendererStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

let FilterForm;

beforeEach(async () => {
    FilterForm = (await import("@vueda/form/filter/FilterForm.vue")).default;
    themeFn.mockClear();
    mockedUseTheme.mockClear();
    mockedUseSlotNameResolver.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

function mountForm(options = {}) {
    const filterModel = options.provide?.filterModel ?? {};
    const formContext = options.provide?.formContext ?? { state: reactive({ anyError: false, anyModified: false }) };
    const provide = {};
    if (!options.provide?.omitFilterModel) {
        provide[FilterModelSymbol] = filterModel;
    }
    if (!options.provide?.omitFormContext) {
        provide[FormContextSymbol] = formContext;
    }
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
            provide,
        },
    });
}

describe("lib/form/filter/FilterForm.vue", () => {
    describe("Submission and rendering", () => {
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

        scopedIt("renders default heading and button without slots", () => {
            mockedUseSlotNameResolver
                .mockReturnValueOnce({ name: "submit-slot" })
                .mockReturnValueOnce({ name: "header-slot" });
            const wrapper = mountForm();
            expect(wrapper.get("h1").text()).toBe("Filter by Status");
            expect(wrapper.findComponent(ButtonStub).exists()).toBe(true);
        });

        scopedIt("does not render default button when submitButton slot provided", () => {
            mockedUseSlotNameResolver
                .mockReturnValueOnce({ name: "submit-slot" })
                .mockReturnValueOnce({ name: "header-slot" });
            const wrapper = mountForm({
                slots: {
                    "submit-slot": () => h("button", { "data-qa": "slot-submit" }),
                },
            });
            expect(wrapper.findComponent(ButtonStub).exists()).toBe(false);
            expect(wrapper.get("[data-qa='slot-submit']")).toBeTruthy();
        });
    });

    describe("Form context and slot props", () => {
        scopedIt("disabled state follows formContext", () => {
            mockedUseSlotNameResolver
                .mockReturnValueOnce({ name: "submit-slot" })
                .mockReturnValueOnce({ name: "header-slot" });
            const wrapper = mountForm({
                provide: { formContext: { state: reactive({ anyError: true, anyModified: false }) } },
                slots: {
                    "submit-slot": ({ disabled }) =>
                        h("button", { "data-qa": "slot-submit", "data-disabled": String(disabled) }),
                },
            });
            expect(wrapper.get("[data-qa='slot-submit']").attributes("data-disabled")).toBe("true");
        });

        scopedIt("throws without formContext injection", () => {
            expect(() => mountForm({ provide: { omitFormContext: true } })).toThrow();
        });

        scopedIt("passes filterName and filterLabel to relevant slots", () => {
            mockedUseSlotNameResolver
                .mockReturnValueOnce({ name: "submit-slot" })
                .mockReturnValueOnce({ name: "header-slot" });
            const wrapper = mountForm({
                slots: {
                    "header-slot": ({ filterLabel }) =>
                        h("div", { "data-qa": "slot-header", "data-label": filterLabel }),
                    "submit-slot": ({ filterName }) => h("div", { "data-qa": "slot-submit", "data-name": filterName }),
                },
            });

            expect(wrapper.get("[data-qa='field-renderer']").attributes("data-name")).toBe("status");

            expect(wrapper.get("[data-qa='slot-header']").attributes("data-label")).toBe("Status");

            expect(wrapper.get("[data-qa='slot-submit']").attributes("data-name")).toBe("status");
        });
    });
});
