import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, nextTick, reactive } from "vue";

vi.mock("@sentry/vue", () => ({ captureException: vi.fn() }));

describe("lib/form/form-model/FieldRenderer.vue", () => {
    let FieldRenderer;

    beforeEach(async () => {
        FieldRenderer = (await import("@vueda/form/form-model/FieldRenderer.vue")).default;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const passThroughField = defineComponent({
        name: "PassThroughField",
        setup:
            (_p, { slots }) =>
            () =>
                h("div", { "data-qa": "field" }, slots.default ? slots.default() : []),
    });
    const okWidget = (label) =>
        defineComponent({ name: `Ok${label}`, setup: () => () => h("span", { "data-qa": `ok-${label}` }, label) });
    const boomWidget = defineComponent({
        name: "BoomWidget",
        setup: () => () => {
            throw new Error("widget blew up");
        },
    });

    const makeFormModel = (widgets) =>
        reactive({
            theme: {},
            fieldComponents: { a: passThroughField, b: passThroughField, c: passThroughField },
            widgetComponents: widgets,
            fieldDetails: { a: {}, b: {}, c: {} },
            fieldProps: {},
            widgetProps: {},
        });

    const mountForm = (formModel) =>
        mount(
            defineComponent({
                setup: () => () =>
                    h(
                        "div",
                        ["a", "b", "c"].map((name) => h(FieldRenderer, { key: name, formModelName: name, formModel })),
                    ),
            }),
        );

    scopedIt("contains a throwing widget to its own field", async () => {
        const wrapper = mountForm(makeFormModel({ a: okWidget("a"), b: boomWidget, c: okWidget("c") }));
        await nextTick();
        await flushPromises();

        // Siblings still render.
        expect(wrapper.find('[data-qa="ok-a"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="ok-c"]').exists()).toBe(true);

        // The failed field reports itself instead of rendering.
        const diagnostic = wrapper.find('[data-qa="field-renderer-error"]');
        expect(diagnostic.exists()).toBe(true);
        expect(diagnostic.text()).toContain('rendering the "b" field');
        expect(diagnostic.text()).toContain("BoomWidget");
    });

    scopedIt("reports a field whose widget name is not registered", async () => {
        const throwingResolution = reactive({
            theme: {},
            fieldComponents: { a: passThroughField, b: passThroughField, c: passThroughField },
            get widgetComponents() {
                return {
                    a: okWidget("a"),
                    get b() {
                        throw new Error('No widget component named "WidgetNope" for field "b" in app "x" model "y"');
                    },
                    c: okWidget("c"),
                };
            },
            fieldDetails: { a: {}, b: {}, c: {} },
            fieldProps: {},
            widgetProps: {},
        });
        const wrapper = mountForm(throwingResolution);
        await nextTick();
        await flushPromises();

        expect(wrapper.find('[data-qa="ok-a"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="ok-c"]').exists()).toBe(true);

        const diagnostic = wrapper.find('[data-qa="field-renderer-error"]');
        expect(diagnostic.exists()).toBe(true);
        expect(diagnostic.text()).toContain('rendering the "b" field');
    });

    scopedIt("renders every field when none of them fail", async () => {
        const wrapper = mountForm(makeFormModel({ a: okWidget("a"), b: okWidget("b"), c: okWidget("c") }));
        await nextTick();
        await flushPromises();

        expect(wrapper.findAll('[data-qa="field"]')).toHaveLength(3);
        expect(wrapper.find('[data-qa="field-renderer-error"]').exists()).toBe(false);
    });
});
