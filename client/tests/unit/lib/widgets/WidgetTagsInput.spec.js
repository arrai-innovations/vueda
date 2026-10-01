import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const TagsInputStub = defineComponent({
    name: "TagsInputStub",
    props: ["modelValue", "addOnPaste", "addOnBlur", "delimiter", "disabled", "name"],
    emits: ["update:modelValue"],
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "tags-input" }, slots.default?.());
    },
});

const TagsInputItemStub = defineComponent({
    name: "TagsInputItemStub",
    props: ["value"],
    setup(props) {
        return () => h("span", { "data-stub": "tag" }, props.value);
    },
});

const EmptyStub = defineComponent({
    name: "EmptyStub",
    setup() {
        return () => null;
    },
});

vi.mock("@vueda/controls/tags-input/TagsInput.vue", () => ({ default: TagsInputStub }));
vi.mock("@vueda/controls/tags-input/TagsInputItem.vue", () => ({ default: TagsInputItemStub }));
vi.mock("@vueda/controls/tags-input/TagsInputItemText.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/controls/tags-input/TagsInputItemDelete.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/controls/tags-input/TagsInputInput.vue", () => ({ default: EmptyStub }));

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
 * Mount the widget with `value` as both the field value and the model value.
 *
 * @param {any} value
 * @param {object} [props]
 */
const mountWithValue = (value, props = {}) => {
    fieldContext.state.value = value;
    return mount(WidgetTagsInput, {
        props: { modelValue: value, ...props },
        global: { provide: { [FieldContextSymbol]: fieldContext } },
    });
};

beforeEach(async () => {
    WidgetTagsInput = (await import("@vueda/widgets/WidgetTagsInput.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/widgets/WidgetTagsInput.vue", () => {
    describe("Rendering", () => {
        scopedIt("renders one tag per entry", () => {
            const wrapper = mountWithValue(["1", "2.5"]);
            expect(wrapper.findAll("[data-stub='tag']").map((tag) => tag.text())).toEqual(["1", "2.5"]);
        });

        scopedIt("renders a single value as one tag", () => {
            const wrapper = mountWithValue("7");
            expect(wrapper.getComponent(TagsInputStub).props("modelValue")).toEqual(["7"]);
        });

        scopedIt("renders no tags for an empty value", () => {
            const wrapper = mountWithValue(null);
            expect(wrapper.getComponent(TagsInputStub).props("modelValue")).toEqual([]);
        });
    });

    describe("Updating the value", () => {
        scopedIt("writes the trimmed entries as an array", () => {
            const wrapper = mountWithValue([]);
            wrapper.getComponent(TagsInputStub).vm.$emit("update:modelValue", ["alpha", " beta "]);
            expect(fieldContext.state.value).toEqual(["alpha", "beta"]);
        });

        scopedIt("adds only entries written as decimal numbers when numeric", () => {
            const wrapper = mountWithValue(["1"], { numeric: true });
            wrapper
                .getComponent(TagsInputStub)
                .vm.$emit("update:modelValue", ["1", "abc", "2.5", "", "-3", "+4", ".5", "6.", "1e3"]);
            expect(fieldContext.state.value).toEqual(["1", "2.5", "-3", "+4", ".5", "6.", "1e3"]);
        });

        scopedIt.each(["0x10", "0b11", "Infinity", "NaN", "1.2.3", "1e", "-"])(
            "rejects %s, which a Django decimal field does not read, when numeric",
            (entry) => {
                const wrapper = mountWithValue([], { numeric: true });
                wrapper.getComponent(TagsInputStub).vm.$emit("update:modelValue", ["1", entry]);
                expect(fieldContext.state.value).toEqual(["1"]);
            },
        );

        scopedIt("writes an empty array when the last tag is removed", () => {
            const wrapper = mountWithValue(["1"]);
            wrapper.getComponent(TagsInputStub).vm.$emit("update:modelValue", []);
            expect(fieldContext.state.value).toEqual([]);
        });
    });
});
