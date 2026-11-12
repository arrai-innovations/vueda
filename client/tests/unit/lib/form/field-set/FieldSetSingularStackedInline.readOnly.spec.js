import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import FieldSetSingularStackedInline from "@vueda/form/field-set/FieldSetSingularStackedInline.vue";
import FormModel from "@vueda/form/form-model/FormModel.vue";
import { useForm } from "@vueda/use/useForm.js";
import { defineComponent, h, reactive } from "vue";

enableAutoUnmount(afterEach);

// `contact.note` reports `readOnly: false` from its own serializer, whichever setting makes the
// `contact` inline read-only.
const config = reactive({
    displayFields: ["contact"],
    fieldDetails: { contact: { name: "contact", label: "Contact", many: false, readOnly: false } },
    expand: ["contact"],
    expandDetails: {
        contact: {
            f: {
                id: { label: "ID", typeSerializer: "IntegerField", readOnly: true },
                note: { label: "Note", typeSerializer: "CharField", required: false, readOnly: false },
            },
        },
    },
});
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => ({ config }) }));
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => ({ value: true }) }),
}));

async function mountInline({ fieldProps = {}, subFieldProps = {} } = {}) {
    const wrapper = mount(
        defineComponent({
            setup() {
                useForm(reactive({ initialValues: { contact: { id: 1, note: "Call after noon" } } }));
                return () =>
                    h(FormModel, {
                        app: "store",
                        model: "customer",
                        view: "update",
                        fieldComponents: { contact: () => FieldSetSingularStackedInline },
                        fieldProps: { contact: { hidable: false, ...fieldProps }, ...subFieldProps },
                    });
            },
        }),
    );
    // Row widgets load as async components, so let them resolve before reading the row.
    await flushPromises();
    await vi.dynamicImportSettled();
    await flushPromises();
    return wrapper;
}

const rowInputValues = (wrapper) =>
    wrapper.findAll("input:not([type=hidden]), textarea").map((input) => input.element.value);

describe("lib/form/field-set/FieldSetSingularStackedInline.vue read-only row", () => {
    afterEach(() => {
        config.fieldDetails.contact.readOnly = false;
    });

    scopedIt("renders the row input read-only for a read-only relation", async () => {
        config.fieldDetails.contact.readOnly = true;
        const wrapper = await mountInline();
        expect(wrapper.text()).toContain("Call after noon");
        expect(rowInputValues(wrapper)).not.toContain("Call after noon");
    });

    scopedIt("renders the row input read-only when configured read-only", async () => {
        const wrapper = await mountInline({ fieldProps: { readOnly: true } });
        expect(wrapper.text()).toContain("Call after noon");
        expect(rowInputValues(wrapper)).not.toContain("Call after noon");
    });

    scopedIt("keeps the row input editable when it sets readOnly: false in a read-only relation", async () => {
        config.fieldDetails.contact.readOnly = true;
        const wrapper = await mountInline({ subFieldProps: { "contact.note": { readOnly: false } } });
        expect(rowInputValues(wrapper)).toContain("Call after noon");
    });

    scopedIt("keeps the row input editable for a writable relation", async () => {
        const wrapper = await mountInline();
        expect(rowInputValues(wrapper)).toContain("Call after noon");
    });
});
