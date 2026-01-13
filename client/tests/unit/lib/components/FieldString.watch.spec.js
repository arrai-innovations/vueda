import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const mockedUseField = vi.fn();
vi.mock("@vueda/use/useField.js", async () => {
    const actual = await vi.importActual("@vueda/use/useField.js");
    return { __esModule: true, ...actual, useField: mockedUseField };
});
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: () => ({ warn: vi.fn() }) }));

scopedIt("bails out when pattern watch args are unchanged", async () => {
    const watchCalls = [];
    vi.doMock("vue", async () => {
        const actual = await vi.importActual("vue");
        return {
            __esModule: true,
            ...actual,
            watch(source, cb, opts) {
                watchCalls.push({ source, cb, opts });
                if (opts?.immediate) {
                    const getVal = (s) => (typeof s === "function" ? s() : s.value);
                    const val = Array.isArray(source) ? source.map(getVal) : getVal(source);
                    const oldVal = Array.isArray(source) ? Array(source.length).fill(undefined) : undefined;
                    cb(val, oldVal);
                }
                return () => {};
            },
        };
    });

    const vue = await import("vue");
    const FieldString = (await import("@vueda/fields/FieldString.vue")).default;

    const state = vue.reactive({ value: "abc", touched: true });
    const updateError = vi.fn();
    const deleteError = vi.fn();
    mockedUseField.mockReturnValue({ state, updateError, deleteError });

    mount(FieldString, { props: { name: "foo", patternRegex: "^[a-z]+$" } });

    const patternWatch = watchCalls.find((w) => Array.isArray(w.source) && w.source.length === 4);
    updateError.mockClear();
    deleteError.mockClear();
    const regex = patternWatch.source[1].value;
    patternWatch.cb([true, regex, "abc", undefined], [true, regex, "abc", undefined]);

    expect(updateError).not.toHaveBeenCalled();
    expect(deleteError).not.toHaveBeenCalled();

    vi.resetModules();
});
