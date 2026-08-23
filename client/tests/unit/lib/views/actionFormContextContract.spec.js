import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormValidationError } from "@vueda/utils/errors.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";

/**
 * ActionForm requires a form context and its two host views did not supply one.
 *
 * Every layer was covered in isolation and every layer passed: the view specs stub
 * ModelActionForm, ModelActionForm.spec stubs ActionForm (and provides a context anyway),
 * and ActionForm.spec provides one too. The composition was the only untested arrangement,
 * and it was the broken one. These tests mount the real stack so that gap stays closed.
 *
 * The dry-run pre-flight lives here for the same reason: which request a mounted view
 * actually issues is only observable with ModelActionForm, ActionForm, and useActionForm
 * all real.
 */

const mockedUseViewDestroy = vi.fn();
vi.mock("@vueda/use/useViewDestroy.js", () => ({ useViewDestroy: mockedUseViewDestroy }));

const mockedFetchHelper = vi.fn();
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper: mockedFetchHelper }));

const modelConfig = {
    info: { pk: "id", verboseName: "customer", verboseNamePlural: "customers" },
    config: { actionRedirects: { default: "update" }, fetchFields: ["account"], expand: [] },
};
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => modelConfig }));
vi.mock("@vueda/use/useModelConfig", () => ({ useModelConfig: () => modelConfig }));

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));

const routerPush = vi.fn();
vi.mock("vue-router", () => ({
    // LinkModelView, reached through WidgetReadOnly, checks hasRoute before resolving.
    useRouter: () => ({ push: routerPush, hasRoute: () => false, resolve: () => ({ href: "#" }) }),
    useRoute: () => ({ query: {} }),
    RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
}));

let ViewDestroy;

beforeEach(async () => {
    // WidgetReadOnly resolves lookup objects through the model stores.
    setActivePinia(createPinia());
    ViewDestroy = (await import("@vueda/views/ViewDestroy.vue")).default;
    mockedUseViewDestroy.mockReset();
    mockedFetchHelper.mockReset();
    mockedFetchHelper.mockResolvedValue({});
    routerPush.mockReset();
    Object.values(toastMock).forEach((fn) => fn.mockReset());
});

/**
 * Mount ViewDestroy over the real ModelActionForm and ActionForm.
 *
 * @param {object} [options]
 * @param {object} [options.props] - Extra props for the view.
 * @returns {import('@vue/test-utils').VueWrapper}
 */
function mountRealStack({ props = {} } = {}) {
    const state = reactive({
        objectsInOrder: [{ id: 4 }, { id: 11 }],
        objectsMap: new Map([
            ["4", { id: 4, formatted_name: "Vellum Press" }],
            ["11", { id: 11, formatted_name: "Pelham Transit Authority" }],
        ]),
        loading: false,
        errored: false,
        error: null,
    });
    mockedUseViewDestroy.mockReturnValue({ modelConfig, instanceList: { state } });
    return mount(ViewDestroy, {
        props: { app: "showcase", model: "customer", pk: ["4", "11"], ...props },
        attachTo: document.body,
    });
}

describe("lib/**/*.vue", () => {
    describe("ActionForm form-context contract", () => {
        scopedIt("ViewDestroy mounts over the real ModelActionForm and ActionForm", () => {
            const wrapper = mountRealStack();

            // Reaching the buttons at all means ActionForm resolved a form context: its
            // submit control binds to formContext.state.anyError.
            expect(wrapper.find('[data-qa="action-form-buttons"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="action-form-list"]').exists()).toBe(true);
            expect(wrapper.text()).toContain("Vellum Press");
        });

        scopedIt("establishes a form context only when the host has not", () => {
            // Shaped enough for ActionForm to render against; identity is what is asserted.
            const hostContext = {
                marker: "from-host",
                state: reactive({
                    errors: {},
                    messages: {},
                    required: {},
                    valid: {},
                    values: {},
                    initialValues: {},
                    touched: {},
                    modified: {},
                    ignored: {},
                    dependencyValues: {},
                    focused: null,
                    anyError: false,
                    submittingValues: {},
                }),
                setAllTouched: vi.fn(),
                handleServerFormValidationError: vi.fn(),
                updateError: vi.fn(),
                deleteError: vi.fn(),
                updateMessage: vi.fn(),
                deleteMessage: vi.fn(),
                updateValue: vi.fn(),
                deleteValue: vi.fn(),
                updateInitialValue: vi.fn(),
                deleteInitialValue: vi.fn(),
                setTouched: vi.fn(),
                clearTouched: vi.fn(),
                focus: vi.fn(),
                blur: vi.fn(),
                clearServerErrors: vi.fn(),
                registerIsModifiedHook: vi.fn(() => "modified-hook"),
                unregisterIsModifiedHook: vi.fn(),
                registerIsRequiredHook: vi.fn(() => "required-hook"),
                unregisterIsRequiredHook: vi.fn(),
                registerIsValidHook: vi.fn(() => "valid-hook"),
                unregisterIsValidHook: vi.fn(),
                registerDependencyValues: vi.fn(() => "dependency-hook"),
                unregisterDependencyValues: vi.fn(),
            };
            mockedUseViewDestroy.mockReturnValue({
                modelConfig,
                instanceList: { state: reactive({ objectsInOrder: [], objectsMap: new Map() }) },
            });
            const wrapper = mount(ViewDestroy, {
                props: { app: "showcase", model: "customer", pk: "4" },
                global: { provide: { [FormContextSymbol]: hostContext } },
            });

            // A host-provided context must keep serving the fields below it, so the
            // establish-when-absent branch has to stay conditional. ViewAction relies on this.
            expect(wrapper.vm.$.provides[FormContextSymbol]).toBe(hostContext);
        });

        scopedIt("runs the dry-run pre-flight when the target pks come from a prop", async () => {
            mountRealStack();
            await nextTick();

            // readyToDryRun is a state, not an edge. ViewDestroy passes `pk` straight
            // through, so it is already true on the first evaluation and a change-only
            // watch would never fire, silently skipping the pre-flight. The store fetches
            // (model info, permitted transitions) share this mock, so match on the action
            // request rather than the call count.
            const preflights = mockedFetchHelper.mock.calls.filter(([, options]) => options?.method === "DELETE");
            expect(preflights).toHaveLength(1);
            const [url, options] = preflights[0];
            expect(options.headers["Dry-Run"]).toBe("true");
            // Bulk destroy targets the list route; "destroy" is not a DynamicRoute.
            expect(url).toMatch(/\/routes\/showcase\/customer\/$/);
        });

        scopedIt("routes a server 400 onto the form rather than swallowing it", async () => {
            const error = new FormValidationError(
                { pks: ["Two of these are already gone."] },
                new Response(null, { status: 400 }),
            );
            mockedFetchHelper.mockRejectedValue(error);
            const wrapper = mountRealStack({ props: { enableDryRun: false } });

            await wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]').trigger("click");
            await nextTick();
            await nextTick();

            // handleServerFormValidationError writes into the injected context; a no-op
            // stand-in would leave the summary empty and the toast the only trace.
            expect(wrapper.find('[data-qa="action-form-validation"]').exists()).toBe(true);
            expect(wrapper.text()).toContain("Two of these are already gone.");
        });

        scopedIt("gates submit behind the typed-confirm phrase", async () => {
            const wrapper = mountRealStack({ props: { confirmText: "delete 2 customers" } });

            const submit = wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]');
            expect(submit.attributes("disabled")).toBeDefined();

            await wrapper.get('[data-qa="typed-confirm-field-input"]').setValue("delete 2 customers");
            await nextTick();
            expect(
                wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]').attributes("disabled"),
            ).toBeUndefined();
        });
    });
});
