import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

// Runs the real `LinkModelView` and `useLinkModelView` inside the widget, so that the link rule of
// `LinkModelView` applies to each related object. The model info, the workflow transitions, and the
// router are the only replaced inputs.
const { state } = vi.hoisted(() => ({ state: {} }));

vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => state.modelConfig }));
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({ useWorkflowTransitions: () => state.workflow }));
vi.mock("vue-router", async (importOriginal) => ({ ...(await importOriginal()), useRouter: () => state.router }));
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: [],
    WIDGET_PROPS: {},
    useWidget: () => ({ state: state.widgetState }),
}));
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: () => () => "theme" }));
vi.mock("@vueda/use/useSlotNameResolver.js", async () => {
    const { ref } = await vi.importActual("vue");
    return { useSlotNameResolver: () => ({ name: ref("n"), exists: ref(false) }) };
});
vi.mock("@vueda/controls/button/Button.vue", () => ({
    default: defineComponent({
        props: ["as", "disabled", "href", "tone", "emphasis"],
        setup(props, { slots }) {
            return () => h("a", { "data-qa": "link", href: props.href }, slots.default?.());
        },
    }),
}));

const detail = { detail: true, bulk: false };
const expandedValue = [
    { id: 13, formatted_name: "Thirteen" },
    { id: 1, formatted_name: "One" },
];

describe("lib/widgets/WidgetReadOnly.vue with the real LinkModelView", () => {
    let WidgetReadOnly;

    beforeEach(async () => {
        WidgetReadOnly = (await import("@vueda/widgets/WidgetReadOnly.vue")).default;
        state.modelConfig = reactive({
            loading: false,
            errored: false,
            info: { pk: "id" },
            config: { fetchFields: [], expand: [], actionDetails: { retrieve: detail } },
        });
        state.workflow = reactive({ transitions: [] });
        state.router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/:app/:model/:action", name: "actionrouter.listview", component: {} },
                { path: "/:app/:model/:pk/:action", name: "actionrouter.detailview", component: {} },
            ],
        });
        state.widgetState = reactive({ formModelName: "fm", combinedValue: expandedValue, combinedName: "field" });
    });

    const mountWidget = async () => {
        const wrapper = mount(WidgetReadOnly, {
            props: { app: "hr", model: "employee" },
            global: { provide: { [FieldContextSymbol]: { state: { fieldId: "f" } } } },
        });
        await flushPromises();
        return wrapper;
    };
    const valueText = (wrapper) => wrapper.get('[data-qa="widget-read-only-value"]').text();

    scopedIt("links each related object to its read view when the viewer can open it", async () => {
        const wrapper = await mountWidget();

        const links = wrapper.findAll('[data-qa="link"]');
        expect(links.map((link) => link.attributes("href"))).toEqual(["/hr/employee/13/read", "/hr/employee/1/read"]);
        expect(links.map((link) => link.text())).toEqual(["Thirteen", "One"]);
    });

    scopedIt("renders the labels as plain text when the model info lacks the read action", async () => {
        state.modelConfig.config.actionDetails = { list: { detail: false, bulk: false } };
        const wrapper = await mountWidget();

        expect(wrapper.find("a").exists()).toBe(false);
        expect(valueText(wrapper)).toContain("Thirteen");
        expect(valueText(wrapper)).toContain("One");
    });

    scopedIt("renders the labels as plain text while the model info loads", async () => {
        state.modelConfig.loading = true;
        const wrapper = await mountWidget();

        expect(wrapper.find("a").exists()).toBe(false);
        expect(valueText(wrapper)).toContain("Thirteen");
    });

    scopedIt("links a foreign-key value by the same rule", async () => {
        state.widgetState.combinedValue = 13;
        // the foreign-key object resolves through the lookup context
        const { LookupContextSymbol } = await import("@vueda/utils/symbols.js");
        const lookup = { requestObject: vi.fn(() => Promise.resolve({ id: 13, formatted_name: "Thirteen" })) };
        const wrapper = mount(WidgetReadOnly, {
            props: { app: "hr", model: "employee" },
            global: { provide: { [FieldContextSymbol]: { state: { fieldId: "f" } }, [LookupContextSymbol]: lookup } },
        });
        await flushPromises();
        expect(wrapper.get('[data-qa="link"]').attributes("href")).toBe("/hr/employee/13/read");

        state.modelConfig.config.actionDetails = {};
        const plain = mount(WidgetReadOnly, {
            props: { app: "hr", model: "employee" },
            global: { provide: { [FieldContextSymbol]: { state: { fieldId: "f" } }, [LookupContextSymbol]: lookup } },
        });
        await flushPromises();
        expect(plain.find("a").exists()).toBe(false);
        expect(valueText(plain)).toBe("Thirteen");
    });
});
