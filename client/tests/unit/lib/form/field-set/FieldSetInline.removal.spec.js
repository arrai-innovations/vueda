import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import FieldSetStackedInline from "@vueda/form/field-set/FieldSetStackedInline.vue";
import FieldSetTabularInline from "@vueda/form/field-set/FieldSetTabularInline.vue";
import FormModel from "@vueda/form/form-model/FormModel.vue";
import { useForm } from "@vueda/use/useForm.js";
import { defineComponent, h, reactive, ref } from "vue";

enableAutoUnmount(afterEach);

const config = reactive({
    displayFields: ["lines"],
    fieldDetails: { lines: { name: "lines", label: "Lines", many: true, readOnly: false } },
    expand: ["lines"],
    expandDetails: {
        lines: {
            f: {
                id: { label: "ID", typeSerializer: "IntegerField", readOnly: true },
                name: { label: "Name", typeSerializer: "CharField", required: false },
            },
        },
    },
});
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => ({ config }) }));
const isTable = ref(true);
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => isTable }),
}));

const savedRows = [
    { id: 1, name: "First line" },
    { id: 2, name: "Second line" },
];

async function mountInline(layout, { view = "update", fieldProps = {}, slots = {}, rows = savedRows } = {}) {
    isTable.value = layout !== "cards";
    let form;
    const formProps = reactive({ initialValues: { lines: rows } });
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(formProps);
                return () =>
                    h(
                        FormModel,
                        {
                            app: "store",
                            model: "invoice",
                            view,
                            fieldComponents: {
                                lines: () => (layout === "stacked" ? FieldSetStackedInline : FieldSetTabularInline),
                            },
                            fieldProps: { lines: { hidable: false, ...fieldProps } },
                        },
                        slots,
                    );
            },
        }),
    );
    await flushPromises();
    return { wrapper, form, formProps };
}

describe("lib/form/field-set/FieldSet*Inline.vue", () => {
    afterEach(() => {
        config.fieldDetails.lines.readOnly = false;
    });

    describe.each(["stacked", "table", "cards"])("%s saved-row removal", (layout) => {
        scopedIt("marks and restores a saved row without changing the displayed values", async () => {
            const { wrapper, form } = await mountInline(layout);
            const boxes = wrapper.findAll('[role="checkbox"]');
            expect(boxes).toHaveLength(2);
            expect(boxes[0].attributes("aria-label")).toBe("Delete row 1 on save");
            expect(form.state.anyModified).toBe(false);
            await boxes[0].trigger("click");
            await flushPromises();
            expect(form.state.values.lines).toEqual(savedRows);
            expect(form.state.submittingValues.lines).toEqual([savedRows[1]]);
            expect(form.state.anyModified).toBe(true);
            expect(
                wrapper
                    .find(
                        layout === "stacked" ? '[data-state="selected-for-destroy"]' : '[data-state="marked-destroy"]',
                    )
                    .exists(),
            ).toBe(true);
            expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(2);
            await boxes[0].trigger("click");
            await flushPromises();
            expect(form.state.submittingValues.lines).toEqual(savedRows);
            expect(form.state.anyModified).toBe(false);
            expect(
                wrapper
                    .find(
                        layout === "stacked" ? '[data-state="selected-for-destroy"]' : '[data-state="marked-destroy"]',
                    )
                    .exists(),
            ).toBe(false);
            wrapper.unmount();
        });

        scopedIt("submits an empty collection when every saved row is marked", async () => {
            const { wrapper, form } = await mountInline(layout);
            for (const checkbox of wrapper.findAll('[role="checkbox"]')) {
                await checkbox.trigger("click");
            }
            expect(form.state.submittingValues.lines).toEqual([]);
            expect(form.state.values.lines).toEqual(savedRows);
            wrapper.unmount();
        });

        scopedIt("clears removal marks when the form loads the saved result", async () => {
            const { wrapper, form, formProps } = await mountInline(layout);
            await wrapper.findAll('[role="checkbox"]')[0].trigger("click");
            formProps.initialValues = { lines: [savedRows[1]] };
            await flushPromises();
            expect(form.state.submittingValues.lines).toEqual([savedRows[1]]);
            expect(wrapper.get('[role="checkbox"]').attributes("aria-checked")).toBe("false");
            expect(form.state.anyModified).toBe(false);
            wrapper.unmount();
        });

        scopedIt("offers no removal for a read-only relation", async () => {
            config.fieldDetails.lines.readOnly = true;
            const { wrapper } = await mountInline(layout);
            expect(wrapper.find('[role="checkbox"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("offers no removal on a read form", async () => {
            const { wrapper } = await mountInline(layout, { view: "read" });
            expect(wrapper.find('[role="checkbox"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("offers no removal when configured read-only", async () => {
            const { wrapper } = await mountInline(layout, { fieldProps: { readOnly: true } });
            expect(wrapper.find('[role="checkbox"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("preserves the destroy-checkbox slot bindings and selection handler", async () => {
            const slot = vi.fn((props) =>
                h(
                    "button",
                    {
                        "data-qa": "custom-destroy",
                        onClick: () => props["onUpdate:modelValue"](!props.modelValue),
                    },
                    String(props.rowIndex),
                ),
            );
            const { wrapper, form } = await mountInline(layout, { slots: { "destroy-checkbox": slot } });
            expect(wrapper.findAll('[data-qa="custom-destroy"]')).toHaveLength(2);
            expect(slot.mock.calls[0][0]).toEqual(
                expect.objectContaining({
                    action: expect.objectContaining({ fieldName: "destroy", action: true }),
                    rowIndex: 0,
                    modelValue: false,
                    contextless: true,
                    required: false,
                    label: "Destroy?",
                    theme: expect.any(Function),
                }),
            );
            await wrapper.get('[data-qa="custom-destroy"]').trigger("click");
            expect(form.state.submittingValues.lines).toEqual([savedRows[1]]);
            await wrapper.get('[data-qa="custom-destroy"]').trigger("click");
            expect(form.state.submittingValues.lines).toEqual(savedRows);
            wrapper.unmount();
        });

        scopedIt("removes an unsaved row immediately while keeping a saved row marked", async () => {
            const rows = [{ name: "Unsaved" }, ...savedRows];
            const { wrapper, form } = await mountInline(layout, { rows });
            await wrapper.findAll('[role="checkbox"]')[0].trigger("click");
            const deleteButton = wrapper.findAll("button").find((button) => button.text() === "Delete");
            await deleteButton.trigger("click");
            await flushPromises();
            expect(form.state.values.lines).toEqual(savedRows);
            expect(form.state.submittingValues.lines).toEqual([savedRows[1]]);
            expect(wrapper.findAll('[role="checkbox"]')[0].attributes("aria-checked")).toBe("true");
            await wrapper.findAll('[role="checkbox"]')[0].trigger("click");
            expect(form.state.submittingValues.lines).toEqual(savedRows);
            wrapper.unmount();
        });
    });
});
