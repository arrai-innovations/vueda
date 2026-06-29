import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

const mockedUseSuggestRoutes = vi.fn();
vi.mock("@vueda/use/useSuggestRoute.js", () => ({
    useSuggestRoutes: mockedUseSuggestRoutes,
}));

const mockedUseRouter = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: mockedUseRouter,
}));

// Capture props passed to child primitives via stub components so we can
// verify the composition without depending on the primitives' rendering.
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
        return () => h("div", { "data-qa": "tried-url-callout", ...attrs }, JSON.stringify(props.segments));
    },
});

const SuggestionListStub = defineComponent({
    name: "SuggestionListStub",
    props: { items: Array, head: String, source: String, shape: String },
    setup(props, { attrs }) {
        return () =>
            h("div", { "data-qa": "suggestion-list", "data-shape": props.shape, ...attrs }, props.items.length);
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

let ViewNotFound;
let pushSpy;
let backSpy;

beforeEach(async () => {
    pushSpy = vi.fn();
    backSpy = vi.fn();
    mockedUseRouter.mockReturnValue({
        currentRoute: { value: { path: "/missing" } },
        push: pushSpy,
        back: backSpy,
    });
    mockedUseSuggestRoutes.mockReturnValue(ref([]));
    ViewNotFound = (await import("@vueda/views/ViewNotFound.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/views/ViewNotFound.vue", () => {
    describe("Card chrome", () => {
        scopedIt("renders SystemMessageCard with info tone", () => {
            const wrapper = mount(ViewNotFound);
            expect(wrapper.findComponent(SystemMessageCardStub).props("tone")).toBe("info");
        });

        scopedIt("passes the notFound icon name to SystemMessageCard", () => {
            const wrapper = mount(ViewNotFound);
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconName")).toBe("notFound");
        });

        scopedIt("passes iconOverride through to SystemMessageCard", () => {
            const iconOverride = { Default: {} };
            const wrapper = mount(ViewNotFound, { props: { iconOverride } });
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconOverride")).toEqual(iconOverride);
        });

        scopedIt("renders the 404 status code in the crest", () => {
            const wrapper = mount(ViewNotFound);
            expect(wrapper.text()).toContain("404");
        });

        scopedIt("shows the current path in the crest-kind slot", () => {
            const wrapper = mount(ViewNotFound);
            expect(wrapper.text()).toContain("/missing");
        });

        scopedIt("renders the default blurb when no slot is provided", () => {
            const wrapper = mount(ViewNotFound);
            expect(wrapper.find('[data-qa="view-not-found-blurb"]').exists()).toBe(true);
        });

        scopedIt("renders the blurb slot override", () => {
            const wrapper = mount(ViewNotFound, { slots: { blurb: "<p>Custom blurb</p>" } });
            expect(wrapper.find('[data-qa="view-not-found-blurb"]').exists()).toBe(false);
            expect(wrapper.text()).toContain("Custom blurb");
        });
    });

    describe("Tried URL segments", () => {
        scopedIt("marks every segment bad when no suggestions exist", () => {
            mockedUseSuggestRoutes.mockReturnValue(ref([]));
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/foo/bar" } },
                push: pushSpy,
                back: backSpy,
            });
            const wrapper = mount(ViewNotFound);
            const callout = wrapper.findComponent(TriedUrlCalloutStub);
            expect(callout.props("segments")).toEqual([
                { text: "/foo", bad: true },
                { text: "/bar", bad: true },
            ]);
        });

        scopedIt("marks only the diverging segment bad against the best match", () => {
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/crm/custmrs/42" } },
                push: pushSpy,
                back: backSpy,
            });
            mockedUseSuggestRoutes.mockReturnValue(
                ref([{ matchedPath: "/crm/customers/:pk", score: 0.85, route: { name: "x", params: {} } }]),
            );
            const wrapper = mount(ViewNotFound);
            const segments = wrapper.findComponent(TriedUrlCalloutStub).props("segments");
            expect(segments).toEqual([
                { text: "/crm", bad: false },
                { text: "/custmrs", bad: true },
                { text: "/42", bad: false },
            ]);
        });
    });

    describe("Suggestion list", () => {
        scopedIt("hides the suggestion list when there are no matches", () => {
            mockedUseSuggestRoutes.mockReturnValue(ref([]));
            const wrapper = mount(ViewNotFound);
            expect(wrapper.find('[data-qa="view-not-found-suggestions"]').exists()).toBe(false);
        });

        scopedIt("forwards the N-best matches as items in route shape", () => {
            mockedUseSuggestRoutes.mockReturnValue(
                ref([
                    { matchedPath: "/foo/:pk", score: 0.9, route: { name: "/foo/:pk", params: { pk: "1" } } },
                    { matchedPath: "/bar", score: 0.5, route: { name: "/bar", params: {} } },
                ]),
            );
            const wrapper = mount(ViewNotFound);
            const list = wrapper.findComponent(SuggestionListStub);
            expect(list.props("shape")).toBe("route");
            expect(list.props("items")).toEqual([
                { label: "/foo/:pk", score: 0.9, to: { name: "/foo/:pk", params: { pk: "1" } } },
                { label: "/bar", score: 0.5, to: { name: "/bar", params: {} } },
            ]);
        });

        scopedIt("forwards suggestionLimit to useSuggestRoutes", () => {
            mount(ViewNotFound, { props: { suggestionLimit: 3 } });
            expect(mockedUseSuggestRoutes).toHaveBeenCalledWith({ limit: 3 });
        });
    });

    describe("Diagnostic strip", () => {
        scopedIt("renders a single route row by default", () => {
            const wrapper = mount(ViewNotFound);
            const strip = wrapper.findComponent(DiagnosticStripStub);
            expect(strip.props("rows")).toEqual([{ label: "route", value: "/missing" }]);
        });

        scopedIt("appends extra diagnostics after the route row", () => {
            const wrapper = mount(ViewNotFound, {
                props: { diagnostics: [{ label: "request id", value: "abc-123" }] },
            });
            const rows = wrapper.findComponent(DiagnosticStripStub).props("rows");
            expect(rows).toEqual([
                { label: "route", value: "/missing" },
                { label: "request id", value: "abc-123" },
            ]);
        });
    });

    describe("Actions", () => {
        scopedIt("renders Back and Go to home buttons", () => {
            const wrapper = mount(ViewNotFound);
            expect(wrapper.find('[data-qa="view-not-found-back"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-not-found-home"]').exists()).toBe(true);
        });

        scopedIt("calls router.back when Back is clicked", async () => {
            const wrapper = mount(ViewNotFound);
            await wrapper.find('[data-qa="view-not-found-back"]').trigger("click");
            expect(backSpy).toHaveBeenCalled();
        });

        scopedIt("pushes the homePath when Go to home is clicked", async () => {
            const wrapper = mount(ViewNotFound, { props: { homePath: "/dashboard" } });
            await wrapper.find('[data-qa="view-not-found-home"]').trigger("click");
            expect(pushSpy).toHaveBeenCalledWith("/dashboard");
        });

        scopedIt("renders an actions slot override", () => {
            const wrapper = mount(ViewNotFound, {
                slots: { actions: '<button data-qa="custom-action">Custom</button>' },
            });
            expect(wrapper.find('[data-qa="custom-action"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-not-found-back"]').exists()).toBe(false);
        });
    });
});
