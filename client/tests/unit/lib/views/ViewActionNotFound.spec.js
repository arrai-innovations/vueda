import { mockProvideInject, mockUseRoute, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseRoute = mockUseRoute(vi);
const mockedUseRouter = vi.fn();
const mockedUseLookupContext = vi.fn();
let modelInfoStore;
let routeRef;
let pushSpy;
let backSpy;

vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

vi.mock("@vueda/stores/storeModelInfo", () => ({
    storeModelInfo: () => modelInfoStore,
}));

vi.mock("@vueda/stores/storeModelInfo.js", () => ({
    storeModelInfo: () => modelInfoStore,
}));

vi.mock("string-similarity-js", () => ({
    stringSimilarity: (a, b) => {
        if (!a || !b) return 0;
        let i = 0;
        for (; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i]) break;
        }
        return i;
    },
}));

vi.mock("vue-router", async () => {
    const actual = await vi.importActual("vue-router");
    return {
        __esModule: true,
        ...actual,
        useRoute: mockedUseRoute,
        useRouter: mockedUseRouter,
    };
});

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return {
        __esModule: true,
        ...actual,
        inject: mockedInject,
        provide: mockedProvide,
    };
});

// Capture props passed to child primitives via stub components so we can
// verify the composition without rendering the primitives.
const SystemMessageCardStub = defineComponent({
    name: "SystemMessageCardStub",
    props: { tone: String },
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "system-message-card", "data-tone": props.tone }, [
                slots["crest-icon"]?.(),
                slots["crest-eyebrow"]?.(),
                slots["crest-kind"]?.(),
                slots["crest-code"]?.(),
                slots.default?.(),
                slots.actions?.(),
            ]);
    },
});

const TriedUrlCalloutStub = defineComponent({
    name: "TriedUrlCalloutStub",
    props: { segments: Array, label: String },
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "tried-url-callout", "data-label": props.label, ...attrs });
    },
});

const SuggestionListStub = defineComponent({
    name: "SuggestionListStub",
    props: { items: Array, head: String, source: String, shape: String },
    setup(props, { attrs }) {
        return () =>
            h(
                "div",
                { "data-qa": "suggestion-list", "data-shape": props.shape, "data-source": props.source, ...attrs },
                String(props.items.length),
            );
    },
});

const DiagnosticStripStub = defineComponent({
    name: "DiagnosticStripStub",
    props: { rows: Array },
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "diagnostic-strip", ...attrs }, JSON.stringify(props.rows));
    },
});

vi.mock("@vueda/components/SystemMessageCard.vue", () => ({ default: SystemMessageCardStub }));
vi.mock("@vueda/components/TriedUrlCallout.vue", () => ({ default: TriedUrlCalloutStub }));
vi.mock("@vueda/components/SuggestionList.vue", () => ({ default: SuggestionListStub }));
vi.mock("@vueda/components/DiagnosticStrip.vue", () => ({ default: DiagnosticStripStub }));

let ViewActionNotFound, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    routeRef = vue.ref({
        params: { app: "app1", model: "modelA", action: "redit" },
        fullPath: "/app1/modelA/redit",
    });
    mockedUseRoute.mockReturnValue(routeRef.value);
    pushSpy = vi.fn();
    backSpy = vi.fn();
    mockedUseRouter.mockReturnValue({ push: pushSpy, back: backSpy });
    mockedUseLookupContext.mockClear();
    modelInfoStore = { infos: { app1: { modelA: { actions: ["list", "edit", "read"] } } } };
    ViewActionNotFound = (await import("@vueda/views/ViewActionNotFound.vue")).default;
    provideStore.clear();
    mockedInject.mockReset();
});

describe("lib/views/ViewActionNotFound.vue", () => {
    describe("Lookup context", () => {
        scopedIt("calls useLookupContext if lookup context is missing", () => {
            mockedInject.mockReturnValueOnce(null);
            mount(ViewActionNotFound);
            expect(mockedUseLookupContext).toHaveBeenCalled();
        });

        scopedIt("does not call useLookupContext when lookup context exists", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewActionNotFound);
            expect(mockedUseLookupContext).not.toHaveBeenCalled();
        });
    });

    describe("Card chrome", () => {
        scopedIt("renders SystemMessageCard with info tone", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.findComponent(SystemMessageCardStub).props("tone")).toBe("info");
        });

        scopedIt("renders the 404 status code in the crest", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.text()).toContain("404");
        });

        scopedIt("shows the app/model/action key in the crest-kind slot", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.text()).toContain("app1/modelA/redit");
        });

        scopedIt("renders the default blurb when no slot is provided", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.find('[data-qa="view-action-not-found-blurb"]').exists()).toBe(true);
        });

        scopedIt("renders the blurb slot override", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound, { slots: { blurb: "<p>Custom blurb</p>" } });
            expect(wrapper.find('[data-qa="view-action-not-found-blurb"]').exists()).toBe(false);
            expect(wrapper.text()).toContain("Custom blurb");
        });
    });

    describe("Tried action key callout", () => {
        scopedIt("renders the callout with 'Action key' label", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.findComponent(TriedUrlCalloutStub).props("label")).toBe("Action key");
        });

        scopedIt("marks only the action segment as bad", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            const segments = wrapper.findComponent(TriedUrlCalloutStub).props("segments");
            const bad = segments.filter((s) => s.bad);
            expect(bad).toEqual([{ text: "redit", bad: true }]);
        });
    });

    describe("Suggestion list", () => {
        scopedIt("forwards all model actions in similarity-descending order in action shape", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            const list = wrapper.findComponent(SuggestionListStub);
            expect(list.props("shape")).toBe("action");
            expect(list.props("items")).toEqual([
                { label: "read", sub: "/app1/modelA/read", to: "/app1/modelA/read" },
                { label: "list", sub: "/app1/modelA/list", to: "/app1/modelA/list" },
                { label: "edit", sub: "/app1/modelA/edit", to: "/app1/modelA/edit" },
            ]);
        });

        scopedIt("uses model-info actions and shows app.model · count in the source", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.findComponent(SuggestionListStub).props("source")).toBe("app1.modelA · 3");
        });

        scopedIt("falls back to default actions when modelData has none", () => {
            modelInfoStore = { infos: { app1: { modelA: {} } } };
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            const items = wrapper.findComponent(SuggestionListStub).props("items");
            expect(items.map((i) => i.label).sort()).toEqual(["create", "list", "read", "update"]);
        });

        scopedIt("hides the suggestion list when no closest app/model exists", () => {
            modelInfoStore = { infos: {} };
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.find('[data-qa="view-action-not-found-suggestions"]').exists()).toBe(false);
        });
    });

    describe("Diagnostic strip", () => {
        scopedIt("renders a single route row by default", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.findComponent(DiagnosticStripStub).props("rows")).toEqual([
                { label: "route", value: "/app1/modelA/redit" },
            ]);
        });

        scopedIt("appends extra diagnostics after the route row", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound, {
                props: { diagnostics: [{ label: "request id", value: "xyz" }] },
            });
            expect(wrapper.findComponent(DiagnosticStripStub).props("rows")).toEqual([
                { label: "route", value: "/app1/modelA/redit" },
                { label: "request id", value: "xyz" },
            ]);
        });
    });

    describe("Actions", () => {
        scopedIt("renders Back and Browse all actions buttons", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.find('[data-qa="view-action-not-found-back"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-action-not-found-browse"]').exists()).toBe(true);
        });

        scopedIt("hides Browse all actions when closest app/model cannot be resolved", () => {
            modelInfoStore = { infos: {} };
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.find('[data-qa="view-action-not-found-browse"]').exists()).toBe(false);
        });

        scopedIt("calls router.back when Back is clicked", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            await wrapper.find('[data-qa="view-action-not-found-back"]').trigger("click");
            expect(backSpy).toHaveBeenCalled();
        });

        scopedIt("pushes the closest model's list path when Browse is clicked", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            await wrapper.find('[data-qa="view-action-not-found-browse"]').trigger("click");
            expect(pushSpy).toHaveBeenCalledWith("/app1/modelA/list");
        });

        scopedIt("renders an actions slot override", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound, {
                slots: { actions: '<button data-qa="custom-action">Custom</button>' },
            });
            expect(wrapper.find('[data-qa="custom-action"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-action-not-found-back"]').exists()).toBe(false);
        });
    });
});
