import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { KeepAlive, defineComponent, h, markRaw, nextTick, ref } from "vue";

enableAutoUnmount(afterEach);

const HeartbeatStripStub = defineComponent({
    props: ["requestId", "elapsedMs", "resolved", "total", "tone"],
    setup() {
        return () => h("div", { "data-qa": "heartbeat-strip" });
    },
});
vi.mock("@vueda/display/loading/LoadingHeartbeatStrip.vue", () => ({ default: HeartbeatStripStub }));

const LoadingIcon = defineComponent({ render: () => h("svg", { "data-qa": "loading-icon" }) });
const SlowIcon = defineComponent({ render: () => h("svg", { "data-qa": "slow-icon" }) });
const iconOverride = {
    ViewLoading: {
        loading: { component: markRaw(LoadingIcon) },
        hourglass: { component: markRaw(SlowIcon) },
    },
};

let ViewLoading;
beforeEach(async () => {
    vi.useFakeTimers();
    ViewLoading = (await import("@vueda/views/ViewLoading.vue")).default;
});
afterEach(() => vi.useRealTimers());

describe("lib/views/ViewLoading.vue", () => {
    describe("Loading status", () => {
        scopedIt("shows a labelled status without a card, skeleton, or request strip by default", () => {
            const wrapper = mount(ViewLoading, { props: { iconOverride } });
            expect(wrapper.get('[role="status"]').text()).toBe("Loading…");
            expect(wrapper.findComponent(LoadingIcon).exists()).toBe(true);
            expect(wrapper.find('[data-slot="system-message-card"]').exists()).toBe(false);
            expect(wrapper.find('[data-slot="loading-skeleton-ghost"]').exists()).toBe(false);
            expect(wrapper.findComponent(HeartbeatStripStub).exists()).toBe(false);
        });

        scopedIt("displays caller-supplied loading context and request details", () => {
            const wrapper = mount(ViewLoading, {
                props: {
                    name: "Loading customer record",
                    context: "Customer 42",
                    verb: "GET",
                    path: "/crm/customers/42",
                    requestId: "req-42",
                    dependencies: { resolved: 2, total: 5 },
                },
            });
            expect(wrapper.get('[role="status"]').text()).toBe("Loading customer record");
            expect(wrapper.get('[data-qa="view-loading-context"]').text()).toBe("Customer 42");
            expect(wrapper.get('[data-qa="view-loading-request"]').text()).toBe("GET /crm/customers/42");
            expect(wrapper.getComponent(HeartbeatStripStub).props()).toMatchObject({
                requestId: "req-42",
                resolved: 2,
                total: 5,
                elapsedMs: 0,
                tone: "default",
            });
        });

        scopedIt("shows dependency progress without a request identifier", () => {
            const wrapper = mount(ViewLoading, { props: { dependencies: { resolved: 0, total: 3 } } });
            expect(wrapper.getComponent(HeartbeatStripStub).props()).toMatchObject({ resolved: 0, total: 3 });
        });
    });

    describe("Slow loads", () => {
        scopedIt("changes the status and exposes optional actions at the slow threshold", async () => {
            const wrapper = mount(ViewLoading, {
                props: { iconOverride, slowAfterMs: 500, slowBlurb: "Preparing the report.", requestId: "req-42" },
                slots: { "slow-actions": "<button>Cancel</button>" },
            });
            await nextTick();
            await vi.advanceTimersByTimeAsync(400);
            expect(wrapper.get('[role="status"]').text()).toBe("Loading…");
            expect(wrapper.find("button").exists()).toBe(false);
            await vi.advanceTimersByTimeAsync(100);
            expect(wrapper.get('[role="status"]').text()).toBe("This is taking longer than usual");
            expect(wrapper.findComponent(SlowIcon).exists()).toBe(true);
            expect(wrapper.get('[data-qa="view-loading-slow-blurb"]').text()).toBe("Preparing the report.");
            expect(wrapper.get("button").text()).toBe("Cancel");
            expect(wrapper.getComponent(HeartbeatStripStub).props()).toMatchObject({ elapsedMs: 500, tone: "slow" });
        });

        scopedIt("uses the CSS threshold unless the caller supplies a prop", () => {
            document.documentElement.style.setProperty("--vueda-loading-slow-ms", "8000");
            try {
                expect(mount(ViewLoading).props("slowAfterMs")).toBe(8000);
                expect(mount(ViewLoading, { props: { slowAfterMs: 5000 } }).props("slowAfterMs")).toBe(5000);
            } finally {
                document.documentElement.style.removeProperty("--vueda-loading-slow-ms");
            }
        });

        scopedIt("defaults to three seconds without the CSS token", () => {
            expect(mount(ViewLoading).props("slowAfterMs")).toBe(3000);
        });
    });

    describe("Lifecycle", () => {
        scopedIt("pauses elapsed time while deactivated and clears its timer on unmount", async () => {
            const visible = ref(true);
            const Host = defineComponent({
                setup: () => () =>
                    h(KeepAlive, null, {
                        default: () => (visible.value ? h(ViewLoading, { requestId: "req-42" }) : null),
                    }),
            });
            const wrapper = mount(Host);
            await nextTick();
            await vi.advanceTimersByTimeAsync(200);
            expect(wrapper.getComponent(HeartbeatStripStub).props("elapsedMs")).toBe(200);
            visible.value = false;
            await nextTick();
            expect(vi.getTimerCount()).toBe(0);
            await vi.advanceTimersByTimeAsync(1000);
            visible.value = true;
            await nextTick();
            expect(wrapper.getComponent(HeartbeatStripStub).props("elapsedMs")).toBe(200);
            await vi.advanceTimersByTimeAsync(100);
            expect(wrapper.getComponent(HeartbeatStripStub).props("elapsedMs")).toBe(300);
            wrapper.unmount();
            expect(vi.getTimerCount()).toBe(0);
        });
    });
});
