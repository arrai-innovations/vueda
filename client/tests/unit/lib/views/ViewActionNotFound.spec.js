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
        if (!a || !b) {
            return 0;
        }
        let i = 0;
        for (; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i]) {
                break;
            }
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
    props: { tone: String, iconName: String, iconOverride: Object },
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "system-message-card", "data-tone": props.tone, "data-icon-name": props.iconName }, [
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

vi.mock("@vueda/display/system-message/SystemMessageCard.vue", () => ({ default: SystemMessageCardStub }));
vi.mock("@vueda/display/system-message/TriedUrlCallout.vue", () => ({ default: TriedUrlCalloutStub }));
vi.mock("@vueda/display/system-message/SuggestionList.vue", () => ({ default: SuggestionListStub }));
vi.mock("@vueda/display/system-message/DiagnosticStrip.vue", () => ({ default: DiagnosticStripStub }));

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
    // The store's real shape: keyed by `getAppModelDotName` ("app.model", lowercased), with actions
    // as the objects model info reports.
    modelInfoStore = {
        infos: {
            "app1.modela": {
                actions: [
                    { name: "list", detail: false },
                    { name: "create", detail: false },
                    { name: "retrieve", detail: true },
                    { name: "update", detail: true },
                    { name: "partial_update", detail: true },
                    { name: "archive", detail: true },
                ],
            },
            "app1.other": { actions: [{ name: "list", detail: false }] },
            "app2.modela": { actions: [{ name: "list", detail: false }] },
        },
    };
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

        scopedIt("passes the actionNotFound icon name to SystemMessageCard", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconName")).toBe("actionNotFound");
        });

        scopedIt("passes iconOverride through to SystemMessageCard", () => {
            mockedInject.mockReturnValueOnce({});
            const iconOverride = { Default: {} };
            const wrapper = mount(ViewActionNotFound, { props: { iconOverride } });
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconOverride")).toEqual(iconOverride);
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
        scopedIt("lists the closest model's list actions when the tried route has no pk", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            const list = wrapper.findComponent(SuggestionListStub);
            expect(list.props("shape")).toBe("action");
            expect(list.props("items")).toEqual([
                { label: "list", sub: "/app1/modela/list", to: "/app1/modela/list" },
                { label: "create", sub: "/app1/modela/create", to: "/app1/modela/create" },
            ]);
        });

        scopedIt("links detail actions with the tried pk, by route name, in similarity order", () => {
            routeRef.value.params.pk = "7";
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.findComponent(SuggestionListStub).props("items")).toEqual([
                { label: "read", sub: "/app1/modela/read/7", to: "/app1/modela/read/7" },
                { label: "list", sub: "/app1/modela/list", to: "/app1/modela/list" },
                { label: "create", sub: "/app1/modela/create", to: "/app1/modela/create" },
                { label: "update", sub: "/app1/modela/update/7", to: "/app1/modela/update/7" },
                { label: "archive", sub: "/app1/modela/archive/7", to: "/app1/modela/archive/7" },
            ]);
        });

        scopedIt("names the closest app and model in the source with the suggestion count", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActionNotFound);
            expect(wrapper.findComponent(SuggestionListStub).props("source")).toBe("app1.modela · 2");
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
            expect(pushSpy).toHaveBeenCalledWith("/app1/modela/list");
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
