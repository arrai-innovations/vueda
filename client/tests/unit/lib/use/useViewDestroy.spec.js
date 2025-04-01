import { useList } from "@arrai-innovations/reactive-helpers";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useViewDestroy } from "@vueda/use/useViewDestroy.js";
import { nextTick, reactive, ref } from "vue";

vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: vi.fn(),
}));
vi.mock("@arrai-innovations/reactive-helpers", () => ({
    useList: vi.fn(),
}));
vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: vi.fn(),
}));

describe("lib/use/useViewDestroy.js", () => {
    let mockModelConfig, mockInstanceList, props;

    beforeEach(() => {
        props = reactive({
            app: "testApp",
            model: "testModel",
            pk: "123",
        });

        mockModelConfig = reactive({
            info: {
                pk: "id",
            },
        });

        mockInstanceList = {
            state: reactive({
                errored: false,
                error: null,
            }),
            bulkDelete: vi.fn().mockResolvedValue(),
        };

        useModelConfig.mockReturnValue(mockModelConfig);
        useList.mockReturnValue(mockInstanceList);
        useIsActive.mockReturnValue(ref(true));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("sets up model config and list with expected parameters", async () => {
        const result = useViewDestroy(props);

        expect(useModelConfig).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
        expect(useList).toHaveBeenCalledWith(
            expect.objectContaining({
                props: expect.any(Object),
                paged: false,
                keepOldPages: false,
                clearListOnListIntentTriggered: false,
            }),
        );

        const listArgs = useList.mock.calls[0][0].props.listArgs;
        expect(listArgs.id).toEqual(["123"]);
        expect(Array.isArray(listArgs.id)).toBe(true);

        expect(result.modelConfig).toBe(mockModelConfig);
        expect(result.instanceList).toBe(mockInstanceList);
        expect(result.validAndActive.value).toBe(true);
    });

    it("handleDelete calls bulkDelete and throws if errored", async () => {
        const result = useViewDestroy(props);
        const spy = vi.spyOn(mockInstanceList, "bulkDelete");

        // no error expected
        await expect(result.handleDelete()).resolves.not.toThrow();
        expect(spy).toHaveBeenCalled();

        // simulate error
        mockInstanceList.state.errored = true;
        mockInstanceList.state.error = new Error("delete failed");

        await expect(result.handleDelete()).rejects.toThrow("delete failed");
    });

    it("validAndActive is false if isActive is false", async () => {
        useIsActive.mockReturnValue(ref(false));
        const result = useViewDestroy(props);
        expect(result.validAndActive.value).toBe(false);
    });

    it("validAndActive is false if pk or model is missing", async () => {
        props.pk = null;
        const result = useViewDestroy(props);
        expect(result.validAndActive.value).toBe(false);

        props.pk = "123";
        props.model = "";
        await nextTick();
        expect(result.validAndActive.value).toBe(false);
    });

    it("falls back to 'id' if modelConfig.info.pk is missing", () => {
        delete mockModelConfig.info.pk;
        useViewDestroy(props);
        const listProps = useList.mock.calls[0][0].props;
        expect(listProps.pkKey).toBe("id");
    });
});
