import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

vi.mock("@vueda/use/useIsActive.js", async () => {
    const { ref } = await vi.importActual("vue");
    return { useIsActive: vi.fn(() => ref(true)) };
});

describe("lib/use/useWarnings.js", () => {
    let useWarnings, OnRetrieveErrorHandler, reactive, ref;

    beforeEach(async () => {
        ({ reactive, ref } = await vi.importActual("vue"));
        const mod = await vi.importActual("@vueda/use/useWarnings.js");
        useWarnings = mod.useWarnings;
        OnRetrieveErrorHandler = mod.OnRetrieveErrorHandler;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    scopedIt("OnRetrieveErrorHandler handles FormValidationError", async () => {
        const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
        const error = new FormValidationError({}, {});
        const formContext = { handleServerFormValidationError: vi.fn() };
        const state = reactive({ formValidationErrors: {} });
        const result = await OnRetrieveErrorHandler({ error, formContext, state });
        expect(formContext.handleServerFormValidationError).toHaveBeenCalledWith(error);
        expect(Object.keys(state.formValidationErrors).length).toBeGreaterThan(0);
        expect(result).toBe(true);
    });

    scopedIt("fetches warnings and reapplies on initialValues change", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);

        const formContext = { state: reactive({ initialValues: null }), handleServerFormValidationError: vi.fn() };
        const app = ref("blog");
        const model = ref("post");
        const view = ref("update");
        const pk = ref("1");

        useWarnings(app, model, formContext, view, pk);
        await flushPromises();

        expect(fetchMock).toHaveBeenCalled();
        formContext.state.initialValues = { foo: "bar" };
        await flushPromises();
        expect(formContext.handleServerFormValidationError).toHaveBeenCalled();
    });
});
