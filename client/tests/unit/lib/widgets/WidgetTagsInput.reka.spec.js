import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { nextTick, reactive } from "vue";

let WidgetTagsInput;

const fieldContext = {
    state: reactive({
        fieldId: "test-field-id",
        dependencyValues: {},
        value: undefined,
        required: false,
        errors: {},
        name: "ids",
    }),
    registerDependencyValues: vi.fn(),
    unregisterDependencyValues: vi.fn(),
    setTouched: vi.fn(),
    clearTouched: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
};

/**
 * Mount the widget on the real tags input controls, with `value` as the field value.
 *
 * @param {any} value
 * @param {object} [props]
 */
const mountWithValue = (value, props = {}) => {
    fieldContext.state.value = value;
    return mount(WidgetTagsInput, {
        props: { modelValue: value, ...props },
        global: { provide: { [FieldContextSymbol]: fieldContext } },
        attachTo: document.body,
    });
};

/**
 * Type `text` into the entry input and press Enter, the way the tags input adds an entry.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper
 * @param {string} text
 */
const enterEntry = async (wrapper, text) => {
    const input = wrapper.find("input");
    input.element.value = text;
    await input.trigger("keydown", { key: "Enter" });
    // The tags input adds the entry on the tick after the key press, and the widget restores a
    // refused entry on the tick after that.
    await nextTick();
    await nextTick();
    await nextTick();
    return input;
};

beforeEach(async () => {
    WidgetTagsInput = (await import("@vueda/widgets/WidgetTagsInput.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
});

describe("lib/widgets/WidgetTagsInput.vue", () => {
    describe("Entering a tag", () => {
        scopedIt("adds an accepted entry and clears the input", async () => {
            const wrapper = mountWithValue([], { numeric: true });

            const input = await enterEntry(wrapper, "2.5");

            expect(fieldContext.state.value).toEqual(["2.5"]);
            expect(input.element.value).toBe("");
            expect(input.attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("keeps a refused entry in the input and marks it invalid", async () => {
            const wrapper = mountWithValue(["1"], { numeric: true });

            const input = await enterEntry(wrapper, "1..2");

            expect(fieldContext.state.value).toEqual(["1"]);
            expect(input.element.value).toBe("1..2");
            expect(input.attributes("aria-invalid")).toBe("true");
            expect(wrapper.find("[data-qa='widget-tags-input']").attributes("aria-invalid")).toBe("true");
        });

        scopedIt("clears the invalid mark when the refused entry is edited", async () => {
            const wrapper = mountWithValue([], { numeric: true });
            const input = await enterEntry(wrapper, "abc");

            input.element.value = "ab";
            await input.trigger("input");

            expect(input.attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("adds the next entry without bringing back a refused one", async () => {
            const wrapper = mountWithValue([], { numeric: true });
            const input = await enterEntry(wrapper, "1..2");
            input.element.value = "";
            await input.trigger("input");

            await enterEntry(wrapper, "1");

            expect(fieldContext.state.value).toEqual(["1"]);
            expect(input.element.value).toBe("");
            expect(input.attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("trims an entry before the duplicate check", async () => {
            const wrapper = mountWithValue(["2"], { numeric: true });

            await enterEntry(wrapper, " 2");

            expect(fieldContext.state.value).toEqual(["2"]);
            expect(wrapper.findAll("[data-slot='tags-input-item']")).toHaveLength(1);
        });
    });
});
