import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { reactive } from "vue";

const mockedUseField = vi.fn();
vi.mock("@vueda/use/useField.js", async () => {
    const actual = await vi.importActual("@vueda/use/useField.js");
    return { __esModule: true, ...actual, useField: mockedUseField };
});

const warnMock = vi.fn();
const mockedUseDevLogger = vi.fn(() => ({ warn: warnMock }));
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: mockedUseDevLogger }));

let FieldString;

beforeEach(async () => {
    mockedUseField.mockReset();
    mockedUseDevLogger.mockClear();
    warnMock.mockClear();
    FieldString = (await import("@vueda/fields/FieldString.vue")).default;
});

describe("lib/fields/FieldString.vue", () => {
    scopedIt("validates maxLength", async () => {
        const state = reactive({ value: "abcd", touched: false });
        const updateError = vi.fn();
        const deleteError = vi.fn();
        mockedUseField.mockReturnValue({ state, updateError, deleteError });

        mount(FieldString, { props: { name: "foo", maxLength: 3 } });
        await flushPromises();

        expect(updateError).toHaveBeenCalledWith("maxLength", "Must be 3 characters or less.");

        updateError.mockClear();
        state.value = "ab";
        await flushPromises();
        expect(updateError).not.toHaveBeenCalled();
    });

    scopedIt("validates minLength", async () => {
        const state = reactive({ value: "a", touched: false });
        const updateError = vi.fn();
        const deleteError = vi.fn();
        mockedUseField.mockReturnValue({ state, updateError, deleteError });

        mount(FieldString, { props: { name: "foo", minLength: 3 } });
        await flushPromises();
        expect(updateError).toHaveBeenCalledWith("minLength", "Must be 3 characters or more.");

        updateError.mockClear();
        state.value = "abc";
        await flushPromises();
        expect(updateError).not.toHaveBeenCalled();
    });

    scopedIt("validates pattern with message", async () => {
        const state = reactive({ value: "abc", touched: true });
        const updateError = vi.fn();
        const deleteError = vi.fn();
        mockedUseField.mockReturnValue({ state, updateError, deleteError });

        mount(FieldString, {
            props: {
                name: "foo",
                patternRegex: "^[0-9]+$",
                patternForMessage: "numbers",
            },
        });
        await flushPromises();
        expect(updateError).toHaveBeenCalledWith("pattern", 'Must match "numbers".');

        updateError.mockClear();
        state.value = "123";
        await flushPromises();
        expect(updateError).not.toHaveBeenCalled();
        expect(deleteError).toHaveBeenCalledWith("pattern");
    });

    scopedIt("warns on non-string value in dev", async () => {
        const originalDev = import.meta.env.DEV;
        import.meta.env.DEV = true;
        const state = reactive({ value: 123, touched: false });
        mockedUseField.mockReturnValue({ state, updateError: vi.fn(), deleteError: vi.fn() });

        mount(FieldString, { props: { name: "foo" } });
        await flushPromises();
        expect(warnMock).toHaveBeenCalled();

        warnMock.mockClear();
        state.value = "ok";
        await flushPromises();
        expect(warnMock).not.toHaveBeenCalled();
        import.meta.env.DEV = originalDev;
    });
});
