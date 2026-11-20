import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol, LookupContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive } from "vue";

// Runs the real lookup composables against a stubbed lookup context. Only the widget's inputs
// (`useWidget`, model config, theme, link component) are replaced.
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "pk", "view", "label"],
    setup(props) {
        return () => h("a", { "data-qa": "link-model-view", "data-pk": String(props.pk) }, props.label);
    },
});

let combinedValue;
const useWidget = vi.fn(() => ({
    state: reactive({
        formModelName: "fm",
        get combinedValue() {
            return combinedValue;
        },
        combinedName: "field",
    }),
}));
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: [], WIDGET_PROPS: {}, useWidget }));
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: () => () => "theme" }));
vi.mock("@vueda/use/useModelConfig.js", async () => {
    const { reactive: r } = await vi.importActual("vue");
    return { useModelConfig: () => r({ info: { pk: "id" }, config: { fetchFields: ["name"], expand: [] } }) };
});
vi.mock("@vueda/use/useSlotNameResolver.js", async () => {
    const { ref } = await vi.importActual("vue");
    return { useSlotNameResolver: () => ({ name: ref("n"), exists: ref(false) }) };
});
vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

describe("lib/widgets/WidgetReadOnly.vue with the lookup context", () => {
    let WidgetReadOnly;

    beforeEach(async () => {
        WidgetReadOnly = (await import("@vueda/widgets/WidgetReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    const mountWidget = (lookup) =>
        mount(WidgetReadOnly, {
            props: { app: "a", model: "m" },
            global: {
                provide: {
                    [FieldContextSymbol]: { state: { fieldId: "f" } },
                    [LookupContextSymbol]: lookup,
                },
            },
        });
    const labels = (wrapper) => wrapper.findAll('[data-qa="link-model-view"]').map((link) => link.text());

    scopedIt("requests each unexpanded primary key once and renders the returned labels", async () => {
        combinedValue = [13, 1];
        const lookup = {
            requestObject: vi.fn((app, model, pk) =>
                Promise.resolve({ id: Number(pk), formatted_name: pk === "13" ? "Thirteen" : "One" }),
            ),
        };
        const wrapper = mountWidget(lookup);
        await flushPromises();

        expect(lookup.requestObject).toHaveBeenCalledTimes(2);
        for (const [app, model, , fields] of lookup.requestObject.mock.calls) {
            expect([app, model]).toEqual(["a", "m"]);
            expect(fields).toEqual(expect.arrayContaining(["name", "formatted_name", "id"]));
        }
        expect(lookup.requestObject.mock.calls.map((call) => call[2]).sort()).toEqual(["1", "13"]);
        expect(labels(wrapper)).toEqual(["Thirteen", "One"]);
        expect(wrapper.findAll('[data-qa="link-model-view"]').map((link) => link.attributes("data-pk"))).toEqual([
            "13",
            "1",
        ]);
    });

    scopedIt("requests nothing for expanded objects", async () => {
        combinedValue = [
            { id: 13, formatted_name: "Thirteen" },
            { id: 1, formatted_name: "One" },
        ];
        const lookup = { requestObject: vi.fn() };
        const wrapper = mountWidget(lookup);
        await flushPromises();

        expect(lookup.requestObject).not.toHaveBeenCalled();
        expect(labels(wrapper)).toEqual(["Thirteen", "One"]);
    });

    scopedIt("requests nothing for an empty relation", async () => {
        combinedValue = [];
        const lookup = { requestObject: vi.fn() };
        const wrapper = mountWidget(lookup);
        await flushPromises();

        expect(lookup.requestObject).not.toHaveBeenCalled();
        expect(labels(wrapper)).toEqual([]);
    });

    scopedIt("requests a foreign-key value through the single-object lookup only", async () => {
        combinedValue = 7;
        const lookup = { requestObject: vi.fn(() => Promise.resolve({ id: 7, formatted_name: "Seven" })) };
        const wrapper = mountWidget(lookup);
        await flushPromises();

        expect(lookup.requestObject).toHaveBeenCalledTimes(1);
        expect(String(lookup.requestObject.mock.calls[0][2])).toBe("7");
        expect(labels(wrapper)).toEqual(["Seven"]);
    });
});
