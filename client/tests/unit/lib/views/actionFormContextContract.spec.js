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
 */

const mockedUseViewDestroy = vi.fn();
vi.mock("@vueda/use/useViewDestroy.js", () => ({ useViewDestroy: mockedUseViewDestroy }));

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
    routerPush.mockReset();
    Object.values(toastMock).forEach((fn) => fn.mockReset());
});

/**
 * Mount ViewDestroy over the real ModelActionForm and ActionForm.
 *
 * @param {object} [options]
 * @param {Function} [options.handleDelete] - Stands in for the delete request.
 * @param {object} [options.props] - Extra props for the view.
 * @returns {import('@vue/test-utils').VueWrapper}
 */
function mountRealStack({ handleDelete = vi.fn(), props = {} } = {}) {
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
    mockedUseViewDestroy.mockReturnValue({ modelConfig, handleDelete, instanceList: { state } });
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
                state: reactive({ errors: {}, anyError: false, submittingValues: {} }),
                setAllTouched: vi.fn(),
                handleServerFormValidationError: vi.fn(),
            };
            mockedUseViewDestroy.mockReturnValue({
                modelConfig,
                handleDelete: vi.fn(),
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

        scopedIt("routes a server 400 onto the form rather than swallowing it", async () => {
            const error = new FormValidationError(
                { pks: ["Two of these are already gone."] },
                new Response(null, { status: 400 }),
            );
            const handleDelete = vi.fn().mockRejectedValue(error);
            const wrapper = mountRealStack({ handleDelete });

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
