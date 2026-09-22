import { useListInstance } from "@arrai-innovations/reactive-helpers";
import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormContextSymbol, LookupContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";

/**
 * Mounts ViewDestroy over the real ModelActionForm and ActionForm.
 *
 * These tests cover provider wiring, dry-run routing, server-validation handling, and typed-confirm gating with the
 * composed stack in place.
 */

const mockedUseViewDestroy = vi.fn();
vi.mock("@vueda/use/useViewDestroy.js", () => ({ useViewDestroy: mockedUseViewDestroy }));

// Stub fetchHelper for background store reads. Action requests go through the real CRUD handlers and global fetch.
const mockedFetchHelper = vi.hoisted(() => vi.fn());
vi.mock("@vueda/utils/fetchSupport.js", async () => {
    const actual = await vi.importActual("@vueda/utils/fetchSupport.js");
    return { ...actual, fetchHelper: mockedFetchHelper };
});

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
const RouterLinkStub = { name: "RouterLink", template: "<a><slot /></a>" };
vi.mock("vue-router", () => ({
    // LinkModelView, reached through WidgetReadOnly, checks hasRoute before resolving.
    useRouter: () => ({ push: routerPush, hasRoute: () => false, resolve: () => ({ href: "#" }) }),
    useRoute: () => ({ query: {} }),
    RouterLink: RouterLinkStub,
}));

const lookupContext = { requestObject: vi.fn(() => Promise.resolve({})) };

let ViewDestroy;
let mockedFetch;

beforeEach(async () => {
    // WidgetReadOnly resolves lookup objects through the model stores.
    setActivePinia(createPinia());
    ViewDestroy = (await import("@vueda/views/ViewDestroy.vue")).default;
    (await import("@vueda/utils/listCrud.js")).setupDefaultListCrud();
    (await import("@vueda/utils/objectCrud.js")).setupDefaultObjectCrud();
    mockedUseViewDestroy.mockReset();
    mockedFetchHelper.mockReset();
    mockedFetchHelper.mockResolvedValue({});
    mockedFetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    global.fetch = mockedFetch;
    routerPush.mockReset();
    Object.values(toastMock).forEach((fn) => fn.mockReset());
});

/**
 * Every action request `fetch` saw, as `{ url, options }`.
 *
 * @returns {{url: string, options: RequestInit}[]} The captured requests.
 */
function actionRequests() {
    return mockedFetch.mock.calls
        .map(([url, options]) => ({ url: String(url), options: options || {} }))
        .filter(({ options }) => options.method === "DELETE");
}

/**
 * Mount ViewDestroy over the real ModelActionForm and ActionForm.
 *
 * @param {object} [options]
 * @param {object} [options.props] - Extra props for the view.
 * @returns {import('@vue/test-utils').VueWrapper}
 */
function mountRealStack({ props = {} } = {}) {
    // Use a real seeded list so destroy exercises the registered bulkDelete handler.
    mockedUseViewDestroy.mockImplementation(() => {
        const instanceList = useListInstance({
            props: reactive({
                target: { app: "showcase", model: "customer" },
                pkKey: "id",
                params: {},
            }),
        });
        instanceList.pushObjects([
            { id: 4, formatted_name: "Vellum Press" },
            { id: 11, formatted_name: "Pelham Transit Authority" },
        ]);
        return { modelConfig, instanceList };
    });
    return mount(ViewDestroy, {
        props: { app: "showcase", model: "customer", pk: ["4", "11"], ...props },
        attachTo: document.body,
        global: {
            components: { RouterLink: RouterLinkStub },
            provide: { [LookupContextSymbol]: lookupContext },
        },
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
                    labels: {},
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
                registerLabel: vi.fn(),
                unregisterLabel: vi.fn(),
            };
            mockedUseViewDestroy.mockImplementation(() => ({
                modelConfig,
                instanceList: useListInstance({
                    props: reactive({ target: { app: "showcase", model: "customer" }, pkKey: "id", params: {} }),
                }),
            }));
            const wrapper = mount(ViewDestroy, {
                props: { app: "showcase", model: "customer", pk: "4" },
                global: {
                    components: { RouterLink: RouterLinkStub },
                    provide: {
                        [FormContextSymbol]: hostContext,
                        [LookupContextSymbol]: lookupContext,
                    },
                },
            });

            // A host-provided context must keep serving the fields below it, so the
            // establish-when-absent branch has to stay conditional. ViewAction relies on this.
            expect(wrapper.vm.$.provides[FormContextSymbol]).toBe(hostContext);
        });

        scopedIt("runs the dry-run pre-flight when the target pks come from a prop", async () => {
            mountRealStack();
            await flushPromises();

            // `readyToDryRun` may be true on first render when target PKs come from props.
            const preflights = actionRequests();
            expect(preflights).toHaveLength(1);
            expect(preflights[0].options.headers["Dry-Run"]).toBe("true");
            // Bulk destroy targets the list route; "destroy" is not a DynamicRoute.
            expect(preflights[0].url).toMatch(/\/routes\/showcase\/customer\/$/);
        });

        scopedIt("routes a server 400 onto the form rather than swallowing it", async () => {
            mockedFetch.mockResolvedValue(
                new Response(JSON.stringify({ pks: ["Two of these are already gone."] }), { status: 400 }),
            );
            const wrapper = mountRealStack({ props: { enableDryRun: false } });

            await wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]').trigger("click");
            await flushPromises();

            // Server field errors should land in the injected form context.
            expect(wrapper.find('[data-qa="action-form-validation"]').exists()).toBe(true);
            expect(wrapper.text()).toContain("Two of these are already gone.");
        });

        scopedIt("gates submit behind the typed-confirm phrase", async () => {
            const wrapper = mountRealStack({ props: { confirmText: "delete 2 customers" } });
            // Let the dry-run pre-flight settle; while it is in flight the button is disabled for
            // loading rather than for the typed-confirm gate under test.
            await flushPromises();

            const submit = wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]');
            expect(submit.attributes("disabled")).toBeDefined();

            await wrapper.get('[data-qa="typed-confirm-field-input"]').setValue("delete 2 customers");
            await flushPromises();
            expect(
                wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]').attributes("disabled"),
            ).toBeUndefined();
        });
    });
});
