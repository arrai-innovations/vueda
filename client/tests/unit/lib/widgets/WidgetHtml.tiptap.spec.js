import { scopedIt } from "@tests/unit/utils.js";
import { EditorContent } from "@tiptap/vue-3";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { reactive } from "vue";

enableAutoUnmount(afterEach);

const makeFieldContext = () => ({
    state: reactive({
        fieldId: "test-field-id",
        dependencyValues: {},
        value: "",
        required: false,
        errors: {},
        name: "html",
    }),
    registerDependencyValues: vi.fn(),
    unregisterDependencyValues: vi.fn(),
    setTouched: vi.fn(),
    clearTouched: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    reportWidgetDisabled: vi.fn(),
});

const mountWidget = async (fieldContext, props = {}) => {
    const WidgetHtml = (await import("@vueda/widgets/WidgetHtml.vue")).default;
    const wrapper = mount(WidgetHtml, {
        props: { name: "html", ...props },
        global: { provide: { [FieldContextSymbol]: fieldContext } },
    });
    await flushPromises();
    return wrapper;
};

describe("lib/widgets/WidgetHtml.vue", () => {
    describe("With the Tiptap editor", () => {
        scopedIt("keeps a loaded value as saved", async () => {
            const fieldContext = makeFieldContext();
            await mountWidget(fieldContext);

            fieldContext.state.value = "saved text";
            await flushPromises();

            expect(fieldContext.state.value).toBe("saved text");
        });

        scopedIt("keeps a loaded value as saved when the widget becomes enabled", async () => {
            const fieldContext = makeFieldContext();
            const wrapper = await mountWidget(fieldContext, { disabled: true });

            fieldContext.state.value = "saved text";
            await flushPromises();
            await wrapper.setProps({ disabled: false });
            await flushPromises();

            expect(fieldContext.state.value).toBe("saved text");
        });

        scopedIt("updates the value when the user edits the content", async () => {
            const fieldContext = makeFieldContext();
            const wrapper = await mountWidget(fieldContext);

            fieldContext.state.value = "saved text";
            await flushPromises();
            wrapper.findComponent(EditorContent).props("editor").commands.insertContent(" more");
            await flushPromises();

            expect(fieldContext.state.value).toBe("<p>saved text more</p>");
        });
    });
});
