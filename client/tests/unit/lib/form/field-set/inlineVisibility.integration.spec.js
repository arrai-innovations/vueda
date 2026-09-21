import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetSingularStackedInline from "@vueda/form/field-set/FieldSetSingularStackedInline.vue";
import FieldSetStackedInline from "@vueda/form/field-set/FieldSetStackedInline.vue";
import FieldSetTabularInline from "@vueda/form/field-set/FieldSetTabularInline.vue";
import { useForm } from "@vueda/use/useForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, provide, reactive } from "vue";

// Isolate model metadata and field selection; retain real fields, validation,
// inline state, grids, and Collapsible components.
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({ config: { expand: ["lines"], expandDetails: { lines: { f: {} } } } }),
}));
let isTable = true;
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => ({ value: isTable }) }),
}));
vi.mock("@vueda/form/form-model/FieldRenderer.vue", async () => {
    const { defineComponent, h } = await import("vue");
    const { default: FormField } = await import("@vueda/form/form-model/FormField.vue");
    const { default: WidgetTextInput } = await import("@vueda/widgets/WidgetTextInput.vue");
    return {
        default: defineComponent({
            props: ["fieldsetStackedInlineProps", "objectGridFieldSlotProps"],
            setup: (props) => () => {
                const index = props.fieldsetStackedInlineProps?.index ?? props.objectGridFieldSlotProps?.rowIndex;
                const name = index === undefined ? "lines.note" : `lines[${index}].note`;
                return h(FormField, { name, label: "Note", required: true }, () => h(WidgetTextInput));
            },
        }),
    };
});

const layouts = [
    { name: "stacked", component: FieldSetStackedInline },
    { name: "singular stacked", component: FieldSetSingularStackedInline, singular: true },
    { name: "tabular table", component: FieldSetTabularInline },
    { name: "tabular cards", component: FieldSetTabularInline, cards: true },
];

function renderInline(layout, { empty = false, ...overrides } = {}) {
    isTable = !layout.cards;
    let form;
    const props = reactive({
        name: "lines",
        label: "Lines",
        required: false,
        help: "Line guidance",
        autoCreateWhenEmpty: false,
        hiddenByDefault: "never",
        fieldObjects: [{ name: "lines.note", fieldName: "note" }],
        ...overrides,
    });
    const submit = vi.fn((event) => event.preventDefault());
    const value = empty ? (layout.singular ? null : []) : layout.singular ? { note: "Draft" } : [{ note: "Draft" }];
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(reactive({ initialValues: { lines: value } }));
                provide(FormModelSymbol, { fields: [], expand: ["lines"] });
                return () => h("form", { onSubmit: submit }, [h(layout.component, props)]);
            },
        }),
        { attachTo: document.body },
    );
    onTestFinished(() => {
        wrapper.unmount();
        wrapper.element.remove();
    });
    return { wrapper, form, props, submit, inline: wrapper.getComponent(layout.component) };
}

const trigger = (wrapper) => wrapper.get('[data-slot="collapsible-trigger"]');
const body = (wrapper) => wrapper.get('[data-slot="collapsible-content"]');
const create = (wrapper) => wrapper.findAll("button").find((button) => button.text() === "Create");

describe("lib/form/field-set/FieldSet*Inline*.vue", () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = vi.fn();
    });
    afterAll(() => {
        delete Element.prototype.scrollIntoView;
    });
    describe("collapsible form integration", () => {
        scopedIt.each(layouts)(
            "$name preserves mounted fields, draft values, and validation when collapsed",
            async (layout) => {
                const { wrapper, form, submit } = renderInline(layout);
                await flushPromises();
                const input = wrapper.get("input");
                const element = input.element;
                expect(input.element.value).toBe("Draft");
                expect(trigger(wrapper).attributes("aria-controls")).toBe(body(wrapper).attributes("id"));
                await trigger(wrapper).trigger("click");
                await flushPromises();
                expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
                expect(body(wrapper).attributes("hidden")).toBeDefined();
                expect(wrapper.get("input").element).toBe(element);
                expect(form.state.submittingValues.lines).toEqual(
                    layout.singular ? { note: "Draft" } : [{ note: "Draft" }],
                );
                expect(wrapper.get('[data-qa$="-chores"]').isVisible()).toBe(true);
                const path = layout.singular ? "lines.note" : "lines[0].note";
                form.updateValue(path, "");
                form.setAllTouched();
                await flushPromises();
                expect(form.state.errors[path].required).toBe("This field is required.");
                await trigger(wrapper).trigger("click");
                await flushPromises();
                expect(body(wrapper).attributes("hidden")).toBeUndefined();
                expect(wrapper.get("input").element).toBe(element);
                expect(wrapper.text()).toContain("This field is required.");
                expect(submit).not.toHaveBeenCalled();
            },
        );

        scopedIt.each(layouts)("$name starts collapsed and hides its empty invitation", async (layout) => {
            const { wrapper, submit } = renderInline(layout, { empty: true, hiddenByDefault: "always" });
            await flushPromises();
            expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
            expect(body(wrapper).attributes("hidden")).toBeDefined();
            expect(body(wrapper).text()).toContain(layout.cards ? "Create" : "No Lines yet");
            if (layout.cards) await trigger(wrapper).trigger("click");
            create(wrapper).element.click();
            await flushPromises();
            expect(trigger(wrapper).attributes("aria-expanded")).toBe("true");
            expect(body(wrapper).attributes("hidden")).toBeUndefined();
            expect(wrapper.find("input").exists()).toBe(true);
            expect(submit).not.toHaveBeenCalled();
        });

        scopedIt.each(layouts)("$name respects controlled visibility for disclosure and Create", async (layout) => {
            const { wrapper, inline, props } = renderInline(layout, { empty: true, visible: false });
            await flushPromises();
            await trigger(wrapper).trigger("click");
            expect(inline.emitted("update:visible")).toEqual([[true]]);
            expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
            if (!layout.cards) {
                create(wrapper).element.click();
                await flushPromises();
                expect(inline.emitted("update:visible")).toEqual([[true], [true]]);
                expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
            }
            props.visible = true;
            await flushPromises();
            expect(body(wrapper).attributes("hidden")).toBeUndefined();
            await trigger(wrapper).trigger("click");
            expect(inline.emitted("update:visible").at(-1)).toEqual([false]);
            expect(trigger(wrapper).attributes("aria-expanded")).toBe("true");
            props.visible = false;
            await flushPromises();
            expect(body(wrapper).attributes("hidden")).toBeDefined();
        });

        scopedIt.each(layouts)("$name stays open without a disclosure when hidable is false", async (layout) => {
            const { wrapper } = renderInline(layout, { hidable: false, hiddenByDefault: "always" });
            await flushPromises();
            expect(wrapper.find('[data-slot="collapsible-trigger"]').exists()).toBe(false);
            expect(body(wrapper).attributes("hidden")).toBeUndefined();
            expect(wrapper.get("input").element.value).toBe("Draft");
        });
    });
});
