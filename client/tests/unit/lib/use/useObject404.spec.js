import { scopedIt } from "@tests/unit/utils.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { nextTick, reactive, ref } from "vue";

vi.mock("@vueda/utils/case.js", async () => {
    const actual = await vi.importActual("@vueda/utils/case.js");
    return {
        ...actual,
        memoizedStartCase: vi.fn(() => "Model Title"),
    };
});

describe("lib/use/useObject404.js", () => {
    let props, instance, modelConfig, errorRef;

    beforeEach(() => {
        props = reactive({ pk: "42" });

        instance = {
            state: reactive({
                error: null,
            }),
            clearError: vi.fn(),
        };

        modelConfig = {
            info: reactive({
                verboseName: "some_model",
            }),
        };

        errorRef = ref(null);
    });

    scopedIt("clears a missing-object error when the target changes or retrieval retries", async () => {
        useObject404(props, instance, modelConfig, errorRef);
        instance.state.error = { response: { status: 404 } };
        await nextTick();
        expect(errorRef.value).toBeInstanceOf(Error);
        props.pk = "43";
        await nextTick();
        expect(errorRef.value).toBeNull();
        instance.state.error = { response: { status: 404 } };
        await nextTick();
        instance.state.loading = true;
        await nextTick();
        expect(errorRef.value).toBeNull();
    });

    scopedIt("sets an error when a 404 is detected", async () => {
        useObject404(props, instance, modelConfig, errorRef);

        instance.state.error = {
            response: { status: 404 },
        };

        await nextTick();

        expect(instance.clearError).toHaveBeenCalledTimes(1);
        expect(errorRef.value).toBeInstanceOf(Error);
        expect(errorRef.value.message).toBe("No Model Title found with id: 42");
        expect(errorRef.value.name).toBe("");
        expect(errorRef.value.stack).toBeUndefined();
        expect(errorRef.value.redirectParams).toEqual({ name: LIST_VIEW_CRUD_NAME });
        expect(errorRef.value.redirectTitle).toBe("Return to the Model Title list view.");
    });

    scopedIt("does not set an error when status is not 404", async () => {
        useObject404(props, instance, modelConfig, errorRef);

        instance.state.error = {
            response: { status: 500 },
        };

        await nextTick();

        expect(instance.clearError).not.toHaveBeenCalled();
        expect(errorRef.value).toBeNull();
    });

    scopedIt("does nothing if error is null", async () => {
        useObject404(props, instance, modelConfig, errorRef);

        instance.state.error = null;

        await nextTick();

        expect(instance.clearError).not.toHaveBeenCalled();
        expect(errorRef.value).toBeNull();
    });
});
