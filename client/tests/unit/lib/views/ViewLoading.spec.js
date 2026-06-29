import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const SkeletonGhostStub = defineComponent({
    name: "SkeletonGhostStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "skeleton-ghost", ...attrs });
    },
});

const HeartbeatStripStub = defineComponent({
    name: "HeartbeatStripStub",
    props: ["requestId", "elapsedMs", "resolved", "total", "tone"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "heartbeat-strip", ...props, ...attrs });
    },
});

// Renders default + named slots so we can inspect slot content.
const SystemMessageCardStub = defineComponent({
    name: "SystemMessageCardStub",
    props: { tone: String, iconName: String, iconProps: Object, iconOverride: Object },
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "system-message-card", "data-tone": props.tone, "data-icon-name": props.iconName }, [
                slots["crest-kind"]?.(),
                slots.default?.(),
                slots.actions?.(),
            ]);
    },
});

vi.mock("@vueda/components/SystemMessageCard.vue", () => ({ default: SystemMessageCardStub }));
vi.mock("@vueda/components/LoadingSkeletonGhost.vue", () => ({ default: SkeletonGhostStub }));
vi.mock("@vueda/components/LoadingHeartbeatStrip.vue", () => ({ default: HeartbeatStripStub }));

let ViewLoading;

beforeEach(async () => {
    vi.useFakeTimers();
    ViewLoading = (await import("@vueda/views/ViewLoading.vue")).default;
});

afterEach(() => {
    vi.useRealTimers();
});

describe("lib/views/ViewLoading.vue", () => {
    describe("Rendering", () => {
        scopedIt("renders the SystemMessageCard with loading tone by default", () => {
            const wrapper = mount(ViewLoading);
            expect(wrapper.findComponent(SystemMessageCardStub).props("tone")).toBe("loading");
        });

        scopedIt("passes the loading icon name to the card by default", () => {
            const wrapper = mount(ViewLoading);
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconName")).toBe("loading");
        });

        scopedIt("passes iconOverride through to SystemMessageCard", () => {
            const iconOverride = { Default: {} };
            const wrapper = mount(ViewLoading, { props: { iconOverride } });
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconOverride")).toEqual(iconOverride);
        });

        scopedIt("renders LoadingSkeletonGhost", () => {
            const wrapper = mount(ViewLoading);
            expect(wrapper.findComponent(SkeletonGhostStub).exists()).toBe(true);
        });

        scopedIt("renders LoadingHeartbeatStrip", () => {
            const wrapper = mount(ViewLoading);
            expect(wrapper.findComponent(HeartbeatStripStub).exists()).toBe(true);
        });

        scopedIt("shows name when provided", () => {
            const wrapper = mount(ViewLoading, { props: { name: "Loading customer record" } });
            expect(wrapper.find('[data-qa="view-loading-name"]').text()).toBe("Loading customer record");
        });

        scopedIt("does not render body row when name and context are absent", () => {
            const wrapper = mount(ViewLoading);
            expect(wrapper.find('[data-qa="view-loading-body-row"]').exists()).toBe(false);
        });

        scopedIt("shows context when provided", () => {
            const wrapper = mount(ViewLoading, {
                props: { name: "Loading customer record", context: "Northwind Logistics" },
            });
            expect(wrapper.find('[data-qa="view-loading-context"]').text()).toBe("Northwind Logistics");
        });
    });

    describe("crestKind", () => {
        scopedIt("shows verb and path together", () => {
            const wrapper = mount(ViewLoading, { props: { verb: "GET", path: "/crm/customers/42" } });
            expect(wrapper.text()).toContain("GET /crm/customers/42");
        });

        scopedIt("shows only verb when path is absent", () => {
            const wrapper = mount(ViewLoading, { props: { verb: "GET" } });
            expect(wrapper.text()).toContain("GET");
        });

        scopedIt("shows only path when verb is absent", () => {
            const wrapper = mount(ViewLoading, { props: { path: "/crm/customers/42" } });
            expect(wrapper.text()).toContain("/crm/customers/42");
        });

        scopedIt("renders no crest-kind slot when both verb and path are absent", () => {
            const wrapper = mount(ViewLoading);
            // SystemMessageCard crest-kind slot is not populated
            expect(wrapper.html()).not.toContain("GET");
        });
    });

    describe("HeartbeatStrip props", () => {
        scopedIt("forwards requestId to HeartbeatStrip", () => {
            const wrapper = mount(ViewLoading, { props: { requestId: "req-123" } });
            expect(wrapper.findComponent(HeartbeatStripStub).props("requestId")).toBe("req-123");
        });

        scopedIt("forwards resolved and total from dependencies to HeartbeatStrip", () => {
            const wrapper = mount(ViewLoading, { props: { dependencies: { resolved: 2, total: 5 } } });
            const strip = wrapper.findComponent(HeartbeatStripStub);
            expect(strip.props("resolved")).toBe(2);
            expect(strip.props("total")).toBe(5);
        });

        scopedIt("passes undefined resolved/total when dependencies is absent", () => {
            const wrapper = mount(ViewLoading);
            const strip = wrapper.findComponent(HeartbeatStripStub);
            expect(strip.props("resolved")).toBeUndefined();
            expect(strip.props("total")).toBeUndefined();
        });

        scopedIt("passes elapsedMs that starts at 0", () => {
            const wrapper = mount(ViewLoading);
            expect(wrapper.findComponent(HeartbeatStripStub).props("elapsedMs")).toBe(0);
        });

        scopedIt("increments elapsedMs every 100ms", async () => {
            const wrapper = mount(ViewLoading);
            await vi.advanceTimersByTimeAsync(300);
            expect(wrapper.findComponent(HeartbeatStripStub).props("elapsedMs")).toBe(300);
        });
    });

    describe("Slow path", () => {
        scopedIt("flips card tone to warning after slowAfterMs", async () => {
            const wrapper = mount(ViewLoading, { props: { slowAfterMs: 500 } });
            expect(wrapper.findComponent(SystemMessageCardStub).props("tone")).toBe("loading");
            await vi.advanceTimersByTimeAsync(600);
            expect(wrapper.findComponent(SystemMessageCardStub).props("tone")).toBe("warning");
        });

        scopedIt("passes the hourglass icon name when slow", async () => {
            const wrapper = mount(ViewLoading, { props: { slowAfterMs: 500 } });
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconName")).toBe("loading");
            await vi.advanceTimersByTimeAsync(600);
            expect(wrapper.findComponent(SystemMessageCardStub).props("iconName")).toBe("hourglass");
        });

        scopedIt("flips heartbeat tone to slow", async () => {
            const wrapper = mount(ViewLoading, { props: { slowAfterMs: 500 } });
            expect(wrapper.findComponent(HeartbeatStripStub).props("tone")).toBe("default");
            await vi.advanceTimersByTimeAsync(600);
            expect(wrapper.findComponent(HeartbeatStripStub).props("tone")).toBe("slow");
        });

        scopedIt("shows the slow title", async () => {
            const wrapper = mount(ViewLoading, { props: { slowAfterMs: 500 } });
            expect(wrapper.find('[data-qa="view-loading-slow-title"]').exists()).toBe(false);
            await vi.advanceTimersByTimeAsync(600);
            expect(wrapper.find('[data-qa="view-loading-slow-title"]').text()).toBe("This is taking longer than usual");
        });

        scopedIt("hides the normal body row when slow", async () => {
            const wrapper = mount(ViewLoading, {
                props: { slowAfterMs: 500, name: "Loading customer record" },
            });
            expect(wrapper.find('[data-qa="view-loading-body-row"]').exists()).toBe(true);
            await vi.advanceTimersByTimeAsync(600);
            // normal body row gone; slow body row present instead
            expect(wrapper.find('[data-qa="view-loading-name"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="view-loading-slow-title"]').exists()).toBe(true);
        });

        scopedIt("shows slowBlurb when provided and slow", async () => {
            const wrapper = mount(ViewLoading, {
                props: { slowAfterMs: 500, slowBlurb: "Aggregating 14 k invoices." },
            });
            await vi.advanceTimersByTimeAsync(600);
            expect(wrapper.find('[data-qa="view-loading-slow-blurb"]').text()).toBe("Aggregating 14 k invoices.");
        });

        scopedIt("does not show slowBlurb element when slowBlurb is absent", async () => {
            const wrapper = mount(ViewLoading, { props: { slowAfterMs: 500 } });
            await vi.advanceTimersByTimeAsync(600);
            expect(wrapper.find('[data-qa="view-loading-slow-blurb"]').exists()).toBe(false);
        });

        scopedIt("renders slow-actions slot content when slow", async () => {
            const wrapper = mount(ViewLoading, {
                props: { slowAfterMs: 500 },
                slots: { "slow-actions": "<button>Cancel</button>" },
            });
            await vi.advanceTimersByTimeAsync(600);
            expect(wrapper.find("button").text()).toBe("Cancel");
        });

        scopedIt("does not render slow-actions slot content before threshold", () => {
            const wrapper = mount(ViewLoading, {
                props: { slowAfterMs: 500 },
                slots: { "slow-actions": "<button>Cancel</button>" },
            });
            expect(wrapper.find("button").exists()).toBe(false);
        });
    });

    describe("slowAfterMs prop", () => {
        scopedIt("defaults to 3000 when the CSS variable is not loaded", () => {
            const wrapper = mount(ViewLoading);
            expect(wrapper.props("slowAfterMs")).toBe(3000);
        });

        scopedIt("accepts a numeric override", () => {
            const wrapper = mount(ViewLoading, { props: { slowAfterMs: 5000 } });
            expect(wrapper.props("slowAfterMs")).toBe(5000);
        });

        scopedIt("reads the CSS token when set on documentElement", () => {
            document.documentElement.style.setProperty("--vueda-loading-slow-ms", "8000");
            const wrapper = mount(ViewLoading);
            expect(wrapper.props("slowAfterMs")).toBe(8000);
            document.documentElement.style.removeProperty("--vueda-loading-slow-ms");
        });
    });
});
