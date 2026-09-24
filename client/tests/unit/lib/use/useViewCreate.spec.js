import { useObject } from "@arrai-innovations/reactive-helpers";
import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useModelInitialValues } from "@vueda/use/useModelInitialValues.js";
import { useViewCreate } from "@vueda/use/useViewCreate.js";
import { FIELDS_PARAM } from "@vueda/utils/constants.js";
import flushPromises from "flush-promises";
import cloneDeep from "lodash-es/cloneDeep.js";
import { createPinia, setActivePinia } from "pinia";
import { reactive, readonly, ref } from "vue";

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useObject: vi.fn() };
});
vi.mock("@vueda/use/useModelConfig.js", async () => {
    const actual = await vi.importActual("@vueda/use/useModelConfig.js");
    return { ...actual, useModelConfig: vi.fn() };
});
vi.mock("@vueda/use/useFilteredActions.js", async () => {
    const actual = await vi.importActual("@vueda/use/useFilteredActions.js");
    return { ...actual, useFilteredActions: vi.fn() };
});
vi.mock("@vueda/use/useModelInitialValues.js", async () => {
    const actual = await vi.importActual("@vueda/use/useModelInitialValues.js");
    return { ...actual, useModelInitialValues: vi.fn() };
});
vi.mock("@vueda/use/useLeaveUnload.js", () => ({ useLeaveUnload: vi.fn() }));
vi.mock("vue-router", async () => ({ ...(await vi.importActual("vue-router")), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@arrai-innovations/vue-sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), message: vi.fn() },
}));
vi.mock("@sentry/vue", () => ({ captureException: vi.fn() }));

describe("lib/use/useViewCreate.js", () => {
    describe("real composition: submission and response field selection", () => {
        let props, mockModelConfig;

        beforeEach(() => {
            setActivePinia(createPinia());
            props = reactive({ app: "shop", model: "order", submitFields: undefined, redirectAfter: null });
            mockModelConfig = reactive({
                info: { pk: "id" },
                config: {
                    displayFields: ["quantity", "total"],
                    fetchFields: ["quantity", "unit_price", "total"],
                    submitFields: ["quantity"],
                    verboseName: "order",
                    expand: [],
                    formProps: {},
                    actionDetails: {},
                    fieldDetails: {},
                },
                loading: false,
                error: null,
            });
        });

        afterEach(() => {
            vi.clearAllMocks();
        });

        /**
         * Wires the real useViewCreate(), useObjectForm(), useForm(), and useObject(). The seeded
         * initial values stand in for useModelInitialValues(), which seeds one value per displayed
         * field. The server stub records each save's body and `f` parameter and computes `total`.
         */
        const buildSelectionViewCreate = async (initialValues) => {
            useModelConfig.mockReturnValue(mockModelConfig);
            useFilteredActions.mockReturnValue(reactive({ actions: [] }));
            useModelInitialValues.mockReturnValue(readonly(ref(initialValues)));

            const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");
            const saves = [];
            const create = vi.fn(({ object, params }) => {
                saves.push({ body: cloneDeep(object), fields: [...params[FIELDS_PARAM]] });
                return Promise.resolve({ id: 7, ...object, unit_price: 5, total: 5 * object.quantity });
            });
            useObject.mockImplementation((options) => realUseObject({ ...options, handlers: { create } }));

            const result = await withSetup(() => useViewCreate(props));
            await flushPromises();
            return { result, saves };
        };

        const editAndSubmit = async (result, name, value) => {
            result.formContext.registerIsModifiedHook(name, () => true);
            result.formContext.updateValue(name, value);
            await flushPromises();
            await result.objectForm.submit();
            await flushPromises();
        };

        scopedIt("submits only submitFields, leaving a displayed read-only field out of the body", async () => {
            const { result, saves } = await buildSelectionViewCreate({ quantity: 1, total: null });

            await editAndSubmit(result, "quantity", 2);

            expect(saves).toHaveLength(1);
            expect(saves[0].body).toEqual({ quantity: 2 });
        });

        scopedIt("requests fetchFields in the save response and exposes them on the save result", async () => {
            const { result, saves } = await buildSelectionViewCreate({ quantity: 1, total: null });

            await editAndSubmit(result, "quantity", 2);

            expect(saves[0].fields).toEqual(expect.arrayContaining(["id", "quantity", "unit_price", "total"]));
            expect(result.objectForm.state.object).toMatchObject({ id: 7, quantity: 2, unit_price: 5, total: 10 });
        });

        scopedIt("uses the submitFields prop over the model config", async () => {
            props.submitFields = ["quantity", "total"];
            const { result, saves } = await buildSelectionViewCreate({ quantity: 1, total: null });

            await editAndSubmit(result, "quantity", 2);

            expect(saves[0].body).toEqual({ quantity: 2, total: null });
        });

        scopedIt("keeps falsy submitted values", async () => {
            mockModelConfig.config.displayFields = ["quantity", "active", "note", "tags"];
            mockModelConfig.config.submitFields = ["quantity", "active", "note", "tags"];
            const { result, saves } = await buildSelectionViewCreate({
                quantity: 1,
                active: false,
                note: null,
                tags: [],
            });

            await editAndSubmit(result, "quantity", 0);

            expect(saves[0].body).toEqual({ quantity: 0, active: false, note: null, tags: [] });
        });
    });
});
