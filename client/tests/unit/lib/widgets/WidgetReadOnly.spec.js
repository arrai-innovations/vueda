import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, nextTick, reactive, ref } from "vue";

// Stubs
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "pk", "view", "label"],
    setup(props) {
        return () =>
            h(
                "a",
                {
                    "data-qa": "link-model-view",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-pk": String(props.pk),
                    "data-view": props.view,
                    "data-label": props.label,
                },
                props.label,
            );
    },
});

// Mocks
const useWidget = vi.fn(() => ({
    state: reactive({ formModelName: "fm", combinedValue: "val", combinedName: "field" }),
}));
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: [], WIDGET_PROPS: {}, useWidget }));
const useWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme }));
const useModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig }));
const useResolvedLookupObject = vi.fn();
vi.mock("@vueda/use/useResolvedLookupObject.js", () => ({ useResolvedLookupObject }));
const useResolvedLookupObjects = vi.fn();
vi.mock("@vueda/use/useResolvedLookupObjects.js", () => ({ useResolvedLookupObjects }));
const useIsActive = vi.fn(() => ref(true));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive }));
const useSlotNameResolver = vi.fn(() => ({ name: ref("n"), exists: ref(false) }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

describe("lib/widgets/WidgetReadOnly.vue", () => {
    let WidgetReadOnly;

    const fieldContext = { state: { fieldId: "test-field-id" } };
    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: fieldContext,
            },
        },
    };

    beforeEach(async () => {
        WidgetReadOnly = (await import("@vueda/widgets/WidgetReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("renders text item when not in lookup mode", () => {
        const wrapper = mount(WidgetReadOnly, {
            props: { prefix: "P", suffix: "S" },
            ...mountOptions,
        });
        const value = wrapper.get('[data-qa="widget-read-only-value"]');
        expect(value.text()).toContain("P");
        expect(value.text()).toContain("val");
        expect(value.text()).toContain("S");
        expect(wrapper.find('[data-qa="link-model-view"]').exists()).toBe(false);
    });

    scopedIt("renders the prefix and the suffix around a text-item slot override", () => {
        const textItemSlotName = reactive({ name: "text-item", exists: false });
        useSlotNameResolver.mockReturnValueOnce(textItemSlotName).mockReturnValueOnce(textItemSlotName);
        const wrapper = mount(WidgetReadOnly, {
            props: { prefix: "<", suffix: ">" },
            slots: { "text-item": (slotProps) => h("b", { "data-qa": "custom-item" }, slotProps.value) },
            ...mountOptions,
        });
        expect(wrapper.get('[data-qa="custom-item"]').text()).toBe("val");
        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("<val>");
    });

    scopedIt("renders the label for a static choice value", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: "enterprise", combinedName: "tier" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                options: [
                    { label: "Trial", value: "trial" },
                    { label: "Enterprise", value: "enterprise" },
                ],
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("Enterprise");
    });

    scopedIt("passes mapped and raw values to the default slot", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: "enterprise", combinedName: "tier" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                options: [{ label: "Enterprise", value: "enterprise" }],
            },
            slots: {
                default: ({ rawValue, value }) => h("span", { "data-qa": "slot-value" }, `${value}/${rawValue}`),
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="slot-value"]').text()).toBe("Enterprise/enterprise");
    });

    scopedIt("uses custom choice label and value keys with string-normalized matching", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: false, combinedName: "taxExempt" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                optionLabel: "display",
                optionValue: "code",
                options: [
                    { display: "Yes", code: "true" },
                    { display: "No", code: "False" },
                ],
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("No");
    });

    scopedIt("renders joined labels for many static choice values", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: ["usd", "eur"], combinedName: "currency" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                options: [
                    { label: "USD", value: "usd" },
                    { label: "EUR", value: "eur" },
                ],
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("USD, EUR");
    });

    scopedIt("renders link when lookup mode and value available", () => {
        const lookup = reactive({
            object: { id: 1, formatted_name: "One" },
            loading: false,
            error: null,
            errored: false,
            effectScope: { stop: vi.fn() },
        });
        useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
        useResolvedLookupObject.mockReturnValue(lookup);
        const wrapper = mount(WidgetReadOnly, {
            props: { app: "a", model: "m", prefix: "<", suffix: ">" },
            ...mountOptions,
        });
        const link = wrapper.get('[data-qa="link-model-view"]');
        expect(link.attributes("data-app")).toBe("a");
        expect(link.attributes("data-model")).toBe("m");
        expect(link.attributes("data-pk")).toBe("1");
        expect(link.attributes("data-label")).toBe("One");
        expect(link.text()).toBe("One");
        const value = wrapper.get('[data-qa="widget-read-only-value"]');
        expect(value.text()).toContain("<");
        expect(value.text()).toContain(">");
    });

    describe("foreign-key lookup values", () => {
        const mountForeignKey = (object, { props = {}, slots = {} } = {}) => {
            useWidget.mockReturnValue({
                state: reactive({ formModelName: "fm", combinedValue: 7, combinedName: "field" }),
            });
            useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
            useResolvedLookupObject.mockReturnValue(
                reactive({ object, loading: false, error: null, errored: false, effectScope: { stop: vi.fn() } }),
            );
            useResolvedLookupObjects.mockReturnValue(
                reactive({ objects: {}, loading: false, effectScope: { stop: vi.fn() } }),
            );
            return mount(WidgetReadOnly, { props: { app: "a", model: "m", ...props }, slots, ...mountOptions });
        };

        afterEach(() => {
            useWidget.mockReset();
            useWidget.mockImplementation(() => ({
                state: reactive({ formModelName: "fm", combinedValue: "val", combinedName: "field" }),
            }));
            useSlotNameResolver.mockReset();
            useSlotNameResolver.mockImplementation(() => ({ name: ref("n"), exists: ref(false) }));
        });

        scopedIt("wraps the link in the prefix and the suffix in the order prefix, link, suffix", () => {
            const wrapper = mountForeignKey(
                { id: 7, formatted_name: "Seven" },
                { props: { prefix: "<", suffix: ">" } },
            );
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("<Seven>");
            expect(wrapper.get('[data-qa="link-model-view"]').attributes("data-pk")).toBe("7");
        });

        scopedIt("renders the prefix and the suffix around a link-item slot override", () => {
            useSlotNameResolver.mockReturnValue(reactive({ name: "link-item", exists: false }));
            const wrapper = mountForeignKey(
                { id: 7, formatted_name: "Seven" },
                {
                    props: { prefix: "<", suffix: ">" },
                    slots: { "link-item": (slotProps) => h("b", slotProps.label) },
                },
            );
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("<Seven>");
        });

        scopedIt("passes the label and primary key to the link-item slot", () => {
            useSlotNameResolver.mockReturnValue(reactive({ name: "link-item", exists: false }));
            const wrapper = mountForeignKey(
                { id: 7, formatted_name: "Seven" },
                {
                    slots: {
                        "link-item": (slotProps) =>
                            h("b", { "data-qa": "custom-item" }, `${slotProps.label}|${slotProps.pk}`),
                    },
                },
            );
            expect(wrapper.get('[data-qa="custom-item"]').text()).toBe("Seven|7");
            expect(wrapper.find('[data-qa="link-model-view"]').exists()).toBe(false);
        });
    });

    describe("to-many lookup values", () => {
        const mountMany = (combinedValue, { objects = {}, loading = false, props = {} } = {}) => {
            useWidget.mockReturnValue({
                state: reactive({ formModelName: "fm", combinedValue, combinedName: "field" }),
            });
            useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
            useResolvedLookupObject.mockReturnValue(
                reactive({
                    object: {},
                    loading: false,
                    error: null,
                    errored: false,
                    effectScope: { stop: vi.fn() },
                }),
            );
            const lookups = reactive({ objects, loading, effectScope: { stop: vi.fn() } });
            useResolvedLookupObjects.mockReturnValue(lookups);
            const wrapper = mount(WidgetReadOnly, { props: { app: "a", model: "m", ...props }, ...mountOptions });
            return { wrapper, lookups };
        };
        const labels = (wrapper) => wrapper.findAll('[data-qa="link-model-view"]').map((link) => link.text());

        afterEach(() => {
            useWidget.mockReset();
            useWidget.mockImplementation(() => ({
                state: reactive({ formModelName: "fm", combinedValue: "val", combinedName: "field" }),
            }));
        });

        scopedIt("renders one link for each expanded object without resolving any primary keys", () => {
            const { wrapper } = mountMany([
                { id: 13, formatted_name: "Thirteen" },
                { id: 1, formatted_name: "One" },
            ]);
            expect(labels(wrapper)).toEqual(["Thirteen", "One"]);
            const links = wrapper.findAll('[data-qa="link-model-view"]');
            expect(links.map((link) => link.attributes("data-pk"))).toEqual(["13", "1"]);
            expect(links.map((link) => link.attributes("data-view"))).toEqual(["read", "read"]);
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("Thirteen, One");
            const pksPassed = useResolvedLookupObjects.mock.calls[0][2];
            expect(pksPassed.value).toEqual([]);
        });

        scopedIt("resolves unexpanded primary keys together and renders one link for each", () => {
            const { wrapper } = mountMany([13, 1], {
                objects: { 13: { id: 13, formatted_name: "Thirteen" }, 1: { id: 1, formatted_name: "One" } },
            });
            expect(useResolvedLookupObjects).toHaveBeenCalledTimes(1);
            expect(useResolvedLookupObjects.mock.calls[0][2].value).toEqual([13, 1]);
            expect(labels(wrapper)).toEqual(["Thirteen", "One"]);
        });

        scopedIt("renders a primary key that the server did not return as plain text", () => {
            const { wrapper } = mountMany([13, 1], {
                objects: { 13: { id: 13, formatted_name: "Thirteen" }, 1: undefined },
            });
            expect(labels(wrapper)).toEqual(["Thirteen"]);
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("Thirteen, 1");
        });

        scopedIt("renders no links while the objects load", () => {
            const { wrapper } = mountMany([13, 1], { loading: true });
            expect(labels(wrapper)).toEqual([]);
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("");
        });

        scopedIt("renders the empty value for an empty array and resolves nothing", () => {
            const { wrapper } = mountMany([]);
            expect(labels(wrapper)).toEqual([]);
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("");
            expect(useResolvedLookupObjects.mock.calls[0][2].value).toEqual([]);
        });

        scopedIt("wraps the whole list in one prefix and one suffix", () => {
            const { wrapper } = mountMany(
                [
                    { id: 13, formatted_name: "Thirteen" },
                    { id: 1, formatted_name: "One" },
                ],
                { props: { prefix: "<", suffix: ">" } },
            );
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("<Thirteen, One>");
        });

        scopedIt("updates the labels and the resolved primary keys when the value changes", async () => {
            const state = reactive({ formModelName: "fm", combinedValue: [13], combinedName: "field" });
            useWidget.mockReturnValue({ state });
            useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
            useResolvedLookupObject.mockReturnValue(
                reactive({ object: {}, loading: false, error: null, errored: false, effectScope: { stop: vi.fn() } }),
            );
            const lookups = reactive({
                objects: { 13: { id: 13, formatted_name: "Thirteen" } },
                loading: false,
                effectScope: { stop: vi.fn() },
            });
            useResolvedLookupObjects.mockReturnValue(lookups);
            const wrapper = mount(WidgetReadOnly, { props: { app: "a", model: "m" }, ...mountOptions });
            expect(labels(wrapper)).toEqual(["Thirteen"]);

            lookups.objects = { 13: { id: 13, formatted_name: "Thirteen" }, 1: { id: 1, formatted_name: "One" } };
            state.combinedValue = [13, 1];
            await nextTick();

            expect(useResolvedLookupObjects.mock.calls[0][2].value).toEqual([13, 1]);
            expect(labels(wrapper)).toEqual(["Thirteen", "One"]);
        });

        scopedIt(
            "renders a repeated primary key as a separate link each time, before and after a reorder",
            async () => {
                const state = reactive({ formModelName: "fm", combinedValue: [13, 13], combinedName: "field" });
                useWidget.mockReturnValue({ state });
                useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
                useResolvedLookupObject.mockReturnValue(
                    reactive({
                        object: {},
                        loading: false,
                        error: null,
                        errored: false,
                        effectScope: { stop: vi.fn() },
                    }),
                );
                useResolvedLookupObjects.mockReturnValue(
                    reactive({
                        objects: { 13: { id: 13, formatted_name: "Thirteen" }, 1: { id: 1, formatted_name: "One" } },
                        loading: false,
                        effectScope: { stop: vi.fn() },
                    }),
                );
                const wrapper = mount(WidgetReadOnly, { props: { app: "a", model: "m" }, ...mountOptions });
                expect(labels(wrapper)).toEqual(["Thirteen", "Thirteen"]);

                state.combinedValue = [1, 13, 13];
                await nextTick();

                expect(labels(wrapper)).toEqual(["One", "Thirteen", "Thirteen"]);
            },
        );

        scopedIt("renders an expanded object that has neither a name nor a primary key as an empty label", () => {
            const { wrapper } = mountMany([{ other: 1 }]);
            expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).not.toContain("[object Object]");
        });

        scopedIt("gives the single-object lookup no primary key for an array value", () => {
            mountMany([13, 1]);
            expect(useResolvedLookupObject.mock.calls[0][2].value).toBeUndefined();
        });

        scopedIt("gives the many-object lookup no primary keys for a foreign-key value", () => {
            useWidget.mockReturnValue({
                state: reactive({ formModelName: "fm", combinedValue: 7, combinedName: "field" }),
            });
            useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
            useResolvedLookupObject.mockReturnValue(
                reactive({
                    object: { id: 7, formatted_name: "Seven" },
                    loading: false,
                    error: null,
                    errored: false,
                    effectScope: { stop: vi.fn() },
                }),
            );
            useResolvedLookupObjects.mockReturnValue(
                reactive({ objects: {}, loading: false, effectScope: { stop: vi.fn() } }),
            );
            mount(WidgetReadOnly, { props: { app: "a", model: "m" }, ...mountOptions });
            expect(useResolvedLookupObject.mock.calls[0][2].value).toBe(7);
            expect(useResolvedLookupObjects.mock.calls[0][2].value).toEqual([]);
        });

        scopedIt("renders the link-item slot once for each related object", () => {
            useSlotNameResolver.mockReturnValue(reactive({ name: "link-item", exists: false }));
            useWidget.mockReturnValue({
                state: reactive({
                    formModelName: "fm",
                    combinedValue: [
                        { id: 13, formatted_name: "Thirteen" },
                        { id: 1, formatted_name: "One" },
                    ],
                    combinedName: "field",
                }),
            });
            useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
            useResolvedLookupObject.mockReturnValue(
                reactive({ object: {}, loading: false, error: null, errored: false, effectScope: { stop: vi.fn() } }),
            );
            useResolvedLookupObjects.mockReturnValue(
                reactive({ objects: {}, loading: false, effectScope: { stop: vi.fn() } }),
            );
            const wrapper = mount(WidgetReadOnly, {
                props: { app: "a", model: "m" },
                slots: {
                    "link-item": (slotProps) =>
                        h("b", { "data-qa": "custom-item" }, `${slotProps.label}|${slotProps.pk}|${slotProps.view}`),
                },
                ...mountOptions,
            });
            expect(wrapper.findAll('[data-qa="custom-item"]').map((item) => item.text())).toEqual([
                "Thirteen|13|read",
                "One|1|read",
            ]);
            expect(wrapper.find('[data-qa="link-model-view"]').exists()).toBe(false);
        });
    });
});
