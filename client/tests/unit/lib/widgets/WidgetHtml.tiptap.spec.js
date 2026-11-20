import { scopedIt } from "@tests/unit/utils.js";
import { EditorContent } from "@tiptap/vue-3";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import FormField from "@vueda/form/form-model/FormField.vue";
import { useForm } from "@vueda/use/useForm.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import WidgetHtml from "@vueda/widgets/WidgetHtml.vue";
import { defineComponent, h, reactive } from "vue";

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
    const wrapper = mount(WidgetHtml, {
        props: { name: "html", ...props },
        global: { provide: { [FieldContextSymbol]: fieldContext } },
    });
    await flushPromises();
    return wrapper;
};

/**
 * Mounts the widget in a real form. `beforeMount` runs in the setup of a sibling that renders after the widget, which
 * is after the widget's setup and before its `onMounted`.
 *
 * @param {object} initialValues
 * @param {{ fieldProps?: object, widgetProps?: object, beforeMount?: (form: object) => void }} [options]
 */
const mountInForm = async (initialValues, { fieldProps = {}, widgetProps = {}, beforeMount } = {}) => {
    let form;
    const BeforeMount = defineComponent({
        setup() {
            beforeMount(form);
            return () => null;
        },
    });
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(reactive({ initialValues }));
                return () => [
                    h(FormField, { name: "html", label: "Html", ...fieldProps }, () => h(WidgetHtml, widgetProps)),
                    beforeMount ? h(BeforeMount) : null,
                ];
            },
        }),
    );
    await flushPromises();
    return { wrapper, form, editor: wrapper.findComponent(EditorContent).props("editor") };
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

        scopedIt("reports an empty value when the user clears the content", async () => {
            const { form, editor } = await mountInForm({ html: "<p>saved text</p>" });

            editor.commands.clearContent(true);
            await flushPromises();

            expect(form.state.values.html).toBe("");
        });

        scopedIt("keeps a field that loaded empty unmodified after the user types and clears", async () => {
            const { form, editor } = await mountInForm({ html: "" });

            editor.commands.insertContent("typed");
            await flushPromises();
            expect(form.state.modified.html).toBe(true);
            editor.commands.clearContent(true);
            await flushPromises();

            expect(form.state.values.html).toBe("");
            expect(form.state.modified.html).toBeFalsy();
        });

        scopedIt("fails the required check when the user clears a required field", async () => {
            const { form, editor } = await mountInForm(
                { html: "<p>saved text</p>" },
                { fieldProps: { required: true } },
            );

            editor.commands.clearContent(true);
            form.setTouched("html");
            await flushPromises();

            expect(form.state.errors.html?.required).toBe("This field is required.");
        });

        scopedIt("keeps an empty editor empty when the value becomes null", async () => {
            const { form, editor } = await mountInForm({ html: "" });
            const onTransaction = vi.fn();
            editor.on("transaction", onTransaction);

            form.updateValue("html", null);
            await flushPromises();

            expect(onTransaction).not.toHaveBeenCalled();
            expect(editor.isEmpty).toBe(true);
        });

        scopedIt("disables the toolbar buttons while the widget is disabled", async () => {
            const { wrapper } = await mountInForm({ html: "<p>saved text</p>" }, { widgetProps: { disabled: true } });

            const buttons = wrapper.findAll('[data-qa="widget-html-toolbar"] button');
            expect(buttons.length).toBeGreaterThan(0);
            buttons.forEach((button) => expect(button.attributes("disabled")).toBeDefined());
        });

        scopedIt("leaves a disabled field's value unchanged when the user clicks a toolbar button", async () => {
            const { wrapper, form, editor } = await mountInForm(
                { html: "<p>saved text</p>" },
                { widgetProps: { disabled: true } },
            );

            editor.commands.selectAll();
            await wrapper.get('button[title="Bold"]').trigger("click");
            await flushPromises();

            expect(form.state.values.html).toBe("<p>saved text</p>");
        });

        scopedIt("shows a value that changed between setup and mount", async () => {
            const { form, editor } = await mountInForm(
                { html: "<p>setup value</p>" },
                { beforeMount: (f) => f.updateValue("html", "<p>changed before mount</p>") },
            );

            expect(form.state.values.html).toBe("<p>changed before mount</p>");
            expect(editor.getHTML()).toBe("<p>changed before mount</p>");
        });

        scopedIt("registers each extension once", async () => {
            const warn = vi.spyOn(console, "warn");

            await mountInForm({ html: "" });

            expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Duplicate extension names"));
            warn.mockRestore();
        });
    });
});
