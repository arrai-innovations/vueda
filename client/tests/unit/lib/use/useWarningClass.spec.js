import { reactive } from "vue";

vi.mock("primevue/passthrough", () => ({
    usePassThrough: vi.fn(),
}));

vi.mock("@vueda/theme/register.js", () => ({
    getPrimeVuePreset: vi.fn(),
}));

describe("lib/use/useWarningClass.js", () => {
    const mockBasePreset = { root: { class: "base" } };
    const mockBasePt = { root: { class: "computed-class" } };

    const mockMergedPt = { root: { class: "merged-class" } };

    let useWarningClass;
    let usePassThrough;
    let getPrimeVuePreset;

    beforeEach(async () => {
        useWarningClass = (await import("@vueda/use/useWarningClass.js")).useWarningClass;
        usePassThrough = (await import("primevue/passthrough")).usePassThrough;
        getPrimeVuePreset = (await import("@vueda/theme/register.js")).getPrimeVuePreset;

        getPrimeVuePreset.mockReturnValue(mockBasePreset);
        let callCount = 0;
        usePassThrough.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return mockBasePt;
            }
            if (callCount === 2) {
                return mockMergedPt;
            }
            return {};
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns base passthrough if no props.pt given", () => {
        const props = { pt: {}, mergeSections: true, mergeProps: true };
        const widgetState = {
            validationState: {
                warning: false,
            },
        };
        const pt = useWarningClass(props, widgetState);
        expect(getPrimeVuePreset).toHaveBeenCalled();
        expect(usePassThrough).toHaveBeenCalledWith(
            mockBasePreset,
            {
                root: {
                    class: expect.any(Object),
                },
            },
            {
                mergeSections: true,
                mergeProps: true,
            },
        );
        expect(pt.value).toStrictEqual(mockBasePt);
    });

    it("returns merged passthrough if props.pt is provided", () => {
        const props = {
            pt: { root: { class: "external-class" } },
            mergeSections: false,
            mergeProps: false,
        };
        const widgetState = {
            validationState: {
                warning: true,
            },
        };
        const pt = useWarningClass(props, widgetState);
        expect(usePassThrough).toHaveBeenCalledTimes(2);
        expect(usePassThrough).toHaveBeenCalledWith(mockBasePreset, expect.anything(), {
            mergeSections: true,
            mergeProps: true,
        });
        expect(usePassThrough).toHaveBeenCalledWith(mockBasePt, props.pt, {
            mergeSections: false,
            mergeProps: false,
        });
        expect(pt.value).toStrictEqual(mockMergedPt);
    });

    it("reacts to warning state changes", async () => {
        const props = { pt: {}, mergeSections: true, mergeProps: true };
        const widgetState = reactive({
            validationState: {
                warning: false,
            },
        });
        const pt = useWarningClass(props, widgetState);
        expect(pt.value).toStrictEqual(mockBasePt);
        widgetState.validationState.warning = true;
        await Promise.resolve();
        expect(pt.value).toStrictEqual(mockBasePt);
    });

    it('generates a class with "p-warning" based on validationState.warning', () => {
        const props = { pt: {}, mergeSections: true, mergeProps: true };
        const widgetState = reactive({
            validationState: {
                warning: false,
            },
        });

        useWarningClass(props, widgetState);

        const baseCallArgs = usePassThrough.mock.calls[0];
        const basePtArg = baseCallArgs[1];

        expect(basePtArg).toBeDefined();
        const classComputed = basePtArg.root.class;
        expect(classComputed.value).toEqual({ "p-warning": false });

        widgetState.validationState.warning = true;
        expect(classComputed.value).toEqual({ "p-warning": true });

        widgetState.validationState.warning = false;
        expect(classComputed.value).toEqual({ "p-warning": false });
    });
});
