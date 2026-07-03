import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import LoadingHeartbeatStrip from "@vueda/display/loading/LoadingHeartbeatStrip.vue";

describe("lib/display/loading/LoadingHeartbeatStrip.vue", () => {
    describe("root element", () => {
        scopedIt("renders with data-slot='loading-heartbeat-strip'", () => {
            const wrapper = mount(LoadingHeartbeatStrip);
            expect(wrapper.attributes("data-slot")).toBe("loading-heartbeat-strip");
        });

        scopedIt("defaults data-tone to 'default'", () => {
            const wrapper = mount(LoadingHeartbeatStrip);
            expect(wrapper.attributes("data-tone")).toBe("default");
        });

        scopedIt.each(["default", "slow"])("reflects the '%s' tone on data-tone", (tone) => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { tone } });
            expect(wrapper.attributes("data-tone")).toBe(tone);
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { class: "custom-class" } });
            expect(wrapper.classes()).toContain("custom-class");
        });
    });

    describe("id section", () => {
        scopedIt("always renders the id section", () => {
            const wrapper = mount(LoadingHeartbeatStrip);
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').exists()).toBe(true);
        });

        scopedIt("renders requestId when provided", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { requestId: "req-abc-123" } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toContain("req-abc-123");
        });

        scopedIt("formats elapsedMs below 1000 as ms", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { elapsedMs: 450 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toContain("450ms");
        });

        scopedIt("formats elapsedMs of 0 as '0ms'", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { elapsedMs: 0 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toContain("0ms");
        });

        scopedIt("formats elapsedMs at exactly 1000 as '1.0s'", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { elapsedMs: 1000 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toContain("1.0s");
        });

        scopedIt("formats elapsedMs above 1000 as seconds with one decimal", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { elapsedMs: 3200 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toContain("3.2s");
        });

        scopedIt("renders separator when both requestId and elapsedMs are present", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { requestId: "req-1", elapsedMs: 500 } });
            const text = wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text();
            expect(text).toContain("req-1");
            expect(text).toContain("·");
            expect(text).toContain("500ms");
        });

        scopedIt("omits separator when only requestId is present", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { requestId: "req-1" } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).not.toContain("·");
        });

        scopedIt("omits separator when only elapsedMs is present", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { elapsedMs: 200 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).not.toContain("·");
        });

        scopedIt("renders empty id section when neither requestId nor elapsedMs is provided", () => {
            const wrapper = mount(LoadingHeartbeatStrip);
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toBe("");
        });
    });

    describe("status section", () => {
        scopedIt("always renders the status section", () => {
            const wrapper = mount(LoadingHeartbeatStrip);
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').exists()).toBe(true);
        });

        scopedIt("always renders the dot", () => {
            const wrapper = mount(LoadingHeartbeatStrip);
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-dot"]').exists()).toBe(true);
        });

        scopedIt("renders resolved/total count when both props are provided", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { resolved: 3, total: 5 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').text()).toContain("3/5");
        });

        scopedIt("omits count when only resolved is provided", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { resolved: 3 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').text()).not.toContain("/");
        });

        scopedIt("omits count when only total is provided", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { total: 5 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').text()).not.toContain("/");
        });

        scopedIt("renders 0/N count when resolved is 0", () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { resolved: 0, total: 4 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').text()).toContain("0/4");
        });
    });

    describe("tone routing", () => {
        scopedIt("applies dot theme classes for default tone", () => {
            const wrapper = mount(LoadingHeartbeatStrip, {
                props: {
                    tone: "default",
                    themeOverride: {
                        LoadingHeartbeatStrip: { dot: { class: "test-dot-default" } },
                    },
                },
            });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-dot"]').classes()).toContain("test-dot-default");
        });

        scopedIt("applies dotSlow theme classes for slow tone", () => {
            const wrapper = mount(LoadingHeartbeatStrip, {
                props: {
                    tone: "slow",
                    themeOverride: {
                        LoadingHeartbeatStrip: { dotSlow: { class: "test-dot-slow" } },
                    },
                },
            });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-dot"]').classes()).toContain("test-dot-slow");
        });

        scopedIt("does not apply dotSlow for default tone", () => {
            const wrapper = mount(LoadingHeartbeatStrip, {
                props: {
                    tone: "default",
                    themeOverride: {
                        LoadingHeartbeatStrip: { dotSlow: { class: "test-dot-slow" } },
                    },
                },
            });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-dot"]').classes()).not.toContain("test-dot-slow");
        });
    });

    describe("themeOverride", () => {
        scopedIt("applies themeOverride to the id section", () => {
            const wrapper = mount(LoadingHeartbeatStrip, {
                props: {
                    themeOverride: { LoadingHeartbeatStrip: { id: { class: "custom-id" } } },
                },
            });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').classes()).toContain("custom-id");
        });

        scopedIt("applies themeOverride to the status section", () => {
            const wrapper = mount(LoadingHeartbeatStrip, {
                props: {
                    themeOverride: { LoadingHeartbeatStrip: { status: { class: "custom-status" } } },
                },
            });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').classes()).toContain("custom-status");
        });
    });

    describe("reactivity", () => {
        scopedIt("updates elapsed display when elapsedMs prop changes", async () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { elapsedMs: 200 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toContain("200ms");
            await wrapper.setProps({ elapsedMs: 1500 });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-id"]').text()).toContain("1.5s");
        });

        scopedIt("updates count display when resolved/total props change", async () => {
            const wrapper = mount(LoadingHeartbeatStrip, { props: { resolved: 1, total: 4 } });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').text()).toContain("1/4");
            await wrapper.setProps({ resolved: 4 });
            expect(wrapper.find('[data-qa="loading-heartbeat-strip-status"]').text()).toContain("4/4");
        });
    });
});
