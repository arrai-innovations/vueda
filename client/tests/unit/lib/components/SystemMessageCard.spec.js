import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import SystemMessageCard from "@vueda/components/SystemMessageCard.vue";

describe("lib/components/SystemMessageCard.vue", () => {
    describe("root element", () => {
        scopedIt("renders with data-slot='system-message-card'", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.attributes("data-slot")).toBe("system-message-card");
        });

        scopedIt("defaults data-tone to 'info'", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.attributes("data-tone")).toBe("info");
        });

        scopedIt.each(["info", "warning", "danger", "loading"])("reflects the '%s' tone on data-tone", (tone) => {
            const wrapper = mount(SystemMessageCard, { props: { tone } });
            expect(wrapper.attributes("data-tone")).toBe(tone);
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(SystemMessageCard, { props: { class: "custom-class" } });
            expect(wrapper.classes()).toContain("custom-class");
        });
    });

    describe("crest", () => {
        scopedIt("always renders the crest section", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.find('[data-qa="system-message-card-crest"]').exists()).toBe(true);
        });

        scopedIt("always renders the icon tile placeholder", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.find('[data-qa="system-message-card-crest-icon"]').exists()).toBe(true);
        });

        scopedIt("renders crest-icon slot content inside the icon tile", () => {
            const wrapper = mount(SystemMessageCard, {
                slots: { "crest-icon": '<span data-qa="my-icon">X</span>' },
            });
            expect(wrapper.find('[data-qa="my-icon"]').exists()).toBe(true);
        });

        scopedIt("renders the crest-eyebrow slot when provided", () => {
            const wrapper = mount(SystemMessageCard, {
                slots: { "crest-eyebrow": "Route error" },
            });
            expect(wrapper.find('[data-qa="system-message-card-crest-eyebrow"]').text()).toBe("Route error");
        });

        scopedIt("omits the crest-eyebrow span when the slot is absent", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.find('[data-qa="system-message-card-crest-eyebrow"]').exists()).toBe(false);
        });

        scopedIt("renders the crest-kind slot when provided", () => {
            const wrapper = mount(SystemMessageCard, {
                slots: { "crest-kind": "/admin/customers" },
            });
            expect(wrapper.find('[data-qa="system-message-card-crest-kind"]').text()).toBe("/admin/customers");
        });

        scopedIt("omits the crest-kind span when the slot is absent", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.find('[data-qa="system-message-card-crest-kind"]').exists()).toBe(false);
        });

        scopedIt("renders the crest-code slot when provided", () => {
            const wrapper = mount(SystemMessageCard, {
                slots: { "crest-code": "404" },
            });
            const code = wrapper.find('[data-qa="system-message-card-crest-code"]');
            expect(code.exists()).toBe(true);
            expect(code.text()).toBe("404");
        });

        scopedIt("omits the crest-code span when the slot is absent", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.find('[data-qa="system-message-card-crest-code"]').exists()).toBe(false);
        });
    });

    describe("body", () => {
        scopedIt("always renders the body wrapper", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.find('[data-qa="system-message-card-body"]').exists()).toBe(true);
        });

        scopedIt("renders default slot content inside the body", () => {
            const wrapper = mount(SystemMessageCard, {
                slots: { default: '<p data-qa="body-content">Something went wrong</p>' },
            });
            const body = wrapper.find('[data-qa="system-message-card-body"]');
            expect(body.find('[data-qa="body-content"]').exists()).toBe(true);
        });
    });

    describe("actions slot", () => {
        scopedIt("omits the actions wrapper when the actions slot is absent", () => {
            const wrapper = mount(SystemMessageCard);
            expect(wrapper.find('[data-qa="system-message-card-actions"]').exists()).toBe(false);
        });

        scopedIt("renders the actions wrapper when the actions slot is provided", () => {
            const wrapper = mount(SystemMessageCard, {
                slots: { actions: '<button data-qa="go-home">Go home</button>' },
            });
            const actions = wrapper.find('[data-qa="system-message-card-actions"]');
            expect(actions.exists()).toBe(true);
            expect(actions.find('[data-qa="go-home"]').exists()).toBe(true);
        });
    });

    describe("themeOverride", () => {
        scopedIt("applies a themeOverride to the crest slot", () => {
            const wrapper = mount(SystemMessageCard, {
                props: {
                    themeOverride: { SystemMessageCard: { crest: { class: "custom-crest" } } },
                },
            });
            expect(wrapper.find('[data-qa="system-message-card-crest"]').classes()).toContain("custom-crest");
        });

        scopedIt("applies a themeOverride to the crestCode slot", () => {
            const wrapper = mount(SystemMessageCard, {
                props: {
                    themeOverride: { SystemMessageCard: { crestCode: { class: "custom-code" } } },
                },
                slots: { "crest-code": "404" },
            });
            expect(wrapper.find('[data-qa="system-message-card-crest-code"]').classes()).toContain("custom-code");
        });
    });
});
