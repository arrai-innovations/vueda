import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { setIcons } from "@vueda/use/useIcons.js";
import { defineComponent, h } from "vue";

describe("lib/display/consequences-bullets/ConsequencesBullets.vue", () => {
    let ConsequencesBullets;

    const stub = (name) =>
        defineComponent({
            name,
            setup(_, { attrs }) {
                return () => h("i", { "data-qa": `icon-${name}`, ...attrs });
            },
        });

    beforeEach(async () => {
        setIcons({
            ConsequencesBullets: {
                sessions: { component: stub("sessions") },
                tokens: { component: stub("tokens") },
                shared: { component: stub("shared") },
                clock: { component: stub("clock") },
            },
        });
        ConsequencesBullets = (await import("@vueda/display/consequences-bullets/ConsequencesBullets.vue")).default;
    });

    describe("default rendering", () => {
        scopedIt("renders one <li> per item", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: {
                    items: [
                        { icon: "sessions", label: "Sessions revoked" },
                        { icon: "tokens", label: "API tokens disabled" },
                    ],
                },
            });
            expect(wrapper.findAll('[data-qa="consequences-bullets-item"]')).toHaveLength(2);
        });

        scopedIt("renders an empty <ul> when items is empty", () => {
            const wrapper = mount(ConsequencesBullets, { props: { items: [] } });
            expect(wrapper.element.tagName).toBe("UL");
            expect(wrapper.findAll('[data-qa="consequences-bullets-item"]')).toHaveLength(0);
        });

        scopedIt("renders the configured icon for each item", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: {
                    items: [
                        { icon: "sessions", label: "Sessions revoked" },
                        { icon: "clock", label: "After 30 days, irrecoverable" },
                    ],
                },
            });
            expect(wrapper.find('[data-qa="icon-sessions"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="icon-clock"]').exists()).toBe(true);
        });

        scopedIt("renders the icon cell but no component when the icon name is unregistered", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [{ icon: "missing", label: "Consequence" }] },
            });
            expect(wrapper.find('[data-qa="icon-missing"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="consequences-bullets-icon"]').exists()).toBe(true);
        });

        scopedIt("renders the icon cell but no component when the item has no icon", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [{ label: "Consequence" }] },
            });
            const iconWraps = wrapper.findAll('[data-qa="consequences-bullets-icon"]');
            expect(iconWraps).toHaveLength(1);
            expect(iconWraps[0].element.children.length).toBe(0);
        });

        scopedIt("renders the label and the description", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: {
                    items: [
                        {
                            icon: "sessions",
                            label: "Sessions revoked",
                            description: "All sessions across devices end immediately.",
                        },
                    ],
                },
            });
            expect(wrapper.get('[data-qa="consequences-bullets-label"]').text()).toBe("Sessions revoked");
            expect(wrapper.get('[data-qa="consequences-bullets-description"]').text()).toBe(
                "All sessions across devices end immediately.",
            );
        });

        scopedIt("omits the description span when description is missing", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [{ icon: "sessions", label: "Sessions revoked" }] },
            });
            expect(wrapper.find('[data-qa="consequences-bullets-label"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="consequences-bullets-description"]').exists()).toBe(false);
        });
    });

    describe("tone routing", () => {
        scopedIt("defaults data-tone to 'default'", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [{ icon: "sessions", label: "L" }] },
            });
            expect(wrapper.find('[data-qa="consequences-bullets-item"]').attributes("data-tone")).toBe("default");
        });

        scopedIt.each([
            ["warn", "text-warning"],
            ["danger", "text-destructive"],
        ])("applies the %s tone class to the icon wrapper", (tone, expectedClass) => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [{ icon: "tokens", label: "L", tone }] },
            });
            const item = wrapper.find('[data-qa="consequences-bullets-item"]');
            expect(item.attributes("data-tone")).toBe(tone);
            expect(wrapper.find('[data-qa="consequences-bullets-icon"]').classes()).toContain(expectedClass);
        });

        scopedIt("does not add a tone class for the default tone", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [{ icon: "sessions", label: "L" }] },
            });
            const classes = wrapper.find('[data-qa="consequences-bullets-icon"]').classes();
            expect(classes).not.toContain("text-warning");
            expect(classes).not.toContain("text-destructive");
        });
    });

    describe("class merging", () => {
        scopedIt("merges a custom class on the root", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [], class: "custom-root-class" },
            });
            expect(wrapper.classes()).toContain("custom-root-class");
        });

        scopedIt("respects a themeOverride that retunes the label slot", () => {
            const wrapper = mount(ConsequencesBullets, {
                props: {
                    items: [{ icon: "sessions", label: "L" }],
                    themeOverride: { ConsequencesBullets: { label: { class: "custom-label-class" } } },
                },
            });
            expect(wrapper.get('[data-qa="consequences-bullets-label"]').classes()).toContain("custom-label-class");
        });
    });

    describe("reactivity", () => {
        scopedIt("updates rendered items when the items prop changes", async () => {
            const wrapper = mount(ConsequencesBullets, {
                props: { items: [{ icon: "sessions", label: "First" }] },
            });
            expect(wrapper.findAll('[data-qa="consequences-bullets-item"]')).toHaveLength(1);
            await wrapper.setProps({
                items: [
                    { icon: "sessions", label: "First" },
                    { icon: "tokens", label: "Second" },
                    { icon: "clock", label: "Third", tone: "danger" },
                ],
            });
            const items = wrapper.findAll('[data-qa="consequences-bullets-item"]');
            expect(items).toHaveLength(3);
            expect(items[2].attributes("data-tone")).toBe("danger");
        });
    });
});
