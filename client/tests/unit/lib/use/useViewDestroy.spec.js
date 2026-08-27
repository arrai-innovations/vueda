import { useList } from "@arrai-innovations/reactive-helpers";
import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useViewDestroy } from "@vueda/use/useViewDestroy.js";
import { ConfirmationRequiredError } from "@vueda/utils/errors.js";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

vi.mock("@vueda/use/useModelConfig.js", async () => {
    const actual = await vi.importActual("@vueda/use/useModelConfig.js");
    return {
        ...actual,
        useModelConfig: vi.fn(),
    };
});
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useList: vi.fn(),
    };
});
vi.mock("@vueda/use/useIsActive.js", async () => {
    const actual = await vi.importActual("@vueda/use/useIsActive.js");
    return {
        ...actual,
        useIsActive: vi.fn(),
    };
});

describe("lib/use/useViewDestroy.js", () => {
    let mockModelConfig, mockInstanceList, props;

    beforeEach(async () => {
        // The composables under test resolve their pinia stores during setup, so one has to exist.
        setActivePinia(createPinia());

        props = reactive({
            app: "testApp",
            model: "testModel",
            pk: "123",
        });

        mockModelConfig = reactive({
            info: {
                pk: "id",
            },
            loading: false,
        });

        mockInstanceList = {
            state: reactive({
                errored: false,
                error: null,
            }),
            bulkDelete: vi.fn().mockResolvedValue(),
            clearError: vi.fn(() => {
                mockInstanceList.state.errored = false;
                mockInstanceList.state.error = null;
            }),
        };

        useModelConfig.mockReturnValue(mockModelConfig);
        useList.mockReturnValue(mockInstanceList);
        useIsActive.mockReturnValue(ref(true));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("sets up model config and list with expected parameters", async () => {
        const result = await withSetup(() => useViewDestroy(props));

        expect(useModelConfig).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
        expect(useList).toHaveBeenCalledWith(
            expect.objectContaining({
                props: expect.any(Object),
                handlers: expect.objectContaining({ list: expect.any(Function) }),
            }),
        );

        const listArgs = useList.mock.calls[0][0];
        expect(listArgs.props.intendToList).toBe(result.validAndActive.value);
        const params = listArgs.props.params;
        expect(params.id).toEqual(["123"]);
        expect(Array.isArray(params.id)).toBe(true);

        expect(result.modelConfig).toBe(mockModelConfig);
        expect(result.instanceList).toBe(mockInstanceList);
        expect(result.validAndActive.value).toBe(true);
    });

    scopedIt("handleDelete calls bulkDelete and throws if errored", async () => {
        const result = await withSetup(() => useViewDestroy(props));
        const spy = vi.spyOn(mockInstanceList, "bulkDelete");

        // no error expected
        await expect(result.handleDelete({})).resolves.not.toThrow();
        expect(spy).toHaveBeenCalled();

        // simulate error
        mockInstanceList.state.errored = true;
        mockInstanceList.state.error = new Error("delete failed");

        await expect(result.handleDelete({})).rejects.toThrow("delete failed");
    });

    scopedIt("handleDelete forwards dryRun flag to bulkDelete", async () => {
        const result = await withSetup(() => useViewDestroy(props));
        await result.handleDelete({ dryRun: true });
        expect(mockInstanceList.bulkDelete).toHaveBeenCalledWith({
            dryRun: true,
            acknowledgeWarnings: undefined,
            // A validation pass must not empty the list the operator is still confirming against.
            keepObjects: true,
        });
    });

    scopedIt("handleDelete forwards acknowledgeWarnings to bulkDelete", async () => {
        const result = await withSetup(() => useViewDestroy(props));
        await result.handleDelete({ dryRun: false, acknowledgeWarnings: "d1" });
        expect(mockInstanceList.bulkDelete).toHaveBeenCalledWith({
            dryRun: false,
            acknowledgeWarnings: "d1",
            keepObjects: false,
        });
    });

    scopedIt("handleDelete clears the captured list error before rethrowing a ConfirmationRequiredError", async () => {
        // bulkDelete captures the thrown error into instanceList.state, which ViewDestroy hands to
        // ActionForm as fetchState; a 409 left there would render as a failure banner behind the
        // confirmation dialog and linger after a cancel.
        const result = await withSetup(() => useViewDestroy(props));
        const confirmationError = new ConfirmationRequiredError(
            { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } },
            {},
        );
        mockInstanceList.bulkDelete.mockImplementation(() => {
            mockInstanceList.state.errored = true;
            mockInstanceList.state.error = confirmationError;
            return Promise.resolve(false);
        });

        await expect(result.handleDelete({})).rejects.toBe(confirmationError);
        expect(mockInstanceList.clearError).toHaveBeenCalledTimes(1);
        expect(mockInstanceList.state.errored).toBe(false);
        expect(mockInstanceList.state.error).toBe(null);
    });

    scopedIt("handleDelete leaves other captured errors in the list state when rethrowing", async () => {
        const result = await withSetup(() => useViewDestroy(props));
        const failure = new Error("delete failed");
        mockInstanceList.bulkDelete.mockImplementation(() => {
            mockInstanceList.state.errored = true;
            mockInstanceList.state.error = failure;
            return Promise.resolve(false);
        });

        await expect(result.handleDelete({})).rejects.toBe(failure);
        expect(mockInstanceList.clearError).not.toHaveBeenCalled();
        expect(mockInstanceList.state.errored).toBe(true);
        expect(mockInstanceList.state.error).toBe(failure);
    });

    scopedIt("validAndActive is false if isActive is false", async () => {
        useIsActive.mockReturnValue(ref(false));
        const result = await withSetup(() => useViewDestroy(props));
        expect(result.validAndActive.value).toBe(false);
    });

    scopedIt("validAndActive is false if pk or model is missing", async () => {
        props.pk = null;
        const result = await withSetup(() => useViewDestroy(props));
        expect(result.validAndActive.value).toBe(false);

        props.pk = "123";
        props.model = "";
        await nextTick();
        expect(result.validAndActive.value).toBe(false);
    });

    scopedIt("falls back to 'id' if modelConfig.info.pk is missing", async () => {
        delete mockModelConfig.info.pk;
        await withSetup(() => useViewDestroy(props));
        const listProps = useList.mock.calls[0][0].props;
        expect(listProps.pkKey).toBe("id");
    });
});
